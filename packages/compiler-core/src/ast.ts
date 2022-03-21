export enum NodeTypes {
  ROOT, //根节点
  ELEMENT, //HTML元素节点
  TEXT, //文本节点
  COMMENT,//注释节点
  INTERPOLATION,//插值节点 {{ccc}}
  ATTRIBUTE, //元素节点的属性节点
  DIRECTIVE, //指令
  SIMPLE_EXPRESSION //简单表达式节点类型
}

//Vue中的HTML元素类型
export const enum ElementTypes {
  ELEMENT, //普通元素
  COMPONENT, // 组件元素
  SLOT, // 插槽元素
  TEMPLATE //template元素
}


export type ParentNode = RootNode | ElementNode

export type ExpressionNode = SimpleExpressionNode

export interface Node {
  type: NodeTypes
}


export interface BaseElementNode extends Node {
  type: NodeTypes.ELEMENT,
  tag: string,
  tagType: ElementTypes,
  isSelfClosing: boolean, //是否是自闭标签
  props: (AttributeNode | DirectiveNode)[],
  children: TemplateChildNode[]
}

//普通的HTML元素节点接口
export interface PlainElementNode extends BaseElementNode {
  tagType: ElementTypes.ELEMENT,
  codegenNode: undefined
}


//vue组件类型的元素节点接口
export interface ComponentNode extends BaseElementNode {
  tagType: ElementTypes.COMPONENT,
  codegenNode: undefined
}

//vue插槽类型的元素节点接口
export interface SlotOutletNode extends BaseElementNode {
  tagType: ElementTypes.SLOT,
  codegenNode: undefined
}

//vue Template类型的元素节点接口
export interface TemplateNode extends BaseElementNode {
  tagType: ElementTypes.TEMPLATE
  codegenNode: undefined
}


//根节点
export interface RootNode extends Node {
  type: NodeTypes.ROOT,
  children: TemplateChildNode[]
}

export interface AttributeNode extends Node {
  type: NodeTypes.ATTRIBUTE,
  name: string,
  value: TextNode | undefined
}

export interface DirectiveNode extends Node {
  type: NodeTypes.DIRECTIVE,
  name: string,
  value: undefined
}


//元素节点
export type ElementNode =
  | PlainElementNode
  | ComponentNode
  | SlotOutletNode
  | TemplateNode

//文本节点
export interface TextNode extends Node {
  type: NodeTypes.TEXT
  content: string
}

//注释节点
export interface CommentNode extends Node {
  type: NodeTypes.COMMENT
  content: string
}

//插值节点
export interface InterpolationNode extends Node {
  type: NodeTypes.INTERPOLATION
  content: ExpressionNode
}

export type TemplateChildNode =
  | ElementNode
  | TextNode
  | CommentNode
  | InterpolationNode



export interface SimpleExpressionNode extends Node {
  type: NodeTypes.SIMPLE_EXPRESSION
  content: string
}


//创建根节点
export function createRoot(children: TemplateChildNode[]): RootNode {
  return {
    type: NodeTypes.ROOT,
    children
  }
}