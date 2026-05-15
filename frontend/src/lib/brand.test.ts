import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { BRAND } from './brand';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));

const readFrontendFile = (relativePath: string) => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

describe('brand contract', () => {
  it('exposes the approved Avaltra identity, asset URLs, palette and PDF color tuple', () => {
    expect(BRAND).toEqual({
      name: 'Avaltra',
      tagline: 'Personal and family finance management',
      assets: {
        iconSvg: '/brand/avaltra-isotipo.svg',
        iconPng: '/brand/avaltra-isotipo.png',
        wordmarkSvg: '/brand/avaltra-imagotipo.svg',
        wordmarkPng: '/brand/avaltra-imagotipo.png',
      },
      colors: {
        trustBlue: '#003366',
        growthTeal: '#005a73',
        innovationAqua: '#008080',
        graphite: '#444444',
        cloud: '#f5f7fa',
        white: '#ffffff',
      },
      pdf: {
        primaryRgb: [0, 51, 102],
      },
    });
  });

  it('publishes all approved runtime logo assets under stable public brand paths', async () => {
    const assets = await Promise.all(
      Object.values(BRAND.assets).map(async (assetUrl) => {
        const content = await readFile(`${projectRoot}/public${assetUrl}`);

        return { assetUrl, content };
      }),
    );

    expect(assets.map(({ assetUrl }) => assetUrl)).toEqual([
      '/brand/avaltra-isotipo.svg',
      '/brand/avaltra-isotipo.png',
      '/brand/avaltra-imagotipo.svg',
      '/brand/avaltra-imagotipo.png',
    ]);
    for (const { content } of assets) {
      expect(content.byteLength).toBeGreaterThan(0);
    }
  });
});

describe('brand install metadata', () => {
  it('points browser shell metadata at approved SVG and PNG brand assets', async () => {
    const html = await readFrontendFile('index.html');

    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/brand/avaltra-isotipo.svg" />');
    expect(html).toContain('<link rel="alternate icon" type="image/png" href="/brand/avaltra-isotipo.png" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="/brand/avaltra-isotipo.png" />');
    expect(html).toContain('<meta name="theme-color" content="#003366" />');
    expect(html).toContain('<title>Avaltra - Personal and family finance management</title>');
  });

  it('configures the PWA manifest with SVG icons and PNG fallbacks', async () => {
    const viteConfig = await readFrontendFile('vite.config.ts');

    expect(viteConfig).toContain('includeAssets: [publicAsset(BRAND.assets.iconSvg), publicAsset(BRAND.assets.iconPng)]');
    expect(viteConfig).toContain('theme_color: BRAND.colors.trustBlue');
    expect(viteConfig).toContain('background_color: BRAND.colors.white');
    expect(viteConfig).toContain('src: publicAsset(BRAND.assets.iconSvg)');
    expect(viteConfig).toContain("type: 'image/svg+xml'");
    expect(viteConfig).toContain('src: publicAsset(BRAND.assets.iconPng)');
    expect(viteConfig).toContain("type: 'image/png'");
    expect(viteConfig).toContain("purpose: 'any'");
    expect(viteConfig).toContain("purpose: 'maskable'");
  });
});
