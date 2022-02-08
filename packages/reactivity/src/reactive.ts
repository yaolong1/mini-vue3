import { isObject } from '@mini-vue3/shared';
import { mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers } from './baseHandlers'


export function reactive(target) {
  return createReactiveObject(target, false, mutableHandlers)
}

export function readonly(target) {
  return createReactiveObject(target, true, readonlyHandlers)
}

export function shallowReactive(target) {
  return createReactiveObject(target, false, shallowReactiveHandlers)
}

export function shallowReadonly(target) {
  return createReactiveObject(target, true, shallowReadonlyHandlers)
}


//WeakMap只能用对象作为key,并且会自动垃圾回收，不会造成内存泄漏
//
const readonlyMap = new WeakMap()
const reactiveMap = new WeakMap()
export function createReactiveObject(target, isReadonly, baseHandlers) {

  //如果不是对象就直接返回 Reactive只拦截对象
  if (!isObject(target)) {
    return target;
  }

  //拿到当前的代理对象（浅度代理或者是普通对象的代理）缓存，用于判断是否返回
  const proxyMap = isReadonly ? readonlyMap : reactiveMap
  //判断当前的对象是否是响应式对象，如果是就直接返回
  const existProxy = proxyMap.get(target)
  if (existProxy) {
    return existProxy
  }
  const proxy = new Proxy(target, baseHandlers)
  //创建完响应式对象之后将其缓存起来
  reactiveMap.set(target,proxy)
  return proxy
}