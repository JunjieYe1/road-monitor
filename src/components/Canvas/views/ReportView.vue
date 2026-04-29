<template>
  <div class="report-view">
    <!-- 工具栏 -->
    <ViewToolbar class="report-toolbar">
      <div class="report-types">
        <button
          v-for="t in reportTypes"
          :key="t.key"
          class="type-btn"
          :class="{ active: selectedType === t.key }"
          @click="selectedType = t.key"
        >
          {{ t.label }}
        </button>
      </div>
      <div class="toolbar-right">
        <span v-if="generated" class="gen-time">生成于 {{ genTime }}</span>
        <button
          class="action-btn"
          :disabled="isGenerating"
          @click="startGenerate"
        >
          <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
            <path
              d="M10 2v4M10 14v4M4.22 4.22l2.83 2.83M12.95 12.95l2.83 2.83M2 10h4M14 10h4M4.22 15.78l2.83-2.83M12.95 7.05l2.83-2.83"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          {{ isGenerating ? "生成中..." : generated ? "重新生成" : "生成报告" }}
        </button>
        <button v-if="generated" class="action-btn export-btn">
          <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
            <path
              d="M4 14v2a1 1 0 001 1h10a1 1 0 001-1v-2M10 3v9M7 9l3 3 3-3"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          导出 PDF
        </button>
      </div>
    </ViewToolbar>

    <!-- 报告区域：正文可能很长，始终可纵向滚动 -->
    <div class="report-body neu-card u-scrollbar-hidden">
      <!-- 空态 -->
      <div v-if="!generated && !isGenerating" class="report-empty">
        <div class="empty-icon">📄</div>
        <div class="empty-title">选择报告类型，点击生成</div>
        <div class="empty-sub">系统将根据数据库数据自动生成结构化报告</div>
        <div class="empty-types">
          <div
            v-for="t in reportTypes"
            :key="t.key"
            class="empty-type-card"
            @click="
              selectedType = t.key;
              startGenerate();
            "
          >
            <span class="etc-icon">{{ t.icon }}</span>
            <span>{{ t.label }}</span>
          </div>
        </div>
      </div>

      <!-- 生成动效 -->
      <div v-else-if="isGenerating" class="report-generating">
        <div class="gen-spinner">
          <div class="spin-ring"></div>
          <span class="gen-label-text">AI 生成中</span>
        </div>
        <div class="gen-progress-bar">
          <div
            class="gen-progress-fill"
            :style="{ width: genProgress + '%' }"
          ></div>
        </div>
        <div class="gen-steps">
          <span
            v-for="(s, i) in genSteps"
            :key="i"
            class="gen-step"
            :class="{ done: i < currentStep, active: i === currentStep }"
          >
            {{ s }}
          </span>
        </div>
      </div>

      <!-- 报告内容（打字机效果） -->
      <div v-else class="report-document">
        <div class="doc-header">
          <div class="doc-logo">◆</div>
          <div class="doc-title-block">
            <div class="doc-main-title">{{ reportTitle }}</div>
            <div class="doc-sub-title">
              上城区城市道路地下病害检测 · 年度报告（虚拟样例）
            </div>
          </div>
          <div class="doc-meta">
            <div>生成时间：{{ genTime }}</div>
            <div>数据范围：2025 年度检测周期 · 上城区</div>
          </div>
        </div>
        <div class="doc-divider"></div>
        <div class="doc-body" v-html="displayedContent"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import ViewToolbar from "../../common/ViewToolbar.vue";
import { useReportStore, type ReportType } from "../../../stores/reportStore";
import { formatLocaleMdHm } from "../../../utils/localeFormat";

const reportStore = useReportStore();

const reportTypes = [
  { key: "annual", label: "年度报告", icon: "📊" },
  { key: "patrol", label: "巡检情况", icon: "🔍" },
  { key: "rectify", label: "整改情况", icon: "🔧" },
  { key: "recheck", label: "复测情况", icon: "✅" },
] as const;
const selectedType = ref<ReportType>("annual");
const generated = ref(false);
const isGenerating = ref(false);
const genProgress = ref(0);
const currentStep = ref(0);
const genTime = ref("");
const displayedContent = ref("");

const genSteps = ["数据检索", "结构分析", "内容生成", "格式排版"];

const REPORT_TITLES: Record<ReportType, string> = {
  annual: "2025年上城区道路病害年度报告",
  patrol: "2024年度路面巡检情况报告",
  rectify: "2024年度病害整改情况报告",
  recheck: "2024年度复测验收情况报告",
};
const reportTitle = computed(
  () => REPORT_TITLES[selectedType.value] ?? "道路病害报告",
);

// TODO: API - POST /api/report/generate
const MOCK_REPORTS: Record<string, string> = {
  annual: `<h2>一、年度工作概述</h2>
<p>2025 年，上城区持续推进城市道路地下安全隐患排查治理工作，全面开展道路病害检测、复测与整改。本年度共检测道路 <strong>296 条</strong>，累计发现道路病害 <strong>162 处</strong>。病害类型主要包括脱空、疏松、富水等地下隐患，依据探地雷达等技术手段进行识别与风险评估。病害分布呈现局部集中特征，其中钱江路、德胜东路、同协南路和红普路等路段病害数量较多，需重点关注。</p>
<p class="doc-lead">各标项的负责公司、区域及检测时间段如下表所示：</p>
<table class="doc-table">
<thead><tr><th>标项</th><th>公司</th><th>区域</th><th>检测时间段</th></tr></thead>
<tbody>
<tr><td>一</td><td>中煤地下空间科技发展有限公司</td><td>上城区</td><td>2025年7月6日—2025年7月25日</td></tr>
<tr><td>二</td><td>中科云图科技有限公司</td><td>上城区</td><td>2025年6月24日—6月30日；7月1日—7月28日；9月28日</td></tr>
<tr><td>三</td><td>浙江浙安数智环境工程有限公司</td><td>上城区</td><td>2025年7月6日—2025年8月23日</td></tr>
</tbody>
</table>

<h2>二、工作量情况分析</h2>
<h3>2.1 工作量概述</h3>
<p>本年度道路病害检测的工作量如下表所示：</p>
<table class="doc-table doc-table-metrics">
<thead><tr><th>指标</th><th>数值</th></tr></thead>
<tbody>
<tr><td>检测总里程数</td><td>307.54 公里</td></tr>
<tr><td>覆盖道路数</td><td>311 条</td></tr>
<tr><td>所耗工作天数</td><td>77 天</td></tr>
<tr><td>日均检测里程数</td><td>3.99 公里/天</td></tr>
</tbody>
</table>
<p class="doc-note">注：检测时间数据中，标项三存在日期范围格式「2025.7.6—2025.8.23」，已按实际天数计算；其他标项均为具体日期，已按最早至最晚日期计算连续工作天数，并考虑各标项间的时间重叠，得出总工作天数为 77 天。</p>

<h3>2.2 各标段工作量</h3>
<p>本年度各标段检测的工作量如下表所示：</p>
<table class="doc-table">
<thead><tr><th>标段</th><th>检测里程数（公里）</th><th>覆盖道路数（条）</th><th>工作天数</th><th>日均检测里程（公里/天）</th></tr></thead>
<tbody>
<tr><td>标项一</td><td>114.56</td><td>78</td><td>19</td><td>6.03</td></tr>
<tr><td>标项二</td><td>98.45</td><td>69</td><td>51</td><td>1.93</td></tr>
<tr><td>标项三</td><td>94.53</td><td>164</td><td>49</td><td>1.93</td></tr>
</tbody>
</table>
<figure class="doc-figure"><img src="/reports/shangcheng-2025/chart-01-workload.png" alt="各标段工作量与效率对比图" loading="lazy" /><figcaption>各标段工作量与效率对比图</figcaption></figure>
<p>从工作量对比图可以看出，标项一的检测里程数最高，达到 114.56 公里，而标项二和标项三的检测里程数相近，分别为 98.45 公里和 94.53 公里。在工作效率方面，标项一的日均检测里程为 6.03 公里/天，显著高于标项二和标项三的 1.93 公里/天，表明标项一的检测效率明显更高。标项三虽然检测里程数最少，但覆盖道路数最多（164 条），说明其检测的道路平均长度较短，多为支路等小型道路。</p>

<h3>2.3 检测覆盖情况</h3>
<figure class="doc-figure"><img src="/reports/shangcheng-2025/chart-02-road-type.png" alt="道路种类分布占比图" loading="lazy" /><figcaption>道路种类分布占比图</figcaption></figure>
<p>从道路种类分布图可以看出，2025 年上城区道路病害检测以支路为主，占比达到 <strong>50.36%</strong>（212 条），其次是主干路，占比 <strong>34.68%</strong>（146 条），次干路占比较小，为 <strong>14.25%</strong>（60 条），城市快速路及辅道仅占 <strong>0.71%</strong>（3 条）。这表明检测工作重点覆盖了城市支路网络，同时也兼顾了主要交通干道的检测需求。各标段中，标项三支路占比最高（58.29%），标项一支路与主干路比例接近，标项二次干路占比较高（26.42%），体现了不同标段针对不同道路类型的检测侧重。</p>

<h2>三、病害情况分析</h2>
<h3>3.1 病害量概述</h3>
<p>2025 年上城区共记录道路病害 <strong>162 个</strong>，分布于三个标段。其中标项二病害数量最多，达 <strong>102 个</strong>，占总数的 <strong>62.96%</strong>；标项三次之，为 <strong>46 个</strong>，占比 <strong>28.40%</strong>；标项一最少，仅 <strong>14 个</strong>，占比 <strong>8.64%</strong>。各标段病害数量差异显著，主要集中于标项二区域。</p>
<figure class="doc-figure"><img src="/reports/shangcheng-2025/chart-03-disease-by-lot.png" alt="各标段病害数量分布图" loading="lazy" /><figcaption>各标段病害数量分布图</figcaption></figure>

<h3>3.2 高发道路分析</h3>
<p>2025 年上城区病害数量前十的道路累计报告病害 <strong>79 个</strong>，占全区总数的 <strong>48.77%</strong>，呈现高度集中特征。其中钱江路以 13 个病害位居首位，德胜东路与同协南路并列第二（各 9 个），其余道路病害数量在 5 至 6 个之间。</p>
<p>从空间分布看，高发病害道路多位于城市主干道及交通流量密集区域，如钱江路、庆春东路、艮山西路等均为贯穿城区的东西向主干道；德胜东路、九沙大道则临近物流园区与施工区域，可能受重型车辆频繁通行影响。严家路、长睦路等位于居住区周边，病害或与排水不畅、基层老化有关。整体显示病害高发路段与交通负荷、周边用地性质存在较强关联性。</p>
<figure class="doc-figure"><img src="/reports/shangcheng-2025/chart-04-top-roads.png" alt="病害数量前十道路排名图" loading="lazy" /><figcaption>病害数量前十道路排名图</figcaption></figure>

<h3>3.3 病害类型分布</h3>
<p>2025 年上城区共记录四类道路病害，总计 162 个。其中「脱空」最为突出，达 <strong>86 个</strong>，占比 <strong>53.09%</strong>；「严重疏松」次之，为 <strong>59 个</strong>，占比 <strong>36.42%</strong>；「一般疏松」<strong>16 个</strong>，占比 <strong>9.88%</strong>；「空洞」仅 <strong>1 个</strong>，占比 <strong>0.62%</strong>。数据表明结构性病害（脱空、空洞）与材料劣化类病害（疏松）共同构成主要问题，尤以脱空为主导类型，提示需重点关注基层与面层之间的粘结状态及地下水影响。</p>
<figure class="doc-figure"><img src="/reports/shangcheng-2025/chart-05-disease-type.png" alt="病害类型数量及占比分布图" loading="lazy" /><figcaption>病害类型数量及占比分布图</figcaption></figure>

<h3>3.4 风险等级评估</h3>
<h4>3.4.1 病害风险等级列表</h4>
<p>2025 年上城区检测出的各类道路病害对应的风险等级如下：</p>
<table class="doc-table">
<thead><tr><th>病害类型</th><th>风险等级</th></tr></thead>
<tbody>
<tr><td>严重疏松</td><td>Ⅱ、Ⅲ</td></tr>
<tr><td>脱空</td><td>Ⅲ、Ⅳ</td></tr>
<tr><td>一般疏松</td><td>Ⅰ、Ⅱ</td></tr>
<tr><td>空洞</td><td>Ⅳ</td></tr>
</tbody>
</table>
<h4>3.4.2 风险等级分布</h4>
<p>2025 年上城区不同风险等级的病害数量及分布情况如下表所示：</p>
<table class="doc-table">
<thead><tr><th>风险等级</th><th>病害数量（个）</th><th>占比（%）</th></tr></thead>
<tbody>
<tr><td>Ⅰ</td><td>7</td><td>4.32</td></tr>
<tr><td>Ⅱ</td><td>60</td><td>37.04</td></tr>
<tr><td>Ⅲ</td><td>51</td><td>31.48</td></tr>
<tr><td>Ⅳ</td><td>44</td><td>27.16</td></tr>
<tr><td><strong>总计</strong></td><td><strong>162</strong></td><td><strong>100.00</strong></td></tr>
</tbody>
</table>
<figure class="doc-figure"><img src="/reports/shangcheng-2025/chart-06-risk-level.png" alt="风险等级分布图" loading="lazy" /><figcaption>风险等级分布图</figcaption></figure>
<p>数据分析表明，风险等级Ⅱ的病害数量最多，占总数的 37.04%，其次是风险等级Ⅲ和Ⅳ，分别占 31.48% 和 27.16%。高风险病害（风险等级Ⅳ）数量最多的道路是德胜东路，共有 8 处。</p>

<h3>3.5 病害成因分析</h3>
<h4>3.5.1 报告成因汇总</h4>
<p>综合本年度的检测报告分析，主要成因有：</p>
<ul class="doc-list-inline"><li>土体组成</li><li>水文作用</li><li>工程扰动</li><li>环境干扰</li></ul>
<h4>3.5.2 成因总结</h4>
<p>根据《城市地下病害体综合探测与风险评估技术标准》（JGJ/T 437-2018）及相关检测报告，2025 年上城区道路病害的形成主要受自然因素和人为因素两大主因影响。自然因素主要包括土体组成和水文作用，其中富水区和土体松散区容易形成地下病害体；人为因素则主要表现为工程扰动和环境干扰，如地下管线施工、道路周边建设活动等。这些因素在道路的规划、建设和运营等不同阶段产生不同程度的影响，共同导致了当前检测到的道路病害问题。</p>

<h2>四、处理情况分析</h2>
<h3>4.1 整改情况</h3>
<p>2025 年上城区道路病害整改情况如下表所示：</p>
<table class="doc-table">
<thead><tr><th>风险等级</th><th>总病害数量（个）</th><th>已完成整改数量（个）</th><th>整改率</th></tr></thead>
<tbody>
<tr><td>Ⅰ</td><td>7</td><td>2</td><td>28.6%</td></tr>
<tr><td>Ⅱ</td><td>60</td><td>15</td><td>25.0%</td></tr>
<tr><td>Ⅲ</td><td>51</td><td>51</td><td>100%</td></tr>
<tr><td>Ⅳ</td><td>44</td><td>44</td><td>100%</td></tr>
<tr><td><strong>合计</strong></td><td><strong>162</strong></td><td><strong>112</strong></td><td><strong>69.1%</strong></td></tr>
</tbody>
</table>
<p>本年度已完成整改的道路病害共计 <strong>112 处</strong>，整体整改率为 <strong>69.1%</strong>。尚未整改的病害共 50 处，其中风险等级Ⅰ和Ⅱ的病害共 50 处（Ⅰ级 5 处、Ⅱ级 45 处）未全部整改。根据业务逻辑，等级Ⅳ以上的病害过于严重所以必须及时整改；等级Ⅲ的病害视严重程度进行整改；等级Ⅱ和Ⅰ的病害暂不强制整改，若情况恶化再进行整改，故仅部分进行了处理。</p>

<h3>4.2 复测情况</h3>
<table class="doc-table">
<thead><tr><th>指标</th><th>数量（个/条）</th></tr></thead>
<tbody>
<tr><td>道路病害总数量</td><td>162</td></tr>
<tr><td>完成复测的病害数量（去重）</td><td>160</td></tr>
<tr><td>复测率</td><td>98.8%</td></tr>
<tr><td>复测记录总数（不去重）</td><td>320</td></tr>
</tbody>
</table>
<p>2025 年上城区共检测出道路病害 162 处，其中已完成复测的病害为 160 处（按病害编号去重），复测率为 98.8%。复测记录总数为 320 条，表明部分病害进行了多次复测。数据显示，绝大多数病害已纳入复测管理，且存在对同一病害开展多次复测的情况，体现了对病害发展动态的持续跟踪与评估。</p>

<h2>五、工作情况评价</h2>
<p>2025 年上城区道路雷达检测工作覆盖三个标段，分别由中煤地下空间科技发展有限公司（标项一）、中科云图科技有限公司（标项二）和浙江浙安数智环境工程有限公司（标项三）承担。各公司在检测里程与病害发现能力方面表现差异显著，具体数据如下表所示：</p>
<table class="doc-table">
<thead><tr><th>标段</th><th>检测公司</th><th>检测道路长度（公里）</th><th>病害数量（个）</th></tr></thead>
<tbody>
<tr><td>标项一</td><td>中煤地下空间科技发展有限公司</td><td>114.56</td><td>14</td></tr>
<tr><td>标项二</td><td>中科云图科技有限公司</td><td>98.45</td><td>102</td></tr>
<tr><td>标项三</td><td>浙江浙安数智环境工程有限公司</td><td>94.53</td><td>46</td></tr>
</tbody>
</table>
<p>从数据可见，标项二在病害检出数量上显著高于其他标段。结合设备配置与作业精细度，标项二单位里程病害检出率达 <strong>1.04 个/公里</strong>，标项三为 <strong>0.49 个/公里</strong>，标项一为 <strong>0.12 个/公里</strong>，差异表明检测设备配置、作业精细度及数据分析能力对标段成效具有决定性影响。</p>
<figure class="doc-figure"><img src="/reports/shangcheng-2025/chart-07-per-km.png" alt="各标段单位里程病害数量对比图" loading="lazy" /><figcaption>各标段单位里程病害数量对比图</figcaption></figure>

<h2>六、结论与下阶段工作建议</h2>
<h3>6.1 结论</h3>
<p>2025 年上城区道路地下安全隐患排查治理工作总体有序推进，全年累计检测道路 311 条，覆盖里程 307.54 公里，共发现病害 162 处，整体整改率达 69.1%，复测率达 98.8%。从病害分布看，呈现显著区域集中特征；病害类型以「脱空」为主（86 处，53.09%），其次为「严重疏松」（59 处，36.42%）。风险等级方面，Ⅲ级和Ⅳ级高风险病害合计占比达 58.64%（95 处），且全部完成整改，说明应急处置机制运行有效。三个标段表现差异明显，标项二工作质量最优，标项一单位里程检出率偏低，需引起重视。</p>
<h3>6.2 建议</h3>
<ol class="doc-ol">
<li><strong>强化标项一检测质量复核与技术提升：</strong>建议组织第三方对不少于 10% 里程抽查复测，明确雷达设备型号与判读标准，合同中增设检出率绩效考核（建议基准不低于 0.4 个/公里）。</li>
<li><strong>聚焦高发病害道路专项治理与成因溯源：</strong>对钱江路、德胜东路、同协南路、红普路、九沙大道等开展「一路一策」治理，Ⅳ级病害集中路段优先纳入结构性修复计划。</li>
<li><strong>优化低风险病害（Ⅰ、Ⅱ级）闭环管理：</strong>建立「分级巡查 + 动态升级」机制，防止小隐患演变为大风险。</li>
<li><strong>统筹道路类型与检测资源配置：</strong>主干道划入高精度车载雷达标段，支路密集区配备高频手推雷达。</li>
<li><strong>推动病害数据库与城市生命线工程对接：</strong>构建专题数据库，实现多源数据融合与养护决策支撑。</li>
</ol>`,
  patrol: `<h2>一、巡检概况</h2>
<p>2024年全年完成常规巡检 <strong>286次</strong>，覆盖城区主干道 <strong>47条</strong>，累计巡检里程 <strong>1,247公里</strong>。</p>
<h2>二、发现问题汇总</h2>
<p>本期共发现路面问题 <strong>347处</strong>，其中高危 <strong>68处</strong>、中危 <strong>143处</strong>、低危 <strong>136处</strong>。</p>
<h2>三、季度分布</h2>
<p>Q1发现 72处，Q2（梅雨季）发现 112处，Q3发现 89处，Q4发现 74处。梅雨季病害发生频率显著上升。</p>`,
  rectify: `<h2>一、整改执行情况</h2>
<p>本年度共下发整改工单 <strong>286张</strong>，完成整改 <strong>235张</strong>，完成率 <strong>82.2%</strong>。</p>
<h2>二、服务单位表现</h2>
<p>杭州市政养护有限公司完成率最高（94.3%），某路面工程公司完成率最低（61.2%），已列入履约预警名单。</p>`,
  recheck: `<h2>一、复测概况</h2>
<p>本年度对完工整改项目进行复测验收 <strong>235次</strong>，一次验收通过率 <strong>78.3%</strong>，二次验收通过率 <strong>96.2%</strong>。</p>
<h2>二、不合格情况</h2>
<p>初次验收不合格 <strong>51处</strong>，主要原因：修复材料不达标（23处）、修复深度不足（18处）、表面平整度超标（10处）。</p>`,
};

async function startGenerate() {
  isGenerating.value = true;
  generated.value = false;
  genProgress.value = 0;
  currentStep.value = 0;
  displayedContent.value = "";

  for (let i = 0; i < genSteps.length; i++) {
    currentStep.value = i;
    await animate(genProgress, i * 25, (i + 1) * 25, 400);
    await new Promise((r) => setTimeout(r, 200));
  }
  await animate(genProgress, 100, 100, 0);
  await new Promise((r) => setTimeout(r, 300));

  isGenerating.value = false;
  generated.value = true;
  genTime.value = formatLocaleMdHm();

  const content = MOCK_REPORTS[selectedType.value] || MOCK_REPORTS.annual;
  await typewriter(content);
  reportStore.addHistory({
    type: selectedType.value,
    title: reportTitle.value,
    generatedAt: genTime.value,
    content,
  });
}

function animate(
  target: { value: number },
  from: number,
  to: number,
  duration: number,
): Promise<void> {
  return new Promise((resolve) => {
    target.value = from;
    if (duration === 0) {
      target.value = to;
      resolve();
      return;
    }
    const start = performance.now();
    function step(now: number) {
      const p = Math.min((now - start) / duration, 1);
      target.value = from + (to - from) * p;
      if (p < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

async function typewriter(html: string) {
  displayedContent.value = "";
  const chars = html.split("");
  for (let i = 0; i < chars.length; i++) {
    displayedContent.value += chars[i];
    if (i % 8 === 0) await new Promise((r) => setTimeout(r, 10));
  }
}

watch(
  () => reportStore.activeHistory,
  (history) => {
    if (!history) return;
    selectedType.value = history.type;
    generated.value = true;
    isGenerating.value = false;
    genProgress.value = 100;
    currentStep.value = genSteps.length - 1;
    genTime.value = history.generatedAt;
    displayedContent.value = history.content;
  },
);
</script>

<style scoped>
.report-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}

.report-types {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  flex: 1;
}
.type-btn {
  padding: 5px 12px;
  border-radius: 10px;
  border: 1px solid var(--neu-stroke-muted);
  cursor: pointer;
  background: var(--bg-color);
  color: #8a9aac;
  font-size: 12px;
  font-family: "Noto Sans SC", sans-serif;
  transition: all 0.2s;
  box-shadow: var(--neu-extrude-sm);
}
.type-btn.active {
  background: linear-gradient(
    135deg,
    var(--genshin-blue),
    var(--genshin-blue-light)
  );
  color: #fff;
  border-color: transparent;
  box-shadow: var(--neu-glow-blue-strong);
}

.toolbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.gen-time {
  font-size: 11px;
  color: #8a9aac;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  background: linear-gradient(
    135deg,
    var(--genshin-blue),
    var(--genshin-blue-light)
  );
  color: #fff;
  font-size: 12px;
  font-family: "Noto Sans SC", sans-serif;
  box-shadow: var(--neu-glow-blue-strong);
  transition: all 0.2s;
}
.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.action-btn:hover:not(:disabled) {
  box-shadow: var(--neu-glow-blue-hover-strong);
  transform: translateY(-1px);
}
.export-btn {
  background: linear-gradient(135deg, #5cad8a, #7dc4a5);
  box-shadow: var(--neu-glow-success-strong);
}

.report-body {
  flex: 1;
  padding: 20px;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 空态 */
.report-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
}
.empty-icon {
  font-size: 48px;
}
.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--genshin-blue-dark);
}
.empty-sub {
  font-size: 13px;
  color: #8a9aac;
}
.empty-types {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.empty-type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 20px;
  border-radius: 14px;
  cursor: pointer;
  background: var(--bg-color);
  font-size: 12px;
  color: var(--genshin-blue-dark);
  box-shadow: var(--neu-extrude-lg);
  transition: all 0.2s;
  min-width: 80px;
}
.empty-type-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--neu-extrude-lg-up);
}
.etc-icon {
  font-size: 24px;
}

/* 生成动效 */
.report-generating {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 20px;
}
.gen-spinner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
}
.spin-ring {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: var(--genshin-blue);
  border-right-color: var(--genshin-gold);
  animation: spin 1.2s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.gen-label-text {
  font-size: 13px;
  color: var(--genshin-blue);
  font-weight: 500;
}
.gen-progress-bar {
  width: 240px;
  height: 6px;
  background: var(--bg-groove);
  border-radius: 3px;
  overflow: hidden;
  box-shadow: var(--neu-inset-track);
}
.gen-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--genshin-blue), var(--genshin-gold));
  border-radius: 3px;
  transition: width 0.4s ease;
}
.gen-steps {
  display: flex;
  gap: 20px;
}
.gen-step {
  font-size: 11px;
  color: #b0bac8;
  transition: all 0.3s;
}
.gen-step.active {
  color: var(--genshin-blue);
  font-weight: 600;
}
.gen-step.done {
  color: #5cad8a;
}

/* 报告文档 */
.report-document {
  max-width: 760px;
  margin: 0 auto;
}
.doc-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
}
.doc-logo {
  font-size: 28px;
  color: var(--genshin-gold);
}
.doc-title-block {
  flex: 1;
}
.doc-main-title {
  font-family: "Noto Serif SC", serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
}
.doc-sub-title {
  font-size: 12px;
  color: #8a9aac;
  margin-top: 4px;
}
.doc-meta {
  font-size: 11px;
  color: #8a9aac;
  text-align: right;
  line-height: 1.8;
}
.doc-divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(212, 168, 83, 0.4),
    transparent
  );
  margin-bottom: 20px;
}
.doc-body {
  font-size: 13px;
  color: #3a4a5c;
  line-height: 1.8;
}
:deep(.doc-body h2) {
  font-family: "Noto Serif SC", serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
  margin: 20px 0 10px;
  border-left: 3px solid var(--genshin-gold);
  padding-left: 10px;
}
:deep(.doc-body h3) {
  font-family: "Noto Serif SC", serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--genshin-blue-dark);
  margin: 16px 0 8px;
}
:deep(.doc-body h4) {
  font-size: 13px;
  font-weight: 600;
  color: #4a5a6e;
  margin: 12px 0 6px;
}
:deep(.doc-body p) {
  margin-bottom: 12px;
  text-align: justify;
}
:deep(.doc-body .doc-lead) {
  margin-bottom: 8px;
  color: #4a5a6e;
}
:deep(.doc-body .doc-note) {
  font-size: 12px;
  color: #6a7a8c;
  line-height: 1.65;
  padding: 10px 12px;
  background: rgba(74, 90, 110, 0.06);
  border-radius: 8px;
  border-left: 3px solid rgba(212, 168, 83, 0.5);
}
:deep(.doc-body .doc-figure) {
  margin: 14px 0 18px;
  text-align: center;
}
:deep(.doc-body .doc-figure img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
  border-radius: 8px;
  box-shadow: var(--neu-extrude-sm);
  border: 1px solid var(--neu-stroke-muted);
  background: #fff;
}
:deep(.doc-body .doc-figure figcaption) {
  font-size: 12px;
  color: #6a7a8c;
  margin-top: 8px;
  line-height: 1.5;
}
:deep(.doc-body .doc-table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin: 10px 0 16px;
  box-shadow: var(--neu-extrude-sm);
  border-radius: 8px;
  overflow: hidden;
}
:deep(.doc-body .doc-table th),
:deep(.doc-body .doc-table td) {
  border: 1px solid var(--neu-stroke-muted);
  padding: 8px 10px;
  vertical-align: top;
}
:deep(.doc-body .doc-table th) {
  background: rgba(74, 144, 226, 0.08);
  font-weight: 600;
  color: var(--genshin-blue-dark);
  text-align: left;
}
:deep(.doc-body .doc-table-metrics td:last-child) {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
:deep(.doc-body .doc-list-inline) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
}
:deep(.doc-body .doc-list-inline li) {
  padding: 4px 10px;
  background: rgba(212, 168, 83, 0.12);
  border-radius: 6px;
  font-size: 12px;
}
:deep(.doc-body .doc-ol) {
  margin: 0 0 12px;
  padding-left: 1.25em;
}
:deep(.doc-body .doc-ol li) {
  margin-bottom: 10px;
  line-height: 1.75;
}
:deep(.doc-body strong) {
  color: var(--genshin-blue-dark);
  font-weight: 600;
}
</style>
