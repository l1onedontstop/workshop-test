import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, FileText, Play, Heart, MessageCircle, Loader2, AlertTriangle } from 'lucide-react'
import BackButton from '../components/ui/BackButton'
import Card from '../components/ui/Card'

export default function DashboardPage({ onBack }: { onBack: () => void }) {
  const [overview, setOverview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setError('')
    setLoading(true)
    try {
      const ov = await window.api.dashboardOverview()
      setOverview(ov)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载看板数据失败')
    } finally { setLoading(false) }
  }

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-ink-disabled" size={32} /></div>

  if (error) {
    return (
      <div className="h-full flex flex-col p-6 overflow-y-auto">
        <div className="flex items-center gap-4 mb-8">
          <BackButton onClick={onBack} />
          <h1 className="text-xl font-bold text-white">数据看板</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
          <AlertTriangle size={32} className="text-danger-text/60" />
          <div>
            <p className="text-ink-secondary text-sm mb-1">加载失败</p>
            <p className="text-ink-tertiary text-xs max-w-md">{error}</p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-lg bg-black/[0.06] hover:bg-black/[0.10] text-ink-secondary text-sm transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center gap-4 mb-8">
        <BackButton onClick={onBack} />
        <h1 className="text-xl font-bold text-white">数据看板</h1>
        <span className="text-xs text-ink-tertiary">自动聚合所有项目数据</span>
      </div>

      {overview ? (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: '项目数', value: overview.totalProjects, icon: FileText, color: 'text-info-text' },
              { label: '脚本数', value: overview.totalScripts, icon: FileText, color: 'text-success-text' },
              { label: '已发布', value: overview.totalPublished, icon: Play, color: 'text-brand-600' },
              { label: '总播放', value: overview.totalPlays?.toLocaleString(), icon: TrendingUp, color: 'text-warning-text' }
            ].map(c => (
              <Card key={c.label} level="default" className="p-4">
                <div className="flex items-center gap-2 mb-2"><c.icon size={16} className={c.color} /><span className="text-xs text-ink-tertiary">{c.label}</span></div>
                <div className="text-2xl font-bold text-white">{c.value || 0}</div>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: '点赞', value: overview.totalLikes?.toLocaleString(), icon: Heart, color: 'text-danger-text' },
              { label: '评论', value: overview.totalComments?.toLocaleString(), icon: MessageCircle, color: 'text-info-text' },
              { label: '平均分', value: overview.avgPredictedScore?.toFixed(1) + '/10', icon: BarChart3, color: 'text-warning-text' }
            ].map(c => (
              <Card key={c.label} level="default" className="p-4">
                <div className="flex items-center gap-2 mb-2"><c.icon size={16} className={c.color} /><span className="text-xs text-ink-tertiary">{c.label}</span></div>
                <div className="text-xl font-bold text-white">{c.value || 0}</div>
              </Card>
            ))}
          </div>
          {overview.projects?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-ink-secondary mb-3">项目列表</h3>
              {overview.projects.map((p: any) => (
                <div key={p.name} className="flex items-center justify-between p-3 rounded-lg bg-black/[0.02] border border-rule-subtle mb-2">
                  <span className="text-sm text-ink-secondary">{p.name}</span>
                  <div className="flex gap-4 text-xs text-ink-tertiary">
                    <span>📝 {p.totalPredicted || 0}</span>
                    <span>📤 {p.totalPublished || 0}</span>
                    <span>▶️ {(p.totalPlays || 0).toLocaleString()}</span>
                    <span>⭐ {p.avgScore?.toFixed(1) || '0.0'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-ink-tertiary">暂无数据，创建项目并发布视频后这里会自动聚合</div>
      )}
    </div>
  )
}
