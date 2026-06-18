import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, FileText, Play, Heart, MessageCircle, Target, Loader2 } from 'lucide-react'

export default function DashboardPage({ onBack }: { onBack: () => void }) {
  const [overview, setOverview] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const ov = await window.api.dashboardOverview()
      setOverview(ov)
    } catch {} finally { setLoading(false) }
  }

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-white/20" size={32} /></div>

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/5 text-white/40">←</button>
        <h1 className="text-xl font-bold text-white">数据看板</h1>
        <span className="text-xs text-white/30">自动聚合所有项目数据</span>
      </div>

      {overview ? (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: '项目数', value: overview.totalProjects, icon: FileText, color: 'text-blue-400' },
              { label: '脚本数', value: overview.totalScripts, icon: Target, color: 'text-green-400' },
              { label: '已发布', value: overview.totalPublished, icon: Play, color: 'text-purple-400' },
              { label: '总播放', value: overview.totalPlays?.toLocaleString(), icon: TrendingUp, color: 'text-orange-400' }
            ].map(c => (
              <div key={c.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2"><c.icon size={16} className={c.color} /><span className="text-xs text-white/40">{c.label}</span></div>
                <div className="text-2xl font-bold text-white">{c.value || 0}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: '点赞', value: overview.totalLikes?.toLocaleString(), icon: Heart, color: 'text-red-400' },
              { label: '评论', value: overview.totalComments?.toLocaleString(), icon: MessageCircle, color: 'text-cyan-400' },
              { label: '平均分', value: overview.avgPredictedScore?.toFixed(1) + '/10', icon: BarChart3, color: 'text-yellow-400' }
            ].map(c => (
              <div key={c.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2"><c.icon size={16} className={c.color} /><span className="text-xs text-white/40">{c.label}</span></div>
                <div className="text-xl font-bold text-white">{c.value || 0}</div>
              </div>
            ))}
          </div>
          {overview.projects?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-white/50 mb-3">项目列表</h3>
              {overview.projects.map((p: any) => (
                <div key={p.name} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] mb-2">
                  <span className="text-sm text-white/70">{p.name}</span>
                  <div className="flex gap-4 text-xs text-white/30">
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
        <div className="text-center py-12 text-white/30">暂无数据，创建项目并发布视频后这里会自动聚合</div>
      )}
    </div>
  )
}
