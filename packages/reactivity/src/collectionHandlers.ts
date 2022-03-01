import { isMap } from './../../shared/src/index';
import { hasChanged } from '@mini-vue3/shared';
import { hasOwn } from '@mini-vue3/shared';
import { ITERATE_KEY, MAP_KEY_ITERATE_KEY } from './effect';
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
    return toReactive(res) // 深度响应 p.get('key').set('ke2',1) p是一个set响应式对象  为了这种情况也能触发依赖更新
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
    trigger(target, TriggerOpTypes.ADD, key, value)
  } else if (hasChanged(value, oldValue)) {
    // 更新
    console.log('更新', '老对象', oldValue, '新对象', value)
    trigger(target, TriggerOpTypes.SET, key, value, oldValue)
  }
  return this
}

/**
 * 
 * @param thisArg forEach中的this
 * @param callback 回调
 */
function forEach(callback, thisArg) {
  const target = toRaw(this)
  track(target, TrackOpTypes.ITERATE, ITERATE_KEY) // ITERATE_KEY作为key的原因是因为delete、add操作都要影响forEach

  // 将普通对象包装成响应式对象

  const warp = toReactive //TODO 此处应该还要根据是否只读来判断包裹对象的类型
  target.forEach(((key, value) => {


    /**
     const key = { k1: 1 }
     const value = new Set([1, 2, 3])

     const p = reactive(new Map([[key, value]]))

     effect(() => {
       p.forEach((value, key) => {
         console.log(value.size) // value、key应该为响应式对象，否则value.size将不会依赖跟踪，所以要是用 warp(key), warp(value)包裹
       });
     })
   */
    callback.call(thisArg, warp(key), warp(value), this)
  }))
}

function createIteratorMethod(method, isReadonly = false, isShallow = false) {
  return function (this: any, ...args) {
    const target = toRaw(this)
    console.log(this)
    const itr = target[method]() //获取迭代器对象
    const warp = toReactive //TODO 此处还要判断是否只读
    const isPair = method === 'entries' || (method === Symbol.iterator && isMap(target)) // 是否是一对 【key,value】


    const isKeys = method === 'keys' //是否是keys操作

    /**
      const map = new Map([['key', 1], ['key2', 2]])
      const p = reactive(map)

      effect(() => {
        for (const i of p.keys()) {
          console.log(i)
        }

      })
      p.set('key3', 3) 
      
      对于Map的keys方法不能使用ITERATE_KEY作为依赖收集的key,因为keys是针对key的访问，当更新的时候是不需要触发依赖，key没有变只是值变了。
      所以依赖收集的时候需要分开收集不能都使用ITERATE_KEY作为依赖收集的key，针对keys操作我们用MAP_KEY_ITERATOR_KEY作为依赖收集的key。
      这样就可以在trigger的时候分别对待：（ADD、DELETE）触发 MAP_KEY_ITERATE_KEY和ITERATE_KEY的依赖， SET触发ITERATE_KEY的依赖
     */
    isKeys ? track(target, TrackOpTypes.GET, MAP_KEY_ITERATE_KEY) : track(target, TrackOpTypes.GET, ITERATE_KEY) // ITERATE_KEY依赖收集
    return {
      next() {
        const { value, done } = itr.next() //调用next()得到迭代的value和done
        //返回重写之后的
        return {
          value: value ? isPair ? [warp(value[0]), warp(value[1])] : warp(value) : value,// 重写一下value,把value变成响应式的此处和forEach方法一样
          done
        }
      },
      [Symbol.iterator]() {
        return this
      }

    }
  }
}

function createInstrumentations() {
  const mutableInstrumentations = {
    add,
    delete: deleteEntry,
    set,
    get,
    forEach,
  }


  const readonlyInstrumentations = {
  }

  const shallowReactiveInstrumentations = {
  }

  const shallowReadonlyInstrumentations = {
  }


  const iteratorMethod = ['entries', 'values', 'keys', Symbol.iterator]
  iteratorMethod.forEach(method => {
    mutableInstrumentations[method] = createIteratorMethod(method, false, false)
    readonlyInstrumentations[method] = createIteratorMethod(method, true, false)
    shallowReactiveInstrumentations[method] = createIteratorMethod(method, false, true)
    shallowReadonlyInstrumentations[method] = createIteratorMethod(method, true, true)
  })


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