import { ReactiveEffect } from '@mini-vue3/reactivity';
import { isFunction, isObject } from '@mini-vue3/shared';



/**
 * 
 * @param source 检测的对象
 * @param cb 检测到source变化后触发的函数
 * @param options 参数
 */
export function watch(source, cb, options) {
  let getter // 保存观察的目标对象的访问函数，供ReactiveEffect使用
  let cleanup //用于保存过期的回调函数


  //如果是函数就直接说明是指定了访问的属性
  if (isFunction(source)) {
    getter = source
  } else {
    // 是对象,说明当前的的对象的所有属性都需要监听，直接递归
    getter = () => traverse(source)
  }


  /**
   * 
   * @param fn 过期的回调函数
   */
  function onInvalidDate(fn) {
    cleanup = fn
  }


  let newValue, oldValue

  const job = () => {
    //执行effect获取新的值
    newValue = effect.run()

    if (cleanup) {
      cleanup()
    }

    cb(oldValue, newValue, onInvalidDate)
    //当watch触发完后新值就变成了旧值
    oldValue = newValue
  }

  const scheduler = () => {
    if (options && options.flush === 'post') {
      //组件更新之后执行
      console.log('post 组件更新之后执行')
      const p = Promise.resolve()
      p.then(job)
    } else if (options && options.flush === 'pre') {
      console.log('post 组件更新之前执行')
      //组件更新之前执行
    } else {
      job()
    }
  }


  const effect = new ReactiveEffect(getter, scheduler)

  //是否立即执行立即执行会直接执行job
  if (options && options.immediate) {
    job()
  } else {
    // 没运行job之前需要执行一次用于收集依赖，并把初始值（直接执行的effect.run()就是初始值）设置为老值
    oldValue = effect.run()
  }
}


/**
 * 递归访问注册依赖
 * @param value 
 * @param seen 
 * @returns 
 */
function traverse(value, seen = new Set) {
  //读取是原值，或者是读取过，直接返回
  if (!isObject(value) || seen.has(value)) return

  seen.add(value)

  for (const key in value) {
    traverse(value[key], seen)
  }
  return value
}