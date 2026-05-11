/** 经纬度 Haversine 距离（米） */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface LngLat {
  lng: number;
  lat: number;
}

/** 为多标记计算中心与缩放（与 MapView.fitMapToPoints 类似） */
export function boundsCenterZoom(coords: LngLat[]): {
  center: [number, number];
  zoom: number;
} {
  if (coords.length === 0)
    return { center: [120.155, 30.274], zoom: 12 };
  if (coords.length === 1)
    return { center: [coords[0].lng, coords[0].lat], zoom: 15 };
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const p of coords) {
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
  }
  const pad = 0.002;
  minLng -= pad;
  maxLng += pad;
  minLat -= pad;
  maxLat += pad;
  const center: [number, number] = [
    (minLng + maxLng) / 2,
    (minLat + maxLat) / 2,
  ];
  const span = Math.max(maxLng - minLng, maxLat - minLat);
  let z = 14;
  if (span > 0.15) z = 11;
  else if (span > 0.08) z = 12;
  else if (span > 0.03) z = 13;
  return { center, zoom: z };
}
