import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'celerity',
  title: 'C³ CELERITY',
  license: 'MIT',
  packageRepo: 'https://github.com/gStart9/celerity-startos',
  upstreamRepo: 'https://github.com/ClickDevTech/CELERITY-panel',
  marketingUrl: 'https://github.com/ClickDevTech/CELERITY-panel',
  donationUrl: 'https://celerity.help',
  description: { short, long },
  // main holds the panel's own backups and access-log spool, db the MongoDB data, startos store.json.
  volumes: ['main', 'db', 'startos'],
  images: {
    celerity: {
      source: {
        dockerBuild: {
          workdir: './upstream-project',
        },
      },
      arch: ['x86_64', 'aarch64'],
    },
    mongo: {
      source: { dockerTag: 'mongo:7.0.48' },
      arch: ['x86_64', 'aarch64'],
      emulateMissing: false,
    },
    valkey: {
      source: { dockerTag: 'valkey/valkey:9.2.0-alpine' },
      arch: ['x86_64', 'aarch64'],
    },
    nginx: {
      source: { dockerTag: 'nginx:1.30.8-alpine' },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
