# mrepo/

The boot component's part of the structure: the list of the packages the boot mrepo is made of, and its runtime config.

- **Its packages** (`packages/.layer.json`): the runtime, the protocol
  protocol, the warm boot, info, boot, haicc, this component last:
  those brought to the request.
- **Its runtime config**: its hooks, below. No service, no
  `commission`: the root, put in place, not deployed.
- **One fixture deployed by its hook**, the schema registry; nothing
  else by itself; its `main` holds
  the shortcuts of what it deploys (the install's registry is the work
  folder's `mrepos/`, not in it).

## Runtime config

With no service, everything hangs on `boot`, which its runtime runs
each time it starts, a line a command, before anything is taken in:

- The schema registry first, `boot/deploy avro-registry
  haiccing/base-component-avro-registry`: a fixture, at its fixed
  position, its commission loading its type data from the store,
  strictly (a type file that is no contract fails the line). Again at a
  restart: deployed already, nothing done.
- `boot`, `haicc`, `info`, `runtime` and `warm-boot` activated: the
  boot mrepo takes commands for them.
- Its info extracted.
