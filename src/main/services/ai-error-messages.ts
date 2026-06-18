const PROVIDER_HELP: Record<string, { name: string; signupUrl: string; keyLocation: string; pricing: string; freeTrial: string }> = {
  deepseek: { name: 'DeepSeek', signupUrl: 'https://platform.deepseek.com', keyLocation: '控制台 → API Keys → 创建', pricing: '¥1/百万tokens', freeTrial: '新用户赠 500 万 tokens' },
  openai: { name: 'OpenAI', signupUrl: 'https://platform.openai.com', keyLocation: 'API keys → Create new secret key', pricing: '按模型计费', freeTrial: '新用户有免费额度' },
  anthropic: { name: 'Anthropic (Claude)', signupUrl: 'https://console.anthropic.com', keyLocation: 'API Keys → Create Key', pricing: '按模型计费', freeTrial: '联系销售获取试用' },
  kimi: { name: 'Kimi', signupUrl: 'https://platform.moonshot.cn', keyLocation: '控制台 → API Keys', pricing: '按量计费', freeTrial: '新用户赠 15 元额度' },
  zhipu: { name: '智谱 GLM', signupUrl: 'https://open.bigmodel.cn', keyLocation: '控制台 → API Keys', pricing: '部分模型免费', freeTrial: 'GLM-4-Flash 免费调用' },
  qwen: { name: '通义千问', signupUrl: 'https://dashscope.aliyun.com', keyLocation: '控制台 → API-KEY 管理', pricing: '按量计费', freeTrial: '新用户有免费额度' },
  doubao: { name: '豆包', signupUrl: 'https://ark.cn-beijing.volces.com', keyLocation: '控制台 → API Keys', pricing: '按量计费', freeTrial: '新用户有免费额度' }
}

export function buildAIErrorMessage(errMsg: string, providerId = 'deepseek'): { type: string; title: string; detail: string; help: string; canRetry: boolean } {
  const p = PROVIDER_HELP[providerId] || PROVIDER_HELP.deepseek!
  if (errMsg.includes('API Key') || errMsg.includes('请先')) return { type: 'missing_key', title: `尚未配置 ${p.name} API Key`, detail: `使用 AI 功能前需要配置 ${p.name} 的 API Key。`, help: `📍 获取地址：${p.signupUrl}\n🔑 获取路径：${p.keyLocation}\n💰 价格：${p.pricing}\n🎁 ${p.freeTrial}\n\n获取 Key 后，在设置页面填入即可。`, canRetry: false }
  if (errMsg.includes('401') || errMsg.includes('Unauthorized')) return { type: 'invalid_key', title: 'API Key 无效', detail: '当前 API Key 无法通过验证。', help: `可能原因：\n1. Key 复制时多了空格\n2. Key 已被删除或过期\n3. 前往 ${p.signupUrl} 重新生成\n\n请检查设置并重新输入。`, canRetry: false }
  if (errMsg.includes('429') || errMsg.includes('rate')) return { type: 'rate_limited', title: '请求过于频繁', detail: 'API 暂时限制了请求。', help: '建议：稍等 30 秒后重试，或检查账户配额。', canRetry: true }
  if (errMsg.includes('timed out') || errMsg.includes('ECONNREFUSED')) return { type: 'network_error', title: '网络连接失败', detail: '无法连接到 AI 服务器。', help: '建议：检查网络连接，稍后重试。', canRetry: true }
  if (errMsg.includes('500') || errMsg.includes('502') || errMsg.includes('503')) return { type: 'server_error', title: `${p.name} 服务器异常`, detail: 'AI 服务暂时不可用。', help: '建议：稍等 1-2 分钟后重试。如持续出现，可切换到其他 AI 提供商。', canRetry: true }
  return { type: 'unknown', title: '请求失败', detail: errMsg.slice(0, 300), help: '请稍后重试。如持续出现，请切换其他 AI 提供商。', canRetry: true }
}
