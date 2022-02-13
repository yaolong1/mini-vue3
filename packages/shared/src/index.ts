export const isObject = (value) => typeof value === 'object' && value !== null

//继承对象
export const extend = Object.assign
export const isArray = (value) => Array.isArray(value)
export const isIntegerKey = (key) => parseInt(key) + "" === key

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (target, key) => hasOwnProperty.call(target, key)

export const hasChanged = (newValue, oldValue) => oldValue !== newValue

export const isFunction = (value) => typeof value === 'function'

export const isString = (value) => typeof value === 'string'
/**
 * |(权限合并) &(权限校验) 做权限必备
 * 
 * a = 001
 * b = 010
 * 
 * c = a | b = 011 a和b的权限合并了
 * 
 * c & a = 011 & 001 = 001>0 表示在c权限集合中存在a权限
 * 
 */
export const enum ShapeFlags {
  ELEMENT = 1,//元素
  FUNCTIONAL_COMPONENT = 1 << 1, //函数式组件
  STATEFUL_COMPONENT = 1 << 2, //普通组件
  TEXT_CHILDREN = 1 << 3, //孩子是文本
  ARRAY_CHILDREN = 1 << 4, //孩子是数组
  SLOTS_CHILDREN = 1 << 5, //组件插槽
  TELEPORT = 1 << 6, // teleport组件
  SUSPENSE = 1 << 7, // suspense组件
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT //组件
}
