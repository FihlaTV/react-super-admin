// @flow

import React, { Component } from 'react'
import { logger } from './utils'
import Immuter from 'immuter'
import type { ImmuterGet, ImmuterSet, ImmuterUpdate, ImmuterDel } from 'immuter'
import type { Field, Model, Renderer, Renderers, OnChange } from './types'

export type InitOptions = {
  renderers: Renderers,
  model: Model,
  includes?: string[],
  excludes?: string[],
  extraFields?: Field[],
  renderOptions?: Object,
  onChange?: OnChange,
}

function matchTypePattern(type, value) {
  if (type.includes('*')) {
    const pattern = type.replace(/\*/g, '.*')
    if (new RegExp(`^${pattern}$`).test(value)) {
      return type
    }
  }
  return false
}

export class FieldsRenderer {
  __options: InitOptions

  constructor(options?: InitOptions) {
    if (!options) {
      return
    }
    this.init(options)
  }

  init(options: InitOptions) {
    this.__options = Object.assign({}, this.__options, options)
  }

  renderField(field: Field, options: Object = {}): any {
    const { renderers = {} } = this.__options
    let render = renderers[field.type]
    let patternKey
    if (
      !render &&
      (patternKey =
        Object.keys(renderers)
          .find(key => matchTypePattern(key, field.type)))
    ) {
      render = renderers[patternKey]
    }
    if (!render) {
      logger.warn(
        `Field ${field.name}: ${field.type} doesn't find render. field:`,
        field,
        'renderers:',
        renderers
      )
      return null
    }
    return render(field, options)
  }

  render(values: Object): any {
    const {
      model,
      includes = [],
      excludes = [],
      extraFields = [],
      renderOptions = {},
      onChange = (...args: any[]) => {},
    } = this.__options

    let { fields } = model
    fields = fields
      .filter(field => !includes.length || includes.includes(field.name))
      .filter(field => !excludes.includes(field.name))

    // Merging extraFields
    let fieldsMap = fields.reduce((sum, field) => {
      sum[field.name] = field
      return sum
    }, {})
    return fields
      .concat(extraFields.filter(extraField => {
        if (fieldsMap[extraField.name]) {
          Object.assign(fieldsMap[extraField.name], extraField)
          return false
        }
        return true
      }))
      .map(field => this.renderField(field, {
        onChange,
        value: values[field.name],
        ...renderOptions,
      }))
  }
}

type Props = {
  model: Model,
  className?: string,
  value?: Object,
  defaultValue?: Object,
  onSubmit?: (value: any) => void,
  onChange?: (value: any) => void,
  children?: any,       // It's an eslint-plugin-react bug
  renderers: Renderers, // eslint-disable-line react/no-unused-prop-types
  includes?: string[], // eslint-disable-line react/no-unused-prop-types
  excludes?: string[], // eslint-disable-line react/no-unused-prop-types
  extraFields?: Field[], // eslint-disable-line react/no-unused-prop-types
  renderOptions?: Object, // eslint-disable-line react/no-unused-prop-types
  FormComp?: Class<React$Component<*, *, *>>,
  formProps?: Object,
  renderButtons?: ({submit: () => void}) => void,
  loading: any,
}

type State = {
  value: Object
}

@Immuter.bindComp()
export default class SuperForm extends Component<*, Props, State> {
  state: State = {
    value: this.props.value || this.props.defaultValue || {},
  }

  __fields: FieldsRenderer
  get: ImmuterGet
  set: ImmuterSet
  update: ImmuterUpdate
  del: ImmuterDel

  constructor(props: Props, context: any) {
    super(props, context)
    this.__fields = new FieldsRenderer()
    this.updateFieldsRenderer(props)
  }

  updateFieldsRenderer(props: Props = this.props) {
    const {
      model,
      includes = [],
      excludes = [],
      extraFields = [],
      renderOptions = {},
      renderers,
    } = props
    this.__fields.init({
      model,
      includes,
      excludes,
      extraFields,
      renderOptions,
      renderers,
      onChange: this.onChange,
    })
  }

  submit() {
    const { onSubmit } = this.props
    onSubmit && onSubmit(this.state.value)
  }

  reset() {
    this.set('value', this.props.defaultValue || {})
  }

  onChange(path: string, val: any) {
    let { value } = this.state
    const { onChange } = this.props
    value = Immuter.set(value, `value.${path}`, val)
    this.setState({ value })
    onChange && onChange(value)
  }

  componentWillReceiveProps(nextProps: Props) {
    if (this.props.value || nextProps.value) {
      this.setState({value: nextProps.value})
    }
    this.updateFieldsRenderer(nextProps)
  }

  renderDefaultLoading() {
    return (
      <div style={{
        margin: '0 auto',
        transform: 'translateY(-50%)',
        position: 'relative',
        top: '50%',
        color: '#aaa',
      }}>
        Loading...
      </div>
    )
  }

  render() {
    const {
      className, children, FormComp = 'form', formProps = {},
      renderButtons, model, loading,
    } = this.props
    if (!model) {
      return loading || this.renderDefaultLoading()
    }
    const { value } = this.state
    return (
      <FormComp className={className} onSubmit={this.submit} {...formProps}>
        {this.__fields.render(value)}
        {children}
        {renderButtons && renderButtons({submit: this.submit})}
      </FormComp>
    )
  }
}
