import { createObjectProperty, createSimpleExpression, NodeTypes } from "../ast";

export const transformBind = (dir) => {
  const { exp, modifiers } = dir;
  const arg = dir.arg;

  // 容错处理，如果为空则输出一个空字符串
  if (arg.type !== NodeTypes.SIMPLE_EXPRESSION) {
    arg.children.unshift('(');
    arg.children.push(') || ""');
  } else if (!arg.isStatic) {
    arg.content = `${arg.content} || ""`;
  }

  // prop 增加 "." 前缀
  // attr 增加 "^" 前缀
  if (modifiers.includes('prop')) {
    injectPrefix(arg, '.');
  }
  if (modifiers.includes('attr')) {
    injectPrefix(arg, '^');
  }

  // 包装并返回 JS_PROPERTY 节点
  if (
    !exp ||
    (exp.type === NodeTypes.SIMPLE_EXPRESSION && !exp.content.trim())
  ) {
    return {
      props: [createObjectProperty(arg, createSimpleExpression('', true))]
    };
  }

  return {
    props: [createObjectProperty(arg, exp)]
  };
};

const injectPrefix = (arg, prefix) => {
  if (arg.type === NodeTypes.SIMPLE_EXPRESSION) {
    if (arg.isStatic) {
      arg.content = prefix + arg.content;
    } else {
      arg.content = `\`${prefix}\${${arg.content}}\``;
    }
  } else {
    arg.children.unshift(`'${prefix}' + (`);
    arg.children.push(`)`);
  }
};