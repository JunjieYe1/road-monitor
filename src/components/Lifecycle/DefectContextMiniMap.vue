<script setup lang="ts">
import { ref, watch, shallowRef, markRaw, nextTick } from "vue";
import type { AlertPoint } from "../../stores/alertStore";
import { SEV_COLORS } from "../../utils/labels";
import type { LngLat } from "../../utils/geoDistance";

const props = withDefaults(
  defineProps<{
    current: Pick<AlertPoint, "id" | "lat" | "lng" | "severity">;
    neighbors: Array<Pick<AlertPoint, "id" | "lat" | "lng" | "severity">>;
    selectedNeighborId?: number | null;
  }>(),
  { selectedNeighborId: null },
);

const loadConfig = { v: "4.0", tk: "7db4d1823b7788dc88066899e23df0d5" };

const mapCenter = ref<[number, number]>([120.155, 30.274]);
const mapZoom = ref(14);
const mapInstance = shallowRef<any>(null);
const currentLabelTarget = ref<[number, number] | null>(null);
const currentLabelContent =
  "<div class=\"mini-current-label-inner\">当前病害</div>";

function makeSvgIcon(color: string, opacity = 0.92): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="40" viewBox="0 0 34 40">
    <circle cx="17" cy="17" r="15" fill="${color}" opacity="${opacity}"/>
    <circle cx="17" cy="17" r="10" fill="rgba(255,255,255,0.28)"/>
    <polygon points="17,38 11,27 23,27" fill="${color}" opacity="${opacity}"/>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const neighborIcon = (s: string) =>
  makeSvgIcon(SEV_COLORS[s] ?? SEV_COLORS.low);

function fitView() {
  const pts: LngLat[] = [
    { lng: props.current.lng, lat: props.current.lat },
    ...props.neighbors.map((n) => ({ lng: n.lng, lat: n.lat })),
  ];
  mapCenter.value = [props.current.lng, props.current.lat];
  currentLabelTarget.value = [props.current.lng, props.current.lat];

  if (pts.length <= 1) {
    mapZoom.value = 15;
    return;
  }

  const maxLngDelta = Math.max(
    ...pts.map((p) => Math.abs(p.lng - props.current.lng)),
  );
  const maxLatDelta = Math.max(
    ...pts.map((p) => Math.abs(p.lat - props.current.lat)),
  );
  const span = Math.max(maxLngDelta * 2, maxLatDelta * 2) + 0.004;
  let z = 14;
  if (span > 0.15) z = 10;
  else if (span > 0.08) z = 11;
  else if (span > 0.04) z = 12;
  else if (span > 0.02) z = 13;
  mapZoom.value = z;
}

watch(
  () => [props.current, props.neighbors],
  () => nextTick(() => fitView()),
  { deep: true, immediate: false },
);

function onMapInit(map: any) {
  mapInstance.value = markRaw(map);
  nextTick(() => fitView());
}

function dimNeighbor(id: number) {
  return props.selectedNeighborId != null && props.selectedNeighborId !== id;
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
        v-for="n in neighbors"
        :key="`nb-${n.id}`"
        :position="[n.lng, n.lat]"
        :icon="neighborIcon(n.severity)"
        :opacity="dimNeighbor(n.id) ? 0.35 : 0.92"
        :draggable="false"
      />
      <tdt-marker
        :position="[current.lng, current.lat]"
        :icon="neighborIcon(current.severity)"
        :draggable="false"
      />
      <tdt-infowindow
        v-model:target="currentLabelTarget"
        :content="currentLabelContent"
        :offset="[0, -42]"
      />
    </tdt-map>
  </div>
</template>

<style scoped>
.mini-map-wrap {
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
:deep(.tdt-infowindow-content-wrapper) {
  padding: 0 !important;
  border-radius: 999px !important;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: rgba(244, 247, 251, 0.86) !important;
  box-shadow:
    3px 3px 8px rgba(163, 177, 198, 0.24),
    -3px -3px 8px rgba(255, 255, 255, 0.62) !important;
}
:deep(.tdt-infowindow-content) {
  margin: 0 !important;
}
:deep(.tdt-infowindow-tip-container) {
  display: none;
}
:deep(.tdt-infowindow-close) {
  top: 4px !important;
  right: 6px !important;
  color: #8a9aac !important;
  font-size: 12px !important;
  line-height: 1 !important;
}
:deep(.mini-current-label-inner) {
  padding: 4px 22px 4px 8px;
  color: var(--genshin-blue-dark);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
</style>
