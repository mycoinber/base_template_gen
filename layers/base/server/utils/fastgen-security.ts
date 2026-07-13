import { getHeader } from 'h3';

type SecurityStatus = 'safe' | 'threat_detected' | 'unknown' | 'error';

interface SecurityAgentInput {
  backendUrl: string;
  siteId: string;
  agentId: string;
  token: string;
  domain?: string | null;
}

interface SafeBrowsingMatch {
  threatType?: string;
  platformType?: string;
  threatEntryType?: string;
  threat?: {
    url?: string;
  };
}

export async function runFastgenSecurityCheck(event: any, input: SecurityAgentInput) {
  const backendUrl = trimTrailingSlash(input.backendUrl);
  const siteId = String(input.siteId || '').trim();
  const agentId = String(input.agentId || '').trim();
  const token = String(input.token || '').trim();
  const domain = resolveDomain(event, input.domain);
  const checkedAt = new Date().toISOString();

  if (!backendUrl || !siteId || !agentId || !token || !domain) {
    return {
      ok: false,
      status: 'unknown' as SecurityStatus,
      skipped: true,
      errorCode: 'SECURITY_AGENT_NOT_CONFIGURED',
    };
  }

  const apiKey = readSafeBrowsingApiKey(event);
  const urls = buildUrlCandidates(domain);
  if (!apiKey) {
    await reportSecurityResult({
      backendUrl,
      siteId,
      agentId,
      token,
      domain,
      status: 'unknown',
      checkedAt,
      checkedUrls: urls,
      matches: [],
      errorCode: 'SAFE_BROWSING_API_KEY_MISSING',
      errorMessage: 'SAFE_BROWSING_API_KEY is not configured',
    });
    return {
      ok: false,
      status: 'unknown' as SecurityStatus,
      checkedUrls: urls,
      errorCode: 'SAFE_BROWSING_API_KEY_MISSING',
    };
  }

  try {
    const matches = await querySafeBrowsing(apiKey, urls);
    const normalizedMatches = matches.map((match) => ({
      url: match.threat?.url || null,
      threatType: match.threatType || null,
      platformType: match.platformType || null,
      threatEntryType: match.threatEntryType || null,
    }));
    const status: SecurityStatus = normalizedMatches.length ? 'threat_detected' : 'safe';
    await reportSecurityResult({
      backendUrl,
      siteId,
      agentId,
      token,
      domain,
      status,
      checkedAt,
      checkedUrls: urls,
      matches: normalizedMatches,
    });
    return {
      ok: true,
      status,
      checkedUrls: urls,
      matches: normalizedMatches,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SAFE_BROWSING_CHECK_FAILED';
    await reportSecurityResult({
      backendUrl,
      siteId,
      agentId,
      token,
      domain,
      status: 'error',
      checkedAt,
      checkedUrls: urls,
      matches: [],
      errorCode: 'SAFE_BROWSING_CHECK_FAILED',
      errorMessage: message,
    });
    return {
      ok: false,
      status: 'error' as SecurityStatus,
      checkedUrls: urls,
      errorCode: 'SAFE_BROWSING_CHECK_FAILED',
      errorMessage: message,
    };
  }
}

async function querySafeBrowsing(apiKey: string, urls: string[]): Promise<SafeBrowsingMatch[]> {
  const response = await fetch(
    `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: {
          clientId: 'fastgen',
          clientVersion: '1.0.0',
        },
        threatInfo: {
          threatTypes: [
            'MALWARE',
            'SOCIAL_ENGINEERING',
            'UNWANTED_SOFTWARE',
            'POTENTIALLY_HARMFUL_APPLICATION',
          ],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: urls.map((url) => ({ url })),
        },
      }),
    },
  );
  const payload = await response.json().catch(() => null) as { matches?: SafeBrowsingMatch[]; error?: { message?: string } } | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message || `SAFE_BROWSING_HTTP_${response.status}`);
  }
  return Array.isArray(payload?.matches) ? payload.matches : [];
}

async function reportSecurityResult(payload: {
  backendUrl: string;
  siteId: string;
  agentId: string;
  token: string;
  domain: string;
  status: SecurityStatus;
  checkedAt: string;
  checkedUrls: string[];
  matches: Array<{
    url?: string | null;
    threatType?: string | null;
    platformType?: string | null;
    threatEntryType?: string | null;
  }>;
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  const response = await fetch(`${payload.backendUrl}/security/agent/report`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${payload.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      websiteId: payload.siteId,
      agentId: payload.agentId,
      domain: payload.domain,
      provider: 'google_safe_browsing',
      status: payload.status,
      checkedAt: payload.checkedAt,
      source: 'agent',
      checkedUrls: payload.checkedUrls,
      matches: payload.matches,
      errorCode: payload.errorCode || null,
      errorMessage: payload.errorMessage || null,
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`SECURITY_AGENT_REPORT_FAILED: ${text.slice(0, 300) || response.status}`);
  }
}

function resolveDomain(event: any, value?: string | null): string {
  const explicit = normalizeHost(value);
  if (explicit) return explicit;
  const config = useRuntimeConfig(event);
  const runtimeSiteUrl = readRuntimeEnv(event, 'SITE_URL');
  const configured = normalizeHost(runtimeSiteUrl || config.server?.siteUrl || config.public?.siteUrl || '');
  if (configured) return configured;
  const host = normalizeHost(getHeader(event, 'x-forwarded-host') || getHeader(event, 'host') || '');
  return host;
}

function normalizeHost(value?: string | null): string {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  const withoutProtocol = raw.replace(/^https?:\/\//, '');
  const host = withoutProtocol.split(/[/?#]/)[0].replace(/:\d+$/, '').replace(/\.$/, '');
  return host.startsWith('www.') ? host.slice(4) : host;
}

function buildUrlCandidates(domain: string): string[] {
  const normalized = normalizeHost(domain);
  if (!normalized) return [];
  return Array.from(new Set([
    `https://${normalized}/`,
    `http://${normalized}/`,
    `https://www.${normalized}/`,
    `http://www.${normalized}/`,
  ]));
}

function readSafeBrowsingApiKey(event: any): string {
  const config = useRuntimeConfig(event);
  return String(
    readRuntimeEnv(event, 'SAFE_BROWSING_API_KEY') ||
      config.server?.safeBrowsingApiKey ||
      '',
  ).trim();
}

function readRuntimeEnv(event: any, key: string): string {
  const cfEnv =
    event?.context?.cloudflare?.env ||
    event?.context?.cloudflare?.context?.env ||
    {};
  return String(process.env[key] || cfEnv[key] || '').trim();
}

function trimTrailingSlash(value: string): string {
  return String(value || '').replace(/\/+$/, '');
}
