import type { ImgHTMLAttributes } from 'react';

import { BRAND } from '../lib/brand';

type BrandLogoVariant = 'icon' | 'wordmark';
type BrandLogoSize = 'sm' | 'md' | 'lg';

interface BrandLogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height'> {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  darkSurfaceSafe?: boolean;
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

const LOGO_SOURCES: Record<BrandLogoVariant, string> = {
  icon: BRAND.assets.iconSvg,
  wordmark: BRAND.assets.wordmarkSvg,
};

export function BrandLogo({
  variant = 'wordmark',
  size = 'md',
  alt = BRAND.name,
  darkSurfaceSafe = false,
  className = '',
  loading = 'lazy',
  decoding = 'async',
  ...props
}: BrandLogoProps) {
  const dimensions = LOGO_DIMENSIONS[variant][size];
  const darkSurfaceClass = darkSurfaceSafe ? 'brand-logo--dark-surface-safe' : '';

  return (
    <img
      src={LOGO_SOURCES[variant]}
      alt={alt}
      width={dimensions.width}
      height={dimensions.height}
      loading={loading}
      decoding={decoding}
      className={['inline-block h-auto max-w-full', darkSurfaceClass, className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
