# boot

The boot: the boot mrepo put in place on a machine, its runtime started, and run again.

The `haicc` command runs this component's program from the sources once
they are linked and Bare is in place (`haicc prereq`). The boot mrepo is
the root: every command is addressed to it. Its boot hook deploys the
schema registry, `avro-registry`, a fixture of the install; nothing
else by itself.

## Steps

**At the machine**: the boot puts the install itself in place, below any mrepo: an `sh` procedure, no `steps.haicc`; run end to end by `base-linux-haicc`'s `test/run.sh`.

```sh
# the sources linked, Bare put in place from them
haicc sources link <folder>
haicc prereq
# the boot mrepo built, its packages placed, its runtime started
haicc boot/deploy
# what it is: its info, extracted by its boot hooks
haicc . info/get
# every runtime of the install stopped, what the boot put in place removed (Bare, the sources, the scripts kept)
haicc boot/teardown
# booted again: the boot mrepo built anew, its runtime started
haicc boot/deploy
```

## Notes

- **Run as a program**, the same: `bare base-component-boot.bundle
  --work=<folder> --sources=folder:<sources>` (the README, "Options").
