import { describe, it, expect } from 'vitest'
import { parseRubricWeights, buildRubricPrompt } from '../src/main/services/rubric'

const SAMPLE = `| 1. 开篇钩子 | 20% | test |
| 2. 叙事节奏 | 15% | test |
| 3. 观点锐度 | 15% | test |
| 4. 实用密度 | 15% | test |
| 5. 情绪共鸣 | 15% | test |
| 6. 结构完整 | 10% | test |
| 7. 表达效果 | 10% | test |`

describe('parseRubricWeights', () => {
  it('parses all 7 dimensions', () => { const w = parseRubricWeights(SAMPLE); expect(w).not.toBeNull(); expect(w!.hook).toBeCloseTo(0.2); expect(w!.rhythm).toBeCloseTo(0.15); expect(w!.expression).toBeCloseTo(0.1) })
  it('returns null for empty', () => { expect(parseRubricWeights('')).toBeNull() })
  it('sums to 1.0', () => { const w = parseRubricWeights(SAMPLE); const s = Object.values(w!).reduce((a, b) => a + b, 0); expect(s).toBeCloseTo(1.0) })
})

describe('buildRubricPrompt', () => {
  const DEFAULT = { hook: 0.2, rhythm: 0.15, sharpness: 0.15, utility: 0.15, emotion: 0.15, structure: 0.1, expression: 0.1 }
  it('includes all dimensions', () => { const p = buildRubricPrompt(DEFAULT); expect(p).toContain('开篇钩子'); expect(p).toContain('表达效果') })
})
