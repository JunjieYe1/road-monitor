import {
  watch,
  onBeforeUnmount,
  shallowRef,
  nextTick,
  toRaw,
  type Ref,
} from 'vue'
import h337 from 'heatmap.js'
import type { HeatmapJsInstance } from 'heatmap.js'
import { lngLatToContainerPx } from '../utils/tiandituLngLat'

export type HeatRiskPoint = {
  lng: number
  lat: number
  severity: string
}

function severityValue(s: string): number {
  if (s === 'high') return 3
  if (s === 'medium') return 2
  return 1
}

function severityRadius(s: string): number {
  if (s === 'high') return 52
  if (s === 'medium') return 40
  return 28
}

const RISK_GRADIENT: Record<string, string> = {
  '0': 'rgba(92,173,138,0.25)',
  '0.35': 'rgba(160,200,112,0.55)',
  '0.62': 'rgba(224,180,96,0.78)',
  '0.86': 'rgba(224,100,76,0.9)',
  '1': 'rgba(200,48,48,0.95)',
}

function pickReadyOverlayPane(raw: any, root: HTMLElement): HTMLElement | null {
  const op =
    (raw?.aw?.overlayPane ??
      raw?.overlayPane ??
      root.querySelector?.('.tdt-overlay-pane')) as unknown
  if (!(op instanceof HTMLElement) || op.clientHeight < 4) return null
  return op
}

/** heatmap.js 叠在 Tianditu；瓦片就绪后再挂入 overlay-pane，避免被压住。 */
export function useTiandituHeatmap(
  mapRef: Ref<any>,
  markers: Ref<HeatRiskPoint[]>,
  activeRef: Ref<boolean>,
) {
  const instance = shallowRef<HeatmapJsInstance | null>(null)
  let overlayEl: HTMLElement | null = null
  let heatMountParent: HTMLElement | null = null
  let mapRootEl: HTMLElement | null = null
  let unbindRedraw: (() => void) | null = null
  let resizeObserver: ResizeObserver | null = null
  let reparentTimeouts: ReturnType<typeof setTimeout>[] = []

  function clearReparentTimers() {
    for (const t of reparentTimeouts) clearTimeout(t)
    reparentTimeouts = []
  }

  function teardown() {
    clearReparentTimers()
    unbindRedraw?.()
    unbindRedraw = null
    resizeObserver?.disconnect()
    resizeObserver = null
    instance.value = null
    if (overlayEl?.parentElement) overlayEl.remove()
    overlayEl = null
    heatMountParent = null
    mapRootEl = null
  }

  function rootPxToHeatmapLocal(px: { x: number; y: number }) {
    const root = mapRootEl
    const host = heatMountParent
    if (!root || !host || host === root) return px
    const rr = root.getBoundingClientRect()
    const hr = host.getBoundingClientRect()
    return {
      x: px.x - (hr.left - rr.left),
      y: px.y - (hr.top - rr.top),
    }
  }

  function fillData(inst: HeatmapJsInstance, map: any, pts: HeatRiskPoint[]) {
    const oe = overlayEl
    if (!oe) return
    const w = oe.clientWidth
    const h = oe.clientHeight
    if (w < 4 || h < 4) return

    const mapRaw = toRaw(map)
    const data: Array<{ x: number; y: number; value: number; radius: number }> = []
    for (const m of pts) {
      const p0 = lngLatToContainerPx(mapRaw, m.lng, m.lat)
      if (!p0) continue
      const p = rootPxToHeatmapLocal(p0)
      data.push({
        x: Math.round(p.x),
        y: Math.round(p.y),
        value: severityValue(m.severity),
        radius: severityRadius(m.severity),
      })
    }

    inst.configure({ width: w, height: h })
    inst.setData({ max: 3, min: 0, data })
    inst.repaint()
  }

  function redraw() {
    const map = mapRef.value
    const inst = instance.value
    if (!map || !inst || !activeRef.value) return
    const mapFixed = toRaw(map)
    requestAnimationFrame(() => fillData(inst, mapFixed, markers.value))
  }

  function attach() {
    const map = mapRef.value
    if (!map) return

    const raw = toRaw(map) as any
    const root =
      typeof raw?.getContainer === 'function'
        ? (raw.getContainer() as HTMLElement)
        : null
    if (!root) return

    mapRootEl = root

    const candidate = pickReadyOverlayPane(raw, root)
    const parentEl = candidate ?? root
    heatMountParent = parentEl

    if (window.getComputedStyle(parentEl).position === 'static')
      parentEl.style.position = 'relative'

    overlayEl = document.createElement('div')
    overlayEl.className = 'tdt-risk-heatmap'
    overlayEl.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;min-width:40px;min-height:40px;' +
      'pointer-events:none;z-index:99999;overflow:hidden;isolation:isolate'
    parentEl.appendChild(overlayEl)

    const tryReparentToOverlayPane = () => {
      if (!overlayEl) return
      const op = pickReadyOverlayPane(raw, root)
      if (!op) return
      if (overlayEl.parentElement === op) return
      if (getComputedStyle(op).position === 'static') op.style.position = 'relative'
      op.appendChild(overlayEl)
      heatMountParent = op
      redraw()
    }

    const W = overlayEl.clientWidth || parentEl.clientWidth
    const H = overlayEl.clientHeight || parentEl.clientHeight

    instance.value = h337.create({
      container: overlayEl,
      width: W,
      height: H,
      maxOpacity: 0.85,
      minOpacity: 0.12,
      blur: 0.82,
      radius: 40,
      gradient: RISK_GRADIENT,
    })

    const mapHandlers: { ev: string; fn: () => void }[] = []
    ;['moveend', 'zoomend', 'resize'].forEach(ev => {
      const fn = () => redraw()
      mapHandlers.push({ ev, fn })
      map.addEventListener?.(ev, fn)
    })

    const onMapLoad = () => {
      tryReparentToOverlayPane()
      redraw()
    }
    map.addEventListener?.('load', onMapLoad)
    mapHandlers.push({ ev: 'load', fn: onMapLoad })

    resizeObserver = new ResizeObserver(() => redraw())
    resizeObserver.observe(root)
    resizeObserver.observe(overlayEl)

    unbindRedraw = () => {
      mapHandlers.forEach(({ ev, fn }) => map.removeEventListener?.(ev, fn))
      resizeObserver?.disconnect()
      resizeObserver = null
    }

    function scheduleReparent() {
      clearReparentTimers()
      for (const ms of [60, 200, 600, 1400])
        reparentTimeouts.push(setTimeout(() => tryReparentToOverlayPane(), ms))
    }

    function syncAfterLayout() {
      redraw()
      requestAnimationFrame(() => redraw())
      setTimeout(redraw, 50)
      setTimeout(redraw, 320)
    }

    redraw()
    scheduleReparent()
    nextTick(syncAfterLayout)
  }

  watch(
    () => {
      const a = activeRef.value
      const m = mapRef.value
      return a && m ? m : null
    },
    map => {
      teardown()
      if (!map) return
      nextTick(attach)
    },
    { flush: 'post' },
  )

  watch(
    markers,
    () => {
      if (!activeRef.value || !instance.value || !mapRef.value) return
      redraw()
    },
    { deep: true },
  )

  onBeforeUnmount(teardown)

  return { redraw }
}
