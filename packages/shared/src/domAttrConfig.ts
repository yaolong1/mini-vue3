

//如果值为true或者值'' 表示包含布尔属性

import { makeMap } from "."

// <button disabled/> 会编译成 {disabled:''}  
export function includeBooleanAttr(value) {
  return !!value || value === ''

}

//特殊布尔型参数
const specialBooleanAttrs = `itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly`

//是否是布尔型的参数
export const isBooleanAttr = makeMap(
  specialBooleanAttrs +
    `,async,autofocus,autoplay,controls,default,defer,disabled,hidden,` +
    `loop,open,required,reversed,scoped,seamless,` +
    `checked,muted,multiple,selected`
)



//   >、/、=、"、'、\u0009、\u000a、\u000c、\u0020为不安全服务端渲染字符
const unsafeAttrCharRE = /[>/="'\u0009\u000a\u000c\u0020]/

//缓存属性的验证结果
const attrValidationCache: Record<string, boolean> = {}

//判断是否是服务端渲染的安全属性名称
export function isSSRSafeAttrName(name: string): boolean {
  if (attrValidationCache.hasOwnProperty(name)) {
    return attrValidationCache[name]
  }

  const isUnsafe = unsafeAttrCharRE.test(name)
  if (isUnsafe) {
    console.error(`unsafe attribute name: ${name}`)
  }
  return (attrValidationCache[name] = !isUnsafe)
}