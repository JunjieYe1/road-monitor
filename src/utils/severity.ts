export type SeverityLevel = "high" | "medium" | "low";

const UNICODE_ROMAN_VALUE: Record<string, number> = {
  "Ⅰ": 1,
  "Ⅱ": 2,
  "Ⅲ": 3,
  "Ⅳ": 4,
  "Ⅴ": 5,
  "Ⅵ": 6,
  "Ⅶ": 7,
  "Ⅷ": 8,
  "Ⅸ": 9,
  "Ⅹ": 10,
  "Ⅺ": 11,
  "Ⅻ": 12,
};

const ASCII_ROMAN_VALUE: Record<string, number> = {
  I: 1,
  V: 5,
  X: 10,
};

function parseAsciiRomanToken(token: string): number | null {
  const s = token.toUpperCase();
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ASCII_ROMAN_VALUE[s[i]];
    if (!cur) return null;
    const next = i + 1 < s.length ? ASCII_ROMAN_VALUE[s[i + 1]] : 0;
    total += cur < next ? -cur : cur;
  }
  return total > 0 ? total : null;
}

function parseDiseaseLevelNumber(level: string): number | null {
  const normalized = level.trim();
  if (!normalized) return null;

  const arabic = normalized.match(/\d+/);
  if (arabic) return Number.parseInt(arabic[0], 10);

  const unicodeRoman = normalized.match(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]+/);
  if (unicodeRoman) {
    const value = UNICODE_ROMAN_VALUE[unicodeRoman[0]];
    if (typeof value === "number") return value;
  }

  const asciiRoman = normalized.match(/\b(?:X|IX|IV|V?I{1,3})\b/i);
  if (asciiRoman) return parseAsciiRomanToken(asciiRoman[0]);

  return null;
}

export function diseaseLevelToSeverity(level: string): SeverityLevel {
  const levelNum = parseDiseaseLevelNumber(level);
  if (levelNum == null) return "low";
  if (levelNum <= 2) return "low";
  if (levelNum === 3) return "medium";
  return "high";
}
