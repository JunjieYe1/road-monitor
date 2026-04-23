/**
 * 纵向溢出与悬停滚动逻辑；设计说明与 .u-scrollbar-hidden 见 src/styles/global.css
 */
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
  type Ref,
} from 'vue'

const EPS = 1

export interface UseAdaptiveVerticalScrollOptions {
  /** 鼠标离开后有溢出时，延迟关闭滚动模式（毫秒），与左栏一致 */
  leaveDelayMs?: number
}

export function useAdaptiveVerticalScroll(
  targetRef: Ref<HTMLElement | null>,
  options: UseAdaptiveVerticalScrollOptions = {}
) {
  const leaveDelayMs = options.leaveDelayMs ?? 5000
  const hasOverflow = ref(false)
  const isHovering = ref(false)
  let leaveTimer: ReturnType<typeof setTimeout> | null = null
  let ro: ResizeObserver | null = null

  function clearLeaveTimer() {
    if (leaveTimer) {
      clearTimeout(leaveTimer)
      leaveTimer = null
    }
  }

  function measure() {
    const el = targetRef.value
    if (!el) {
      hasOverflow.value = false
      return
    }
    const { clientHeight, scrollHeight } = el
    hasOverflow.value = scrollHeight > clientHeight + EPS
  }

  async function remeasure() {
    await nextTick()
    requestAnimationFrame(() => measure())
  }

  const overflowY = computed<'visible' | 'auto'>(() => {
    if (!hasOverflow.value) return 'visible'
    return isHovering.value ? 'auto' : 'visible'
  })

  /** 与 overflowY 成对：若 y 为 visible 时 x 用 hidden，规范会把 y 算成 auto，外溢会失效 */
  const overflowX = computed<'visible' | 'hidden'>(() =>
    overflowY.value === 'auto' ? 'hidden' : 'visible'
  )

  function onEnter() {
    clearLeaveTimer()
    isHovering.value = true
  }

  function onLeave() {
    clearLeaveTimer()
    if (!hasOverflow.value || leaveDelayMs <= 0) {
      isHovering.value = false
      return
    }
    leaveTimer = setTimeout(() => {
      isHovering.value = false
      leaveTimer = null
    }, leaveDelayMs)
  }

  watch(hasOverflow, (v) => {
    if (!v) {
      clearLeaveTimer()
      isHovering.value = false
    }
  })

  watch(
    targetRef,
    (el, _prev, onCleanup) => {
      ro?.disconnect()
      ro = null
      if (!el) {
        hasOverflow.value = false
        return
      }
      ro = new ResizeObserver(() => measure())
      ro.observe(el)
      void remeasure()
      onCleanup(() => {
        ro?.disconnect()
        ro = null
      })
    },
    { immediate: true }
  )

  function onWindowResize() {
    void remeasure()
  }

  onMounted(() => {
    window.addEventListener('resize', onWindowResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', onWindowResize)
    clearLeaveTimer()
    ro?.disconnect()
    ro = null
  })

  return {
    hasOverflow,
    isHovering,
    overflowY,
    overflowX,
    onEnter,
    onLeave,
    measure,
    remeasure,
  }
}
