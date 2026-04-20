#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { dirname, join, basename, extname } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const publicDir = join(projectRoot, 'public');

loadEnvFile(join(projectRoot, '.env'));

const env = resolveTemplateEnv();
const manifestUrl = `${env.backendBaseUrl}/pages/${env.siteId}/manifest`;
const storageBase = env.mediaStorageUrl;

const manifestResponse = await fetch(manifestUrl, {
  headers: { accept: 'application/json' },
});

if (!manifestResponse.ok) {
  throw new Error(
    `[fetch-manifest] Failed to fetch manifest: ${manifestResponse.status} ${manifestResponse.statusText}`,
  );
}

const manifest = await manifestResponse.json();

await mkdir(publicDir, { recursive: true });

const manifestOutputPath = join(publicDir, 'site-manifest.json');
await writeFile(manifestOutputPath, JSON.stringify(manifest, null, 2));

const { assets, manifestFile } = collectAssetsFromManifest(manifest, storageBase);

const downloadedTargets = new Set(assets.keys());

if (!assets.size) {
  process.exit(0);
}

let successCount = 0;
for (const [targetName, sourceUrl] of assets.entries()) {
  try {
    await downloadAsset(sourceUrl, join(publicDir, targetName));
    successCount += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[fetch-manifest] Failed to download ${sourceUrl}: ${message}`);
  }
}

const additionalCount = await downloadManifestEmbeddedAssets({
  manifestFile,
  storageBase,
  downloadedTargets,
});

successCount += additionalCount;

function resolveTemplateEnv() {
  const readEnv = (key) => (process.env[key] || '').trim();
  const normalizeBaseUrl = (value) => value.replace(/\/+$/, '');

  const siteId = readEnv('SITE_ID');
  if (!siteId) {
    throw new Error('[fetch-manifest] SITE_ID is required');
  }

  const backendBaseUrlRaw = readEnv('BACKEND_URL');
  if (!backendBaseUrlRaw) {
    throw new Error('[fetch-manifest] BACKEND_URL is required');
  }

  const backendBaseUrl = normalizeBaseUrl(backendBaseUrlRaw);
  const mediaStorageUrlRaw = readEnv('MEDIA_STORAGE_URL');
  const mediaStorageUrl = mediaStorageUrlRaw ? normalizeBaseUrl(mediaStorageUrlRaw) : '';

  return {
    siteId,
    backendBaseUrl,
    mediaStorageUrl,
  };
}

function collectAssetsFromManifest(manifestPayload, storageBaseUrl) {
  const assetMap = new Map();
  let manifestFile = null;

  const addAsset = (source, target) => {
    if (!source || !target) {
      return;
    }
    assetMap.set(target, source);
  };

  const icons = Array.isArray(manifestPayload?.icons) ? manifestPayload.icons : [];
  for (const icon of icons) {
    const rawUrl = icon?.s3Url || icon?.href;
    const resolved = resolveAssetUrl(rawUrl, storageBaseUrl);
    const filename = icon?.fileName || (rawUrl ? basename(rawUrl) : null);
    if (!manifestFile && filename && filename.toLowerCase().endsWith('.webmanifest')) {
      manifestFile = {
        fileName: filename,
        rawPath: rawUrl || null,
      };
    }
    addAsset(resolved, filename);
  }

  const allowedExtensions = new Set([
    '.png',
    '.svg',
    '.ico',
    '.json',
    '.xml',
    '.webmanifest',
  ]);
  const metaEntries = manifestPayload?.meta && typeof manifestPayload.meta === 'object'
    ? Object.entries(manifestPayload.meta)
    : [];
  for (const [, value] of metaEntries) {
    if (typeof value !== 'string') {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    const ext = extname(trimmed).toLowerCase();
    if (!allowedExtensions.has(ext)) {
      continue;
    }
    const resolved = resolveAssetUrl(trimmed, storageBaseUrl);
    addAsset(resolved, basename(trimmed));
  }

  return { assets: assetMap, manifestFile };
}

async function downloadAsset(sourceUrl, destinationPath) {
  if (!/^https?:\/\//i.test(sourceUrl)) {
    throw new Error(`Only http/https sources supported. Received: ${sourceUrl}`);
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await writeFile(destinationPath, Buffer.from(arrayBuffer));
}

function resolveAssetUrl(rawUrl, storageBaseUrl) {
  if (!rawUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  if (!storageBaseUrl) {
    throw new Error(
      `MEDIA_STORAGE_URL is required to resolve relative asset path: ${rawUrl}`,
    );
  }

  return `${storageBaseUrl}${rawUrl}`;
}

async function downloadManifestEmbeddedAssets({ manifestFile, storageBase, downloadedTargets }) {
  if (!manifestFile?.fileName) {
    return 0;
  }

  const localPath = join(publicDir, manifestFile.fileName);
  if (!existsSync(localPath)) {
    return 0;
  }

  let manifestContent;
  try {
    const raw = await readFile(localPath, 'utf-8');
    manifestContent = JSON.parse(raw);
  } catch {
    return 0;
  }

  const manifestBasePath = manifestFile.rawPath ? extractManifestBase(manifestFile.rawPath) : '';
  const additionalAssets = new Map();

  const register = (src) => {
    if (typeof src !== 'string' || !src.trim()) {
      return;
    }
    const normalizedSrc = src.trim();
    if (/^https?:\/\//i.test(normalizedSrc) || normalizedSrc.startsWith('data:')) {
      return;
    }

    const combinedPath = joinManifestPath(manifestBasePath, normalizedSrc);
    const resolvedUrl = resolveAssetUrl(combinedPath, storageBase);
    const targetName = basename(normalizedSrc).replace(/^\/+/, '');
    if (!resolvedUrl || !targetName || downloadedTargets.has(targetName)) {
      return;
    }
    additionalAssets.set(targetName, resolvedUrl);
    downloadedTargets.add(targetName);
  };

  const icons = Array.isArray(manifestContent?.icons) ? manifestContent.icons : [];
  for (const icon of icons) {
    register(icon?.src);
  }

  const screenshots = Array.isArray(manifestContent?.screenshots) ? manifestContent.screenshots : [];
  for (const shot of screenshots) {
    register(shot?.src);
  }

  const shortcuts = Array.isArray(manifestContent?.shortcuts) ? manifestContent.shortcuts : [];
  for (const shortcut of shortcuts) {
    if (Array.isArray(shortcut?.icons)) {
      for (const shortcutIcon of shortcut.icons) {
        register(shortcutIcon?.src);
      }
    }
  }

  if (!additionalAssets.size) {
    return 0;
  }

  let count = 0;
  for (const [targetName, sourceUrl] of additionalAssets.entries()) {
    try {
      await downloadAsset(sourceUrl, join(publicDir, targetName));
      count += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`[fetch-manifest] Failed to download ${sourceUrl}: ${message}`);
    }
  }

  return count;
}

function extractManifestBase(rawPath) {
  if (!rawPath) {
    return '';
  }
  const withoutQuery = rawPath.replace(/[#?].*$/, '');
  const slashIndex = withoutQuery.lastIndexOf('/');
  return slashIndex === -1 ? '' : withoutQuery.slice(0, slashIndex + 1);
}

function joinManifestPath(basePath, relativePath) {
  if (!basePath) {
    return relativePath;
  }
  if (!relativePath) {
    return basePath;
  }
  const cleanedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return relativePath.startsWith('/')
    ? `${cleanedBase}${relativePath.replace(/^\/+/, '')}`
    : `${cleanedBase}${relativePath}`;
}

function loadEnvFile(envPath) {
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    if (!key || key in process.env) {
      continue;
    }

    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}
