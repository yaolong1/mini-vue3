import { NodeTypes } from "./ast"
export * from './parse'
export * from './transform'
export * from './codegen'

export function dump(node, indent = 0) {
  const { type, tag, content, children } = node

  const desc = type === NodeTypes.ROOT ? '' : type === NodeTypes.ELEMENT ? tag : content
  console.log(`${'-'.repeat(indent)}${type}:${desc}`)
  //循环递归
  children && children.forEach(n => dump(n, indent + 2))
}