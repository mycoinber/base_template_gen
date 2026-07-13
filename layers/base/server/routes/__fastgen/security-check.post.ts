import {
  defineEventHandler,
  getHeader,
  readBody,
  setHeader,
  setResponseStatus,
} from 'h3';
import { runFastgenSecurityCheck } from '../../utils/fastgen-security';

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store');
  setHeader(event, 'X-Robots-Tag', 'noindex, nofollow');

  const incomingToken = extractBearerToken(getHeader(event, 'authorization'));
  if (!incomingToken) {
    setResponseStatus(event, 401, 'Unauthorized');
    return { error: true, message: 'Unauthorized' };
  }

  const body = await readBody<{
    websiteId?: string;
    agentId?: string;
    domain?: string;
  }>(event).catch(() => ({}));
  const config = useRuntimeConfig(event);
  const backendUrl = trimTrailingSlash(
    readRuntimeEnv(event, 'GSC_BACKEND_URL') ||
      readRuntimeEnv(event, 'BACKEND_URL') ||
      config.server?.gscBackendUrl ||
      config.public?.gscBackendUrl ||
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
    setResponseStatus(event, 503, 'SECURITY_AGENT_NOT_CONFIGURED');
    return { error: true, message: 'SECURITY_AGENT_NOT_CONFIGURED', missing };
  }

  const result = await runFastgenSecurityCheck(event, {
    backendUrl,
    siteId,
    agentId,
    token: incomingToken,
    domain: body.domain,
  });
  if (!result.ok) {
    setResponseStatus(event, result.status === 'unknown' ? 202 : 502);
  }
  return result;
});

function extractBearerToken(raw: string | undefined): string {
  const value = String(raw || '').trim();
  if (!value.toLowerCase().startsWith('bearer ')) return '';
  return value.slice(7).trim();
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
