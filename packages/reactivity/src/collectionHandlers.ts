import { hasOwn } from '@mini-vue3/shared';
import { ITERATE_KEY } from './baseHandlers';
import { track, trigger } from './effect';
import { TrackOpTypes, TriggerOpTypes } from './operators';
import { ReactiveFlags, toRaw } from './reactive';

// 集合对象的拦截处理


function add(key) {
  // 此时的this是指向的代理对象，所以直接访问代理对象获取target
  const target = toRaw(this)
  const hadKey = target.has(key)
  //如果当前要添加的值存在Set中就不需要触发更新
  if (!hadKey) {
    const rawKey = key[ReactiveFlags.RAW] || key
    target.add(rawKey)
    trigger(target, TriggerOpTypes.ADD, rawKey)
  }
  return this
}

function deleteEntry(key) {
  const target = toRaw(this)
  const hadKey = target.has(key)
  let res = false //默认删除失败
  if (hadKey) {
    res = target.delete(key)
    trigger(target, TriggerOpTypes.DELETE, key)
  }

  return res
}

function createInstrumentations() {
  const mutableInstrumentations = {
    add,
    delete: deleteEntry
  }


  const readonlyInstrumentations = {
  }

  const shallowReactiveInstrumentations = {
  }

  const shallowReadonlyInstrumentations = {
  }

  return { mutableInstrumentations, readonlyInstrumentations, shallowReadonlyInstrumentations, shallowReactiveInstrumentations }
}

const { mutableInstrumentations, readonlyInstrumentations, shallowReadonlyInstrumentations, shallowReactiveInstrumentations } = createInstrumentations()



//默认深度响应的
const mutableCollectionHandlers = {
  get: createInstrumentationsGetter(false, false)

}

//默认深度只读的
const readonlyCollectionHandlers = {
  get: createInstrumentationsGetter(true, false)
}

//浅度响应的
const shallowReactiveCollectionHandlers = {
  get: createInstrumentationsGetter(false, true)
}

//浅度只读的
const shallowReadonlyCollectionHandlers = {
  get: createInstrumentationsGetter(true, true)
}


function createInstrumentationsGetter(isReadonly = false, isShallow = false) {
  const instrumentations =
    isReadonly
      ? isShallow ? shallowReadonlyInstrumentations : readonlyInstrumentations
      : isShallow ? shallowReactiveInstrumentations : mutableInstrumentations


  return function get(target, key, receiver) {

    if (key === ReactiveFlags.RAW) {
      return target
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    }



    console.log('当前访问的key', key)
    if (key === 'size') {
      track(target, TrackOpTypes.ITERATE, ITERATE_KEY)
      return Reflect.get(target, key, target)
    }


    return Reflect.get(
      hasOwn(instrumentations, key) && key in target
        ? instrumentations
        : target,
      key,
      receiver
    )
  }
}



export { mutableCollectionHandlers, readonlyCollectionHandlers, shallowReactiveCollectionHandlers, shallowReadonlyCollectionHandlers }