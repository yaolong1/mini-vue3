import { TextModes } from "./parse";

export interface ParserOptions {
  getTextMode?: (node, parent) => TextModes,
  /**
   * @default ['{{', '}}'] //插值语法格式
   */
  delimiters?: [string, string],
  decodeEntities?: (rawText: string, asAttr: boolean) => string
}

