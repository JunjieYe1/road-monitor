/**
 * 天地图经纬度 → 与 heatmap 叠层父节点对齐的像素（左上为原点）。
 * 切勿误用 lngLatToPixel（常为图块世界坐标）；仅接受看起来像视口尺寸的 API 结果，否则退回 Web Mercator。
 */
import { toRaw } from 'vue'

function getCenterLngLat(map: any): { lng: number; lat: number } | null {
  const c = typeof map?.getCenter === 'function' ? map.getCenter() : null
  if (!c) return null
  let lng: number | undefined
  let lat: number | undefined
  if (typeof (c as any).getLng === 'function') lng = (c as any).getLng()
  else if (typeof (c as any).getLongitude === 'function') lng = (c as any).getLongitude()
  else if (typeof (c as any).lng === 'number') lng = (c as any).lng
  else if (typeof (c as any).lon === 'number') lng = (c as any).lon

  if (typeof (c as any).getLat === 'function') lat = (c as any).getLat()
  else if (typeof (c as any).getLatitude === 'function') lat = (c as any).getLatitude()
  else if (typeof (c as any).lat === 'number') lat = (c as any).lat

  if (lng === undefined || lat === undefined || !Number.isFinite(lng) || !Number.isFinite(lat)) return null
  return { lng, lat }
}

function lngLatToMercatorPixel(lng: number, lat: number, zoom: number) {
  const scale = 256 * 2 ** zoom
  const x = ((lng + 180) / 360) * scale
  const latRad = (lat * Math.PI) / 180
  const y = (0.5 - Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / (2 * Math.PI)) * scale
  return { x, y }
}

function parsePointPx(pt: unknown): { x: number; y: number } | null {
  if (pt == null || typeof pt !== 'object') return null
  const o = pt as Record<string, unknown>
  const gx = typeof (o as any).getX === 'function' ? (o as any).getX() : undefined
  const gy = typeof (o as any).getY === 'function' ? (o as any).getY() : undefined
  if (
    gx !== undefined && gy !== undefined && Number.isFinite(gx) && Number.isFinite(gy))
    return { x: gx as number, y: gy as number }
  if (typeof o.x === 'number' && typeof o.y === 'number')
    return { x: o.x, y: o.y }
  if (typeof o.lng === 'number' && typeof o.lat === 'number')
    return { x: o.lng, y: o.lat }
  return null
}

/** 排除误匹配到天地位图量级（数十万）的返回值 */
function looksLikeViewportPixels(
  x: number,
  y: number,
  cw: number,
  ch: number,
): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false
  if (cw < 8 || ch < 8) return Math.abs(x) < 200000 && Math.abs(y) < 200000
  const span = cw + ch
  /** 容许略越过画布（惯性平移留白）*/
  const maxExtent = span * 5
  return Math.abs(x) <= maxExtent && Math.abs(y) <= maxExtent
}

function tryMethodNames(
  map: any,
  lnglat: unknown,
  names: readonly string[],
): { x: number; y: number } | null {
  for (const name of names) {
    try {
      if (typeof map[name] !== 'function') continue
      const pt = map[name](lnglat)
      const parsed = parsePointPx(pt)
      if (parsed) return parsed
    } catch {
      /* 下一候选 */
    }
  }
  return null
}

function zoomFromMap(map: any): number {
  if (typeof map?.getZoom === 'function') {
    const z = map.getZoom()
    if (typeof z === 'number' && Number.isFinite(z)) return z
  }
  /** 混淆后的常见字段兜底（仅作回退） */
  for (const k of ['Gw', 'fW']) {
    const v = map?.[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return 12
}

const CONTAINER_METHODS = [
  'lngLatToContainerPoint',
  'lnglatToContainerPoint',
  'LngLatToContainerPoint',
] as const

const LAYER_METHODS = ['lngLatToLayerPoint', 'lnglatToLayerPoint', 'LngLatToLayerPoint'] as const

export function lngLatToContainerPx(map: any, lng: number, lat: number): { x: number; y: number } | null {
  if (!map) return null
  const raw = toRaw(map) as any
  const T = typeof window !== 'undefined' ? (window as unknown as { T?: any }).T : undefined

  const el =
    typeof raw?.getContainer === 'function' ? (raw.getContainer() as HTMLElement) : null
  const cw = el?.clientWidth ?? 0
  const ch = el?.clientHeight ?? 0

  const zoom = zoomFromMap(raw)
  const center = getCenterLngLat(raw)

  const validate = (parsed: { x: number; y: number } | null) => {
    if (!parsed || !looksLikeViewportPixels(parsed.x, parsed.y, cw, ch)) return null
    return parsed
  }

  try {
    if (T?.LngLat) {
      const ll = new T.LngLat(lng, lat)
      const c1 = validate(tryMethodNames(raw, ll, CONTAINER_METHODS))
      if (c1) return c1
      const lay = validate(tryMethodNames(raw, ll, LAYER_METHODS))
      if (lay) return lay
    }
    const c2 =
      validate(tryMethodNames(raw, [lng, lat], CONTAINER_METHODS))
      ?? validate(tryMethodNames(raw, [lng, lat], LAYER_METHODS))
    if (c2) return c2
  } catch {
    /* Web Mercator 回退 */
  }

  if (!center || cw < 2 || ch < 2) return null

  const p = lngLatToMercatorPixel(lng, lat, zoom)
  const c = lngLatToMercatorPixel(center.lng, center.lat, zoom)
  return {
    x: cw / 2 + (p.x - c.x),
    y: ch / 2 + (p.y - c.y),
  }
}
