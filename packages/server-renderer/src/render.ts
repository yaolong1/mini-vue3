import { isOn, isVoidTag, isArray, isString, isSSRSafeAttrName, isBooleanAttr, escapeHtml, includeBooleanAttr, isFunction } from '@mini-vue3/shared';
import { VNode } from "mini-vue3";

//将虚拟dom渲染成HTML字符
export function renderElementVNode(vnode: VNode): string {
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
      children.forEach(child => ret += renderElementVNode(child))
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
function renderComponentVNode(vnode: VNode) {
  const { type, props, children } = vnode


  let componentOptions = vnode.type

  //函数式组件
  if (isFunction(type)) {
    componentOptions = {
      render: vnode.type,
      //@ts-ignore
      props: vnode.type.props
    }
  }

}