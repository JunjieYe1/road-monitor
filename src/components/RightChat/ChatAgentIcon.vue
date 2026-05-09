<script setup lang="ts">
import { computed, useId } from "vue";
import type { ChatAgentIconKind } from "../../config/chatAgents";

const props = withDefaults(
  defineProps<{ kind: ChatAgentIconKind; variant?: "stage" | "mini" }>(),
  { variant: "stage" },
);

const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "_");

const grad = computed(() => {
  switch (props.kind) {
    case "luxiaozhi":
      return {
        bodyTop: "#5EBDAA",
        bodyBot: "#2A6F5F",
        accentTop: "#C8F7E9",
        accentBot: "#3D9970",
        cheek: "#4A9B86",
        halo: "#5EBDAA",
      };
    case "luxiaoce":
      return {
        bodyTop: "#E8A06E",
        bodyBot: "#A85A2C",
        accentTop: "#FFD18A",
        accentBot: "#C47A30",
        cheek: "#D68950",
        halo: "#E8A06E",
      };
    case "luxiaoban":
      return {
        bodyTop: "#8B9ED1",
        bodyBot: "#4A5694",
        accentTop: "#D4DCF5",
        accentBot: "#6B7AB8",
        cheek: "#7B8FC9",
        halo: "#8B9ED1",
      };
    default:
      return {
        bodyTop: "#5A8FD0",
        bodyBot: "#2D5A7B",
        accentTop: "#F0D78C",
        accentBot: "#B8923F",
        cheek: "#4A8DB7",
        halo: "#4A8DB7",
      };
  }
});
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
        <stop offset="0%" :stop-color="grad.halo" stop-opacity="0.32" />
        <stop offset="100%" stop-color="#1A3A52" stop-opacity="0" />
      </radialGradient>
      <linearGradient :id="`${uid}-bodyGrad`" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" :stop-color="grad.bodyTop" />
        <stop offset="100%" :stop-color="grad.bodyBot" />
      </linearGradient>
      <linearGradient :id="`${uid}-accentGrad`" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" :stop-color="grad.accentTop" />
        <stop offset="100%" :stop-color="grad.accentBot" />
      </linearGradient>
    </defs>
    <g v-if="variant === 'mini'" transform="scale(0.4)">
      <circle cx="50" cy="50" r="46" :fill="`url(#${uid}-bgGrad)`" />
      <ellipse
        cx="50"
        cy="75"
        rx="26"
        ry="16"
        :fill="`url(#${uid}-bodyGrad)`"
        opacity="0.82"
      />
      <circle cx="50" cy="42" r="20" :fill="`url(#${uid}-bodyGrad)`" />
      <path
        d="M32,36 Q35,20 50,22 Q65,20 68,36 Q60,28 50,30 Q40,28 32,36Z"
        fill="#1A3A52"
      />
      <ellipse cx="43" cy="42" rx="4" ry="4.5" fill="white" />
      <ellipse cx="57" cy="42" rx="4" ry="4.5" fill="white" />
      <circle cx="44" cy="43" r="2.5" fill="#1A3A52" />
      <circle cx="58" cy="43" r="2.5" fill="#1A3A52" />
      <circle cx="45" cy="42" r="1" fill="white" />
      <circle cx="59" cy="42" r="1" fill="white" />
      <path
        d="M45,51 Q50,55 55,51"
        :stroke="grad.cheek"
        stroke-width="1.5"
        fill="none"
        stroke-linecap="round"
      />
      <path
        v-if="kind === 'luxiaoxun'"
        d="M44,30 L50,25 L56,30"
        :fill="`url(#${uid}-accentGrad)`"
        opacity="0.92"
      />
      <circle
        v-if="kind === 'luxiaoxun'"
        cx="50"
        cy="24"
        r="3"
        :fill="`url(#${uid}-accentGrad)`"
      />
      <rect
        v-if="kind === 'luxiaozhi'"
        x="40"
        y="22"
        width="20"
        height="14"
        rx="2"
        :fill="`url(#${uid}-accentGrad)`"
        opacity="0.95"
      />
      <path
        v-if="kind === 'luxiaoce'"
        d="M50 20 L58 34 H42 Z"
        :fill="`url(#${uid}-accentGrad)`"
        opacity="0.95"
      />
      <rect
        v-if="kind === 'luxiaoban'"
        x="42"
        y="22"
        width="16"
        height="18"
        rx="2"
        :fill="`url(#${uid}-accentGrad)`"
        opacity="0.95"
      />
    </g>
    <g v-else>
      <circle cx="50" cy="50" r="46" :fill="`url(#${uid}-bgGrad)`" />
      <ellipse
        cx="50"
        cy="75"
        rx="26"
        ry="16"
        :fill="`url(#${uid}-bodyGrad)`"
        opacity="0.8"
      />
      <circle cx="50" cy="42" r="20" :fill="`url(#${uid}-bodyGrad)`" />
      <path
        d="M32,36 Q35,20 50,22 Q65,20 68,36 Q60,28 50,30 Q40,28 32,36Z"
        fill="#1A3A52"
      />
      <ellipse cx="43" cy="42" rx="4" ry="4.5" fill="white" />
      <ellipse cx="57" cy="42" rx="4" ry="4.5" fill="white" />
      <circle cx="44" cy="43" r="2.5" fill="#1A3A52" />
      <circle cx="58" cy="43" r="2.5" fill="#1A3A52" />
      <circle cx="45" cy="42" r="1" fill="white" />
      <circle cx="59" cy="42" r="1" fill="white" />
      <path
        d="M45,51 Q50,55 55,51"
        :stroke="grad.cheek"
        stroke-width="1.5"
        fill="none"
        stroke-linecap="round"
      />
      <template v-if="kind === 'luxiaoxun'">
        <path
          d="M44,30 L50,25 L56,30"
          :fill="`url(#${uid}-accentGrad)`"
          opacity="0.9"
        />
        <circle cx="50" cy="24" r="3" :fill="`url(#${uid}-accentGrad)`" />
      </template>
      <rect
        v-else-if="kind === 'luxiaozhi'"
        x="38"
        y="20"
        width="24"
        height="16"
        rx="3"
        :fill="`url(#${uid}-accentGrad)`"
        opacity="0.95"
      />
      <path
        v-else-if="kind === 'luxiaoce'"
        d="M50 18 L60 36 H40 Z"
        :fill="`url(#${uid}-accentGrad)`"
        opacity="0.95"
      />
      <rect
        v-else-if="kind === 'luxiaoban'"
        x="40"
        y="20"
        width="20"
        height="22"
        rx="2"
        :fill="`url(#${uid}-accentGrad)`"
        opacity="0.95"
      />
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
