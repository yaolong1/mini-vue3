import { RootNode, TemplateChildNode, ParentNode, NodeTypes, PlainElementNode, ComponentNode, TemplateNode } from './ast';
import { TransformOptions } from './options';
import { TO_DISPLAY_STRING, CREATE_COMMENT } from './runtimeHelpers';



export type NodeTransform = (
  node: RootNode | TemplateChildNode,
  context: TransformContext
) => void | (() => void)



export interface TransformContext extends TransformOptions {
  replaceNode: NodeTransform
  removeNode: (node?: TemplateChildNode | undefined) => void
  parent: ParentNode | null
  childIndex: number
  currentNode: RootNode | TemplateChildNode | null,
  helper<T extends symbol>(name: T): T
  root: RootNode,
  helpers: Map<symbol, number>
}


export function transform(root: RootNode, options: TransformOptions) {
  //创建一个转换上下文
  const context = createTransformContext(root, options)
  traverseNode(root, context)

  //创建根节点codegen
  createRootCodegen(root)

  root.helpers = [...context.helpers.keys()]
}


//创建根节点的codegenNode
function createRootCodegen(root: RootNode) {
  const { children } = root;
  if (children.length === 1) {
    const child = children[0];
    if (child.type === NodeTypes.ELEMENT && child.codegenNode) {
      const codegenNode = child.codegenNode;
      root.codegenNode = codegenNode;
    } else {
      root.codegenNode = child;
    }
  } else if (children.length > 1) {
    //TODO Fragment多根节点
  }
}



function createTransformContext(root: RootNode, { nodeTransforms = [], directiveTransforms = {} }: TransformOptions): TransformContext {
  const context = {
    removeNode(node) {
      if (context.parent) {
        context.parent.children.splice(context.childIndex, 1)
        context.currentNode = null
      }
    },
    //当前节点的替换
    replaceNode: (node) => {
      //新节点替换父节点children中childIndex所在的节点
      context.parent.children[context.childIndex] = node
      //当前节点替换成目标节点
      context.currentNode = node
    },
    //当前转换节点的父节点
    parent: null,
    //当前节点在父节点children中的索引
    childIndex: 0,
    //当前正在转换的节点
    currentNode: null,
    nodeTransforms,
    directiveTransforms,
    helper(name) {
      const count = context.helpers.get(name) || 0
      context.helpers.set(name, count + 1)
      return name
    },
    root,
    helpers: new Map(),
  }
  return context
}

function traverseNode(node: RootNode | TemplateChildNode, context: TransformContext) {
  context.currentNode = node
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
      if (!context.currentNode) {
        return
      } else {
        node = context.currentNode
      }
    }
  }

  switch (node.type) {
    case NodeTypes.COMMENT:
      context.helper(CREATE_COMMENT)
      break
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING)
      break
    case NodeTypes.ELEMENT:
    case NodeTypes.ROOT:
      traverseChildren(node, context)
      break
    default:
      break;
  }


  context.currentNode = node
  //在此处执行退出阶段的函数就能实现保证孩子节点已经转换完成
  //必须倒叙执行
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}


function traverseChildren(parent: ParentNode, context: TransformContext) {
  const children = parent.children
  //递归遍历执行
  children && children.forEach((node, index) => {
    //递归之前设置父节点为当前节点
    context.parent = parent
    //设置当前需要递归的节点所在父节点children的索引
    context.childIndex = index
    traverseNode(node, context)
  })
}