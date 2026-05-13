/** POST /query/select 请求体（与 query(3).md 一致） */
export interface QuerySelectBody {
  years?: string | string[];
  regions?: string | string[];
  road_names?: string | string[];
  disease_types?: string | string[];
}
