import { useEffect, useState } from "react";
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
  const { activeProject } = useAppStore();

  useEffect(() => {
    if (answers) {
      generateBlueprint(answers);
    } else if (activeProject) {
      loadExistingBlueprint();
    }
  }, []);

  async function generateBlueprint(a: Record<string, string>) {
    setLoading(true);
    setError("");
    try {
      const result = await window.api.ipStrategyGenerate(a);
      const data = result as BlueprintData & {
        success?: boolean;
        error?: string;
      };
      if (data && data.success !== false) {
        setBlueprint(data);
        // Auto-save after successful generation
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
      const result = await window.api.ipStrategyRefine(
        blueprint,
        refineFeedback,
        answers || {},
      );
      const data = result as BlueprintData & {
        success?: boolean;
        error?: string;
      };
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2
            size={48}
            className="animate-spin text-brand-400 mx-auto mb-4"
          />
          <p className="text-white/60 text-sm">
            AI 正在为你生成 IP 打造蓝图...
          </p>
          <p className="text-white/25 text-xs mt-2">
            分析定位 → 内容策略 → 行动计划
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertTriangle size={40} className="text-red-400/60 mx-auto mb-4" />
          <p className="text-white/60 text-sm mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm"
            >
              <ChevronLeft size={14} className="inline mr-1" />
              返回
            </button>
            {answers && (
              <button
                onClick={() => generateBlueprint(answers)}
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm"
              >
                重试
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Sparkles size={40} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/40 text-sm">暂无 IP 蓝图</p>
          <button
            onClick={onBack}
            className="mt-3 text-sm text-brand-400 hover:text-brand-300"
          >
            返回工作台
          </button>
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

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0f0f13]/95 backdrop-blur-sm border-b border-white/[0.06] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/60"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-brand-400" />
                你的 IP 打造蓝图
              </h1>
              {positioning?.tagline && (
                <p className="text-xs text-white/40 mt-0.5">
                  {positioning.tagline}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!activeProject}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm disabled:opacity-40 transition-colors"
                >
                  <CheckCircle2 size={16} />
                  确认保存
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm border border-white/10 transition-colors"
                >
                  编辑蓝图
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !activeProject}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/20 text-brand-300 text-sm disabled:opacity-40 transition-colors"
                >
                  {saved ? (
                    <CheckCircle2 size={16} className="text-green-400" />
                  ) : (
                    <Save size={16} />
                  )}
                  {saved ? "已保存" : "保存蓝图"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-4xl mx-auto w-full">
        {/* 1. 定位 */}
        {positioning && (
          <Section
            icon={<Target size={18} />}
            title="核心定位"
            color="text-brand-400"
          >
            <div className="grid grid-cols-1 gap-4">
              <InfoBlock
                label="一句话定位"
                value={positioning.tagline}
                highlight
                editing={editing}
                onChange={(v) => updateDraft("positioning.tagline", v)}
              />
              <InfoBlock
                label="差异化角度"
                value={positioning.uniqueAngle}
                editing={editing}
                onChange={(v) => updateDraft("positioning.uniqueAngle", v)}
                textarea
              />
              <InfoBlock
                label="为什么是你"
                value={positioning.whyYou}
                editing={editing}
                onChange={(v) => updateDraft("positioning.whyYou", v)}
                textarea
              />
            </div>
          </Section>
        )}

        {/* 2. 内容策略 */}
        {contentStrategy && (
          <Section
            icon={<BarChart3 size={18} />}
            title="内容策略"
            color="text-green-400"
          >
            <div className="space-y-3">
              {editing ? (
                <div className="flex gap-4 text-xs mb-2">
                  <label className="flex items-center gap-1.5">
                    <span className="text-white/40">发布频率：</span>
                    <input
                      className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white/70 w-32 focus:outline-none focus:border-brand-500/50"
                      value={contentStrategy.publishCadence}
                      onChange={(e) =>
                        updateDraft(
                          "contentStrategy.publishCadence",
                          e.target.value,
                        )
                      }
                    />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className="text-white/40">配比：</span>
                    <input
                      className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white/70 w-32 focus:outline-none focus:border-brand-500/50"
                      value={contentStrategy.contentMix}
                      onChange={(e) =>
                        updateDraft(
                          "contentStrategy.contentMix",
                          e.target.value,
                        )
                      }
                    />
                  </label>
                </div>
              ) : (
                <div className="flex gap-2 text-xs text-white/40 mb-2">
                  <span>发布频率：{contentStrategy.publishCadence}</span>
                  <span className="text-white/20">|</span>
                  <span>配比：{contentStrategy.contentMix}</span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3">
                {contentStrategy.pillars.map((pillar, i) => (
                  <div
                    key={i}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      {editing ? (
                        <input
                          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white font-medium w-40 focus:outline-none focus:border-brand-500/50"
                          value={pillar.name}
                          onChange={(e) => {
                            const pillars = [...contentStrategy.pillars];
                            pillars[i] = {
                              ...pillars[i],
                              name: e.target.value,
                            };
                            updateDraft("contentStrategy.pillars", pillars);
                          }}
                        />
                      ) : (
                        <span className="text-sm font-medium text-white">
                          {pillar.name}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400">
                        {editing ? (
                          <input
                            type="number"
                            className="w-12 bg-transparent text-center text-brand-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={pillar.ratio}
                            onChange={(e) => {
                              const pillars = [...contentStrategy.pillars];
                              pillars[i] = {
                                ...pillars[i],
                                ratio: Number(e.target.value),
                              };
                              updateDraft("contentStrategy.pillars", pillars);
                            }}
                          />
                        ) : (
                          pillar.ratio
                        )}
                        %
                      </span>
                    </div>
                    {editing ? (
                      <>
                        <textarea
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 mb-1 resize-y min-h-[60px] focus:outline-none focus:border-brand-500/50"
                          value={pillar.description}
                          onChange={(e) => {
                            const pillars = [...contentStrategy.pillars];
                            pillars[i] = {
                              ...pillars[i],
                              description: e.target.value,
                            };
                            updateDraft("contentStrategy.pillars", pillars);
                          }}
                        />
                        <input
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/40 focus:outline-none focus:border-brand-500/50"
                          value={pillar.example}
                          placeholder="示例..."
                          onChange={(e) => {
                            const pillars = [...contentStrategy.pillars];
                            pillars[i] = {
                              ...pillars[i],
                              example: e.target.value,
                            };
                            updateDraft("contentStrategy.pillars", pillars);
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-white/40 mb-1">
                          {pillar.description}
                        </p>
                        <p className="text-xs text-white/25 italic">
                          示例：{pillar.example}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* 3. 第一条视频 */}
        {firstVideo && (
          <Section
            icon={<Play size={18} />}
            title="第一条视频"
            color="text-purple-400"
            highlight
          >
            <div className="space-y-3">
              <InfoBlock
                label="选题"
                value={firstVideo.topic}
                editing={editing}
                onChange={(v) => updateDraft("firstVideo.topic", v)}
              />
              <InfoBlock
                label="切入角度"
                value={firstVideo.angle}
                editing={editing}
                onChange={(v) => updateDraft("firstVideo.angle", v)}
                textarea
              />
              <div className="bg-brand-500/5 border border-brand-500/10 rounded-xl p-4">
                <p className="text-xs text-white/30 mb-1">建议开场钩子</p>
                {editing ? (
                  <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 resize-y min-h-[60px] focus:outline-none focus:border-brand-500/50"
                    value={firstVideo.hook}
                    onChange={(e) =>
                      updateDraft("firstVideo.hook", e.target.value)
                    }
                  />
                ) : (
                  <p className="text-sm text-white/80 leading-relaxed">
                    「{firstVideo.hook}」
                  </p>
                )}
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-white/40">
                  难度：
                  {editing ? (
                    <input
                      type="number"
                      min={1}
                      max={3}
                      className="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white/70 focus:outline-none focus:border-brand-500/50"
                      value={firstVideo.difficulty}
                      onChange={(e) =>
                        updateDraft(
                          "firstVideo.difficulty",
                          Number(e.target.value),
                        )
                      }
                    />
                  ) : (
                    Array.from({ length: 3 }).map((_, i) => (
                      <span
                        key={i}
                        className={
                          i < firstVideo.difficulty
                            ? "text-yellow-400"
                            : "text-white/15"
                        }
                      >
                        ★
                      </span>
                    ))
                  )}
                </span>
                <span className="text-white/30">
                  预期：
                  {editing ? (
                    <input
                      className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white/70 w-24 focus:outline-none focus:border-brand-500/50"
                      value={firstVideo.expectedPerformance}
                      onChange={(e) =>
                        updateDraft(
                          "firstVideo.expectedPerformance",
                          e.target.value,
                        )
                      }
                    />
                  ) : (
                    firstVideo.expectedPerformance
                  )}
                </span>
              </div>
              <InfoBlock
                label=""
                value={firstVideo.why}
                editing={editing}
                onChange={(v) => updateDraft("firstVideo.why", v)}
                textarea
              />
              {onWriteScript && !editing && (
                <button
                  onClick={() => onWriteScript(firstVideo.topic, firstVideo.hook)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/20 text-brand-300 text-sm font-medium transition-colors mt-2"
                >
                  <Play size={14} />
                  用这个选题写脚本
                </button>
              )}
            </div>
          </Section>
        )}

        {/* 4. 路线图 */}
        {roadmap && (
          <Section
            icon={<Map size={18} />}
            title="执行路线图"
            color="text-cyan-400"
          >
            <div className="space-y-3">
              {[
                {
                  label: "第一周",
                  value: roadmap.week1,
                  path: "roadmap.week1",
                  icon: <Calendar size={14} />,
                },
                {
                  label: "第二周",
                  value: roadmap.week2,
                  path: "roadmap.week2",
                  icon: <Calendar size={14} />,
                },
                {
                  label: "第一个月",
                  value: roadmap.month1,
                  path: "roadmap.month1",
                  icon: <Target size={14} />,
                },
                {
                  label: "三个月",
                  value: roadmap.month3,
                  path: "roadmap.month3",
                  icon: <Sparkles size={14} />,
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.04] rounded-xl p-4"
                >
                  <div className="text-white/20 mt-0.5">{step.icon}</div>
                  <div className="flex-1">
                    <p className="text-xs text-white/30 mb-1">{step.label}</p>
                    {editing ? (
                      <textarea
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 resize-y min-h-[50px] focus:outline-none focus:border-brand-500/50"
                        value={step.value}
                        onChange={(e) => updateDraft(step.path, e.target.value)}
                      />
                    ) : (
                      <p className="text-sm text-white/70">{step.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 5. 人设 */}
        {persona && (
          <Section
            icon={<User size={18} />}
            title="人设与视觉"
            color="text-pink-400"
          >
            <div className="grid grid-cols-2 gap-3">
              <InfoBlock
                label="语言风格"
                value={persona.voice}
                editing={editing}
                onChange={(v) => updateDraft("persona.voice", v)}
              />
              <InfoBlock
                label="视觉风格"
                value={persona.visualStyle}
                editing={editing}
                onChange={(v) => updateDraft("persona.visualStyle", v)}
              />
              <InfoBlock
                label="着装建议"
                value={persona.dressCode}
                editing={editing}
                onChange={(v) => updateDraft("persona.dressCode", v)}
              />
              <InfoBlock
                label="拍摄背景"
                value={persona.background}
                editing={editing}
                onChange={(v) => updateDraft("persona.background", v)}
              />
            </div>
          </Section>
        )}

        {/* 6. 指标 */}
        {metrics && (
          <Section
            icon={<BarChart3 size={18} />}
            title="关键指标"
            color="text-yellow-400"
          >
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4">
                <p className="text-xs text-white/30 mb-1">北极星指标</p>
                {editing ? (
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-lg font-bold text-white focus:outline-none focus:border-brand-500/50"
                    value={metrics.northStar}
                    onChange={(e) =>
                      updateDraft("metrics.northStar", e.target.value)
                    }
                  />
                ) : (
                  <p className="text-lg font-bold text-white">
                    {metrics.northStar}
                  </p>
                )}
              </div>
              <div className="flex gap-3 flex-wrap">
                {metrics.vanityMetrics.map((m, i) =>
                  editing ? (
                    <input
                      key={i}
                      className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 w-24 focus:outline-none focus:border-brand-500/50"
                      value={m}
                      onChange={(e) => {
                        const next = [...metrics.vanityMetrics];
                        next[i] = e.target.value;
                        updateDraft("metrics.vanityMetrics", next);
                      }}
                    />
                  ) : (
                    <span
                      key={i}
                      className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-white/50"
                    >
                      {m}
                    </span>
                  ),
                )}
              </div>
              <InfoBlock
                label="复盘周期"
                value={metrics.reviewCycle}
                editing={editing}
                onChange={(v) => updateDraft("metrics.reviewCycle", v)}
              />
            </div>
          </Section>
        )}

        {/* 7. 风险 */}
        {risks && risks.length > 0 && (
          <Section
            icon={<AlertTriangle size={18} />}
            title="注意事项"
            color="text-orange-400"
          >
            <div className="space-y-2">
              {risks.map((risk, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-sm text-white/50"
                >
                  <AlertTriangle
                    size={14}
                    className="text-orange-400/50 mt-0.5 shrink-0"
                  />
                  {editing ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 focus:outline-none focus:border-brand-500/50"
                        value={risk}
                        onChange={(e) => {
                          const next = [...risks];
                          next[i] = e.target.value;
                          updateDraft("risks", next);
                        }}
                      />
                      <button
                        className="p-1.5 rounded text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        onClick={() => {
                          const next = risks.filter((_, j) => j !== i);
                          updateDraft("risks", next);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    risk
                  )}
                </div>
              ))}
              {editing && (
                <button
                  className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 mt-2 transition-colors"
                  onClick={() => {
                    const next = [...risks, ""];
                    updateDraft("risks", next);
                  }}
                >
                  + 添加风险
                </button>
              )}
            </div>
          </Section>
        )}

        {/* 8. 下一步行动 */}
        {nextActions && nextActions.length > 0 && (
          <Section
            icon={<Lightbulb size={18} />}
            title="下一步行动"
            color="text-green-400"
          >
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
                return (
                  <button
                    key={i}
                    onClick={handleClick}
                    disabled={editing}
                    className={`w-full text-left flex items-center gap-3 rounded-xl p-4 border transition-colors ${
                      editing ? "cursor-default" : "hover:brightness-110"
                    } ${
                      item.priority === "high"
                        ? "bg-green-500/5 border-green-500/10"
                        : "bg-white/[0.02] border-white/[0.04]"
                    }`}
                  >
                    <ArrowRight
                      size={16}
                      className={
                        item.priority === "high"
                          ? "text-green-400"
                          : "text-white/30"
                      }
                    />
                    <div className="flex-1">
                      {editing ? (
                        <div className="space-y-1">
                          <input
                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white/80 focus:outline-none focus:border-brand-500/50"
                            value={item.action}
                            placeholder="行动"
                            onChange={(e) => {
                              const next = [...nextActions];
                              next[i] = { ...next[i], action: e.target.value };
                              updateDraft("nextActions", next);
                            }}
                          />
                          <div className="flex gap-2">
                            <input
                              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/40 focus:outline-none focus:border-brand-500/50"
                              value={item.link}
                              placeholder="链接"
                              onChange={(e) => {
                                const next = [...nextActions];
                                next[i] = { ...next[i], link: e.target.value };
                                updateDraft("nextActions", next);
                              }}
                            />
                            <select
                              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/50 focus:outline-none focus:border-brand-500/50"
                              value={item.priority}
                              onChange={(e) => {
                                const next = [...nextActions];
                                next[i] = {
                                  ...next[i],
                                  priority: e.target.value,
                                };
                                updateDraft("nextActions", next);
                              }}
                            >
                              <option value="high">优先</option>
                              <option value="medium">中等</option>
                              <option value="low">一般</option>
                            </select>
                            <button
                              className="p-1 rounded text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = nextActions.filter(
                                  (_, j) => j !== i,
                                );
                                updateDraft("nextActions", next);
                              }}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-white/80">{item.action}</p>
                          <p className="text-xs text-white/25 mt-0.5">
                            点击前往：{item.link}
                            {item.priority === "high" && (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px]">
                                优先
                              </span>
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
              {editing && (
                <button
                  className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 mt-2 transition-colors"
                  onClick={() => {
                    const next = [
                      ...nextActions,
                      { action: "", priority: "medium", link: "" },
                    ];
                    updateDraft("nextActions", next);
                  }}
                >
                  + 添加行动
                </button>
              )}
            </div>
          </Section>
        )}

        {/* 9. 优化蓝图 */}
        {!editing && (
          <div className="rounded-2xl border border-brand-500/15 bg-brand-500/[0.02] p-5">
            <div className="flex items-center gap-2 text-brand-400 mb-3">
              <Sparkles size={18} />
              <h2 className="text-sm font-semibold">优化蓝图</h2>
            </div>
            <div className="flex gap-3">
              <input
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-brand-500/50"
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
              <button
                onClick={handleRefine}
                disabled={refining || !refineFeedback.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm disabled:opacity-40 whitespace-nowrap transition-colors"
              >
                {refining ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    优化中...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    重新生成
                  </>
                )}
              </button>
            </div>
            {error && <p className="text-xs text-red-400/60 mt-2">{error}</p>}
          </div>
        )}

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}

// ── Helpers ──

function Section({
  icon,
  title,
  color,
  highlight,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${highlight ? "border-brand-500/15 bg-brand-500/[0.02]" : "border-white/[0.06] bg-white/[0.01]"}`}
    >
      <div className={`flex items-center gap-2 mb-4 ${color}`}>
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InfoBlock({
  label,
  value,
  highlight,
  editing,
  onChange,
  textarea,
  type,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  editing?: boolean;
  onChange?: (v: string) => void;
  textarea?: boolean;
  type?: string;
}) {
  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.07] transition-colors placeholder:text-white/15";

  return (
    <div>
      <p className="text-xs text-white/25 mb-1">{label}</p>
      {editing && onChange ? (
        textarea ? (
          <textarea
            className={inputClass + " min-h-[80px] resize-y"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            type={type || "text"}
            className={inputClass}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      ) : highlight ? (
        <p className="text-white font-semibold text-base leading-relaxed">
          {value}
        </p>
      ) : (
        <p className="text-sm text-white/70 leading-relaxed">{value}</p>
      )}
    </div>
  );
}
