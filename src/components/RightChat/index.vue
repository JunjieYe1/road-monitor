<template>
  <div class="right-panel-wrap neu-card">
    <div class="corner-decor tl"></div>
    <div class="corner-decor br"></div>

    <!-- 会话历史（单行，无额外卡片包裹） -->
    <div class="session-toolbar">
      <span class="sess-inline-label" title="会话历史">历史</span>
      <div ref="sessionDdRoot" class="session-select-wrap session-dd">
        <button
          type="button"
          class="session-dd-trigger"
          :disabled="chatStore.isLoading"
          :aria-expanded="sessionDdOpen"
          aria-haspopup="listbox"
          @click.stop="toggleSessionDd"
        >
          <span class="session-dd-text">{{ sessionDisplayLabel }}</span>
          <svg
            class="session-dd-chevron"
            :class="{ open: sessionDdOpen }"
            viewBox="0 0 16 16"
            fill="none"
            width="14"
            height="14"
            aria-hidden="true"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <transition name="session-dd-fade">
          <div
            v-show="sessionDdOpen"
            class="session-dd-panel u-scrollbar-hidden"
            role="listbox"
            @click.stop
          >
            <button
              type="button"
              class="session-dd-item"
              :class="{ active: sessionSelect === '' }"
              role="option"
              :aria-selected="sessionSelect === ''"
              @click="pickSession('')"
            >
              <span class="session-dd-item-main">
                <span class="session-dd-item-icon">＋</span>
                新建对话
              </span>
            </button>
            <button
              v-for="c in chatStore.conversations"
              :key="c.key"
              type="button"
              class="session-dd-item"
              :class="{ active: sessionSelect === c.key }"
              role="option"
              :aria-selected="sessionSelect === c.key"
              @click="pickSession(c.key)"
            >
              <span class="session-dd-item-main">{{ c.label || c.key }}</span>
              <span v-if="formatSessionSub(c.updatedAt)" class="session-dd-item-sub">{{ formatSessionSub(c.updatedAt) }}</span>
            </button>
          </div>
        </transition>
      </div>
      <button
        type="button"
        class="sess-icon-btn sess-add"
        :disabled="chatStore.isLoading"
        title="新对话"
        @click="onNewChat"
      >
        <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <button
        type="button"
        class="sess-icon-btn sess-trash"
        :disabled="chatStore.isLoading"
        title="删除当前会话"
        @click="onDeleteConversation"
      >
        <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true">
          <path d="M3 6h18M8 6V5a1 1 0 011-1h6a1 1 0 011 1v1m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button
        type="button"
        class="sess-icon-btn sess-wide"
        :class="{ active: wide }"
        :title="wide ? '收起对话栏（恢复三栏）' : '加宽对话栏（隐藏左侧栏，约半屏）'"
        @click="wide = !wide"
      >
        <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true">
          <!-- 未加宽：箭头朝左，表示对话栏向左「吃掉」左栏；已加宽：箭头朝右，表示收回 -->
          <path
            v-if="!wide"
            d="M20 6H10M20 12h-6M20 18H12M8 6L4 10l4 4"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            v-else
            d="M4 6h10M4 12h6M4 18h8M16 6l4 4-4 4"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <!-- 虚拟形象区 -->
    <div class="avatar-section">
      <div class="avatar-frame breathe">
        <svg viewBox="0 0 100 100" class="avatar-svg" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#4A8DB7" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#1A3A52" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#5A8FD0"/>
              <stop offset="100%" stop-color="#2D5A7B"/>
            </linearGradient>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#F0D78C"/>
              <stop offset="100%" stop-color="#B8923F"/>
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#bgGrad)"/>
          <ellipse cx="50" cy="75" rx="26" ry="16" fill="url(#bodyGrad)" opacity="0.8"/>
          <circle cx="50" cy="42" r="20" fill="url(#bodyGrad)"/>
          <path d="M32,36 Q35,20 50,22 Q65,20 68,36 Q60,28 50,30 Q40,28 32,36Z" fill="#1A3A52"/>
          <ellipse cx="43" cy="42" rx="4" ry="4.5" fill="white"/>
          <ellipse cx="57" cy="42" rx="4" ry="4.5" fill="white"/>
          <circle cx="44" cy="43" r="2.5" fill="#1A3A52"/>
          <circle cx="58" cy="43" r="2.5" fill="#1A3A52"/>
          <circle cx="45" cy="42" r="1" fill="white"/>
          <circle cx="59" cy="42" r="1" fill="white"/>
          <path d="M45,51 Q50,55 55,51" stroke="#4A8DB7" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          <path d="M44,30 L50,25 L56,30" fill="url(#goldGrad)" opacity="0.9"/>
          <circle cx="50" cy="24" r="3" fill="url(#goldGrad)"/>
        </svg>
      </div>
      <div class="avatar-info">
        <div class="avatar-name">路小巡</div>
        <div class="avatar-title">道路智能监测助手</div>
      </div>
      <!-- 右侧纵列：知识库 + 在线状态 -->
      <div class="avatar-right-col">
        <div class="kb-chips">
          <button type="button" class="kb-manage-btn" @click="goKb" title="知识库管理（多选）">
            <span class="kb-mb-icon">📚</span>
            <span class="kb-mb-text">知识库</span>
          </button>
          <span v-for="k in chatStore.activeKbSelections" :key="k.id" class="kb-chip">
            <span class="kb-chip-label">{{ k.label }}</span>
            <button type="button" class="kb-chip-x" @click.stop="chatStore.removeKb(k.id)">✕</button>
          </span>
          <button
            v-if="chatStore.activeKbSelections.length"
            type="button"
            class="kb-clear-all"
            @click="chatStore.clearKbs()"
          >清空</button>
        </div>
        <div class="online-badge" :class="{ 'is-answering': chatStore.isLoading }">
          <span class="status-dot" :class="chatStore.isLoading ? 'status-dot-typing' : 'breathe'"></span>
          <span>{{ chatStore.isLoading ? '正在回答…' : '在线' }}</span>
        </div>
      </div>
    </div>

    <!-- 对话区：消息多，始终可纵向滚动 -->
    <div class="chat-body u-scrollbar-hidden" ref="chatBody">
      <div v-for="msg in chatStore.messages" :key="msg.id" class="msg-row" :class="msg.role">
        <div v-if="msg.role === 'assistant'" class="msg-avatar">
          <svg viewBox="0 0 40 40" class="mini-avatar" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#2D5A7B"/>
            <circle cx="20" cy="17" r="8" fill="#4A8DB7"/>
            <path d="M15,15 Q20,11 25,15" fill="#1A3A52"/>
            <circle cx="17" cy="17" r="2" fill="white"/>
            <circle cx="23" cy="17" r="2" fill="white"/>
          </svg>
        </div>

        <div class="bubble-wrap" :class="msg.role">
          <div v-if="msg.loading" class="bubble assistant loading-bubble">
            <span class="dot-pulse"></span>
            <span class="dot-pulse" style="animation-delay:0.2s"></span>
            <span class="dot-pulse" style="animation-delay:0.4s"></span>
          </div>
          <div v-else class="bubble" :class="msg.role">
            <!-- 关联点位上下文徽章 -->
            <div v-if="msg.alertContext" class="bubble-alert-ctx" :class="msg.alertContext.severity">
              <span class="ctx-icon">📍</span>
              <SeverityBadge :level="msg.alertContext.severity" size="sm" class="ctx-sev-badge" />
              <span class="ctx-info">{{ msg.alertContext.type }} · {{ msg.alertContext.address }}</span>
            </div>
            <div v-if="msg.deepthought?.trim()" class="thought-block">
              <button
                v-if="thoughtFoldable(msg)"
                type="button"
                class="bubble-thought-bar"
                @click="toggleThought(msg.id)"
              >
                <span class="thought-bar-text">🧠 思考过程</span>
                <svg
                  class="thought-chevron"
                  :class="{ open: thoughtExpanded(msg.id) }"
                  viewBox="0 0 16 16"
                  fill="none"
                  width="14"
                  height="14"
                  aria-hidden="true"
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <div
                v-show="!thoughtFoldable(msg) || thoughtExpanded(msg.id)"
                class="bubble-dt"
              >{{ msg.deepthought }}</div>
            </div>
            <div class="bubble-text md-body" v-html="bubbleHtml(msg.content)"></div>
            <!-- ActionCard 操作卡片 -->
            <div v-if="msg.actionCard" class="action-card" @click="openCanvas(msg.actionCard!)">
              <div class="ac-icon">{{ VIEW_ICONS[msg.actionCard.type] }}</div>
              <div class="ac-info">
                <div class="ac-title">{{ msg.actionCard.title }}</div>
                <div class="ac-sub">{{ msg.actionCard.subtitle }}</div>
              </div>
              <div class="ac-arrow">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                  <path d="M4 8h8M9 5l3 3-3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
            <div class="bubble-footer">
              <span class="bubble-time">{{ msg.time }}</span>
              <div class="bubble-footer-actions">
                <template v-if="msg.role === 'assistant' && msg.messageId && auth.user && !msg.loading">
                  <button
                    type="button"
                    class="icon-btn fb-like"
                    :class="{ on: msg.likeBool }"
                    title="点赞"
                    @click="onLike(msg)"
                  >👍</button>
                  <button
                    type="button"
                    class="icon-btn fb-dislike"
                    :class="{ on: msg.dislikeBool }"
                    title="点踩"
                    @click="onDislike(msg)"
                  >👎</button>
                </template>
                <button
                  type="button"
                  class="icon-btn bubble-remove-x"
                  title="移除此条（仅界面）"
                  @click="onRemoveMessage(msg)"
                >
                  <svg viewBox="0 0 16 16" fill="none" width="13" height="13" aria-hidden="true">
                    <path d="M4 4l8 8M12 4L4 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- 流式生成中：列表底部提示（滚动到底部时可见，与气泡内点阵/正文并存） -->
      <div v-if="chatStore.isLoading" class="stream-reply-hint" aria-live="polite">
        <span class="stream-reply-hint-dots" aria-hidden="true">
          <span class="srh-dot"></span>
          <span class="srh-dot"></span>
          <span class="srh-dot"></span>
        </span>
        <span class="stream-reply-hint-text">路小巡正在生成回复，请稍候…</span>
      </div>
    </div>

    <!-- 快捷按钮 -->
    <div class="quick-section">
      <div class="quick-label">快捷指令</div>
      <div class="quick-btns">
        <button
          v-for="q in modeQuickQuestions"
          :key="q"
          class="quick-btn"
          :disabled="chatStore.isLoading"
          @click="chatStore.sendMessage(q)"
        >{{ q }}</button>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="input-area">
      <!-- 点位上下文徽章 -->
      <transition name="badge-fade">
        <div v-if="chatStore.attachedAlert" class="alert-badge-row">
          <div class="alert-badge">
            <span class="badge-icon">📍</span>
            <SeverityBadge :level="chatStore.attachedAlert.severity" size="sm" />
            <span class="badge-type">{{ chatStore.attachedAlert.type }}</span>
            <span class="badge-addr">{{ chatStore.attachedAlert.address }}</span>
            <button class="badge-del" @click="chatStore.clearAttachedAlert()" title="移除关联点位">✕</button>
          </div>
        </div>
      </transition>

      <!-- @mention 面板 -->
      <transition name="mention-pop">
        <div v-if="showMention" class="mention-panel neu-card u-scrollbar-hidden">
          <div class="mention-title">引用功能视图 (@mention)</div>
          <div
            v-for="item in mentionItems"
            :key="item.type"
            class="mention-item"
            @click="insertMention(item)"
          >
            <span class="mention-icon">{{ item.icon }}</span>
            <div class="mention-info">
              <div class="mention-name">{{ item.label }}</div>
              <div class="mention-sub">{{ item.desc }}</div>
            </div>
          </div>
        </div>
      </transition>

      <div class="input-grid" :class="{ 'is-multiline': inputMultiline }">
        <button type="button" class="at-btn g-at" title="引用功能 (@)" @click="toggleMention">@</button>
        <div class="neu-inset input-wrap g-input">
          <div v-if="selectedMentions.length" class="mentions-inline">
            <span
              v-for="m in selectedMentions"
              :key="m.type"
              class="mention-tag"
              @click="removeMention(m)"
            >@{{ m.label }} ✕</span>
          </div>
          <textarea
            ref="inputEl"
            v-model="inputText"
            class="chat-input"
            :placeholder="inputPlaceholder"
            rows="1"
            :disabled="chatStore.isLoading"
            @keydown.enter.exact.prevent="submit"
            @keydown.at.exact="onAtKey"
            @input="onInput"
          />
        </div>
        <button
          type="button"
          class="send-btn neu-btn g-send"
          :disabled="!canSend"
          title="发送"
          @click="submit"
        >
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
            <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '../../stores/chatStore'
import { useCanvasStore } from '../../stores/canvasStore'
import { useAuthStore } from '../../stores/authStore'
import type { ActionCard, ChatMessage } from '../../stores/chatStore'
import type { CanvasViewType } from '../../stores/canvasStore'
import SeverityBadge from '../common/SeverityBadge.vue'
import { renderChatMarkdown } from '../../utils/renderMarkdown'

const wide = defineModel<boolean>('wide', { default: false })

const router      = useRouter()
const chatStore   = useChatStore()
const canvasStore = useCanvasStore()
const auth        = useAuthStore()

function goKb() { router.push('/pdf') }

const sessionSelect = ref('')
const sessionDdOpen = ref(false)
const sessionDdRoot = ref<HTMLElement | null>(null)

const sessionDisplayLabel = computed(() => {
  if (!sessionSelect.value) return '新建对话'
  const c = chatStore.conversations.find(x => x.key === sessionSelect.value)
  return (c?.label || c?.key || '会话') as string
})

watch(
  () => chatStore.activeConversationKey,
  k => {
    sessionSelect.value = k ?? ''
  },
  { immediate: true },
)

function toggleSessionDd() {
  if (chatStore.isLoading) return
  sessionDdOpen.value = !sessionDdOpen.value
}

function formatSessionSub(iso?: string) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function onDocClickSessionDd(e: MouseEvent) {
  if (!sessionDdOpen.value) return
  const root = sessionDdRoot.value
  if (root && !root.contains(e.target as Node)) sessionDdOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClickSessionDd)
  updateInputMultiline()
})
onUnmounted(() => document.removeEventListener('click', onDocClickSessionDd))

async function onSessionChange() {
  const v = sessionSelect.value
  if (!v) await chatStore.startNewChat()
  else await chatStore.selectConversation(v)
}

async function pickSession(key: string) {
  sessionSelect.value = key
  sessionDdOpen.value = false
  await onSessionChange()
}

async function onNewChat() {
  sessionDdOpen.value = false
  sessionSelect.value = ''
  chatStore.startNewChat()
}

async function onLike(msg: ChatMessage) {
  if (!auth.user?.user_id) return
  try {
    await chatStore.submitLike(msg, !msg.likeBool, auth.user.user_id)
  } catch {
    /* 忽略 */
  }
}

async function onDislike(msg: ChatMessage) {
  if (!auth.user?.user_id) return
  try {
    await chatStore.submitDislike(msg, !msg.dislikeBool, auth.user.user_id)
  } catch {
    /* 忽略 */
  }
}

function onRemoveMessage(msg: ChatMessage) {
  if (msg.loading) return
  if (!confirm('从当前会话中移除此条消息？（不会删除服务器上的记录）')) return
  chatStore.removeMessageById(msg.id)
}

async function onDeleteConversation() {
  sessionDdOpen.value = false
  try {
    await chatStore.deleteActiveConversation()
  } catch (e) {
    alert(e instanceof Error ? e.message : '删除会话失败')
  }
}

const inputText       = ref('')
const chatBody        = ref<HTMLElement | null>(null)
const inputEl         = ref<HTMLTextAreaElement | null>(null)
const showMention     = ref(false)
const selectedMentions = ref<typeof mentionItems[0][]>([])

const VIEW_ICONS: Record<CanvasViewType, string> = {
  map:        '🗺️',
  report:     '📋',
  compliance: '🏆',
  workorder:  '📑',
  plan:       '📅',
  risk:       '⚡',
  assess:     '📸',
}

const mentionItems = [
  { type: 'report'     as CanvasViewType, icon: '📋', label: '巡检报告',    desc: '查看 / 生成道路巡检报告' },
  { type: 'compliance' as CanvasViewType, icon: '🏆', label: '履约画像',    desc: '服务单位合规评分与排名' },
  { type: 'workorder'  as CanvasViewType, icon: '📑', label: '病害工单',    desc: '病害工单看板与详情' },
  { type: 'plan'       as CanvasViewType, icon: '📅', label: '巡检计划',    desc: 'AI 生成月度巡检计划' },
  { type: 'risk'       as CanvasViewType, icon: '⚡', label: '风险预测',    desc: '道路塌陷风险预判' },
  { type: 'assess'     as CanvasViewType, icon: '📸', label: '现场评估',    desc: '上传照片 AI 分析病害' },
  { type: 'map'        as CanvasViewType, icon: '🗺️', label: '全景地图',    desc: '返回地图总览' },
]

// 按模式切换快捷指令
const modeQuickMap: Record<string, string[]> = {
  insight: [
    '今日高优先级告警有哪些？',
    '上城区道路情况如何？',
    '生成本周维修建议报告',
  ],
  collect: [
    '当前知识库包含哪些内容？',
    '提取失败的报告有哪些？',
    '知识库最新更新时间？',
  ],
  operations: [
    '显示所有待处理工单',
    '生成下月巡检计划',
    '哪些工单超期未处理？',
  ],
  predict: [
    '未来3个月高风险路段',
    '分析解放路塌陷风险',
    '生成风险预测报告',
  ],
}
const modeQuickQuestions = computed(() => modeQuickMap[canvasStore.agentMode] || modeQuickMap['insight'])

const inputPlaceholder = computed(() => {
  if (chatStore.attachedAlert) return '输入关于该点位的问题…'
  if (selectedMentions.value.length) return `结合 @${selectedMentions.value.map(m => m.label).join('、')} 提问…`
  return '向路小巡提问，输入 @ 引用功能视图…'
})

const canSend = computed(() => (inputText.value.trim() || selectedMentions.value.length > 0) && !chatStore.isLoading)

async function submit() {
  if (!canSend.value) return
  const mentions = selectedMentions.value.map(m => `@${m.label}`).join(' ')
  const text = [mentions, inputText.value.trim()].filter(Boolean).join(' ')
  inputText.value = ''
  selectedMentions.value = []
  if (inputEl.value) inputEl.value.style.height = ''
  showMention.value = false
  await chatStore.sendMessage(text)
  nextTick(() => updateInputMultiline())
}

function onInput() {
  if (!inputEl.value) return
  inputEl.value.style.height = ''
  inputEl.value.style.height = Math.min(inputEl.value.scrollHeight, 100) + 'px'
  updateInputMultiline()
  if (inputText.value.endsWith('@')) {
    showMention.value = true
  } else if (!inputText.value.includes('@')) {
    showMention.value = false
  }
}

function onAtKey() {
  showMention.value = true
}

function toggleMention() {
  showMention.value = !showMention.value
}

function insertMention(item: typeof mentionItems[0]) {
  if (!selectedMentions.value.find(m => m.type === item.type)) {
    selectedMentions.value.push(item)
  }
  // 删掉输入框末尾的 @
  inputText.value = inputText.value.replace(/@$/, '')
  showMention.value = false
  nextTick(() => inputEl.value?.focus())
}

function removeMention(item: typeof mentionItems[0]) {
  selectedMentions.value = selectedMentions.value.filter(m => m.type !== item.type)
}

function openCanvas(card: ActionCard) {
  // pushTab 内部已自动设为 activeTabId
  canvasStore.pushTab({ type: card.type, title: card.title })
}

function bubbleHtml(text: string): string {
  return renderChatMarkdown(text)
}

/** 思考过程：流式结束后可折叠到气泡顶栏 */
const thoughtExpandedIds = ref<Record<number, true>>({})

function thoughtFoldable(msg: ChatMessage) {
  return msg.status === 'success' || msg.status === 'error'
}

function thoughtExpanded(id: number) {
  return !!thoughtExpandedIds.value[id]
}

function toggleThought(id: number) {
  const next = { ...thoughtExpandedIds.value }
  if (next[id]) delete next[id]
  else next[id] = true
  thoughtExpandedIds.value = next
}

const inputMultiline = ref(false)

function updateInputMultiline() {
  nextTick(() => {
    const el = inputEl.value
    if (!el) return
    const lh = parseFloat(getComputedStyle(el).lineHeight || '0') || 20
    inputMultiline.value = el.scrollHeight > lh * 1.42
  })
}

watch(
  () => chatStore.messages,
  async () => {
    await nextTick()
    if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight
  },
  { deep: true }
)

watch(inputText, () => updateInputMultiline())

watch(selectedMentions, () => updateInputMultiline(), { deep: true })
</script>

<style scoped>
.right-panel-wrap { display:flex; flex-direction:column; height:100%; padding:14px 12px; position:relative; gap:10px; overflow:visible; }

.session-toolbar {
  flex-shrink:0;
  display:flex;
  flex-direction:row;
  align-items:center;
  gap:8px;
  padding:0 0 10px 0;
  margin:0 0 2px 0;
  border-bottom:1px solid rgba(74,141,183,0.14);
}
.sess-inline-label {
  font-size:10px;
  font-weight:700;
  color:#8A9AAC;
  flex-shrink:0;
  letter-spacing:0.3px;
}
.session-select-wrap { flex:1; min-width:0; }
.session-dd { position:relative; }
.session-dd-trigger {
  width:100%;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  padding:7px 10px;
  border-radius:10px;
  border:1px solid var(--neu-stroke-faint);
  background:var(--bg-color);
  box-shadow:var(--neu-inset-shallow);
  font-size:11px;
  font-family:'Noto Sans SC',sans-serif;
  font-weight:500;
  color:var(--genshin-blue-dark);
  cursor:pointer;
  text-align:left;
  min-width:0;
  transition:border-color 0.15s, box-shadow 0.15s;
}
.session-dd-trigger:hover:not(:disabled) {
  border-color:rgba(74,141,183,0.35);
}
.session-dd-trigger:disabled { opacity:0.5; cursor:not-allowed; }
.session-dd-text {
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  min-width:0;
}
.session-dd-chevron {
  flex-shrink:0;
  color:var(--genshin-blue);
  opacity:0.55;
  transition:transform 0.2s ease, opacity 0.15s;
}
.session-dd-chevron.open {
  transform:rotate(180deg);
  opacity:0.85;
}
.session-dd-panel {
  position:absolute;
  left:0;
  right:0;
  top:calc(100% + 5px);
  z-index:220;
  max-height:240px;
  overflow-y:auto;
  padding:6px;
  border-radius:12px;
  background:var(--bg-color);
  border:1px solid var(--neu-border-highlight);
  box-shadow:
    0 10px 32px rgba(26,58,82,0.14),
    0 2px 8px rgba(26,58,82,0.06),
    var(--neu-extrude-md);
}
.session-dd-item {
  width:100%;
  display:flex;
  flex-direction:column;
  align-items:stretch;
  gap:2px;
  padding:8px 10px;
  margin:0 0 2px 0;
  border:none;
  border-radius:9px;
  background:transparent;
  cursor:pointer;
  font-family:'Noto Sans SC',sans-serif;
  text-align:left;
  color:var(--genshin-blue-dark);
  transition:background 0.12s;
}
.session-dd-item:last-child { margin-bottom:0; }
.session-dd-item:hover { background:rgba(74,141,183,0.08); }
.session-dd-item.active {
  background:rgba(212,168,83,0.14);
  box-shadow:inset 0 0 0 1px rgba(212,168,83,0.28);
}
.session-dd-item-main {
  font-size:12px;
  font-weight:600;
  line-height:1.35;
  display:flex;
  align-items:center;
  gap:6px;
  word-break:break-word;
}
.session-dd-item-icon {
  font-size:13px;
  font-weight:700;
  color:var(--genshin-blue);
  opacity:0.85;
}
.session-dd-item-sub {
  font-size:10px;
  color:#8A9AAC;
  font-weight:500;
  padding-left:19px;
}
.session-dd-fade-enter-active,
.session-dd-fade-leave-active { transition:opacity 0.16s ease, transform 0.16s ease; }
.session-dd-fade-enter-from,
.session-dd-fade-leave-to { opacity:0; transform:translateY(-6px); }
.sess-icon-btn {
  flex-shrink:0;
  width:30px;
  height:30px;
  padding:0;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:10px;
  border:1px solid var(--neu-stroke-muted);
  background:var(--bg-color);
  color:var(--genshin-blue);
  cursor:pointer;
  box-shadow:var(--neu-extrude-sm);
  transition:all 0.18s;
}
.sess-icon-btn:disabled { opacity:0.45; cursor:not-allowed; }
.sess-add:hover:not(:disabled) {
  border-color:rgba(74,141,183,0.4);
  color:var(--genshin-blue-dark);
  box-shadow:var(--neu-extrude-md);
}
.sess-trash {
  color:#C44;
  background:rgba(224,112,112,0.06);
  border-color:rgba(224,112,112,0.3);
}
.sess-trash:hover:not(:disabled) {
  background:rgba(224,112,112,0.14);
  box-shadow:0 2px 8px rgba(224,112,112,0.18);
}
.sess-wide {
  color:var(--genshin-blue);
  background:rgba(74,141,183,0.06);
  border-color:rgba(74,141,183,0.28);
}
.sess-wide:hover:not(:disabled) {
  border-color:rgba(74,141,183,0.45);
  color:var(--genshin-blue-dark);
  box-shadow:var(--neu-extrude-md);
}
.sess-wide.active {
  border-color:rgba(74,141,183,0.55);
  background:rgba(74,141,183,0.14);
  color:var(--genshin-blue-dark);
  box-shadow:inset 1px 1px 3px rgba(26,58,82,0.08),var(--neu-extrude-sm);
}

.avatar-section { display:flex; align-items:center; gap:10px; padding:10px 12px; background:linear-gradient(135deg,rgba(45,90,123,0.08),rgba(74,141,183,0.04)); border-radius:14px; box-shadow:var(--neu-inset-shallow); flex-shrink:0; flex-wrap:wrap; }
.avatar-frame { width:56px; height:56px; border-radius:50%; padding:3px; background:linear-gradient(135deg,var(--genshin-gold-dark),var(--genshin-gold),var(--genshin-gold-light)); flex-shrink:0; box-shadow:var(--neu-glow-gold-frame); }
.avatar-svg { width:100%; height:100%; border-radius:50%; background:var(--bg-color); }
.mini-avatar { width:28px; height:28px; border-radius:50%; }
.avatar-info { flex:1; }
.avatar-name { font-family:'Noto Serif SC',serif; font-size:15px; font-weight:700; color:var(--genshin-blue-dark); letter-spacing:1px; }
.avatar-title { font-size:11px; color:#8A9AAC; margin-top:2px; }
.online-badge { display:flex; align-items:center; gap:4px; font-size:11px; color:var(--success); flex-shrink:0; transition:color 0.2s; }
.online-badge.is-answering { color:var(--genshin-blue); font-weight:600; }
.status-dot { width:7px; height:7px; border-radius:50%; background:var(--success); display:inline-block; box-shadow:0 0 5px var(--success); }
.status-dot-typing {
  background:var(--genshin-blue);
  box-shadow:0 0 6px rgba(74,141,183,0.65);
  animation:status-dot-blink 1s ease-in-out infinite;
}
@keyframes status-dot-blink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.55;transform:scale(0.92)} }

/* 右侧纵列：知识库 + 在线 */
.avatar-right-col { display:flex; flex-direction:column; align-items:flex-end; gap:5px; flex-shrink:0; max-width:100%; }

.kb-chips { display:flex; flex-wrap:wrap; align-items:center; justify-content:flex-end; gap:4px; max-width:220px; }
.kb-manage-btn {
  display:flex; align-items:center; gap:5px;
  padding:4px 9px; border-radius:9px; border:1px solid var(--neu-stroke-muted);
  background:var(--bg-color); cursor:pointer;
  font-size:11px; font-family:'Noto Sans SC',sans-serif; color:#3A4A5C;
  box-shadow:var(--neu-extrude-sm);
  transition:all 0.2s; white-space:nowrap;
}
.kb-manage-btn:hover { color:var(--genshin-blue); border-color:rgba(74,141,183,0.3); }
.kb-mb-icon { font-size:12px; flex-shrink:0; }
.kb-mb-text { font-weight:600; }
.kb-chip {
  display:inline-flex; align-items:center; gap:2px; max-width:100px;
  padding:2px 6px; border-radius:8px; font-size:10px; font-weight:600;
  background:rgba(212,168,83,0.12); border:1px solid rgba(212,168,83,0.35); color:var(--genshin-gold-dark);
}
.kb-chip-label { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.kb-chip-x { background:none; border:none; cursor:pointer; color:#B0BAC8; font-size:9px; padding:0 1px; flex-shrink:0; }
.kb-clear-all { font-size:10px; padding:2px 6px; border-radius:6px; border:none; cursor:pointer; background:rgba(224,112,112,0.12); color:#E07070; font-family:'Noto Sans SC',sans-serif; }

/* 对话区 */
.chat-body { flex:1; overflow-y:auto; overflow-x:hidden; display:flex; flex-direction:column; gap:10px; padding:8px 6px; min-height:0; background:linear-gradient(var(--neu-angle),var(--neu-groove-from) 0%,var(--neu-groove-to) 100%); border-radius:14px; box-shadow:var(--neu-inset-groove); }
.stream-reply-hint {
  display:flex;
  align-items:center;
  gap:8px;
  flex-shrink:0;
  margin-top:2px;
  padding:8px 10px;
  border-radius:10px;
  font-size:11px;
  color:var(--genshin-blue-dark);
  background:rgba(74,141,183,0.1);
  border:1px dashed rgba(74,141,183,0.28);
  box-shadow:var(--neu-extrude-sm);
}
.stream-reply-hint-text { line-height:1.4; font-weight:600; }
.stream-reply-hint-dots { display:flex; align-items:center; gap:4px; flex-shrink:0; }
.srh-dot {
  width:5px;
  height:5px;
  border-radius:50%;
  background:var(--genshin-blue);
  animation:srh-dot-pulse 1.15s ease-in-out infinite;
}
.srh-dot:nth-child(2) { animation-delay:0.18s; }
.srh-dot:nth-child(3) { animation-delay:0.36s; }
@keyframes srh-dot-pulse { 0%,80%,100%{transform:scale(0.65);opacity:0.35} 40%{transform:scale(1);opacity:1} }
.msg-row { display:flex; align-items:flex-end; gap:6px; animation:slide-in 0.25s ease; }
.msg-row.user { flex-direction:row-reverse; }
.msg-avatar { flex-shrink:0; }
.bubble-wrap { max-width:88%; }
.bubble-wrap.user { margin-left:auto; }
.bubble { padding:9px 12px; border-radius:14px; font-size:12.5px; line-height:1.55; word-break:break-word; }
.bubble.assistant { background:linear-gradient(var(--neu-angle),var(--neu-convex-from) 0%,var(--neu-convex-mid) 60%,var(--neu-convex-to) 100%); color:var(--genshin-blue-dark); box-shadow:var(--neu-extrude-md); border:1px solid var(--neu-border-highlight); border-bottom-left-radius:4px; }
.bubble.user { background:linear-gradient(135deg,var(--genshin-blue-light),var(--genshin-blue)); color:#fff; box-shadow:3px 3px 9px rgba(26,58,82,0.45),-2px -2px 6px rgba(74,141,183,0.30); border:1px solid rgba(255,255,255,0.22); border-bottom-right-radius:4px; }
.loading-bubble { display:flex; align-items:center; gap:5px; padding:10px 16px; }
@keyframes dot-pulse { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
.dot-pulse { display:inline-block; width:7px; height:7px; border-radius:50%; background:var(--genshin-blue); animation:dot-pulse 1.2s ease-in-out infinite; }
/* Markdown 正文 */
.md-body :deep(p) { margin:0 0 0.55em 0; line-height:1.55; }
.md-body :deep(p:last-child) { margin-bottom:0; }
.md-body :deep(h1), .md-body :deep(h2), .md-body :deep(h3) {
  font-family:'Noto Serif SC',serif; font-weight:700; color:var(--genshin-blue-dark);
  margin:0.65em 0 0.4em 0; line-height:1.35;
}
.md-body :deep(h1) { font-size:1.05em; }
.md-body :deep(h2) { font-size:1em; }
.md-body :deep(h3) { font-size:0.95em; }
.md-body :deep(ul), .md-body :deep(ol) { margin:0.4em 0; padding-left:1.35em; }
.md-body :deep(li) { margin:0.2em 0; }
.md-body :deep(blockquote) {
  margin:0.45em 0; padding:0.35em 0.65em; border-left:3px solid rgba(74,141,183,0.45);
  background:rgba(74,141,183,0.06); color:#4A5A6C; font-size:0.96em;
}
.md-body :deep(code) {
  font-family:ui-monospace,monospace; font-size:0.88em;
  padding:0.12em 0.38em; border-radius:5px;
  background:rgba(74,141,183,0.1); color:#2D5A7B;
}
.md-body :deep(pre) {
  margin:0.5em 0; padding:0.55em 0.65em; border-radius:10px; overflow-x:auto;
  background:rgba(26,58,82,0.06); border:1px solid rgba(74,141,183,0.15);
  font-size:0.86em; line-height:1.45;
}
.md-body :deep(pre code) { padding:0; background:none; color:inherit; font-size:inherit; }
.md-body :deep(a) { color:var(--genshin-blue); text-decoration:underline; text-underline-offset:2px; }
.md-body :deep(strong) { color:var(--genshin-gold-dark); font-weight:700; }
.md-body :deep(hr) { border:none; border-top:1px solid rgba(74,141,183,0.2); margin:0.65em 0; }
.md-body :deep(table) { border-collapse:collapse; width:100%; font-size:0.92em; margin:0.5em 0; }
.md-body :deep(th), .md-body :deep(td) { border:1px solid rgba(74,141,183,0.22); padding:0.35em 0.5em; text-align:left; }
.md-body :deep(th) { background:rgba(74,141,183,0.08); font-weight:600; }

/* 知识库 <custom-index> 渲染：引用卡片 */
.md-body :deep(.chat-ref-block) {
  margin-top:0.85em;
  padding:10px 11px;
  border-radius:12px;
  border:1px solid rgba(74,141,183,0.22);
  background:linear-gradient(135deg,rgba(74,141,183,0.07),rgba(45,90,123,0.04));
  box-shadow:var(--neu-extrude-sm);
}
.md-body :deep(.chat-ref-block--error) {
  border-color:rgba(224,112,112,0.35);
  background:rgba(224,112,112,0.06);
}
.md-body :deep(.chat-ref-heading) {
  font-family:'Noto Serif SC',serif;
  font-size:0.92em;
  font-weight:700;
  color:var(--genshin-blue-dark);
  margin-bottom:8px;
  letter-spacing:0.3px;
}
.md-body :deep(.chat-ref-fail) { margin:0; font-size:0.88em; color:#B05050; }
.md-body :deep(.chat-ref-rows) {
  display:flex;
  flex-direction:column;
  gap:5px;
  font-size:0.92em;
}
.md-body :deep(.chat-ref-item) {
  border-radius:10px;
  border:1px solid rgba(74,141,183,0.2);
  background:rgba(255,255,255,0.42);
  overflow:hidden;
}
.md-body :deep(.chat-ref-item-sum) {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  padding:7px 9px;
  cursor:pointer;
  list-style:none;
  font-size:0.92em;
  line-height:1.35;
  color:#3A4A5C;
  user-select:none;
}
.md-body :deep(.chat-ref-item-sum::-webkit-details-marker) { display:none; }
.md-body :deep(.chat-ref-sum-text) {
  display:flex;
  align-items:center;
  gap:6px;
  min-width:0;
  flex:1;
}
.md-body :deep(.chat-ref-sum-name) {
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  font-weight:600;
  color:var(--genshin-blue-dark);
}
.md-body :deep(.chat-ref-sum-sep) { flex-shrink:0; opacity:0.45; font-weight:500; }
.md-body :deep(.chat-ref-sum-page) { flex-shrink:0; font-weight:700; color:#4A5A6C; }
.md-body :deep(.chat-ref-sum-btn) {
  flex-shrink:0;
  display:flex;
  align-items:center;
  justify-content:center;
  width:26px;
  height:26px;
  border-radius:8px;
  border:1px solid rgba(74,141,183,0.22);
  background:rgba(74,141,183,0.06);
  color:var(--genshin-blue);
  transition:background 0.15s, transform 0.2s ease, border-color 0.15s;
}
.md-body :deep(.chat-ref-item-sum:hover .chat-ref-sum-btn) {
  background:rgba(74,141,183,0.12);
  border-color:rgba(74,141,183,0.35);
}
.md-body :deep(.chat-ref-chev) {
  display:block;
  transition:transform 0.2s ease;
}
.md-body :deep(.chat-ref-item[open] .chat-ref-chev) { transform:rotate(180deg); }
.md-body :deep(.chat-ref-item-body) {
  padding:0 9px 9px;
  border-top:1px solid rgba(74,141,183,0.12);
  background:rgba(74,141,183,0.03);
}
.md-body :deep(.chat-ref-empty) {
  margin:0;
  padding:4px 0 0;
  font-size:0.85em;
  color:#8A9AAC;
}
.md-body :deep(.chat-ref-link) {
  display:inline-block;
  margin-top:8px;
  margin-bottom:2px;
  font-weight:600;
  font-size:0.88em;
  text-decoration:none;
  color:var(--genshin-blue);
  border-bottom:1px dashed rgba(74,141,183,0.45);
}
.md-body :deep(.chat-ref-link:hover) {
  color:var(--genshin-gold-dark);
  border-bottom-color:rgba(212,168,83,0.55);
}
.md-body :deep(.chat-ref-snippet) {
  margin-top:8px;
  padding:8px 9px;
  border-radius:8px;
  font-size:0.82em;
  line-height:1.5;
  color:#5A6570;
  white-space:pre-wrap;
  word-break:break-word;
  max-height:10em;
  overflow-y:auto;
  border:1px dashed rgba(74,141,183,0.22);
  background:rgba(255,255,255,0.65);
}

.bubble.user .md-body :deep(h1), .bubble.user .md-body :deep(h2), .bubble.user .md-body :deep(h3) {
  color:rgba(255,255,255,0.95);
}
.bubble.user .md-body :deep(blockquote) { border-left-color:rgba(255,255,255,0.35); background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.88); }
.bubble.user .md-body :deep(code) { background:rgba(255,255,255,0.2); color:#fff; }
.bubble.user .md-body :deep(pre) { background:rgba(0,0,0,0.15); border-color:rgba(255,255,255,0.2); }
.bubble.user .md-body :deep(a) { color:var(--genshin-gold-light); }
.bubble.user .md-body :deep(strong) { color:var(--genshin-gold-light); }
.bubble.user .md-body :deep(th), .bubble.user .md-body :deep(td) { border-color:rgba(255,255,255,0.25); }
.bubble.user .md-body :deep(th) { background:rgba(255,255,255,0.12); }

.bubble.user .md-body :deep(.chat-ref-block) {
  border-color:rgba(255,255,255,0.28);
  background:rgba(255,255,255,0.1);
}
.bubble.user .md-body :deep(.chat-ref-heading) { color:rgba(255,255,255,0.95); }
.bubble.user .md-body :deep(.chat-ref-item) {
  border-color:rgba(255,255,255,0.25);
  background:rgba(255,255,255,0.08);
}
.bubble.user .md-body :deep(.chat-ref-item-sum) { color:rgba(255,255,255,0.9); }
.bubble.user .md-body :deep(.chat-ref-sum-name) { color:rgba(255,255,255,0.95); }
.bubble.user .md-body :deep(.chat-ref-sum-page) { color:rgba(255,255,255,0.88); }
.bubble.user .md-body :deep(.chat-ref-sum-btn) {
  border-color:rgba(255,255,255,0.28);
  background:rgba(255,255,255,0.1);
  color:var(--genshin-gold-light);
}
.bubble.user .md-body :deep(.chat-ref-item-sum:hover .chat-ref-sum-btn) {
  background:rgba(255,255,255,0.16);
  border-color:rgba(255,255,255,0.38);
}
.bubble.user .md-body :deep(.chat-ref-item-body) {
  border-top-color:rgba(255,255,255,0.18);
  background:rgba(0,0,0,0.1);
}
.bubble.user .md-body :deep(.chat-ref-empty) { color:rgba(255,255,255,0.65); }
.bubble.user .md-body :deep(.chat-ref-link) {
  color:var(--genshin-gold-light);
  border-bottom-color:rgba(255,255,255,0.35);
}
.bubble.user .md-body :deep(.chat-ref-snippet) {
  color:rgba(255,255,255,0.88);
  border-color:rgba(255,255,255,0.22);
  background:rgba(0,0,0,0.15);
}

/* 点位上下文 */
.bubble-alert-ctx { display:flex; align-items:center; gap:4px; padding:4px 8px; border-radius:8px; font-size:11px; margin-bottom:6px; background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.25); }
.ctx-icon { font-size:12px; flex-shrink:0; }
.bubble.assistant .bubble-alert-ctx { background:rgba(74,141,183,0.1); border-color:rgba(74,141,183,0.2); }
.ctx-info { font-size:11px; color:rgba(255,255,255,0.85); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.bubble.assistant .ctx-info { color:var(--genshin-blue-dark); }
.bubble.user :deep(.ctx-sev-badge.sev-badge.high)   { background:rgba(255,255,255,0.25) !important; color:#FFD0D0 !important; }
.bubble.user :deep(.ctx-sev-badge.sev-badge.medium) { background:rgba(255,255,255,0.25) !important; color:#FFE0B0 !important; }
.bubble.user :deep(.ctx-sev-badge.sev-badge.low)    { background:rgba(255,255,255,0.25) !important; color:#B0F0D8 !important; }

/* ActionCard */
.action-card { display:flex; align-items:center; gap:8px; margin-top:8px; padding:9px 11px; border-radius:12px; background:rgba(74,141,183,0.07); border:1px solid rgba(74,141,183,0.2); cursor:pointer; transition:all 0.2s; }
.action-card:hover { background:rgba(74,141,183,0.14); border-color:rgba(74,141,183,0.38); transform:translateX(2px); }
.ac-icon { font-size:18px; flex-shrink:0; }
.ac-info { flex:1; min-width:0; }
.ac-title { font-size:12px; font-weight:600; color:var(--genshin-blue-dark); }
.ac-sub { font-size:10px; color:#8A9AAC; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ac-arrow { color:#B0BAC8; flex-shrink:0; }

.thought-block { margin-bottom:6px; }
.bubble-thought-bar {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  width:100%;
  margin:0 0 4px 0;
  padding:5px 8px;
  border-radius:8px;
  border:1px solid rgba(74,141,183,0.22);
  background:rgba(74,141,183,0.07);
  color:var(--genshin-blue-dark);
  font-size:10px;
  font-family:'Noto Sans SC',sans-serif;
  cursor:pointer;
  box-shadow:var(--neu-extrude-sm);
  transition:background 0.15s,border-color 0.15s;
}
.bubble-thought-bar:hover {
  background:rgba(74,141,183,0.11);
  border-color:rgba(74,141,183,0.32);
}
.thought-bar-text { font-weight:600; letter-spacing:0.2px; }
.thought-chevron { flex-shrink:0; opacity:0.75; transition:transform 0.18s ease; }
.thought-chevron.open { transform:rotate(180deg); }
.bubble.user .bubble-thought-bar {
  border-color:rgba(255,255,255,0.28);
  background:rgba(255,255,255,0.14);
  color:rgba(255,255,255,0.92);
}
.bubble.user .bubble-thought-bar:hover {
  background:rgba(255,255,255,0.2);
  border-color:rgba(255,255,255,0.38);
}

.bubble-dt { font-size:10px; color:#6B7A8C; white-space:pre-wrap; margin-bottom:6px; padding:6px 8px; border-radius:8px; background:rgba(74,141,183,0.06); border:1px dashed rgba(74,141,183,0.2); line-height:1.45; }
.bubble.user .bubble-dt { background:rgba(255,255,255,0.12); border-color:rgba(255,255,255,0.2); color:rgba(255,255,255,0.85); }

.bubble-footer {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  margin-top:6px;
  padding-top:5px;
  border-top:1px solid rgba(74,141,183,0.12);
}
.bubble.user .bubble-footer { border-top-color:rgba(255,255,255,0.2); }
.bubble-time { font-size:10px; color:#8A9AAC; flex-shrink:0; }
.bubble.user .bubble-time { color:rgba(255,255,255,0.65); }
.bubble-footer-actions { display:flex; align-items:center; gap:3px; flex-shrink:0; }
.icon-btn {
  width:26px;
  height:26px;
  padding:0;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:8px;
  border:1px solid var(--neu-stroke-muted);
  background:rgba(255,255,255,0.5);
  cursor:pointer;
  font-size:12px;
  line-height:1;
  opacity:0.72;
  transition:all 0.15s;
}
.icon-btn:hover { opacity:1; box-shadow:var(--neu-extrude-sm); }
.icon-btn.on { opacity:1; border-color:rgba(212,168,83,0.45); background:rgba(212,168,83,0.12); }
.fb-like.on, .fb-dislike.on { border-color:rgba(212,168,83,0.5); background:rgba(212,168,83,0.14); }
.bubble-remove-x {
  color:#8A9AAC;
  background:rgba(255,255,255,0.45);
}
.bubble-remove-x:hover {
  color:#E07070;
  border-color:rgba(224,112,112,0.45);
  background:rgba(224,112,112,0.08);
}
.bubble.user .icon-btn {
  background:rgba(255,255,255,0.12);
  border-color:rgba(255,255,255,0.28);
  color:rgba(255,255,255,0.92);
}
.bubble.user .bubble-remove-x { color:rgba(255,255,255,0.75); }
.bubble.user .bubble-remove-x:hover {
  color:#fff;
  background:rgba(224,112,112,0.35);
  border-color:rgba(255,255,255,0.4);
}

/* 快捷按钮 */
.quick-section { flex-shrink:0; }
.quick-label { font-size:11px; color:#8A9AAC; margin-bottom:6px; padding-left:2px; }
.quick-btns { display:flex; flex-wrap:wrap; gap:5px; }
.quick-btn { font-size:11px; padding:5px 10px; border-radius:12px; border:1px solid var(--neu-border-highlight); cursor:pointer; background:linear-gradient(var(--neu-angle),var(--neu-convex-from),var(--neu-convex-mid)); color:var(--genshin-blue); transition:all 0.2s; font-family:'Noto Sans SC',sans-serif; box-shadow:var(--neu-extrude-sm); line-height:1.3; text-align:left; }
.quick-btn:hover:not(:disabled) { background:linear-gradient(135deg,var(--genshin-gold-light),var(--genshin-gold)); color:white; border-color:rgba(255,255,255,0.45); }
.quick-btn:disabled { opacity:0.45; cursor:not-allowed; }

/* 输入区 */
.input-area { display:flex; flex-direction:column; gap:6px; flex-shrink:0; position:relative; }
.alert-badge-row { padding:0 2px; }
.alert-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 8px 4px 7px; border-radius:10px; font-size:11px; background:rgba(45,90,123,0.08); border:1px solid rgba(45,90,123,0.18); box-shadow:inset 1px 1px 3px var(--shadow-dark),inset -1px -1px 3px var(--shadow-light); max-width:100%; overflow:hidden; }
.badge-icon { font-size:12px; flex-shrink:0; }
.badge-type { font-weight:600; color:var(--genshin-blue-dark); flex-shrink:0; }
.badge-addr { color:#6B7A8C; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0; }
.badge-del { flex-shrink:0; background:none; border:none; cursor:pointer; color:#8A9AAC; font-size:10px; padding:1px 3px; border-radius:50%; line-height:1; }
.badge-del:hover { color:#E07070; }

/* @mention 面板 */
.mention-panel { position:absolute; bottom:100%; left:0; right:0; z-index:200; padding:10px 12px; border-radius:14px; max-height:220px; overflow-y:auto; }
.mention-title { font-size:10px; color:#8A9AAC; margin-bottom:8px; padding-left:2px; }
.mention-item { display:flex; align-items:center; gap:8px; padding:7px 9px; border-radius:10px; cursor:pointer; transition:background 0.15s; }
.mention-item:hover { background:rgba(74,141,183,0.08); }
.mention-icon { font-size:16px; flex-shrink:0; }
.mention-info { flex:1; }
.mention-name { font-size:12px; font-weight:600; color:var(--genshin-blue-dark); }
.mention-sub { font-size:10px; color:#8A9AAC; }

/* 已选 mentions */
.mentions-inline { display:flex; flex-wrap:wrap; gap:4px; padding-bottom:4px; }
.mention-tag { font-size:11px; padding:2px 7px; border-radius:8px; background:rgba(74,141,183,0.1); color:var(--genshin-blue); border:1px solid rgba(74,141,183,0.2); cursor:pointer; transition:all 0.15s; }
.mention-tag:hover { background:rgba(224,112,112,0.1); color:#E07070; border-color:rgba(224,112,112,0.2); }

.input-grid {
  display:grid;
  grid-template-columns:auto 1fr auto;
  grid-template-rows:auto;
  align-items:flex-end;
  gap:6px;
}
.input-grid .g-input { min-width:0; grid-column:2; grid-row:1; }
.input-grid .g-at { grid-column:1; grid-row:1; align-self:flex-end; }
.input-grid .g-send { grid-column:3; grid-row:1; align-self:flex-end; }
.input-grid.is-multiline {
  grid-template-rows:auto auto;
}
.input-grid.is-multiline .g-input {
  grid-column:1 / -1;
  grid-row:1;
}
.input-grid.is-multiline .g-at {
  grid-column:1;
  grid-row:2;
  justify-self:start;
}
.input-grid.is-multiline .g-send {
  grid-column:3;
  grid-row:2;
  justify-self:end;
}

.input-row { display:flex; align-items:flex-end; gap:6px; }
.input-wrap { flex:1; padding:8px 12px; }
.chat-input { width:100%; background:transparent; border:none; outline:none; resize:none; font-family:'Noto Sans SC',sans-serif; font-size:12.5px; color:var(--genshin-blue-dark); line-height:1.5; max-height:100px; overflow-y:auto; }
.chat-input::placeholder { color:#9AAABB; }

.side-btns { display:flex; flex-direction:column; gap:4px; }
.at-btn { width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:9px; border:1px solid var(--neu-stroke-muted); background:var(--bg-color); color:var(--genshin-blue); font-size:13px; font-weight:700; cursor:pointer; box-shadow:var(--neu-extrude-sm); transition:all 0.2s; flex-shrink:0; }
.at-btn:hover { background:linear-gradient(135deg,var(--genshin-gold-light),var(--genshin-gold)); color:#fff; border-color:transparent; }
.send-btn { width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:9px; color:var(--genshin-blue-dark); flex-shrink:0; }
.send-btn:not(:disabled):hover { background:linear-gradient(135deg,var(--genshin-gold-light),var(--genshin-gold)); color:white; }
.send-btn:disabled { opacity:0.4; cursor:not-allowed; }

.badge-fade-enter-active,.badge-fade-leave-active { transition:all 0.2s ease; }
.badge-fade-enter-from,.badge-fade-leave-to { opacity:0; transform:translateY(4px); }
.mention-pop-enter-active,.mention-pop-leave-active { transition:all 0.18s cubic-bezier(0.4,0,0.2,1); }
.mention-pop-enter-from,.mention-pop-leave-to { opacity:0; transform:translateY(6px); }
</style>
