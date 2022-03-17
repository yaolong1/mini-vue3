import { JsNodeTypes, TemplateAstNode } from './ast';
export type CodegenNode = TemplateAstNode

export interface CodegenContext {
  code: string,
  push: (code: string) => void,
  indentLevel: number
  indent(): void
  deIndent(): void
  newline(): void
}

/**
 * 创建代码生成上下文
 */
function createCodegenContext(): CodegenContext {
  const context = {
    code: '',
    push(code) {
      context.code += code
    },
    //当前的缩进级别，默认为0没有缩进
    indentLevel: 0,
    //换行并保留两个字符的缩进
    newline() {
      context.code += '\n' + '  '.repeat(context.indentLevel)
    },
    //用来缩进，让currentIndent自增后，调用换行
    indent() {
      context.indentLevel++
      context.newline()
    },
    //用来缩进，让currentIndent自减后，调用换行
    deIndent() {
      context.indentLevel--
      context.newline()
    },
  }
  return context
}


//根据不同的节点类型生成代码
function genNode(node, context) {
  switch (node.type) {
    case JsNodeTypes.FUNCTION_DECL:
      genFunctionDecl(node, context)
      break;
    case JsNodeTypes.RETURN_STATEMENT:
      genReturnStatement(node, context)
      break;
    case JsNodeTypes.CALL_EXPRESSION:
      genCallExpression(node, context)
      break;
    case JsNodeTypes.STRING_LITERAL:
      genStringLiteral(node, context)
      break;
    case JsNodeTypes.ARRAY_EXPRESSION:
      genArrayExpression(node, context)
      break;

  }
}

function genFunctionDecl(node, context) {
  const { push, indent, deIndent } = context
  push(`function ${node.id.name} (`)
  //调用genNodeList生成数组参数
  genNodeList(node.params, context)
  push(') {')
  //换行+缩进
  indent()
  //body
  node.body.forEach(n => genNode(n, context))
  deIndent()
  push('}')
}
function genReturnStatement(node, context) {
  const { push } = context
  push(`return `)
  genNode(node.return, context)
}
function genStringLiteral(node, context) {
  const { push } = context
  push(`'${node.value}'`)
}

function genArrayExpression(node, context) {
  const { push } = context
  push('[')
  genNodeList(node.elements, context)
  push(']')
}
function genCallExpression(node, context) {
  const { push } = context

  push(`${node.callee.name}`)
  push('(')
  genNodeList(node.arguments, context)
  push(')')

}

function genNodeList(nodes, context) {
  const { push } = context

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    genNode(node, context)
    if (i < nodes.length - 1) {
      push(', ')
    }
  }
}

export function generate(node) {
  const context = createCodegenContext()

  //生成节点
  genNode(node, context)
  return context.code
}