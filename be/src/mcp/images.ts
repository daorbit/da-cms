import { withTransform } from '../lib/cloudinary.js';
import type { MediaResponse } from '../services/media.service.js';

/** Delivery crops for the two page images. The stored original is untouched. */
export const IMAGE_VARIANTS = {
  hero: 'c_fill,g_auto,w_1600,h_900,q_auto,f_auto',
  thumbnail: 'c_fill,g_auto,w_1200,h_630,q_auto,f_auto',
  original: '',
} as const;

export type ImageVariant = keyof typeof IMAGE_VARIANTS;

export const IMAGE_VARIANT_NAMES = Object.keys(IMAGE_VARIANTS) as [ImageVariant, ...ImageVariant[]];

/** What a tool returns for an image: the URL to put on the page, plus the original. */
export function imageForPage(item: MediaResponse, variant: ImageVariant) {
  const transform = IMAGE_VARIANTS[variant];
  return {
    mediaId: item.id,
    url: (transform && withTransform(item.url, transform)) || item.url,
    originalUrl: item.url,
    alt: item.alt,
    width: item.width,
    height: item.height,
  };
}
