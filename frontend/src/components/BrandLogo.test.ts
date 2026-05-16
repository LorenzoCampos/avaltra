import { describe, expect, it } from 'vitest';

import { BrandLogo, BrandMark } from './BrandLogo';
import { BRAND } from '../lib/brand';

describe('BrandLogo surface variants', () => {
  it('selects light-surface artwork by default with accessible image defaults', () => {
    const logo = BrandLogo({ variant: 'wordmark', size: 'sm' });

    expect(logo.type).toBe('img');
    expect(logo.props.src).toBe(BRAND.assets.wordmarkLightSvg);
    expect(logo.props.alt).toBe(BRAND.name);
    expect(logo.props.width).toBe(140);
    expect(logo.props.height).toBe(31);
    expect(logo.props.loading).toBe('lazy');
    expect(logo.props.decoding).toBe('async');
  });

  it('selects dark-surface-safe artwork for dark surfaces and legacy compatibility', () => {
    const darkIcon = BrandLogo({ variant: 'icon', surface: 'dark', alt: 'Avaltra icon' });
    const legacyDarkWordmark = BrandLogo({ variant: 'wordmark', darkSurfaceSafe: true });

    expect(darkIcon.props.src).toBe(BRAND.assets.iconDarkSvg);
    expect(darkIcon.props.alt).toBe('Avaltra icon');
    expect(legacyDarkWordmark.props.src).toBe(BRAND.assets.wordmarkDarkSvg);
  });

  it('renders a typographic A mark with optional Avaltra text without image assets', () => {
    const collapsedBrand = BrandMark({ showName: false });
    const expandedBrand = BrandMark({ showName: true, markSize: 'sm' });

    expect(collapsedBrand.type).toBe('span');
    expect(collapsedBrand.props['aria-label']).toBe(BRAND.name);
    expect(collapsedBrand.props.children[0].props.children).toBe('A');
    expect(collapsedBrand.props.children[1]).toBe(false);

    expect(expandedBrand.props.children[0].props.children).toBe('A');
    expect(expandedBrand.props.children[1].props.children).toBe(BRAND.name);
  });

  it('uses a theme-aware picture source when surface is auto', () => {
    const logo = BrandLogo({ variant: 'wordmark', surface: 'auto', size: 'md', className: 'mx-auto' });

    expect(logo.type).toBe('picture');
    expect(logo.props.children[0].type).toBe('source');
    expect(logo.props.children[0].props.media).toBe('(prefers-color-scheme: dark)');
    expect(logo.props.children[0].props.srcSet).toBe(BRAND.assets.wordmarkDarkSvg);
    expect(logo.props.children[1].props.src).toBe(BRAND.assets.wordmarkLightSvg);
    expect(logo.props.children[1].props.className).toContain('mx-auto');
  });
});
