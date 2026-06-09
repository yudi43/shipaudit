import Groq from 'groq-sdk'
import type { DetectedStack, Finding, WebVital, ThirdPartyAudit, ImageAudit, FontAudit } from './types'
import { formatVitalValue } from './utils'

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function complete(prompt: string, maxTokens: number, fallback: string): Promise<string> {
  try {
    const msg = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    })
    return msg.choices[0]?.message?.content?.trim() ?? fallback
  } catch (err) {
    console.error('[summarize] Groq API error:', err instanceof Error ? err.message : err)
    return fallback
  }
}

export async function generateExecutiveSummary({
  url,
  stack,
  vitals,
  topFindings,
  currentScore,
  achievableScore,
  thirdParty,
  images,
  fonts,
}: {
  url: string
  stack: DetectedStack
  vitals: WebVital[]
  topFindings: Finding[]
  currentScore: number
  achievableScore: number
  thirdParty: ThirdPartyAudit
  images: ImageAudit
  fonts: FontAudit
}): Promise<string> {
  const vitalLines = vitals
    .map((v) => `${v.metric}: ${formatVitalValue(v.value, v.unit)} (${v.status})`)
    .join(', ')
  const findingLines = topFindings
    .map((f) => `- ${f.title} (+${f.estimatedPointImpact} pts)`)
    .join('\n')

  const extraContext: string[] = []
  if (thirdParty.worstOffender && thirdParty.worstOffender.blockingTimeMs > 100) {
    extraContext.push(`Worst third party: ${thirdParty.worstOffender.name} adding ${thirdParty.worstOffender.blockingTimeMs}ms blocking time`)
  }
  if (images.totalWastedKb > 500) {
    extraContext.push(`Images could save ${images.totalWastedKb}KB total`)
  }
  if (fonts.renderBlockingCount > 0) {
    extraContext.push(`${fonts.renderBlockingCount} font${fonts.renderBlockingCount > 1 ? 's' : ''} are render-blocking`)
  }

  const extraSection = extraContext.length > 0
    ? `\nAdditional context:\n${extraContext.map((l) => `- ${l}`).join('\n')}`
    : ''

  const prompt = `You are a performance engineering expert writing an audit report summary.

Site: ${url}
Framework: ${stack.framework} on ${stack.deployPlatform}
ShipAudit Score: ${currentScore}/100 (achievable: ${achievableScore}/100 with top fixes)
Core Web Vitals: ${vitalLines}
Top opportunities:
${findingLines}${extraSection}

Write 2-3 sentences of plain English that tell the performance story of this site.
Rules:
- Lead with the performance story, not a list of numbers
- Reference specific metric values only to illustrate the story
- Benchmark against Google CWV thresholds only — NEVER invent percentile comparisons or revenue estimates
- Do not start with "Your site" or "This site"
- No bullet points, no headers, plain prose only`

  const fallback = `Performance analysis for ${url} (${stack.framework}): ShipAudit Score ${currentScore}/100, achievable ${achievableScore}/100. Top opportunities include ${topFindings.map((f) => f.title).join(', ')}.`
  return complete(prompt, 256, fallback)
}

export async function generateCursorPrompt({
  url,
  stack,
  findings,
  thirdParty,
  images,
  fonts,
}: {
  url: string
  stack: DetectedStack
  findings: Finding[]
  thirdParty: ThirdPartyAudit
  images: ImageAudit
  fonts: FontAudit
}): Promise<string> {
  const topFive = findings.slice(0, 5)
  const fixLines = topFive
    .map((f) => `- ${f.title}: ${f.fix}`)
    .join('\n')

  const specificFixes: string[] = []

  // Name specific third-party services to defer
  const slowThirdParties = thirdParty.services.filter((s) => s.blockingTimeMs > 50)
  if (slowThirdParties.length > 0) {
    specificFixes.push(`Defer or lazy-load these third-party scripts: ${slowThirdParties.map((s) => s.name).join(', ')}`)
  }

  // Name specific image files
  const topImageIssues = images.issues.slice(0, 2)
  if (topImageIssues.length > 0) {
    specificFixes.push(`Optimize these images: ${topImageIssues.map((i) => `${i.filename} (save ~${i.wastedSizeKb}KB)`).join(', ')}`)
  }

  // Mention font-display:swap if missing
  if (fonts.missingFontDisplayCount > 0) {
    specificFixes.push(`Add font-display: swap to ${fonts.missingFontDisplayCount} font declaration${fonts.missingFontDisplayCount > 1 ? 's' : ''} to prevent invisible text during load`)
  }

  const specificSection = specificFixes.length > 0
    ? `\nSpecific issues to address:\n${specificFixes.map((l) => `- ${l}`).join('\n')}`
    : ''

  const prompt = `You are writing a single, actionable prompt for a developer to paste into Cursor or Claude Code to fix the performance issues on their website.

Site: ${url}
Framework: ${stack.framework}
Top performance issues and their fixes:
${fixLines}${specificSection}

Write a single prompt (no preamble, no "Here is your prompt:") that:
- Opens with a one-sentence description of the task
- Lists the specific framework-aware fixes to implement (using ${stack.framework} conventions)
- Is actionable and specific enough that an AI coding assistant can implement without ambiguity
- Ends with exactly this sentence: "Preserve all existing functionality and target an LCP below 2.5 seconds."

Write only the prompt text, nothing else.`

  const fallback = `Optimize ${url} (${stack.framework}) by addressing the following performance issues:\n${fixLines}\nPreserve all existing functionality and target an LCP below 2.5 seconds.`
  return complete(prompt, 512, fallback)
}
