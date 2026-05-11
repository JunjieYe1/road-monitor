import { defineStore } from "pinia";
import { ref } from "vue";
import type { MapControlItem, MapControlPayload } from "../api/chatStream";

/** 智能体叠加点进入「病害生命周期」时暂存，供生命周期页读取 */
export interface FocusedOverlayForLifecycle {
  lng: number;
  lat: number;
  disease_name: string;
  disease_category: string;
  disease_level: string;
  severity: "high" | "medium" | "low";
}

export const useMapOverlayStore = defineStore("mapOverlay", () => {
  const points = ref<MapControlItem[]>([]);
  const totalCount = ref(0);
  const focusedOverlayForLifecycle = ref<FocusedOverlayForLifecycle | null>(
    null,
  );

  function replace(payload: MapControlPayload) {
    totalCount.value = payload.count;
    points.value = payload.items;
  }

  function clear() {
    totalCount.value = 0;
    points.value = [];
  }

  function setFocusedOverlayForLifecycle(row: FocusedOverlayForLifecycle | null) {
    focusedOverlayForLifecycle.value = row;
  }

  return {
    points,
    totalCount,
    focusedOverlayForLifecycle,
    replace,
    clear,
    setFocusedOverlayForLifecycle,
  };
});
