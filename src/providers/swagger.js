// @flow

import axios from 'axios'
import Mitt from 'mitt'
import type { Provider, Field, Model, InitOptions as CommonInitOptions } from '../types'
import { defaultInitOptions as commonDefaultInitOptions } from './common'
import mapObj from 'map-obj'
import Immuter from 'immuter'

type InitOptions = CommonInitOptions & {
  parseResponse: (f: any) => any,
}
type Method = 'get' | 'post' | 'put' | 'delete' | 'head' | 'patch'

const defaultInitOptions = {
  ...commonDefaultInitOptions,
  parseResponse: (f: any) => f,
}

export default class SwaggerProvider extends Mitt implements Provider {
  __inited = false
  __schema: any
  __parsedTypes = {}
  __options: CommonInitOptions = defaultInitOptions

  constructor(url: string | Object, options?: CommonInitOptions = defaultInitOptions) {
    super()
    if (!arguments.length) return
    this.initSchema(url, options)
  }

  async initSchema(url: string | Object, options?: CommonInitOptions = defaultInitOptions) {
    let schema = url
    if (typeof schema === 'string') {
      const res = await axios.get(url)
      this.__options = options
      schema = res.data
    }
    this.__schema = schema
    this.__inited = true
    this.emit('init')
  }

  __parseParamType(param: any): Field {
    let newField = {
      name: param.name || '',
      label: '',
      type: '',
      description: param.description || '',
      default: param.default,
      required: Boolean(param.required),
      list: false,
      enum: null,
      // Specific fields
      in: param.in,
      items: null,
      ofType: null,
    }
    return this.__parseCommonField(newField, param)
  }

  __parseCommonField(newField: Field, field: any) {
    let type = field.name
    let wrapeType = null
    if (field.type === 'array') {
      newField.list = true
      wrapeType = 'Array'
    }
    if (field.enum) {
      newField.enum = field.enum
      type = `Enum<${field.type}>`
    }
    if (field.items && wrapeType) {
      ;(newField: any).ofType = this.__parseFieldType(field.items, field)
      type = `${wrapeType}<${(newField: any).items.type}>`
    }
    newField.type = type || 'Unknown'
    newField.label = this.__options.getLabel(newField)
    return newField
  }

  __parseFieldType(field: any, objectType: any): Field {
    let newField = {
      name: field.name || '',
      label: '',
      type: '',
      description: field.description || '',
      default: void 0,
      required: !!(Array.isArray(objectType.required) && objectType.required.includes(field.name)),
      list: false,
      enum: null,
      // Specific fields
      items: null,
      ofType: null,
    }
    return this.__parseCommonField(newField, field)
  }

  __resolveSchema(schema: any) {
    return mapObj(schema, (key, val, source) => {
      if (Object.keys(source).length === 1 && key === '$ref') {
        const path = val.replace(/^#\//, '').split('/')
        val = Immuter.get(schema, path)
        val.modelName = path[path.length - 1]
        return [key, val]
      }
      return [key, val]
    }, {})
  }

  __getParameterType(path: string, { method = 'post' }: { method?: Method } = {}): Model {
    const schema = this.__schema.paths[path][method]
    const parameters = this.__resolveSchema(schema.parameters)
    return {
      name: schema.operationId || `parameters:${path}:${method}`,
      fields: parameters.map(param => this.__parseParamType(param)),
    }
  }

  __getResponseType(path: string, { method = 'post' }: { method?: Method } = {}): Model {
    const schema = this.__schema.paths[path][method]
    const response = this.__resolveSchema(schema.responses['200'])
    return {
      name: response.modelName || `response:${path}:${method}`,
      fields: response.properties.map(param => this.__parseFieldType(param, response)),
    }
  }

  getModelType(path: string, {
    type = 'parameters',
    method,
  }: {
    type?: 'parameters' | 'response',
    method?: Method
  } = {}): Model {
    if (!this.__inited) {
      throw new Error(`SwaggerProvider hasn't init yet, please render your components after SwaggerProvider#on('init', () => { ... })`)
    }
    if (path.startsWith(this.__schema.basePath)) {
      path = path.slice(this.__schema.basePath.length)
    }
    const cacheKey = `${type}:${path}`
    let model = this.__parsedTypes[cacheKey]
    if (model) {
      return model
    }
    const options = { method }
    if (type === 'parameters') {
      model = this.__getParameterType(path, options)
    } else if (type === 'response') {
      model = this.__getResponseType(path, options)
    } else {
      throw new Error('Invalid type')
    }
    this.__parsedTypes[cacheKey] = model
    return model
  }
}
