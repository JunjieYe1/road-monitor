import { defineStore } from "pinia";
import { computed, ref } from "vue";

export interface ComplianceDimension {
  name: string;
  score: number;
}

export interface ComplianceTrendPoint {
  year: string;
  score: number;
}

export interface ComplianceUnit {
  id: number;
  name: string;
  score: number;
  dims: ComplianceDimension[];
  trend: ComplianceTrendPoint[];
}

export const useComplianceStore = defineStore("compliance", () => {
  const years = ref(["2024", "2023", "2022"]);
  const selYear = ref("2024");

  // TODO: API - GET /api/compliance/ranking?year=YYYY
  const units = ref<ComplianceUnit[]>([
    {
      id: 1,
      name: "杭州市政养护有限公司",
      score: 92,
      dims: [
        { name: "检测质量", score: 94 },
        { name: "整改及时", score: 91 },
        { name: "复测准确", score: 88 },
        { name: "文档规范", score: 95 },
        { name: "响应速度", score: 90 },
      ],
      trend: [
        { year: "2022", score: 85 },
        { year: "2023", score: 89 },
        { year: "2024", score: 92 },
      ],
    },
    {
      id: 2,
      name: "西湖区道路工程公司",
      score: 84,
      dims: [
        { name: "检测质量", score: 82 },
        { name: "整改及时", score: 88 },
        { name: "复测准确", score: 80 },
        { name: "文档规范", score: 85 },
        { name: "响应速度", score: 84 },
      ],
      trend: [
        { year: "2022", score: 79 },
        { year: "2023", score: 81 },
        { year: "2024", score: 84 },
      ],
    },
    {
      id: 3,
      name: "滨江区城市管理服务",
      score: 78,
      dims: [
        { name: "检测质量", score: 76 },
        { name: "整改及时", score: 80 },
        { name: "复测准确", score: 75 },
        { name: "文档规范", score: 82 },
        { name: "响应速度", score: 77 },
      ],
      trend: [
        { year: "2022", score: 74 },
        { year: "2023", score: 76 },
        { year: "2024", score: 78 },
      ],
    },
    {
      id: 4,
      name: "拱墅区路面维护有限公司",
      score: 71,
      dims: [
        { name: "检测质量", score: 70 },
        { name: "整改及时", score: 74 },
        { name: "复测准确", score: 68 },
        { name: "文档规范", score: 73 },
        { name: "响应速度", score: 70 },
      ],
      trend: [
        { year: "2022", score: 68 },
        { year: "2023", score: 70 },
        { year: "2024", score: 71 },
      ],
    },
    {
      id: 5,
      name: "上城区建设工程总公司",
      score: 63,
      dims: [
        { name: "检测质量", score: 60 },
        { name: "整改及时", score: 65 },
        { name: "复测准确", score: 62 },
        { name: "文档规范", score: 66 },
        { name: "响应速度", score: 63 },
      ],
      trend: [
        { year: "2022", score: 66 },
        { year: "2023", score: 65 },
        { year: "2024", score: 63 },
      ],
    },
    {
      id: 6,
      name: "江干区路桥工程有限公司",
      score: 58,
      dims: [
        { name: "检测质量", score: 56 },
        { name: "整改及时", score: 60 },
        { name: "复测准确", score: 55 },
        { name: "文档规范", score: 62 },
        { name: "响应速度", score: 57 },
      ],
      trend: [
        { year: "2022", score: 63 },
        { year: "2023", score: 61 },
        { year: "2024", score: 58 },
      ],
    },
    {
      id: 7,
      name: "钱江新城道路服务公司",
      score: 54,
      dims: [
        { name: "检测质量", score: 52 },
        { name: "整改及时", score: 56 },
        { name: "复测准确", score: 50 },
        { name: "文档规范", score: 58 },
        { name: "响应速度", score: 54 },
      ],
      trend: [
        { year: "2022", score: 60 },
        { year: "2023", score: 57 },
        { year: "2024", score: 54 },
      ],
    },
  ]);

  const sortedUnits = computed(() =>
    [...units.value].sort((a, b) => b.score - a.score),
  );
  const selectedUnitId = ref<number | null>(units.value[0]?.id ?? null);
  const selectedUnit = computed(
    () =>
      sortedUnits.value.find((unit) => unit.id === selectedUnitId.value) ??
      null,
  );

  const averageScore = computed(() => {
    if (!units.value.length) return 0;
    const sum = units.value.reduce((acc, unit) => acc + unit.score, 0);
    return Number((sum / units.value.length).toFixed(1));
  });
  const redCount = computed(
    () => units.value.filter((unit) => unit.score >= 80).length,
  );
  const blackCount = computed(
    () => units.value.filter((unit) => unit.score < 65).length,
  );

  function selectUnit(id: number) {
    selectedUnitId.value = id;
  }

  return {
    years,
    selYear,
    units,
    sortedUnits,
    selectedUnitId,
    selectedUnit,
    averageScore,
    redCount,
    blackCount,
    selectUnit,
  };
});
