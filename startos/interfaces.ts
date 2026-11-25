import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  apiHostId,
  apiInterfaceId,
  apiPort,
  uiHostId,
  uiInterfaceId,
  uiPort,
} from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const uiOrigin = await sdk.MultiHost.of(effects, uiHostId).bindPort(uiPort, {
    protocol: 'http',
  })
  const ui = sdk.createInterface(effects, {
    name: i18n('Admin Panel'),
    id: uiInterfaceId,
    description: i18n(
      'The admin panel, where you manage nodes, users and settings. Keep this interface private.',
    ),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '/panel',
    query: {},
  })

  const apiOrigin = await sdk.MultiHost.of(effects, apiHostId).bindPort(
    apiPort,
    { protocol: 'http' },
  )
  const api = sdk.createInterface(effects, {
    name: i18n('Node and Subscription API'),
    id: apiInterfaceId,
    description: i18n(
      'The paths that proxy nodes, probes and client apps call: node authentication, subscription links, access-log and probe uploads, and agent downloads. Every other path answers 404. Add a public domain to this interface.',
    ),
    type: 'api',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  return [await uiOrigin.export([ui]), await apiOrigin.export([api])]
})
