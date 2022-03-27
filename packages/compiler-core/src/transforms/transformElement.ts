import { isOn, PatchFlags, PatchFlagNames } from "@mini-vue3/shared"
import { CallExpression, createCallExpression, createObjectExpression, createObjectProperty, createSimpleExpression, createVNodeCall, ElementTypes, ExpressionNode, NodeTypes, ObjectExpression } from "../ast"
import { GUARD_REACTIVE_PROPS, MERGE_PROPS, NORMALIZE_CLASS, NORMALIZE_PROPS, NORMALIZE_STYLE } from "../runtimeHelpers"
import { NodeTransform } from "../transform"
import { isStaticExp } from "../utils"


export type PropsExpression = ObjectExpression | CallExpression | ExpressionNode

//转换元素
export const transformElement: NodeTransform = (node, context) => {

  //=========进入阶段代码=========//
  return () => {
    //=========退出阶段代码=========//
    node = context.currentNode;

    // 只对元素节点进行处理
    if (node.type !== NodeTypes.ELEMENT) {
      return;
    }

    // 初始化如下变量
    const { tag, props } = node;
    const isComponent = node.tagType === ElementTypes.COMPONENT;

    let vnodeTag = `"${tag}"`;
    let vnodeProps;
    let vnodeChildren;
    let vnodePatchFlag;
    let patchFlag = 0;
    let vnodeDynamicProps;
    let dynamicPropNames;
    let vnodeDirectives;

    // 处理 props
    if (props.length > 0) {
      // 获取属性解析结果
      const propsBuildResult = buildProps(node, context);
      vnodeProps = propsBuildResult.props;
      patchFlag = propsBuildResult.patchFlag;
      dynamicPropNames = propsBuildResult.dynamicPropNames;
      vnodeDirectives = propsBuildResult.directives;
    }

    // 处理 children
    if (node.children.length > 0) {
      // 单子节点
      if (node.children.length === 1) {
        const child = node.children[0];
        const type = child.type;

        // 分析是否存在动态文本子节点，插值表达式和复合文本节点
        // 复合文本节点在 transformText 中介绍
        const hasDynamicTextChild =
          type === NodeTypes.INTERPOLATION ||
          type === NodeTypes.COMPOUND_EXPRESSION;

        // 有动态文本子节点则修改 patchFlag
        if (hasDynamicTextChild) {
          patchFlag |= PatchFlags.TEXT;
        }

        // 获取 vnodeChildren
        if (hasDynamicTextChild || type === NodeTypes.TEXT) {
          vnodeChildren = child;
        } else {
          vnodeChildren = node.children;
        }
      } else {
        vnodeChildren = node.children;
      }
    }

    // 处理 patchFlag
    if (patchFlag !== 0) {
      // patchFlag 为负数则说明不存在复合情况
      if (patchFlag < 0) {
        vnodePatchFlag = patchFlag + ` /* ${PatchFlagNames[patchFlag]} */`;
      }

      // patchFlag 为正数说明可能存在复合情况，特殊处理
      else {
        const flagNames =
          // 获取 PatchFlagNames 中所有的键名
          Object.keys(PatchFlagNames)
            // 全部转换为 Number 类型
            .map(Number)
            // 只保留 patchFlag 中存在的，并且值大于 0 的
            .filter(n => n > 0 && patchFlag & n)
            // 将 patchFlag 数值转换成对应 patchFlag 名称
            .map(n => PatchFlagNames[n])
            // 用逗号连接
            .join(', ');

        // 将上面的内容注释在 patchFlag 后面作为一个参考
        vnodePatchFlag = patchFlag + ` /* ${flagNames} */`;
      }

      // TODO 处理动态属性名
      if (dynamicPropNames && dynamicPropNames.length) {
        vnodeDynamicProps = stringifyDynamicPropNames(dynamicPropNames);
      }
    }

    node.codegenNode = createVNodeCall(
      context,
      vnodeTag,
      vnodeProps,
      vnodeChildren,
      vnodePatchFlag,
      vnodeDynamicProps,
      vnodeDirectives,
      isComponent
    );

  }
}

// 遍历所有节点并转换成数组结构的字符串返回
function stringifyDynamicPropNames(props) {
  let propsNamesString = '[';
  for (let i = 0, l = props.length; i < l; i++) {
    propsNamesString += JSON.stringify(props[i]);
    if (i < l - 1) propsNamesString += ',';
  }
  return propsNamesString + ']';
}

function buildProps(node, context, props = node.props) {
  // 初始化一些变量
  const isComponent = node.tagType === ElementTypes.COMPONENT;
  let properties = [];
  const mergeArgs = [];
  const runtimeDirectives = [];

  // 再初始化一些变量
  let patchFlag = 0;
  let hasClassBinding = false;
  let hasStyleBinding = false;
  let hasHydrationEventBinding = false;
  let hasDynamicKeys = false;
  const dynamicPropNames = [];

  const analyzePatchFlag = ({ key }) => {
    // isStatic 会判断传入节点是否是静态的简单表达式节点 (SIMPLE_EXPRESSION)
    if (isStaticExp(key)) {
      const name = key.content;
      // isOn 会判断传入属性是否是 onXxxx 事件注册
      const isEventHandler = isOn(name);

      if (
        !isComponent &&
        isEventHandler &&
        name.toLowerCase() !== 'onclick'
        // 源码这里还会忽略 v-model 双向绑定
        // 源码这里还会忽略 onVnodeXXX hooks
      ) {
        hasHydrationEventBinding = true;
      }

      // 源码在这里会忽略 cacheHandler 以及有静态值的属性

      // 这里根据属性的名称进行分析
      if (name === 'class') {
        hasClassBinding = true;
      } else if (name === 'style') {
        hasStyleBinding = true;
      } else if (name !== 'key' && !dynamicPropNames.includes(name)) {
        dynamicPropNames.push(name);
      }

      // 将组件上绑定的类名以及样式视为动态属性
      if (
        isComponent &&
        (name === 'class' || name === 'style') &&
        !dynamicPropNames.includes(name)
      ) {
        dynamicPropNames.push(name);
      }
    } else {
      // 属性名不是简单表达式 (SIMPLE_EXPRESSION) 的话
      // 则视为有动态键名
      hasDynamicKeys = true;
    }
  };

  for (let i = 0; i < props.length; i++) {
    // 静态属性
    const prop = props[i];
    if (prop.type === NodeTypes.ATTRIBUTE) {
      const { name, value } = prop;
      let valueNode = createSimpleExpression(value || '', true);

      properties.push(
        createObjectProperty(createSimpleExpression(name, true), valueNode)
      );
    } else {
      // directives
      const { name, arg, exp } = prop;
      const isVBind = name === 'bind';
      const isVOn = name === 'on';

      // 源码这里会跳过以下指令
      // v-slot
      // v-once/v-memo
      // v-is/:is
      // SSR 环境下的 v-on

      // 处理无参数的 v-bind 以及 v-on
      if (!arg && (isVBind || isVOn)) {
        // 有动态的键
        hasDynamicKeys = true;

        // 有值的话，则进行处理
        if (exp) {
          if (properties.length) {
            mergeArgs.push(
              createObjectExpression(properties)
            );
            properties = [];
          }

          // 是 v-bind
          if (isVBind) {
            mergeArgs.push(exp);
          }

          // 是 v-on
          else {
            mergeArgs.push({
              type: NodeTypes.JS_CALL_EXPRESSION,
              arguments: [exp],
            });
          }
        }
        continue;
      }

      // 运行时指令处理
      const directiveTransform = context.directiveTransforms[name];
      // 内置指令
      if (directiveTransform) {
        const { props, needRuntime } = directiveTransform(prop, node, context);
        // 每个属性都去执行一遍 analyzePatchFlag
        props.forEach(analyzePatchFlag);
        properties.push(...props);
        if (needRuntime) {
          runtimeDirectives.push(prop);
        }
      }

      // 自定义指令
      else {
        runtimeDirectives.push(prop);
      }
    }
  }


  let propsExpression: PropsExpression | undefined = undefined

  // TODO 合并参数
  if (mergeArgs.length) {
    if (properties.length) {
      mergeArgs.push(createObjectExpression(properties));
    }
    if (mergeArgs.length > 1) {
      propsExpression = createCallExpression(context.helper(MERGE_PROPS),mergeArgs);
    } else {
      // 只有一个 v-bind
      propsExpression = mergeArgs[0];
    }
  } else if (properties.length) {
    propsExpression = createObjectExpression(properties);
  }


  // 分析 patchFlag
  if (hasDynamicKeys) {
    patchFlag |= PatchFlags.FULL_PROPS
  } else {
    if (hasClassBinding && !isComponent) {
      patchFlag |= PatchFlags.CLASS
    }
    if (hasStyleBinding && !isComponent) {
      patchFlag |= PatchFlags.STYLE
    }
    if (dynamicPropNames.length) {
      patchFlag |= PatchFlags.PROPS
    }
    if (hasHydrationEventBinding) {
      patchFlag |= PatchFlags.HYDRATE_EVENTS
    }
  }

  // 这里在源码中还会考虑 ref 以及 vnodeHook
  if (
    (patchFlag === 0 || patchFlag === PatchFlags.HYDRATE_EVENTS) &&
    runtimeDirectives.length > 0
  ) {
    patchFlag |= PatchFlags.NEED_PATCH;
  }


  //规范化 props
  if (propsExpression) {
    switch (propsExpression.type) {
      // 说明 props 中没有 v-bind，只需要处理动态的属性绑定
      case NodeTypes.JS_OBJECT_EXPRESSION:
        let classKeyIndex = -1;
        let styleKeyIndex = -1;
        let hasDynamicKey = false;

        // 遍历所有 props，获取类名以及样式的索引
        // 并判断是否有动态键名
        for (let i = 0; i < propsExpression.properties.length; i++) {
          const key = propsExpression.properties[i].key;
          // 是静态键名
          if (isStaticExp(key)) {
            if (key.content === 'class') {
              classKeyIndex = i;
            } else if (key.content === 'style') {
              styleKeyIndex = i;
            }
          }
          // 是动态键名
          else if (!key.isHandlerKey) {
            hasDynamicKey = true;
          }
        }

        const classProp = propsExpression.properties[classKeyIndex];
        const styleProp = propsExpression.properties[styleKeyIndex];

        // 没有动态键名
        if (!hasDynamicKey) {
          // 类名的值是动态的话则包装一下类名的值
          if (classProp && !isStaticExp(classProp.value)) {
            classProp.value = createCallExpression(context.helper(NORMALIZE_CLASS),[classProp.value]);
          }

          // 样式的值是动态的则包装一下样式的值
          if (
            styleProp &&
            !isStaticExp(styleProp.value) &&
            (hasStyleBinding ||
              styleProp.value.type === NodeTypes.JS_ARRAY_EXPRESSION)
          ) {
            styleProp.value = createCallExpression(context.helper(NORMALIZE_STYLE),[styleProp.value]);
          }
        }

        // 有动态键名则直接包装整个 propsExpression 
        else {
          propsExpression = createCallExpression( context.helper(NORMALIZE_PROPS),[propsExpression]);
        }
        break;

      // 合并属性，不需要处理
      case NodeTypes.JS_CALL_EXPRESSION:
        break;

      // 只有 v-bind 直接包装整个 propsExpression
      default:
        propsExpression = createCallExpression(
          context.helper(NORMALIZE_PROPS),[
          createCallExpression(context.helper(GUARD_REACTIVE_PROPS),[propsExpression]),
        ]);
        break;
    }
  }
  return {
    props: propsExpression,
    directives: runtimeDirectives,
    patchFlag,
    dynamicPropNames,
  };
}
