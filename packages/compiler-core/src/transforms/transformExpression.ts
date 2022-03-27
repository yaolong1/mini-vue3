import { NodeTypes } from "../ast";
import { NodeTransform } from '../transform';

export const transformExpression: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.INTERPOLATION) {
    //处理动态的插值
    node.content = processExpression(node.content);
  } else if (node.type === NodeTypes.ELEMENT) {
    //处理动态的props参数,
    node.props = node.props.map(prop => {
      if (prop.type === NodeTypes.DIRECTIVE) {
        const exp = prop.exp
        if (exp.type === NodeTypes.SIMPLE_EXPRESSION && !exp.isStatic) {
          exp.content = `_ctx.${exp.content}`
        }
      }
      return prop
    })
  }
}

function processExpression(node) {
  node.content = `_ctx.${node.content}`;

  return node
}
