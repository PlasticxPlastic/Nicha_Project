import { authUser, json } from '../_kv.js';

export default async function handler(request, response) {
  const user = authUser(request);
  return json(response, user ? 200 : 401, user ? { user, token: request.headers.authorization.slice(7) } : { error: 'Not signed in.' });
}
