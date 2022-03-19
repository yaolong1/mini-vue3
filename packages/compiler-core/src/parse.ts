import { isArray } from '@mini-vue3/shared';
import {
  createRoot,
  ElementNode,
  NodeTypes,
  TemplateChildNode,
  CommentNode,
  TextNode,
  InterpolationNode,
  ElementTypes,
  AttributeNode,
  DirectiveNode
} from './ast';
import { extend } from '@mini-vue3/shared';
import { ParserOptions } from './options';

//状态机的模式，根据这些模式来决定解析标签的具体规则
export const enum TextModes {
  //          | 是否解析标签 | 是否支持解析HTML实体     
  DATA, //    |    ✔        |     ✔          
  RCDATA, //  |    ✘        |     ✔         
  RAWTEXT, // |    ✘        |     ✘          
  CDATA,   // |    ✘        |     ✘    
  ATTRIBUTE_VALUE,
}

//属性值的类型
type AttributeValue = {
  content: string, //值的内容
  isQuoted: boolean //是否有引号
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
    //@ts-ignore
    options[key] =
      rawOptions[key] === undefined
        ? defaultParserOptions[key]
        : rawOptions[key]
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
            node = parseComment(context)
          } else if (startsWith(s, '<![CDATA][')) {
            //解析CDATA节点
            node = parseCDATA(context)
          }
        } else if (s[1] === '/') {

          if (s.length === 2) {
            console.error('</')
            advanceBy(context, 2)
            continue
          } else if (s[2] === '>') {
            advanceBy(context, 3)
            console.error('</>')
            continue
          } else if (/[a-z]/i.test(s[2])) {
            //结束标签，此处会抛出错误
            const element = parseTag(context, TagType.End)
            console.error('无效标签', element.tag)
            continue
          }
          console.error('无效的结束标签')
        } else if (/[a-z]/i.test(s[1])) {
          //说明此处是标签
          // 解析标签
          node = parseElement(context, ancestors)
        }
      } else if (startsWith(s, context.options.delimiters[0])) {
        //解析插值{{}}表达式节点
        node = parseInterpolation(context, mode)
      }
    }

    //此时如果node不存在，说明处于其他模式，即非DATA、RCDATA模式
    //直接作文本处理
    if (!node) {
      //做文本解析
      node = parseText(context, mode)
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
  //解析开始标签
  const element = parseTag(context, TagType.Start)
  //如果是自闭标签直接返回元素
  if (element.isSelfClosing) return element


  ancestors.push(element)
  const mode = context.options.getTextMode(element, context)
  element.children = parseChildren(context, mode, ancestors)
  ancestors.pop()


  if (startsWith(context.source, `</${element.tag}`)) {
    //即将扫描的标签是结束标签
    //解析结束标签
    parseTag(context, TagType.End)
  } else {
    console.error(`${element.tag}标签缺少闭合标签`)
  }

  return element
}

//及解析注释标签节点
function parseComment(
  context: ParserContext,
): CommentNode {
  return
}

//及解析CDATA
function parseCDATA(
  context: ParserContext,
): TemplateChildNode[] {
  return
}

//解析插值{{}}节点
function parseInterpolation(
  context: ParserContext,
  mode: TextModes
): InterpolationNode {
  return
}

//解析插值文本节点
function parseText(
  context: ParserContext,
  mode: TextModes
): TextNode {
  return
}

//解析标签
function parseTag(
  context: ParserContext,
  type: TagType
): ElementNode {
  const s = context.source
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(s)
  const tag = match[1]

  //消费字符
  advanceBy(context, match[0].length)
  //消费标签中无用的空白字符
  advanceSpaces(context)


  //解析props
  const props = parseAttributes(context, type)


  //如果开头是/>说明是自闭标签
  const isSelfClosing = startsWith(s, '/>')

  //如果是闭合标签/> 否则是 > 根据条件消费他们
  advanceBy(context, isSelfClosing ? 2 : 1)


  //如果是结束标签直接返回
  if (type === TagType.End) {
    return
  }

  //默认为普通元素，
  let tagType = ElementTypes.ELEMENT
  // if()
  //TODO 此处还会判断当前Element是否是Component、template、slot,具体根据tag值来区分
  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    children: [],
    isSelfClosing,
    codegenNode: undefined,
    tagType
  }
}

/**
 * 解析标签所有属性
 * @param context 
 * @param type  当前的标签类型，开始标签、结束标签
 * @returns 
 */
function parseAttributes(context: ParserContext, type: TagType): (AttributeNode | DirectiveNode)[] {
  const props = []
  const attributeNames = new Set<string>() //储存属性的名称
  //循环消费source直到遇到 > 和 />标签停止
  while (
    context.source.length > 0 &&
    !startsWith(context.source, '>') &&
    !startsWith(context.source, '/>')
  ) {
    //结束标签直接报错
    if (type === TagType.End) {
      console.error('结束标签不允许拥有属性')
    }

    //解析属性或者指令
    let attr = parseAttribute(context, attributeNames)

    //去除class属性的空格
    if (
      attr.type === NodeTypes.ATTRIBUTE &&
      attr.name === 'class' &&
      attr.value
    ) {
      attr.value.content = attr.value.content.replace(/\s+/g, ' ').trim()
    }

    //开始标签就push
    if (type === TagType.Start) {
      props.push(attr)
    }

    //属性之间必须有空格，如果有缺少报错
    if (/^[^\t\r\n\f />]/.test(context.source)) {
      console.error('属性之间缺少空格')
    }
    advanceSpaces(context)
  }
  return props
}


//解析属性
function parseAttribute(context: ParserContext, nameSet: Set<string>): AttributeNode | DirectiveNode {
  //匹配第一个位置不是空白字符、不是/ 和 >字符     ^[^\t\n\r\f />]
  //紧接着匹配0个或多个位置 此位置字符不是空白字符、不是/字符  >字符和=字符，即等号前的非空白字符也就是属性 [^\t\n\r\f />=]*
  const match = /^[^\t\n\r\f />][^\t\n\r\f />=]*/.exec(context.source)!

  //属性名
  const name = match[0]

  //判断解析的属性是否已经在nameSet中，如果在说明有重复的
  if (nameSet.has(name)) {
    console.error('属性重复')
  }
  nameSet.add(name)

  //TODO 属性不允许有特殊字符、= '"<

  //得到属性名称后消费消费属性名
  advanceBy(context, name.length)

  //属性值
  let value: AttributeValue = undefined

  if (/^[\n\t\f\n ]*=/.test(context.source)) {
    //如果是以 [空白][空白] = 格式的字符
    //去除属性名称和等号之间的空格 属性名[空格]=[空格]值
    advanceSpaces(context)
    //消费=字符
    advanceBy(context, 1)
    //消费等号和属性值之间的空格
    advanceSpaces(context)

    //解析属性值
    value = parseAttributeValue(context)
    if (!value) {
      console.error('属性', name, '缺少属性值')
    }
  }

  //TODO 此处还需要处理bind、on、：、slot，v-前缀的属性 

  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: value && {
      type: NodeTypes.TEXT,
      content: value.content,

    },
  }
}

//解析属性值
function parseAttributeValue(context: ParserContext): AttributeValue {
  let content //存储值的内容
  //取第一个字符
  const quoted = context.source[0]
  //是否存在引号
  const isQuoted = quoted === `'` || quoted === `"`

  //如果存在引号
  //eg: < name ="xx" >
  if (isQuoted) {
    //消费引号
    advanceBy(context, 1)

    //找到结束的索引
    const endIndex = context.source.indexOf(quoted)

    if (endIndex === -1) {
      console.error(`属性不存在结束的引号`)
      //如果不存在结束的引号,直接将source长度当做值传入，parseTextData内部会截取0到context.source.length作为content
      content = parseTextData(
        context,
        context.source.length,
        TextModes.ATTRIBUTE_VALUE
      )
    } else {
      //如果存在就把endIndex当做截取的最后一个字符索引传入
      content = parseTextData(
        context,
        endIndex,
        TextModes.ATTRIBUTE_VALUE
      )
      //消费存在的引号
      advanceBy(context, 1)
    }
  } else {
    //值不存在引号
    //eg: < name =xx >
    //下一个空格之前的字符就是属性值
    const match = /^[^\n\t\f\r >]+/.exec(context.source)
    if (!match) {
      return undefined
    }

    //TODO 此处还要判断一个没有引号的情况下，属性值的合法性
    const unexpectedChars = /["'<=`]/g
    if (unexpectedChars.test(context.source)) {
      console.error('当前的值不合法')
    }

    // 解析没有引号的属性值
    content = parseTextData(
      context,
      match[0].length,
      TextModes.ATTRIBUTE_VALUE
    )

  }

  return {
    content,
    isQuoted
  }
}

//解析文本数据
function parseTextData(
  context: ParserContext,
  length: number,
  mode: TextModes
) {
  //截取0到length-1的字符
  const rawText = context.source.slice(0, length)
  //消费当rawText
  advanceBy(context, length)

  if (
    mode === TextModes.RAWTEXT ||
    mode === TextModes.CDATA ||
    rawText.indexOf('&') === -1 // 不存在&字符
  ) {
    return rawText
  } else {
    //包含"&"的DATA1或RCDATA模式。 实体需要解码。
    return context.options.decodeEntities(
      rawText,
      mode === TextModes.ATTRIBUTE_VALUE
    )
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