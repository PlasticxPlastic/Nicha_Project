import { randomUUID } from 'node:crypto';
import { getUser, json, passwordHash, saveUser, tokenForUser } from '../_kv.js';

export default async function handler(request, response) {
  try {
    if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed.' });
    const body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body ?? {};
    const { username, password } = body;
    const cleanUsername = String(username ?? '').trim().toLowerCase();
    if (cleanUsername.length < 2) return json(response, 400, { error: 'Username must be at least 2 characters.' });
    if (String(password ?? '').length < 3) return json(response, 400, { error: 'Password must be at least 3 characters.' });
    if (await getUser(cleanUsername)) return json(response, 400, { error: 'Username already exists.' });
    const user = {
      id: randomUUID(),
      username: cleanUsername,
      passwordHash: passwordHash(password),
      createdAt: new Date().toISOString()
    };
    await saveUser(user);
    return json(response, 200, { user: { id: user.id, username: user.username }, token: tokenForUser(user) });
  } catch (error) {
    return json(response, error.status || 500, { error: error.message });
  }
}
