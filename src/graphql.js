// @flow

import axios from 'axios'
import Mitt from 'mitt'

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
export type ConfigOptions = {
  renders: {
  }
}

function log(...args: any[]) {
  console.log('[graphql-to-form] ', ...args)
}

export type Field = {
  name: string,
  type: string,
  fullType: string, // 'String' | 'Int' | 'Float' | 'Enum' | 'Array<String>'' | 'Array<>' | Boolean'
  description: string,
  list: boolean,
  required: boolean,
  enum: string[],
}
export default class GraphQLForms extends Mitt {
  constructor(url, ...args) {
    super()
    if (!url) return
    this.initSchema(url, ...args)
  }
  async initSchema(url: string | Object, options?: ConfigOptions = {}) {
    let schema = url
    if (typeof schema === 'string') {
      const res = await axios.post(url, {
        query: typesQuery,
      })
      this.options = options
      schema = res.data
    }
    this.allTypes = {}
    for (let type of schema.data.__schema.types) {
      this.allTypes[type.name] = type
    }
    this.emit('init')
  }
  parseFieldType(field: any): Field {
    const fieldType = {
      ...field.type,
      fieldName: field.name,
    }
    let newField = {
      name: fieldType.fieldName || '',
      rawType: fieldType.name,
      type: null,
      kind: fieldType.kind,
      ofType: fieldType.ofType,
      description: fieldType.description || '',
      required: false,
      list: false,
      enum: null,
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
        type = 'Enum'
        break
      default:
    }
    if (fieldType.ofType) {
      newField.ofType = this.parseFieldType(newField.ofType, type)
      if (wrapeType) {
        type = `${wrapeType}<${newField.ofType.fullType}>`
      } else {
        type = type || newField.ofType.name
      }
    }
    newField.fullType = type
    return newField
  }
  parseObjectType(type: any): {name: string, fields: Field[] } {
    if (type.kind !== 'OBJECT') {
      throw new TypeError('Type must be an OBJECT type!', type)
    }
    let fields = type.fields
    if (type.fields) {
      fields = []
      fields = type.fields.map(field => this.parseFieldType(field))
    }
    return {
      ...type,
      fields,
    }
  }
  async renderType(name: string, options?: { defaults: any } = { defaults: {} }) {
    if (!this.allTypes) {
      await new Promise(resolve => this.on('init', resolve))
    }
    const type = this.allTypes[name]
    const { fields } = this.parseObjectType(type)
    const { renders = {} } = this.options
    return fields.map(field => {
      const render = renders[field.fullType]
      if (!render) {
        log(`Type ${field.fullType} doesn't find render. field:`, field, 'renders:', renders)
        return null
      }
      return renders[field.fullType]({
        ...field,
        default: options.defaults && options.defaults[field.name],
      })
    })
  }
}
