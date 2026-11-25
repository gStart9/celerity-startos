# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

## Repo mechanics

- Clone with `--recurse-submodules`. Without the `upstream-project` submodule, the panel image has nothing to build, and `LICENSE` and `icon.svg` are dangling symlinks.
- `assets/api-proxy.conf` is an allowlist. Add a path there only when upstream hands that path to a node, a probe, an agent or a client app through `BASE_URL`; an admin route there is reachable from the public domain.
