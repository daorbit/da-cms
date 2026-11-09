import { randomBytes } from 'node:crypto';
import { MediaModel } from '../models/media.model.js';
import {
  checkDataUrl,
  cloudinaryConfigured,
  resourceKind,
  uploadAsset,
  type ResourceKind,
  type UploadResult,
} from '../lib/cloudinary.js';
import { ServiceError } from '../lib/service-error.js';

/** Ceiling on one upload. Video is the reason this is not smaller. */
const MAX_BYTES = 25 * 1024 * 1024;

export interface MediaDoc {
  _id: unknown;
  name: string;
  alt?: string;
  url: string;
  publicId: string;
  kind: string;
  mime: string;
  format?: string;
  bytes?: number;
  width?: number | null;
  height?: number | null;
  thumbnailUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export function toResponse(doc: MediaDoc) {
  return {
    id: String(doc._id),
    name: doc.name,
    alt: doc.alt ?? '',
    url: doc.url,
    kind: doc.kind,
    mime: doc.mime,
    format: doc.format ?? '',
    bytes: doc.bytes ?? 0,
    width: doc.width ?? null,
    height: doc.height ?? null,
    // Falls back to the asset itself: a picker needs something to show, and for
    // an image the original is a valid preview.
    thumbnailUrl: doc.thumbnailUrl || (doc.kind === 'image' ? doc.url : ''),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type MediaResponse = ReturnType<typeof toResponse>;

export interface MediaFile {
  /** A base64 data URL. */
  file: string;
  name: string;
  alt: string;
}

export interface UploadOutcome {
  items: MediaResponse[];
  failed: { name: string; message: string }[];
}

function assetId(): string {
  return randomBytes(12).toString('hex');
}

function ensureStorage() {
  if (!cloudinaryConfigured()) {
    throw new ServiceError(503, 'storage_unavailable', 'File storage is not configured');
  }
}

/** Uploads one source (a data URL or a remote URL) and records it in the library. */
async function store(
  workspaceId: string,
  userId: string | undefined,
  source: { file: string; name: string; alt: string; kind: ResourceKind; mime?: string; bytes?: number }
): Promise<MediaResponse> {
  const uploaded: UploadResult = await uploadAsset({
    file: source.file,
    folder: `da-cms/${workspaceId}`,
    publicId: assetId(),
    kind: source.kind,
  });

  const doc = await MediaModel.create({
    workspaceId,
    name: source.name,
    alt: source.alt,
    url: uploaded.url,
    publicId: uploaded.publicId,
    kind: uploaded.kind,
    mime: source.mime ?? `${uploaded.kind}/${uploaded.format}`,
    format: uploaded.format,
    bytes: uploaded.bytes || source.bytes || 0,
    width: uploaded.width ?? null,
    height: uploaded.height ?? null,
    thumbnailUrl: uploaded.thumbnailUrl ?? '',
    uploadedBy: userId,
  });

  return toResponse(doc as unknown as MediaDoc);
}

const failureMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

export async function uploadFiles(
  workspaceId: string,
  userId: string | undefined,
  files: MediaFile[]
): Promise<UploadOutcome> {
  ensureStorage();

  const results = await Promise.all(
    files.map(async ({ file, name, alt }) => {
      const checked = checkDataUrl(file, MAX_BYTES);
      if ('error' in checked) return { ok: false as const, name, message: checked.error };

      try {
        const item = await store(workspaceId, userId, {
          file,
          name,
          alt,
          kind: resourceKind(checked.mime),
          mime: checked.mime,
          bytes: checked.bytes,
        });
        return { ok: true as const, item };
      } catch (err) {
        return { ok: false as const, name, message: failureMessage(err, 'Could not upload that file') };
      }
    })
  );

  return {
    items: results.filter((r) => r.ok).map((r) => r.item),
    failed: results.filter((r) => !r.ok).map((r) => ({ name: r.name, message: r.message })),
  };
}

/**
 * Imports an image from a public URL. Cloudinary fetches it, so this server
 * never requests an arbitrary address itself, and the image pipeline rejects
 * anything that is not an image.
 */
export async function importRemoteImage(
  workspaceId: string,
  userId: string | undefined,
  source: { url: string; name: string; alt: string }
): Promise<MediaResponse> {
  ensureStorage();

  if (!/^https:\/\//i.test(source.url)) {
    throw new ServiceError(400, 'invalid_input', 'Image URL must start with https://');
  }

  try {
    return await store(workspaceId, userId, { file: source.url, name: source.name, alt: source.alt, kind: 'image' });
  } catch (err) {
    throw new ServiceError(502, 'upload_failed', failureMessage(err, 'Could not import that image'));
  }
}

export interface MediaListQuery {
  kind?: unknown;
  q?: unknown;
  page?: unknown;
  perPage?: unknown;
}

export async function listMedia(workspaceId: string, query: MediaListQuery) {
  const { kind, q } = query;

  const filter: Record<string, unknown> = { workspaceId };
  if (kind === 'image' || kind === 'video' || kind === 'raw') filter.kind = kind;
  if (typeof q === 'string' && q.trim()) {
    const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = { $regex: safe, $options: 'i' };
  }

  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
  const perPageRaw = Number.parseInt(String(query.perPage ?? '40'), 10) || 40;
  const perPage = Math.min(100, Math.max(1, perPageRaw));

  const [items, total] = await Promise.all([
    MediaModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage),
    MediaModel.countDocuments(filter),
  ]);

  return {
    items: items.map((doc) => toResponse(doc as unknown as MediaDoc)),
    total,
    page,
    perPage,
  };
}
