import { ShapeFlags, isFunction, isObject } from '@mini-vue3/shared';

/**
 * 插槽初始化
 * @param instance 
 */
export function initSlots(instance, children) {

  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {

    //如果是一个函数说明是默认插槽
    if (isFunction(children)) {
      children = { default: children }
    }
    instance.slots = children
  }
}