<template>
  <div class="workspace-layout">
    <!-- 顶部标题栏 -->
    <header class="top-bar neu-card">
      <div class="corner-decor tl"></div>
      <div class="corner-decor tr"></div>

      <!-- 左侧：天气 + 返回按钮 -->
      <div class="header-left">
        <!-- 天气信息 TODO: API - GET /api/weather?city=杭州 -->
        <div class="weather-block">
          <span class="weather-icon">{{ weather.icon }}</span>
          <div class="weather-info">
            <div class="weather-top">
              <span class="weather-city">杭州</span>
              <span class="weather-temp">{{ weather.temp }}°C</span>
              <span class="weather-desc">{{ weather.desc }}</span>
            </div>
            <div class="weather-bottom">
              <span class="weather-item">
                <svg viewBox="0 0 16 16" fill="none" width="9" height="9"><path d="M8 2C5 2 3 4 3 7c0 4 5 7 5 7s5-3 5-7c0-3-2-5-5-5z" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="7" r="1.5" fill="currentColor"/></svg>
                湿度 {{ weather.humidity }}%
              </span>
              <span class="weather-sep">·</span>
              <span class="weather-item">{{ weather.wind }}</span>
            </div>
          </div>
        </div>
        <div class="header-divider"></div>
        <button class="back-btn" @click="$router.push('/')">
          <svg viewBox="0 0 20 20" fill="none" width="14" height="14"><path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>返回</span>
        </button>
      </div>

      <!-- 平台标题（绝对居中） -->
      <div class="title-area">
        <span class="deco-diamond">◆</span>
        <h1 class="genshin-title main-title">智能体赋能城市道路病害监测平台</h1>
        <span class="deco-diamond">◆</span>
      </div>

      <!-- 右侧状态区 -->
      <div class="header-right">
        <div v-if="auth.user" class="user-bar">
          <span class="user-name">{{ auth.user.username }}</span>
          <button type="button" class="logout-btn" @click="onLogout">退出</button>
        </div>
        <span class="hdr-sep" v-if="auth.user"></span>
        <span class="time-display">{{ currentTime }}</span>
      </div>
    </header>

    <!-- 三栏主体 -->
    <main class="main-content" :class="{ 'chat-wide': chatWide }">
      <LeftPanel class="left-panel" />
      <Canvas class="center-panel" />
      <RightChat v-model:wide="chatWide" class="right-panel" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LeftPanel from '../components/LeftPanel/index.vue'
import Canvas from '../components/Canvas/index.vue'
import RightChat from '../components/RightChat/index.vue'
import { useAuthStore } from '../stores/authStore'
import { useChatStore } from '../stores/chatStore'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const chatStore = useChatStore()

/** 对话栏加宽：隐藏左侧栏，对话区约占半屏 */
const chatWide = ref(false)

const currentTime = ref('')
function updateTime() {
  currentTime.value = new Date().toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}
updateTime()
const timer = setInterval(updateTime, 1000)
onUnmounted(() => clearInterval(timer))

// TODO: API - GET /api/weather?city=杭州  接入真实天气接口后替换此 mock 数据
const weather = ref({
  icon: '🌤️',
  temp: 22,
  desc: '多云',
  humidity: 68,
  wind: '东南风 3级',
})

async function onLogout() {
  await auth.logout()
  router.push({ name: 'login', query: { redirect: '/workspace' } })
}

onMounted(async () => {
  const q = typeof route.query.q === 'string' ? route.query.q.trim() : ''
  await chatStore.initWorkspace()
  if (q) {
    await chatStore.sendMessage(q)
    await router.replace({ path: '/workspace', query: {} })
  }
})
</script>

<style scoped>
.workspace-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  padding: 12px;
  gap: 12px;
  background: var(--bg-page);
  overflow: hidden;
}

/* 顶部栏 */
.top-bar {
  position: relative;
  display: flex;
  align-items: center;
  padding: 8px 16px;
  flex-shrink: 0;
  gap: 0;
}

/* 左侧区 */
.header-left {
  display: flex; align-items: center; gap: 10px; flex-shrink: 0;
}

.back-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 10px; border: 1px solid var(--neu-stroke-faint);
  background: var(--bg-color); cursor: pointer; color: #2C3E50;
  font-size: 12px; font-family: 'Noto Sans SC', sans-serif; font-weight: 500;
  box-shadow: var(--neu-extrude-back);
  transition: all 0.2s; flex-shrink: 0;
}
.back-btn:hover { color: var(--genshin-blue); box-shadow: var(--neu-extrude-md); }

.title-area {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
  pointer-events: none;
}
.deco-diamond { color: var(--genshin-gold); font-size: 12px; opacity: 0.8; }
.main-title {
  font-size: 18px; letter-spacing: 4px;
  background: none !important; -webkit-background-clip: unset !important;
  background-clip: unset !important; -webkit-text-fill-color: #1a1a2e !important; color: #1a1a2e;
}

/* 右侧状态 */
.header-right {
  display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: auto;
}

.time-display { font-size: 12px; color: #2C3E50; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: 0.5px; }

.user-bar { display: flex; align-items: center; gap: 8px; }
.user-name { font-size: 12px; font-weight: 600; color: #2c3e50; max-width: 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.logout-btn {
  padding: 4px 10px; border-radius: 8px; border: 1px solid var(--neu-stroke-muted);
  background: var(--bg-color); cursor: pointer; font-size: 11px; color: var(--genshin-blue);
  font-family: 'Noto Sans SC', sans-serif;
}
.logout-btn:hover { box-shadow: var(--neu-extrude-sm); }
.hdr-sep { width: 1px; height: 18px; background: var(--neu-stroke-muted); margin: 0 2px; }

/* 天气组件 */
.weather-block {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 4px;
}
.weather-icon { font-size: 22px; line-height: 1; flex-shrink: 0; }
.weather-info { display: flex; flex-direction: column; gap: 2px; }
.weather-top { display: flex; align-items: baseline; gap: 5px; }
.weather-city { font-size: 11px; color: #3A4A5C; font-weight: 600; }
.weather-temp { font-size: 20px; font-weight: 800; color: #1A2A3C; font-variant-numeric: tabular-nums; line-height: 1; }
.weather-desc { font-size: 11px; color: #3A4A5C; font-weight: 500; }
.weather-bottom { display: flex; align-items: center; gap: 4px; }
.weather-item { display: flex; align-items: center; gap: 2px; font-size: 10px; color: #4A5A6C; white-space: nowrap; font-weight: 500; }
.weather-sep { font-size: 10px; color: #8A9AAC; }
.header-divider { width: 1px; height: 28px; background: var(--neu-stroke-muted); flex-shrink: 0; }

/* 三栏主体 */
.main-content {
  flex: 1; display: flex; gap: 12px; min-height: 0;
}
.left-panel   { width: 22%; flex-shrink: 0; min-height: 0; overflow: visible; transition: width 0.22s ease, opacity 0.2s ease, margin 0.2s ease; }
.center-panel { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: visible; }
.right-panel  { width: 24%; flex-shrink: 0; overflow: visible; transition: width 0.22s ease; }

.main-content.chat-wide .left-panel {
  width: 0 !important;
  min-width: 0 !important;
  flex: 0 0 0;
  margin: 0;
  padding: 0;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  border: none;
}
.main-content.chat-wide .right-panel {
  width: 50vw !important;
  min-width: 280px;
  max-width: 50vw;
  flex-shrink: 0;
}

@media (max-width: 1400px) {
  .main-content:not(.chat-wide) .left-panel  { width: 20%; }
  .main-content:not(.chat-wide) .right-panel { width: 22%; }
  .agent-modes { display: none; }
}
</style>
