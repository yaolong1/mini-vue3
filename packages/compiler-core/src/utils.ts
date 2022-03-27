import { JSChildNode, NodeTypes, SimpleExpressionNode } from "./ast";
import { CREATE_ELEMENT_VNODE, CREATE_VNODE } from "./runtimeHelpers";

export function getVNodeHelper(isComponent: boolean) {
  return isComponent ? CREATE_VNODE : CREATE_ELEMENT_VNODE
}

export const isStaticExp = (p: JSChildNode): p is SimpleExpressionNode =>
  p.type === NodeTypes.SIMPLE_EXPRESSION && p.isStatic