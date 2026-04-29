import { defineStore } from "pinia";
import { ref } from "vue";
import type { MapControlItem, MapControlPayload } from "../api/chatStream";

export const useMapOverlayStore = defineStore("mapOverlay", () => {
  const points = ref<MapControlItem[]>([]);
  const totalCount = ref(0);

  function replace(payload: MapControlPayload) {
    totalCount.value = payload.count;
    points.value = payload.items;
  }

  function clear() {
    totalCount.value = 0;
    points.value = [];
  }

  return { points, totalCount, replace, clear };
});
