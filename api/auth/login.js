import { getUser, json, passwordHash, tokenForUser } from '../_kv.js';

export default async function handler(request, response) {
  try {
    if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed.' });
    const body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body ?? {};
    const { username, password } = body;
    const cleanUsername = String(username ?? '').trim().toLowerCase();
    const user = await getUser(cleanUsername);
    if (!user || user.passwordHash !== passwordHash(password)) {
      return json(response, 401, { error: 'Invalid username or password.' });
    }
    return json(response, 200, { user: { id: user.id, username: user.username }, token: tokenForUser(user) });
  } catch (error) {
    return json(response, error.status || 500, { error: error.message });
  }
}
