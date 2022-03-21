import { TextModes } from "./parse";
import { NodeTransform } from "./transform";

export interface ParserOptions {
  getTextMode?: (node, parent) => TextModes,
  /**
   * @default ['{{', '}}'] //插值语法格式
   */
  delimiters?: [string, string],
  decodeEntities?: (rawText: string, asAttr: boolean) => string
}


export interface TransformOptions {
  nodeTransforms?: NodeTransform[]
}


export interface CodegenOptions {

}

export type CompilerOptions = ParserOptions & TransformOptions & CodegenOptions