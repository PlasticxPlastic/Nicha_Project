import { createHash } from 'node:crypto';

const apiUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const apiToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export function json(response, status, payload) {
  response.status(status).json(payload);
}

export function passwordHash(password) {
  return createHash('sha256').update(String(password ?? '')).digest('hex');
}

export function tokenForUser(user) {
  return Buffer.from(`${user.id}:${user.username}`).toString('base64url');
}

export function userFromToken(token) {
  try {
    const [id, username] = Buffer.from(String(token ?? ''), 'base64url').toString('utf8').split(':');
    return id && username ? { id, username } : null;
  } catch {
    return null;
  }
}

export function authUser(request) {
  const header = request.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return userFromToken(token);
}

export async function kv(command) {
  if (!apiUrl || !apiToken) {
    const error = new Error('Vercel KV is not configured. Add KV_REST_API_URL and KV_REST_API_TOKEN.');
    error.status = 501;
    throw error;
  }
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error || 'KV request failed.');
  return payload.result;
}

export async function getUser(username) {
  const raw = await kv(['GET', `venio:user:${String(username ?? '').trim().toLowerCase()}`]);
  return raw ? JSON.parse(raw) : null;
}

export async function saveUser(user) {
  await kv(['SET', `venio:user:${user.username}`, JSON.stringify(user)]);
}
