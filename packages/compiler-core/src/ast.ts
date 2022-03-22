export enum NodeTypes {
  ROOT, //根节点
  ELEMENT, //HTML元素节点
  TEXT, //文本节点
  COMMENT,//注释节点
  INTERPOLATION,//插值节点 {{ccc}}
  ATTRIBUTE, //元素节点的属性节点
  DIRECTIVE, //指令
  SIMPLE_EXPRESSION, //简单表达式节点类型


  //codegen
  JS_ARRAY_EXPRESSION, 
  JS_FUNCTION_EXPRESSION,
  JS_CALL_EXPRESSION,
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
  props: Array<AttributeNode | DirectiveNode>,
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

/**
 * 
 * eg: <div v-bind:class="a">
 * 
 *{
 * name: 'if',
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
  content: string,
  isStatic: boolean
}





// //创建string字面量节点
// export function createStringLiteral(value) {
//   return {
//     type: NodeTypes.STRING_LITERAL,
//     value
//   }
// }

// //创建Identifier标识符节点
// export function createIdentifier(name) {
//   return {
//     type: NodeTypes.IDENTIFIER,
//     name
//   }
// }


//创建ArrayExpression数组表达式节点
export function createArrayExpression(elements) {
  return {
    type: NodeTypes.JS_ARRAY_EXPRESSION,
    elements
  }
}

//创建CallExpression函数调用表达式节点
export function createCallExpression(callee, _arguments) {
  return {
    type: NodeTypes.JS_CALL_EXPRESSION,
    callee: callee,
    arguments: _arguments
  }
}

//创建ReturnStatement表达式节点
// export function createReturnStatement(_return) {
//   return {
//     type: NodeTypes.RETURN_STATEMENT,
//     return: _return
//   }
// }

//创建FunctionDecl表达式节点
// export function createFunctionDecl(fnName, returnStatement) {
//   return {
//     type: NodeTypes.FUNCTION_DECL,
//     id: createIdentifier(fnName),
//     params: [],
//     body: [returnStatement]
//   }
// }

//创建根节点
export function createRoot(children: TemplateChildNode[]): RootNode {
  return {
    type: NodeTypes.ROOT,
    children
  }
}