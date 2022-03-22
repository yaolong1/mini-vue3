import { RootNode } from './ast';
import { CodegenOptions } from './options';
export interface CodegenResult {
  code: string,
  ast: RootNode
}



export function generate(ast: RootNode, options: CodegenOptions): CodegenResult {

  return {
    code: 'h()',
    ast
  }
}