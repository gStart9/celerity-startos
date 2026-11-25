import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { apiHostId, apiInterfaceId } from './utils'

export const primaryUrl = sdk.setupPrimaryUrl({
  id: 'set-api-address',
  hostId: apiHostId,
  interfaceId: apiInterfaceId,
  metadata: {
    name: i18n('Set API Address'),
    description: i18n(
      "Choose the public domain that your proxy nodes and client apps use to reach the panel's API. Add the domain first under Interfaces, then Node and Subscription API, then Add Domain. The panel puts the domain in node configurations and subscription links, and it restarts to apply the change.",
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },
  field: { name: i18n('Address'), description: null },
  get: storeJson.read((s) => s.primaryUrl),
  set: (effects, url) => storeJson.merge(effects, { primaryUrl: url }),
  ssl: true,
})
