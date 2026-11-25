import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { appDir, disableTwoFactorScript, scriptEnv } from '../utils'

export const disableTwoFactor = sdk.Action.withoutInput(
  'disable-two-factor',

  async () => ({
    name: i18n('Disable Two-Factor Authentication'),
    description: i18n(
      'Turn off two-factor authentication for the admin account, for example after the authenticator app is lost. The password stays the same, and you can turn two-factor authentication on again in the panel under Settings, Security.',
    ),
    warning: i18n(
      'Anyone who knows the admin password can then sign in without a code.',
    ),
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const mongoPassword = await storeJson.read((s) => s.mongoPassword).once()
    if (!mongoPassword)
      throw new Error(i18n('The database password is missing.'))

    const { stdout } = await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'celerity' },
      null,
      'disable-two-factor',
      (sub) =>
        sub.execFail(['node', '-e', disableTwoFactorScript], {
          cwd: appDir,
          env: scriptEnv(mongoPassword),
        }),
    )

    const outcome = stdout.toString().trim()
    if (outcome === 'missing') {
      throw new Error(
        i18n('The admin account does not exist. Run Set Admin Password first.'),
      )
    }

    return {
      version: '1',
      title: i18n('Two-Factor Authentication'),
      message:
        outcome === 'changed'
          ? i18n('Two-factor authentication is now off for the admin account.')
          : i18n(
              'Two-factor authentication was already off for the admin account.',
            ),
      result: null,
    }
  },
)
