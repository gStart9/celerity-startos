import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const shape = z.looseObject({
  mongoPassword: z.string().optional().catch(undefined),
  sessionSecret: z.string().optional().catch(undefined),
  // Encrypts node SSH credentials and 2FA secrets; a new key makes them unreadable.
  encryptionKey: z.string().optional().catch(undefined),
  adminPassword: z.string().optional().catch(undefined),
  // True until the panel's database holds adminPassword.
  adminPasswordPending: z.boolean().catch(false),
  primaryUrl: z.string().optional().catch(undefined),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: 'store.json' },
  shape,
)
