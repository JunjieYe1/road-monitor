import { agentFetch, unwrapAgentData } from "./agentClient";
import { normalizeStringArray } from "../utils/queryNormalize";
import type { DetectionRowRaw } from "../utils/mapDetectionRowToAlert";
import type { QuerySelectBody } from "../types/querySelect";

export type { QuerySelectBody } from "../types/querySelect";

export interface QuerySelectGroupBody {
  year: string;
  number: string;
}

export interface QuerySolveBody {
  year: string;
  number: string;
}

function bodyForSelect(body: QuerySelectBody): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const y = normalizeStringArray(body.years);
  const r = normalizeStringArray(body.regions);
  const roads = normalizeStringArray(body.road_names);
  const dt = normalizeStringArray(body.disease_types);
  if (y) out.years = y;
  if (r) out.regions = r;
  if (roads) out.road_names = roads;
  if (dt) out.disease_types = dt;
  return out;
}

function asRowArray(v: unknown): DetectionRowRaw[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as DetectionRowRaw[];
}

/** POST /query/select */
export async function querySelect(body: QuerySelectBody): Promise<{
  filters: Record<string, unknown>;
  total: number;
  items: DetectionRowRaw[];
}> {
  const raw = await agentFetch("/query/select", {
    method: "POST",
    body: JSON.stringify(bodyForSelect(body)),
  });
  const d = unwrapAgentData(raw);
  const items = asRowArray(d.items);
  const total = typeof d.total === "number" ? d.total : items.length;
  const filters =
    d.filters && typeof d.filters === "object"
      ? (d.filters as Record<string, unknown>)
      : {};
  return { filters, total, items };
}

/** POST /query/selectgroup */
export async function querySelectGroup(body: QuerySelectGroupBody): Promise<{
  year: string;
  number: string;
  group_number: string;
  source_item: DetectionRowRaw | null;
  total: number;
  items: DetectionRowRaw[];
}> {
  const raw = await agentFetch("/query/selectgroup", {
    method: "POST",
    body: JSON.stringify({
      year: String(body.year).trim(),
      number: String(body.number).trim(),
    }),
  });
  const d = unwrapAgentData(raw);
  const source =
    d.source_item && typeof d.source_item === "object"
      ? (d.source_item as DetectionRowRaw)
      : null;
  const items = asRowArray(d.items);
  return {
    year: String(d.year ?? body.year),
    number: String(d.number ?? body.number),
    group_number: String(d.group_number ?? ""),
    source_item: source,
    total: typeof d.total === "number" ? d.total : items.length,
    items,
  };
}

/** POST /query/solve */
export async function querySolve(body: QuerySolveBody): Promise<{
  year: string;
  number: string;
  needs_rectification: boolean;
  review_total: number;
  rectification_total: number;
  review_records: DetectionRowRaw[];
  rectification_records: DetectionRowRaw[];
}> {
  const raw = await agentFetch("/query/solve", {
    method: "POST",
    body: JSON.stringify({
      year: String(body.year).trim(),
      number: String(body.number).trim(),
    }),
  });
  const d = unwrapAgentData(raw);
  return {
    year: String(d.year ?? body.year),
    number: String(d.number ?? body.number),
    needs_rectification: Boolean(d.needs_rectification),
    review_total: typeof d.review_total === "number" ? d.review_total : 0,
    rectification_total:
      typeof d.rectification_total === "number" ? d.rectification_total : 0,
    review_records: asRowArray(d.review_records),
    rectification_records: asRowArray(d.rectification_records),
  };
}
