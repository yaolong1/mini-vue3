import { hasChanged } from '@mini-vue3/shared';
import { hasOwn } from '@mini-vue3/shared';
import { ITERATE_KEY } from './baseHandlers';
import { track, trigger } from './effect';
import { TrackOpTypes, TriggerOpTypes } from './operators';
import { ReactiveFlags, toRaw, toReactive } from './reactive';

// 集合对象的拦截处理

/**
 * set集合的Add操作
 * @param key 
 * @returns 
 */
function add(key) {
  // 此时的this是指向的代理对象，所以直接访问代理对象获取target
  const target = toRaw(this)
  const hadKey = target.has(key)
  //如果当前要添加的值存在Set中就不需要触发更新
  if (!hadKey) {
    const rawKey = toRaw(key) // 如果key是一个响应式对象直接转换为原型
    target.add(rawKey)
    trigger(target, TriggerOpTypes.ADD, rawKey)
  }
  return this
}

/**
 * set的删除操作
 * @param key 
 * @returns 
 */
function deleteEntry(key) {
  const target = toRaw(this)
  const hadKey = target.has(key) //是否存在当前key
  let res = false //默认删除失败
  if (hadKey) {
    res = target.delete(key)
    trigger(target, TriggerOpTypes.DELETE, key)
  }

  return res
}

/**
 * map获取操作
 * @param key map的key
 */
function get(key) {
  const target = toRaw(this) //原对象
  const had = target.has(key)

  track(target, TrackOpTypes.GET, key)
  let res
  if (had) {
    res = target.get(key)
    return toReactive(res) // 深度响应
  }
}

/**
 * map设置操作
 * @param key 
 * @param value 
 */
function set(key, value) {
  const target = toRaw(this) //拿到原对象


  /**
   * 响应式数据设置到原对象上 这种情况就是数据污染。所以要把响应式对象变成原对象
   * 
   * 例子
   * const m = new Map()
   * 
   * const a = reactive({a:1})
   * const data = reactive(m)
   * 
   * data.set('key',a) // data=Proxy { 'key' => Proxy}   m={ 'key' => Proxy}
   * 
   * m.get('key').a //通过原对象拿到了响应式对象 ---响应式数据设置到原对象上了这种情况叫做数据污染
   * 
   **/
  value = toRaw(value)


  const oldValue = target.get(key)

  const had = target.has(key)
  target.set(key, value)
  if (!had) {
    // 新增
    console.log('新增')
    trigger(target, TriggerOpTypes.ADD, value)
  } else if (hasChanged(value, oldValue)) {
    // 更新
    console.log('更新', '老对象', oldValue, '新对象', value)
    trigger(target, TriggerOpTypes.SET, value, oldValue)
  }
  return this
}

function createInstrumentations() {
  const mutableInstrumentations = {
    add,
    delete: deleteEntry,
    set,
    get
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