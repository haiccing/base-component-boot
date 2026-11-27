# boot/

The boot, tested end to end as the package runs it.

It runs `bare run.js --work=<folder>` in a temporary work folder, removed
after, with everything from the package's own `modules/`. Entry: `run.js`;
the tests: `boot.test.js`. It leaves nothing running.

## Steps

1. **The sources missing**: a source folder that is not there; the boot
   says the step it failed at and why, on stderr, exit 1; no runtime
   started.
2. **A type file in the store that is no contract** (needs `SOURCES`):
   a package placed in the store before the boot, its type not
   documented; the registry's load fails, the boot mrepo's hook with
   it; the boot exits 1, saying the step, the hook's line and why, to
   the type file; not booted, no runtime left, the registry's folder
   gone.
3. **The whole lifecycle** (needs `SOURCES`):
   - the boot: a line a step, the outcome last; the boot mrepo built,
     its packages placed and linked, its runtime started on the Bare
     that ran it (none put in place), its boot hook waited for;
   - its boot hook, the mrepo's own requests, each done before anything
     is taken in: the schema registry deployed first, at its fixed
     position (its repository there, its commission loading its type
     data into its `main`, every type a contract), its protocols
     activated, its info extracted; its `avro` layer and a child's
     holding the runtime's three essential types;
   - requests dropped into its inbox as the `haicc` command drops them:
     `haicc/mrepos`; `boot/deploy host <the runtime package>`: what it
     says, placed by its unique URI beside the boot mrepo, its runtime
     running, its commission done, its shortcut in `main`, its link's
     record;
   - a command at the child's position, `haicc host runtime/run ...
     validate-in-situ`: sent on, the child's validation tests run in it
     and passed; the request it became linked, found in the child's
     `request/done`; `haicc host info/get`;
   - the runtime protocol here: a dry run of the runtime's `test/full`
     (its `types` unit among them); a position that is not there; a
     protocol not brought to the request yet;
   - `boot/redeploy host` (the old runtime ended, a new one, the link's
     key kept), deployed again (a repeat), `boot/teardown host`;
   - the boot run again: built already, its runtime the one running.

Leaves nothing running.
