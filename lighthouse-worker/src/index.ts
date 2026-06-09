import express from 'express'
import lighthouse from 'lighthouse'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

const app = express()
app.use(express.json())

const PORT = process.env.PORT ?? 3001

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/audit', async (req, res) => {
  const { url } = req.body as { url?: string }

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url is required' })
    return
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined

  try {
    // PUPPETEER_EXECUTABLE_PATH is set by the Docker image (Chrome baked in).
    // Fall back to @sparticuz/chromium for serverless / non-Docker environments.
    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH ??
      await chromium.executablePath(process.env.CHROMIUM_EXECUTABLE_PATH ?? undefined)

    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--safebrowsing-disable-auto-update',
        '--js-flags=--max-old-space-size=256',
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    })

    const wsEndpoint = browser.wsEndpoint()
    const port = Number(new URL(wsEndpoint).port)

    const result = await lighthouse(url, {
      port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    })

    if (!result?.lhr) {
      res.status(500).json({ error: 'Lighthouse returned no result' })
      return
    }

    res.json(result.lhr)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[lighthouse-worker] audit failed:', message)
    res.status(500).json({ error: message })
  } finally {
    await browser?.close()
  }
})

app.listen(PORT, () => {
  console.log(`Lighthouse worker listening on port ${PORT}`)
})
