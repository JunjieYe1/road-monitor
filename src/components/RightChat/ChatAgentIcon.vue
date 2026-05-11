<script setup lang="ts">
import { computed, useId } from "vue";
import type { ChatAgentIconKind } from "../../config/chatAgents";

const props = withDefaults(
  defineProps<{ kind: ChatAgentIconKind; variant?: "stage" | "mini" }>(),
  { variant: "stage" },
);

const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "_");

const palette = computed(() => {
  switch (props.kind) {
    case "luxiaogui":
      return {
        bodyTop: "#8898E8",
        bodyBot: "#3D4A7A",
        accentTop: "#FFF4C8",
        accentBot: "#B4912E",
        cheek: "#6E7EC9",
        halo: "#9AA6F0",
        hair: "#2A3558",
        frame: "#243050",
      };
    case "luxiaoce":
      return {
        bodyTop: "#E8865C",
        bodyBot: "#8A3A28",
        accentTop: "#FFE566",
        accentBot: "#9A6018",
        cheek: "#D56D45",
        halo: "#F09060",
        hair: "#3D1810",
        frame: "#2D120C",
      };
    default:
      return {
        bodyTop: "#4EC9B8",
        bodyBot: "#1A6B5C",
        accentTop: "#FFF0B0",
        accentBot: "#C4981E",
        cheek: "#3DA894",
        halo: "#5ED4C4",
        hair: "#143D36",
        frame: "#0F2E28",
      };
  }
});

const hairPath = computed(() => {
  switch (props.kind) {
    case "luxiaogui":
      return "M30,38 Q34,17 50,19 Q66,17 70,38 Q62,30 50,32 Q38,30 30,38Z";
    case "luxiaoce":
      return "M31,37 Q37,18 50,20 Q63,18 69,37 L66,32 Q50,27 34,32 Z";
    default:
      return "M32,36 Q35,20 50,22 Q65,20 68,36 Q60,28 50,30 Q40,28 32,36Z";
  }
});

const gTransform = computed(() =>
  props.variant === "mini" ? "scale(0.4)" : "",
);
</script>

<template>
  <svg
    :viewBox="variant === 'mini' ? '0 0 40 40' : '0 0 100 100'"
    :class="[
      'chat-agent-icon-svg',
      variant === 'mini' ? 'chat-agent-icon-svg--mini' : 'chat-agent-icon-svg--stage',
    ]"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <radialGradient :id="`${uid}-bgGrad`" cx="50%" cy="50%" r="50%">
        <stop offset="0%" :stop-color="palette.halo" stop-opacity="0.38" />
        <stop offset="100%" stop-color="#1A3A52" stop-opacity="0" />
      </radialGradient>
      <linearGradient :id="`${uid}-bodyGrad`" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" :stop-color="palette.bodyTop" />
        <stop offset="100%" :stop-color="palette.bodyBot" />
      </linearGradient>
      <linearGradient :id="`${uid}-accentGrad`" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" :stop-color="palette.accentTop" />
        <stop offset="100%" :stop-color="palette.accentBot" />
      </linearGradient>
    </defs>
    <g :transform="gTransform">
      <circle cx="50" cy="50" r="46" :fill="`url(#${uid}-bgGrad)`" />
      <ellipse
        cx="50"
        cy="75"
        rx="26"
        ry="16"
        :fill="`url(#${uid}-bodyGrad)`"
        opacity="0.84"
      />
      <circle cx="50" cy="42" r="20" :fill="`url(#${uid}-bodyGrad)`" />
      <path :d="hairPath" :fill="palette.hair" />

      <ellipse cx="43" cy="42" rx="4" ry="4.5" fill="white" />
      <ellipse cx="57" cy="42" rx="4" ry="4.5" fill="white" />
      <circle cx="44" cy="43" r="2.5" :fill="palette.frame" />
      <circle cx="58" cy="43" r="2.5" :fill="palette.frame" />
      <circle cx="45" cy="42" r="1" fill="white" />
      <circle cx="59" cy="42" r="1" fill="white" />

      <!-- 路小规：圆框眼镜（压在眼白之上） -->
      <g v-if="kind === 'luxiaogui'">
        <rect
          x="35.5"
          y="39.2"
          width="11"
          height="9"
          rx="2.2"
          fill="none"
          :stroke="palette.frame"
          stroke-width="1.35"
          opacity="0.92"
        />
        <rect
          x="53.5"
          y="39.2"
          width="11"
          height="9"
          rx="2.2"
          fill="none"
          :stroke="palette.frame"
          stroke-width="1.35"
          opacity="0.92"
        />
        <path
          d="M46.5 42.8 H53.5"
          fill="none"
          :stroke="palette.frame"
          stroke-width="1.35"
          stroke-linecap="round"
          opacity="0.92"
        />
      </g>

      <path
        v-if="kind !== 'luxiaoce'"
        d="M45,51 Q50,55 55,51"
        :stroke="palette.cheek"
        stroke-width="1.5"
        fill="none"
        stroke-linecap="round"
      />
      <path
        v-else
        d="M46,52.5 L54,52.5"
        :stroke="palette.cheek"
        stroke-width="1.85"
        fill="none"
        stroke-linecap="round"
      />

      <!-- 路小析：数据巡察灯冠 + 波纹 -->
      <template v-if="kind === 'luxiaoxi'">
        <path
          d="M39,11 Q50,5 61,11"
          fill="none"
          :stroke="`url(#${uid}-accentGrad)`"
          stroke-width="1.25"
          stroke-linecap="round"
          opacity="0.85"
        />
        <path
          d="M42,14 Q50,10 58,14"
          fill="none"
          :stroke="`url(#${uid}-accentGrad)`"
          stroke-width="0.9"
          stroke-linecap="round"
          opacity="0.55"
        />
        <path
          d="M44,28 L50,21 L56,28"
          :fill="`url(#${uid}-accentGrad)`"
          opacity="0.94"
        />
        <circle cx="50" cy="19.5" r="3.4" :fill="`url(#${uid}-accentGrad)`" />
      </template>

      <!-- 路小规：学位帽 -->
      <template v-else-if="kind === 'luxiaogui'">
        <rect
          x="36"
          y="19"
          width="28"
          height="7"
          rx="1"
          :fill="`url(#${uid}-accentGrad)`"
          opacity="0.96"
        />
        <rect
          x="47"
          y="17"
          width="6"
          height="12"
          rx="1"
          :fill="`url(#${uid}-accentGrad)`"
          opacity="0.88"
        />
        <path
          d="M54 17 L62 22"
          :stroke="`url(#${uid}-accentGrad)`"
          stroke-width="1.8"
          stroke-linecap="round"
          opacity="0.9"
        />
        <circle cx="62" cy="22" r="2.2" :fill="`url(#${uid}-accentGrad)`" opacity="0.95" />
      </template>

      <!-- 路小策：硬檐三角帽 + 徽标（收紧高度，避免压住眉眼） -->
      <template v-else-if="kind === 'luxiaoce'">
        <path
          d="M33 33 L50 15 L67 33 Q50 29 33 33Z"
          :fill="`url(#${uid}-accentGrad)`"
          opacity="0.97"
        />
        <path
          d="M38 31 L50 18 L62 31"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="1.2"
          stroke-linejoin="round"
        />
        <circle cx="50" cy="21" r="2.6" fill="rgba(255,255,255,0.92)" opacity="0.95" />
      </template>

    </g>
  </svg>
</template>

<style scoped>
.chat-agent-icon-svg {
  display: block;
  border-radius: 50%;
  background: var(--bg-color, #f0f2f5);
}
.chat-agent-icon-svg--stage {
  width: 100%;
  height: 100%;
}
.chat-agent-icon-svg--mini {
  width: 28px;
  height: 28px;
}
</style>
