import { compile, CompilerOptions } from "@mini-vue3/compiler-dom";
import * as runtimeDom from "@mini-vue3/runtime-dom";
import { isString } from "@mini-vue3/shared";
import { registerRuntimeCompiler } from "@mini-vue3/runtime-dom";

function compileToFunction(
  template: string | HTMLElement,
  options: CompilerOptions,
  isGlobal: boolean = true //默认全局模式，即直接在script中引入 xxx.global.js 否则就是module(此模式必须启动一个服务器再打开页面才行)
) {

  if (!isString(template)) {
    //不是字符说明是Html元素
    template = template.innerHTML
  }

  //template是一个id选择器
  if (template[0] === '#') {
    const el = document.querySelector(template)

    if (!el) {
      console.warn('没有找到当前的元素')
    }

    template = el ? el.innerHTML : ''
  }


  const { code } = compile(template, options)

  const render = isGlobal ? new Function(code)() : new Function('MiniVue3', code)(runtimeDom)
  return render
}


registerRuntimeCompiler(compileToFunction)


export { compileToFunction as compile }

export * from '@mini-vue3/runtime-dom'
export * from '@mini-vue3/server-renderer'