


const escapeRE = /["'&<>]/

//转义html
//将字符&转义为实体&amp;
//将字符<转义为实体&lt;
//将字符>转义为实体&gt;
//将字符"转义为实体&quot;
//将字符'转义为实体&#39;
export function escapeHtml(string: string) {
  const str = '' + string

  const match = escapeRE.exec(str)

  //没有匹配到直接返回原字符
  if (!match) {
    return str
  }

  let html = ''
  let escaped
  let index
  let lastIndex = 0

  //循环解码
  for (index = match.index; index < str.length; index++) {

    switch (str.charCodeAt(index)) {
      case 34:
        escaped = '&quot;' // "
        break
      case 38:
        escaped = '&amp;' // &
        break
      case 39:
        escaped = '&#39;' // '
        break
      case 60:
        escaped = '&lt;' // <
        break
      case 62:
        escaped = '&gt;' // >
        break
      default:
        continue //没匹配到直接跳过过当前循环，继续匹配下一个
    }

    //下面的逻辑执行说明是存在解码的字符

    if (lastIndex != index) {
      //截取匹配到字符索引之前的字符串 [lastIndex,index)，拼接到html上
      html += str.substring(lastIndex, index)
    }

    lastIndex = index + 1 // lastIndex更新
    html += escaped //拼接解码后的
  }

  return lastIndex != index ? html + str.substring(lastIndex, index) : html
}