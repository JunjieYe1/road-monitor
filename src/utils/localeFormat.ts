/** 中文环境下的日期时间格式化，集中配置避免各处重复 Intl 选项 */

export const LOCALE_ZH = "zh-CN";

const OPT_TIME_HM: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
};

const OPT_CLOCK: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
};

const OPT_MD_HM: Intl.DateTimeFormatOptions = {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
};

const OPT_SESSION_SUB: Intl.DateTimeFormatOptions = {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

function toDate(input: Date | string | number): Date {
  return input instanceof Date ? input : new Date(input);
}

/** 聊天消息气泡等：仅时、分 */
export function formatLocaleTimeHm(
  input: Date | string | number = new Date(),
): string {
  return toDate(input).toLocaleTimeString(LOCALE_ZH, OPT_TIME_HM);
}

/** 顶栏时钟：年-月-日 时:分:秒 */
export function formatLocaleDateTimeClock(
  input: Date | string | number = new Date(),
): string {
  return toDate(input).toLocaleString(LOCALE_ZH, OPT_CLOCK);
}

/** 报告生成时间等：月/日 时:分（两位月日） */
export function formatLocaleMdHm(
  input: Date | string | number = new Date(),
): string {
  return toDate(input).toLocaleString(LOCALE_ZH, OPT_MD_HM);
}

/** 会话列表副标题：M/D 时:分 */
export function formatLocaleSessionSub(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(LOCALE_ZH, OPT_SESSION_SUB);
  } catch {
    return "";
  }
}
