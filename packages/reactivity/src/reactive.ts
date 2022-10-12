import { isObject, toRawType } from '@mini-vue3/shared';
import { mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers } from './baseHandlers'
import { mutableCollectionHandlers, readonlyCollectionHandlers, shallowReactiveCollectionHandlers, shallowReadonlyCollectionHandlers } from './collectionHandlers'

export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  SKIP = '__v_skip',
  RAW = '__v_raw'
}


export enum TargetTypes {
  INVALID = 0, // 无效对象
  COMMON = 1, // 普通对象
  COLLECTION = 2 // 集合对象
}

function targetTypeMap(rawType: string) {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return TargetTypes.COMMON
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return TargetTypes.COLLECTION
    default:
      return TargetTypes.INVALID
  }
}

/**
 * 获取对象的类型
 * @param value 
 */
export function getTargetType(value) {
   //如果对象不需要代理或者是一个不可扩展对象，就不需要代理
  return value[ReactiveFlags.SKIP]?TargetTypes.INVALID:targetTypeMap(toRawType(value))
}



export function reactive(target) {

  //reactive创建对象，如果target是只读直接返回
  if (isReadonly(target)) { 
    return target
  }
  return createReactiveObject(target, false, reactiveMap, mutableHandlers, mutableCollectionHandlers)
}

export function readonly(target) {
  return createReactiveObject(target, true, readonlyMap, readonlyHandlers, readonlyCollectionHandlers)
}

export function shallowReactive(target) {
  return createReactiveObject(target, false, shallowReactiveMap, shallowReactiveHandlers, shallowReactiveCollectionHandlers)
}

export function shallowReadonly(target) {
  return createReactiveObject(target, true, shallowReadonlyMap, shallowReadonlyHandlers, shallowReadonlyCollectionHandlers)
}


//WeakMap只能用对象作为key,并且会自动垃圾回收，不会造成内存泄漏
export const readonlyMap = new WeakMap()
export const reactiveMap = new WeakMap()
export const shallowReadonlyMap = new WeakMap()
export const shallowReactiveMap = new WeakMap()

/**
 *  
 * @param target 需要代理的原对象
 * @param isReadonly 当前创建的响应式对象是否只读
 * @param proxyMap 储存当前响应式对象的缓存
 * @param baseHandlers 普通对象的处理拦截
 * @param collectionHandlers 集合对象的处理拦截
 * @returns 
 */
export function createReactiveObject(target, isReadonly, proxyMap, baseHandlers, collectionHandlers) {

  //如果target是一个非只读响应式代理对象直接返回原对象
  if (target[ReactiveFlags.RAW] && !(isReadonly && target[ReactiveFlags.IS_REACTIVE])) {
    return target
  }

  //如果不是对象就直接返回 Reactive只拦截对象
  if (!isObject(target)) {
    return target;
  }

  //判断当前的对象是否存在proxy，存在就不必创建直接返回
  const existProxy = proxyMap.get(target)
  if (existProxy) {
    return existProxy
  }


  // 获取原对象的类型
  const targetType = getTargetType(target)

  //如果当前的对象是无效的对象就直接返回（例如函数、其他对象）
  if (targetType === TargetTypes.INVALID) {
    return target
  }

  const proxy = new Proxy(target, targetType === TargetTypes.COLLECTION ? collectionHandlers : baseHandlers)
  //创建完响应式对象之后将其缓存起来
  proxyMap.set(target, proxy)
  return proxy
}

export const def = (obj: object, key: string | symbol, value: any) => {
  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: false,
    value
  })
}


export const toReactive = (val) => isObject(val) ? reactive(val) : val
export const toReadonly = (val) => isObject(val) ? readonly(val) : val

//转换为普通对象
export function toRaw(observed) {
  const raw = observed && (observed as any)[ReactiveFlags.RAW]
  return raw ? toRaw(raw) : observed
}
//将一个对象标记为不可被转为代理。返回该对象本身。
export function markRaw(observed) {
  def(observed, ReactiveFlags.SKIP, true);
  return observed;
}

export function isReadonly(val) {
  return !!val[ReactiveFlags.IS_READONLY]
}
export function isReactive(val) {
  return !!val[ReactiveFlags.IS_REACTIVE]
}