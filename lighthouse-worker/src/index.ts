import express from 'express'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

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

  let chrome: chromeLauncher.LaunchedChrome | undefined

  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
    })

    const result = await lighthouse(url, {
      port: chrome.port,
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
    await chrome?.kill()
  }
})

app.listen(PORT, () => {
  console.log(`Lighthouse worker listening on port ${PORT}`)
})
