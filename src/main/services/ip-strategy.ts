/**
 * IP Strategy Blueprint — AI 生成的完整 IP 打造方案
 *
 * 从用户画像生成：定位 → 内容支柱 → 选题路线图 → 执行计划
 * 这是 IP工坊 的核心：不是脚本生成器，而是 IP 教练。
 */

import { ipcMain } from 'electron'
import { join, dirname } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { doChat } from './ai'
import { extractJSON } from './json-parser'
import { info } from './logger'

const IP_BLUEPRINT_PROMPT = `你是一个个人IP战略顾问，专门帮中小企业老板从0到1打造个人IP。

## 你的任务
根据用户提供的信息，生成一份完整的 IP 打造蓝图。这份蓝图是 action-oriented 的——用户看完知道第一步做什么、第一个视频拍什么。

## 输出格式（严格JSON）

{
  "positioning": {
    "tagline": "一句话定位（15字以内）",
    "uniqueAngle": "你的差异化角度是什么",
    "whyYou": "为什么是你来讲这个话题"
  },
  "contentStrategy": {
    "pillars": [
      { "name": "支柱名", "ratio": 30, "description": "这个支柱讲什么", "example": "示例选题" }
    ],
    "publishCadence": "建议发布频率",
    "contentMix": "不同内容类型的配比建议"
  },
  "firstVideo": {
    "topic": "第一个视频的选题",
    "angle": "切入角度",
    "hook": "建议的开场钩子",
    "why": "为什么选这个作为第一条",
    "difficulty": 2,
    "expectedPerformance": "预期表现（冷启动现实预期）"
  },
  "roadmap": {
    "week1": "第一周目标与行动",
    "week2": "第二周目标与行动",
    "month1": "第一个月里程碑",
    "month3": "三个月目标"
  },
  "persona": {
    "voice": "语言风格",
    "visualStyle": "视觉风格建议",
    "dressCode": "着装建议",
    "background": "拍摄背景建议"
  },
  "metrics": {
    "northStar": "北极星指标（最重要的一个数字）",
    "vanityMetrics": ["辅助指标1", "辅助指标2"],
    "reviewCycle": "建议复盘周期"
  },
  "risks": ["可能遇到的问题1", "问题2"],
  "nextActions": [
    { "action": "具体行动", "priority": "high", "link": "对应功能模块" }
  ]
}

## 原则
- 给具体建议，不要泛泛而谈
- 冷启动现实预期：前5条视频通常播放不高，这是正常的
- 强调"先完成再完美"
- 第一个视频建议选难度最低、最容易出片的选题
- nextActions 的 link 用：script-editor / benchmark / topic-inspiration / plan-list`

export function buildBlueprintPrompt(answers: Record<string, string>) {
  return [
    '## 用户画像',
    answers.industry ? `行业：${answers.industry}` : '',
    answers.audience ? `目标受众：${answers.audience}` : '',
    answers.experience ? `内容经验：${answers.experience}` : '',
    answers.time ? `每周时间投入：${answers.time}` : '',
    answers.benchmark ? `对标账号：${answers.benchmark}` : '',
    answers.contentType ? `内容形态偏好：${answers.contentType}` : '',
    answers.identity ? `身份：${answers.identity}` : '',
    '',
    '请生成完整的 IP 打造蓝图。'
  ].filter(Boolean).join('\n')
}

export async function generateBlueprint(answers: Record<string, string>): Promise<any> {
  info('ip-strategy', 'Generating blueprint')
  const messages = [
    { role: 'system' as const, content: IP_BLUEPRINT_PROMPT },
    { role: 'user' as const, content: buildBlueprintPrompt(answers) }
  ]
  try {
    const raw = await doChat(messages, { temperature: 0.8, maxTokens: 3072 })
    const parsed = extractJSON(raw, { label: 'ip-blueprint' })
    if (parsed && parsed.positioning) return { success: true, ...parsed }
    // Fallback template
    return { success: true, positioning: { tagline: answers.identity || '你的个人IP', uniqueAngle: '用你的真实经历和行业洞察建立信任', whyYou: '你的行业经验就是最大的差异化' }, contentStrategy: { pillars: [{ name: '行业洞察', ratio: 40, description: '分享你对行业的独特理解', example: '我做了10年XX，发现一个规律' }, { name: '经验分享', ratio: 30, description: '实操方法和避坑指南', example: '新手做XX最容易犯的3个错误' }, { name: '观点输出', ratio: 30, description: '对行业热点的看法', example: 'XX行业为什么突然火了' }], publishCadence: '每周2-3条', contentMix: '40%行业洞察 + 30%经验 + 30%观点' }, firstVideo: { topic: '我为什么决定做这个号', angle: '真诚分享你的动机和能给观众的价值', hook: '做了10年XX，今天开始把经验免费分享出来', why: '第一条视频建立信任，让观众知道你是谁', difficulty: 1, expectedPerformance: '冷启动正常预期：100-500播放' }, roadmap: { week1: '发布3条视频，完成账号基础设置', week2: '根据数据反馈调整选题方向', month1: '发布12条视频，找到2-3个有效选题方向', month3: '积累50条视频，建立内容SOP' }, persona: { voice: '真实、不装、有温度', visualStyle: '暖色调、自然光、真实场景', dressCode: '日常着装，不要刻意', background: '办公室或家里书架前' }, metrics: { northStar: '粉丝增长', vanityMetrics: ['播放量', '点赞数'], reviewCycle: '每发布5条视频复盘一次' }, risks: ['前几期可能没人看，正常', '可能会不知道拍什么——选题池随时补充'], nextActions: [{ action: '拍摄第一条视频', priority: 'high', link: 'script-editor' }, { action: '导入对标账号', priority: 'high', link: 'benchmark' }, { action: '探索更多选题', priority: 'medium', link: 'topic-inspiration' }] }
  } catch {
    return { success: false, error: '生成失败，请稍后重试' }
  }
}

export function saveBlueprint(projectPath: string, blueprint: any): void {
  const blueprintPath = join(projectPath, 'ip-blueprint.json')
  mkdirSync(dirname(blueprintPath), { recursive: true })
  writeFileSync(blueprintPath, JSON.stringify(blueprint, null, 2), 'utf-8')
}

export function loadBlueprint(projectPath: string): any | null {
  const path = join(projectPath, 'ip-blueprint.json')
  if (existsSync(path)) {
    try { return JSON.parse(readFileSync(path, 'utf-8')) } catch {}
  }
  return null
}

export function registerIPStrategyHandlers(): void {
  ipcMain.handle('ip-strategy:generate', async (_e, answers: Record<string, string>) => {
    return generateBlueprint(answers)
  })
  ipcMain.handle('ip-strategy:get', async (_e, projectPath: string) => {
    return loadBlueprint(projectPath)
  })
  ipcMain.handle('ip-strategy:save', async (_e, projectPath: string, blueprint: any) => {
    saveBlueprint(projectPath, blueprint)
    return { success: true }
  })
}
