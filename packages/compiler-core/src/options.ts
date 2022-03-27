import { TextModes } from "./parse";
import { NodeTransform } from "./transform";



export interface ParserOptions {
  isVoidTag?: (str: string) => boolean, //是否自闭合标签
  isNativeTag?: (str: string) => boolean, // 是否本地标签
  getTextMode?: (node, parent) => TextModes,
  /**
   * @default ['{{', '}}'] //插值语法格式
   */
  delimiters?: [string, string],
  decodeEntities?: (rawText: string, asAttr: boolean) => string,

  //空白的类型
  //condense 压缩空白字符
  //preserve 不压缩
  whitespace?: 'preserve' | 'condense',

  /**
   * 是否删除注释节点
   */
  comments?: boolean
}


export interface TransformOptions {
  nodeTransforms?: NodeTransform[],
  directiveTransforms?: {}
}


export interface CodegenOptions {
  mode?: 'module' | 'function',

  /**
   * 这个参数的作用是用于代码生成。例如 {{ foo }} 在 module 模式下生成的代码为 _ctx.foo，
   * 而在 function 模式下是 with (this) { ... }。
   * 因为在 module 模式下，默认为严格模式，不能使用 with 语句。
   */
  prefixIdentifiers?: boolean,
  runtimeModuleName?: string,
  runtimeGlobalName?: string
}


export type CompilerOptions = ParserOptions & TransformOptions & CodegenOptions