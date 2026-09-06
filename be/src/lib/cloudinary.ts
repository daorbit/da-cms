import { createHash } from 'node:crypto';



const CLOUD_NAME = () => process.env.CLOUDINARY_CLOUD_NAME ?? '';
const API_KEY = () => process.env.CLOUDINARY_API_KEY ?? '';
const API_SECRET = () => process.env.CLOUDINARY_API_SECRET ?? '';

export function cloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME() && API_KEY() && API_SECRET());
}


function sign(params: Record<string, string>): string {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return createHash('sha1')
    .update(base + API_SECRET())
    .digest('hex');
}


export type ResourceKind = 'image' | 'video' | 'raw';

export interface UploadResult {
  url: string;
  publicId: string;
  kind: ResourceKind;
  bytes: number;
  format: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

export function resourceKind(mime: string): ResourceKind {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/') || mime.startsWith('audio/')) return 'video';
  return 'raw';
}


export async function uploadAsset(opts: {
  file: string;
  folder: string;
  publicId: string;
  kind: ResourceKind;
}): Promise<UploadResult> {
  if (!cloudinaryConfigured()) throw new Error('cloudinary is not configured');

  const signed: Record<string, string> = {
    folder: opts.folder,
    public_id: opts.publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };

  const form = new URLSearchParams({
    ...signed,
    signature: sign(signed),
    api_key: API_KEY(),
    file: opts.file,
  });

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME()}/${opts.kind}/upload`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      // Generous: the body carries the whole file, and a slow upstream should
      // not turn a working upload into a failed one.
      signal: AbortSignal.timeout(60_000),
    }
  );

  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    const message =
      (data?.error as { message?: string } | undefined)?.message ?? res.statusText;
    throw new Error(`cloudinary upload failed: ${message}`);
  }

  const url = String(data.secure_url ?? '');
  if (!url) throw new Error('cloudinary returned no URL');

  return {
    url,
    publicId: String(data.public_id ?? ''),
    kind: opts.kind,
    bytes: Number(data.bytes ?? 0),
    format: String(data.format ?? ''),
    width: typeof data.width === 'number' ? data.width : undefined,
    height: typeof data.height === 'number' ? data.height : undefined,
    thumbnailUrl: thumbnailFor(url, opts.kind),
  };
}


export function thumbnailFor(url: string, kind: ResourceKind): string | undefined {
  if (kind === 'raw') return undefined;

  const marker = '/upload/';
  const at = url.indexOf(marker);
  if (at === -1) return undefined;

  const transform = 'c_fill,w_480,h_320,q_auto,f_auto/';
  const base = url.slice(0, at + marker.length) + transform + url.slice(at + marker.length);

  return kind === 'video' ? base.replace(/\.[^./]+$/, '.jpg') : base;
}


export async function deleteAsset(publicId: string, kind: ResourceKind): Promise<void> {
  if (!cloudinaryConfigured() || !publicId) return;

  const signed = {
    public_id: publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };

  const form = new URLSearchParams({
    ...signed,
    signature: sign(signed),
    api_key: API_KEY(),
  });

  try {
    await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME()}/${kind}/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    console.error('[cloudinary] delete failed:', err instanceof Error ? err.message : err);
  }
}


const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
]);

export interface ParsedDataUrl {
  mime: string;
  bytes: number;
}


export function checkDataUrl(
  dataUrl: string,
  maxBytes: number
): { error: string } | ParsedDataUrl {
  const match = /^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl);
  if (!match) return { error: 'Expected a base64 data URL' };

  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return { error: `Files of type "${mime}" are not supported` };
  }

  const b64 = match[2];
  // Every 4 base64 characters encode 3 bytes, less any padding.
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  const bytes = Math.floor((b64.length * 3) / 4) - padding;

  if (bytes <= 0) return { error: 'That file is empty' };
  if (bytes > maxBytes) {
    return { error: `File must be ${Math.round(maxBytes / 1024 / 1024)}MB or smaller` };
  }

  return { mime, bytes };
}
