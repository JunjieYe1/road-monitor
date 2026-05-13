/** 地图/生命周期共用的病害点位模型（与 recheck JSON、/query/select 映射一致） */

export interface AlertPoint {
  id: number;
  lat: number;
  lng: number;
  type: string;
  severity: "high" | "medium" | "low";
  district: string;
  address: string;
  time: string;
  status: "pending" | "processing" | "completed";
  description?: string;
  /** 检测表年份，供 /query/selectgroup、solve */
  defectYear?: string;
  /** 检测表编号 */
  defectNumber?: string;
  /** 检测表「对应病害群组编号」 */
  groupNumber?: string;
}
