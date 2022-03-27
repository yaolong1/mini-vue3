import { isString, isSymbol, PatchFlagNames, PatchFlags } from "@mini-vue3/shared";
import { CallExpression, InterpolationNode, NodeTypes, TemplateChildNode, TextNode, createCallExpression } from "../ast";
import { CREATE_TEXT } from "../runtimeHelpers";
import { NodeTransform } from "../transform"

//转换元素
export const transformText: NodeTransform = (node, context) => {

  //=========进入阶段代码=========//
  return () => {
    //=========退出阶段代码=========//
    if (node.type === NodeTypes.ROOT ||
      node.type === NodeTypes.ELEMENT) {
      const children = node.children;
      let currentContainer = undefined;
      let hasText = false;
      // 合并文本节点和插值节点
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isText(child)) {
          hasText = true;
          // 查找后面的节点
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j];
            // 找到了则进行合并
            if (isText(next)) {
              if (!currentContainer) {
                currentContainer = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  children: [child],
                };
              }

              // 合并相邻文本/插值表达式节点到 currentContainer 内
              currentContainer.children.push('+', next);
              children.splice(j, 1);
              j--
            } else {
              // 没找到就直接退出
              currentContainer = undefined;
              break;
            }
          }
        }
      }




      if (children.length === 1) {
        //如果children只有一个就不需要创建文本节点的表达式
        return
      }


      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isText(child) || child.type === NodeTypes.COMPOUND_EXPRESSION) {
          const callArgs: CallExpression['arguments'] = []
          // createTextVNode defaults to single whitespace, so if it is a
          // single space the code could be an empty call to save bytes.
          if (child.type !== NodeTypes.TEXT || child.content !== ' ') {
            callArgs.push(child)
          }
          //只考虑插值节点如果是插值节点说明是动态的
          if (child.type === NodeTypes.INTERPOLATION) {
            callArgs.push(
              PatchFlags.TEXT + ` /* ${PatchFlagNames[PatchFlags.TEXT]} */`
            )
          } else if (child.type === NodeTypes.COMPOUND_EXPRESSION) { 
            child.children.some(c => {
              if (!isString(c) && !isSymbol(c)) { 
                return  c.type === NodeTypes.INTERPOLATION
              }
            }) && callArgs.push(
                PatchFlags.TEXT + ` /* ${PatchFlagNames[PatchFlags.TEXT]} */`
              )
          }
          children[i] = {
            type: NodeTypes.TEXT_CALL,
            content: child,
            codegenNode: createCallExpression(
              context.helper(CREATE_TEXT),
              callArgs
            )
          }
        }
      }
    }

  }
}


export function isText(
  node: TemplateChildNode
): node is TextNode | InterpolationNode {
  return node.type === NodeTypes.INTERPOLATION || node.type === NodeTypes.TEXT
}