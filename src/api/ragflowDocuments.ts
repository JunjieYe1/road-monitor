import { agentFetch } from "./agentClient";

export interface RagflowDocument {
  id: string;
  name: string;
  suffix?: string;
  size?: number;
  run?: string;
  created_by?: string;
}

export interface RagflowChunk {
  id: string;
  content: string;
  document_id: string;
}

export interface RagflowDocumentListParams {
  dataset_alias?: string;
  dataset_id?: string;
  page?: number;
  page_size?: number;
  orderby?: string;
  desc?: boolean;
  keywords?: string;
  id?: string;
  name?: string;
  suffix?: string;
  run?: string;
  create_time_from?: number;
  create_time_to?: number;
}

export interface RagflowChunkListParams {
  dataset_alias?: string;
  dataset_id?: string;
  page?: number;
  page_size?: number;
  keywords?: string;
  id?: string;
}

export interface RagflowDocumentListResult {
  dataset_id: string;
  docs: RagflowDocument[];
  total: number;
}

export interface RagflowChunkListResult {
  dataset_id: string;
  document_id: string;
  chunks: RagflowChunk[];
  total: number;
}

export interface RagflowUploadOptions {
  dataset_id?: string;
  parse?: boolean;
}

export interface RagflowUploadResult {
  dataset_id: string;
  document_ids: string[];
  uploaded: RagflowDocument[];
  parse_started: boolean;
  parse_error: unknown;
  message: string;
}

const DEFAULT_DOCUMENT_PARAMS = {
  dataset_alias: "default",
  page: 1,
  page_size: 6,
  suffix: "pdf",
};

const DEFAULT_CHUNK_PARAMS = {
  dataset_alias: "default",
  page: 1,
  page_size: 30,
};

function appendQuery(path: string, params: Record<string, unknown>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    qs.set(key, String(value));
  }
  const query = qs.toString();
  return query ? `${path}?${query}` : path;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function normalizeDocument(raw: unknown): RagflowDocument | null {
  const row = asRecord(raw);
  const id = String(row.id ?? "");
  const name = String(row.name ?? "");
  if (!id || !name) return null;
  const size = Number(row.size);
  return {
    id,
    name,
    suffix: row.suffix == null ? undefined : String(row.suffix),
    size: Number.isFinite(size) ? size : undefined,
    run: row.run == null ? undefined : String(row.run),
    created_by: row.created_by == null ? undefined : String(row.created_by),
  };
}

function normalizeChunk(raw: unknown): RagflowChunk | null {
  const row = asRecord(raw);
  const id = String(row.id ?? "");
  const documentId = String(row.document_id ?? "");
  if (!id) return null;
  return {
    id,
    content: String(row.content ?? ""),
    document_id: documentId,
  };
}

export async function apiListRagflowDocuments(
  params: RagflowDocumentListParams = {},
): Promise<RagflowDocumentListResult> {
  const raw = asRecord(
    await agentFetch(appendQuery("/ragflow/documents", { ...DEFAULT_DOCUMENT_PARAMS, ...params })),
  );
  const documents = asRecord(raw.documents);
  const data = asRecord(documents.data);
  const docsRaw = Array.isArray(data.docs) ? data.docs : [];
  const total = Number(data.total);
  return {
    dataset_id: String(raw.dataset_id ?? ""),
    docs: docsRaw.map(normalizeDocument).filter((doc): doc is RagflowDocument => !!doc),
    total: Number.isFinite(total) ? total : 0,
  };
}

export async function apiListRagflowDocumentChunks(
  documentId: string,
  params: RagflowChunkListParams = {},
): Promise<RagflowChunkListResult> {
  const encodedId = encodeURIComponent(documentId);
  const raw = asRecord(
    await agentFetch(
      appendQuery(`/ragflow/documents/${encodedId}/chunks`, {
        ...DEFAULT_CHUNK_PARAMS,
        ...params,
      }),
    ),
  );
  const chunks = asRecord(raw.chunks);
  const data = asRecord(chunks.data);
  const chunksRaw = Array.isArray(data.chunks) ? data.chunks : [];
  const total = Number(data.total);
  return {
    dataset_id: String(raw.dataset_id ?? ""),
    document_id: String(raw.document_id ?? documentId),
    chunks: chunksRaw.map(normalizeChunk).filter((chunk): chunk is RagflowChunk => !!chunk),
    total: Number.isFinite(total) ? total : 0,
  };
}

export async function apiUploadRagflowDocuments(
  files: File[],
  options: RagflowUploadOptions = {},
): Promise<RagflowUploadResult> {
  const form = new FormData();
  for (const file of files) {
    form.append("file", file);
  }
  if (options.dataset_id) form.append("dataset_id", options.dataset_id);
  form.append("parse", String(options.parse ?? false));

  const raw = asRecord(
    await agentFetch("/ragflow/upload", {
      method: "POST",
      body: form,
    }),
  );
  const idsRaw = Array.isArray(raw.document_ids) ? raw.document_ids : [];
  const uploadedRaw = Array.isArray(raw.uploaded) ? raw.uploaded : [];
  return {
    dataset_id: String(raw.dataset_id ?? ""),
    document_ids: idsRaw.map((id) => String(id)),
    uploaded: uploadedRaw
      .map(normalizeDocument)
      .filter((doc): doc is RagflowDocument => !!doc),
    parse_started: Boolean(raw.parse_started),
    parse_error: raw.parse_error ?? null,
    message: String(raw.message ?? ""),
  };
}
