import { createTemplateAstNode, NodeTypes, Tag, TagEnd, TemplateAstNode, tokenzie,Text } from "./ast"




//有限状态机的状态
export const enum State {
  INITIAL = 'initial',       //1、 初始状态
  TAG_OPEN = 'tagOpen',      //2、标签开始状态
  TAG_NAME = 'tagName',      //3、标签名称状态
  TEXT = 'text',             //4、文本状态
  TAG_END = 'tagEnd',        //5、标签结束状态
  TAG_END_NAME = 'tagEndName'//6、标签结束美年广场状态
}

//将模板字符串转换为templateAst
export function parse(template: string): TemplateAstNode {
  // 获取template的tokens
  const tokens = tokenzie(template)

  //根节点
  const Root = createTemplateAstNode(NodeTypes.ROOT, null, null, null, [])
  //ast
  const elementStack = [Root]

  //使用while循环扫描token
  while (tokens.length) {
    //将栈顶节点作为父节点节点
    const parent = elementStack[elementStack.length - 1]

    //当前扫描的token
    const { type, name, content } = tokens[0]
    switch (type) {
      //token的类型是tag
      case Tag:
        const elementNode = createTemplateAstNode(NodeTypes.ELEMENT, name, null, null, [])

        //添加到父节点的children中
        parent.children.push(elementNode)

        //将当前转换的节点压入栈中
        elementStack.push(elementNode)
        break;
      //token的类型是Text
      case Text:
        const textNode = createTemplateAstNode(NodeTypes.TEXT, null, content)
        //将textNode作为父节点的子节点
        parent.children.push(textNode)
        break;
      //token的类型是TagEnd
      case TagEnd:
        //如果是结束类型 的标签直接将栈顶node弹出栈
        elementStack.pop()
        break;
    }
    //消费当前的token
    tokens.shift()
  }

  return Root
}


