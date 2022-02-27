import { isObject } from '@mini-vue3/shared';
import { mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers } from './baseHandlers'

export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  RAW = '__v_raw'
}

export function reactive(target) {
  return createReactiveObject(target, false, reactiveMap, mutableHandlers)
}

export function readonly(target) {
  return createReactiveObject(target, true, readonlyMap, readonlyHandlers)
}

export function shallowReactive(target) {
  return createReactiveObject(target, false, shallowReactiveMap, shallowReactiveHandlers)
}

export function shallowReadonly(target) {
  return createReactiveObject(target, true, shallowReadonlyMap, shallowReadonlyHandlers)
}


//WeakMap只能用对象作为key,并且会自动垃圾回收，不会造成内存泄漏
export const readonlyMap = new WeakMap()
export const reactiveMap = new WeakMap()
export const shallowReadonlyMap = new WeakMap()
export const shallowReactiveMap = new WeakMap()
export function createReactiveObject(target, isReadonly, proxyMap, baseHandlers) {

  //如果target是一个响应式对象直接返回原对象
  if (target[ReactiveFlags.RAW] && !(isReadonly && target[ReactiveFlags.IS_REACTIVE])) {
    return target
  }

  //如果不是对象就直接返回 Reactive只拦截对象
  if (!isObject(target)) {
    return target;
  }

  //判断当前的对象是否是响应式对象，如果是就直接返回
  const existProxy = proxyMap.get(target)
  if (existProxy) {
    return existProxy
  }
  const proxy = new Proxy(target, baseHandlers)
  //创建完响应式对象之后将其缓存起来
  proxyMap.set(target, proxy)
  return proxy
}

export const toReactive = (val) => isObject(val) ? reactive(val) : val

//转换为普通对象
export function toRaw(observed) {
  const raw = observed && (observed as any)[ReactiveFlags.RAW]
  return raw ? toRaw(raw) : observed
}

export function isReadonly(val) { 
 return !!val[ReactiveFlags.IS_READONLY]
}
