import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { randomSecret } from '../utils'

export const seedStore = sdk.setupOnInit(async (effects, kind) => {
  if (kind !== 'install') return
  await storeJson.merge(effects, {
    mongoPassword: randomSecret(32),
    sessionSecret: randomSecret(64),
    encryptionKey: randomSecret(32),
  })
})
