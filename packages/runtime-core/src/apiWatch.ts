import { ReactiveEffect } from '@mini-vue3/reactivity';
import { isFunction, isObject } from '@mini-vue3/shared';



/**
 * 
 * @param source 检测的对象
 * @param cb 检测到source变化后触发的函数
 * @param options 参数
 */
export function watch(source, cb, options) {
  let job
  let getter
  let scheduler

  //如果是函数就直接说明是指定了访问的属性
  if (isFunction(source)) {
    getter = source
  } else {
    // 是对象,说明当前的的对象的所有属性都需要监听，直接递归
    getter = () => traverse(source)
  }
  let newValue, oldValue

  job = () => {
    newValue = effect.run()
    cb(oldValue, newValue)
    oldValue = newValue
  }

  scheduler = () => {
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