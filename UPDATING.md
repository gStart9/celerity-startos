# Updating the upstream version

The package pins four upstream sources: the panel, which is the `upstream-project` git submodule, and the MongoDB, Valkey and nginx images in `startos/manifest/index.ts`.

## Determining the upstream version

### Panel

Upstream tags each release as `v<version>`, and its CI refuses a tag that differs from the version in its `package.json`:

```
gh release view -R ClickDevTech/CELERITY-panel --json tagName -q .tagName
git -C upstream-project describe --tags
```

### MongoDB

Upstream's `docker-compose.yml` names the MongoDB major version that the panel runs against. Take the newest patch tag of that major from Docker Hub, with the major and minor in the `name` filter:

```
curl -s "https://hub.docker.com/v2/repositories/library/mongo/tags?page_size=100&name=7.0." | jq -r '.results[].name' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -1
```

### Valkey

```
curl -s "https://hub.docker.com/v2/repositories/valkey/valkey/tags?page_size=100" | jq -r '.results[].name' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+-alpine$' | sort -V | tail -1
```

### nginx

Take the newest tag of the current stable line, which has an even minor version:

```
curl -s "https://hub.docker.com/v2/repositories/library/nginx/tags?page_size=100&name=alpine" | jq -r '.results[].name' | grep -E '^1\.[0-9]*[02468]\.[0-9]+-alpine

### Panel

1. Move the submodule to the new tag:

```

git -C upstream-project fetch --tags origin
git -C upstream-project checkout v<version>

```

2. Set the upstream part of the version in `startos/versions/current.ts` to the tag without its `v`.
3. Check that `src/models/adminModel.js` still exports `createAdmin`, `changePassword` and `clearTwoFactor` with the same arguments, because the scripts in `startos/utils.ts` call them. Check that `config.js` still requires the same environment variables as `panelEnv` in `startos/utils.ts` sets.
4. Compare the machine-facing paths with `assets/api-proxy.conf`: run `git -C upstream-project diff <old tag> <new tag> -- index.js src | grep -E 'BASE_URL|app\.use\('` and look for a new path that nodes, probes, agents or client apps call. A path missing from the allowlist answers 404 on the API interface.

### MongoDB

Set `images.mongo.source.dockerTag`. Stay on the major version that upstream's `docker-compose.yml` names; a newer major needs MongoDB's own upgrade path through each major version and its feature compatibility version, which this package does not perform.

### Valkey

Set `images.valkey.source.dockerTag`. Valkey keeps no data here, so any release that speaks the Redis protocol works.

### nginx

Set `images.nginx.source.dockerTag`. The configuration uses only long-standing core directives.
| sort -V | tail -1
```

## Applying the bump

### Panel

1. Move the submodule to the new tag:

   ```
   git -C upstream-project fetch --tags origin
   git -C upstream-project checkout v<version>
   ```

2. Set the upstream part of the version in `startos/versions/current.ts` to the tag without its `v`.
3. Check that `src/models/adminModel.js` still exports `createAdmin`, `changePassword` and `clearTwoFactor` with the same arguments, because the scripts in `startos/utils.ts` call them. Check that `config.js` still requires the same environment variables as `panelEnv` in `startos/utils.ts` sets.

### MongoDB

Set `images.mongo.source.dockerTag`. Stay on the major version that upstream's `docker-compose.yml` names; a newer major needs MongoDB's own upgrade path through each major version and its feature compatibility version, which this package does not perform.

### Valkey

Set `images.valkey.source.dockerTag`. Valkey keeps no data here, so any release that speaks the Redis protocol works.
