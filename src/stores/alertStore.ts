import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface AlertPoint {
  id: number
  lat: number
  lng: number
  type: '裂缝' | '坑槽' | '沉陷' | '车辙' | '其他'
  severity: 'high' | 'medium' | 'low'
  district: string
  address: string
  time: string
  status: 'pending' | 'processing' | 'completed'
  description?: string
}

export const useAlertStore = defineStore('alert', () => {
  /* ── 模拟告警数据（替换为真实 API 后只需修改 fetchAlerts） ── */
  const alerts = ref<AlertPoint[]>([
    { id: 1,  lat: 30.287, lng: 120.153, type: '裂缝', severity: 'high',   district: '上城区', address: '延安路与庆春路交叉口', time: '08:32', status: 'pending',    description: '路面纵向裂缝，长约12m，宽3cm，位于主车道' },
    { id: 2,  lat: 30.274, lng: 120.147, type: '坑槽', severity: 'high',   district: '上城区', address: '解放路67号附近', time: '09:15', status: 'processing', description: '深度约9cm坑槽，面积0.6㎡，危及行车安全' },
    { id: 3,  lat: 30.258, lng: 120.175, type: '沉陷', severity: 'medium', district: '滨江区', address: '滨江大道中段', time: '10:02', status: 'pending',    description: '路面局部沉陷，深度约4cm，范围约3㎡' },
    { id: 4,  lat: 30.295, lng: 120.130, type: '车辙', severity: 'medium', district: '西湖区', address: '天目山路西段', time: '10:45', status: 'completed',  description: '双向车辙，深度约2.5cm，路段长40m' },
    { id: 5,  lat: 30.265, lng: 120.190, type: '裂缝', severity: 'low',    district: '滨江区', address: '网商路与江陵路交叉口', time: '11:20', status: 'pending',    description: '路面横向裂缝，轻微，不影响行车' },
    { id: 6,  lat: 30.310, lng: 120.108, type: '坑槽', severity: 'high',   district: '西湖区', address: '文一西路与紫金港路', time: '12:05', status: 'pending',    description: '多处连片坑槽，影响行车安全' },
    { id: 7,  lat: 30.301, lng: 120.160, type: '裂缝', severity: 'medium', district: '拱墅区', address: '湖墅南路北段', time: '13:10', status: 'processing', description: '网状裂缝，面积约2.5㎡，需尽快处理' },
    { id: 8,  lat: 30.278, lng: 120.205, type: '其他', severity: 'low',    district: '江干区', address: '九和路近艮山东路', time: '14:00', status: 'completed',  description: '路面标线磨损严重，影响行车指引' },
    { id: 9,  lat: 30.248, lng: 120.163, type: '沉陷', severity: 'high',   district: '上城区', address: '南山路近雷峰塔路口', time: '14:35', status: 'pending',    description: '大面积沉陷约6㎡，下方管道存在隐患' },
    { id: 10, lat: 30.320, lng: 120.145, type: '裂缝', severity: 'medium', district: '拱墅区', address: '丰潭路中段', time: '15:20', status: 'processing', description: '纵横裂缝交织，雨水渗入路基' },
    { id: 11, lat: 30.240, lng: 120.140, type: '坑槽', severity: 'low',    district: '上城区', address: '玉皇山路近八卦路', time: '15:55', status: 'completed',  description: '小型坑槽已临时修复，待验收' },
    { id: 12, lat: 30.270, lng: 120.220, type: '车辙', severity: 'medium', district: '江干区', address: '秋涛路物流通道', time: '16:30', status: 'pending',    description: '重载车辙，深约3cm，路段长60m' },
  ])

  const selectedAlert = ref<AlertPoint | null>(null)

  /* ── 计算属性 ── */
  const totalCount = computed(() => alerts.value.length)

  const typeDistribution = computed(() => {
    const map: Record<string, number> = {}
    alerts.value.forEach(a => { map[a.type] = (map[a.type] || 0) + 1 })
    return [
      { name: '裂缝', value: map['裂缝'] || 0, color: '#E07070' },
      { name: '坑槽', value: map['坑槽'] || 0, color: '#E0A050' },
      { name: '沉陷', value: map['沉陷'] || 0, color: '#2D5A7B' },
      { name: '车辙', value: map['车辙'] || 0, color: '#5A8FD0' },
      { name: '其他', value: map['其他'] || 0, color: '#5CAD8A' },
    ]
  })

  const districtTop5 = computed(() => {
    const map: Record<string, number> = {}
    alerts.value.forEach(a => { map[a.district] = (map[a.district] || 0) + 1 })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))
  })

  const statusSummary = computed(() => ({
    pending:    alerts.value.filter(a => a.status === 'pending').length,
    processing: alerts.value.filter(a => a.status === 'processing').length,
    completed:  alerts.value.filter(a => a.status === 'completed').length,
  }))

  const severitySummary = computed(() => ({
    high:   alerts.value.filter(a => a.severity === 'high').length,
    medium: alerts.value.filter(a => a.severity === 'medium').length,
    low:    alerts.value.filter(a => a.severity === 'low').length,
  }))

  /* ── Actions ── */
  function selectAlert(alert: AlertPoint | null) {
    selectedAlert.value = alert
  }

  // 未来替换成真实接口：
  // async function fetchAlerts() {
  //   const res = await fetch('/api/alerts')
  //   alerts.value = await res.json()
  // }

  return {
    alerts,
    selectedAlert,
    totalCount,
    typeDistribution,
    districtTop5,
    statusSummary,
    severitySummary,
    selectAlert,
  }
})
