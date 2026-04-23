<template>
  <div class="login-page">
    <div class="login-card neu-card">
      <div class="corner-decor tl"></div>
      <div class="corner-decor br"></div>
      <div class="login-head">
        <span class="deco">◆</span>
        <h1 class="genshin-title">账号登录</h1>
        <span class="deco">◆</span>
      </div>
      <p class="login-sub">智能体服务 · 城市道路病害监测</p>

      <form class="login-form" @submit.prevent="onSubmit">
        <label class="field">
          <span>用户名</span>
          <input v-model="username" type="text" class="neu-inset" autocomplete="username" required />
        </label>
        <label class="field">
          <span>密码</span>
          <input v-model="password" type="password" class="neu-inset" autocomplete="current-password" required />
        </label>
        <p v-if="errorMsg" class="err">{{ errorMsg }}</p>
        <button type="submit" class="submit neu-btn" :disabled="busy">
          {{ busy ? '登录中…' : '登录' }}
        </button>
      </form>

      <button type="button" class="back-link" @click="router.push('/')">← 返回首页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const busy = ref(false)
const errorMsg = ref('')

function safeRedirectPath(): string {
  const r = route.query.redirect
  if (typeof r === 'string' && r.startsWith('/')) return r
  return '/workspace'
}

async function onSubmit() {
  errorMsg.value = ''
  busy.value = true
  try {
    await auth.login(username.value.trim(), password.value)
    await router.replace(safeRedirectPath())
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg-page);
}
.login-card {
  position: relative;
  width: 100%;
  max-width: 400px;
  padding: 28px 32px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.login-head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.login-head h1 {
  font-size: 20px;
  letter-spacing: 4px;
  margin: 0;
  background: none !important;
  -webkit-text-fill-color: #1a1a2e !important;
  color: #1a1a2e;
}
.deco {
  color: var(--genshin-gold);
  font-size: 12px;
  opacity: 0.85;
}
.login-sub {
  text-align: center;
  font-size: 12px;
  color: #8a9aac;
  margin: 0;
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 6px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--genshin-blue-dark);
  font-weight: 600;
}
.field input {
  padding: 10px 12px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-family: 'Noto Sans SC', sans-serif;
}
.err {
  font-size: 12px;
  color: #e07070;
  margin: 0;
}
.submit {
  margin-top: 8px;
  padding: 11px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Noto Sans SC', sans-serif;
  background: linear-gradient(135deg, var(--genshin-blue), var(--genshin-blue-light));
  color: #fff;
  box-shadow: var(--neu-glow-blue-lift);
}
.submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.back-link {
  margin-top: 4px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: var(--genshin-blue);
  font-family: 'Noto Sans SC', sans-serif;
}
.back-link:hover {
  text-decoration: underline;
}
</style>
