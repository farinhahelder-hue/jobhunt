// JobBoard Factory - Source Adapters
export { linkedin } from './linkedin'
export { wttj } from './wttj'
export { franceTravail } from './france-travail'
export { apec } from './apec'
export { indeed } from './indeed'
export { hellowork } from './hellowork'
export { cadremploi } from './cadremploi'
export { monster } from './monster'
export { talent } from './talent'

import { linkedin } from './linkedin'
import { wttj } from './wttj'
import { franceTravail } from './france-travail'
import { apec } from './apec'
import { indeed } from './indeed'
import { hellowork } from './hellowork'
import { cadremploi } from './cadremploi'
import { monster } from './monster'
import { talent } from './talent'

export const adapters = {
  linkedin,
  wttj,
  france_travail: franceTravail,
  apec,
  indeed,
  hellowork,
  cadremploi,
  monster,
  talent,
}

export type Adapter = typeof adapters[keyof typeof adapters]
