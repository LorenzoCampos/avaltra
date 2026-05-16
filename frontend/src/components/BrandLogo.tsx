import type { ImgHTMLAttributes } from 'react';

import { BRAND } from '../lib/brand';

type BrandLogoVariant = 'icon' | 'wordmark';
type BrandLogoSize = 'sm' | 'md' | 'lg';
type BrandLogoSurface = 'light' | 'dark' | 'auto';
type BrandMarkSize = 'sm' | 'md' | 'lg';

interface BrandLogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height'> {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  surface?: BrandLogoSurface;
  /** @deprecated Use surface="dark" instead. */
  darkSurfaceSafe?: boolean;
}

interface BrandMarkProps {
  showName?: boolean;
  markSize?: BrandMarkSize;
  className?: string;
}

const LOGO_DIMENSIONS: Record<BrandLogoVariant, Record<BrandLogoSize, { width: number; height: number }>> = {
  icon: {
    sm: { width: 32, height: 32 },
    md: { width: 40, height: 40 },
    lg: { width: 56, height: 56 },
  },
  wordmark: {
    sm: { width: 140, height: 31 },
    md: { width: 180, height: 40 },
    lg: { width: 240, height: 53 },
  },
};

const LOGO_SOURCES: Record<BrandLogoVariant, Record<Exclude<BrandLogoSurface, 'auto'>, string>> = {
  icon: {
    light: BRAND.assets.iconLightSvg,
    dark: BRAND.assets.iconDarkSvg,
  },
  wordmark: {
    light: BRAND.assets.wordmarkLightSvg,
    dark: BRAND.assets.wordmarkDarkSvg,
  },
};

const BRAND_MARK_SIZES: Record<BrandMarkSize, string> = {
  sm: 'h-8 w-8 text-lg',
  md: 'h-11 w-11 text-2xl',
  lg: 'h-14 w-14 text-3xl',
};

export function BrandMark({ showName = true, markSize = 'md', className = '' }: BrandMarkProps) {
  return (
    <span
      aria-label={BRAND.name}
      className={['inline-flex items-center gap-3 text-gray-950 dark:text-white', className].filter(Boolean).join(' ')}
    >
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-brand-primary font-black leading-none tracking-tight text-on-brand shadow-sm ${BRAND_MARK_SIZES[markSize]}`}
      >
        A
      </span>
      {showName && <span className="text-xl font-black tracking-tight leading-none">{BRAND.name}</span>}
    </span>
  );
}

export function BrandLogo({
  variant = 'wordmark',
  size = 'md',
  surface = 'light',
  alt = BRAND.name,
  darkSurfaceSafe = false,
  className = '',
  loading = 'lazy',
  decoding = 'async',
  ...props
}: BrandLogoProps) {
  const dimensions = LOGO_DIMENSIONS[variant][size];
  const resolvedSurface = darkSurfaceSafe ? 'dark' : surface;
  const imageProps = {
    alt,
    width: dimensions.width,
    height: dimensions.height,
    loading,
    decoding,
    className: ['inline-block h-auto max-w-full', className].filter(Boolean).join(' '),
    ...props,
  };

  if (resolvedSurface === 'auto') {
    return (
      <picture>
        <source media="(prefers-color-scheme: dark)" srcSet={LOGO_SOURCES[variant].dark} />
        <img src={LOGO_SOURCES[variant].light} {...imageProps} />
      </picture>
    );
  }

  return (
    <img
      src={LOGO_SOURCES[variant][resolvedSurface]}
      {...imageProps}
    />
  );
}
