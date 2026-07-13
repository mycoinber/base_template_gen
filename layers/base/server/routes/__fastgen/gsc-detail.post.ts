import {
  defineEventHandler,
  getHeader,
  readBody,
  setHeader,
  setResponseStatus,
} from 'h3';

interface ServiceAccountJson {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface AgentDetailLeaseResponse {
  ok: boolean;
  serviceAccountJson?: string;
  binding?: {
    bindingId: string;
    siteUrl: string;
    type?: string;
    dataState?: string;
  };
}

interface GscDetailRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3';
const ALLOWED_DIMENSIONS = new Set(['date', 'query', 'page', 'country', 'device', 'searchAppearance']);

class AgentRouteError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store');
  setHeader(event, 'X-Robots-Tag', 'noindex, nofollow');

  const incomingToken = extractBearerToken(getHeader(event, 'authorization'));
  if (!incomingToken) {
    setResponseStatus(event, 401, 'Unauthorized');
    return { error: true, message: 'Unauthorized' };
  }

  const body = await readBody<Record<string, any>>(event).catch(() => ({}));
  const env = readAgentEnv(event, body, incomingToken);
  if (!env.ok) {
    setResponseStatus(event, 503, env.error);
    return { error: true, message: env.error, missing: env.missing };
  }

  try {
    const result = await runAgentDetail(env.value, body);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GSC_AGENT_DETAIL_FAILED';
    const statusCode = error instanceof AgentRouteError ? error.statusCode : 502;
    await heartbeat(env.value, message);
    setResponseStatus(event, statusCode, message);
    return { error: true, message };
  }
});

async function runAgentDetail(env: AgentEnv, body: Record<string, any>) {
  const bindingId = String(body.bindingId || '').trim();
  if (!bindingId) {
    throw new AgentRouteError(400, 'GSC_BINDING_ID_INVALID');
  }

  const lease = await requestDetailLease(env, bindingId);
  if (!lease.serviceAccountJson || !lease.binding?.siteUrl) {
    throw new Error('GSC_DETAIL_LEASE_INCOMPLETE');
  }

  const serviceAccount = parseServiceAccount(lease.serviceAccountJson);
  const accessToken = await getAccessToken(serviceAccount);
  const dimensions = normalizeDimensions(body.dimensions);
  const rowLimit = clampInt(body.rowLimit, 1, 25000, 1000);
  const startRow = clampInt(body.startRow, 0, 5_000_000, 0);
  const startDate = normalizeDate(body.startDate, 'startDate');
  const endDate = normalizeDate(body.endDate, 'endDate');
  const type = normalizeSearchType(body.type || lease.binding.type || 'web');
  const dataState = normalizeDataState(body.dataState || lease.binding.dataState || 'final');

  const rows = await queryDetails({
    accessToken,
    siteUrl: lease.binding.siteUrl,
    startDate,
    endDate,
    type,
    dataState,
    dimensions,
    rowLimit,
    startRow,
  });

  return {
    ok: true,
    query: {
      startDate,
      endDate,
      type,
      dataState,
      dimensions,
      rowLimit,
      startRow,
    },
    rows,
    rowsCount: rows.length,
    fetchedAt: new Date().toISOString(),
  };
}

interface AgentEnv {
  backendUrl: string;
  siteId: string;
  agentId: string;
  token: string;
}

function readAgentEnv(
  event: any,
  body: { websiteId?: string; agentId?: string },
  token: string,
): { ok: true; value: AgentEnv } | { ok: false; error: string; missing: string[] } {
  const config = useRuntimeConfig(event);
  const runtimeGscBackendUrl = readRuntimeEnv(event, 'GSC_BACKEND_URL');
  const runtimeBackendUrl = readRuntimeEnv(event, 'BACKEND_URL');
  const backendUrl = trimTrailingSlash(
    runtimeGscBackendUrl ||
      config.server?.gscBackendUrl ||
      config.public?.gscBackendUrl ||
      runtimeBackendUrl ||
      config.server?.backHost ||
      config.public?.backHost ||
      '',
  );
  const siteId = String(body.websiteId || readRuntimeEnv(event, 'SITE_ID') || config.server?.siteId || config.public?.siteId || '').trim();
  const agentId = String(body.agentId || readRuntimeEnv(event, 'GSC_AGENT_ID') || '').trim();
  const missing = [
    !backendUrl ? 'GSC_BACKEND_URL' : '',
    !siteId ? 'SITE_ID' : '',
    !agentId ? 'GSC_AGENT_ID' : '',
  ].filter(Boolean);
  if (missing.length) {
    return { ok: false, error: 'GSC_AGENT_NOT_CONFIGURED', missing };
  }
  return { ok: true, value: { backendUrl, siteId, agentId, token } };
}

async function requestDetailLease(env: AgentEnv, bindingId: string): Promise<AgentDetailLeaseResponse> {
  const response = await fetch(`${env.backendUrl}/gsc/agent/detail-lease`, {
    method: 'POST',
    headers: authHeaders(env),
    body: JSON.stringify({ websiteId: env.siteId, agentId: env.agentId, bindingId }),
  });
  const payload = await response.json().catch(() => null) as AgentDetailLeaseResponse | { error?: string } | null;
  if (!response.ok) {
    throw new AgentRouteError(
      response.status,
      `GSC_AGENT_DETAIL_LEASE_FAILED: ${payload && 'error' in payload ? payload.error : response.status}`,
    );
  }
  return payload as AgentDetailLeaseResponse;
}

async function heartbeat(env: AgentEnv, error?: string): Promise<void> {
  await fetch(`${env.backendUrl}/gsc/agent/heartbeat`, {
    method: 'POST',
    headers: authHeaders(env),
    body: JSON.stringify({ websiteId: env.siteId, agentId: env.agentId, error: error || null }),
  }).catch(() => undefined);
}

async function queryDetails(params: {
  accessToken: string;
  siteUrl: string;
  startDate: string;
  endDate: string;
  type: string;
  dataState: string;
  dimensions: string[];
  rowLimit: number;
  startRow: number;
}): Promise<Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>> {
  const response = await fetch(`${GSC_API_BASE}/sites/${encodeURIComponent(params.siteUrl)}/searchAnalytics/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: params.dimensions,
      type: params.type,
      rowLimit: params.rowLimit,
      startRow: params.startRow,
      dataState: params.dataState,
    }),
  });
  const payload = await response.json().catch(() => null) as { rows?: GscDetailRow[]; error?: { message?: string } } | null;
  if (!response.ok) {
    throw new Error(`GSC_QUERY_FAILED: ${payload?.error?.message || response.status}`);
  }
  return (Array.isArray(payload?.rows) ? payload.rows : []).map((row) => ({
    keys: Array.isArray(row.keys) ? row.keys.map((key) => String(key ?? '')) : [],
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0),
  }));
}

async function getAccessToken(serviceAccount: ServiceAccountJson): Promise<string> {
  const tokenUri = serviceAccount.token_uri || 'https://oauth2.googleapis.com/token';
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt(serviceAccount, {
    iss: serviceAccount.client_email,
    scope: GSC_SCOPE,
    aud: tokenUri,
    exp: now + 3600,
    iat: now,
  });

  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const payload = await response.json().catch(() => null) as { access_token?: string; error_description?: string; error?: string } | null;
  if (!response.ok || !payload?.access_token) {
    throw new Error(`GSC_SERVICE_ACCOUNT_AUTH_FAILED: ${payload?.error_description || payload?.error || response.status}`);
  }
  return payload.access_token;
}

async function signJwt(serviceAccount: ServiceAccountJson, claims: Record<string, unknown>): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaims = base64UrlEncode(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedClaims}`;
  const keyData = pemToArrayBuffer(serviceAccount.private_key.replace(/\\n/g, '\n'));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

function parseServiceAccount(raw: string): ServiceAccountJson {
  const parsed = JSON.parse(raw) as Partial<ServiceAccountJson>;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GSC_SERVICE_ACCOUNT_JSON_INVALID');
  }
  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key,
    token_uri: parsed.token_uri || 'https://oauth2.googleapis.com/token',
  };
}

function normalizeDimensions(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];
  const dimensions = raw.map((item) => String(item || '').trim()).filter(Boolean);
  const normalized = dimensions.length ? dimensions : ['query'];
  if (!normalized.every((dimension) => ALLOWED_DIMENSIONS.has(dimension))) {
    throw new AgentRouteError(400, 'GSC_DIMENSIONS_INVALID');
  }
  return normalized;
}

function normalizeDate(value: unknown, field: string): string {
  const normalized = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new AgentRouteError(400, `${field.toUpperCase()}_INVALID`);
  }
  return normalized;
}

function normalizeSearchType(value: unknown): string {
  const normalized = String(value || 'web').trim();
  if (!['web', 'image', 'video', 'news', 'discover', 'googleNews'].includes(normalized)) {
    throw new AgentRouteError(400, 'GSC_SEARCH_TYPE_INVALID');
  }
  return normalized;
}

function normalizeDataState(value: unknown): string {
  const normalized = String(value || 'final').trim();
  if (!['final', 'all'].includes(normalized)) {
    throw new AgentRouteError(400, 'GSC_DATA_STATE_INVALID');
  }
  return normalized;
}

function authHeaders(env: AgentEnv): HeadersInit {
  return {
    Authorization: `Bearer ${env.token}`,
    'Content-Type': 'application/json',
  };
}

function extractBearerToken(raw: string | undefined): string {
  const value = String(raw || '').trim();
  if (!value.toLowerCase().startsWith('bearer ')) return '';
  return value.slice(7).trim();
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function trimTrailingSlash(value: string): string {
  return String(value || '').replace(/\/+$/, '');
}

function readRuntimeEnv(event: any, key: string): string {
  const cfEnv =
    event?.context?.cloudflare?.env ||
    event?.context?.cloudflare?.context?.env ||
    {};
  return String(process.env[key] || cfEnv[key] || '').trim();
}

function base64UrlEncode(input: string | ArrayBuffer): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
