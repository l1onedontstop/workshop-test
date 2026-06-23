// ── 7-Dimension Rubric Constants ──────────────────────────
//
// Shared between main process (rubric.ts) and renderer (pages).
// Single source of truth for dimension keys, labels, descriptions,
// standards, signals, and default weights.
//
// After 25+ sample calibration. Evolves with retro data.

export type DimensionKey = 'hook' | 'rhythm' | 'sharpness' | 'utility' | 'emotion' | 'structure' | 'expression'

export const DIMENSION_KEYS: readonly DimensionKey[] = [
  'hook', 'rhythm', 'sharpness', 'utility', 'emotion', 'structure', 'expression'
]

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  hook: '开篇钩子',
  rhythm: '叙事节奏',
  sharpness: '观点锐度',
  utility: '实用密度',
  emotion: '情绪共鸣',
  structure: '结构完整',
  expression: '表达效果'
}

export const DIMENSION_DESCRIPTIONS: Record<DimensionKey, string> = {
  hook: '前3秒能不能让人停下来不划走？',
  rhythm: '信息密度和情绪起伏的控制',
  sharpness: '有没有让人"卧槽"的洞见或反常识观点',
  utility: '观众看完能拿走什么？能不能用上？',
  emotion: '观众会不会想转发/评论/艾特人？',
  structure: '开头-展开-高潮-结尾是否完整',
  expression: '语言是否口语化、有画面感、适合口播'
}

export const HIGH_STANDARDS: Record<DimensionKey, string> = {
  hook: '第一句话制造了强烈的好奇缺口或认知冲突，让人必须看完',
  rhythm: '快慢交替、有呼吸感、每 15-20 秒有一个小转折或新信息',
  sharpness: '至少一个观点是受众没听过的、但又觉得对的；或把复杂问题说透了',
  utility: '有具体方法/步骤/数据/案例，看完知道怎么做',
  emotion: '说中了受众的痛点/爽点/痒点，有"这就是我"的代入感',
  structure: '有清晰的金字塔结构或故事线，结尾有 callback 或行动号召',
  expression: '读起来像在说话而非念稿，有节奏感，句子短而有力'
}

export const LOW_SIGNALS: Record<DimensionKey, string> = {
  hook: '开头是"大家好我是..."、铺垫过长、没有 hook',
  rhythm: '平铺直叙、一段讲太久、没有起伏',
  sharpness: '正确的废话、观点模糊、不敢下判断',
  utility: '只有观点没有方法、泛泛而谈',
  emotion: '隔靴搔痒、与受众无关、没有情绪触点',
  structure: '戛然而止、虎头蛇尾、结构松散',
  expression: '书面语、长句、拗口、像 AI 写的'
}

export const DEFAULT_WEIGHTS: Record<DimensionKey, number> = {
  hook: 0.20,
  rhythm: 0.15,
  sharpness: 0.15,
  utility: 0.15,
  emotion: 0.15,
  structure: 0.10,
  expression: 0.10
}

// Short descriptions used in UI cards (trimmed from full descriptions)
export const DIMENSION_SHORT_DESCRIPTIONS: Record<DimensionKey, string> = {
  hook: '前3秒能不能让人停下来',
  rhythm: '信息密度和情绪起伏',
  sharpness: '有没有让人"卧槽"的洞见',
  utility: '观众能拿走什么',
  emotion: '会不会想转发/评论',
  structure: '开头-展开-高潮-结尾',
  expression: '口语化、画面感、适合口播'
}

// Chinese-to-English key mapping (used by parseRubricWeights to match table rows)
export const DIMENSION_KEY_MAP: Record<string, string> = {
  '开篇钩子': 'hook',
  '叙事节奏': 'rhythm',
  '观点锐度': 'sharpness',
  '实用密度': 'utility',
  '情绪共鸣': 'emotion',
  '结构完整': 'structure',
  '表达效果': 'expression'
}
