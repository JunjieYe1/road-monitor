<script setup lang="ts">
import { ref, watch, shallowRef, markRaw, nextTick } from "vue";
import { SEV_COLORS } from "../../utils/labels";
import type { LngLat } from "../../utils/geoDistance";

interface MiniMapPoint {
  id: number;
  lat: number;
  lng: number;
  severity: "high" | "medium" | "low";
  type?: string;
  district?: string;
  address?: string;
  statusText?: string;
}

const props = withDefaults(
  defineProps<{
    points: MiniMapPoint[];
    selectedPointId?: number | null;
  }>(),
  { selectedPointId: null },
);
const emit = defineEmits<{
  (e: "select-point", id: number): void;
}>();

const loadConfig = { v: "4.0", tk: "7db4d1823b7788dc88066899e23df0d5" };

const mapCenter = ref<[number, number]>([120.155, 30.274]);
const mapZoom = ref(14);
const mapInstance = shallowRef<any>(null);
const infoTarget = ref<[number, number] | null>(null);
const infoContent = ref("");

function makeSvgIcon(color: string, opacity = 0.92): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="40" viewBox="0 0 34 40">
    <circle cx="17" cy="17" r="15" fill="${color}" opacity="${opacity}"/>
    <circle cx="17" cy="17" r="10" fill="rgba(255,255,255,0.28)"/>
    <polygon points="17,38 11,27 23,27" fill="${color}" opacity="${opacity}"/>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const markerIcon = (s: string) =>
  makeSvgIcon(SEV_COLORS[s] ?? SEV_COLORS.low);

function fitView() {
  const pts: LngLat[] = props.points.map((p) => ({ lng: p.lng, lat: p.lat }));
  if (pts.length === 0) return;
  const first = pts[0]!;
  mapCenter.value = [first.lng, first.lat];

  if (pts.length <= 1) {
    mapZoom.value = 16;
    return;
  }

  const lngs = pts.map((p) => p.lng);
  const lats = pts.map((p) => p.lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;
  mapCenter.value = [centerLng, centerLat];

  const rawSpan = Math.max(maxLng - minLng, maxLat - minLat);
  const span = Math.max(rawSpan * 1.08, 0.0009);
  let z = 14;
  if (span > 0.18) z = 10;
  else if (span > 0.1) z = 11;
  else if (span > 0.055) z = 12;
  else if (span > 0.028) z = 13;
  else if (span > 0.013) z = 14;
  else if (span > 0.006) z = 15;
  else z = 16;
  mapZoom.value = z;
}

watch(
  () => props.points,
  () => nextTick(() => fitView()),
  { deep: true, immediate: false },
);

watch(
  () => [props.selectedPointId, props.points] as const,
  () => {
    const id = props.selectedPointId;
    if (id == null) {
      infoTarget.value = null;
      return;
    }
    const point = props.points.find((p) => p.id === id);
    if (!point) {
      infoTarget.value = null;
      return;
    }
    infoContent.value = `
      <div class="mini-point-popup">
        <div class="mini-point-title">${point.type ?? "病害点"} · ${point.district ?? "未知区域"}</div>
        <div class="mini-point-addr">${point.address ?? "暂无地址信息"}</div>
        <div class="mini-point-meta">${point.statusText ?? "状态未知"}</div>
      </div>
    `;
    infoTarget.value = [point.lng, point.lat];
  },
  { deep: true, immediate: true },
);

function onMapInit(map: any) {
  mapInstance.value = markRaw(map);
  nextTick(() => fitView());
}

function dimPoint(id: number) {
  return props.selectedPointId != null && props.selectedPointId !== id;
}

function onPointClick(point: MiniMapPoint) {
  emit("select-point", point.id);
}
</script>

<template>
  <div class="mini-map-wrap neu-inset">
    <div class="mini-map-glow"></div>
    <tdt-map
      class="mini-map-el"
      :center="mapCenter"
      :zoom="mapZoom"
      :loadConfig="loadConfig"
      @init="onMapInit"
    >
      <tdt-marker
        v-for="p in points"
        :key="`point-${p.id}`"
        :position="[p.lng, p.lat]"
        :icon="markerIcon(p.severity)"
        :opacity="dimPoint(p.id) ? 0.42 : 0.96"
        :draggable="false"
        @click="() => onPointClick(p)"
      />
      <tdt-infowindow
        v-model:target="infoTarget"
        :content="infoContent"
        :offset="[0, -42]"
      />
    </tdt-map>
  </div>
</template>

<style scoped>
@import "../../styles/map-infowindow.shared.css";

.mini-map-wrap {
  --map-infowindow-radius: 999px;
  --map-infowindow-border: 1px solid rgba(255, 255, 255, 0.72);
  --map-infowindow-bg: rgba(244, 247, 251, 0.86);
  --map-infowindow-shadow: 3px 3px 8px rgba(163, 177, 198, 0.24), -3px -3px 8px rgba(255, 255, 255, 0.62);
  --map-infowindow-content-margin: 0;
  --map-infowindow-content-padding: 0;
  --map-infowindow-tip-display: none;
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  min-height: 250px;
  height: 300px;
  max-height: 300px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.68);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.64), rgba(163, 177, 198, 0.14)),
    var(--bg-color);
  box-shadow:
    inset 5px 5px 12px rgba(163, 177, 198, 0.22),
    inset -5px -5px 12px rgba(255, 255, 255, 0.72),
    var(--neu-extrude-sm);
}
.mini-map-el {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: 18px;
  overflow: hidden;
  box-shadow:
    inset 4px 4px 9px rgba(41, 61, 82, 0.12),
    inset -3px -3px 8px rgba(255, 255, 255, 0.64);
}
.mini-map-glow {
  position: absolute;
  inset: 0;
  border-radius: 18px;
  z-index: 2;
  pointer-events: none;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.5),
    inset 0 18px 36px rgba(255, 255, 255, 0.12),
    inset 0 -18px 34px rgba(53, 82, 112, 0.08);
}
:deep(.tdt-infowindow-close) {
  top: 4px !important;
  right: 6px !important;
  color: #8a9aac !important;
  font-size: 12px !important;
  line-height: 1 !important;
}
:deep(.mini-point-popup) {
  min-width: 150px;
  padding: 6px 22px 6px 8px;
}
:deep(.mini-point-title) {
  color: var(--genshin-blue-dark);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
}
:deep(.mini-point-addr) {
  margin-top: 3px;
  font-size: 11px;
  color: #6b7a8c;
  line-height: 1.4;
}
:deep(.mini-point-meta) {
  margin-top: 3px;
  font-size: 10px;
  color: #8a9aac;
  white-space: nowrap;
}
</style>
