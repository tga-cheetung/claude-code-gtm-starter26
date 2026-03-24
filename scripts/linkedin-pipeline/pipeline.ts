/**
 * LinkedIn Audience Pipeline — Orchestrator
 *
 * Chains all steps end-to-end.
 * Each step saves its output to data/runs/YYYY-MM-DD/.
 *
 * Flags:
 *   --from-step=2   Skip scrape, load 01-raw.json from disk
 *   --from-step=3   Skip scrape + filter
 *   --dry-run       Stop after classify, skip copy + push
 *
 * Run: npm run pipeline
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'

const today   = new Date().toISOString().split('T')[0]
const runDir  = path.join(process.cwd(), 'data', 'runs', today)
fs.mkdirSync(runDir, { recursive: true })

function save(filename: string, data: unknown) {
  const outPath = path.join(runDir, filename)
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2))
  console.log(`  → saved ${filename}`)
  return outPath
}

function load<T>(filename: string): T {
  const filePath = path.join(runDir, filename)
  if (!fs.existsSync(filePath)) {
    // Fall back to checkpoint data for live demos
    const checkpoint = path.join(process.cwd(), 'data', 'checkpoints', filename)
    if (fs.existsSync(checkpoint)) {
      console.log(`  [pipeline] Loading checkpoint: ${filename}`)
      return JSON.parse(fs.readFileSync(checkpoint, 'utf8')) as T
    }
    throw new Error(`File not found: ${filePath}`)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

async function run() {
  const args     = process.argv.slice(2)
  const fromStep = parseInt(args.find((a) => a.startsWith('--from-step='))?.split('=')[1] || '1')
  const dryRun   = args.includes('--dry-run')

  console.log(`\n${'='.repeat(60)}`)
  console.log(`LinkedIn Audience Pipeline — ${today}`)
  if (fromStep > 1) console.log(`Starting from step ${fromStep}`)
  if (dryRun)       console.log('Dry run — stopping after classify')
  console.log('='.repeat(60))

  // Steps are imported and wired here during Session 6.
  // Each session builds one step — by session 6 the full pipeline runs.
  console.log('\n[pipeline] Wire your steps here in Session 6.')
  console.log('[pipeline] Example:')
  console.log('  const raw      = await scrapeEngagers(TARGET_PROFILE_URL)')
  console.log('  const filtered = await filterByICP(raw)          // incl. RevyOps dedup')
  console.log('  const scored   = await classifyLeads(filtered)')
  console.log('  const enriched = await enrichLeads(scored)        // LeadMagic → Prospeo → Perplexity')
  console.log('  const verified = await verifyEmails(enriched)')
  console.log('  const withCopy = await generateCopy(verified)')
  console.log('  await pushToSmartlead(withCopy)                   // Smartlead CLI + stage to RevyOps')
}

run().catch((err) => {
  console.error('[pipeline] Fatal:', err)
  process.exit(1)
})
