// @flow
import type { Renderer, Renderers, Field, OnChange } from './types'

export const logger = ['log', 'error', 'warn', 'info'].reduce((logger, name) => {
  logger[name] = function (...args: any[]) {
    console[name]('[react-super-admin] ', ...args)
  }
  return logger
}, {})

export type Wrapper = (renderer: Renderer) => (field: Field, options: { onChange?: OnChange }) => Renderer

export function wrapRenderers(wrapper: Wrapper): (renderers: Renderers) => Renderers {
  return (renderers: Renderers) => Object.keys(renderers)
    .map(key => {
      const wrappedRenderer = wrapper(renderers[key])
      return [key, wrappedRenderer]
    })
    .reduce((newRendereres, [key, renderer]) => {
      newRendereres[key] = renderer
      return newRendereres
    }, {})
}
