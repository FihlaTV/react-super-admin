// @flow

export type Field = {
  name: string,
  type: string, // 'String' | 'Int' | 'Float' | 'Enum' | 'Array<String>'' | 'Array<>' | Boolean'
  description: string,
  list: boolean,
  required: boolean,
  enum: ?string[],
  label: string,
  default: any,
}

export type Model = {
  name: string,
  fields: Field[]
}

export type InitOptions = {
  getLabel(field: Field): string,
}

export interface Provider {
  constructor(url: string | Object, options?: InitOptions): void;
  initSchema(url: string | Object, options?: InitOptions): Promise<void>;
  // parseFieldType(field: any): Field;
  // parseObjectType(type: any): {name: string, fields: Field[] };
  getModelType(name: string): Model;
  // renderType(name: string, options?: { default: any }): any;
  // renderTypes(name: string, options?: { defaults: any }): any;
}

export type OnChange = (path: string, value: any, ...args: any[]) => void

export type Renderer = (field: Field, options: { onChange?: OnChange }) => any
export type Renderers = {[string]: Renderer}
