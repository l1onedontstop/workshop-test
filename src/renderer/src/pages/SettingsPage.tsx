import {
  Cpu,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  ExternalLink,
  Trash2,
  AlertTriangle,
  BarChart3 as BarChartIcon
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import BackButton from '../components/ui/BackButton'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { Input } from '../components/ui/Input'

function PipelineParamValue({ settingKey, defaultValue }: { settingKey: string; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    let cancelled = false
    window.api.getSetting(settingKey).then((v) => {
      if (!cancelled && v != null) setValue(String(v))
    }).catch(() => { /* use default */ })
    return () => { cancelled = true }
  }, [settingKey])

  return (
    <span className="px-3 py-1.5 rounded-lg bg-black/[0.04] border border-rule text-sm text-ink-secondary font-mono">
      {value}
    </span>
  )
}

const PROVIDERS = [
  { id: 'deepseek', label: 'DeepSeek', desc: '性价比极高，中文能力强，约 ¥1/百万token' },
  { id: 'openai', label: 'OpenAI', desc: '综合能力最强，约 ¥15/百万token' },
  { id: 'anthropic', label: 'Anthropic (Claude)', desc: '分析和写作最细腻，约 ¥15/百万token' },
  { id: 'kimi', label: 'Kimi (月之暗面)', desc: '长文本处理出色，128k上下文' },
  { id: 'zhipu', label: '智谱 GLM', desc: '国内合规首选，企业级稳定' },
  { id: 'qwen', label: '通义千问', desc: '阿里系生态，中文理解好' },
  { id: 'doubao', label: '豆包 (字节)', desc: '高并发低延迟，性价比好' }
] as const

export default function SettingsPage({ onBack }: { onBack?: () => void }) {
  const {
    aiProvider,
    deepseekKey,
    openaiKey,
    anthropicKey,
    kimiKey,
    zhipuKey,
    qwenKey,
    doubaoKey,
    setAIProvider,
    setProviderKey,
    loadSettings
  } = useAppStore()

  const [keyInput, setKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [crossModelAudit, setCrossModelAudit] = useState(false)

  const activeProject = useAppStore((s) => s.activeProject)
  const refreshActiveProject = useAppStore((s) => s.refreshActiveProject)

  const handleReset = async () => {
    if (!activeProject || !resetConfirm) return
    setResetting(true)
    try {
      await window.api.resetProject(activeProject.path)
      await refreshActiveProject()
      setResetConfirm(false)
    } catch (err) {
      console.error('Reset failed:', err)
    } finally {
      setResetting(false)
    }
  }

  const currentProvider = PROVIDERS.find((p) => p.id === aiProvider) || PROVIDERS[0]
  const keyMap: Record<string, string> = {
    deepseek: deepseekKey,
    openai: openaiKey,
    anthropic: anthropicKey,
    kimi: kimiKey,
    zhipu: zhipuKey,
    qwen: qwenKey,
    doubao: doubaoKey
  }
  const currentKey = keyMap[aiProvider] || ''

  const placeholderMap: Record<string, string> = {
    deepseek: 'sk-...',
    openai: 'sk-proj-...',
    anthropic: 'sk-ant-api03-...',
    kimi: 'sk-...',
    zhipu: '...',
    qwen: 'sk-...',
    doubao: '...'
  }

  const linkMap: Record<string, string> = {
    deepseek: 'https://platform.deepseek.com/',
    openai: 'https://platform.openai.com/api-keys',
    anthropic: 'https://console.anthropic.com/',
    kimi: 'https://platform.moonshot.cn/',
    zhipu: 'https://open.bigmodel.cn/',
    qwen: 'https://dashscope.aliyun.com/',
    doubao: 'https://console.volcengine.com/ark/'
  }

  useEffect(() => {
    loadSettings()
    window.api.getSetting('cross_model_audit').then((v) => {
      if (typeof v === 'boolean') setCrossModelAudit(v)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setKeyInput(currentKey)
  }, [currentKey, aiProvider])

  const handleSave = async () => {
    await setProviderKey(aiProvider, keyInput.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {onBack && (
        <BackButton onClick={onBack} />
      )}
      <h1 className="text-2xl font-bold text-white mb-2">设置</h1>
      <p className="text-ink-tertiary text-sm mb-8">配置 AI 引擎和 API 密钥</p>

      {/* Provider selection */}
      <Card level="default" className="p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-brand-50">
            <Cpu size={20} className="text-brand-600" />
          </div>
          <div>
            <h2 className="text-white font-medium">AI 引擎</h2>
            <p className="text-ink-tertiary text-xs mt-0.5">
              选择底层大模型提供商，支持 7 个主流平台
            </p>
          </div>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {PROVIDERS.map((p) => {
            const isActive = aiProvider === p.id
            return (
              <Button
                key={p.id}
                variant="ghost"
                onClick={() => setAIProvider(p.id)}
                className={`w-full !justify-start !text-left !p-3.5 !rounded-xl !font-normal ${
                  isActive
                    ? '!border-brand-200 !bg-brand-50'
                    : '!border-rule !bg-black/[0.02] hover:!border-rule'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span
                      className={`text-sm font-medium ${isActive ? 'text-brand-500' : 'text-ink-secondary'}`}
                    >
                      {p.label}
                    </span>
                    <span className="text-xs text-ink-disabled ml-2">{p.desc}</span>
                  </div>
                  {isActive && (
                    <Badge variant="info">当前</Badge>
                  )}
                </div>
              </Button>
            )
          })}
        </div>
      </Card>

      {/* API Key */}
      <Card level="elevated" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-brand-50">
            <Key size={20} className="text-brand-600" />
          </div>
          <div>
            <h2 className="text-white font-medium">{currentProvider.label} API Key</h2>
            <p className="text-ink-tertiary text-xs mt-0.5">
              密钥仅存储在本地，不上传任何服务器
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder={placeholderMap[aiProvider] || '请输入 API Key'}
              className="pr-10"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 !p-1"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </Button>
          </div>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!keyInput.trim() || keyInput === currentKey}
            icon={saved ? <CheckCircle size={16} /> : undefined}
          >
            {saved ? '已保存' : '保存'}
          </Button>
        </div>

        <a
          href={linkMap[aiProvider]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-ink-disabled hover:text-brand-600 transition-colors mt-3"
        >
          前往 {currentProvider.label} 平台申请 Key
          <ExternalLink size={12} />
        </a>
      </Card>

      {/* Data Management */}
      {activeProject && (
        <Card className="mt-4 !border-danger-border/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-danger-surface">
              <Trash2 size={20} className="text-danger-text" />
            </div>
            <div>
              <h2 className="text-white font-medium">数据管理</h2>
              <p className="text-ink-tertiary text-xs mt-0.5">
                清除当前项目的所有脚本和预测数据，此操作不可恢复
              </p>
            </div>
          </div>

          {resetConfirm ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-danger-surface border border-danger-border">
                <AlertTriangle size={16} className="text-danger-text shrink-0" />
                <p className="text-xs text-danger-text">
                  确认要清空「{activeProject.name}」的所有脚本和预测数据吗？此操作不可恢复。
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  onClick={handleReset}
                  disabled={resetting}
                  loading={resetting}
                >
                  {resetting ? '清空中...' : '确认清空'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setResetConfirm(false)}
                  disabled={resetting}
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setResetConfirm(true)}
              icon={<Trash2 size={14} />}
            >
              重置项目数据
            </Button>
          )}
        </Card>
      )}

      {/* Pipeline Configuration */}
      {activeProject && (
        <Card className="mt-4 p-6">
          <h2 className="text-white font-medium mb-4 flex items-center gap-2">
            <BarChartIcon size={18} className="text-ink-tertiary" />
            管道参数
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink-secondary">跨模型审核</p>
                <p className="text-xs text-ink-disabled mt-0.5">用不同 AI 模型独立打分，减少单模型偏差</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={crossModelAudit}
                  onChange={async () => {
                    const next = !crossModelAudit
                    setCrossModelAudit(next)
                    await window.api.setSetting('cross_model_audit', next)
                  }}
                />
                <div className="w-9 h-5 bg-black/[0.04] peer-checked:bg-brand-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink-secondary">复盘等待天数 (RETRO_WINDOW_DAYS)</p>
                <p className="text-xs text-ink-disabled mt-0.5">发布后多少天才能进行复盘，默认 3 天</p>
              </div>
              <PipelineParamValue settingKey="retro_window_days" defaultValue="3" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink-secondary">Buffer 黄色预警 (BUFFER_WARNING_LOW)</p>
                <p className="text-xs text-ink-disabled mt-0.5">库存低于此值显示黄色警告，默认 2</p>
              </div>
              <PipelineParamValue settingKey="buffer_warning_low" defaultValue="2" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink-secondary">最小校准样本 (MIN_SAMPLES_FOR_BUMP)</p>
                <p className="text-xs text-ink-disabled mt-0.5">至少需要多少次复盘才能升级 rubric，默认 5</p>
              </div>
              <PipelineParamValue settingKey="min_samples_for_bump" defaultValue="5" />
            </div>
          </div>
        </Card>
      )}

      {/* About */}
      <Card className="mt-4 p-6">
        <h2 className="text-white font-medium mb-3">关于 SparkForge</h2>
        <div className="space-y-2 text-sm text-ink-tertiary">
          <p>版本：1.0.0</p>
          <p>基于 cheat-on-content 方法论构建</p>
          <p>所有数据存储在本地，不经过任何第三方服务器</p>
        </div>
      </Card>
    </div>
  )
}
