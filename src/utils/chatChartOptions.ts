/** ECharts 配置：由对话区 <custom-chart> 解析结果驱动（供 RightChat 注水使用） */

export type ChatChartType = 'line' | 'pie' | 'bar'

export interface ChatChartPayload {
  type: ChatChartType
  axisXTitle: string
  axisYTitle: string
  series: { name: string; value: number }[]
}

const palette = [
  '#4A8DB7',
  '#2D5A7B',
  '#B8923F',
  '#5A8FD0',
  '#6B9E7A',
  '#C97B7B',
  '#8B7BB8',
]

export function buildChatChartEchartsOption(p: ChatChartPayload) {
  const data = (p.series || []).filter(
    (d) => d && typeof d.name === 'string' && Number.isFinite(d.value),
  )
  const names = data.map((d) => d.name)
  const values = data.map((d) => d.value)

  if (p.type === 'pie') {
    return {
      color: palette,
      tooltip: { trigger: 'item' as const },
      legend: {
        bottom: 0,
        type: 'scroll' as const,
        textStyle: { fontSize: 11 },
      },
      series: [
        {
          type: 'pie' as const,
          radius: ['36%', '68%'],
          center: ['50%', '46%'],
          data: data.map((d) => ({ name: d.name, value: d.value })),
          label: { fontSize: 11 },
        },
      ],
    }
  }

  const isBar = p.type === 'bar'
  return {
    color: palette,
    tooltip: { trigger: 'axis' as const },
    grid: {
      left: '12%',
      right: '6%',
      bottom: isBar && names.length > 6 ? '22%' : '14%',
      top: '14%',
    },
    xAxis: {
      type: 'category' as const,
      data: names,
      name: p.axisXTitle || '',
      nameTextStyle: { fontSize: 11 },
      axisLabel: {
        fontSize: 10,
        rotate: names.length > 8 ? 28 : 0,
        interval: 0,
      },
    },
    yAxis: {
      type: 'value' as const,
      name: p.axisYTitle || '',
      nameTextStyle: { fontSize: 11 },
      axisLabel: { fontSize: 10 },
      splitLine: { lineStyle: { opacity: 0.35 } },
    },
    series: [
      {
        type: isBar ? ('bar' as const) : ('line' as const),
        data: values,
        smooth: !isBar,
        showSymbol: !isBar,
        barMaxWidth: 42,
      },
    ],
  }
}
