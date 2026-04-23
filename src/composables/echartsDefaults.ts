/**
 * 与 useEcharts 搭配使用的 ECharts 通用项（避免各图表重复写 tooltip/背景等）。
 */
export const echartsTransparentBackground = { backgroundColor: 'transparent' as const }

export function echartsTooltipTheme() {
  return {
    backgroundColor: 'rgba(26,58,82,0.92)',
    borderColor: 'rgba(212,168,83,0.4)',
    textStyle: { color: '#fff', fontSize: 12 },
  }
}
