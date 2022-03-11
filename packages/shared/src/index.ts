export * from './shapeFlags'
export * from './domAttrConfig'

export const isObject = (value) => typeof value === 'object' && value !== null
export const isUndefined = (value) => typeof value === 'undefined'

//继承对象
export const extend = Object.assign
export const isArray = (value): value is Array<any> => Array.isArray(value)
export const isIntegerKey = (key) => parseInt(key) + "" === key

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (target, key) => hasOwnProperty.call(target, key)

export const isMap = (val) => toRawType(val) === 'Map'

const objectToString = Object.prototype.toString
//获取对象的字符串。[Object rawType]
export function toTypeString(value) {
  return objectToString.call(value) //return[Object rawType]
}

const onRE = /^on[^a-z]/
export const isOn = (key: string) => onRE.test(key)



const cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
  const cache: Record<string, string> = Object.create(null)
  return ((str: string) => {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }) as any
}

/**
 * 执行数组中的函数
 * @param fns 
 * @param arg 
 */
export const invokeArrayFns = (fns: Function[], arg?: any) => {
  for (let i = 0; i < fns.length; i++) {
    fns[i](arg)
  }
}

const camelizeRE = /-(\w)/g
/**
 * 将横线命名变为驼峰命名
 * on-change -> onChange
 * @private
 */
export const camelize = cacheStringFunction((str: string): string => {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
})

/**
 * 首字母大写
 * change -> Change
 * @private
 */
export const capitalize = cacheStringFunction(
  (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
)

/**
 * 前缀+on
 * change -> onChange
 * @private
 */
export const toHandlerKey = cacheStringFunction((str: string) =>
  str ? `on${capitalize(str)}` : ``
)

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

export const isFunction = (value): value is Function => typeof value === 'function'

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


