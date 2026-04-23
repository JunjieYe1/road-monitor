import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AlertPoint } from './alertStore'
import type { CanvasViewType } from './canvasStore'
import { sevLabel, statusLabel } from '../utils/labels'
import { streamChatTokens } from '../api/chatStream'
import {
  apiListConversations,
  apiGetMessages,
  apiDeleteConversation,
  apiMessageLike,
  apiMessageDislike,
  type ConversationListItem,
} from '../api/agentClient'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export interface KbSelection {
  id: string
  label: string
}

export interface ActionCard {
  type: CanvasViewType
  title: string
  subtitle: string
}

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  time: string
  loading?: boolean
  deepthought?: string
  alertContext?: AlertPoint
  actionCard?: ActionCard
  messageId?: string
  groupId?: number
  status?: string
  likeBool?: boolean
  dislikeBool?: boolean
}

function threadPartFromKey(key: string): string {
  const i = key.indexOf(':')
  return i >= 0 ? key.slice(i + 1) : key
}

function welcomeMessages(): ChatMessage[] {
  return [
    {
      id: 1,
      role: 'assistant',
      content:
        '您好！我是路小巡，城市道路智能监测助手。我可以帮您分析道路病害数据、查询告警详情、生成报告、查看履约画像等。请问有什么需要帮助的？',
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]
}

function mapApiMessage(m: Record<string, unknown>, idNum: number): ChatMessage {
  const msg = m.message as { role?: string; content?: string } | undefined
  const role: 'user' | 'assistant' = msg?.role === 'user' ? 'user' : 'assistant'
  const ts = m.timestamp as string | undefined
  const time = ts
    ? new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return {
    id: idNum,
    role,
    content: msg?.content ?? '',
    time,
    messageId: m.message_id as string | undefined,
    groupId: m.group_id as number | undefined,
    status: m.status as string | undefined,
    likeBool: m.like_bool as boolean | undefined,
    dislikeBool: m.dislike_bool as boolean | undefined,
  }
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>(welcomeMessages())
  let nextId = 2
  const isLoading = ref(false)

  const attachedAlert = ref<AlertPoint | null>(null)
  const activeKbSelections = ref<KbSelection[]>([])

  const conversations = ref<ConversationListItem[]>([])
  const activeConversationKey = ref<string | null>(null)
  const activeThreadShort = ref(`user_session_${Date.now()}`)
  const workspaceReady = ref(false)

  const quickQuestions = [
    '今日高优先级告警有哪些？',
    '上城区道路情况如何？',
    '生成本周维修建议报告',
    '哪类病害最需要紧急处理？',
  ]

  const activeKbRange = computed(() =>
    activeKbSelections.value.length ? activeKbSelections.value.map(k => k.label).join('、') : '',
  )

  function attachAlert(alert: AlertPoint) {
    attachedAlert.value = alert
  }
  function clearAttachedAlert() {
    attachedAlert.value = null
  }

  function toggleKb(entry: KbSelection) {
    const i = activeKbSelections.value.findIndex(k => k.id === entry.id)
    if (i >= 0) activeKbSelections.value.splice(i, 1)
    else activeKbSelections.value.push({ ...entry })
  }

  function addKb(entry: KbSelection) {
    if (!activeKbSelections.value.some(k => k.id === entry.id || k.label === entry.label)) {
      activeKbSelections.value.push({ ...entry })
    }
  }

  function removeKb(id: string) {
    activeKbSelections.value = activeKbSelections.value.filter(k => k.id !== id)
  }

  function clearKbs() {
    activeKbSelections.value = []
  }

  function setKbs(entries: KbSelection[]) {
    activeKbSelections.value = entries.map(e => ({ ...e }))
  }

  /** 兼容旧代码：单字符串 */
  function setKbRange(range: string) {
    if (!range) {
      clearKbs()
      return
    }
    setKbs([{ id: range, label: range }])
  }

  function isKbSelected(id: string | number) {
    return activeKbSelections.value.some(k => k.id === String(id))
  }

  async function refreshConversations() {
    try {
      conversations.value = await apiListConversations()
    } catch {
      /* */
    }
  }

  async function loadMessagesForKey(key: string) {
    try {
      const raw = (await apiGetMessages(key)) as Record<string, unknown>[]
      let maxId = 1
      const mapped = raw.map((m, idx) => {
        const idNum = Number(m.id) || 1000 + idx
        maxId = Math.max(maxId, idNum)
        return mapApiMessage(m, idNum)
      })
      nextId = maxId + 1
      messages.value = mapped.length ? mapped : welcomeMessages()
      if (!mapped.length) nextId = 2
    } catch {
      messages.value = welcomeMessages()
      nextId = 2
    }
  }

  async function selectConversation(key: string, fetchList = true) {
    activeConversationKey.value = key
    activeThreadShort.value = threadPartFromKey(key)
    if (fetchList) {
      await refreshConversations()
    }
    await loadMessagesForKey(key)
  }

  function startNewChat(refreshList = true) {
    activeConversationKey.value = null
    activeThreadShort.value = `user_session_${Date.now()}`
    messages.value = welcomeMessages()
    nextId = 2
    if (refreshList) void refreshConversations()
  }

  /** 仅从当前界面移除一条消息（服务端无单条删除接口时不同步后端） */
  function removeMessageById(id: number) {
    if (isLoading.value) {
      const loadingMsg = messages.value.find(m => m.loading)
      if (loadingMsg?.id === id) return
    }
    messages.value = messages.value.filter(m => m.id !== id)
    if (messages.value.length === 0) {
      messages.value = welcomeMessages()
      nextId = 2
    }
  }

  /** 删除当前会话：有服务端 key 时调 DELETE；否则仅清空本地新会话 */
  async function deleteActiveConversation() {
    if (isLoading.value) return
    if (activeConversationKey.value) {
      if (!confirm('确定删除该会话？服务器上该对话的全部消息将被删除。')) return
      const key = activeConversationKey.value
      await apiDeleteConversation(key)
      activeConversationKey.value = null
      await refreshConversations()
      if (conversations.value.length) await selectConversation(conversations.value[0].key, false)
      else startNewChat(false)
    } else {
      if (!confirm('当前为新会话（尚未同步到服务器）。确定清空界面上的所有消息？')) return
      startNewChat(false)
    }
  }

  async function initWorkspace() {
    workspaceReady.value = false
    try {
      await refreshConversations()
      if (!conversations.value.length) {
        startNewChat(false)
      } else {
        const cur = activeConversationKey.value
        const ok = cur && conversations.value.some(c => c.key === cur)
        if (ok) await loadMessagesForKey(cur!)
        else await selectConversation(conversations.value[0].key, false)
      }
    } catch {
      startNewChat(false)
    } finally {
      workspaceReady.value = true
    }
  }

  function buildStreamPayload(userText: string, messageIdForRetry: string | null) {
    const kbLabels = activeKbSelections.value.map(k => k.label)
    const body: Record<string, unknown> = {
      message: userText,
      thread_id: activeThreadShort.value,
      message_id: messageIdForRetry,
      stream_report_tokens: true,
    }
    if (kbLabels.length) {
      body.kb_ranges = kbLabels
      body.knowledge_base_ids = kbLabels
    }
    return body
  }

  async function syncConversationKeyAfterSend() {
    await refreshConversations()
    const t = activeThreadShort.value
    const hit = conversations.value.find(c => threadPartFromKey(c.key) === t)
    if (hit) activeConversationKey.value = hit.key
  }

  async function sendMessage(content: string) {
    if (!content.trim() || isLoading.value) return

    const ctx = attachedAlert.value
    attachedAlert.value = null

    messages.value.push({
      id: nextId++,
      role: 'user',
      content: content.trim(),
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      alertContext: ctx ?? undefined,
    })

    let aiContent = content.trim()
    if (ctx) {
      aiContent +=
        `\n\n【关联点位数据】\n` +
        `地址：${ctx.address}\n` +
        `病害类型：${ctx.type} | 危险等级：${sevLabel(ctx.severity)} | 处理状态：${statusLabel(ctx.status)}\n` +
        `所属区县：${ctx.district} | 上报时间：${ctx.time}\n` +
        `GPS坐标：${ctx.lat}, ${ctx.lng}` +
        (ctx.description ? `\n详细描述：${ctx.description}` : '')
    }

    const loadingId = nextId++
    messages.value.push({
      id: loadingId,
      role: 'assistant',
      content: '',
      deepthought: '',
      time: '',
      loading: true,
    })
    isLoading.value = true

    if (USE_MOCK) {
      try {
        const { reply, card } = mockReply(aiContent)
        await new Promise(r => setTimeout(r, 800 + Math.random() * 600))
        const idx = messages.value.findIndex(m => m.id === loadingId)
        if (idx !== -1) {
          messages.value[idx] = {
            id: loadingId,
            role: 'assistant',
            content: reply,
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            actionCard: card,
          }
        }
      } catch {
        const idx = messages.value.findIndex(m => m.id === loadingId)
        if (idx !== -1) {
          messages.value[idx] = {
            id: loadingId,
            role: 'assistant',
            content: '抱歉，连接出现问题，请稍后再试。',
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          }
        }
      } finally {
        isLoading.value = false
      }
      return
    }

    let acc = ''
    let dt = ''
    let lastMeta: { message_id: string; group_id: number } | null = null
    let sawDone = false

    function patchLoading(partial: Partial<ChatMessage>) {
      const idx = messages.value.findIndex(m => m.id === loadingId)
      if (idx === -1) return
      const prev = messages.value[idx]
      messages.value.splice(idx, 1, { ...prev, ...partial })
    }

    try {
      await streamChatTokens(buildStreamPayload(aiContent, null), ev => {
        if (ev.kind === 'meta') {
          lastMeta = { message_id: ev.message_id, group_id: ev.group_id }
          // 仍保持 loading，直到首段 token/deepthought，否则界面一直停在点阵动画
          patchLoading({ messageId: ev.message_id, groupId: ev.group_id })
        } else if (ev.kind === 'token') {
          acc += ev.content
          patchLoading({ content: acc, deepthought: dt, loading: false })
        } else if (ev.kind === 'deepthought') {
          dt += ev.content
          patchLoading({ content: acc, deepthought: dt, loading: false })
        } else if (ev.kind === 'title') {
          /* 可选：更新会话标题 */
        } else if (ev.kind === 'error') {
          sawDone = true
          acc += (acc ? '\n\n' : '') + `[错误] ${ev.message}`
          patchLoading({
            content: acc,
            loading: false,
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            messageId: ev.message_id ?? lastMeta?.message_id,
            groupId: ev.group_id ?? lastMeta?.group_id,
            status: 'error',
          })
        } else if (ev.kind === 'done') {
          sawDone = true
          patchLoading({
            content: acc,
            deepthought: dt,
            loading: false,
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            messageId: ev.message_id ?? lastMeta?.message_id,
            groupId: ev.group_id ?? lastMeta?.group_id,
            status: 'success',
          })
        }
      })

      if (!sawDone) {
        const idx = messages.value.findIndex(m => m.id === loadingId)
        if (idx !== -1 && messages.value[idx].loading) {
          patchLoading({
            content: acc || '（流已结束）',
            deepthought: dt,
            loading: false,
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            messageId: lastMeta?.message_id,
            groupId: lastMeta?.group_id,
            status: 'success',
          })
        }
      }

      await syncConversationKeyAfterSend()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '请求失败'
      const idx = messages.value.findIndex(m => m.id === loadingId)
      if (idx !== -1) {
        messages.value[idx] = {
          ...messages.value[idx],
          content: messages.value[idx].content || `抱歉：${msg}`,
          loading: false,
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        }
      }
    } finally {
      isLoading.value = false
      const idx = messages.value.findIndex(m => m.id === loadingId)
      if (idx !== -1 && messages.value[idx].loading) {
        const m = messages.value[idx]
        messages.value[idx] = {
          ...m,
          loading: false,
          content: m.content || '（无回复）',
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        }
      }
    }
  }

  function mockReply(input: string): { reply: string; card?: ActionCard } {
    if (input.includes('报告') || input.includes('生成') || input.includes('建议')) {
      return {
        reply:
          '好的，我已为您生成 **2024年度道路巡检报告**。\n\n报告涵盖全市 47 条主干道路，共记录病害 247 处，本年度整改完成率 **82.3%**。',
        card: { type: 'report', title: '2024年度巡检报告', subtitle: '47条路段 · 247处病害 · 68页' },
      }
    }
    if (input.includes('履约') || input.includes('服务单位') || input.includes('红黑榜')) {
      return {
        reply:
          '已为您生成服务单位 **履约画像分析**。\n\n本期参评单位 8 家，综合评分最高为**杭州市政养护有限公司**（92分），最低为**某路面工程公司**（54分）。',
        card: { type: 'compliance', title: '服务单位履约画像', subtitle: '8家单位 · 2024年度' },
      }
    }
    if (input.includes('工单') || input.includes('病害处理') || input.includes('任务')) {
      return {
        reply: '当前共有 **23张**活跃工单，其中待处理 8 张、处理中 10 张、待验收 5 张。',
        card: { type: 'workorder', title: '病害工单看板', subtitle: '23张活跃工单' },
      }
    }
    if (input.includes('计划') || input.includes('巡检安排') || input.includes('月度')) {
      return {
        reply:
          '已为您生成 **2024年Q2巡检计划**，涵盖 12 条重点路段，计划巡检频次 2次/月，关键节点已标注在日历中。',
        card: { type: 'plan', title: '2024年Q2巡检计划', subtitle: '12条路段 · 已生成日历视图' },
      }
    }
    if (input.includes('风险') || input.includes('预测') || input.includes('塌陷')) {
      return {
        reply:
          '根据近5年历史数据分析，未来3个月内 **解放路段** 塌陷风险等级为🔴高危，建议提前安排专项巡检。',
        card: { type: 'risk', title: '路段风险预测报告', subtitle: '3条高危路段 · 未来3个月' },
      }
    }
    if (input.includes('高优先级') || input.includes('紧急')) {
      return {
        reply:
          '当前共有 **5处高优先级告警**：\n\n1. 🔴 上城区·延安路与庆春路交叉口 — 纵向裂缝12m\n2. 🔴 上城区·解放路67号 — 深坑槽（9cm），影响行车安全\n3. 🔴 西湖区·文一西路与紫金港路 — 多处连片坑槽\n4. 🔴 上城区·南山路近雷峰塔路口 — 大面积沉陷，疑似管道隐患\n\n建议优先安排抢修队伍处理以上路段，预计需要 **2个工作组·48小时** 完成修复。',
      }
    }
    if (input.includes('西湖区') || input.includes('上城区') || input.includes('滨江区')) {
      const district = input.includes('西湖区') ? '西湖区' : input.includes('上城区') ? '上城区' : '滨江区'
      return {
        reply: `**${district}道路病害概况**：\n\n- 当前告警：3处（其中高危1~2处）\n- 主要病害：裂缝、坑槽为主\n- 处理状态：部分处理中\n\n⚠️ 近期梅雨季节来临，建议提前对低洼路段加强巡检，防止积水加速病害扩展。`,
      }
    }
    return {
      reply:
        '收到您的问题：「' +
        input.substring(0, 40) +
        (input.length > 40 ? '...' : '') +
        '」\n\n我正在分析杭州市实时道路数据，请稍等片刻。如需更精确的分析，您可以：\n- 点击地图上的告警标点查看详情\n- 使用左侧面板筛选特定区域\n- 上传道路检测报告进行 AI 解析',
    }
  }

  function clearMessages() {
    messages.value = welcomeMessages()
    nextId = 2
  }

  async function submitLike(msg: ChatMessage, like: boolean, authUserId: string) {
    if (!msg.messageId || msg.groupId == null) return
    const thread = activeConversationKey.value ? threadPartFromKey(activeConversationKey.value) : activeThreadShort.value
    await apiMessageLike({
      user_id: authUserId,
      thread_id: thread,
      message_id: msg.messageId,
      group_id: msg.groupId,
      like_bool: like,
    })
    msg.likeBool = like
    if (like) msg.dislikeBool = false
  }

  async function submitDislike(msg: ChatMessage, dislike: boolean, authUserId: string) {
    if (!msg.messageId || msg.groupId == null) return
    const thread = activeConversationKey.value ? threadPartFromKey(activeConversationKey.value) : activeThreadShort.value
    await apiMessageDislike({
      user_id: authUserId,
      thread_id: thread,
      message_id: msg.messageId,
      group_id: msg.groupId,
      dislike_bool: dislike,
    })
    msg.dislikeBool = dislike
    if (dislike) msg.likeBool = false
  }

  return {
    messages,
    isLoading,
    quickQuestions,
    attachedAlert,
    attachAlert,
    clearAttachedAlert,
    activeKbSelections,
    activeKbRange,
    toggleKb,
    addKb,
    removeKb,
    clearKbs,
    setKbs,
    setKbRange,
    isKbSelected,
    conversations,
    activeConversationKey,
    activeThreadShort,
    workspaceReady,
    initWorkspace,
    selectConversation,
    startNewChat,
    refreshConversations,
    sendMessage,
    clearMessages,
    removeMessageById,
    deleteActiveConversation,
    submitLike,
    submitDislike,
  }
})
