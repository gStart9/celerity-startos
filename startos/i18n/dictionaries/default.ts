export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting C³ CELERITY': 0,
  'Web Interface': 1,
  'The web interface is ready': 2,
  'The web interface is not ready': 3,
  'The internal secrets are missing from store.json.': 4,
  'Run Set Admin Password before starting the panel.': 5,
  'The API interface has no HTTPS address yet.': 6,

  // interfaces.ts
  'Admin Panel': 7,
  'The admin panel, where you manage nodes, users and settings. Keep this interface private.': 8,
  'Node and Subscription API': 29,
  'The paths that proxy nodes, probes and client apps call: node authentication, subscription links, access-log and probe uploads, and agent downloads. Every other path answers 404. Add a public domain to this interface.': 30,

  // primaryUrl.ts and init/primaryUrlTask.ts
  'Set API Address': 9,
  "Choose the public domain that your proxy nodes and client apps use to reach the panel's API. Add the domain first under Interfaces, then Node and Subscription API, then Add Domain. The panel puts the domain in node configurations and subscription links, and it restarts to apply the change.": 10,
  Address: 11,
  "First set this service's Outbound Traffic gateway to the gateway that will carry the API, usually your StartTunnel. Then open Interfaces, then Node and Subscription API, click Add Domain on that same gateway, and add your public domain. Finally, choose that domain from the list below.": 12,

  // actions/setAdminPassword.ts and init/watchCredentials.ts
  'Set Admin Password': 13,
  'Generate a new random password for the admin account of the panel. The first run creates the account. The panel applies the password the next time that it starts, and it restarts now if it is running.': 14,
  'Replaces the current password of the admin account, including a password that was changed in the panel.': 15,
  'Admin Credentials': 16,
  'Use these credentials to sign in to the panel once it is running.': 17,
  Username: 18,
  Password: 19,
  'Create the admin account before you sign in to the panel.': 20,

  // actions/disableTwoFactor.ts
  'Disable Two-Factor Authentication': 21,
  'Turn off two-factor authentication for the admin account, for example after the authenticator app is lost. The password stays the same, and you can turn two-factor authentication on again in the panel under Settings, Security.': 22,
  'Anyone who knows the admin password can then sign in without a code.': 23,
  'The database password is missing.': 24,
  'The admin account does not exist. Run Set Admin Password first.': 25,
  'Two-Factor Authentication': 26,
  'Two-factor authentication is now off for the admin account.': 27,
  'Two-factor authentication was already off for the admin account.': 28,

  // main.ts, the API proxy
  'The API proxy is accepting connections': 31,
  'The API proxy is not accepting connections': 32,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
