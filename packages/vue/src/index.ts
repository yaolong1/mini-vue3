import { compile, CompilerOptions } from "@mini-vue3/compiler-dom";
import * as runtimeDom from "@mini-vue3/compiler-dom";
import { isString } from "@mini-vue3/shared";
import { registerRuntimeCompiler } from "@mini-vue3/runtime-dom";

function compileToFunction(
  template: string | HTMLElement,
  options: CompilerOptions
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

  const render = options.mode === 'function' ? new Function(code)() : new Function('MiniVue3', code)(runtimeDom)
  console.log(render)
  return render
}


registerRuntimeCompiler(compileToFunction)


export { compileToFunction as compile }

export * from '@mini-vue3/runtime-dom'