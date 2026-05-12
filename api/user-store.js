import { authUser, json, kv } from './_kv.js';

export default async function handler(request, response) {
  try {
    const user = authUser(request);
    if (!user) return json(response, 401, { error: 'Sign in required.' });
    const key = `venio:workspace:${user.id}`;

    if (request.method === 'GET') {
      const raw = await kv(['GET', key]);
      return json(response, 200, { data: raw ? JSON.parse(raw) : null });
    }

    if (request.method === 'PUT') {
      const body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body ?? {};
      await kv(['SET', key, JSON.stringify(body.data ?? {})]);
      return json(response, 200, { ok: true });
    }

    return json(response, 405, { error: 'Method not allowed.' });
  } catch (error) {
    return json(response, error.status || 500, { error: error.message });
  }
}
