import { transformBind } from './transforms/vBind';
import { transformOn } from './transforms/vOn';
import { extend, isString } from '@mini-vue3/shared';
import { ParentNode, RootNode } from './ast';
import { CodegenResult, generate } from './codegen';
import { CompilerOptions } from './options';
import { baseParse } from './parse';
import { transform } from './transform';
import { transformElement } from './transforms/transformElement';
import { transformText } from './transforms/transformText';
import { transformExpression } from './transforms/transformExpression';


export function baseCompile(
  template: string | RootNode,
  options: CompilerOptions = {}
): CodegenResult {

  //将文本解析成template AST 语法树
  const ast = isString(template) ? baseParse(template, options) : template



  //将template AST 语法树转换成 JavaScript AST语法树
  transform(
    ast,
    extend({}, options, {
      nodeTransforms: [
        transformElement,
        transformText,
        transformExpression
      ],
      directiveTransforms: {
        on:transformOn,
        bind:transformBind
      }
      //扩展的选项
    })
  )


  //返回生成的渲染函数结果
  return generate(
    ast,
    extend({}, options, {
      //扩展的选项
    })
  )

}