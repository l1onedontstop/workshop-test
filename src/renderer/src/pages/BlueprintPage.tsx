import { useEffect, useState, useRef } from "react";
import { useAppStore } from "../stores/appStore";
import {
  Sparkles,
  Target,
  Map,
  User,
  BarChart3,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Play,
  Calendar,
  Lightbulb,
  CheckCircle2,
  ChevronLeft,
  Save,
} from "lucide-react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { Input, TextArea } from "../components/ui/Input";
import { SkeletonGrid } from "../components/ui/Skeleton";

interface BlueprintData {
  positioning?: {
    tagline: string;
    uniqueAngle: string;
    whyYou: string;
  };
  contentStrategy?: {
    pillars: Array<{
      name: string;
      ratio: number;
      description: string;
      example: string;
    }>;
    publishCadence: string;
    contentMix: string;
  };
  firstVideo?: {
    topic: string;
    angle: string;
    hook: string;
    why: string;
    difficulty: number;
    expectedPerformance: string;
  };
  roadmap?: {
    week1: string;
    week2: string;
    month1: string;
    month3: string;
  };
  persona?: {
    voice: string;
    visualStyle: string;
    dressCode: string;
    background: string;
  };
  metrics?: {
    northStar: string;
    vanityMetrics: string[];
    reviewCycle: string;
  };
  risks?: string[];
  nextActions?: Array<{ action: string; priority: string; link: string }>;
}

interface BlueprintPageProps {
  answers?: Record<string, string>;
  onBack: () => void;
  onNavigate?: (page: string) => void;
  onWriteScript?: (topic: string, hook?: string) => void;
}

// ── Section config for Table of Contents ──
interface SectionMeta {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  visible: boolean;
}

export default function BlueprintPage({
  answers,
  onBack,
  onNavigate,
  onWriteScript,
}: BlueprintPageProps) {
  const [blueprint, setBlueprint] = useState<BlueprintData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BlueprintData | null>(null);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [refining, setRefining] = useState(false);
  const [activeToc, setActiveToc] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const { activeProject } = useAppStore();

  useEffect(() => {
    if (answers) {
      generateBlueprint(answers);
    } else if (activeProject) {
      loadExistingBlueprint();
    }
  }, []);

  // Scroll-spy for TOC
  useEffect(() => {
    if (!contentRef.current || !blueprint) return;
    const sections = contentRef.current.querySelectorAll("[data-section]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveToc(entry.target.getAttribute("data-section") || "");
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [blueprint, loading]);

  function scrollToSection(id: string) {
    const el = contentRef.current?.querySelector(`[data-section="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function generateBlueprint(a: Record<string, string>) {
    setLoading(true);
    setError("");
    try {
      const result = await window.api.ipStrategyGenerate(a, activeProject?.path);
      const data = result as BlueprintData & { success?: boolean; error?: string };
      if (data && data.success !== false) {
        setBlueprint(data);
        if (activeProject) {
          try {
            await window.api.ipStrategySave(activeProject.path, data);
          } catch {}
        }
      } else {
        setError((data as any)?.error || "生成蓝图失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成蓝图失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function loadExistingBlueprint() {
    if (!activeProject) return;
    setLoading(true);
    try {
      const result = await window.api.ipStrategyGet(activeProject.path);
      const data = result as BlueprintData;
      if (data?.positioning) {
        setBlueprint(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!activeProject || !blueprint) return;
    setSaving(true);
    try {
      await window.api.ipStrategySave(activeProject.path, blueprint);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
    } finally {
      setSaving(false);
    }
  }

  async function handleRefine() {
    if (!blueprint || !refineFeedback.trim() || refining) return;
    setRefining(true);
    setError("");
    try {
      const result = await window.api.ipStrategyRefine(blueprint, refineFeedback, answers || {});
      const data = result as BlueprintData & { success?: boolean; error?: string };
      if (data && data.success !== false) {
        setBlueprint(data);
        setRefineFeedback("");
        if (activeProject) {
          try {
            await window.api.ipStrategySave(activeProject.path, data);
          } catch {}
        }
      } else {
        setError((data as any)?.error || "优化蓝图失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "优化蓝图失败，请重试");
    } finally {
      setRefining(false);
    }
  }

  function handleStartEdit() {
    setDraft(blueprint ? JSON.parse(JSON.stringify(blueprint)) : null);
    setEditing(true);
  }

  function handleCancelEdit() {
    setEditing(false);
    setDraft(null);
  }

  async function handleSaveEdit() {
    if (!activeProject || !draft) return;
    setBlueprint(draft);
    setEditing(false);
    try {
      await window.api.ipStrategySave(activeProject.path, draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setDraft(null);
  }

  function updateDraft(path: string, value: any) {
    if (!draft) return;
    const keys = path.split(".");
    const next = JSON.parse(JSON.stringify(draft));
    let obj = next;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    setDraft(next);
  }

  const data = editing && draft ? draft : blueprint;

  // ── Loading state ──
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <Loader2 size={40} className="animate-spin text-brand-600 mx-auto mb-3" />
            <p className="text-ink-tertiary text-sm">AI 正在为你生成 IP 打造蓝图...</p>
            <p className="text-ink-disabled text-xs mt-2">分析定位 → 内容策略 → 行动计划</p>
          </div>
          <SkeletonGrid count={6} lines={3} />
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertTriangle size={40} className="text-danger-text/60 mx-auto mb-4" />
          <p className="text-ink-tertiary text-sm mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={onBack} icon={<ChevronLeft size={14} />}>
              返回
            </Button>
            {answers && (
              <Button variant="primary" onClick={() => generateBlueprint(answers)}>
                重试
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (!blueprint) {
    let canGenerate = false;
    const profileAnswers: Record<string, string> = {};
    if (activeProject?.opts) {
      const o = activeProject.opts as Record<string, string>;
      if (o.industry || o.targetAudience) {
        profileAnswers.industry = o.industry || "";
        profileAnswers.audience = o.targetAudience || "";
        profileAnswers.experience = o.contentExperience || "";
        profileAnswers.time = o.weeklyTime || "";
        profileAnswers.benchmark = o.benchmark || "";
        profileAnswers.contentType = o.contentType || "";
        profileAnswers.identity = o.identity || "";
        canGenerate = true;
      }
    }
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-sm">
          <Sparkles size={40} className="text-ink-disabled mx-auto mb-3" />
          <p className="text-ink-tertiary text-sm mb-1">暂无 IP 蓝图</p>
          <p className="text-ink-disabled text-xs mb-6">
            {canGenerate
              ? "你的项目信息已就绪，点击下方按钮为该项目生成 IP 蓝图"
              : "通过新建项目回答6个问题，AI将为你定制专属IP方案"}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={onBack} icon={<ChevronLeft size={14} />}>
              返回工作台
            </Button>
            {canGenerate && (
              <Button variant="primary" onClick={() => generateBlueprint(profileAnswers)} icon={<Sparkles size={14} />}>
                生成蓝图
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const {
    positioning,
    contentStrategy,
    firstVideo,
    roadmap,
    persona,
    metrics,
    risks,
    nextActions,
  } = data;

  // Build TOC sections
  const tocSections: SectionMeta[] = [
    { id: "positioning", title: "核心定位", icon: <Target size={14} />, color: "text-brand-600", visible: !!positioning },
    { id: "strategy", title: "内容策略", icon: <BarChart3 size={14} />, color: "text-success-text", visible: !!contentStrategy },
    { id: "firstVideo", title: "第一条视频", icon: <Play size={14} />, color: "text-brand-600", visible: !!firstVideo },
    { id: "roadmap", title: "路线图", icon: <Map size={14} />, color: "text-info-text", visible: !!roadmap },
    { id: "persona", title: "人设视觉", icon: <User size={14} />, color: "text-brand-600", visible: !!persona },
    { id: "metrics", title: "关键指标", icon: <BarChart3 size={14} />, color: "text-warning-text", visible: !!metrics },
    { id: "risks", title: "注意事项", icon: <AlertTriangle size={14} />, color: "text-warning-text", visible: !!(risks && risks.length > 0) },
    { id: "actions", title: "下一步", icon: <Lightbulb size={14} />, color: "text-success-text", visible: !!(nextActions && nextActions.length > 0) },
  ].filter((s) => s.visible);

  const inputClass = "w-full bg-black/[0.04] border border-rule rounded-lg px-3 py-2 text-sm text-ink-primary placeholder:text-ink-disabled transition-all duration-150 hover:border-rule-strong focus:outline-none focus:border-brand-500/50 focus:bg-black/[0.04] focus:ring-1 focus:ring-brand-500/20";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-app-bg/95 backdrop-blur-sm border-b border-rule px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} icon={<ChevronLeft size={16} />} />
            <div>
              <h1 className="text-lg font-bold text-ink-primary flex items-center gap-2">
                <Sparkles size={18} className="text-brand-600" />
                你的 IP 打造蓝图
              </h1>
              {positioning?.tagline && (
                <p className="text-xs text-ink-tertiary mt-0.5">{positioning.tagline}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button variant="secondary" onClick={handleCancelEdit}>取消</Button>
                <Button variant="primary" onClick={handleSaveEdit} disabled={!activeProject} icon={<CheckCircle2 size={16} />}>
                  确认保存
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={handleStartEdit}>编辑蓝图</Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving || !activeProject}
                  icon={saved ? <CheckCircle2 size={16} className="text-success-text" /> : <Save size={16} />}
                >
                  {saved ? "已保存" : "保存蓝图"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body with TOC */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto w-full space-y-8">
            {/* 1. 定位 */}
            {positioning && (
              <div data-section="positioning">
                <Card level="default" className="p-5">
                  <div className="flex items-center gap-2 mb-4 text-brand-600">
                    <div className="w-1 h-6 rounded-full bg-brand-500 shrink-0" />
                    <Target size={16} />
                    <h2 className="text-sm font-semibold">核心定位</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <InfoField label="一句话定位" value={positioning.tagline} highlight editing={editing} onChange={(v) => updateDraft("positioning.tagline", v)} />
                    <InfoField label="差异化角度" value={positioning.uniqueAngle} editing={editing} onChange={(v) => updateDraft("positioning.uniqueAngle", v)} textarea />
                    <InfoField label="为什么是你" value={positioning.whyYou} editing={editing} onChange={(v) => updateDraft("positioning.whyYou", v)} textarea />
                  </div>
                </Card>
              </div>
            )}

            {/* 2. 内容策略 */}
            {contentStrategy && (
              <div data-section="strategy">
                <Card level="default" className="p-5">
                  <div className="flex items-center gap-2 mb-4 text-success-text">
                    <div className="w-1 h-6 rounded-full bg-green-500 shrink-0" />
                    <BarChart3 size={16} />
                    <h2 className="text-sm font-semibold">内容策略</h2>
                  </div>
                  <div className="space-y-3">
                    {editing ? (
                      <div className="flex gap-4 text-xs mb-2">
                        <label className="flex items-center gap-1.5">
                          <span className="text-ink-tertiary">发布频率：</span>
                          <input
                            className={inputClass + " w-32 py-1.5"}
                            value={contentStrategy.publishCadence}
                            onChange={(e) => updateDraft("contentStrategy.publishCadence", e.target.value)}
                          />
                        </label>
                        <label className="flex items-center gap-1.5">
                          <span className="text-ink-tertiary">配比：</span>
                          <input
                            className={inputClass + " w-32 py-1.5"}
                            value={contentStrategy.contentMix}
                            onChange={(e) => updateDraft("contentStrategy.contentMix", e.target.value)}
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="flex gap-2 text-xs text-ink-tertiary mb-2">
                        <span>发布频率：{contentStrategy.publishCadence}</span>
                        <span className="text-ink-disabled">|</span>
                        <span>配比：{contentStrategy.contentMix}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-3">
                      {contentStrategy.pillars.map((pillar, i) => (
                        <div key={i} className="bg-black/[0.03] border border-rule rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            {editing ? (
                              <input
                                className={inputClass + " w-40 font-medium py-1.5"}
                                value={pillar.name}
                                onChange={(e) => {
                                  const pillars = [...contentStrategy.pillars];
                                  pillars[i] = { ...pillars[i], name: e.target.value };
                                  updateDraft("contentStrategy.pillars", pillars);
                                }}
                              />
                            ) : (
                              <span className="text-sm font-medium text-ink-primary">{pillar.name}</span>
                            )}
                            <Badge variant="info">
                              {editing ? (
                                <input
                                  type="number"
                                  className="w-10 bg-transparent text-center text-inherit focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={pillar.ratio}
                                  onChange={(e) => {
                                    const pillars = [...contentStrategy.pillars];
                                    pillars[i] = { ...pillars[i], ratio: Number(e.target.value) };
                                    updateDraft("contentStrategy.pillars", pillars);
                                  }}
                                />
                              ) : (
                                pillar.ratio
                              )}%
                            </Badge>
                          </div>
                          {editing ? (
                            <>
                              <textarea
                                className={inputClass + " mb-1 resize-y min-h-[60px] text-xs"}
                                value={pillar.description}
                                onChange={(e) => {
                                  const pillars = [...contentStrategy.pillars];
                                  pillars[i] = { ...pillars[i], description: e.target.value };
                                  updateDraft("contentStrategy.pillars", pillars);
                                }}
                              />
                              <input
                                className={inputClass + " text-xs text-ink-tertiary py-1.5"}
                                value={pillar.example}
                                placeholder="示例..."
                                onChange={(e) => {
                                  const pillars = [...contentStrategy.pillars];
                                  pillars[i] = { ...pillars[i], example: e.target.value };
                                  updateDraft("contentStrategy.pillars", pillars);
                                }}
                              />
                            </>
                          ) : (
                            <>
                              <p className="text-xs text-ink-tertiary mb-1">{pillar.description}</p>
                              <p className="text-xs text-ink-disabled italic">示例：{pillar.example}</p>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* 3. 第一条视频 */}
            {firstVideo && (
              <div data-section="firstVideo">
                <Card level="elevated" className={`p-5 ${editing ? 'border-brand-200' : ''}`}>
                  <div className="flex items-center gap-2 mb-4 text-brand-600">
                    <div className="w-1 h-6 rounded-full bg-brand-500 shrink-0" />
                    <Play size={16} />
                    <h2 className="text-sm font-semibold">第一条视频</h2>
                  </div>
                  <div className="space-y-3">
                    <InfoField label="选题" value={firstVideo.topic} editing={editing} onChange={(v) => updateDraft("firstVideo.topic", v)} />
                    <InfoField label="切入角度" value={firstVideo.angle} editing={editing} onChange={(v) => updateDraft("firstVideo.angle", v)} textarea />
                    <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
                      <p className="text-xs text-ink-tertiary mb-1">建议开场钩子</p>
                      {editing ? (
                        <TextArea
                          value={firstVideo.hook}
                          onChange={(e) => updateDraft("firstVideo.hook", e.target.value)}
                          className="min-h-[60px]"
                        />
                      ) : (
                        <p className="text-sm text-ink-primary leading-relaxed">「{firstVideo.hook}」</p>
                      )}
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="text-ink-tertiary">
                        难度：{" "}
                        {editing ? (
                          <input
                            type="number"
                            min={1}
                            max={3}
                            className={inputClass + " w-14 py-1 inline-block"}
                            value={firstVideo.difficulty}
                            onChange={(e) => updateDraft("firstVideo.difficulty", Number(e.target.value))}
                          />
                        ) : (
                          Array.from({ length: 3 }).map((_, i) => (
                            <span key={i} className={i < firstVideo.difficulty ? "text-warning-text" : "text-ink-disabled"}>★</span>
                          ))
                        )}
                      </span>
                      <span className="text-ink-tertiary">
                        预期：{" "}
                        {editing ? (
                          <input
                            className={inputClass + " w-24 py-1 inline-block"}
                            value={firstVideo.expectedPerformance}
                            onChange={(e) => updateDraft("firstVideo.expectedPerformance", e.target.value)}
                          />
                        ) : (
                          firstVideo.expectedPerformance
                        )}
                      </span>
                    </div>
                    <InfoField label="" value={firstVideo.why} editing={editing} onChange={(v) => updateDraft("firstVideo.why", v)} textarea />
                    {onWriteScript && !editing && (
                      <Button
                        variant="primary"
                        className="w-full mt-2"
                        icon={<Play size={14} />}
                        onClick={() => onWriteScript(firstVideo.topic, firstVideo.hook)}
                      >
                        用这个选题写脚本
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* 4. 路线图 */}
            {roadmap && (
              <div data-section="roadmap">
                <Card level="default" className="p-5">
                  <div className="flex items-center gap-2 mb-4 text-info-text">
                    <div className="w-1 h-6 rounded-full bg-cyan-500 shrink-0" />
                    <Map size={16} />
                    <h2 className="text-sm font-semibold">执行路线图</h2>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "第一周", value: roadmap.week1, path: "roadmap.week1", icon: <Calendar size={14} /> },
                      { label: "第二周", value: roadmap.week2, path: "roadmap.week2", icon: <Calendar size={14} /> },
                      { label: "第一个月", value: roadmap.month1, path: "roadmap.month1", icon: <Target size={14} /> },
                      { label: "三个月", value: roadmap.month3, path: "roadmap.month3", icon: <Sparkles size={14} /> },
                    ].map((step, i) => (
                      <Card key={i} level="subtle" className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-ink-disabled mt-0.5">{step.icon}</div>
                          <div className="flex-1">
                            <p className="text-xs text-ink-tertiary mb-1">{step.label}</p>
                            {editing ? (
                              <TextArea
                                value={step.value}
                                onChange={(e) => updateDraft(step.path, e.target.value)}
                                className="min-h-[50px]"
                              />
                            ) : (
                              <p className="text-sm text-ink-secondary">{step.value}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* 5. 人设 */}
            {persona && (
              <div data-section="persona">
                <Card level="default" className="p-5">
                  <div className="flex items-center gap-2 mb-4 text-brand-600">
                    <div className="w-1 h-6 rounded-full bg-pink-500 shrink-0" />
                    <User size={16} />
                    <h2 className="text-sm font-semibold">人设与视觉</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoField label="语言风格" value={persona.voice} editing={editing} onChange={(v) => updateDraft("persona.voice", v)} />
                    <InfoField label="视觉风格" value={persona.visualStyle} editing={editing} onChange={(v) => updateDraft("persona.visualStyle", v)} />
                    <InfoField label="着装建议" value={persona.dressCode} editing={editing} onChange={(v) => updateDraft("persona.dressCode", v)} />
                    <InfoField label="拍摄背景" value={persona.background} editing={editing} onChange={(v) => updateDraft("persona.background", v)} />
                  </div>
                </Card>
              </div>
            )}

            {/* 6. 指标 */}
            {metrics && (
              <div data-section="metrics">
                <Card level="default" className="p-5">
                  <div className="flex items-center gap-2 mb-4 text-warning-text">
                    <div className="w-1 h-6 rounded-full bg-amber-500 shrink-0" />
                    <BarChart3 size={16} />
                    <h2 className="text-sm font-semibold">关键指标</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <Card level="subtle" className="!bg-warning-surface !border-warning-border p-4">
                      <p className="text-xs text-ink-tertiary mb-1">北极星指标</p>
                      {editing ? (
                        <Input value={metrics.northStar} onChange={(e) => updateDraft("metrics.northStar", e.target.value)} className="text-lg font-bold" />
                      ) : (
                        <p className="text-lg font-bold text-ink-primary">{metrics.northStar}</p>
                      )}
                    </Card>
                    <div className="flex gap-3 flex-wrap">
                      {metrics.vanityMetrics.map((m, i) =>
                        editing ? (
                          <input
                            key={i}
                            className="text-xs px-3 py-1.5 rounded-full bg-black/[0.04] border border-rule text-ink-tertiary w-24 focus:outline-none focus:border-brand-500/50 focus:bg-black/[0.04] focus:ring-1 focus:ring-brand-500/20"
                            value={m}
                            onChange={(e) => {
                              const next = [...metrics.vanityMetrics];
                              next[i] = e.target.value;
                              updateDraft("metrics.vanityMetrics", next);
                            }}
                          />
                        ) : (
                          <Badge key={i}>{m}</Badge>
                        ),
                      )}
                    </div>
                    <InfoField label="复盘周期" value={metrics.reviewCycle} editing={editing} onChange={(v) => updateDraft("metrics.reviewCycle", v)} />
                  </div>
                </Card>
              </div>
            )}

            {/* 7. 风险 */}
            {risks && risks.length > 0 && (
              <div data-section="risks">
                <Card level="default" className="p-5">
                  <div className="flex items-center gap-2 mb-4 text-warning-text">
                    <div className="w-1 h-6 rounded-full bg-amber-500 shrink-0" />
                    <AlertTriangle size={16} />
                    <h2 className="text-sm font-semibold">注意事项</h2>
                  </div>
                  <div className="space-y-2">
                    {risks.map((risk, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-ink-tertiary">
                        <AlertTriangle size={14} className="text-warning-text/50 mt-0.5 shrink-0" />
                        {editing ? (
                          <div className="flex-1 flex gap-2">
                            <Input
                              value={risk}
                              onChange={(e) => {
                                const next = [...risks];
                                next[i] = e.target.value;
                                updateDraft("risks", next);
                              }}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="!text-danger-text/50 hover:!text-danger-text"
                              onClick={() => {
                                const next = risks.filter((_, j) => j !== i);
                                updateDraft("risks", next);
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        ) : (
                          risk
                        )}
                      </div>
                    ))}
                    {editing && (
                      <Button variant="ghost" size="sm" onClick={() => { const next = [...risks, ""]; updateDraft("risks", next); }}>
                        + 添加风险
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* 8. 下一步行动 */}
            {nextActions && nextActions.length > 0 && (
              <div data-section="actions">
                <Card level="default" className="p-5">
                  <div className="flex items-center gap-2 mb-4 text-success-text">
                    <div className="w-1 h-6 rounded-full bg-green-500 shrink-0" />
                    <Lightbulb size={16} />
                    <h2 className="text-sm font-semibold">下一步行动</h2>
                  </div>
                  <div className="space-y-2">
                    {nextActions.map((item, i) => {
                      const handleClick = () => {
                        if (editing || !onNavigate || !item.link) return;
                        const linkMap: Record<string, string> = {
                          "script-editor": "script-editor",
                          benchmark: "benchmark",
                          "topic-inspiration": "topic-inspiration",
                          "plan-list": "plan-list",
                        };
                        const target = linkMap[item.link];
                        if (target) onNavigate(target);
                      };
                      const isHigh = item.priority === "high";
                      return (
                        <button
                          key={i}
                          onClick={handleClick}
                          disabled={editing}
                          className={`w-full text-left flex items-center gap-3 rounded-xl p-4 border transition-all duration-150 ${
                            editing
                              ? "cursor-default"
                              : "hover:bg-black/[0.04] hover:border-rule hover:shadow-glow active:scale-[0.99]"
                          } ${
                            isHigh
                              ? "bg-success-surface border-success-border"
                              : "bg-black/[0.02] border-rule-subtle"
                          }`}
                        >
                          <ArrowRight size={16} className={isHigh ? "text-success-text" : "text-ink-tertiary"} />
                          <div className="flex-1">
                            {editing ? (
                              <div className="space-y-1">
                                <Input
                                  value={item.action}
                                  placeholder="行动"
                                  onChange={(e) => {
                                    const next = [...nextActions];
                                    next[i] = { ...next[i], action: e.target.value };
                                    updateDraft("nextActions", next);
                                  }}
                                />
                                <div className="flex gap-2">
                                  <Input
                                    value={item.link}
                                    placeholder="链接"
                                    className="flex-1 text-xs"
                                    onChange={(e) => {
                                      const next = [...nextActions];
                                      next[i] = { ...next[i], link: e.target.value };
                                      updateDraft("nextActions", next);
                                    }}
                                  />
                                  <select
                                    className="bg-black/[0.04] border border-rule rounded-lg px-2 py-2 text-xs text-ink-tertiary focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                                    value={item.priority}
                                    onChange={(e) => {
                                      const next = [...nextActions];
                                      next[i] = { ...next[i], priority: e.target.value };
                                      updateDraft("nextActions", next);
                                    }}
                                  >
                                    <option value="high">优先</option>
                                    <option value="medium">中等</option>
                                    <option value="low">一般</option>
                                  </select>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="!text-danger-text/50 hover:!text-danger-text"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const next = nextActions.filter((_, j) => j !== i);
                                      updateDraft("nextActions", next);
                                    }}
                                  >
                                    ×
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-ink-primary">{item.action}</p>
                                <p className="text-xs text-ink-disabled mt-0.5">
                                  点击前往：{item.link}
                                  {isHigh && <Badge variant="success" className="ml-2">优先</Badge>}
                                </p>
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    {editing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const next = [...nextActions, { action: "", priority: "medium", link: "" }];
                          updateDraft("nextActions", next);
                        }}
                      >
                        + 添加行动
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* 9. 优化蓝图 */}
            {!editing && (
              <Card level="elevated" className="p-5 !border-brand-200 !bg-brand-50">
                <div className="flex items-center gap-2 text-brand-600 mb-3">
                  <Sparkles size={18} />
                  <h2 className="text-sm font-semibold">优化蓝图</h2>
                </div>
                <div className="flex gap-3">
                  <Input
                    className="flex-1"
                    placeholder="例如：更激进一点、加更多案例、定位再细分..."
                    value={refineFeedback}
                    onChange={(e) => setRefineFeedback(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleRefine();
                      }
                    }}
                  />
                  <Button
                    variant="primary"
                    onClick={handleRefine}
                    disabled={refining || !refineFeedback.trim()}
                    loading={refining}
                    icon={refining ? undefined : <Sparkles size={14} />}
                  >
                    {refining ? "优化中..." : "重新生成"}
                  </Button>
                </div>
                {error && <p className="text-xs text-danger-text/60 mt-2">{error}</p>}
              </Card>
            )}

            <div className="h-8" />
          </div>
        </div>

        {/* TOC sidebar */}
        {tocSections.length > 1 && (
          <aside className="w-44 shrink-0 border-l border-rule-subtle bg-app-bg/50 overflow-y-auto p-4 hidden xl:block">
            <p className="text-[10px] font-medium text-ink-disabled uppercase tracking-wider mb-3">目录</p>
            <nav className="space-y-0.5">
              {tocSections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all duration-150 ${
                    activeToc === s.id
                      ? "bg-brand-50 text-brand-600 font-medium"
                      : "text-ink-tertiary hover:text-ink-secondary hover:bg-black/[0.04]"
                  }`}
                >
                  <span className={activeToc === s.id ? s.color : "text-ink-disabled"}>{s.icon}</span>
                  {s.title}
                </button>
              ))}
            </nav>
          </aside>
        )}
      </div>
    </div>
  );
}

// ── InfoField helper (replaces old InfoBlock) ──

function InfoField({
  label,
  value,
  highlight,
  editing,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  editing?: boolean;
  onChange?: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <div>
      {label && <p className="text-xs text-ink-disabled mb-1">{label}</p>}
      {editing && onChange ? (
        textarea ? (
          <TextArea value={value} onChange={(e) => onChange(e.target.value)} className="min-h-[80px]" />
        ) : (
          <Input value={value} onChange={(e) => onChange(e.target.value)} />
        )
      ) : highlight ? (
        <p className="text-ink-primary font-semibold text-base leading-relaxed">{value}</p>
      ) : (
        <p className="text-sm text-ink-secondary leading-relaxed">{value}</p>
      )}
    </div>
  );
}
