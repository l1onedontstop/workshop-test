// ── Social Account Crawling & Self-Analysis ──────────────
// Crawl user's own social media account data via public APIs
// and use AI to analyze content patterns, style, and optimization paths.
//
// Supports: 抖音, B站, 小红书, 视频号 (best-effort via public endpoints)

import { ipcMain } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, appendFileSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import { homedir } from 'os'
import { doChat } from './ai'
import { getSetting } from './settings'
import { session, BrowserWindow } from 'electron'

// ── Get douyin cookies from Electron session ────────────
async function getSessionCookies(): Promise<string> {
  try {
    const cookies = await session.defaultSession.cookies.get({ domain: '.douyin.com' })
    return cookies.map(c => `${c.name}=${c.value}`).join('; ')
  } catch {
    return ''
  }
}

// ── Crawl debug log ────────────────────────────────────
const DEBUG_LOG = join(homedir(), 'SparkForge', 'crawl-debug.log')
function crawlLog(...args: unknown[]): void {
  const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')
  try {
    const logDir = join(homedir(), 'SparkForge')
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true })
    appendFileSync(DEBUG_LOG, `[${new Date().toISOString()}] ${msg}\n`)
  } catch {}
  console.log(msg)
}

interface CrawledVideo {
  title: string
  url: string
  plays?: number
  likes?: number
  comments?: number
  shares?: number
  duration?: string
  publishedAt?: string
  tags?: string[]
}

interface SelfAccountData {
  name: string
  platform: string
  url: string
  crawledAt: string
  followerCount?: number
  totalVideos?: number
  videos: CrawledVideo[]
  aiAnalysis?: SelfAnalysis
}

interface SelfAnalysis {
  accountSummary: string
  contentPillars: string[]
  styleFeatures: string[]
  strengths: string[]
  weaknesses: string[]
  personaAdvice: {
    keepCurrent: string
    optimizeDirection: string
    transformOption: string
    recommended: 'keep' | 'optimize' | 'transform'
    reasoning: string
  }
  reusablePatterns: string[]
  audienceInference: string
  improvementPriorities: string[]
}

const PLATFORM_CONFIG: Record<string, { label: string; apiHint: string }> = {
  douyin: { label: '抖音', apiHint: '使用 douyin.com 公开搜索接口' },
  bilibili: { label: 'B站', apiHint: '使用 api.bilibili.com 公开接口' },
  xiaohongshu: { label: '小红书', apiHint: '需要手动粘贴内容数据' },
  shipinhao: { label: '视频号', apiHint: '需要手动粘贴内容数据' },
  other: { label: '其他平台', apiHint: '需要手动粘贴内容数据' }
}

const SELF_ANALYSIS_PROMPT = `你是一个个人IP诊断师，专门分析用户的已有社交账号内容，给出人设优化和内容策略建议。

## 你的任务
分析用户提供的自有账号数据（视频标题、互动数据、内容类型），给出全面的账号诊断。

## 分析维度
1. **账号定位总结** — 这个账号目前在做什么？定位清晰吗？
2. **内容支柱** — 主要围绕哪几个主题/支柱？
3. **风格特征** — 视觉风格、语言风格、节奏风格
4. **强项分析** — 哪些内容方向效果好？有什么可复用的模式？
5. **弱项分析** — 哪些方向效果不好？可能的原因？
6. **人设建议** — 给出三条路径：
   - **继续现有方向**：如果当前方向正确，如何深化
   - **优化调整**：在现有基础上微调什么
   - **转型方向**：如果数据不好，建议转型到什么方向
   - 综合考虑数据表现后，推荐哪条路径
7. **可复用模式** — 哪些钩子/选题/表达方式可以继续用
8. **受众推断** — 根据内容风格推断目标受众特征
9. **改进优先级** — 最需要改进的3件事

## 输出格式（严格JSON）
{
  "accountSummary": "一句话账号定位总结",
  "contentPillars": ["支柱1", "支柱2", "..."],
  "styleFeatures": ["风格特征1", "风格特征2", "..."],
  "strengths": ["强项1", "强项2", "..."],
  "weaknesses": ["弱项1", "弱项2", "..."],
  "personaAdvice": {
    "keepCurrent": "如果保持现有方向，建议...",
    "optimizeDirection": "微调建议...",
    "transformOption": "转型建议...",
    "recommended": "keep|optimize|transform",
    "reasoning": "推荐理由"
  },
  "reusablePatterns": ["可复用模式1", "可复用模式2", "..."],
  "audienceInference": "推断的受众特征",
  "improvementPriorities": ["优先改进1", "优先改进2", "优先改进3"]
}`

// ── Crawl Douyin user page ──────────────────────────────
// ── WBI signing for Bilibili ──────────────────────────────
let wbiCache: { imgKey: string; subKey: string; expires: number } | null = null

async function getWbiKeys(): Promise<{ imgKey: string; subKey: string }> {
  if (wbiCache && Date.now() < wbiCache.expires) {
    return { imgKey: wbiCache.imgKey, subKey: wbiCache.subKey }
  }
  try {
    const res = await fetch('https://api.bilibili.com/x/web-interface/nav', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://www.bilibili.com/' }
    })
    const data = await res.json()
    const imgUrl: string = data?.data?.wbi_img?.img_url || ''
    const subUrl: string = data?.data?.wbi_img?.sub_url || ''
    const imgKey = (imgUrl.split('/').pop() || '').split('.')[0]
    const subKey = (subUrl.split('/').pop() || '').split('.')[0]
    if (imgKey && subKey) {
      wbiCache = { imgKey, subKey, expires: Date.now() + 4 * 60 * 60 * 1000 }
      return { imgKey, subKey }
    }
  } catch (e) { crawlLog('WBI key fetch failed:', e) }
  return { imgKey: '', subKey: '' }
}

function wbiSign(params: Record<string, string | number>, mix: string): { w_rid: string; wts: number } {
  const wts = Math.floor(Date.now() / 1000)
  const allParams = { ...params, wts: String(wts) }
  const keys = Object.keys(allParams).sort()
  // Build query string — values MUST be URL-encoded, NOT the keys
  const pairs = keys.map(k => `${k}=${encodeURIComponent(String(allParams[k]))}`)
  const query = pairs.join('&')
  const w_rid = createHash('md5').update(query + mix).digest('hex')
  return { w_rid, wts }
}

async function crawlDouyinProfile(url: string) {
  // Douyin aggressively blocks automated access.
  // Best-effort: try to resolve short link and extract sec_uid for identity,
  // but actual video data requires browser-level anti-bot (X-Bogus + msToken).
  // The AI analysis will infer from account name + platform regardless.
  try {
    const cleanUrl = url.trim().split(/\s+/)[0]
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

    // Try to extract sec_uid from the URL directly
    let secUid = ''
    const directMatch = cleanUrl.match(/user\/([A-Za-z0-9_-]+)/)
    if (directMatch) secUid = directMatch[1]
    if (!secUid) {
      const qsMatch = cleanUrl.match(/sec_uid=([A-Za-z0-9_%.-]+)/)
      if (qsMatch) secUid = decodeURIComponent(qsMatch[1])
    }

    // If we have a short link, try to resolve it
    if (!secUid && cleanUrl.includes('v.douyin.com')) {
      try {
        const redirectRes = await fetch(cleanUrl, { redirect: 'follow', headers: { 'User-Agent': ua } })
        const targetUrl = redirectRes.url
        crawlLog('[douyin] Resolved short link ->', targetUrl.slice(0, 80))
        const um = targetUrl.match(/user\/([A-Za-z0-9_-]+)/)
        if (um) secUid = um[1]
        if (!secUid) {
          const qm = targetUrl.match(/sec_uid=([A-Za-z0-9_%.-]+)/)
          if (qm) secUid = decodeURIComponent(qm[1])
        }
      } catch (e: any) {
        crawlLog('[douyin] Short link resolve failed:', e?.message || String(e))
      }
    }

    // Even without sec_uid, AI will infer from account name
    if (!secUid) {
      crawlLog('[douyin] No sec_uid — will use AI inference')
      return { name: '抖音账号', videos: [] }
    }

    crawlLog('[douyin] Got sec_uid — trying API...')

    // Get cookies from Electron session + fallback to manual cookie setting
    const manualCookie = (getSetting('douyinCookie') as string) || ''
    const sessionCookies = await getSessionCookies()
    const cookieHeader = [sessionCookies, manualCookie].filter(Boolean).join('; ')
    crawlLog('[douyin] Has cookie:', !!cookieHeader)

    const apiUrl = `https://www.douyin.com/aweme/v1/web/aweme/post/?sec_user_id=${secUid}&count=20&max_cursor=0&aid=6383`
    const fetchHeaders: Record<string, string> = {
      'User-Agent': ua,
      'Referer': 'https://www.douyin.com/'
    }
    if (cookieHeader) fetchHeaders['Cookie'] = cookieHeader
    const apiRes = await fetch(apiUrl, { headers: fetchHeaders })
    const apiText = await apiRes.text()

    if (apiText.length < 20) {
      crawlLog('[douyin] API returned empty/blocked — using AI inference')
      return { name: '抖音账号', videos: [] }
    }

    // Try to parse — might be blocked
    const data = JSON.parse(apiText)
    const awemeList = data?.aweme_list || []
    if (!awemeList.length) return { name: '抖音账号', videos: [] }

    const videos: CrawledVideo[] = awemeList.map((item: Record<string, unknown>) => {
      const stats = (item.statistics as Record<string, number>) || {}
      return {
        title: (item.desc || '') as string,
        url: 'https://www.douyin.com/video/' + (item.aweme_id || ''),
        plays: stats.play_count || 0,
        likes: stats.digg_count || 0,
        comments: stats.comment_count || 0,
        shares: stats.share_count || 0,
        duration: item.duration ? String(item.duration) + 's' : '',
        publishedAt: item.create_time ? new Date((item.create_time as number) * 1000).toISOString() : '',
        tags: ((item.text_extra || []) as Array<{ hashtag_name?: string }>)
          .filter(t => t.hashtag_name).map(t => t.hashtag_name!)
      }
    })

    const authorName = ((awemeList[0] as Record<string, unknown>)?.author as Record<string, unknown>)?.nickname as string || '抖音账号'
    crawlLog('[douyin] Success:', videos.length, 'videos for', authorName)
    return { name: authorName, videos }
  } catch (err: any) {
    crawlLog('[douyin] Failed (will use AI inference):', err?.message || String(err))
    return { name: '抖音账号', videos: [] }
  }
}

// ── Crawl Bilibili user page ────────────────────────────
async function crawlBilibiliProfile(url: string) {
  try {
    const cleanUrl = url.trim().split(/\s+/)[0]
    const midMatch = cleanUrl.match(/space\.bilibili\.com\/(\d+)/)
    const mid = midMatch ? midMatch[1] : ''
    if (!mid) {
      crawlLog('[bilibili] Could not extract mid from:', cleanUrl)
      return { name: 'B站账号', videos: [] }
    }

    crawlLog('[bilibili] Using mid:', mid)
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

    // Try WBI-signed API first
    let vlist: any[] = []
    let triedWbi = false

    try {
      const { imgKey, subKey } = await getWbiKeys()
      if (imgKey && subKey) {
        triedWbi = true
        const mix = imgKey + subKey
        const params: Record<string, string> = { mid: String(mid), ps: '20', pn: '1' }
        const { w_rid, wts } = wbiSign(params, mix)
        const apiUrl = `https://api.bilibili.com/x/space/wbi/arc/search?mid=${mid}&ps=20&pn=1&w_rid=${w_rid}&wts=${wts}`
        crawlLog('[bilibili] Trying WBI API...')

        const res = await fetch(apiUrl, { headers: { 'User-Agent': ua, 'Referer': 'https://space.bilibili.com/' + mid } })
        const data = await res.json()
        crawlLog('[bilibili] WBI result code:', data?.code, 'msg:', data?.message)

        if (data?.code === 0) {
          vlist = data?.data?.list?.vlist || []
        }
      }
    } catch (e: any) {
      crawlLog('[bilibili] WBI API failed:', e?.message || String(e))
    }

    // Fallback: try non-WBI search API
    if (!triedWbi || vlist.length === 0) {
      try {
        const fallbackUrl = `https://api.bilibili.com/x/space/arc/search?mid=${mid}&ps=20&pn=1&order=pubdate`
        crawlLog('[bilibili] Trying fallback API...')
        const fbRes = await fetch(fallbackUrl, { headers: { 'User-Agent': ua, 'Referer': 'https://space.bilibili.com/' + mid } })
        const fbData = await fbRes.json()
        crawlLog('[bilibili] Fallback result code:', fbData?.code, 'msg:', fbData?.message)
        if (fbData?.code === 0) {
          vlist = fbData?.data?.list?.vlist || []
        }
      } catch (e: any) {
        crawlLog('[bilibili] Fallback API failed:', e?.message || String(e))
      }
    }

    if (!vlist.length) {
      crawlLog('[bilibili] No videos found — will use AI inference')
      return { name: 'B站账号', videos: [] }
    }

    const videos: CrawledVideo[] = vlist.map((item: Record<string, unknown>) => ({
      title: (item.title || '') as string,
      url: 'https://www.bilibili.com/video/' + (item.bvid || ''),
      plays: (item.play as number) || 0,
      likes: 0,
      comments: (item.comment as number) || 0,
      shares: 0,
      duration: item.length || '',
      publishedAt: item.created ? new Date((item.created as number) * 1000).toISOString() : '',
      tags: []
    }))

    let authorName = 'B站账号'
    try {
      const cardRes = await fetch(`https://api.bilibili.com/x/web-interface/card?mid=${mid}`, {
        headers: { 'User-Agent': ua, 'Referer': 'https://space.bilibili.com/' + mid }
      })
      const cardData = await cardRes.json()
      if (cardData?.code === 0 && cardData?.data?.card?.name) {
        authorName = cardData.data.card.name
      }
    } catch {}

    crawlLog('[bilibili] Success:', videos.length, 'videos for', authorName)
    return { name: authorName, videos }
  } catch (err: any) {
    crawlLog('[bilibili] Exception:', err?.message || String(err))
    return { name: 'B站账号', videos: [] }
  }
}

// ── Manual data input (for platforms without public API) ─
function parseManualInput(rawText: string) {
  const videos: CrawledVideo[] = []
  const lines = rawText.split('\n').filter(l => l.trim())
  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim())
    if (parts.length >= 1 && parts[0]) {
      videos.push({
        title: parts[0],
        url: parts[1] || '',
        plays: parseInt(parts[2]) || undefined,
        likes: parseInt(parts[3]) || undefined,
        comments: parseInt(parts[4]) || undefined,
        publishedAt: parts[5] || undefined,
        tags: parts.length > 6 ? parts.slice(6).filter(Boolean) : []
      })
    }
  }
  return videos
}

// ── AI Analysis (same pattern as benchmark: inference from name+platform, enhanced by video data if available) ──
async function analyzeSelfAccount(data: SelfAccountData): Promise<SelfAnalysis | null> {
  const platformLabel = PLATFORM_CONFIG[data.platform]?.label || data.platform
  const hasVideos = data.videos && data.videos.length > 0

  // Build user message: always include name+platform+url, optionally add video data
  const lines = [
    `## 自有账号信息`,
    `名称：${data.name}`,
    `平台：${platformLabel}`,
    data.url ? `主页链接：${data.url}` : ''
  ]

  if (hasVideos) {
    const videoSummary = data.videos
      .slice(0, 30)
      .map((v, i) =>
        `${i + 1}. ${v.title}` +
        (v.plays ? ` | 播放${v.plays}` : '') +
        (v.likes ? ` | 赞${v.likes}` : '') +
        (v.comments ? ` | 评${v.comments}` : '')
      )
      .join('\n')
    lines.push('', `## 视频列表（${data.videos.length} 条）`, videoSummary, '', '请基于以上真实视频数据，全面分析这个账号。')
  } else {
    lines.push(
      '',
      `请基于账号名"${data.name}"和平台"${platformLabel}"的特征做合理推断分析。`,
      `参考${platformLabel}平台同类型创作者的一般内容模式。`
    )
  }

  const messages = [
    { role: 'system' as const, content: SELF_ANALYSIS_PROMPT },
    { role: 'user' as const, content: lines.filter(Boolean).join('\n') }
  ]

  try {
    const raw = await doChat(messages, { temperature: 0.3, maxTokens: 3072 })
    return extractJSON(raw) as SelfAnalysis | null
  } catch {
    return null
  }
}

// ── JSON helper ──────────────────────────────────────────
function extractJSON(raw: string): Record<string, unknown> | null {
  try {
    const trimmed = raw.trim()
    if (trimmed.startsWith('{')) return JSON.parse(trimmed)
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) return JSON.parse(match[1].trim())
    const objMatch = trimmed.match(/\{[\s\S]*\}/)
    if (objMatch) return JSON.parse(objMatch[0])
  } catch { /* fall through */ }
  return null
}

// ── Register IPC Handlers ────────────────────────────────
export function registerSocialCrawlHandlers(): void {
  // Open douyin login window (auto-saves cookies to Electron session)
  ipcMain.handle('social-crawl:loginDouyin', async () => {
    const win = new BrowserWindow({
      width: 420, height: 720,
      title: '登录抖音',
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    })
    win.loadURL('https://www.douyin.com/?recommend=1')
    win.on('closed', () => {
      crawlLog('[douyin] Login window closed — cookies saved to session')
    })
    return { success: true }
  })

  // Crawl social account
  ipcMain.handle(
    'social-crawl:crawl',
    async (
      _event,
      projectPath: string,
      opts: { platform: string; url: string; accountName: string; manualData?: string }
    ) => {
      let videos: CrawledVideo[] = []
      let accountName = opts.accountName || '我的账号'

      crawlLog(`[social-crawl] === START crawl === platform=${opts.platform} url="${opts.url}" name="${opts.accountName}"`)

      // Platform-specific crawling
      try {
        if (opts.platform === 'douyin' && opts.url) {
          const result = await crawlDouyinProfile(opts.url)
          accountName = result.name || accountName
          videos = result.videos as CrawledVideo[]
        } else if (opts.platform === 'bilibili' && opts.url) {
          const result = await crawlBilibiliProfile(opts.url)
          accountName = result.name || accountName
          videos = result.videos as CrawledVideo[]
        } else if (opts.manualData) {
          videos = parseManualInput(opts.manualData)
        }
      } catch (err) {
        crawlLog(`[social-crawl] Crawl ${opts.platform} ERROR: ${err}`)
      }

      crawlLog(`[social-crawl] Crawl result: accountName="${accountName}" videosCount=${videos.length} platform=${opts.platform}`)

      // Build account data — always include name even if crawl failed
      const accountData: SelfAccountData = {
        name: accountName,
        platform: opts.platform,
        url: opts.url,
        crawledAt: new Date().toISOString(),
        followerCount: undefined,
        totalVideos: videos.length,
        videos
      }

      // AI analysis ALWAYS runs (same as benchmark: inference from name+platform)
      const aiAnalysis = await analyzeSelfAccount(accountData)
      if (aiAnalysis) {
        accountData.aiAnalysis = aiAnalysis
      }

      // Save
      const selfDir = join(projectPath, 'samples', 'self')
      if (!existsSync(selfDir)) mkdirSync(selfDir, { recursive: true })
      writeFileSync(join(selfDir, 'meta.json'), JSON.stringify(accountData, null, 2))

      const crawlSource = videos.length > 0 ? `crawled(${videos.length}videos)` : 'ai-inferred'
      crawlLog(`[social-crawl] === DONE === source=${crawlSource} hasAI=${!!aiAnalysis} name="${accountName}"`)

      return { success: true, account: accountData }
    }
  )

  // Get self account data
  ipcMain.handle('social-crawl:getSelf', async (_event, projectPath: string) => {
    const metaPath = join(projectPath, 'samples', 'self', 'meta.json')
    if (existsSync(metaPath)) {
      try {
        return JSON.parse(readFileSync(metaPath, 'utf-8'))
      } catch {
        return null
      }
    }
    return null
  })

  // Set "no self account" flag
  ipcMain.handle('social-crawl:setNoSelfAccount', async (_event, projectPath: string) => {
    const selfDir = join(projectPath, 'samples', 'self')
    if (!existsSync(selfDir)) {
      mkdirSync(selfDir, { recursive: true })
    }
    writeFileSync(
      join(selfDir, 'meta.json'),
      JSON.stringify({ noAccount: true, setAt: new Date().toISOString() }, null, 2)
    )
    return { success: true }
  })

  // Delete self account data
  ipcMain.handle('social-crawl:deleteSelf', async (_event, projectPath: string) => {
    const selfDir = join(projectPath, 'samples', 'self')
    if (existsSync(selfDir)) {
      const { rmSync } = await import('fs')
      rmSync(selfDir, { recursive: true, force: true })
    }
    return { success: true }
  })

  // Get self-analysis for integration with blueprint/persona/script
  ipcMain.handle('social-crawl:getSelfInsight', async (_event, projectPath: string) => {
    const metaPath = join(projectPath, 'samples', 'self', 'meta.json')
    if (!existsSync(metaPath)) return null
    try {
      const data = JSON.parse(readFileSync(metaPath, 'utf-8')) as SelfAccountData
      return {
        name: data.name,
        platform: data.platform,
        crawledAt: data.crawledAt,
        videoCount: data.videos?.length || 0,
        aiAnalysis: data.aiAnalysis || null
      }
    } catch {
      return null
    }
  })
}
