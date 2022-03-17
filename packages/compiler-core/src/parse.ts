import { isArray } from '@mini-vue3/shared';
import { createRoot, ElementNode, NodeTypes, TemplateChildNode, CommentNode, TextNode, InterpolationNode, ElementTypes } from './ast';
import { extend } from '@mini-vue3/shared';

//状态机的模式，根据这些模式来决定解析标签的具体规则
export const enum TextModes {
  //          | 是否解析标签 | 是否支持实体     
  DATA, //    |    ✔        |     ✔          
  RCDATA, //  |    ✘        |     ✔         
  RAWTEXT, // |    ✘        |     ✘          
  CDATA,   // |    ✘        |     ✘    
}

export interface ParserOptions {
  getTextMode?: (node, parent) => TextModes
}


export interface ParserContext {
  options: ParserOptions
  // readonly originalSource: string
  source: string
  // offset: number
  // line: number
  // column: number
  // inPre: boolean // HTML <pre> tag, preserve whitespaces
  // inVPre: boolean // v-pre, do not process directives and interpolations
}

const defaultParserOptions: ParserOptions = {
  getTextMode: () => TextModes.DATA, //设置初始模式为DATA模式。在该模式下支持解析标签、支持解析html实体
}


/**
 * 
 * @param content 外部传来的要解析的文本内容
 * @param rawOptions 外部传来的上下文参数
 * @returns 
 */
function createParseContext(
  content: string,
  rawOptions?: ParserOptions
): ParserContext {
  const options = extend({}, defaultParserOptions)

  //处理rawOptions,合并options
  let key: keyof ParserOptions
  for (key in rawOptions) {
    options[key] = rawOptions[key] === undefined ? defaultParserOptions[key] : rawOptions[key]
  }
  return {
    options,
    source: content
  }
}



//解析器函数，接收一个模板
export function baseParse(
  content: string,
  options: ParserOptions = {},
) {
  const context = createParseContext(content, options)
  //节点栈初始为空
  const children = parseChildren(context, TextModes.DATA, [])
  return createRoot(children)
}


//解析孩子
/**
 * 
 * @param context 
 * @param mode //模式
 * @param anchors  //父代节点生成的节点栈
 */
function parseChildren(
  context: ParserContext,
  mode: TextModes,
  ancestors: ElementNode[]
): TemplateChildNode[] {
  let nodes: TemplateChildNode[] = []

  const s = context.source


  while (!isEnd(context, ancestors)) {
    //存储当前解析后的节点
    let node: TemplateChildNode | TemplateChildNode[]
    //DATA模式和RCDATA模式才支持插值内容的解析
    if (mode === TextModes.DATA || mode === TextModes.RCDATA) {

      //只有DATA模式才支持标签解析
      if (mode === TextModes.DATA && s[0] === '<') {
        if (s[1] === '!') {
          if (startsWith(s, '<!--')) {
            //解析注释节点
            node = parseComment(context, ancestors)
          } else if (startsWith(s, '<![CDATA][')) {
            //解析CDATA节点
            node = parseCDATA(context, ancestors)
          }
        } else if (s[1] === '/') {
          //结束标签，此处会抛出错误

        } else if (/[a-z]/i.test(s[1])) {
          //说明此处是标签
          // 解析标签
          node = parseElement(context, ancestors)
        }
      } else if (startsWith(s, '{{')) {
        //解析插值{{}}表达式节点
        node = parseInterpolation(context, ancestors)
      }
    }

    //此时如果node不存在，说明处于其他模式，即非DATA、RCDATA模式
    //直接作文本处理
    if (!node) {
      //做文本解析
      node = parseText(context, ancestors)
    }

    if (isArray(node)) {
      node.forEach(n => pushNode(nodes, n))
    } else {
      pushNode(nodes, node)
    }

  }

  return nodes
}

//解析元素
function parseElement(
  context: ParserContext,
  ancestors: ElementNode[]
): ElementNode {
  debugger
  //解析开始标签
  const element = parseTag(context, TagType.Start)
  const { tag } = element

  let mode = TextModes.DATA



  //如果是自闭标签直接返回元素
  if (element.isSelfClosing) return element
  ancestors.push(element)
  element.children = parseChildren(context, mode, ancestors)
  ancestors.pop()




  return
}

//及解析注释标签节点
function parseComment(
  context: ParserContext,
  ancestors: ElementNode[]
): CommentNode {
  return
}

//及解析CDATA
function parseCDATA(
  context: ParserContext,
  ancestors: ElementNode[]
): TemplateChildNode[] {
  return
}

//解析插值{{}}节点
function parseInterpolation(
  context: ParserContext,
  ancestors: ElementNode[]
): InterpolationNode {
  return
}

//解析插值文本节点
function parseText(
  context: ParserContext,
  ancestors: ElementNode[]
): TextNode {
  return
}

//解析标签
function parseTag(context: ParserContext, type: TagType): ElementNode {
  const s = context.source
  const match = type === TagType.Start ? /^<([a-z][^\t\r\n\f />]*)/i.exec(s) : /^<\/([a-z][^\t\r\n\f />]*)/i.exec(s)
  const tag = match[1]

  //消费字符
  advanceBy(context, match[0].length)
  //消费标签中无用的空白字符
  advanceSpaces(context)

  //如果开头是/>说明是自闭标签
  const isSelfClosing = startsWith(s, '/>')

  //默认为普通元素，
  let tagType = ElementTypes.ELEMENT
  // if()
  //TODO 此处还会判断当前Element是否是Component、template、slot,具体根据tag值来区分
  return {
    type: NodeTypes.ELEMENT,
    tag,
    props: [],
    children: [],
    isSelfClosing,
    codegenNode: undefined,
    tagType
  }
}


const enum TagType {
  Start,
  End
}


function isEnd(
  context: ParserContext,
  ancestors: ElementNode[]
) {

  const s = context.source

  //模板内容解析完毕说明已经结束
  if (!s) return true

  for (let i = ancestors.length - 1; i >= 0; --i) {
    //只要栈中存在与当前节点相同结束标签名称，就停止状态机
    if (startsWith(s, `</${ancestors[i].tag}`)) {
      return true
    }
  }
  return !s

}


//消费numberOfCharacters前的字符
function advanceBy(context: ParserContext, numberOfCharacters: number) {
  context.source = context.source.slice(numberOfCharacters)
}

//消费空格、回车等字符
function advanceSpaces(context: ParserContext) {
  const { source } = context
  //匹配空白字符
  const match = /^[\t\n\r\f ]+/.exec(source)
  if (match) {
    //清空空白字符
    advanceBy(context, match[0].length)
  }

}

function startsWith(source: string, searchString: string): boolean {
  return source.startsWith(searchString)
}

function pushNode(nodes: TemplateChildNode[], node: TemplateChildNode) {
  nodes.push(node)
}