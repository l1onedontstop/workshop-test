import { ipcMain } from 'electron'
import { join } from 'path'
import { writeFileSync } from 'fs'

export const INDUSTRY_TEMPLATES = [
  { id: 'restaurant', name: '餐饮/实体店', icon: '🍽️', description: '适合餐厅老板、连锁店主', weights: { hook: 0.20, rhythm: 0.10, sharpness: 0.15, utility: 0.20, emotion: 0.20, structure: 0.10, expression: 0.05 }, rationale: '重实用+情绪共鸣', sampleTopics: [{ title: '餐厅翻台率从2到5，我只改了3个细节', category: '经验分享', difficulty: 2 }], style: { vibe: '亲和力+烟火气', colorTone: '暖色', background: '餐厅实景', attire: '厨师服/休闲' }, audience: { age: '25-45', occupation: '餐饮从业者', painPoints: ['客流不稳', '员工难管'] } },
  { id: 'education', name: '教育/知识付费', icon: '📚', description: '适合培训机构老板、知识博主', weights: { hook: 0.25, rhythm: 0.15, sharpness: 0.15, utility: 0.20, emotion: 0.10, structure: 0.10, expression: 0.05 }, rationale: '重钩子+实用密度', sampleTopics: [{ title: '为什么越补课成绩越差', category: '观点输出', difficulty: 3 }], style: { vibe: '专业感', colorTone: '冷色/明亮', background: '书架/白板', attire: '商务休闲' }, audience: { age: '28-50', occupation: '教育从业者', painPoints: ['招生难', '同质化'] } },
  { id: 'ecommerce', name: '电商/带货', icon: '📦', description: '适合电商卖家、直播带货', weights: { hook: 0.25, rhythm: 0.10, sharpness: 0.10, utility: 0.25, emotion: 0.15, structure: 0.10, expression: 0.05 }, rationale: '重钩子+实用', sampleTopics: [{ title: '这个品我测了3个月，终于找到爆单方法', category: '经验分享', difficulty: 2 }], style: { vibe: '紧迫感', colorTone: '高对比', background: '仓库/产品', attire: '休闲/行业装' }, audience: { age: '20-40', occupation: '电商从业者', painPoints: ['流量贵', '转化低'] } },
  { id: 'saas', name: 'SaaS/科技', icon: '💻', description: '适合SaaS创始人、科技创业者', weights: { hook: 0.20, rhythm: 0.15, sharpness: 0.25, utility: 0.15, emotion: 0.10, structure: 0.10, expression: 0.05 }, rationale: '重观点锐度', sampleTopics: [{ title: '90%的SaaS公司死在同一个坑', category: '观点输出', difficulty: 3 }], style: { vibe: '先锋感', colorTone: '冷色/科技蓝', background: '办公室/产品界面', attire: '商务休闲' }, audience: { age: '25-45', occupation: '科技从业者', painPoints: ['增长瓶颈', '获客难'] } },
  { id: 'physical', name: '实体零售/服务', icon: '🏪', description: '适合实体店主、连锁品牌', weights: { hook: 0.15, rhythm: 0.10, sharpness: 0.15, utility: 0.25, emotion: 0.20, structure: 0.10, expression: 0.05 }, rationale: '重实用+情绪', sampleTopics: [{ title: '小店老板用这招，一个月多赚3万', category: '经验分享', difficulty: 2 }], style: { vibe: '亲和力', colorTone: '暖色', background: '门店实景', attire: '工作服/休闲' }, audience: { age: '30-55', occupation: '实体店主', painPoints: ['客流减少', '线上冲击'] } },
  { id: 'general', name: '通用/个人IP', icon: '🌟', description: '适合任何行业', weights: { hook: 0.20, rhythm: 0.15, sharpness: 0.15, utility: 0.15, emotion: 0.15, structure: 0.10, expression: 0.10 }, rationale: '均衡权重', sampleTopics: [{ title: '我创业3年最大的一个感悟', category: '经验分享', difficulty: 2 }], style: { vibe: '真实', colorTone: '根据内容', background: '个人工作场景', attire: '日常着装' }, audience: { age: '20-50', occupation: '创业者/职场人', painPoints: ['找不到定位', '坚持不下来'] } }
]

export function registerTemplateHandlers(): void {
  ipcMain.handle('template:list', async () => INDUSTRY_TEMPLATES.map(t => ({ id: t.id, name: t.name, icon: t.icon, description: t.description, sampleCount: t.sampleTopics.length })))
  ipcMain.handle('template:get', async (_e, id: string) => INDUSTRY_TEMPLATES.find(t => t.id === id) || null)
  ipcMain.handle('template:apply', async (_e, projectPath: string, templateId: string) => {
    const tpl = INDUSTRY_TEMPLATES.find(t => t.id === templateId)
    if (!tpl) return { success: false, error: '模板不存在' }
    const dimMap: Record<string, string> = { hook: '1. 开篇钩子', rhythm: '2. 叙事节奏', sharpness: '3. 观点锐度', utility: '4. 实用密度', emotion: '5. 情绪共鸣', structure: '6. 结构完整', expression: '7. 表达效果' }
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    let rubric = [`# 评分规则\n> 当前版本：v1 (${tpl.name}模板)\n> 调整理由：${tpl.rationale}\n## 7个评分维度\n| 维度 | 权重 | 说明 |\n|------|------|------|`]
    for (const [k, label] of Object.entries(dimMap)) rubric.push(`| ${label} | ${Math.round(tpl.weights[k] * 100)}% | 自定义 |`)
    rubric.push(`\n## 进化记录\n_（${now} 应用了"${tpl.name}"模板）_`)
    writeFileSync(join(projectPath, 'rubric.md'), rubric.join('\n'), 'utf-8')
    writeFileSync(join(projectPath, 'template-meta.json'), JSON.stringify({ templateId, templateName: tpl.name, appliedAt: new Date().toISOString(), weights: tpl.weights, style: tpl.style, audience: tpl.audience }, null, 2), 'utf-8')
    return { success: true, template: tpl.name, weights: tpl.weights, style: tpl.style, audience: tpl.audience }
  })
}
