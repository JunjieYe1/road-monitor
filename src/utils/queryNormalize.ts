/** 与 query(3).md 一致：`string | string[]` 归一化为 trim 后的 string[] */

export function normalizeStringArray(
  v: string | string[] | undefined,
): string[] | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) {
    const out = v.map((s) => String(s).trim()).filter(Boolean);
    return out.length ? out : undefined;
  }
  const s = String(v).trim();
  if (!s) return undefined;
  const parts = s.split(/[,，]/).map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}

/** 从 env 逗号串读取多选筛选项 */
export function commaEnvToStringArray(
  raw: string | undefined,
): string[] | undefined {
  if (!raw?.trim()) return undefined;
  const parts = raw.split(/[,，]/).map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}
