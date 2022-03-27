import { isArray, isSymbol, toRawType } from '@mini-vue3/shared';
import { isObject, isString } from '@mini-vue3/shared';
import { JSChildNode, NodeTypes, RootNode, TemplateChildNode, TextNode, CommentNode, CallExpression, VNodeCall } from './ast';
import { CodegenOptions } from './options';
import { helperNameMap, CREATE_ELEMENT_VNODE, CREATE_COMMENT, TO_DISPLAY_STRING, CREATE_TEXT } from './runtimeHelpers';


export type CodegenNode = TemplateChildNode | JSChildNode
export interface CodegenResult {
  code: string,
  ast: RootNode
}

export interface CodegenContext extends Required<CodegenOptions> {
  code: string,
  push: (code: string) => void,
  indentLevel: number
  indent(): void
  deIndent(): void
  newline(): void
  helper(key: symbol): string
}

/**
 * 创建代码生成上下文
 */
function createCodegenContext(
  {
    mode = "function",
    prefixIdentifiers = mode === 'module',
    runtimeModuleName = 'miniVue3',
    runtimeGlobalName = 'MiniVue3'
  }: CodegenOptions
): CodegenContext {
  const context = {
    mode,
    prefixIdentifiers,
    runtimeModuleName,
    runtimeGlobalName,
    code: '',
    helper(key) {
      return `_${helperNameMap[key]}`
    },
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
      if (context.indentLevel > 0) {
        context.indentLevel--
        context.newline()
      }
    },
  }
  return context
}




export function generate(ast: RootNode, options: CodegenOptions): CodegenResult {

  const context = createCodegenContext(options)

  const {
    mode,
    push,
    prefixIdentifiers,
    indent,
    deIndent,
    newline,
  } = context

  if (mode === 'module') {
    genModulePreamble(ast, context)
  } else {
    genFunctionPreamble(ast, context)
  }

  const hasHelpers = ast.helpers.length > 0
  //是否使用with(this){}
  const useWithBlock = !prefixIdentifiers && mode !== 'module'
  const functionName = 'render'
  const args = ['_ctx', '$props', '$setup', '$data', '$options']

  //函数的参数列表
  const signature = args.join(', ')

  push(`function ${functionName}(${signature}) {`)
  indent()

  //采用with(this){}
  if (useWithBlock) {
    push(`with(_ctx) {`)
    indent()

    if (hasHelpers) {
      push(
        `const { ${ast.helpers
          .map(s => `${helperNameMap[s]}: _${helperNameMap[s]}`)
          .join(', ')} } = _${context.runtimeGlobalName}`
      )
      push(`\n`)
      newline()
    }
  }


  //TODO 生成 return上面的语句


  //生成return后的vnode
  push(`return `)
  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  } else {
    push(`null`)
  }


  if (useWithBlock) {
    deIndent()
    push(`}`)
  }

  deIndent()
  push(`}`)

  return {
    code: context.code,
    ast
  }
}


//模块化的import
function genModulePreamble(ast: RootNode, context: CodegenContext) {
  const { push, newline, runtimeModuleName } = context

  if (ast.helpers.length) {
    push(`import { ${ast.helpers
      .map(helper => `${helperNameMap[helper]} as _${helperNameMap[helper]}`)
      .join(', ')} } from "${runtimeModuleName}"\n`)
  }

  newline()
  push('export ')
}

//函数式全局方式导入
function genFunctionPreamble(ast: RootNode, context: CodegenContext) {
  const { push, newline, runtimeGlobalName } = context

  push(`const _${runtimeGlobalName} = ${runtimeGlobalName} \n`)

  newline()
  push('return ')
}

function genNode(node: CodegenNode | symbol | string, context: CodegenContext) {

  if (isString(node)) {
    context.push(node)
    return
  }
  if (isSymbol(node)) {
    context.push(context.helper(node))
    return
  }


  switch (node.type) {
    case NodeTypes.ELEMENT:
      genElement(node, context);
      break;
    case NodeTypes.COMMENT:
      genComment(node, context);
      break;
    case NodeTypes.TEXT_CALL:
      genNode(node.codegenNode, context);
      break;
    case NodeTypes.TEXT:
      genText(node, context)
      break;
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context);
      break;
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context);
      break;
    case NodeTypes.JS_CALL_EXPRESSION:
      genCallExpression(node, context);
      break;
  }
}



function genCallExpression(node: CallExpression, context: CodegenContext) {
  const { push, helper } = context
  const callee = isString(node.callee) ? node.callee : helper(node.callee)

  push(callee + `(`)
  genNodeList(node.arguments, context)
  push(`)`)
}


function genNodeList(_arguments: CallExpression['arguments'], context: CodegenContext) {
  const { push } = context

  for (let i = 0; i < _arguments.length; i++) {
    const node = _arguments[i]
    if (isString(node)) {
      push(node)
    } else if (isArray(node)) {
      genNodeList(node, context)
    } else {
      genNode(node, context)
    }
    if (i < _arguments.length - 1) {
      push(', ')
    }
  }
}

function genComment(node: CommentNode, context: CodegenContext) {
  const { push, deIndent, helper } = context
  const { content } = node

  push(`${helper(CREATE_COMMENT)} (${JSON.stringify(content)}) `)
}

function genElement(node, context: CodegenContext) {
  const { push, deIndent } = context;
  const { tag, children, props, patchFlag } = node;

  // tag
  push(`${context.helper(CREATE_ELEMENT_VNODE)}(${tag}, `);

  // props
  if (props) {
    genProps(props.properties, context);
  } else {
    push('null, ');
  }

  // children
  if (children) {
    genChildren(children, context);
  } else {
    push('null');
  }

  if (patchFlag) {
    push(`, ${patchFlag}`)
  }

  deIndent();
  push(')');
}

function genProps(props, context) {
  const { push } = context;

  if (!props.length) {
    push('{}');
    return;
  }

  push('{ ');
  for (let i = 0; i < props.length; i++) {
    const prop = props[i];

    const key = prop ? prop.key : '';
    const value = prop ? prop.value : prop;

    if (key) {
      // key
      genPropKey(key, context);
      // value
      genPropValue(value, context);
    } else {
      // 如果 key 不存在就说明是一个 v-bind
      const { content, isStatic } = value;
      const contentStr = JSON.stringify(content);
      push(`${contentStr}: ${isStatic ? contentStr : content}`);
    }

    if (i < props.length - 1) {
      push(', ');
    }
  }
  push(' }, ');
}

function genPropKey(node, context) {
  const { push } = context;
  const { isStatic, content } = node;

  push(isStatic ? JSON.stringify(content) : content);
  push(': ');
}

function genPropValue(node, context) {
  const { push } = context;
  const { isStatic, content } = node;
  push(isStatic ? JSON.stringify(content.content) : content);
}

function genChildren(children, context) {
  const { push, indent, deIndent } = context;


  if (toRawType(children) === 'Object') {
    indent();
    genNode(children, context);
  } else if (children.type === NodeTypes.COMPOUND_EXPRESSION) {
    genCompoundExpression(children, context);
  } else {
    push('[');
    indent();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      genNode(child.codegenNode || child.children || child, context);
      push(', ');
    }
    push(']');
  }

}

function genText(node, context) {
  const { push } = context;
  const { content } = node;
  push(JSON.stringify(content))
}

//生成插值
function genInterpolation(node, context) {
  const { push, helper } = context;
  const { content } = node;

  push(`${helper(TO_DISPLAY_STRING)}(${content.content})`)
}





function genCompoundExpression(node, context) {
  const { push } = context;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (isString(child)) {
      push(` ${child} `);
    } else {
      genNode(child, context);
    }
  }
}