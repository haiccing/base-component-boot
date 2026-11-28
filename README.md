# base-component-boot

The boot component: the initial boot mrepo, the root of a host, and the program that puts it in place.

Run with Bare from its bundle, it builds the boot mrepo, places its
packages and starts its runtime. The boot mrepo's hook deploys the
schema registry, a fixture; then it takes commands, and deploys the
mrepos linked in it. Bare and
the sources are there before it runs: `haicc boot/deploy`, of
`haiccing/base-app-haicc`, runs it from the sources.

```sh
bare base-component-boot.bundle --work=<folder> --sources=folder:<sources>
```

## Links

- [mrepo](mrepo/)
- [howto](howto/)
- [test](test/)
- [test-reports](test-reports/)
- [modules](modules/)

## Included packages

- [base-package-runtime](../base-package-runtime/)
- [base-package-protocol](../base-package-protocol/)
- [base-package-warm-boot](../base-package-warm-boot/)
- [base-package-info](../base-package-info/)
- [base-package-boot](../base-package-boot/)
- [base-package-haicc](../base-package-haicc/)

## Steps

A program: it makes no request and follows none. It prints a line a step
as it completes, with what would be acted on (where, what, how long),
then its outcome, the last line.

0. **The work folder sorted**: its `mrepos/` and its `scripts/`, made
   when they are not there.
1. **The boot mrepo built** the first time into `<work>/mrepos/boot/`, as
   any mrepo is: this component's list fetched into the work folder's
   store, `<work>/packages/`, and laid in, each package's part of the
   structure in order; its identity written, `local/boot`. There
   already: left as it is.
2. **Its packages put in place**: each hard linked individually into `<work>/mrepos/boot/packages/`; the list,
   hashes, sources and store committed; their scripts placed.
3. **Its runtime started**, from its own `packages/`, by its directory, on
   the Bare that ran the boot, as its own process. It runs until
   stopped; running already: kept.
4. **Its boot hook waited for**: the boot mrepo's own, before it takes
   anything in: the schema registry deployed first, a fixture at its
   fixed position, its commission loading its type data from the store;
   then its protocols activated, its info extracted. A line of it that
   fails: its runtime has bailed out, stopped, and the boot fails here,
   with the line and why (a type file in the store that is no contract
   fails the registry's load, so the boot).

The outcome: `Booted: local/boot is running, pid <pid>, at <work>.`, exit
0; or `Failed at <step>: <why>`, on stderr, exit 1.

## Options

- `--work=<folder>`: the work folder; the current one by default.
- `--sources=folder:<path>`, repeated: where packages come from, in
  order; local folders only, trusted as given, nothing checked (a check
  of them belongs before the boot); none given, none. A source that is
  no folder fails the step that first reads it, said: `Failed at built:
  not a source: github:haiccing (folder:<path> only)`.

## The boot mrepo

- Its unique URI is `local/boot`. It is the root: commands are addressed
  to it, and it passes on those for the mrepos linked in it.
- No `service`: the one mrepo that is not service managed, every other
  is. It is the root: nothing upstream manages it, it is put in place by
  the boot program, not deployed, and takes commands from the start. Its
  `boot` hook, run by its runtime each time it starts, deploys the
  schema registry, activates its protocols (the warm boot's among
  them) and extracts its info.
- **Only what is brought to the request** is in its list for now: the
  help, haici and crud protocols come back as their packages are.
- **The work folder sorted first**: the boot program makes `mrepos/`,
  the install's registry (every mrepo placed there by its unique URI,
  kept by `boot/deploy` and `boot/teardown`), and `scripts/`, where a
  deploy places each package's scripts (the boot mrepo's own packages'
  placed by the boot program). Each there already: kept.

## Package

- `run.js`: the entry, the program above.
- `main.js`: the dispatcher, the bundle's main, generated.
- No protocol of its own.
