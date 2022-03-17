import { isAlpha, isChines } from "./utils"
import { State } from "./parse"

export const Tag = Symbol()
export const TagEnd = Symbol()
export const Text = Symbol()

export type TokenTypes = typeof Tag | typeof TagEnd | typeof Text


export interface Token {
  type: TokenTypes,
  name?: string | null,
  content?: string | null
}

export type Tokens = Token[]

export type TemplateAstProp = {
  type: string,
  name: string,
  exp: {
    type: string,
    content: string | number | boolean
  }
}

export interface TemplateAstNode {
  type: NodeTypes.ELEMENT | NodeTypes.ROOT | NodeTypes.TEXT,
  tag: string,
  content?: string,
  props?: TemplateAstProp[],
  children?: TemplateAstNode[]
  jsNode?: any
}


export enum NodeTypes {
  ROOT = 'Root',
  ELEMENT = 'Element',
  TEXT = 'Text',
}

/**
 * 
 * 
 * @param template
 * @returns 
 * 将template = <div><p>Vue</p><p>template</p></div>
 * 换换为以下数组对象，其中一个对象叫做一个token
 * [{ type: 'tag', name: 'div' }, 
 *          { type: 'tag', name: 'P' }, 
 *               {type: 'text', content: 'Vue' }, 
 *          { type: 'tagEnd', name: 'p' }, 
 *          { type: 'tag', name: 'p'}
 *               {type: 'text', content: 'Vue' }, 
 *          { type: 'tagEnd', name: 'p'}
 * ] 
 */
export function tokenzie(template): Tokens {
  //状态机当前的状态  默认为初始状态
  let currentState = State.INITIAL
  //存储解析的字符
  const chars = []
  //生成的Token会存到tokens中并返回
  const tokens: Tokens = []
  //知道字符被解析完成
  while (template) {
    //拿到第一个字符
    const char = template[0]
    switch (currentState) {

      //初始化状态
      case State.INITIAL:
        //如果是字母
        if (isAlpha(char) || isChines(char)) {
          //设置当前状态为文本状态
          currentState = State.TEXT

          // 把当前字符存入chars
          chars.push(char)

          //消费字符
          template = template.slice(1)
        } else if (char === '<') {
          //如果当前字符是 < 符号设置状态为标签开始状态
          currentState = State.TAG_OPEN

          //消费字符
          template = template.slice(1)
        }
        break;

      //文本状态
      case State.TEXT:
        if (isAlpha(char) || isChines(char)) {
          //如果是字母就添加到chars中
          chars.push(char)
          //消费字符
          template = template.slice(1)
        } else if (char == '<') {

          //如果是 < 字符
          //设置为标签开始状态
          currentState = State.TAG_OPEN

          //此时文本节点已经消费完成，取出chars中的字母，创建文本类型的Token
          const content = chars.join('')
          const token = createToken(Text, null, content)

          //将Token存入tokens中
          tokens.push(token)


          //消费chars
          chars.length = 0

          //消费当前char
          template = template.slice(1)
        }
        break;

      //标签打开状态
      case State.TAG_OPEN:
        if (isAlpha(char)) {
          //如果是字母就设置为标签名称状态
          currentState = State.TAG_NAME

          //把字母存入chars
          chars.push(char)

          //消费字符
          template = template.slice(1)
        } else if (char === '/') {
          // 如果当前是/字符先设置状态为TagEndName
          currentState = State.TAG_END

          //消费当前字符
          template = template.slice(1)
        }
        break;
      case State.TAG_NAME:
        if (isAlpha(char)) {
          //如果当前是字母就直接push
          chars.push(char)
          //消费字符
          template = template.slice(1)
        } else if (char === '>') {
          // 如果当前字符为 > ，设置为初始文本状态
          currentState = State.INITIAL

          //拿到chars中的字符创建一个类型为Tag的Token
          const name = chars.join('')
          const token = createToken(Tag, name)

          //存入tokens
          tokens.push(token)

          //消费chars
          chars.length = 0

          //消费char
          template = template.slice(1)
        }
        break;
      case State.TAG_END:
        if (isAlpha(char)) {
          //如果当前是字母，设置当前的状态为tagEndName
          currentState = State.TAG_END_NAME
          chars.push(char)

          //消费者字符
          template = template.slice(1)

        }
        break
      case State.TAG_END_NAME:
        if (isAlpha(char)) {
          //如果当前的是字母添加到chars
          chars.push(char)
          //消费当前字母
          template = template.slice(1)
        } else if (char === '>') {
          // 如果当前是 > 字符,设置为初始化状态
          currentState = State.INITIAL
          // 创建一个类型为TagEnd的Token
          const name = chars.join('')
          const token = createToken(TagEnd, name)
          //添加到tokens中
          tokens.push(token)
          //消费chars
          chars.length = 0
          //消费当前字符
          template = template.slice(1)
        }
        break

    }

  }
  return tokens
}

export function createToken(type, name, content?) {
  return {
    type,
    name,
    content
  }
}

export function createTemplateAstNode(type, tag, content?, props?, children?): TemplateAstNode {
  return {
    type,
    tag,
    content,
    props,
    children
  }
}


//创建string字面量节点
export function createStringLiteral(value) {
  return {
    type: JsNodeTypes.STRING_LITERAL,
    value
  }
}

//创建Identifier标识符节点
export function createIdentifier(name) {
  return {
    type: JsNodeTypes.IDENTIFIER,
    name
  }
}


//创建ArrayExpression数组表达式节点
export function createArrayExpression(elements) {
  return {
    type: JsNodeTypes.ARRAY_EXPRESSION,
    elements
  }
}

//创建CallExpression函数调用表达式节点
export function createCallExpression(callee, _arguments) {

  return {
    type: JsNodeTypes.CALL_EXPRESSION,
    callee: createIdentifier(callee),
    arguments: _arguments
  }
}

//创建ReturnStatement表达式节点
export function createReturnStatement(_return) {
  return {
    type: JsNodeTypes.RETURN_STATEMENT,
    return: _return
  }
}

//创建FunctionDecl表达式节点
export function createFunctionDecl(fnName, returnStatement) {
  return {
    type: JsNodeTypes.FUNCTION_DECL,
    id: createIdentifier(fnName),
    params: [],
    body: [returnStatement]
  }
}

//jsNode类型
export const enum JsNodeTypes {
  STRING_LITERAL = 'StringLiteral',
  FUNCTION_DECL = 'FunctionDecl',
  IDENTIFIER = 'Identifier',
  ARRAY_EXPRESSION = 'ArrayExpression',
  CALL_EXPRESSION = 'CallExpression',
  RETURN_STATEMENT = 'ReturnStatement',
}