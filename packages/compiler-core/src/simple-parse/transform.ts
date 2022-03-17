import { createArrayExpression, createCallExpression, createFunctionDecl, createIdentifier, createReturnStatement, createStringLiteral, createTemplateAstNode, NodeTypes, TemplateAstNode } from "./ast"



export type NodeTransform = (
  node: TemplateAstNode,
  context: TransformContext
) => void | (() => void)



export interface TransformOptions {
  nodeTransforms?: NodeTransform[]
}

export interface TransformContext extends TransformOptions {
  replaceNode: NodeTransform
  removeNode: (node?: TemplateAstNode) => void
  parent: TemplateAstNode | null
  childIndex: number
  currentNode: TemplateAstNode | null
}



/**
 * node转换:转换里面的标签信息
 */
export function transform(node: TemplateAstNode) {
  //创建一个转换上下文
  const context = createTransformContext()
  traverseNode(node, context)
}


function createTransformContext(): TransformContext {
  const context = {
    replaceNode,
    removeNode(node) {
      if (context.parent) {
        context.parent.children.splice(context.childIndex, 1)
        context.currentNode = null
      }
    },
    //当前转换节点的父节点
    parent: null,
    //当前节点在父节点children中的索引
    childIndex: 0,
    //当前正在转换的节点
    currentNode: null,
    nodeTransforms: [
      transformText,
      transformElement,
      transformRoot
    ]
  }
  return context
}

function traverseNode(ast: TemplateAstNode, context: TransformContext) {
  context.currentNode = ast
  //执行上下文中的转换方法
  const transforms = context.nodeTransforms
  const exitFns = []
  //循环执行转换函数
  if (transforms) {
    for (let i = 0; i < transforms.length; i++) {
      //这里返回的是退出阶段的函数
      //目的是为了解决，有些父节点需要在子节点转换完毕之后再转换的情况
      const onExit = transforms[i](context.currentNode, context)
      if (onExit) {
        exitFns.push(onExit)
      }
      //如果当前节点为空直接返
      if (!context.currentNode) return
    }
  }


  const children = context.currentNode.children
  //递归遍历执行
  children && children.forEach((node, index) => {
    //递归之前设置父节点为当前节点
    context.parent = context.currentNode
    //设置当前需要递归的节点所在父节点children的索引
    context.childIndex = index
    traverseNode(node, context)
  })

  //在此处执行退出阶段的函数就能实现保证孩子节点已经转换完成
  //必须倒叙执行
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}



//转换文本
const transformText: NodeTransform = (node, context) => {
  //=========进入阶段代码=========//
  // if (node.type === NodeTypes.TEXT) {
  // const newNode = createTemplateAstNode(NodeTypes.ELEMENT, 'h1')
  // context.replaceNode(newNode, context)
  //   context.removeNode()
  // }

  return () => {
    //=========退出阶段代码=========//
    //如果当前节点不是文本直接返回
    if (node.type !== NodeTypes.TEXT) return
    //如果是一个文本节点，直接创建一个字符字面量。在jsAst中文本节点就是一个字符字面量
    //保存到当前节点的jsNode
    node.jsNode = createStringLiteral(node.content)
  }
}




//转换元素
const transformElement: NodeTransform = (node, context) => {

  //=========进入阶段代码=========//
  // if (node.type === NodeTypes.ELEMENT && node.tag === 'h1') {
  //   //床架一个新节点
  //   const newNode = createTemplateAstNode(NodeTypes.TEXT, null, 'Vue')
  //   //替换上下文中当前的节点
  //   context.replaceNode(newNode, context)
  // }

  return () => {
    //=========退出阶段代码=========//
    //1、如果不元素直接退出
    if (node.type !== NodeTypes.ELEMENT) return

    //创建h函数调用语句
    const callExp = createCallExpression('h', [
      //第一个参数是标签字面量
      createStringLiteral(node.tag)
    ])

    //2、处理h函数调用参数
    node.children.length === 1
      //如果当前标签只有一个节点，则直接使用子节点的jsNode作为参数
      ? callExp.arguments.push((node.children[0] as TemplateAstNode).jsNode)
      // 如果有多个节点，创建一个数组表达式添加各个子节点的jsNode
      : callExp.arguments.push(createArrayExpression(
        node.children.map(node => node.jsNode)
      ))

    //将表达式保存到jsNode
    node.jsNode = callExp
  }
}

//根节点的转换
const transformRoot: NodeTransform = (node, context) => {

  //进入阶段代码...

  return () => {
    //退出阶段
    //如果当前节点不是根节点直接返回
    if (node.type !== NodeTypes.ROOT) return

    //创建根节点的jsNode
    //node是根节点，根节点第一个子节点就是模本的根节点
    //暂时不考虑模板存在多个根节点的情况，先默认只有一个根节点
    const vnodeJSAST = node.children[0].jsNode

    //根节点的jsNode
    node.jsNode = createFunctionDecl('render', createReturnStatement(vnodeJSAST))
  }
}

//当前节点的替换
const replaceNode: NodeTransform = (node, context) => {
  //新节点替换父节点children中childIndex所在的节点
  context.parent.children[context.childIndex] = node
  //当前节点替换成目标节点
  context.currentNode = node
}

