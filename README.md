# 智能体赋能城市道路病害监测平台

基于 **Vue 3 + Vite 6** 的可维护前端，新拟态风格 + 原神 UI 配色。

## 快速启动

```bash
cd road-monitor
npm install
npm run dev      # 开发服务器 http://localhost:5173
npm run build    # 构建生产包
```

## 技术栈

| 技术 | 用途 |
|------|------|
| Vue 3 | 响应式组件框架 |
| Vite 6 | 极速开发服务器 |
| ECharts 5 | 饼图 / 柱状图 |
| Leaflet 1.9 | 真实地图 + 自定义标点 |
| Pinia 2 | 状态管理（告警数据 / 对话记录） |

## 项目结构

```
src/
├── styles/global.css          # 新拟态 + 原神设计系统（CSS 变量）
├── stores/
│   ├── alertStore.ts          # 告警数据（替换 mockAlerts 即可对接真实 API）
│   └── chatStore.ts           # 对话记录（替换 mockReply 即可对接大模型 API）
├── components/
│   ├── LeftPanel/             # 数据统计：StatCard / PieChart / BarChart
│   ├── CenterMap/             # Leaflet 地图 + 标点 + 告警详情弹窗
│   └── RightChat/             # AI 对话窗口 + 虚拟形象 + 快捷提问
└── App.vue                    # 三栏主布局
```

## 接入真实 AI 接口

在 `src/stores/chatStore.ts` 的 `sendMessage` 方法中，将注释取消并填入：

```typescript
// 扣子 Bot API 示例
const res = await fetch('https://api.coze.cn/v3/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer YOUR_TOKEN`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    bot_id: 'YOUR_BOT_ID',
    user_id: 'user',
    stream: false,
    additional_messages: [{ role: 'user', content, content_type: 'text' }],
  }),
})
```

## 接入真实告警数据

在 `src/stores/alertStore.ts` 中取消 `fetchAlerts` 函数注释：

```typescript
async function fetchAlerts() {
  const res = await fetch('/api/alerts')
  alerts.value = await res.json()
}
```

## 地图底图

当前使用**天地图**（矢量底图 + 中文注记双图层），中心为杭州市。

Key 配置位于 `CenterMap/index.vue` 顶部：

```typescript
const TDT_KEY = 'b73f6c284d1d88bd50c076ce7009270d'
```

若需切换为影像图，将 `vec_w` / `cva_w` 替换为 `img_w` / `cia_w`：

```typescript
// 影像底图
`https://t{s}.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TDT_KEY}`
// 影像注记
`https://t{s}.tianditu.gov.cn/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=${TDT_KEY}`
```
