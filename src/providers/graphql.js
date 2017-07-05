// @flow

import axios from 'axios'
import Mitt from 'mitt'
import type { Provider, Field, Model, InitOptions } from '../types'
import { defaultInitOptions } from './common'

const typesQuery = /* GraphQL */`
  query schemaTypes {
    __schema{
      types{
        name
        kind
        fields {
          name
          deprecationReason
          type {
            name
            kind
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                    ofType {
                      kind
                      name
                      ofType {
                        kind
                        name
                        ofType {
                          kind
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
            enumValues {
              name
              description
              isDeprecated
              deprecationReason
            }
            description
          }
          description
          isDeprecated
          deprecationReason
        }
      }
    }
  }
`

export default class GraphQLProvider extends Mitt implements Provider {
  __inited = false
  __allTypes = {}
  __parsedTypes = {}
  __options: InitOptions = defaultInitOptions

  constructor(url: string | Object, options?: InitOptions = defaultInitOptions) {
    super()
    if (!arguments.length) return
    this.initSchema(url, options)
  }

  async initSchema(url: string | Object, options?: InitOptions = defaultInitOptions) {
    let schema = url
    if (typeof schema === 'string') {
      const res = await axios.post(url, {
        query: typesQuery,
      })
      this.__options = options
      schema = res.data
    }
    this.__allTypes = {}
    for (let type of schema.data.__schema.types) {
      this.__allTypes[type.name] = type
    }
    this.__inited = true
    this.emit('init')
  }

  __parseFieldType(field: any): Field {
    const fieldType = {
      ...field.type,
      fieldName: field.name,
    }
    let newField = {
      name: fieldType.fieldName || '',
      label: '',
      type: '',
      description: fieldType.description || '',
      default: void 0,
      required: false,
      list: false,
      enum: null,
      // Specific fields
      rawType: fieldType.name,
      kind: fieldType.kind,
      ofType: fieldType.ofType,
    }
    let type = fieldType.name
    let wrapeType = null
    switch (fieldType.kind) {
      case 'NON_NULL':
        newField.required = true
        break
      case 'LIST':
        newField.list = true
        wrapeType = 'Array'
        break
      case 'ENUM':
        newField.enum = fieldType.enumValues
        wrapeType = 'Enum'
        type = `Enum<String>`
        break
      default:
    }
    if (fieldType.ofType) {
      newField.ofType = this.__parseFieldType(newField.ofType)
      if (wrapeType) {
        type = `${wrapeType}<${newField.ofType.type}>`
      } else {
        type = type || newField.ofType.name
      }
    }
    newField.type = type || 'Unknown'
    newField.label = this.__options.getLabel(newField)
    return newField
  }
  __parseObjectType(type: any): {name: string, fields: Field[] } {
    if (type.kind !== 'OBJECT') {
      throw new TypeError('Type must be an OBJECT type!' + type)
    }
    let fields = type.fields
    if (type.fields) {
      fields = []
      fields = type.fields.map(field => this.__parseFieldType(field))
    }
    return {
      name: type.name,
      fields,
    }
  }

  getModelType(name: string): Model {
    if (!this.__inited) {
      throw new Error(`GraphQLProvider hasn't init yet, please render your components after GraphQLProvider#on('init', () => { ... })`)
    }
    const type = this.__allTypes[name]
    const parsedType = this.__parsedTypes[name] ||
      (this.__parsedTypes[name] = this.__parseObjectType(type))
    return parsedType
  }
}
