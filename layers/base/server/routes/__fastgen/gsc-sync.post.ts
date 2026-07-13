import {
  createError,
  defineEventHandler,
  getHeader,
  readBody,
  setHeader,
  setResponseStatus,
} from 'h3';
import { runFastgenSecurityCheck } from '../../utils/fastgen-security';

interface ServiceAccountJson {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface AgentLeaseBinding {
  bindingId: string;
  siteUrl: string;
  type?: string;
  dataState?: string;
}

interface AgentLeaseResponse {
  due: boolean;
  reason?: string;
  nextSyncAt?: string;
  leaseUntil?: string;
  syncIntervalMinutes?: number;
  serviceAccountJson?: string;
  bindings?: AgentLeaseBinding[];
}

interface GscDailyRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3';

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

  const body = await readBody<{ websiteId?: string; agentId?: string }>(event).catch(() => ({}));
  const env = readAgentEnv(event, body, incomingToken);
  if (!env.ok) {
    setResponseStatus(event, 503, env.error);
    return { error: true, message: env.error, missing: env.missing };
  }

  try {
    const result = await runAgentSync(env.value);
    const security = await runFastgenSecurityCheck(event, env.value).catch((error) => ({
      ok: false,
      status: 'error',
      errorCode: 'SECURITY_CHECK_FAILED',
      errorMessage: error instanceof Error ? error.message : 'SECURITY_CHECK_FAILED',
    }));
    if (!result.due) {
      setResponseStatus(event, 202);
    }
    return {
      ...result,
      security,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GSC_AGENT_SYNC_FAILED';
    const statusCode = error instanceof AgentRouteError ? error.statusCode : 502;
    setResponseStatus(event, statusCode, message);
    return { error: true, message };
  }
});

async function runAgentSync(env: AgentEnv) {
  const lease = await requestLease(env);
  if (!lease.due) {
    return {
      ok: true,
      due: false,
      reason: lease.reason || 'not_due',
      nextSyncAt: lease.nextSyncAt ?? null,
    };
  }

  const bindings = Array.isArray(lease.bindings) ? lease.bindings : [];
  if (!bindings.length) {
    await heartbeat(env, 'No active GSC bindings returned by backend');
    return { ok: true, due: false, reason: 'no_active_bindings' };
  }

  if (!lease.serviceAccountJson) {
    await heartbeat(env, 'GSC_SERVICE_ACCOUNT_JSON_MISSING_IN_LEASE');
    throw new Error('GSC_SERVICE_ACCOUNT_JSON_MISSING_IN_LEASE');
  }

  const serviceAccount = parseServiceAccount(lease.serviceAccountJson);
  const accessToken = await getAccessToken(serviceAccount);
  const daysBack = clampInt(env.daysBack, 1, 90, 90);
  const { startDate, endDate } = resolveFinalDateRange(daysBack);
  const synced: Array<{ bindingId: string; siteUrl: string; rows: number }> = [];

  for (const binding of bindings) {
    try {
      const rows = await queryDailySummary({
        accessToken,
        siteUrl: binding.siteUrl,
        startDate,
        endDate,
        type: binding.type || 'web',
        dataState: binding.dataState || 'final',
      });
      await ingestDailySummary(env, binding, rows);
      synced.push({ bindingId: binding.bindingId, siteUrl: binding.siteUrl, rows: rows.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'GSC_AGENT_BINDING_SYNC_FAILED';
      await heartbeat(env, message);
      throw createError({ statusCode: 502, statusMessage: message });
    }
  }

  return {
    ok: true,
    due: true,
    startDate,
    endDate,
    synced,
  };
}

interface AgentEnv {
  backendUrl: string;
  siteId: string;
  agentId: string;
  token: string;
  daysBack: number;
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
  return { ok: true, value: {
    backendUrl,
    siteId,
    agentId,
    token,
    daysBack: clampInt(readRuntimeEnv(event, 'GSC_DAYS_BACK'), 1, 90, 90),
  } };
}

async function requestLease(env: AgentEnv): Promise<AgentLeaseResponse> {
  const response = await fetch(`${env.backendUrl}/gsc/agent/lease`, {
    method: 'POST',
    headers: authHeaders(env),
    body: JSON.stringify({ websiteId: env.siteId, agentId: env.agentId }),
  });
  const payload = await response.json().catch(() => null) as AgentLeaseResponse | { error?: string } | null;
  if (!response.ok) {
    throw new AgentRouteError(
      response.status,
      `GSC_AGENT_LEASE_FAILED: ${payload && 'error' in payload ? payload.error : response.status}`,
    );
  }
  return payload as AgentLeaseResponse;
}

async function ingestDailySummary(
  env: AgentEnv,
  binding: AgentLeaseBinding,
  rows: Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>,
): Promise<void> {
  const response = await fetch(`${env.backendUrl}/gsc/agent/ingest/daily-summary`, {
    method: 'POST',
    headers: authHeaders(env),
    body: JSON.stringify({
      websiteId: env.siteId,
      agentId: env.agentId,
      bindingId: binding.bindingId,
      siteUrl: binding.siteUrl,
      type: binding.type || 'web',
      dataState: binding.dataState || 'final',
      rows,
    }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(`GSC_AGENT_INGEST_FAILED: ${payload?.error || response.status}`);
  }
}

async function heartbeat(env: AgentEnv, error?: string): Promise<void> {
  await fetch(`${env.backendUrl}/gsc/agent/heartbeat`, {
    method: 'POST',
    headers: authHeaders(env),
    body: JSON.stringify({ websiteId: env.siteId, agentId: env.agentId, error: error || null }),
  }).catch(() => undefined);
}

async function queryDailySummary(params: {
  accessToken: string;
  siteUrl: string;
  startDate: string;
  endDate: string;
  type: string;
  dataState: string;
}): Promise<Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>> {
  const response = await fetch(`${GSC_API_BASE}/sites/${encodeURIComponent(params.siteUrl)}/searchAnalytics/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: ['date'],
      type: params.type,
      aggregationType: 'byProperty',
      rowLimit: 25000,
      startRow: 0,
      dataState: params.dataState,
    }),
  });
  const payload = await response.json().catch(() => null) as { rows?: GscDailyRow[]; error?: { message?: string } } | null;
  if (!response.ok) {
    throw new Error(`GSC_QUERY_FAILED: ${payload?.error?.message || response.status}`);
  }
  return (Array.isArray(payload?.rows) ? payload.rows : [])
    .map((row) => ({
      date: Array.isArray(row.keys) ? String(row.keys[0] || '') : '',
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      ctr: Number(row.ctr || 0),
      position: Number(row.position || 0),
    }))
    .filter((row) => Boolean(row.date));
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

function resolveFinalDateRange(daysBack: number): { startDate: string; endDate: string } {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - Math.max(1, daysBack - 1));
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
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
