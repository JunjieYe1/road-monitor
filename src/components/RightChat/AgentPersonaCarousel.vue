<script setup lang="ts">
import { computed } from "vue";
import { useChatStore } from "../../stores/chatStore";
import { CHAT_AGENTS, getChatAgentIndex } from "../../config/chatAgents";
import ChatAgentIcon from "./ChatAgentIcon.vue";

const chatStore = useChatStore();
const n = CHAT_AGENTS.length;

const selectedIndex = computed(() => getChatAgentIndex(chatStore.activeChatAgentId));

type SlotRole = "left" | "center" | "right" | "hidden";

function roleForIndex(agentIdx: number, sel: number): SlotRole {
  const d = (agentIdx - sel + n) % n;
  if (d === 0) return "center";
  if (d === 1) return "right";
  if (d === n - 1) return "left";
  return "hidden";
}

const agentsWithRole = computed(() => {
  const sel = selectedIndex.value;
  return CHAT_AGENTS.map((agent, agentIdx) => ({
    agent,
    agentIdx,
    role: roleForIndex(agentIdx, sel),
  }));
});

function step(delta: number) {
  const idx = (selectedIndex.value + delta + n) % n;
  chatStore.setActiveChatAgent(CHAT_AGENTS[idx]!.id);
}

function onAgentClick(role: SlotRole, agentId: string) {
  if (role === "center" || role === "hidden") return;
  chatStore.setActiveChatAgent(agentId);
}
</script>

<template>
  <div class="persona-carousel" aria-label="切换对话智能体">
    <button
      type="button"
      class="pc-chevron"
      aria-label="上一个智能体"
      @click="step(-1)"
    >
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20" aria-hidden="true">
        <path
          d="M14 6L8 12l6 6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div class="pc-viewport">
      <div class="pc-stage">
        <div class="pc-reflection" aria-hidden="true" />
        <div class="pc-ring">
          <button
            v-for="{ agent, role } in agentsWithRole"
            :key="agent.id"
            type="button"
            class="pc-slot"
            :class="{
              'pc-slot--left': role === 'left',
              'pc-slot--center': role === 'center',
              'pc-slot--right': role === 'right',
              'pc-slot--hidden': role === 'hidden',
            }"
            :tabindex="role === 'hidden' ? -1 : 0"
            :aria-current="role === 'center' ? 'true' : undefined"
            :aria-hidden="role === 'hidden' ? 'true' : undefined"
            :aria-label="
              role === 'center'
                ? `当前：${agent.name}`
                : role === 'hidden'
                  ? undefined
                  : `切换到 ${agent.name}`
            "
            @click="onAgentClick(role, agent.id)"
          >
            <div class="pc-avatar-row">
              <div class="pc-frame">
                <ChatAgentIcon :kind="agent.iconKind" variant="stage" />
              </div>
            </div>
            <div
              v-show="role !== 'hidden'"
              class="pc-labels"
              :class="{ 'pc-labels--side': role !== 'center' }"
            >
              <div class="pc-name-line">
                <span class="pc-name">{{ agent.name }}</span>
              </div>
              <div class="pc-desc-line">
                <span v-if="role === 'center'" class="pc-subtitle">{{
                  agent.subtitle
                }}</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <button
      type="button"
      class="pc-chevron"
      aria-label="下一个智能体"
      @click="step(1)"
    >
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20" aria-hidden="true">
        <path
          d="M10 6l6 6-6 6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.persona-carousel {
  /* 位移：略带过冲 | 缩放：更长、平滑收尾，避免与横移同步「弹一下」 */
  --pc-ease: cubic-bezier(0.25, 0.82, 0.3, 1);
  --pc-ease-move: cubic-bezier(0.34, 1.12, 0.32, 1.02);
  --pc-ease-scale: cubic-bezier(0.45, 0, 0.2, 1);
  --pc-dur: 0.68s;
  --pc-dur-scale: 0.82s;
  --pc-x: 84px;
  --pc-scale-center: 1.18;
  --pc-scale-side: 0.66;
  --pc-scale-center-sm: 1.1;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
}

.pc-viewport {
  flex: 1;
  min-width: 0;
  max-width: min(360px, 100%);
  /* 左右轻微收光，突出中间 Cover */
  mask-image: linear-gradient(
    90deg,
    transparent 0%,
    #000 10%,
    #000 90%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent 0%,
    #000 10%,
    #000 90%,
    transparent 100%
  );
}

.pc-chevron {
  flex-shrink: 0;
  width: 32px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 12px;
  background: linear-gradient(
    145deg,
    rgba(74, 141, 183, 0.12),
    rgba(26, 58, 82, 0.06)
  );
  color: var(--genshin-blue-dark, #1a3a52);
  cursor: pointer;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.45) inset,
    0 4px 12px rgba(26, 58, 82, 0.12);
  transition:
    transform 0.2s var(--pc-ease),
    background 0.2s ease,
    box-shadow 0.2s ease;
}
.pc-chevron:hover {
  background: linear-gradient(
    145deg,
    rgba(74, 141, 183, 0.2),
    rgba(26, 58, 82, 0.08)
  );
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.5) inset,
    0 6px 16px rgba(26, 58, 82, 0.16);
}
.pc-chevron:active {
  transform: scale(0.94);
}

.pc-stage {
  position: relative;
  height: 150px;
  overflow: visible;
}

/* 中间下方柔光，替代强 3D 地面 */
.pc-reflection {
  position: absolute;
  left: 50%;
  bottom: 66px;
  transform: translateX(-50%);
  width: 140px;
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse 100% 100% at 50% 50%,
    rgba(26, 58, 82, 0.2) 0%,
    rgba(74, 141, 183, 0.06) 55%,
    transparent 75%
  );
  pointer-events: none;
  filter: blur(3px);
  opacity: 0.85;
  z-index: 0;
}

.pc-ring {
  position: absolute;
  left: 50%;
  bottom: 18px;
  width: 100%;
  height: 138px;
  transform: translateX(-50%);
}

.pc-slot {
  position: absolute;
  bottom: 0;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  padding: 0;
  cursor: default;
  will-change: transform, opacity, filter;
  transition:
    transform var(--pc-dur) var(--pc-ease-move),
    opacity calc(var(--pc-dur) * 0.92) cubic-bezier(0.4, 0, 0.2, 1),
    filter calc(var(--pc-dur) * 0.95) ease;
}

/* 头像统一高度线：固定行高，圆心在一条水平线上；平移仅在 X，缩放只作用在 .pc-frame */
.pc-avatar-row {
  height: 74px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  transition:
    filter calc(var(--pc-dur) * 0.95) var(--pc-ease-move),
    opacity var(--pc-dur) ease;
}

/* 轻量 Cover Flow：左右仅 X 位移 + 整体略淡；模糊/缩放集中在头像行 */
.pc-slot--left {
  transform: translate3d(calc(-50% - var(--pc-x)), 0, 0);
  opacity: 0.78;
  z-index: 1;
  cursor: pointer;
}
.pc-slot--left .pc-avatar-row {
  filter: blur(0.45px) brightness(0.88) saturate(0.88);
}
.pc-slot--left .pc-frame {
  transform: scale(var(--pc-scale-side));
}

.pc-slot--center {
  transform: translate3d(-50%, 0, 0);
  opacity: 1;
  z-index: 5;
}
.pc-slot--center .pc-avatar-row {
  filter: drop-shadow(0 14px 24px rgba(26, 58, 82, 0.2));
}
.pc-slot--center .pc-frame {
  transform: scale(var(--pc-scale-center));
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.4) inset,
    0 6px 20px rgba(212, 168, 83, 0.38),
    0 14px 28px rgba(26, 58, 82, 0.12);
  animation: pc-frame-float 4.2s var(--pc-ease-scale) infinite;
}

.pc-slot--right {
  transform: translate3d(calc(-50% + var(--pc-x)), 0, 0);
  opacity: 0.78;
  z-index: 1;
  cursor: pointer;
}
.pc-slot--right .pc-avatar-row {
  filter: blur(0.45px) brightness(0.88) saturate(0.88);
}
.pc-slot--right .pc-frame {
  transform: scale(var(--pc-scale-side));
}

.pc-slot--hidden {
  transform: translate3d(-50%, 18px, 0) scale(0.4);
  opacity: 0;
  pointer-events: none;
  z-index: 0;
  cursor: default;
}
.pc-slot--hidden .pc-avatar-row {
  filter: blur(6px) brightness(0.72) saturate(0.75);
}
.pc-slot--hidden .pc-frame {
  animation: none !important;
  transform: scale(0.9);
  box-shadow: none;
}

.pc-slot--left:hover,
.pc-slot--right:hover {
  opacity: 1;
}
.pc-slot--left:hover .pc-avatar-row,
.pc-slot--right:hover .pc-avatar-row {
  filter: blur(0.2px) brightness(0.94) saturate(0.94);
}

.pc-frame {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  padding: 3px;
  background: linear-gradient(
    145deg,
    var(--genshin-gold-dark, #8a6f3a),
    var(--genshin-gold, #d4a853) 45%,
    var(--genshin-gold-light, #f0d78c)
  );
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.35) inset,
    0 4px 14px rgba(212, 168, 83, 0.35);
  transition:
    box-shadow calc(var(--pc-dur-scale) * 0.9) var(--pc-ease-scale),
    transform var(--pc-dur-scale) var(--pc-ease-scale);
}

.pc-slot--left .pc-frame,
.pc-slot--right .pc-frame {
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.18) inset,
    0 5px 12px rgba(26, 58, 82, 0.2);
}

.pc-labels {
  text-align: center;
  max-width: 176px;
  animation: pc-label-in calc(var(--pc-dur) * 0.85) var(--pc-ease-scale) both;
}

.pc-labels--side {
  max-width: 92px;
  opacity: 0.82;
}

.pc-labels--side .pc-name {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.35px;
  color: #4a5c72;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: none;
}

.pc-slot--center .pc-labels {
  opacity: 1;
}

.pc-name {
  font-family: "Noto Serif SC", serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--genshin-blue-dark, #1a3a52);
  letter-spacing: 0.55px;
  white-space: nowrap;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.45),
    0 8px 16px rgba(26, 58, 82, 0.08);
}
.pc-subtitle {
  font-family: "Noto Sans SC", "Noto Sans", sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #5a6d82;
  line-height: 1.4;
  letter-spacing: 0.35px;
  white-space: normal;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
}

/* 名称同一水平：固定行框；描述区同高（中间副标题，两侧空行占位） */
.pc-name-line {
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.pc-desc-line {
  margin-top: 5px;
  min-height: calc(12px * 1.4);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
  box-sizing: content-box;
}

.pc-labels--side .pc-name-line {
  max-width: 100%;
}

@keyframes pc-frame-float {
  0%,
  100% {
    transform: scale(var(--pc-scale-center));
  }
  50% {
    transform: scale(calc(var(--pc-scale-center) * 1.026));
  }
}

@keyframes pc-frame-float-sm {
  0%,
  100% {
    transform: scale(var(--pc-scale-center-sm));
  }
  50% {
    transform: scale(calc(var(--pc-scale-center-sm) * 1.02));
  }
}

@keyframes pc-label-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 520px) {
  .persona-carousel {
    --pc-x: 56px;
    --pc-scale-center: 1.12;
    --pc-scale-side: 0.62;
    --pc-scale-center-sm: 1.06;
    --pc-dur-scale: 0.76s;
  }
  .pc-slot--center .pc-frame {
    animation-name: pc-frame-float-sm;
  }
  .pc-stage {
    height: 138px;
  }
  .pc-labels--side {
    max-width: 80px;
  }
  .pc-viewport {
    mask-image: linear-gradient(
      90deg,
      transparent 0%,
      #000 6%,
      #000 94%,
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      90deg,
      transparent 0%,
      #000 6%,
      #000 94%,
      transparent 100%
    );
  }
}
</style>
