import { utils } from '@start9labs/start-sdk'

export const uiPort = 3000
export const uiHostId = 'main'
export const uiInterfaceId = 'ui'

export const apiPort = 3001
export const apiHostId = 'api'
export const apiInterfaceId = 'api'

export const appDir = '/app'
export const mongoDataDir = '/data/db'
export const mongoUser = 'hysteria'
export const mongoDatabase = 'hysteria'
export const adminUsername = 'admin'

export const randomSecret = (len: number) =>
  utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len })

export const mongoUri = (password: string) =>
  `mongodb://${mongoUser}:${password}@127.0.0.1:27017/${mongoDatabase}?authSource=admin`

/** The environment that the panel reads through its config.js. */
export function panelEnv(
  secrets: {
    mongoPassword: string
    sessionSecret: string
    encryptionKey: string
  },
  panelDomain: string,
) {
  return {
    PANEL_DOMAIN: panelDomain,
    // config.js refuses an empty value; blank after trim, so each node needs its own ACME email.
    ACME_EMAIL: ' ',
    ENCRYPTION_KEY: secrets.encryptionKey,
    SESSION_SECRET: secrets.sessionSecret,
    MONGO_URI: mongoUri(secrets.mongoPassword),
    REDIS_URL: 'redis://127.0.0.1:6379',
    USE_CADDY: 'true',
    PORT: String(uiPort),
  }
}

/** The host part of a URL, with the port unless it is the scheme's default. */
export function panelDomainOf(url: string) {
  const { hostname, port } = new URL(url)
  return port ? `${hostname}:${port}` : hostname
}

/** The environment of the admin scripts, which run with `appDir` as their working directory. */
export const scriptEnv = (mongoPassword: string) => ({
  MONGO_URI: mongoUri(mongoPassword),
  CELERITY_ADMIN_USERNAME: adminUsername,
})

const withAdminModel = (body: string) => `
const mongoose = require('mongoose');
const Admin = require('./src/models/adminModel');
const username = process.env.CELERITY_ADMIN_USERNAME;
(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
${body}
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
`

/** Creates the admin account, or replaces its password and keeps its 2FA. */
export const applyAdminScript = withAdminModel(`
  const password = process.env.CELERITY_ADMIN_PASSWORD;
  if (await Admin.findOne({ username })) {
    await Admin.changePassword(username, password);
  } else {
    await Admin.createAdmin(username, password);
  }
`)

/** Prints `changed`, `unchanged` or `missing`. */
export const disableTwoFactorScript = withAdminModel(`
  const admin = await Admin.findOne({ username }).lean();
  if (!admin) {
    console.log('missing');
  } else if (admin.twoFactor && admin.twoFactor.enabled) {
    await Admin.clearTwoFactor(username);
    console.log('changed');
  } else {
    console.log('unchanged');
  }
`)
