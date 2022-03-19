import { parserOptions } from './parserOption';
import { baseParse, ParserOptions } from '@mini-vue3/compiler-core'
import { extend } from '@mini-vue3/shared'




export function parse(
  template: string,
  options: ParserOptions = {}
) {
  return baseParse(template, extend({}, parserOptions, options))
}




export * from '@mini-vue3/compiler-core'
