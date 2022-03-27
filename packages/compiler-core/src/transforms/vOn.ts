import { camelize, toHandlerKey } from "@mini-vue3/shared";
import { createObjectProperty, createSimpleExpression, NodeTypes } from "../ast";

export const transformOn = (dir) => {
  const { arg } = dir;

  let eventName;
  if (arg.type === NodeTypes.SIMPLE_EXPRESSION) {
    if (arg.isStatic) {
      const rawName = arg.content;

      // 驼峰化
      eventName = createSimpleExpression(toHandlerKey(camelize(rawName)), true);
    } else {
      // 源码在这里将动态的事件名处理成组合表达式
    }
  } else {
    eventName = arg;
  }

  // 处理表达式
  let exp = dir.exp;
  if (exp && !exp.content.trim()) {
    exp = undefined;
  }
  // 源码在这里会处理事件缓存

  // 包装并返回 JS_PROPERTY 节点
  let ret = {
    props: [
      createObjectProperty(
        eventName,
        exp || createSimpleExpression('() => {}', false)
      )
    ]
  };

  // 源码在这里会处理外部插件 extended compiler augmentor
  // if (augmentor) {
  //   ret = augmentor(ret);
  // }

  // ret.props.forEach(p => (p.key.isHandlerKey = true));
  return ret;
};