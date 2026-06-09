import Groq from 'groq-sdk'
import type { DetectedStack, Finding, WebVital } from './types'
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
}: {
  url: string
  stack: DetectedStack
  vitals: WebVital[]
  topFindings: Finding[]
  currentScore: number
  achievableScore: number
}): Promise<string> {
  const vitalLines = vitals
    .map((v) => `${v.metric}: ${formatVitalValue(v.value, v.unit)} (${v.status})`)
    .join(', ')
  const findingLines = topFindings
    .map((f) => `- ${f.title} (+${f.estimatedPointImpact} pts)`)
    .join('\n')

  const prompt = `You are a performance engineering expert writing an audit report summary.

Site: ${url}
Framework: ${stack.framework} on ${stack.deployPlatform}
ShipAudit Score: ${currentScore}/100 (achievable: ${achievableScore}/100 with top fixes)
Core Web Vitals: ${vitalLines}
Top opportunities:
${findingLines}

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
}: {
  url: string
  stack: DetectedStack
  findings: Finding[]
}): Promise<string> {
  const topFive = findings.slice(0, 5)
  const fixLines = topFive
    .map((f) => `- ${f.title}: ${f.fix}`)
    .join('\n')

  const prompt = `You are writing a single, actionable prompt for a developer to paste into Cursor or Claude Code to fix the performance issues on their website.

Site: ${url}
Framework: ${stack.framework}
Top performance issues and their fixes:
${fixLines}

Write a single prompt (no preamble, no "Here is your prompt:") that:
- Opens with a one-sentence description of the task
- Lists the specific framework-aware fixes to implement (using ${stack.framework} conventions)
- Is actionable and specific enough that an AI coding assistant can implement without ambiguity
- Ends with exactly this sentence: "Preserve all existing functionality and target an LCP below 2.5 seconds."

Write only the prompt text, nothing else.`

  const fallback = `Optimize ${url} (${stack.framework}) by addressing the following performance issues:\n${fixLines}\nPreserve all existing functionality and target an LCP below 2.5 seconds.`
  return complete(prompt, 512, fallback)
}
