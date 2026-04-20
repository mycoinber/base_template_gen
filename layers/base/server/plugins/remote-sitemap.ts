import { defineNitroPlugin, useRuntimeConfig } from "#imports";
import type { NitroApp } from 'nitropack';
import type { H3Event } from 'h3';
import {
  createRemoteSitemapHandlers,
  shouldHandleSitemapEvent,
} from "../../utils/remote-sitemap";

const buildHandlers = () => {
  const runtimeConfig =
    (typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : {}) ||
    {};
  const serverConfig = (runtimeConfig as any)?.server || {};
  const publicConfig = (runtimeConfig as any)?.public || {};

  const envSiteId = (process.env.SITE_ID || '').trim();
  const envBackHost = (process.env.BACKEND_URL || '').trim();
  const envSitemapApi = (process.env.BACKEND_URL || '').trim();

  return createRemoteSitemapHandlers({
    siteId: envSiteId || serverConfig.siteId || publicConfig.siteId || '',
    backendBaseUrl: envBackHost || serverConfig.backHost || publicConfig.backHost || '',
    sitemapApiBase: envSitemapApi || serverConfig.backHost || publicConfig.backHost || '',
  });
};

export default defineNitroPlugin((nitroApp: NitroApp) => {
  nitroApp.hooks.hook('sitemap:output', async (ctx: { event?: H3Event; sitemap?: string }) => {
    if (!shouldHandleSitemapEvent(ctx.event)) {
      return;
    }

    const { fetchRemoteSitemap, buildSitemapFromPayload } = buildHandlers();
    const payload = await fetchRemoteSitemap();
    ctx.sitemap = buildSitemapFromPayload(payload, ctx.event);
  });

  nitroApp.hooks.hook('render:response', async (response: { headers?: Record<string, string>; body?: string }, { event }: { event?: H3Event }) => {
    if (!shouldHandleSitemapEvent(event)) {
      return;
    }

    const { fetchRemoteSitemap, buildSitemapFromPayload } = buildHandlers();
    const payload = await fetchRemoteSitemap();
    const body = buildSitemapFromPayload(payload, event);

    response.headers = response.headers || {};
    response.headers['content-type'] = 'application/xml; charset=utf-8';
    if (!response.headers['cache-control']) {
      response.headers['cache-control'] = 'public, max-age=600, s-maxage=600';
    }
    response.body = body;
  });
});
