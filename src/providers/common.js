// @flow
import type { Field, Model, InitOptions } from '../types'

export const defaultInitOptions: InitOptions = {
  getLabel(field) {
    return (field.description.match(/@?(.*?)[:]/) || [])[1] || field.name
  },
}
