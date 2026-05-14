export function json(response, status, payload) {
  response.status(status).json(payload);
}
