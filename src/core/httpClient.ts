import { HttpRequest, HttpResponse } from './types';

export interface SendOptions {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export async function sendRequest(
  req: HttpRequest,
  options: SendOptions = {}
): Promise<HttpResponse> {
  const { timeoutMs = 10_000, fetchImpl = fetch } = options;
  const res = await fetchImpl(req.url, {
    method: req.method,
    headers: req.headers,
    body: req.body,
    signal: AbortSignal.timeout(timeoutMs)
  });
  const text = await res.text();
  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return { status: res.status, statusText: res.statusText, ok: res.ok, headers, text };
}