export const isObject = (value) => typeof value === 'object' && value !== null
export const isUndefined = (value) => typeof value === 'undefined'

//继承对象
export const extend = Object.assign
export const isArray = (value) => Array.isArray(value)
export const isIntegerKey = (key) => parseInt(key) + "" === key

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (target, key) => hasOwnProperty.call(target, key)


const objectToString = Object.prototype.toString
//获取对象的字符串。[Object rawType]
export function toTypeString(value) {
  return objectToString.call(value) //return[Object rawType]
}

/**
 * 拿到对象的 rawType 
 * [Object Object]    rawType=object
 * @param value 原对象
 * @returns rawType
 */
export function toRawType(value) {
  return toTypeString(value).slice(8, -1)
}


/**
 * 
 * 由于 === 不严格 当 newValue: NaN === oldValue:NaN 时 是为false的  使用Object.is(NaN,NaN) 为true   更加严格
 * +0 === -0 //true 
  NaN === NaN // false
  Object.is(+0, -0) // false
  Object.is(NaN, NaN) // true
 * 
 * 例子
    const data = reactive({ key1: NaN, key2: 'key2', key3: 'key3', test() { return 'x' } })
    effect(() => {
      for (const key in data) {
        console.log(key)
      }
      console.log(data.test())
    })
    data.key1 = NaN // 两个值压根没变,但是NaN === NaN 却为false最终还是会触发更新。 解决方案  使用Object.is(NaN,NaN) 为true   更加严格
 */
export const hasChanged = (newValue, oldValue) => !Object.is(newValue, oldValue)

export const isFunction = (value) => typeof value === 'function'

export const isString = (value) => typeof value === 'string'

export const isSymbol = (val: unknown): val is symbol => typeof val === 'symbol'


export function makeMap(
  str: string,
  expectsLowerCase?: boolean
): (key: string) => boolean {
  const map: Record<string, boolean> = Object.create(null)
  const list: Array<string> = str.split(',')
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true
  }
  return expectsLowerCase ? val => !!map[val.toLowerCase()] : val => !!map[val]
}


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
