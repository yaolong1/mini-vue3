

import namedCharacterReferences from './namedChars.json'

/**
 * 
 * @param rawText 解码的文本内容
 * @param asAttr 是否是属性文本
 */
export function decodeHtml(
  rawText: string,
  asAttr: boolean
): string {

  //记录消费的字符个数，字符的偏移量
  let offset = 0;

  //rawText字符的长度
  const end = rawText.length

  //解码后的文本
  let decodedText = ''

  //引用表中实体名称最大的长度
  let maxCRNameLength = 0

  //消费指定的长度
  function advance(length: number) {
    //记录偏移量
    offset += length
    //消费字符
    rawText = rawText.slice(length)
  }

  //消费字符，直到为空则停止即偏移量offset大于end
  while (end > offset) {

    //用于匹配字符引用的开始部分，如果匹配成功，head[0]有三种情况
    //1、head[0] === '&' 命名字符引用
    //2、head[0] === '&#' 十进制数字字符引用
    //3、head[0] === '&#x' 十六进制数字字符引用
    const head = /&(?:#x?)?/i.exec(rawText)

    //没有匹配到直接返回剩余长度的文本
    if (!head) {
      //剩余长度
      const remaining = end - offset

      //剩余内容追加到decodedText中
      decodedText += rawText.slice(0, remaining)

      //消费剩余字符
      advance(remaining)
      break;
    }

    //head有文本 ，即将head.index之前的文本追加到decodedText上
    //head.index表示第一次出现&字符的索引位置
    decodedText += rawText.slice(0, head.index)
    //消费&之前的字符
    advance(head.index)

    //命名字符引用的情况
    if (head[0] === '&') {
      let name = ''
      let value

      //符号&下一个字符必须是ASCII字母和数字
      if (/[0-9a-z]/i.test(rawText[1])) {

        //根据引用表名来计算最大引用名称长度
        if (!maxCRNameLength) {
          maxCRNameLength = Object.keys(namedCharacterReferences).reduce(
            (max, key) => Math.max(max, key.length), 0
          )
        }

        //从最大长度开始截取引用名称，直到在字符引用表找到当前截取的引用名称的值
        for (let length = maxCRNameLength; !value && length > 0; --length) {
          name = rawText.slice(1, 1 + length)
          value = (namedCharacterReferences as Record<string, string>)[name]
        }

        //如果找到value
        if (value) {
          //检查value最后一个字符是否是 ; 
          const semi = name.endsWith(';')

          //如果当前解析的是属性值，并且value的最后一个字符不是分号，并且下一个字符不是=、a-z、0-9的字符直接返回原文本
          // eg: <a href="http://xx.com?a=2&lt=10&lts=10&lt0=1">
          if (
            asAttr &&
            !semi &&
            /[=a-z0-9]/i.test(rawText[name.length + 1] || '')
          ) {
            decodedText += '&' + name
            advance(1 + name.length)
          } else {
            //否则就把解码后的值拼接到decodeText
            decodedText += value
            advance(1 + name.length)
          }
        } else {
          //没找到value
          decodedText += '&' + name
          advance(1 + name.length)
        }
      } else {
        //&后的字符不是数字也不是字母，直接把&字符拼接到decodedText
        decodedText += '&'
        advance(1)
      }
    } else {
      //十六进制和十进制的字符引用方式
      //判断是否是十六进制或者十进制
      const hex = head[0] === '&#x'
      //根据不同进制，选用不同的正则
      const pattern = hex ? /^&#x([0-9a-f]+);?/i : /^&#([0-9a-f]+);?/i

      //body[1]的值是Unicode码
      const body = pattern.exec(rawText)

      if (body) {
        //根据对应的进制，将unicode转换为数字
        let cp = parseInt(body[1], hex ? 16 : 10)

        //TODO在此之前应该处理一下cp unicode码,保证码的合法性检验
        if (cp === 0) {
          //如果当前的码是0x00为错误的解析 直接解析为0xfffd = �
          cp = 0xfffd
        } else if (cp > 0x10ffff) {
          //0x10ffff超过最大的Unicode码为错误的解析需要全部变成�，也就是0xfffd 
          cp = 0xfffd
        } else if (cp >= 0xd800 && cp <= 0xdfff) {
          //范围在[0xd800,0xdfff]代表代理对（surrogate pair）为错误的解析，是预留给UTF-16的码位，要替换成0xfffd = �
          cp = 0xfffd
        } else if (
          cp >= 0xfdd0 && cp <= 0xfdef ||
          (cp & 0xfffe) === 0xfffe
        ) {
          //如果码点是noncharacter范围内的，什么都不做，交给平台处理
          // noop
        } else if (
          //控制字符集非ASCII空白字符  码点范围在[0x01,0x1f] 和 [0x7f,0x9f] 
          (cp >= 0x01 && cp <= 0x08) ||
          cp === 0x0b ||
          (cp >= 0x0d && cp <= 0x1f) ||
          (cp >= 0x7f && cp <= 0x9f)
        ) {

          //去查找是否有替换字符的码点，没有就返回原码点
          cp = CCR_REPLACEMENTS[cp] || cp
        }

        //解码
        const char = String.fromCodePoint(cp)
        //解码后最佳到decodedText上
        decodedText += char
        //消费字符
        advance(body[0].length)
        console.log(char)
      } else {
        //如果没有匹配到，则不进行解码操作、只要把head[0]追加到decodedText上并消费
        decodedText += head[0]
        advance(head[0].length)
      }

    }

  }

  return decodedText
}


//非法解析码的替换码点
const CCR_REPLACEMENTS: Record<number, number | undefined> = {
  0x80: 0x20ac,
  0x82: 0x201a,
  0x83: 0x0192,
  0x84: 0x201e,
  0x85: 0x2026,
  0x86: 0x2020,
  0x87: 0x2021,
  0x88: 0x02c6,
  0x89: 0x2030,
  0x8a: 0x0160,
  0x8b: 0x2039,
  0x8c: 0x0152,
  0x8e: 0x017d,
  0x91: 0x2018,
  0x92: 0x2019,
  0x93: 0x201c,
  0x94: 0x201d,
  0x95: 0x2022,
  0x96: 0x2013,
  0x97: 0x2014,
  0x98: 0x02dc,
  0x99: 0x2122,
  0x9a: 0x0161,
  0x9b: 0x203a,
  0x9c: 0x0153,
  0x9e: 0x017e,
  0x9f: 0x0178
}
