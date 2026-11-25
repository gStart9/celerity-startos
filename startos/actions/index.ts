import { primaryUrl } from '../primaryUrl'
import { sdk } from '../sdk'
import { disableTwoFactor } from './disableTwoFactor'
import { setAdminPassword } from './setAdminPassword'

export const actions = sdk.Actions.of()
  .addAction(setAdminPassword)
  .addAction(primaryUrl.action)
  .addAction(disableTwoFactor)
