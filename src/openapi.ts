export interface SpecEndpoint {
  path: string;
  summary: string;
}

export interface ParsedSpec {
  title: string;
  baseUrl?: string;
  endpoints: SpecEndpoint[];
}

const MAX_SPEC_CHARS = 5_000_000;

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasRequiredParam(params: unknown): boolean {
  return Array.isArray(params) && params.some(p => isObject(p) && p.required === true);
}

function serverUrl(spec: Json): string | undefined {
  if (typeof spec.openapi === 'string') {
    const servers = Array.isArray(spec.servers) ? spec.servers : [];
    const first: unknown = servers[0];
    const url = isObject(first) && typeof first.url === 'string' ? first.url : undefined;
    return url && /^https?:\/\/[^{}]+$/.test(url) ? url.replace(/\/+$/, '') : undefined;
  }
  if (spec.swagger === '2.0' && typeof spec.host === 'string') {
    const schemes: unknown[] = Array.isArray(spec.schemes) ? spec.schemes : [];
    const scheme = schemes.length === 0 || schemes.includes('https') ? 'https' : 'http';
    const basePath = typeof spec.basePath === 'string' ? spec.basePath : '';
    return `${scheme}://${spec.host}${basePath}`.replace(/\/+$/, '');
  }
  return undefined;
}

export function parseSpec(raw: unknown): ParsedSpec {
  if (!isObject(raw) || !(typeof raw.openapi === 'string' || raw.swagger === '2.0')) {
    throw new Error('This does not look like an OpenAPI or Swagger JSON document.');
  }
  const paths = raw.paths;
  if (!isObject(paths)) {
    throw new Error('The spec has no "paths" section.');
  }

  const endpoints: SpecEndpoint[] = [];
  for (const [path, item] of Object.entries(paths)) {
    if (!isObject(item) || path.includes('{')) {
      continue;
    }
    const get = item.get;
    if (!isObject(get)) {
      continue;
    }
    if (hasRequiredParam(item.parameters) || hasRequiredParam(get.parameters)) {
      continue;
    }
    const summary = typeof get.summary === 'string' ? get.summary : '';
    endpoints.push({ path: path.replace(/^\/+/, ''), summary });
  }
  endpoints.sort((a, b) => a.path.localeCompare(b.path));

  const info = isObject(raw.info) ? raw.info : {};
  return {
    title: typeof info.title === 'string' ? info.title : 'API',
    baseUrl: serverUrl(raw),
    endpoints
  };
}

export async function loadSpec(
  url: string,
  fetchImpl: typeof fetch = fetch
): Promise<ParsedSpec> {
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  if (text.length > MAX_SPEC_CHARS) {
    throw new Error('The spec is larger than 5 MB.');
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('The spec is not valid JSON. YAML specs are not supported yet.');
  }
  return parseSpec(json);
}