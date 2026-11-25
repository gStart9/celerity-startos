<p align="center">
  <img src="icon.svg" alt="C³ CELERITY Logo" width="21%">
</p>

# C³ CELERITY on StartOS

> Everything not listed in this document should behave the same as upstream
> C³ CELERITY. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[C³ CELERITY](https://github.com/ClickDevTech/CELERITY-panel) is a web panel for managing Hysteria 2 and Xray VLESS proxy nodes. The panel provisions nodes on remote VPS servers over SSH, authenticates the clients that connect to those nodes, and serves subscriptions. This package runs the panel with its MongoDB database and its Valkey cache on StartOS, and it splits the panel's address into a private admin interface and a public API interface that carries only the paths that machines call. The proxy nodes always run on remote VPS servers; the package runs no proxy on the StartOS server itself.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

The package runs four images. Upstream publishes its panel image for x86_64 only, so the package builds the panel image from upstream's own `Dockerfile` in the `upstream-project` git submodule, which yields both architectures. MongoDB, Valkey and nginx use their official images.

| Image      | Source                                            | Architectures   |
| ---------- | ------------------------------------------------- | --------------- |
| `celerity` | Built from `upstream-project` with its Dockerfile | x86_64, aarch64 |
| `mongo`    | `mongo` (Docker Official Image)                   | x86_64, aarch64 |
| `valkey`   | `valkey/valkey`                                   | x86_64, aarch64 |
| `nginx`    | `nginx`, Alpine variant (Docker Official Image)   | x86_64, aarch64 |

The package runs the following subcontainers:

- `mongo` runs the image's entrypoint with `mongod --bind_ip 127.0.0.1 --wiredTigerCacheSizeGB 0.5`. On an empty data directory the entrypoint creates the root user `hysteria` with the generated database password.
- `valkey` runs `valkey-server` on `127.0.0.1:6379` with persistence off and a 256 MB memory limit. The panel keeps its caches and its login sessions there.
- `celerity` runs `node index.js` in `/app`, with `USE_CADDY=true` so that the panel serves plain HTTP on port 3000 and leaves TLS to StartOS. The same subcontainer first runs the `apply-admin-password` oneshot.
- `api-proxy` runs `nginx -g 'daemon off;'` with `assets/api-proxy.conf` mounted read-only as `/etc/nginx/nginx.conf`. It listens on port 3001 and forwards the allowed paths to the panel on `127.0.0.1:3000`.

Upstream's `updater` sidecar and its Caddy reverse proxy are not part of the package. The updater needs the host's Docker socket, and StartOS terminates TLS itself.

## Volume and Data Layout

The package keeps its data in three volumes. Files outside them, including the panel's log files, are lost when the subcontainer is recreated, and the StartOS service log has the same lines.

| Volume    | Mount point                    | Contents                                                                                          |
| --------- | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `main`    | `/app/backups` and `/app/data` | The `backups` and `data` subdirectories: the panel's own backup archives and its access-log spool |
| `db`      | `/data/db` in `mongo`          | The MongoDB data files, which hold every user, node, group and setting of the panel               |
| `startos` | not mounted                    | `store.json`                                                                                      |

## File Models

The package writes no configuration file of the panel. The panel reads its whole configuration from environment variables that the package sets on every start, and its settings page writes everything else to MongoDB. The proxy's `nginx.conf` is a static asset of the package, not a file model, and nothing rewrites it.

`store.json` on the `startos` volume holds the package's own state:

| Key                    | Seeded                 | Rewritten by                                              |
| ---------------------- | ---------------------- | --------------------------------------------------------- |
| `mongoPassword`        | Generated at install   | Nothing                                                   |
| `sessionSecret`        | Generated at install   | Nothing                                                   |
| `encryptionKey`        | Generated at install   | Nothing                                                   |
| `adminPassword`        | Unset until the action | **Set Admin Password**                                    |
| `adminPasswordPending` | `false`                | **Set Admin Password** sets it, and the oneshot clears it |
| `primaryUrl`           | Unset                  | **Set API Address**                                       |

`encryptionKey` encrypts the SSH credentials of nodes and the admin's 2FA secret in MongoDB. Changing `encryptionKey` makes those values unreadable, and a panel backup archive refuses to restore into an install that has a different key.

The environment variables that the package sets on every start are `PANEL_DOMAIN`, `ACME_EMAIL`, `ENCRYPTION_KEY`, `SESSION_SECRET`, `MONGO_URI`, `REDIS_URL`, `USE_CADDY` and `PORT`. `PANEL_DOMAIN` is the host of the API address, with its port when the port is not 443. `ACME_EMAIL` is a single space, because upstream refuses an empty value, and every consumer of the value trims it to nothing.

## Dependencies

None.

## Network Access and Interfaces

The package binds two ports on two separate hosts, so a domain added to one interface never appears on the other.

| Interface                 | ID    | Type | Port | Protocol | Path     |
| ------------------------- | ----- | ---- | ---- | -------- | -------- |
| Admin Panel               | `ui`  | ui   | 3000 | HTTP     | `/panel` |
| Node and Subscription API | `api` | api  | 3001 | HTTP     | none     |

**Admin Panel** is the panel itself, with every route: the admin UI, the session-authenticated and API-key-authenticated `/api/*` routes, the MCP endpoint, and `/health`. The user is expected to keep it private.

**Node and Subscription API** is nginx in front of the same panel. nginx forwards only the following paths and answers 404 for every other path. Each path comes from a place where upstream builds a URL from `BASE_URL` for a machine to call:

| Path (exact)                               | Caller                     | Where upstream builds the URL                                               |
| ------------------------------------------ | -------------------------- | --------------------------------------------------------------------------- |
| `/api/auth`                                | Hysteria nodes             | `services/nodeSetup.js`, `services/syncService.js`, `routes/panel/nodes.js` |
| `/api/files/<token>`                       | Client apps, probes        | `routes/panel/wizard.js`, `services/probes/manifestService.js`              |
| `/api/info/<token>`                        | Client apps                | `routes/subscription.js` (subscription info)                                |
| `/api/access-logs/ingest`                  | CC Agent on Xray nodes     | `services/accessLogs/provisionService.js`                                   |
| `/api/probe/enroll`, `/profile`, `/ingest` | External probes            | `services/probes/manifestService.js`, the probe's `panel.go`                |
| `/agents/cc-agent-<platform>`              | FreeBSD nodes during setup | `services/nodeSetup.js` (`CC_AGENT_FREEBSD_URL` fallback)                   |

A token may only contain letters, digits, `_` and `-`. nginx matches locations against the normalized path but forwards the request line as the client sent it, so the configuration first rejects any request whose path contains percent-encoding, a `.` or `..` segment, a doubled slash, or any character outside letters, digits, `_`, `.`, `/` and `-`. nginx passes `X-Forwarded-For` and `X-Forwarded-Proto` from StartOS through unchanged, because the panel trusts exactly one proxy hop for the client address that its rate limiters key on. nginx accepts request bodies up to 9 MiB, above the panel's 8 MiB limit for access-log uploads.

The panel builds every URL that it hands out as `https://<PANEL_DOMAIN>`, from the address that **Set API Address** chooses among the API interface's HTTPS addresses. While no address is stored, the package uses StartOS's preferred HTTPS address of the API interface: a public domain if it has one, or else the `.local` address. A node or a client app that cannot reach that address cannot authenticate or update its subscription. Subscription links shown in the admin panel use the same address, whichever address the admin opened the panel at.

The admin panel works at any of its own addresses. Upstream checks no `Host` or `Origin` header, its redirects are relative, its CORS header only names `BASE_URL` and blocks nothing on same-origin requests, and its WebSocket upgrades only check the session. The session cookie is `Secure`, so sign-in only works over HTTPS addresses.

The panel makes outbound connections of its own: SSH to every node, HTTP calls to the CC Agent on Xray nodes, and HTTPS requests to GitHub when its update page checks for new releases. It also sends webhooks, S3 uploads and ClickHouse requests where the admin configures them. When the panel installs a CC Agent, it opens the agent's port on the node only to the IP address that `PANEL_DOMAIN` resolves to, so the panel's outbound connections must leave from that address.

## Installation and First-Run Flow

Upstream shows a setup page that creates the admin account to whoever opens the panel first. On StartOS the package creates the account before the panel is reachable, so the setup page never appears.

1. At install, the package generates the database password, the session secret and the encryption key into `store.json`.
2. A critical task asks for **Set Admin Password**, which blocks the first start.
3. On each start, the `apply-admin-password` oneshot waits for MongoDB. If `adminPasswordPending` is set, the oneshot creates the account `admin`, or sets the password of an existing `admin` account, with upstream's own admin model, and then clears the flag. The panel starts after the oneshot finishes, and the API proxy starts after the panel.

## Actions

**Set Admin Password** generates a 24-character password, stores it, and returns the username and the password.

- Run it at install, which the critical task requires, and whenever the admin password is lost.
- It changes `store.json`. If the service is running, the change restarts the whole service, and the oneshot applies the password during the restart. If the service is stopped, the oneshot applies the password on the next start.
- Each run replaces the password, including a password that the admin changed in the panel. A password changed in the panel is not reverted on later restarts. The action leaves 2FA as it is.

**Set API Address** chooses the address that `PANEL_DOMAIN` is built from, among the HTTPS addresses of the API interface.

- Run it once a public domain exists on the API interface, and whenever that domain changes.
- Storing a new address restarts the service. Nodes keep the authentication URL that they were configured with, and client apps keep the subscription link that they imported, so each node needs its configuration pushed again from the panel, and each user needs the new subscription link.

**Disable Two-Factor Authentication** clears the 2FA secret of the `admin` account in MongoDB.

- Run it when the admin lost the authenticator app. It needs the service to be running, because it talks to the running MongoDB.
- It is safe to repeat; a second run reports that 2FA was already off. It fails if the `admin` account does not exist.
- The panel's existing sessions stay valid.

## Tasks

The package raises two tasks.

- **Set Admin Password**, `critical`: raised while `store.json` holds no admin password, which is the case from install until the action first runs. The task blocks the service from starting. Running the action clears it, and it does not return, because nothing unsets the password afterwards.
- **Set API Address**, `important`: raised while no API address is stored, or while the stored address is no longer one of the API interface's addresses, for example after its public domain is removed. Choosing an address clears it. The task does not block the service, which uses the preferred HTTPS address meanwhile.

## Health Checks

The package shows two health checks.

**Web Interface** requests `http://127.0.0.1:3000/health`, with a grace period of 60 seconds. The panel answers once it has connected to MongoDB and Valkey, run its startup migrations and started listening. A failure past the grace period usually means that the panel exited at startup; the service log shows the reason, which is most often a MongoDB connection error.

**Node and Subscription API** checks that nginx listens on port 3001. nginx only starts once **Web Interface** passes. A failure while **Web Interface** passes means that nginx exited; the service log shows nginx's error. The check does not prove that a node can reach the public domain, which depends on the domain's DNS and on the gateway.

The MongoDB check (`mongosh` `ping`) and the Valkey check (`valkey-cli ping`) are hidden. The panel only starts once both pass, so a **Web Interface** check that stays in its starting state points at one of them. MongoDB 5 and later need a CPU with AVX on x86_64 and an ARMv8.2-A CPU on aarch64; on an older CPU `mongod` exits with an illegal instruction, and the panel never starts.

## Backups and Restore

The package copies all three volumes, `startos`, `main` and `db`, with the service stopped. MongoDB's data files are copied rather than dumped, and MongoDB recovers them from its journal when it starts.

Nothing is excluded. The panel's own backup archives in `main` are part of the backup. Login sessions live in Valkey, which keeps nothing, so every admin signs in again after a restore. A restored install keeps its encryption key, so the SSH credentials of nodes and the admin's 2FA stay readable.

## Limitations and Differences

1. The panel's certificate stays in StartOS, so the panel cannot hand it to nodes. Xray nodes whose TLS source is the panel's certificate, cascade links with TLS security, and the single-VPS setup where a node copies the panel's certificate all fail. REALITY, VLESS Encryption, self-signed certificates and Let's Encrypt on a node's own domain work.
2. No panel-wide ACME email exists, so a node that gets a certificate from Let's Encrypt needs its own ACME email in the node's settings.
3. The panel cannot update itself, because upstream's updater sidecar is not included. StartOS updates the panel.
4. The panel cannot run a proxy node on the StartOS server itself. Every node is a remote server that the panel reaches over SSH.
5. Nodes and client apps must reach the API interface at a public HTTPS address. With only the `.local` address, the panel works for administration on the LAN, but no remote node can authenticate clients.
6. The API interface does not serve the legacy subscription paths of a Marzban migration, whose prefix the admin configures in the panel. Users migrated from Marzban need their Celerity subscription links instead.
7. The interactive API documentation at `/api/docs` and the MCP endpoint are only on the admin interface.
8. The panel's log files under `/app/logs` are not kept across restarts.

---

## Quick Reference for AI Consumers

```yaml
package_id: celerity
image: built from upstream-project (ClickDevTech/CELERITY-panel)
architectures: [x86_64, aarch64]
subcontainers: [mongo, valkey, celerity, api-proxy]
volumes:
  main: /app/backups and /app/data (subpaths backups, data)
  db: /data/db
  startos: not mounted
file_models:
  - store.json
startos_managed_env_vars:
  - PANEL_DOMAIN
  - ACME_EMAIL
  - ENCRYPTION_KEY
  - SESSION_SECRET
  - MONGO_URI
  - REDIS_URL
  - USE_CADDY
  - PORT
dependencies: none
interfaces:
  ui: { type: ui, port: 3000 }
  api: { type: api, port: 3001 }
actions:
  - set-admin-password
  - set-api-address
  - disable-two-factor
tasks:
  - { action: set-admin-password, severity: critical }
  - { action: set-api-address, severity: important }
health_checks:
  - celerity
  - api-proxy
```
