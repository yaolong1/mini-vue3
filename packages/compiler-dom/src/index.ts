import { parserOptions } from './parserOption';
import { baseParse, CompilerOptions, ParserOptions, baseCompile } from '@mini-vue3/compiler-core'
import { extend } from '@mini-vue3/shared'


export { parserOptions }

export function parse(
  template: string,
  options: ParserOptions = {}
) {
  return baseParse(template, extend({}, parserOptions, options, {
    //扩展options
  }))
}

export function compile(
  template: string,
  options: CompilerOptions
) {

  return baseCompile(
    template,
    extend({}, parserOptions, options, {
      //扩展options
    })
  )
}


export * from '@mini-vue3/compiler-core'
