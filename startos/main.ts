import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { primaryUrl } from './primaryUrl'
import { sdk } from './sdk'
import {
  apiPort,
  appDir,
  applyAdminScript,
  mongoDataDir,
  mongoUri,
  mongoUser,
  panelDomainOf,
  panelEnv,
  scriptEnv,
  uiPort,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting C³ CELERITY'))

  const store = await storeJson
    .read((s) => ({
      mongoPassword: s.mongoPassword,
      sessionSecret: s.sessionSecret,
      encryptionKey: s.encryptionKey,
      adminPassword: s.adminPassword,
    }))
    .const(effects)
  const { mongoPassword, sessionSecret, encryptionKey, adminPassword } =
    store ?? {}
  if (!mongoPassword || !sessionSecret || !encryptionKey) {
    throw new Error(i18n('The internal secrets are missing from store.json.'))
  }
  if (!adminPassword) {
    throw new Error(i18n('Run Set Admin Password before starting the panel.'))
  }

  const url = await primaryUrl.bestUsable(effects).const()
  if (!url) {
    throw new Error(i18n('The API interface has no HTTPS address yet.'))
  }

  const env = panelEnv(
    { mongoPassword, sessionSecret, encryptionKey },
    panelDomainOf(url),
  )

  const mongoSub = sdk.SubContainer.of(
    effects,
    { imageId: 'mongo' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'db',
      subpath: null,
      mountpoint: mongoDataDir,
      readonly: false,
    }),
    'mongo',
  )

  const proxySub = sdk.SubContainer.of(
    effects,
    { imageId: 'nginx' },
    sdk.Mounts.of().mountAssets({
      subpath: 'api-proxy.conf',
      mountpoint: '/etc/nginx/nginx.conf',
      type: 'file',
    }),
    'api-proxy',
  )

  const valkeySub = sdk.SubContainer.of(
    effects,
    { imageId: 'valkey' },
    null,
    'valkey',
  )

  const celeritySub = sdk.SubContainer.of(
    effects,
    { imageId: 'celerity' },
    sdk.Mounts.of()
      .mountVolume({
        volumeId: 'main',
        subpath: 'backups',
        mountpoint: `${appDir}/backups`,
        readonly: false,
      })
      .mountVolume({
        volumeId: 'main',
        subpath: 'data',
        mountpoint: `${appDir}/data`,
        readonly: false,
      }),
    'celerity',
  )

  return sdk.Daemons.of(effects)
    .addDaemon('mongo', {
      subcontainer: mongoSub,
      exec: {
        command: sdk.useEntrypoint([
          'mongod',
          '--bind_ip',
          '127.0.0.1',
          '--wiredTigerCacheSizeGB',
          '0.5',
        ]),
        env: {
          MONGO_INITDB_DATABASE: 'hysteria',
          MONGO_INITDB_ROOT_USERNAME: mongoUser,
          MONGO_INITDB_ROOT_PASSWORD: mongoPassword,
        },
      },
      ready: {
        display: null,
        gracePeriod: 60_000,
        fn: async () => {
          // The entrypoint's first-boot mongod runs without --auth before the root user exists.
          const res = await mongoSub.exec(
            [
              'mongosh',
              '--quiet',
              '--norc',
              mongoUri(mongoPassword),
              '--eval',
              "db.adminCommand('getCmdLineOpts').parsed.security?.authorization",
            ],
            { timeout: 15_000 },
          )
          return res.exitCode === 0 &&
            res.stdout.toString().trim() === 'enabled'
            ? { result: 'success', message: null }
            : { result: 'starting', message: null }
        },
      },
      requires: [],
    })
    .addDaemon('valkey', {
      subcontainer: valkeySub,
      exec: {
        command: [
          'valkey-server',
          '--bind',
          '127.0.0.1',
          '--protected-mode',
          'yes',
          '--save',
          '',
          '--appendonly',
          'no',
          '--maxmemory',
          '256mb',
          '--maxmemory-policy',
          'allkeys-lru',
        ],
      },
      ready: {
        display: null,
        fn: async () => {
          const res = await valkeySub.exec(['valkey-cli', 'ping'])
          return res.stdout.toString().trim() === 'PONG'
            ? { result: 'success', message: null }
            : { result: 'starting', message: null }
        },
      },
      requires: [],
    })
    .addOneshot('apply-admin-password', {
      subcontainer: celeritySub,
      exec: {
        fn: async (sub) => {
          const pending = await storeJson
            .read((s) => s.adminPasswordPending)
            .once()
          if (!pending) return null
          await sub.execFail(['node', '-e', applyAdminScript], {
            cwd: appDir,
            env: {
              ...scriptEnv(mongoPassword),
              CELERITY_ADMIN_PASSWORD: adminPassword,
            },
          })
          await storeJson.merge(effects, { adminPasswordPending: false })
          return null
        },
      },
      requires: ['mongo'],
    })
    .addDaemon('celerity', {
      subcontainer: celeritySub,
      exec: {
        command: ['node', 'index.js'],
        cwd: appDir,
        env,
      },
      ready: {
        display: i18n('Web Interface'),
        gracePeriod: 60_000,
        fn: () =>
          sdk.healthCheck.checkWebUrl(
            effects,
            `http://127.0.0.1:${uiPort}/health`,
            {
              successMessage: i18n('The web interface is ready'),
              errorMessage: i18n('The web interface is not ready'),
            },
          ),
      },
      requires: ['mongo', 'valkey', 'apply-admin-password'],
    })
    .addDaemon('api-proxy', {
      subcontainer: proxySub,
      exec: { command: ['nginx', '-g', 'daemon off;'] },
      ready: {
        display: i18n('Node and Subscription API'),
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, apiPort, {
            successMessage: i18n('The API proxy is accepting connections'),
            errorMessage: i18n('The API proxy is not accepting connections'),
          }),
      },
      requires: ['celerity'],
    })
})
