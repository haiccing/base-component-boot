// The boot, as the component runs it: bare run.js --work=<folder> (test/boot/run.js
// its entry). The boot mrepo built, its packages put in place, its runtime
// started (from its own packages/); a program: no request of its own,
// nothing followed. Nothing is deployed by it: a child is deployed by a
// command, and from there on everything is a request dropped into the boot
// mrepo's inbox, as the haicc command drops one.
// The sources: SOURCES, else ../../sources beside the packages (their
// bundles in it); what needs them skipped without.
// Everything from the package's own modules/.
import test from '../../modules/node_modules/brittle/index.js'
import process from '../../modules/node_modules/bare-process/index.js'
import { spawnSync } from '../../modules/node_modules/bare-subprocess/index.js'
import fs, { mkdtempSync, rmSync, readFileSync, existsSync, statSync } from '../../modules/node_modules/bare-fs/index.js'
import { join, dirname, resolve } from '../../modules/node_modules/bare-path/index.js'
import os, { tmpdir } from '../../modules/node_modules/bare-os/index.js'
import { fileURLToPath } from '../../modules/node_modules/bare-url/index.js'
import { openRepo, p2pgitBackend } from '../../modules/pear-full-square/mycelium-git/index.js'
import { asked, drop, nameOf, layer } from '../../modules/pear-full-square/mrepo-base-request/index.js'
import { ask, gitdirOf, viewOf, mountOf } from '../../modules/pear-full-square/mrepo-base-runtime/index.js'

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const alive = pid => spawnSync('kill', ['-0', String(pid)], { stdio: 'ignore' }).status === 0
const SOURCES = resolve(process.env.SOURCES || join(pkg, '..', '..', 'sources'))
// its list, as its packages layer has it
const LIST = JSON.parse(readFileSync(join(pkg, 'mrepo', 'packages', '.layer.json'), 'utf8')).packages
const have = [...LIST, 'haiccing/base-package-service'].every(p => existsSync(join(SOURCES, `${p}.bundle`)))

// A run of the boot, on the Bare running this test: its exit code, the
// lines it printed (what a step took taken off), what it said on stderr.
function boot (work, extra) {
  const r = spawnSync(os.execPath(), [join(pkg, 'run.js'), `--work=${work}`, ...extra], { stdio: ['ignore', 'pipe', 'pipe'] })
  return { code: r.status, lines: r.stdout.toString().split('\n').filter(Boolean).map(l => l.replace(/ \(\d+ ms\)$/, '')), err: r.stderr.toString() }
}

test('the sources missing: the boot says the step it failed at and why, exit 1', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boot-pre-'))
  try {
    const r = boot(work, ['--sources=folder:/nowhere/at/all'])
    t.is(r.code, 1, 'exit 1')
    t.alike(r.lines, [`The work folder: ${work}, its mrepos/ and scripts/ there.`], 'the step before it done, said')
    t.ok(/^Failed at built: /.test(r.err), `the step it failed at, and why, on stderr: ${r.err.trim()}`)
    t.is(await ask({ repo: viewOf(work, 'boot'), op: 'status' }), null, 'no runtime started')
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('the boot: put in place, its runtime started, its hook run (the warm boot first); a child deployed, its tests run in it, redeployed, torn down, by requests; run again', { timeout: 240000, skip: !have }, async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boot-'))
  const dir = viewOf(work, 'boot')
  try {
    const r = boot(work, [`--sources=folder:${SOURCES}`])
    t.is(r.code, 0, `done ${r.err}`)
    const s = await ask({ repo: dir, op: 'status' })
    const bundle = join(dir, 'packages', 'haiccing', 'base-package-runtime.bundle')
    t.alike(r.lines, [
      `The work folder: ${work}, its mrepos/ and scripts/ there.`,
      `Built local/boot at ${dir}, from haiccing/base-component-boot: 12 layers.`,
      `Placed its ${LIST.length} packages, linked from the store at ${join(work, 'packages')}; 0 scripts of theirs in scripts/:`,
      ...LIST.slice(0, -1).map(p => `  ${p}`),
      `  ${LIST.at(-1)}`,
      `Its runtime is running, pid ${s.pid}, started ${s.started}: ${os.execPath()} ${bundle} ${dir}`,
      `Booted: local/boot is running, pid ${s.pid}, at ${work}.`
    ], 'a line a step as it completes, what would be acted on in it; the outcome last')
    t.is(r.err, '', 'nothing on stderr')
    t.alike(s.repository, { name: 'boot', uri: 'local/boot', storage: 'filesystem', id: null, key: null }, 'running the boot mrepo, its unique URI local/boot, on the Bare that ran the boot')
    t.absent(existsSync(join(work, 'bare')), 'no Bare put in place: the one running it is used')

    // the packages: in the store once, hard linked into the boot mrepo
    const store = join(work, 'packages', 'haiccing', 'base-package-runtime.bundle')
    t.is(statSync(store).ino, statSync(bundle).ino, 'the runtime\'s bundle: in the store, hard linked into the boot mrepo: one file')
    const repo = openRepo(p2pgitBackend(gitdirOf(work, 'boot'), { fs }))
    t.alike(Object.keys(JSON.parse((await repo.read('/packages/manifest.json')).toString()).packages), LIST, 'its packages layer: the list, in order, the component last; only what is brought to the request')
    t.absent((await repo.select('/packages/haiccing')).length, 'not the bytes')

    // A request as the haicc command drops one: its line as typed, from the
    // terminal, its answer back; read from the outbox under its offset.
    const typed = async (line, tries = 600) => {
      const offset = drop(dir, 'local/boot', asked(line, { from: 'terminal', to: 'local/boot', reply: '/haicc/terminal' }))
      let v = null
      for (let i = 0; i < tries && !v; i++) { v = await layer({ repo }, 'outbox').read(nameOf(offset)).then(x => x.value, () => null); if (!v) await wait(100) }
      return v ? { offset, ...v } : null
    }
    // the first one waits behind the boot hook: nothing is taken in before it is done
    const all = await typed('haicc/mrepos')
    t.alike([all?.returned.status, all?.returned.message], ['done', '1 mrepo in the install\'s registry.\nlocal/boot at ., from haiccing/base-component-boot, running.'], 'the install\'s registry: the boot mrepo alone, nothing deployed by the boot')
    // its boot hook, the mrepo's own requests, each done before that: the warm boot first
    const own = []
    for (const n of await layer({ repo }, 'request/done').list()) { const v = (await layer({ repo }, 'request/done').read(n)).value; if (v.reply === null) own.push([v.command, v.returned.status]) }
    t.alike(own, [['protocol/activate . protocol', 'done'], ['warm-boot/prepare', 'done'], ['protocol/activate . boot', 'done'], ['protocol/activate . haicc', 'done'], ['protocol/activate . info', 'done'], ['protocol/activate . runtime', 'done'], ['protocol/activate . warm-boot', 'done'], ['info/extract', 'done']], 'the runtime\'s own, then its hook\'s lines in order, each a request of its own, done: the warm boot before anything else')
    const mount = join(mountOf(work), 'haiccing', 'base-package-runtime')
    t.ok(['record', 'request', 'attachment'].every(n => existsSync(join(mount, `${n}.avsc`))), 'the schema registry\'s skeleton mounted where the registry is: the runtime\'s types there (the request above was checked by them)')
    t.alike((await repo.select('/protocols/*')).map(([p]) => p.slice('/protocols/'.length)).filter(p => p !== '.layer.json').sort(), ['boot.json', 'haicc.json', 'info.json', 'protocol.json', 'runtime.json', 'warm-boot.json'], 'its protocols active')

    // a child deployed by a command at the root: the runtime package, on its own
    const host = viewOf(work, 'local/host')
    const first = await typed('boot/deploy host haiccing/base-package-runtime')
    const h = await ask({ repo: host, op: 'status' })
    t.alike([first?.returned.status, first?.returned.message, first?.form.uri], ['done', `Deployed host as local/host, from haiccing/base-package-runtime.\n5 packages placed.\nIts runtime is running, pid ${h?.pid}.\nIts commission is done.\nIts service is started.`, ['main', 'host']], 'boot/deploy host: what it says; its URI the layer, then what was written')
    t.alike(first.processing.changed.map(c => c.target).sort(), ['links', 'main'], 'what it changed here: its link, its node')
    t.alike([h?.repository.name, h?.repository.uri], ['host', 'local/host'], 'placed by its unique URI beside the boot mrepo, its runtime running, knowing its own unique URI')
    const [shortcut] = JSON.parse((await repo.read('/main/host/.shortcuts.json')).toString())
    const link = JSON.parse((await repo.read(`/links/${shortcut.link}.json`)).toString())
    t.alike([shortcut.mrepo, link.uri, link.at, link.how, link.package, link.runtime?.pid, link.commission, link.service], ['local/host', 'local/host', 'host', 'deployed', 'haiccing/base-package-runtime', h.pid, 'done', 'started'], 'its shortcut in main, its link\'s record in the links layer: what is local about it')

    // a command at its position: sent on at its shortcut, a request of its own there
    const ran = await typed('haicc host runtime/run . packages/haiccing/base-package-runtime/test/validate-in-situ')
    t.alike([ran?.returned.status, ran?.returned.message.split('\n')[0]], ['done', 'Passed: /test/validate-in-situ of haiccing/base-package-runtime, 3 units.'], `its validation tests, run in it: passed: ${ran?.returned.message.split('\n').slice(1).join(' / ')}`)
    t.alike([ran.processing.sent.at, ran.processing.sent.mrepo, ran.processing.waiting, ran.processing.log], ['host', 'local/host', null, []], 'sent on: the request it became linked (its mrepo, its offset there); what happened to it there not copied')
    const there = (await layer({ repo: openRepo(p2pgitBackend(join(host, '.git'), { fs })) }, 'request/done').read(nameOf(ran.processing.sent.offset))).value
    t.alike([there.command, there.from, there.to, there.reply, there.origin, there.returned], ['runtime/run . packages/haiccing/base-package-runtime/test/validate-in-situ', 'local/boot', 'local/host', `/local/boot/execute/${nameOf(ran.offset)}`, ran.offset, ran.returned], 'found there by the link: a request of its own, asked by the boot mrepo for this one; what it returned this one\'s answer')
    const info = await typed('haicc host info/get')
    t.alike([info?.returned.status, info?.returned.message.split('\n')[0]], ['done', '.: The mrepo runtime: the engine every mrepo runs on.'], 'its info, extracted by its commission: the page asked for, said')
    const dry = await typed('runtime/run . packages/haiccing/base-package-runtime/test/full dry-run')
    t.alike(dry?.returned.message.split('\n').slice(0, 7), ['Would run at /test/full of haiccing/base-package-runtime, nothing run:', '/test/start', '/test/types', '/test/info', '/test/code', '/test/mrepo', '/test/package'], 'the runtime protocol here: a dry run says what would run, its types among them')
    t.is((await typed('haicc nowhere info/get'))?.returned.message, 'Failed, nothing of it kept.\nhaicc nowhere: no node there', 'a position that is not there: failed, said')
    t.is((await typed('crud/read .'))?.returned.message, 'Refused, nothing run.\nno protocol: crud (boot, haicc, info, protocol, runtime, warm-boot)', 'a protocol not brought to the request yet: not here, said with those that are')

    // redeployed, torn down
    const re = await typed('boot/redeploy host')
    const h2 = await ask({ repo: host, op: 'status' })
    t.alike([re?.returned.status, re?.returned.message.split('\n').slice(0, 2)], ['done', [`Torn down host (local/host): its runtime stopped, pid ${h.pid}, its folder removed, its link out.`, 'Deployed host as local/host, from haiccing/base-package-runtime.']], 'boot/redeploy host: torn down, deployed again from the package it was deployed from')
    t.ok(h2?.pid && h2.pid !== h.pid && !alive(h.pid), 'the old runtime ended, a new one running')
    t.is(JSON.parse((await repo.read('/main/host/.shortcuts.json')).toString())[0].link, shortcut.link, 'the link keeps its key')
    t.is((await typed('boot/deploy host haiccing/base-package-runtime'))?.returned.message, 'host is deployed already, as local/host, from haiccing/base-package-runtime: nothing done.', 'deployed again: a repeat, said')
    const down = await typed('boot/teardown host')
    t.alike([down?.returned.message, existsSync(host), alive(h2.pid), await repo.find('/main/host/.shortcuts.json')], [`Torn down host (local/host): its runtime stopped, pid ${h2.pid}, its folder removed, its link out.`, false, false, null], 'boot/teardown host: its runtime ended, its folder and its shortcut gone')
    t.alike((await p2pgitBackend(gitdirOf(work, 'boot'), { fs }).listBranches()).map(([b]) => b).filter(b => b.startsWith('execute/')), [], 'no request branch left')

    // the boot run again: what is there kept
    const again = boot(work, [`--sources=folder:${SOURCES}`])
    t.alike([again.code, again.lines[1], again.lines.at(-1)], [0, `local/boot is built already, at ${dir}: left as it is.`, `Booted: local/boot is running, pid ${s.pid}, at ${work}.`], 'run again: built already, its runtime the one running, kept')
    t.ok(again.lines[2].includes(', as they were;'), 'its packages as they were: nothing committed')
    t.ok((await ask({ repo: dir, op: 'stop' }))?.stopping, 'stopped')
    for (let i = 0; i < 100 && alive(s.pid); i++) await wait(100)
    t.absent(alive(s.pid))
  } finally {
    // whatever happened: its runtimes stopped (the host's, the boot's), then its folder removed
    for (const r of [viewOf(work, 'local/host'), dir]) {
      const s = await ask({ repo: r, op: 'status' }).catch(() => null)
      if (s?.pid) { try { os.kill(s.pid, 'SIGTERM') } catch {} for (let i = 0; i < 50 && alive(s.pid); i++) await wait(100) }
    }
    rmSync(work, { recursive: true, force: true })
  }
})
