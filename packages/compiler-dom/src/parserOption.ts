import { ElementNode, TextModes } from "@mini-vue3/compiler-core";
import { ParserOptions } from "@mini-vue3/compiler-core";
import { makeMap } from "@mini-vue3/shared";
import { decodeHtml } from "./decodeHtml";


const isRawTextContainer = /*#__PURE__*/ makeMap(
  'style,iframe,script,noscript',
  true
)

export const parserOptions: ParserOptions = {
  decodeEntities: decodeHtml,
  getTextMode({ tag }: ElementNode): TextModes {
    if (tag === 'textarea' || tag === 'title') {
      return TextModes.RCDATA
    }

    if (isRawTextContainer(tag)) {
      return TextModes.RAWTEXT
    }
    return TextModes.DATA
  }
}