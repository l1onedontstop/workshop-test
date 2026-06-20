import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import Sidebar from './components/layout/Sidebar'
import TitleBar from './components/layout/TitleBar'
import ErrorBoundary from './components/ErrorBoundary'
import WelcomePage from './pages/WelcomePage'
import ProjectPage from './pages/ProjectPage'
import ScriptEditorPage from './pages/ScriptEditorPage'
import TopicInspirationPage from './pages/TopicInspirationPage'
import PublishPage from './pages/PublishPage'
import RetroPage from './pages/RetroPage'
import SettingsPage from './pages/SettingsPage'
import PlanListPage from './pages/PlanListPage'
import PlanEditorPage from './pages/PlanEditorPage'
import BenchmarkPage from './pages/BenchmarkPage'
import TopicPoolPage from './pages/TopicPoolPage'
import PersonaPage from './pages/PersonaPage'
import DashboardPage from './pages/DashboardPage'
import BlueprintPage from './pages/BlueprintPage'
import TrendMatchPage from './pages/TrendMatchPage'
import { useAppStore } from './stores/appStore'

type Page =
  | 'welcome'
  | 'project'
  | 'script-editor'
  | 'topic-inspiration'
  | 'publish'
  | 'retro'
  | 'settings'
  | 'plan-list'
  | 'plan-editor'
  | 'benchmark'
  | 'topic-pool'
  | 'persona'
  | 'dashboard'
  | 'blueprint'
  | 'trend-match'

export default function App() {
  const [page, setPage] = useState<Page>('welcome')
  const [pendingTopic, setPendingTopic] = useState<string | undefined>(undefined)
  const [pendingHook, setPendingHook] = useState<string | undefined>(undefined)
  const [pendingPlanId, setPendingPlanId] = useState<string | undefined>(undefined)
  const [pendingScriptFile, setPendingScriptFile] = useState<string | undefined>(undefined)
  const [scriptEditorReturnTo, setScriptEditorReturnTo] = useState<'project' | 'plan-editor'>('project')
  const [blueprintAnswers, setBlueprintAnswers] = useState<Record<string, string> | undefined>(undefined)
  const { projects, loadProjects, activeProject, setActiveProject } = useAppStore()
  const prevPage = useRef<Page>('welcome')
  const suppressAutoNavRef = useRef(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => { prevPage.current = page }, [page])

  useEffect(() => {
    loadProjects().finally(() => setInitialLoading(false))
  }, [])

  // Auto-navigate: only when coming from welcome and NOT suppressed
  useEffect(() => {
    if (suppressAutoNavRef.current) return
    if (projects.length === 0) {
      setPage('welcome')
    } else if (prevPage.current === 'welcome') {
      if (!activeProject) setActiveProject(projects[0].id)
      setPage('project')
    }
  }, [projects, activeProject])

  const handleNavigate = (target: Page) => {
    // Navigate to existing project pages requires activeProject check
    if (target === 'project') suppressAutoNavRef.current = false
    setPage(target)
  }

  const handleNewProject = () => {
    suppressAutoNavRef.current = true
    setPage('welcome')
  }

  const showSidebar =
    page !== 'welcome' &&
    page !== 'script-editor' &&
    page !== 'topic-inspiration' &&
    page !== 'publish' &&
    page !== 'retro' &&
    page !== 'plan-editor' &&
    page !== 'benchmark' &&
    page !== 'topic-pool' &&
    page !== 'persona' &&
    page !== 'dashboard' &&
    page !== 'trend-match'

  if (initialLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-app-bg">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-white/20" />
          <p className="text-white/30 text-sm">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-app-bg text-white overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 pt-12">
        {showSidebar && (
          <Sidebar currentPage={page} onNavigate={handleNavigate} onNewProject={handleNewProject} />
        )}
        <ErrorBoundary>
          <main className="flex-1 overflow-hidden">
          {page === 'welcome' && (
            <WelcomePage
              onCreated={() => { suppressAutoNavRef.current = true }}
              onBack={projects.length > 0 ? () => { suppressAutoNavRef.current = false; setPage('project') } : undefined}
              onSkip={() => { suppressAutoNavRef.current = false; setPage('project') }}
              onNavigateToBenchmark={() => { suppressAutoNavRef.current = false; setPage('benchmark') }}
              onNavigateToScript={() => { suppressAutoNavRef.current = false; setPage('script-editor') }}
              onNavigateToPlan={() => { suppressAutoNavRef.current = false; setPage('plan-list') }}
              onNavigateToTopics={() => { suppressAutoNavRef.current = false; setPage('topic-inspiration') }}
              onNavigateToBlueprint={(answers) => { setBlueprintAnswers(answers); setPage('blueprint') }}
            />
          )}
          {page === 'project' && (
            <ProjectPage
              onNewScript={() => setPage('script-editor')}
              onTopicInspiration={() => setPage('topic-inspiration')}
              onPublish={() => setPage('publish')}
              onRetro={() => setPage('retro')}
              onPlans={() => setPage('plan-list')}
              onNewProject={handleNewProject}
              onNavigateToPlan={(planId) => { setPendingPlanId(planId); setPage('plan-editor') }}
              onNavigateToScript={() => setPage('script-editor')}
              onNavigateToRetro={() => setPage('retro')}
              onNavigateToBlueprint={() => { setBlueprintAnswers(undefined); setPage('blueprint') }}
            />
          )}
          {page === 'script-editor' && (
            <ScriptEditorPage
              onBack={() => {
                setPendingTopic(undefined)
                setPendingHook(undefined)
                setPendingScriptFile(undefined)
                setPage(scriptEditorReturnTo)
              }}
              initialTopic={pendingTopic}
              initialHook={pendingHook}
              initialScriptFile={pendingScriptFile}
            />
          )}
          {page === 'topic-inspiration' && (
            <TopicInspirationPage
              onBack={() => setPage('project')}
              onWriteScript={(topic) => { setPendingTopic(topic); setScriptEditorReturnTo('project'); setPage('script-editor') }}
            />
          )}
          {page === 'publish' && <PublishPage onBack={() => setPage('project')} />}
          {page === 'retro' && <RetroPage onBack={() => setPage('project')} />}
          {page === 'plan-list' && (
            <PlanListPage
              onBack={() => setPage('project')}
              onOpenPlan={(planId) => { setPendingPlanId(planId); setPage('plan-editor') }}
            />
          )}
          {page === 'plan-editor' && pendingPlanId && (
            <PlanEditorPage
              onBack={() => { setPendingPlanId(undefined); setPage('plan-list') }}
              planId={pendingPlanId}
              onNavigateToScript={(scriptFile?: string) => {
                setPendingScriptFile(scriptFile)
                setScriptEditorReturnTo('plan-editor')
                setPage('script-editor')
              }}
            />
          )}
          {page === 'benchmark' && <BenchmarkPage onBack={() => setPage('project')} />}
          {page === 'topic-pool' && (
            <TopicPoolPage
              onBack={() => setPage('project')}
              onWriteScript={(topic) => { setPendingTopic(topic); setScriptEditorReturnTo('project'); setPage('script-editor') }}
            />
          )}
          {page === 'persona' && <PersonaPage onBack={() => setPage('project')} />}
          {page === 'dashboard' && <DashboardPage onBack={() => setPage('project')} />}
          {page === 'trend-match' && (
            <TrendMatchPage
              onBack={() => setPage('project')}
              onWriteScript={(topic) => { setPendingTopic(topic); setScriptEditorReturnTo('project'); setPage('script-editor') }}
            />
          )}
          {page === 'blueprint' && (
            <BlueprintPage
              answers={blueprintAnswers}
              onBack={() => { setBlueprintAnswers(undefined); setPage('project') }}
              onNavigate={(target) => {
                suppressAutoNavRef.current = false
                setPage(target as Page)
              }}
              onWriteScript={(topic, hook) => {
                setPendingTopic(topic)
                setPendingHook(hook)
                setScriptEditorReturnTo('project')
                setPage('script-editor')
              }}
            />
          )}
          {page === 'settings' && <SettingsPage onBack={() => setPage('project')} />}
        </main>
        </ErrorBoundary>
      </div>
    </div>
  )
}
