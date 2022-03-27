import { isString } from "@mini-vue3/shared"
import { CREATE_ELEMENT_VNODE } from "./runtimeHelpers"
import { TransformContext } from "./transform"
import { PropsExpression } from "./transforms/transformElement"

export enum NodeTypes {
  ROOT = "ROOT", //根节点
  ELEMENT = "ELEMENT", //HTML元素节点
  TEXT = "TEXT", //文本节点
  COMMENT = "COMMENT",//注释节点
  INTERPOLATION = "INTERPOLATION",//插值节点 {{ccc}}
  ATTRIBUTE = "ATTRIBUTE", //元素节点的属性节点
  DIRECTIVE = "DIRECTIVE", //指令
  SIMPLE_EXPRESSION = "SIMPLE_EXPRESSION", //简单表达式节点类型

  VNODE_CALL = "VNODE_CALL", //
  TEXT_CALL = "TEXT_CALL", //

  COMPOUND_EXPRESSION = "COMPOUND_EXPRESSION", //复杂表达式节点
  //codegen
  JS_ARRAY_EXPRESSION = "JS_ARRAY_EXPRESSION",
  JS_FUNCTION_EXPRESSION = "JS_FUNCTION_EXPRESSION",
  JS_CALL_EXPRESSION = "JS_CALL_EXPRESSION",
  JS_BLOCK_STATEMENT = "JS_BLOCK_STATEMENT",
  JS_RETURN_STATEMENT = "JS_RETURN_STATEMENT",
  JS_OBJECT_EXPRESSION = "JS_OBJECT_EXPRESSION",
  JS_PROPERTY = "JS_PROPERTY",
}

//Vue中的HTML元素类型
export const enum ElementTypes {
  ELEMENT, //普通元素
  COMPONENT, // 组件元素
  SLOT, // 插槽元素
  TEMPLATE //template元素
}


export type ParentNode = RootNode | ElementNode

export type ExpressionNode = SimpleExpressionNode | CompoundExpressionNode

export interface Node {
  type: NodeTypes
}

export interface BaseElementNode extends Node {
  type: NodeTypes.ELEMENT,
  tag: string,
  tagType: ElementTypes,
  isSelfClosing: boolean, //是否是自闭标签
  props: Array<AttributeNode | DirectiveNode>,
  children: TemplateChildNode[]
}

//普通的HTML元素节点接口
export interface PlainElementNode extends BaseElementNode {
  tagType: ElementTypes.ELEMENT,
  codegenNode: TemplateChildNode
}


//vue组件类型的元素节点接口
export interface ComponentNode extends BaseElementNode {
  tagType: ElementTypes.COMPONENT,
  codegenNode: TemplateChildNode
}

//vue插槽类型的元素节点接口
export interface SlotOutletNode extends BaseElementNode {
  tagType: ElementTypes.SLOT,
  codegenNode: TemplateChildNode
}

//vue Template类型的元素节点接口
export interface TemplateNode extends BaseElementNode {
  tagType: ElementTypes.TEMPLATE
  codegenNode: TemplateChildNode | JSChildNode
}


//根节点
export interface RootNode extends Node {
  type: NodeTypes.ROOT,
  children: TemplateChildNode[],
  codegenNode?: TemplateChildNode | JSChildNode,
  helpers: symbol[]
}

export interface AttributeNode extends Node {
  type: NodeTypes.ATTRIBUTE,
  name: string,
  value: TextNode | undefined
}

/**
 * 
 * eg: <div v-bind:class="a">
 * 
 *{
 * name: 'bind',
 * exp:{
 *  type: SIMPLE_EXPRESSION,
 *  content: 'a',
 *  isStatic: false
 * },
 * arg: {
 *  type: SIMPLE_EXPRESSION,
 *  content: 'class',
 *  isStatic: true
 * } 
 *}  
 */
export interface DirectiveNode extends Node {
  type: NodeTypes.DIRECTIVE,
  name: string,
  exp: ExpressionNode | undefined,
  arg: ExpressionNode | undefined
  modifiers?: string[]
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
  | CompoundExpressionNode
  | InterpolationNode
  | TextCallNode


//普通表达式节点
export interface SimpleExpressionNode extends Node {
  type: NodeTypes.SIMPLE_EXPRESSION
  content: string,
  isStatic: boolean
}

//复杂表达式节点
export interface CompoundExpressionNode extends Node {
  type: NodeTypes.COMPOUND_EXPRESSION
  children: (
    | SimpleExpressionNode
    | CompoundExpressionNode
    | InterpolationNode
    | TextNode
    | string
    | symbol
  )[],
  isHandlerKey?: boolean
}


export interface FunctionExpression extends Node {
  type: NodeTypes.JS_FUNCTION_EXPRESSION
  params: ExpressionNode | string | (ExpressionNode | string)[] | undefined
  returns?: TemplateChildNode | TemplateChildNode[] | JSChildNode
  body?: BlockStatement
}

export interface BlockStatement extends Node {
  type: NodeTypes.JS_BLOCK_STATEMENT
  body: (JSChildNode)[]
}

export interface ReturnStatement extends Node {
  type: NodeTypes.JS_RETURN_STATEMENT
  returns: TemplateChildNode | TemplateChildNode[] | JSChildNode
}



export interface DirectiveArguments extends ArrayExpression {
  elements: DirectiveArgumentNode[]
}

export interface DirectiveArgumentNode extends ArrayExpression {
  elements: // dir, exp, arg, modifiers
  | [string]
  | [string, ExpressionNode]
  | [string, ExpressionNode, ExpressionNode]
  | [string, ExpressionNode, ExpressionNode, ObjectExpression]
}


export type JSChildNode =
  | VNodeCall
  | CallExpression
  | ObjectExpression
  | ArrayExpression
  | ExpressionNode
  | FunctionExpression

export interface ObjectExpression extends Node {
  type: NodeTypes.JS_OBJECT_EXPRESSION
  properties: Array<Property>
}

export interface Property extends Node {
  type: NodeTypes.JS_PROPERTY
  key: ExpressionNode
  value: JSChildNode
}

export interface ArrayExpression extends Node {
  type: NodeTypes.JS_ARRAY_EXPRESSION
  elements: Array<string | Node>
}
export interface CallExpression extends Node {
  type: NodeTypes.JS_CALL_EXPRESSION
  callee: string | symbol
  arguments: (
    | string
    | symbol
    | JSChildNode
    | TemplateChildNode
    | TemplateChildNode[]
  )[]
}

export interface VNodeCall extends Node {
  type: NodeTypes.ELEMENT  //此处源码应该为NodeTypes.VNODE_CALL,为了方便直接为Element
  tag: string | symbol | CallExpression
  props: PropsExpression | undefined
  children:
  | TemplateChildNode[] // multiple children
  | SimpleExpressionNode // hoisted
  | undefined
  patchFlag: string | undefined
  dynamicProps: string | SimpleExpressionNode | undefined
  directives: DirectiveArguments | undefined
  isComponent: boolean
}


export interface TextCallNode extends Node {
  type: NodeTypes.TEXT_CALL
  content: TextNode | InterpolationNode | CompoundExpressionNode
  codegenNode: CallExpression | SimpleExpressionNode
}

export function createCompoundExpression(
  children: CompoundExpressionNode['children'],
): CompoundExpressionNode {
  return {
    type: NodeTypes.COMPOUND_EXPRESSION,
    children
  }
}

export function createSimpleExpression(content, isStatic = false): SimpleExpressionNode {
  return {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content,
    isStatic,
  };
}


//创建ArrayExpression数组表达式节点
export function createArrayExpression(elements): ArrayExpression {
  return {
    type: NodeTypes.JS_ARRAY_EXPRESSION,
    elements
  }
}

//创建CallExpression函数调用表达式节点
export function createCallExpression(callee, _arguments): CallExpression {
  return {
    type: NodeTypes.JS_CALL_EXPRESSION,
    callee,
    arguments: _arguments
  }
}

export function createObjectExpression(properties): ObjectExpression {
  return {
    type: NodeTypes.JS_OBJECT_EXPRESSION,
    properties,
  };
}

export function createObjectProperty(key, value): Property {
  return {
    type: NodeTypes.JS_PROPERTY,
    key: isString(key) ? createSimpleExpression(key, true) : key,
    value,
  };
}


//创建根节点
export function createRoot(children: TemplateChildNode[]): RootNode {
  return {
    type: NodeTypes.ROOT,
    helpers: [],
    children
  }
}

// 这个函数是用来生成 codegenNode 的
export function createVNodeCall(
  context: TransformContext | null,
  tag: VNodeCall['tag'],
  props?: VNodeCall['props'],
  children?: VNodeCall['children'],
  patchFlag?: VNodeCall['patchFlag'],
  dynamicProps?: VNodeCall['dynamicProps'],
  directives?: VNodeCall['directives'],
  isComponent: VNodeCall['isComponent'] = false,
): VNodeCall {
  if (context) {
    context.helper(CREATE_ELEMENT_VNODE);
  }
  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    children,
    patchFlag,
    dynamicProps,
    directives,
    isComponent,
  };
}
