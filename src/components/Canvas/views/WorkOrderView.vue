<template>
  <div class="workorder-view">
    <ViewToolbar class="wo-toolbar">
      <span class="wo-title">病害工单看板</span>
      <div class="wo-stats">
        <span v-for="s in statusSummary" :key="s.key" class="wo-stat">
          <span class="wo-stat-dot" :style="{ background: s.color }"></span>
          {{ s.label }} {{ s.count }}
        </span>
      </div>
      <div class="wo-actions">
        <button class="wo-search-btn">🔍 搜索工单</button>
        <button class="wo-new-btn">＋ 新建工单</button>
      </div>
    </ViewToolbar>

    <!-- Kanban 看板 -->
    <div class="kanban-wrap u-scrollbar-hidden">
      <div v-for="col in columns" :key="col.key" class="kanban-col">
        <div class="col-header" :style="{ borderTopColor: col.color }">
          <span class="col-icon">{{ col.icon }}</span>
          <span class="col-title">{{ col.label }}</span>
          <span
            class="col-count"
            :style="{ background: col.color + '22', color: col.color }"
            >{{ col.cards.length }}</span
          >
        </div>
        <AdaptiveScrollY class="col-body">
          <div
            v-for="card in col.cards"
            :key="card.id"
            class="wo-card neu-card-sm"
            :class="{ selected: selCard?.id === card.id }"
            @click="openCard(card)"
          >
            <div class="card-top">
              <SeverityBadge :level="card.severity" size="sm" />
              <span class="card-type">{{ card.type }}</span>
              <span class="card-id">#{{ card.id }}</span>
            </div>
            <div class="card-road">{{ card.road }}</div>
            <div class="card-unit">{{ card.unit }}</div>
            <div class="card-bottom">
              <span class="card-date">{{ card.date }}</span>
              <button class="card-detail-btn" @click.stop="openCard(card)">
                详情
              </button>
            </div>
          </div>
        </AdaptiveScrollY>
      </div>
    </div>

    <!-- 侧边详情抽屉 -->
    <transition name="drawer-slide">
      <div
        v-if="selCard"
        ref="detailDrawerRef"
        class="detail-drawer neu-card u-scrollbar-hidden"
        :style="{ overflowY: drawerOverflowY, overflowX: drawerOverflowX }"
        @mouseenter="drawerScroll.onEnter"
        @mouseleave="drawerScroll.onLeave"
      >
        <div class="drawer-header">
          <div class="drawer-title">工单详情</div>
          <button class="drawer-close" @click="selCard = null">✕</button>
        </div>
        <div class="drawer-body">
          <div class="d-row">
            <span class="d-label">工单编号</span
            ><span class="d-val"
              >#{{ selCard.id }} · WO-2024-{{
                String(selCard.id).padStart(4, "0")
              }}</span
            >
          </div>
          <div class="d-row">
            <span class="d-label">病害类型</span
            ><span class="d-val">{{ selCard.type }}</span>
          </div>
          <div class="d-row d-row-sev">
            <span class="d-label">危险等级</span
            ><SeverityBadge :level="selCard.severity" size="md" />
          </div>
          <div class="d-row">
            <span class="d-label">所在路段</span
            ><span class="d-val">{{ selCard.road }}</span>
          </div>
          <div class="d-row">
            <span class="d-label">负责单位</span
            ><span class="d-val">{{ selCard.unit }}</span>
          </div>
          <div class="d-row">
            <span class="d-label">创建时间</span
            ><span class="d-val">{{ selCard.date }}</span>
          </div>
          <div class="d-row">
            <span class="d-label">当前状态</span>
            <span class="d-status" :class="selCard.status">{{
              statusLabel(selCard.status)
            }}</span>
          </div>
          <div class="d-desc">{{ selCard.desc }}</div>
          <div class="drawer-btns">
            <button class="d-btn chat-btn" @click="addCardToChat(selCard)">
              💬
              {{
                chatStore.attachedWorkorder?.id === selCard.id
                  ? "已加入对话"
                  : "加入对话询问"
              }}
            </button>
            <button class="d-btn flow-btn" @click="goFlow(selCard.alertId)">
              → 查看处理流程
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useAdaptiveVerticalScroll } from "../../../composables/useAdaptiveVerticalScroll";
import AdaptiveScrollY from "../../common/AdaptiveScrollY.vue";
import { useRouter } from "vue-router";
import { useChatStore, type WorkorderContext } from "../../../stores/chatStore";
import { statusLabel, STATUS_COLORS } from "../../../utils/labels";
import SeverityBadge from "../../common/SeverityBadge.vue";
import ViewToolbar from "../../common/ViewToolbar.vue";

const router = useRouter();
const chatStore = useChatStore();

// TODO: API - GET /api/workorders
const baseCards = [
  {
    id: 1,
    alertId: 1,
    status: "pending",
    type: "裂缝",
    severity: "high",
    road: "延安路与庆春路交叉口",
    unit: "上城区建设工程总公司",
    date: "2024-03-15",
    desc: "路面纵向裂缝，长约12m，宽3cm，位于主车道，需立即处理。",
  },
  {
    id: 2,
    alertId: 2,
    status: "processing",
    type: "坑槽",
    severity: "high",
    road: "解放路67号附近",
    unit: "杭州市政养护有限公司",
    date: "2024-03-16",
    desc: "深度约9cm坑槽，面积0.6㎡，危及行车安全，正在施工中。",
  },
  {
    id: 3,
    alertId: 9,
    status: "pending",
    type: "沉陷",
    severity: "high",
    road: "南山路近雷峰塔路口",
    unit: "上城区建设工程总公司",
    date: "2024-03-17",
    desc: "大面积沉陷约6㎡，疑似下方管道存在隐患。",
  },
  {
    id: 4,
    alertId: 6,
    status: "pending",
    type: "坑槽",
    severity: "high",
    road: "文一西路与紫金港路",
    unit: "西湖区道路工程公司",
    date: "2024-03-18",
    desc: "多处连片坑槽，影响行车安全。",
  },
  {
    id: 5,
    alertId: 3,
    status: "processing",
    type: "沉陷",
    severity: "medium",
    road: "滨江大道中段",
    unit: "滨江区城市管理服务",
    date: "2024-03-10",
    desc: "路面局部沉陷，深度约4cm，范围约3㎡。",
  },
  {
    id: 6,
    alertId: 7,
    status: "processing",
    type: "裂缝",
    severity: "medium",
    road: "湖墅南路北段",
    unit: "拱墅区路面维护有限公司",
    date: "2024-03-12",
    desc: "网状裂缝，面积约2.5㎡，需尽快处理。",
  },
  {
    id: 7,
    alertId: 10,
    status: "processing",
    type: "裂缝",
    severity: "medium",
    road: "丰潭路中段",
    unit: "拱墅区路面维护有限公司",
    date: "2024-03-08",
    desc: "纵横裂缝交织，雨水渗入路基。",
  },
  {
    id: 8,
    alertId: 12,
    status: "review",
    type: "车辙",
    severity: "medium",
    road: "秋涛路物流通道",
    unit: "江干区路桥工程有限公司",
    date: "2024-02-28",
    desc: "重载车辙，深约3cm，路段长60m，已完成修复待复测。",
  },
  {
    id: 9,
    alertId: 5,
    status: "review",
    type: "裂缝",
    severity: "low",
    road: "网商路与江陵路交叉口",
    unit: "滨江区城市管理服务",
    date: "2024-02-25",
    desc: "路面横向裂缝，轻微，已修复待复测。",
  },
  {
    id: 10,
    alertId: 4,
    status: "done",
    type: "车辙",
    severity: "medium",
    road: "天目山路西段",
    unit: "西湖区道路工程公司",
    date: "2024-02-10",
    desc: "双向车辙，深度约2.5cm，路段长40m，已完成验收。",
  },
  {
    id: 11,
    alertId: 8,
    status: "done",
    type: "其他",
    severity: "low",
    road: "九和路近艮山东路",
    unit: "江干区路桥工程有限公司",
    date: "2024-02-05",
    desc: "路面标线磨损，已重新施划，验收合格。",
  },
  {
    id: 12,
    alertId: 11,
    status: "done",
    type: "坑槽",
    severity: "low",
    road: "玉皇山路近八卦路",
    unit: "上城区建设工程总公司",
    date: "2024-01-28",
    desc: "小型坑槽修复完成，验收合格归档。",
  },
];

const undergroundCards = [
  {
    id: 101,
    alertId: 101,
    status: "pending",
    type: "空洞",
    severity: "high",
    road: "钱江路（三新路 - 塘工局路）",
    unit: "中科云图科技有限公司",
    date: "2025-07-31",
    desc: "地下病害类型：空洞。道路等级：主干路；检测长度：1.689km；检测时间：2025年6月24日 - 2025年7月31日。建议立即复核空洞范围并设置临时警示。",
  },
  {
    id: 102,
    alertId: 102,
    status: "processing",
    type: "脱空",
    severity: "high",
    road: "运河东路（艮山西路 - 钱江路）",
    unit: "中科云图科技有限公司",
    date: "2025-07-31",
    desc: "地下病害类型：脱空。道路等级：主干路；检测长度：1.983km；检测时间：2025年6月24日 - 2025年7月31日。当前已安排复测并同步排查下伏管线。",
  },
  {
    id: 103,
    alertId: 103,
    status: "review",
    type: "疏松",
    severity: "medium",
    road: "环站东路（天城路 - 环站南路）",
    unit: "中科云图科技有限公司",
    date: "2025-07-31",
    desc: "地下病害类型：疏松。道路等级：主干路；检测长度：1.29km；检测时间：2025年6月24日 - 2025年7月31日。已完成加密检测，待专家复核。",
  },
  {
    id: 104,
    alertId: 104,
    status: "pending",
    type: "空洞",
    severity: "high",
    road: "临丁路（洋家港桥 - 学堂港桥以西）",
    unit: "中科云图科技有限公司",
    date: "2025-07-31",
    desc: "地下病害类型：空洞。道路等级：主干路；检测长度：4.702km；检测时间：2025年6月24日 - 2025年7月31日。检测区段较长，建议分段封控处置。",
  },
  {
    id: 105,
    alertId: 105,
    status: "done",
    type: "脱空",
    severity: "medium",
    road: "艮山西路（彭埠铁路桥 - 凯旋路）",
    unit: "浙江浙安数智环境工程有限公司",
    date: "2025-08-15",
    desc: "地下病害类型：脱空。道路等级：城市快速路；检测长度：2.96km；检测时间：2025年7-8月。已完成修复回填并通过阶段验收。",
  },
  {
    id: 106,
    alertId: 106,
    status: "processing",
    type: "疏松",
    severity: "medium",
    road: "德胜东路（沪杭收费站东 - 友爱路）",
    unit: "浙江浙安数智环境工程有限公司",
    date: "2025-08-16",
    desc: "地下病害类型：疏松。道路等级：主干路；检测长度：4.635km；检测时间：2025年7-8月。备注：部分路段地表有修补、轻微沉降，已进入二次评估。",
  },
  {
    id: 107,
    alertId: 107,
    status: "pending",
    type: "空洞",
    severity: "high",
    road: "新塘路（新业路 - 运河南）",
    unit: "中煤地下空间科技发展有限公司",
    date: "2025-08-18",
    desc: "地下病害类型：空洞。道路等级：主干路；检测长度：3.482km；检测时间：2025年7-8月。备注：涉及地铁施工，建议联合轨道单位会商。",
  },
  {
    id: 108,
    alertId: 108,
    status: "review",
    type: "脱空",
    severity: "medium",
    road: "环丁路（丁兰路 - 丁兰路）",
    unit: "中煤地下空间科技发展有限公司",
    date: "2025-08-20",
    desc: "地下病害类型：脱空。道路等级：支路；检测长度：3.875km；检测时间：2025年7-8月。备注：涉及在建工地施工，已提交复核报告。",
  },
  {
    id: 109,
    alertId: 109,
    status: "done",
    type: "疏松",
    severity: "low",
    road: "湖滨路（庆春路 - 邮电路）",
    unit: "浙江浙安数智环境工程有限公司",
    date: "2025-08-12",
    desc: "地下病害类型：疏松。道路等级：主干路；检测长度：0.84km；检测时间：2025年7-8月。地表状态良好，已完成销项归档。",
  },
  {
    id: 110,
    alertId: 110,
    status: "processing",
    type: "空洞",
    severity: "high",
    road: "之江路（复兴路 - 钱江三桥）",
    unit: "中煤地下空间科技发展有限公司",
    date: "2025-08-21",
    desc: "地下病害类型：空洞。道路等级：主干路；检测长度：7.39km；检测时间：2025年7-8月。备注：深基坑施工影响，正在实施重点盯防。",
  },
  {
    id: 111,
    alertId: 111,
    status: "review",
    type: "疏松",
    severity: "low",
    road: "三里亭路（董家桥路 - 池塘庙路）",
    unit: "中煤地下空间科技发展有限公司",
    date: "2025-08-19",
    desc: "地下病害类型：疏松。道路等级：支路；检测长度：0.813km；检测时间：2025年7-8月。已完成补充取样，待现场会审。",
  },
  {
    id: 112,
    alertId: 112,
    status: "pending",
    type: "脱空",
    severity: "high",
    road: "复兴路（水澄路 - 之江路）",
    unit: "中煤地下空间科技发展有限公司",
    date: "2025-08-22",
    desc: "地下病害类型：脱空。道路等级：主干路；检测长度：0.597km；检测时间：2025年7-8月。备注：深基坑施工、在建工地施工，需优先处置。",
  },
];

const allCards = ref([...baseCards, ...undergroundCards]);

const columns = computed(() => [
  {
    key: "pending" as const,
    label: "待处理",
    icon: "🔴",
    color: STATUS_COLORS.pending,
    cards: allCards.value.filter((c) => c.status === "pending"),
  },
  {
    key: "processing" as const,
    label: "处理中",
    icon: "🔧",
    color: STATUS_COLORS.processing,
    cards: allCards.value.filter((c) => c.status === "processing"),
  },
  {
    key: "done" as const,
    label: "已完成",
    icon: "✅",
    color: STATUS_COLORS.done,
    cards: allCards.value.filter((c) => c.status === "done"),
  },
  {
    key: "review" as const,
    label: "待复测",
    icon: "🔍",
    color: STATUS_COLORS.review,
    cards: allCards.value.filter((c) => c.status === "review"),
  },
]);

const statusSummary = computed(() =>
  columns.value.map((c) => ({
    key: c.key,
    label: c.label,
    color: c.color,
    count: c.cards.length,
  })),
);

const selCard = ref<(typeof allCards.value)[0] | null>(null);

const detailDrawerRef = ref<HTMLElement | null>(null);
const drawerScroll = useAdaptiveVerticalScroll(detailDrawerRef);
const drawerOverflowY = drawerScroll.overflowY;
const drawerOverflowX = drawerScroll.overflowX;

watch(selCard, async () => {
  await nextTick();
  await drawerScroll.remeasure();
});

function openCard(card: (typeof allCards.value)[0]) {
  selCard.value = card;
}
function addCardToChat(card: (typeof allCards.value)[0]) {
  chatStore.attachWorkorder({
    id: card.id,
    type: card.type,
    severity: card.severity,
    status: card.status,
    road: card.road,
    unit: card.unit,
    date: card.date,
    desc: card.desc,
  } as WorkorderContext);
}
function goFlow(alertId: number) {
  router.push(`/defect/${alertId}`);
}
</script>

<style scoped>
.workorder-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}
.wo-title {
  font-family: "Noto Serif SC", serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
}
.wo-stats {
  display: flex;
  gap: 12px;
  flex: 1;
}
.wo-stat {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #5a6a7c;
}
.wo-stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.wo-actions {
  display: flex;
  gap: 6px;
}
.wo-search-btn,
.wo-new-btn {
  padding: 5px 12px;
  border-radius: 10px;
  border: 1px solid var(--neu-stroke-muted);
  cursor: pointer;
  font-size: 12px;
  font-family: "Noto Sans SC", sans-serif;
  transition: all 0.2s;
  box-shadow: var(--neu-extrude-sm);
  background: var(--bg-color);
  color: var(--genshin-blue);
}
.wo-new-btn {
  background: linear-gradient(
    135deg,
    var(--genshin-blue),
    var(--genshin-blue-light)
  );
  color: #fff;
  border-color: transparent;
}

.kanban-wrap {
  flex: 1;
  display: flex;
  gap: 10px;
  min-height: 0;
  overflow-x: auto;
}
.kanban-col {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.col-header {
  background: var(--bg-color);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 3px solid;
  box-shadow: var(--neu-extrude-md);
  flex-shrink: 0;
}
.col-icon {
  font-size: 14px;
}
.col-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--genshin-blue-dark);
}
.col-count {
  padding: 2px 7px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
}
:deep(.col-body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px;
  min-height: 0;
}

.wo-card {
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.wo-card.selected {
  box-shadow:
    var(--neu-extrude-lg),
    0 0 0 2px rgba(74, 141, 183, 0.3) !important;
}
.wo-card:hover {
  transform: translateY(-1px);
}
.card-top {
  display: flex;
  align-items: center;
  gap: 6px;
}
.card-type {
  font-size: 12px;
  font-weight: 500;
  color: var(--genshin-blue-dark);
  flex: 1;
}
.card-id {
  font-size: 10px;
  color: #b0bac8;
}
.card-road {
  font-size: 11px;
  color: #5a6a7c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-unit {
  font-size: 10px;
  color: #8a9aac;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-date {
  font-size: 10px;
  color: #b0bac8;
}
.card-detail-btn {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid rgba(74, 141, 183, 0.3);
  cursor: pointer;
  background: none;
  color: var(--genshin-blue);
  transition: all 0.15s;
}
.card-detail-btn:hover {
  background: rgba(74, 141, 183, 0.08);
}

/* 侧边抽屉 */
.detail-drawer {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  z-index: 50;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.drawer-title {
  font-family: "Noto Serif SC", serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
}
.drawer-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #8a9aac;
  font-size: 14px;
}
.drawer-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.d-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.d-label {
  color: #8a9aac;
  min-width: 64px;
  flex-shrink: 0;
}
.d-val {
  color: var(--genshin-blue-dark);
  font-weight: 500;
}
.d-row-sev {
  align-items: center;
}
.d-status {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
}
.d-status.pending {
  background: rgba(224, 112, 112, 0.12);
  color: #e07070;
}
.d-status.processing {
  background: rgba(224, 160, 80, 0.12);
  color: #e0a050;
}
.d-status.review {
  background: rgba(90, 143, 208, 0.12);
  color: #5a8fd0;
}
.d-status.done {
  background: rgba(92, 173, 138, 0.12);
  color: #5cad8a;
}
.d-desc {
  font-size: 12px;
  color: #6b7a8c;
  line-height: 1.6;
  padding: 8px 10px;
  background: rgba(163, 177, 198, 0.1);
  border-radius: 8px;
}
.drawer-btns {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}
.d-btn {
  padding: 8px 12px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-family: "Noto Sans SC", sans-serif;
  transition: all 0.2s;
}
.chat-btn {
  background: linear-gradient(
    135deg,
    var(--genshin-blue),
    var(--genshin-blue-light)
  );
  color: #fff;
  box-shadow: var(--neu-glow-blue-soft);
}
.flow-btn {
  background: linear-gradient(135deg, #5cad8a, #7dc4a5);
  color: #fff;
  box-shadow: var(--neu-glow-success-soft);
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition:
    transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.28s;
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.workorder-view {
  position: relative;
}
</style>
