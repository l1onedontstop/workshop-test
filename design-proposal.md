# SparkForge UI 全面升级设计方案

> **设计目标**：将 SparkForge 从"功能完整的原型"升级为"有产品感的专业创作工具"。
> **设计参考**：Linear、Figma、Vercel、Arc Browser 的现代工具感，暗色主题。
> **约束**：所有方案基于 Tailwind CSS 可直接实现，不引入新依赖。

---

## 一、现状诊断

### 1.1 当前优势（值得保留）

| 优势 | 说明 |
|------|------|
| 暗色基调方向正确 | `#0f0f13` 底色 + 低透明度白色叠加，适合创作者长时间使用 |
| 信息架构清晰 | 侧边栏导航 + 主内容区的布局合理，页面切换逻辑干净 |
| 卡片模式一致 | `bg-white/[0.03] border border-white/[0.06] rounded-2xl` 形成了一种默认容器风格 |
| AI Coach 动态渐变 | ProjectPage 的 AI Coach 提示卡片使用了 `bg-gradient-to-r` + 动态 variant，是好的交互模式 |
| 状态覆盖全面 | 加载态（Loader2 spinner）、空态（icon + text）、错误态（alert card）都有覆盖 |

### 1.2 核心问题（需要改进）

#### 问题 1：单色困境 —— 没有视觉差异度
当前 UI 中 95% 的颜色使用都是 `white/[0.02-0.50]` 的透明度叠加。导致：
- 卡片、按钮、背景、分隔线全处于同一色相，缺乏层次
- 没有任何"颜色锚点"来引导视觉焦点
- 用户无法通过颜色快速区分不同功能区域

**具体表现**：
- 侧边栏背景 `bg-[#0f0f13]` = 主内容区背景 = TitleBar 背景，三者完全融为一体
- 卡片背景 `bg-white/[0.03]` 与页面背景 `#0f0f13` 的对比度极低，几乎无法感知卡片边界
- 分隔线 `border-white/[0.06]` 在深色背景下几乎不可见

#### 问题 2：品牌色失语 —— 缺乏识别度
- `brand` 色板使用的是 Tailwind 默认 blue（`#3b82f6` 系），这是互联网上最"路人"的蓝色
- 没有辅助品牌色（accent/secondary），无法构建丰富的色彩层次
- 品牌蓝仅用于少数场景：选中的导航项、主按钮、链接，出现频率过低

#### 问题 3：间距杂乱 —— 没有节奏感
- 页面级 padding：Welcome 用 `p-4/px-4`，Project 用 `p-8`，Settings 用 `p-8 max-w-2xl`，Blueprint 用 `p-6`
- 按钮 padding：有的 `py-2`，有的 `py-2.5`，有的 `py-3`
- 卡片内部 padding：有的 `p-4`，有的 `p-5`，有的 `p-6`
- 元素间 gap：有的 `gap-2`，有的 `gap-3`，有的 `gap-4`，没有统一语义

#### 问题 4：按钮系统缺失 —— 没有组件规范
- 没有明确的 primary / secondary / ghost / danger 按钮变体定义
- 部分按钮 `bg-brand-600`，部分 `bg-white/[0.04]`，部分是自定义颜色
- hover 态不统一：有的 `hover:bg-brand-500`，有的 `hover:bg-white/[0.08]`，有的 `hover:brightness-125`
- disabled 态不统一：有的 `disabled:opacity-40`，有的 `disabled:opacity-30`，有的 `disabled:opacity-20`
- 危险操作按钮（删除/清空）风格各异

#### 问题 5：输入框缺乏设计
- 所有 input/textarea 使用同一套 inline style：`bg-white/5 border border-white/10 rounded-lg`
- focus 态：`focus:border-brand-500/50`，但边框颜色变化极微弱
- 没有 label / helper text / error message 的系统化设计
- placeholder 颜色 `text-white/20` 或 `text-white/15` 不统一，且对比度过低

#### 问题 6：Welcome 页缺乏"第一印象"
- 新用户看到的第一屏就是灰色卡片上的文字，没有视觉冲击力
- 进度指示器是 8px 的小圆点，几乎注意不到
- 成功创建后的页面过于朴素（一个绿色对勾 + 文字）
- 整体缺乏"仪式感"——用户刚完成 6 个问题的回答，应该有更隆重的反馈

#### 问题 7：侧边栏利用率低
- 侧边栏顶部只有折叠按钮，没有品牌标识
- 活动项目指示器（ProjectBadge）信息密度低但占用了底部空间
- 折叠状态下丢失所有信息，只有图标
- 没有快捷键提示
- 新建项目按钮使用虚线边框 `border-dashed`，在暗色背景下几乎不可见

#### 问题 8：TitleBar 浪费空间
- 整个 40px 高的标题栏只显示了 "SparkForge v1.0.0"，居中放置
- macOS 的 traffic light 按钮在左上角，标题栏左边空无一物
- 没有利用这个空间显示面包屑、当前项目名、或快捷操作

#### 问题 9：动画缺失
- 页面切换没有过渡 — 页面瞬间替换，体验生硬
- 没有 skeleton loader，加载态只有居中的 spinner
- 卡片 hover 只是简单的背景色变化，没有 subtle 的 transform 或阴影变化
- 侧边栏折叠动画是 `transition-all duration-200`，感觉僵硬

#### 问题 10：对比度/可访问性
- `text-white/15`（对比度约 1.4:1）用于辅助文字，远低于 WCAG AA 要求的 4.5:1
- `text-white/25`（对比度约 2.0:1）用于表单标签，也不达标
- 聚焦指示器 `focus:border-brand-500/50` 极不明显
- 没有键盘导航可见指示器

---

## 二、设计令牌（Design Tokens）

### 2.1 颜色系统

#### 品牌色（Brand）

摒弃 Tailwind 默认 blue。选用**紫罗兰-靛蓝渐变系**，传达"AI + 创作"的双重气质。

```
品牌主色（Primary）
  50:  #f5f3ff    → 最浅紫（badge 背景、高亮区背景）
  100: #ede9fe
  200: #ddd6fe
  300: #c4b5fd
  400: #a78bfa    → 图标、链接、选中态文字
  500: #8b5cf6    → 主按钮背景、主交互色
  600: #7c3aed    → 主按钮 hover
  700: #6d28d9
  800: #5b21b6
  900: #4c1d95
  950: #2e1065    → 最深紫（激进强调）
```

**为什么选紫色而不是蓝色**：
- 蓝色在 SaaS 工具中过度使用（Linear、Notion、Vercel 等全是蓝）
- 紫色暗示创意、AI、独特性，符合"个人 IP 创作工具"的定位
- 紫色在暗色背景下比蓝色更柔和，减少眼睛疲劳

#### 中性色（Neutral）

不是简单的白色透明度，而是**冷暖分层**的结构化中性色：

```
页面底色
  bg-app:         #0b0b10    （最深底色，比当前的 #0f0f13 略深）
  bg-surface:     #12121a    （卡片/面板底色）
  bg-elevated:    #1a1a26    （浮层/dialog/弹出面板）
  bg-hover:       rgba(255,255,255,0.04)   （hover 态统一值）
  bg-active:      rgba(255,255,255,0.06)   （active/selected 态）

边框
  border-subtle:  rgba(255,255,255,0.04)   （极淡分隔线：列表项之间）
  border-default: rgba(255,255,255,0.06)   （默认边框：卡片/输入框）
  border-strong:  rgba(255,255,255,0.10)   （强调边框：active card/dialog）
  border-focus:   rgba(139,92,246,0.40)    （聚焦边框：品牌紫 500 @40%）

文字
  text-primary:   rgba(255,255,255,0.92)   （标题、正文）
  text-secondary: rgba(255,255,255,0.60)   （辅助说明、标签）
  text-tertiary:  rgba(255,255,255,0.36)   （占位符、禁用文字）⚠️ 不低于此值
  text-disabled:  rgba(255,255,255,0.18)   （仅禁用态）
  text-inverse:   #0b0b10                  （深色背景上的白色按钮文字）
```

**关键改进**：`text-tertiary` 不低于 `0.36` 透明度，保证最低可读性。旧设计中 `text-white/15` 和 `text-white/20` 被淘汰。

#### 语义色（Semantic）

```
Success （成功/正向）
  表面: rgba(34,197,94,0.08)    border: rgba(34,197,94,0.15)   文字: #4ade80
  按钮: #16a34a                 按钮hover: #15803d

Warning （警告/注意）
  表面: rgba(245,158,11,0.08)   border: rgba(245,158,11,0.15)  文字: #fbbf24
  按钮: #d97706                 按钮hover: #b45309

Danger （危险/删除）
  表面: rgba(239,68,68,0.08)    border: rgba(239,68,68,0.15)   文字: #f87171
  按钮: #dc2626                 按钮hover: #b91c1c

Info （信息/提示）
  表面: rgba(59,130,246,0.08)   border: rgba(59,130,246,0.15)  文字: #60a5fa
```

#### 功能色（Accent）— 用于内容分类和视觉锚点

```
创作/脚本:   #60a5fa (蓝)    → ScriptEditor、写脚本相关
选题/灵感:   #a78bfa (紫)    → TopicInspiration、热点匹配
发布/分发:   #4ade80 (绿)    → PublishPage
复盘/数据:   #fb923c (橙)    → RetroPage、Dashboard
战略/方案:   #22d3ee (青)    → Blueprint、PlanEditor
受众/用户:   #f472b6 (粉)    → PersonaPage
```

这些功能色用于 quick action 卡片的图标背景色、页面标题的装饰线、以及活动记录的类型标识。

### 2.2 间距系统

采用 4px 基准的有限间距阶梯：

```
Token       值      用途
space-0     0px     紧凑排列中的无缝连接
space-1     4px     图标与文字间距、tag 内部间距
space-2     8px     相关元素间小间距（按钮组 gap）
space-3     12px    卡片内部元素间距、表单 label-input 间距
space-4     16px    卡片内边距、列表项间距
space-5     20px    区域内部间距
space-6     24px    页面内容区 padding、section 间间距
space-8     32px    页面级 padding、大 section 间距
space-10    40px    页面顶部留白
space-12    48px    主页 hero 区上下留白
```

**页面内容区统一 padding**：所有非全屏页面（Project、Settings、Blueprint 等）统一使用 `px-8 py-6`。

### 2.3 圆角系统

```
radius-sm:   6px    小元素：标签、badge、小按钮
radius-md:   8px    默认：输入框、按钮、列表项
radius-lg:   12px   卡片、面板
radius-xl:   16px   大卡片、dialog、侧边栏项
radius-2xl:  20px   主卡片（保留现有的 rounded-2xl 优势）
```

### 2.4 阴影系统

暗色主题下，阴影必须是**发光式**的（glow），而非传统投影：

```
shadow-xs:    0 1px 2px rgba(0,0,0,0.4)                              → 微妙提升
shadow-sm:    0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)  → 卡片
shadow-md:    0 4px 12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)  → 浮层
shadow-lg:    0 8px 24px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)  → Dialog
shadow-glow:  0 0 20px rgba(139,92,246,0.15)                          → 品牌色辉光（用于 active card）
```

### 2.5 字体系统

保留 PingFang SC 作为主字体。增加等宽字体用于数据和代码：

```
font-sans: "PingFang SC", "Microsoft YaHei", -apple-system, system-ui, sans-serif
font-mono: "SF Mono", "JetBrains Mono", "Fira Code", "Cascadia Code", monospace

字号阶梯（rem）:
  text-xs:    0.75rem (12px)   → 标签、badge、辅助信息
  text-sm:    0.875rem (14px)  → 正文、按钮文字、列表项
  text-base:  1rem (16px)      → 卡片标题、重要正文
  text-lg:    1.125rem (18px)  → 页面副标题
  text-xl:    1.25rem (20px)   → 页面主标题（大多数页面）
  text-2xl:   1.5rem (24px)    → Hero 标题、弹窗标题

字重使用规则:
  font-normal (400): 正文
  font-medium (500): 按钮文字、卡片标题、导航项
  font-semibold (600): 页面标题、section 标题
  font-bold (700): Hero 标题（仅 Welcome/onboarding）
```

---

## 三、组件规范

### 3.1 按钮（Button）

#### 变体定义

每个按钮定义 5 个状态：**default、hover、active、focus-visible、disabled**。

**Primary Button**（主要操作：创建、保存、生成）
```html
<!-- 默认 -->
<button class="
  inline-flex items-center gap-2 px-4 py-2
  bg-brand-600 text-white text-sm font-medium
  rounded-lg
  shadow-sm
  transition-all duration-150
  hover:bg-brand-500 hover:shadow-md
  active:scale-[0.98]
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app
  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-brand-600 disabled:active:scale-100
">
```
尺寸变体：
- `sm`：`px-3 py-1.5 text-xs rounded-md`
- `md`（默认）：`px-4 py-2 text-sm rounded-lg`
- `lg`：`px-6 py-3 text-base rounded-lg`

**Secondary Button**（辅助操作：取消、返回、编辑）
```html
<button class="
  inline-flex items-center gap-2 px-4 py-2
  bg-white/[0.06] text-white/70 text-sm font-medium
  border border-white/[0.06]
  rounded-lg
  transition-all duration-150
  hover:bg-white/[0.10] hover:text-white/85 hover:border-white/[0.10]
  active:scale-[0.98]
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20
  disabled:opacity-30 disabled:cursor-not-allowed
">
```

**Ghost Button**（最轻量操作：导航、收起、关闭）
```html
<button class="
  inline-flex items-center gap-2 px-3 py-2
  text-white/50 text-sm font-medium
  rounded-lg
  transition-all duration-150
  hover:bg-white/[0.06] hover:text-white/75
  active:scale-[0.98]
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15
">
```

**Danger Button**（危险操作：删除、清空）
```html
<button class="
  inline-flex items-center gap-2 px-4 py-2
  bg-red-600/15 text-red-400 text-sm font-medium
  border border-red-500/15
  rounded-lg
  transition-all duration-150
  hover:bg-red-600/25 hover:text-red-300 hover:border-red-500/25
  active:scale-[0.98]
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/30
  disabled:opacity-40 disabled:cursor-not-allowed
">
```

**Icon Button**（仅图标，用于工具栏、关闭按钮）
```html
<button class="
  p-2
  text-white/40
  rounded-lg
  transition-all duration-150
  hover:bg-white/[0.06] hover:text-white/70
  active:scale-90
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15
">
```

#### 当前代码中的使用位置

| 位置 | 当前实现 | 应替换为 |
|------|---------|---------|
| WelcomePage 创建项目按钮 | `bg-brand-600 hover:bg-brand-500 py-3 rounded-xl` | Primary lg |
| BlueprintPage 保存/编辑按钮 | `bg-brand-600/20 border-brand-500/20` | Secondary → Primary |
| BlueprintPage 优化按钮 | `bg-brand-600 hover:bg-brand-500` | Primary |
| ProjectPage AI Coach 按钮 | `bg-brand-600 hover:bg-brand-500` | Primary |
| ProjectPage 快捷操作卡片 | 自定义 bg/border/hover | 统一 hover (scale + border glow) |
| Sidebar 导航按钮 | `hover:bg-white/5` | Ghost nav variant |
| Sidebar 新建项目 | `border-dashed` | Ghost + subtle border |
| Settings API Key 保存 | `bg-brand-600 hover:bg-brand-500` | Primary |
| Settings 重置/删除按钮 | `bg-red-600 hover:bg-red-500` / `bg-red-500/5` | Danger |
| ConfirmDialog 按钮 | `bg-brand-600` / `bg-white/[0.04]` | Primary / Secondary |
| TrendMatch 写脚本按钮 | `bg-purple-600/20 border-purple-500/20` | Secondary 用法正确，保留 |

### 3.2 输入框（Input）

统一输入框设计，增加 label 和 helper text 系统：

```html
<!-- 标准输入框 -->
<div class="space-y-1.5">
  <label class="text-xs font-medium text-white/50">Label</label>
  <input class="
    w-full px-3.5 py-2.5
    bg-white/[0.04] text-sm text-white/90
    placeholder:text-white/25
    border border-white/[0.08]
    rounded-lg
    transition-all duration-150
    hover:border-white/[0.12]
    focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-brand-500/20
    disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-white/[0.08]
  " />
  <p class="text-xs text-white/30">Helper text or error message</p>
</div>
```

**关键提升**：
- 默认边框从 `white/10` 提升到 `white/[0.08]`，hover 到 `white/[0.12]`
- focus 增加 `ring-1 ring-brand-500/20` 的 glow 效果
- placeholder 统一为 `text-white/25`（旧代码有 15、20 两种）
- 增加 label 和 helper text 的语义化结构

### 3.3 卡片（Card）

定义三种卡片层级：

**Subtle Card**（嵌入式卡片：侧边栏项目 Badge、列表项）
```html
<div class="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
```

**Default Card**（标准卡片：设置面板、内容 section）
```html
<div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
```

**Elevated Card**（强调卡片：AI Coach、Blueprint 高亮 section、Dialog）
```html
<div class="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 shadow-sm">
```

**Interactive Card**（可点击卡片：快捷操作、选题推荐、匹配结果）
hover 时增加：
```html
hover:bg-white/[0.05] hover:border-white/[0.10] hover:shadow-glow
```

### 3.4 标签（Badge）

```html
<!-- 语义色 Badge -->
<span class="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md
  bg-[color]-500/10 text-[color]-400 border border-[color]-500/15">
  标签文字
</span>

<!-- 中性 Badge（用于计数、版本号） -->
<span class="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md
  bg-white/[0.06] text-white/40 border border-white/[0.06]">
  v1.0
</span>
```

### 3.5 分隔线（Divider）

不再使用简单的 `border-white/5`，改用语义化分隔线：

```html
<!-- 重分隔线：section 之间 -->
<hr class="border-white/[0.06] my-6" />

<!-- 轻分隔线：列表项之间 -->
<hr class="border-white/[0.03] my-2" />

<!-- 垂直分隔线：inline 分隔 -->
<span class="w-px h-4 bg-white/[0.08] mx-2 inline-block align-middle" />
```

### 3.6 滚动条（Scrollbar）

升级当前的基础滚动条：

```css
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  border: 1px solid transparent;
  background-clip: padding-box;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.16);
  background-clip: padding-box;
}
::-webkit-scrollbar-corner {
  background: transparent;
}
```

---

## 四、布局规范

### 4.1 全局布局结构

```
┌──────────────────────────────────────────────────┐
│ TitleBar (h-12, 原来 h-10 → 增加高度利用空间)      │
├────────┬─────────────────────────────────────────┤
│        │                                         │
│Sidebar │         Main Content Area               │
│w-56    │         (flex-1, overflow-y-auto)       │
│(展开)   │                                         │
│        │                                         │
│ 或      │    所有页面统一：                         │
│w-16    │    px-8 py-6 (page padding)             │
│(折叠)   │    max-w-5xl mx-auto (内容宽度限制)       │
│        │                                         │
└────────┴─────────────────────────────────────────┘
```

### 4.2 TitleBar 重新设计

当前问题：40px 高度只显示居中的 "SparkForge v1.0.0"，完全浪费。

重新设计：

```
┌──────────────────────────────────────────────────────────┐
│ 🟡🔴🟢  ← 项目名称 →    面包屑    │    窗口控制（系统自带）│
└──────────────────────────────────────────────────────────┘
```

- 高度从 `h-10` 增加到 `h-12`，给内容更多呼吸空间
- 左侧显示**当前项目名称**（当有活跃项目时），起到面包屑作用
- 没有活跃项目时显示 "SparkForge"
- 移除了版本号（移至 Settings → About），TitleBar 不再显示
- 背景：`bg-bg-app/90 backdrop-blur-xl`，增加毛玻璃效果
- 底部边框保留：`border-b border-white/[0.04]`

```tsx
// TitleBar.tsx 改进版结构
<div className="drag-region fixed top-0 left-0 right-0 h-12 bg-bg-app/90 backdrop-blur-xl border-b border-white/[0.04] z-50 flex items-center px-4">
  <div className="flex items-center gap-2">
    {/* 系统 traffic light 在左侧，我们没法控制 */}
    {activeProject && (
      <div className="flex items-center gap-2 text-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
        <span className="text-white/60 font-medium">{activeProject.name}</span>
      </div>
    )}
    {!activeProject && (
      <span className="text-sm text-white/40 font-medium">SparkForge</span>
    )}
  </div>
</div>
```

### 4.3 侧边栏重新设计

关键改进：

1. **增加品牌标识**：折叠按钮上方增加 App 图标/标识
2. **导航项视觉增强**：
   - 选中态：左侧增加 3px 宽的品牌色竖条（类似 Linear），增加背景色
   - hover 态：subtle 背景色变化 + 轻微的右移
3. **折叠状态优化**：
   - 图标居中，hover 时显示 tooltip（使用 title 属性）
   - 选中态使用左侧竖条 + 图标颜色变化
4. **新建项目按钮提升**：去掉虚线边框，使用 ghost button 风格，hover 时更加明显
5. **项目指示器重新设计**：
   - 增加项目头像（取项目名首字）
   - 状态灯从绿色圆点改为更 subtle 的 ring 样式

```tsx
// 导航项 hover 动画
className={`
  w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium
  transition-all duration-150
  relative
  ${isActive
    ? 'bg-brand-500/8 text-brand-400 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-5 before:bg-brand-500 before:rounded-full'
    : 'text-white/50 hover:text-white/75 hover:bg-white/[0.04]'
  }
`}
```

### 4.4 内容区布局规范

所有页面遵循一致的容器规则：

```tsx
<main className="flex-1 overflow-y-auto">
  <div className="px-8 py-6 max-w-5xl mx-auto">
    {/* 页面标题区 */}
    <header className="mb-8">
      <h1 className="text-xl font-semibold text-white mb-1">页面标题</h1>
      <p className="text-sm text-white/45">页面描述</p>
    </header>

    {/* 页面内容 */}
    ...
  </div>
</main>
```

---

## 五、动效规范

### 5.1 过渡时长

```
fast:    100ms    → 按钮 hover 颜色变化、图标 hover
normal:  150ms    → 卡片 hover、输入框 focus、tab 切换
slow:    250ms    → 侧边栏折叠、面板展开/收起
page:    300ms    → 页面切换
```

### 5.2 缓动函数

Tailwind 内置即可（`ease-out`、`ease-in-out`），不引入自定义 cubic-bezier。

### 5.3 页面切换动画

当前页面切换是瞬间替换，增加 fade + slide 效果：

```css
/* 在 global.css 中定义 */
@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-transition {
  animation: page-enter 200ms ease-out;
}
```

在 `App.tsx` 中，用 `key={page}` 和 CSS 类触发：

```tsx
<main key={page} className="flex-1 overflow-hidden page-transition">
  {/* page content */}
</main>
```

### 5.4 Hover / Active 微交互

| 元素 | Hover 效果 | Active 效果 |
|------|-----------|------------|
| 按钮 (Primary) | `bg-brand-500 shadow-md` | `scale-[0.98]` |
| 按钮 (Secondary) | `bg-white/[0.10] text-white/85` | `scale-[0.98]` |
| 按钮 (Ghost) | `bg-white/[0.06] text-white/75` | `scale-[0.98]` |
| 交互式卡片 | `bg-white/[0.05] border-white/[0.10]` + 微弱 glow | `scale-[0.99]` |
| 导航项 | `bg-white/[0.04] text-white/75` | 无 |
| 输入框 | `border-white/[0.12]` | focus ring glow |
| 图标按钮 | `bg-white/[0.06] text-white/70` | `scale-90` |

### 5.5 Skeleton Loader（加载骨架屏）

替代当前的居中 spinner，为高频加载场景提供骨架屏：

```html
<!-- 卡片 Skeleton -->
<div class="animate-pulse rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
  <div class="h-4 w-2/3 bg-white/[0.04] rounded mb-3" />
  <div class="h-3 w-full bg-white/[0.03] rounded mb-2" />
  <div class="h-3 w-4/5 bg-white/[0.03] rounded" />
</div>
```

使用场景：
- BlueprintPage 生成等待（当前是居中 spinner + 文字，改为 3-4 个 skeleton card）
- ProjectPage 初始加载（项目数据未加载时显示 skeleton cards）

---

## 六、关键页面重新设计

### 6.1 WelcomePage —— "第一印象"全面升级

**当前问题**：灰色卡片 + 白色文字，没有视觉冲击力，进度指示器（8px 圆点）太弱。

**重新设计方案**：

#### 整体布局
```
┌──────────────────────────────────────────────┐
│                                              │
│           ✦ （大型品牌装饰图案）                │
│                                              │
│        打造你的个人IP                           │
│    回答几个问题，AI教练为你定制专属方案            │
│                                              │
│    ┌──────────────────────────────┐          │
│    │                              │          │
│    │    问题卡片区                  │          │
│    │    （动态高度）                │          │
│    │                              │          │
│    └──────────────────────────────┘          │
│                                              │
│    ● ● ● ○ ○ ○  （进度条 + 步骤标签）          │
│                                              │
└──────────────────────────────────────────────┘
```

#### 具体改进

1. **品牌装饰图案**：顶部不再是简单的 Sparkles icon + "AI 教练" badge，而是：
   - 一个 64x64 的渐变圆形区域（`from-brand-600 to-purple-600`），内部使用大型 Sparkles icon
   - 下方标题使用渐变文字（`bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent`）
   - 整体有呼吸感（`mb-12`）

2. **进度指示器升级**：从 8px 圆点改为带标签的步骤进度条：
```tsx
<div className="flex items-center justify-center gap-1 mt-8">
  {STEPS.map((step, i) => (
    <React.Fragment key={i}>
      <div className="flex items-center gap-1.5">
        <div className={`
          w-3 h-3 rounded-full transition-all duration-300
          ${i < currentStep ? 'bg-green-500' : i === currentStep ? 'bg-brand-500 ring-4 ring-brand-500/20' : 'bg-white/[0.10]'}
        `} />
        {i === currentStep && (
          <span className="text-xs text-brand-400 font-medium">{step.title}</span>
        )}
      </div>
      {i < STEPS.length - 1 && (
        <div className={`w-6 h-px transition-colors duration-300 ${i < currentStep ? 'bg-green-500/50' : 'bg-white/[0.06]'}`} />
      )}
    </React.Fragment>
  ))}
</div>
```
只显示当前步骤的标签，已完成的显示绿色圆点，待完成的显示极淡灰色。

3. **问题卡片**：
   - 增加 `shadow-sm` 和 `border-white/[0.08]`
   - 选项按钮增加左侧的品牌色竖线（hover 时显现）
   - 选中态：选项卡片 `hover:scale-[1.01]` subtle 放大 + 左侧品牌色指示条

4. **创建成功态重新设计**：
```tsx
// Post-creation success — 更有仪式感
<div className="min-h-screen flex items-center justify-center px-4">
  <div className="w-full max-w-lg text-center">
    {/* 动画 success icon */}
    <div className="relative mx-auto mb-8 w-20 h-20">
      <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
      <div className="relative w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
        <CheckCircle size={36} className="text-green-400" />
      </div>
    </div>

    <h1 className="text-2xl font-bold text-white mb-2">项目创建成功！</h1>
    <p className="text-white/45 text-sm mb-3">
      你的 IP 打造之路正式启动
    </p>
    <p className="text-white/30 text-sm mb-8 max-w-sm mx-auto">
      AI 正在分析你的回答，为你生成专属的 IP 打造蓝图——包含定位、内容策略、第一条视频计划
    </p>

    {/* 两个 CTAs 并排 */}
    <div className="flex gap-3 justify-center">
      <button className="Primary lg">生成我的 IP 蓝图</button>
      <button className="Secondary lg">进入工作台</button>
    </div>
  </div>
</div>
```

### 6.2 ProjectPage —— 高频使用场景优化

**当前问题**：信息密度高但层次不清，快捷操作卡片风格各异，管道状态区拥挤。

**重新设计方案**：

#### 页面布局
```
┌──────────────────────────────────────────────┐
│ 项目名                   已发3条 · 预测中5条...  │  ← 页面标题
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ AI Coach 提示卡片（动态内容 + 动态颜色）     │ │  ← 智能教练
│ └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│ │IP   │ │写脚 │ │管理 │ │选题 │           │  ← 快捷操作（4列网格）
│ │蓝图 │ │本   │ │脚本 │ │灵感 │           │
│ └─────┘ └─────┘ └─────┘ └─────┘           │
│ ┌─────┐ ┌─────┐ ┌─────┐                   │
│ │发布 │ │复盘 │ │方案 │                   │
│ └─────┘ └─────┘ └─────┘                   │
├──────────────────────────────────────────────┤
│ 管道状态  📝5 → 🎬2 → 🚀3 → 📊3            │  ← 管道进度（compact）
├──────────────────────────────────────────────┤
│ 管道推进  [确认拍摄] → [确认发布]             │  ← 操作区
├──────────────────────────────────────────────┤
│ 最近活动 · 23 条                  [查看全部]   │  ← 活动时间线
│ ...                                          │
└──────────────────────────────────────────────┘
```

#### 具体改进

1. **快捷操作卡片增强**：
   - 改为 4 列网格（7 个卡片 → 4列 + 3列）
   - 每个卡片统一高度
   - hover 效果增加：`hover:scale-[1.02]` + `hover:shadow-glow`
   - 卡片背景色与功能色关联（保持现有的颜色系统，但统一透明度）
   - 禁用状态的卡片用 `opacity-60 grayscale` 而非仅仅 `opacity-40`

2. **管道状态区简化**：
   - 从两行（进度 + 警告）压缩为一行
   - 使用紧凑的 progress bar 替代文字描述
   - Buffer 警告改为图标 + tooltip 形式

3. **AI Coach 卡片**：
   - 保留现有的动态 variant 系统（primary/warning/secondary）——这是好的设计
   - 增加 subtle 的入场动画（`animate-in`）
   - 卡片内增加装饰性图案（gradient blur 背景）

4. **活动时间线**：
   - 增加左侧时间轴线（类似 Linear 的 activity feed）
   - 每个条目 hover 时显示 subtle 背景色
   - 分页控件改用更现代的样式

### 6.3 BlueprintPage —— 旗舰功能升级

**当前问题**：极长的滚动页面，没有导航辅助，编辑模式下的 input/textarea 太挤。

**重新设计方案**：

1. **增加右侧迷你目录（Table of Contents）**：
```
┌──────────────────────┬──────┐
│                      │ 定位  │
│   蓝图内容区          │ 策略  │
│                      │ 视频  │
│                      │ 路线  │  ← 滚动高亮当前位置
│                      │ 人设  │
│                      │ 指标  │
│                      │ 风险  │
│                      │ 行动  │
└──────────────────────┴──────┘
```
实现：`sticky top-24` 的右侧导航，点击滚动到对应 section。

2. **Section 卡片视觉增强**：
   - 每个 section 的左侧增加与功能色对应的细竖线（4px）
   - 标题区增加功能色背景的小图标圆形容器
   - Section 间增加更大的间距（`space-y-8`）

3. **编辑模式改进**：
   - 编辑模式切换时卡片边框变为品牌色（`border-brand-500/30`），提示"可编辑状态"
   - 输入框/textarea 在编辑模式下自动获得更明显的样式
   - 行内编辑（如 pillar name、ratio）使用更宽裕的 input 尺寸

4. **骨架屏加载态**：
   - 替换当前的居中 spinner 为 6 个 section 的 skeleton card
   - 骨架卡片按实际 section 的布局排列，让用户对即将看到的内容有预期

### 6.4 SettingsPage

**当前问题**：功能完整，但视觉层次不够——所有 section 看起来优先级相同。

**改进**：
- API Key 输入区使用 Elevated Card（`bg-elevated`），因为这是最重要的设置
- Provider 选择和 Pipeline 参数使用 Default Card
- 增加 section 之间的视觉间隔
- Toggle switch 增加动画过渡（当前是 instant switch）
- 危险操作区域使用红色边框卡片包裹，起视觉警示作用

### 6.5 TrendMatchPage

**当前状态不错**。需要微调：
- 趋势列表项的序号使用等宽字体数字（`font-mono`）
- 匹配结果卡片增加 subtle 入场动画（staggered animation）
- 热力 badge 的渐变更平滑

---

## 七、App 图标升级建议

### 7.1 当前图标问题

由于我没有看到实际的 app icon 文件，请检查以下内容：
- 如果是一个火花/星星的简单图标 → **太通用**，无法区分
- 如果只有单色版本 → **缺乏层次**，在 Dock 中不显眼
- 如果是渐变色图标 → **好方向**，但需确保形状简洁

### 7.2 改进方向

**概念方向**：将"锻造（Forge）"和"火花（Spark）"两个意象融合。

**方案 A：锻造炉 + 火花**
- 主体：一个简洁的锻造炉/砧板剪影（暗色，带金属质感）
- 上方：一颗明亮的火花/菱形（品牌紫色，带 glow）
- 寓意：在 SparkForge 中锻造你的 IP

**方案 B：S + F 字母标志**
- S 和 F 连写，S 的尾部变形为火花
- 使用品牌渐变（`from-brand-500 to-purple-600`）
- 风格：Figma / Vercel 式的几何简约风

**方案 C：多边形火花**
- 一个几何化的火花/钻石形状（类似 Linear 的 logo 思路）
- 内部用品牌渐变色填充
- 外圈用更深的紫/黑色边框

**推荐方案 B**，因其最具品牌识别度和工具感。

### 7.3 技术规格

```
macOS app icon: 1024x1024px PNG（带圆角矩形的 .icns）
格式: PNG → 使用 iconutil 转换为 .icns
背景: 深色（#0b0b10 或渐变）
圆角: macOS 自动应用系统圆角
```

---

## 八、Tailwind 配置更新

### 更新 `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065'
        },
        app: {
          bg: '#0b0b10',
          surface: '#12121a',
          elevated: '#1a1a26'
        },
        success: {
          DEFAULT: '#4ade80',
          surface: 'rgba(34,197,94,0.08)',
          border: 'rgba(34,197,94,0.15)'
        },
        warning: {
          DEFAULT: '#fbbf24',
          surface: 'rgba(245,158,11,0.08)',
          border: 'rgba(245,158,11,0.15)'
        },
        danger: {
          DEFAULT: '#f87171',
          surface: 'rgba(239,68,68,0.08)',
          border: 'rgba(239,68,68,0.15)'
        }
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', '"JetBrains Mono"', '"Fira Code"', 'monospace']
      },
      boxShadow: {
        'glow': '0 0 20px rgba(139,92,246,0.15)',
        'glow-lg': '0 0 40px rgba(139,92,246,0.2)',
      },
      animation: {
        'page-enter': 'page-enter 200ms ease-out',
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
      },
      keyframes: {
        'page-enter': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}
```

---

## 九、实施优先级

### Phase 1：Design Tokens 落地（最高优先级，1-2天）

1. 更新 `tailwind.config.js`：颜色系统、字体、阴影、动画 keyframes
2. 更新 `global.css`：scrollbar、page transition class、基础样式
3. 创建 `src/renderer/src/styles/design-tokens.css`（可选，集中管理 CSS 变量）

### Phase 2：基础组件标准化（2-3天）

1. 创建 `components/ui/Button.tsx`：统一 5 种变体 + 3 种尺寸
2. 创建 `components/ui/Input.tsx`：统一 label + input + helper text 结构
3. 创建 `components/ui/Card.tsx`：三种层级卡片
4. 创建 `components/ui/Badge.tsx`：语义色 + 中性 badge
5. 全局替换现有散落的按钮/输入框样式为组件

### Phase 3：布局升级（1-2天）

1. TitleBar 重新设计
2. Sidebar 重新设计（导航项动画 + 品牌标识）
3. 所有页面统一 padding/max-width 规则

### Phase 4：关键页面重设计（3-4天）

1. WelcomePage 全面升级（最高优先级——第一印象）
2. ProjectPage 优化（快捷操作 + 管道区）
3. BlueprintPage 优化（目录导航 + 骨架屏）

### Phase 5：动效 & 打磨（1-2天）

1. 页面切换动画
2. 骨架屏组件
3. 微交互（hover/active 统一）
4. 对比度审查 & 可访问性修复

---

## 十、设计决策记录

| 决策 | 理由 |
|------|------|
| 品牌色选紫色而非蓝色 | 区别于泛滥的 SaaS 蓝色，传达 AI + 创意的独特性 |
| 最低文字透明度定为 0.36 | 保证可读性的同时保持暗色层次感 |
| 不引入新 UI 库依赖 | 所有方案基于 Tailwind 原生实现，保持项目轻量 |
| 保留 `rounded-2xl` 主卡片风格 | 这是当前设计中的亮点，强化而非替换 |
| 使用 CSS animation 而非 Framer Motion | 不增加 bundle size，满足 Electron 桌面应用的动效需求 |
| TitleBar 从居中文字改为左侧项目名 | 利用已有空间增加信息密度，符合 macOS 应用惯例 |
| 页面切换使用 `key={page}` + CSS class | 最简单的方式实现页面过渡，不引入路由库 |

---

> **文档版本**：v1.0
> **最后更新**：2026-06-20
> **设计者**：基于对现有 10+ 源文件完整阅读后的分析
