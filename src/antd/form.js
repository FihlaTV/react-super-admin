// @flow
import React from 'react'
import type { Field, Renderer, Renderers, OnChange } from '../types'
import { Input, Form } from 'antd'
import { wrapRenderers } from '../utils'

function bindChange(path: string, onChange?: OnChange) {
  return (value: any, ...args: any[]) => {
    onChange && onChange(path, value)
  }
}

const wrapFormItem = wrapRenderers(renderer =>
  (field, options) => {
    return (
      <Form.Item label={field.label}>
        {renderer(field, options)}
      </Form.Item>
    )
  })

export const renderers: Renderers = wrapFormItem({
  String(field, options) {
    return (
      <Input
        type="text"
        value={options.value || field.default}
        onChange={bindChange(field.name, options.onChange)}
      />
    )
  },
  'Array<String>'() {

  },
})
