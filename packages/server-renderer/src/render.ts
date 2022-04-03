import { isOn, isVoidTag, isArray, isString, isSSRSafeAttrName, isBooleanAttr, escapeHtml, includeBooleanAttr, isFunction, ShapeFlags } from '@mini-vue3/shared';
import { VNode, ssrUtils, ComponentInternalInstance, Text, Comment, Fragment } from "mini-vue3";

const {
  setupComponent,
  renderComponentRoot,
  createComponentInstance,
  isVNode,
  normalizeVNode
} = ssrUtils

//将虚拟dom渲染成HTML字符
function renderElementVNode(vnode: VNode, parentComponent): string {
  const { type: tag, props, children } = vnode

  //1开始标签
  let ret = `<${String(tag)}`

  //2处理属性
  if (props) {
    ret += renderAttrs(props)
  }

  //3判断是否为自闭合标签
  if (isVoidTag(String(tag))) {
    ret += '/>'
    return ret
  }

  //4开始标签闭合
  ret += '>'

  //5处理children
  if (children) {
    if (isArray(children)) {
      //5.1children是数组
      ret += renderVNodeChildren(children, parentComponent)
    } else if (isString(children)) {
      //5.2children是字符串
      ret += children
    }
  }

  //6处理结束标签
  ret += `</${String(tag)}>`
  //7返回生成的html
  return ret

}

const isShouldIgnoreProps = (prop) => ['ref', 'key'].includes(prop)

//生成props
function renderAttrs(props) {
  let ret = ''
  for (let key in props) {
    //这里要处理一些边界条件
    const value = props[key]

    //1、事件属性服务端渲染无需考虑事件绑定直接忽略、组件运行时相关属性不需要生成服务端渲染直接忽略
    if (isShouldIgnoreProps(key) || isOn(key)) {
      continue
    }

    //TODO 此处还要处理class、和Style,因为有可能它们的值是Object需要解析成字符

    //2、生成动态参数
    ret += renderDynamicAttr(key, value)
  }
  return ret
}

//生成动态参数
function renderDynamicAttr(key, value) {

  //1布尔型参数
  if (isBooleanAttr(key)) {
    //eg: <input disabled> 
    return includeBooleanAttr(value) ? ` ${key}` : ''
  } else if (isSSRSafeAttrName(key)) {
    //2安全的属性名称
    //value还需要对value进行转义，防止xss攻击
    return value === '' ? ` ${key}` : ` ${key}="${escapeHtml(value)}"`

  } else {
    //3非安全属性的情况
    console.warn(`[@mini-vue/server-renderer] 渲染不安全的属性名称: ${key}`)
  }

  return ''
}



//将组件渲染成html字符串
function renderComponentVNode(vnode: VNode, parentComponent: ComponentInternalInstance) {
  //初始化组件实例
  const instance = createComponentInstance(vnode, parentComponent)

  setupComponent(instance, true /*isSSR*/)

  //将subTree渲染
  return renderComponentSubTree(instance)
}


//生成subtree
function renderComponentSubTree(instance) {
  const Comp = instance.type
  //函数式组件，返回就是render函数直接渲染即可
  if (isFunction(Comp)) {

    //组件的subTree也就是vnode
    const vnode = instance.subTree = renderComponentRoot(instance)

    //根据vnode生成html字符
    return renderVNode(vnode, instance)
  } else {
    //普通的组件
    if (
      !instance.render ||
      !Comp.ssrRender &&
      !instance.ssrRender &&
      isString(Comp.template)
    ) {
      //如果instance中没有render或者 instance和Comp没有ssrRender 但是Comp中存在template
      //调用ssr编译器编译
      //TODO 此处的SSR编译器没有实现  return ssrCompiler(Comp.template,instance)
    } else if (instance.render) {

      const vnode = instance.subTree = renderComponentRoot(instance)
      return renderVNode(vnode, instance)
    }
  }

}

/**
 * 
 * @param vnode 
 */
export function renderVNode(vnode: VNode, parentComponent = null) {
  const { type, shapeFlag, children } = vnode

  //渲染完成的html字符
  let ret = ''
  switch (type) {
    case Text:
      ret += `${escapeHtml(children)}`
      break;
    case Comment:
      //如果没有值说明是一个占位的，直接拼接一个空的
      ret += children ? `<!--${children}-->` : '<!---->'
      break;
    case Fragment:
      //<!--[-->为Fragment的定界符
      ret += `<!--[-->${renderVNodeChildren(children, parentComponent)}<!--]-->`
      break;
    default:
      if (shapeFlag & ShapeFlags.COMPONENT) {
        // console.log('ssrRender-------COMPONENT')
        ret += renderComponentVNode(vnode, parentComponent)
      } else if (shapeFlag & ShapeFlags.ELEMENT) {
        // console.log('ssrRender-------ELEMENT')
        ret += renderElementVNode(vnode, parentComponent)
      }
  }

  return ret

}


export function renderVNodeChildren(children: VNode[], parentComponent) {
  let ret = ''
  for (let i = 0; i < children.length; i++) {
    const child = normalizeVNode(children[i])
    ret += renderVNode(child, parentComponent)
  }
  return ret
}