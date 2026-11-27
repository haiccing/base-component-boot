// The boot: the boot mrepo, the root, put in place up to its runtime's start.
// A program: it makes no request and follows none. Run with Bare from its
// bundle (haicc boot/deploy: base-app-haicc, the haicc command) or from the
// package's folder. What it needs is there already: Bare (the one running
// this), the sources. A line a step as it completes, with what would be
// acted on (where, what, how long); then the outcome, the last line:
//   0. the work folder sorted: its mrepos/ (where every mrepo is placed, by
//      its unique URI: the install's registry) and its scripts/ (each
//      package's scripts, placed by a deploy: <org>/<package>/<name>.haicc,
//      what the haicc command runs), made when they are not there;
//   1. the boot mrepo built into <work>/mrepos/boot/ the first time, as any
//      mrepo is: this component's list fetched into the store
//      (<work>/packages/) and laid in, each package's part of the structure
//      in order, runtime config from the last, this component; its identity
//      written (its unique URI, local/boot);
//   2. its packages put in place (its packages layer's list): hard linked
//      individually from the store into its packages/, the list, hashes,
//      sources and store committed; their scripts placed in <work>/scripts/;
//   3. its runtime started, from its own packages/, by its directory, on the
//      Bare running this (<bare> <work>/mrepos/boot/packages/haiccing/
//      base-package-runtime.bundle <work>/mrepos/boot), as its own process
//      (it outlives the boot); already running: kept.
//   4. its boot hook waited for (the boot mrepo's own: the schema registry
//      deployed, its protocols activated, before it takes anything in); a
//      line of it that fails: its runtime bails out, the boot fails.
// The outcome: `Booted: local/boot is running, pid <pid>, at <work>.`, exit
// 0; or `Failed at <step>: <why>`, on stderr, exit 1.
// Nothing is deployed by it: the boot mrepo then takes commands (haicc .
// boot/deploy host <package>).
//   run.js [--work=<folder>] [--sources=folder:<path>|github:<org>]...
//     --work      the work folder: the current one by default
//     --sources   where packages come from, in order (github:haiccing when
//                 none is given)
// Our modules from the package's own modules/ (no node_modules above them here).
import process from './modules/node_modules/bare-process/index.js'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from './modules/node_modules/bare-fs/index.js'
import { tmpdir } from './modules/node_modules/bare-os/index.js'
import { join, resolve } from './modules/node_modules/bare-path/index.js'
import { gitdirOf, open, viewOf, start, booted } from './modules/pear-full-square/mrepo-base-runtime/index.js'
import { build, lay, parseSource, place, storeOf, placeScripts } from './modules/pear-full-square/mrepo-base-boot/index.js'
import { MREPOS, SCRIPTS } from './modules/pear-full-square/mrepo-base-request/index.js'
import { openRepo } from './modules/pear-full-square/mycelium-git/index.js'

// This component: the package the boot mrepo is deployed from, its list the
// packages it is made of.
const TARGET = 'haiccing/base-component-boot'
const NAME = 'boot'
// Its unique URI: the root of what this host deploys.
const URI = 'local/boot'
// Every build of the same structure the same commits (2026-11-10T00:00:00Z).
const BUILT = 1762732800

// The arguments: after the script (bare run.js ..., bare <bundle> /run ...).
const script = /\.(js|bundle)$/.test(process.argv[1] ?? '')
const args = process.argv.slice(script ? 2 : 1).filter(a => a !== '/run')
// The Bare running this: the boot mrepo's runtime is started on it.
const BARE = process.execPath
const value = flag => args.filter(a => a.startsWith(`--${flag}=`)).map(a => a.slice(flag.length + 3))
const work = resolve(value('work')[0] ?? '.')
const sources = (value('sources').length ? value('sources') : ['github:haiccing']).map(parseSource)
const dir = viewOf(work, NAME)

// console: the program's own output: a line a step as it completes, what
// it took behind it; the step it failed at, on stderr
// A step: done, said; what it throws: the step it is, why, exit 1.
async function step (name, fn) {
  const began = Date.now()
  try {
    const said = await fn()
    console.log(`${said} (${Date.now() - began} ms)`)
  } catch (err) {
    console.error(`Failed at ${name}: ${err.message}`)
    process.exit(1)
  }
}

// 0. The work folder sorted: mrepos/ and scripts/ (idempotent: there, kept).
await step('the work folder', async () => {
  for (const f of [MREPOS, SCRIPTS]) mkdirSync(join(work, f), { recursive: true })
  return `The work folder: ${work}, its ${MREPOS}/ and ${SCRIPTS}/ there.`
})

// 1. Built, the first time: its list laid in, as deploy lays a child's.
await step('built', async () => {
  if (existsSync(gitdirOf(work, NAME))) return `${URI} is built already, at ${dir}: left as it is.`
  const tmp = mkdtempSync(join(tmpdir(), 'boot-mrepo-'))
  try {
    lay({ store: storeOf(work), sources, target: TARGET, into: tmp })
    // its identity, in its runtime layer
    if (existsSync(join(tmp, 'runtime', '.layer.json'))) writeFileSync(join(tmp, 'runtime', 'mrepo.json'), JSON.stringify({ uri: URI }, null, 2) + '\n')
    const { layers } = await build({ from: tmp, work, name: NAME, time: BUILT })
    return `Built ${URI} at ${dir}, from ${TARGET}: ${Object.keys(layers).length} layers.`
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

// 2. Its packages put in place: the list its packages layer holds; their
// scripts, in the work folder's scripts/, as a deploy places them.
await step('packages', async () => {
  const repo = await open(work)
  let list
  try { list = JSON.parse((await openRepo(repo.backend).read('/packages/.layer.json')).toString()).packages } finally { await repo.close() }
  const placed = await place({ dir, store: storeOf(work), sources, list })
  const scripts = list.flatMap(pkg => placeScripts({ store: storeOf(work), pkg, into: join(work, SCRIPTS) }))
  return [`Placed its ${list.length} packages, linked from the store at ${storeOf(work)}${placed.committed ? '' : ', as they were'}; ${scripts.length} ${scripts.length === 1 ? 'script' : 'scripts'} of theirs in ${SCRIPTS}/:`, ...list.map(p => `  ${p}`)].join('\n')
})

// 3. Its runtime started: it runs its boot hook, then takes commands.
const runtime = join(dir, 'packages', 'haiccing', 'base-package-runtime.bundle')
let status = null
await step('its runtime', async () => {
  status = await start({ repo: dir, bundle: runtime, bare: BARE })
  if (!status) throw new Error(`it did not start: ${BARE} ${runtime} ${dir}`)
  return `Its runtime is running, pid ${status.pid}, started ${status.started}: ${BARE} ${runtime} ${dir}`
})

// 4. Its boot hook waited for: its fixtures deployed, its protocols
// activated. A line of it that fails: its runtime has bailed out, stopped.
await step('its boot hook', async () => {
  const b = await booted({ repo: dir })
  if (b.state === 'failed') throw new Error(`${b.error} (its runtime stopped; nothing taken in)`)
  return b.state === 'none' ? 'It has no boot hook.' : 'Its boot hook is done: its fixtures deployed, its protocols active.'
})

console.log(`Booted: ${URI} is running, pid ${status.pid}, at ${work}.`)
// Done: ended here (nothing left open to keep it alive).
process.exit(0)
