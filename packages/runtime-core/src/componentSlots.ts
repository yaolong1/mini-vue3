import { ShapeFlags, isFunction, isObject, isArray } from '@mini-vue3/shared';
import { ComponentInternalInstance } from './component';
import { normalizeVNode, VNode } from './vnode';

export type Slot = (...args: any[]) => VNode[]

export type InternalSlots = {
  [name: string]: Slot | undefined
}



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
  } else {
    instance.slots = {}
    if (children) {
      normalizeVNodeSlots(instance, children)
    }
  }
}

const normalizeVNodeSlots = (
  instance: ComponentInternalInstance,
  children
) => {
  const normalized = normalizeSlotValue(children)
  instance.slots.default = () => normalized
}


const normalizeSlotValue = (value: unknown): VNode[] =>
  isArray(value)
    ? value.map(normalizeVNode)
    : [normalizeVNode(value)]



export function updateSlots(instance: ComponentInternalInstance, children) {
  const { vnode, slots } = instance
  if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    normalizeObjectSlots(children, slots, instance)
  } else if (children) {
    normalizeVNodeSlots(instance, children)
  }

}

function normalizeObjectSlots(rawSlots, slots, instance) {


  for (const key in rawSlots) {
    const value = rawSlots[key]
    if (isFunction(value)) {
      //如果value是一个函数式组件
      //TODO 现在实现的没有props和ctx参数
      slots[key] = () => normalizeSlotValue(value())
    } else if (value != null) {
      slots[key] = () => normalizeSlotValue(value)
    }
  }
}