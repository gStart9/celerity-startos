import { i18n } from '../i18n'
import { primaryUrl } from '../primaryUrl'

export const primaryUrlTask = primaryUrl.setupTask('important', {
  reason: i18n(
    "First set this service's Outbound Traffic gateway to the gateway that will carry the API, usually your StartTunnel. Then open Interfaces, then Node and Subscription API, click Add Domain on that same gateway, and add your public domain. Finally, choose that domain from the list below.",
  ),
})
