import { extend, hasChanged, hasOwn, isArray, isIntegerKey, isObject, isSymbol, makeMap } from "@mini-vue3/shared"
import { track, trigger } from "./effect"
import { TrackOpTypes, TriggerOpTypes } from "./operators"
import { isReadonly, reactive, ReactiveFlags, reactiveMap, readonly, readonlyMap, shallowReactiveMap, shallowReadonly, shallowReadonlyMap, toRaw } from "./reactive"
import { isRef } from "./ref"
//实现响应式

//是否仅读 仅读报warn
//是否浅度响应式

// 表示for...in 操作类型所触发的依赖收集的key。因为for...in 操作是针对这个对象的访问,没有针对对象的属性，所以就没有key,这里我们直接自定义一个key，用于专门处理
export const ITERATE_KEY = Symbol()

const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
)

const isNonTrackableKeys = makeMap(`__proto__,__v_isRef,__isVue`)

function createGetter(isReadOnly = false, isShallow = false) { //拦截对象获取
  return function get(target, key, receiver) {

    //当访问的属性是'__v_isReactive'时直接返回true,在createReactiveObject时要判断是否为响应式对象，如果是响应式对象，就必定触发getter
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadOnly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadOnly
    } else if (
      key === ReactiveFlags.RAW
      &&
      // TODO 不理解为什么要这么赋值给 receiver
      (receiver =
        isReadOnly
          ? isShallow ? shallowReadonlyMap : readonlyMap
          : isShallow ? shallowReactiveMap : reactiveMap
      ).get(target)
    ) { //  如果外部访问的是__v_raw说明需要拿原对象
      return target
    }

    const res = Reflect.get(target, key, receiver)


    // TODO 不理解为什么要这么判断
    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res
    }

    if (!isReadOnly) {
      //不是只读收集依赖
      track(target, TrackOpTypes.GET, key)
    }

    //浅度代理直接返回结果 默认的Proxy只代理一层（浅度的）
    if (isShallow) {
      console.log('我是浅度的')
      return res
    }
    //如果是对象就深度代理
    if (isObject(res)) { //vue是一上来就递归，vue3是取值时会进行代理
      return isReadOnly ? readonly(res) : reactive(res)
    }

    return res

  }
}

function createSetter(isShallow = false) { //拦截对象设置
  return function set(target, key, value, receiver) {

    let oldValue = target[key]

    // if (!isShallow && !isReadonly(value)) {
    //   value = toRaw(value)
    //   oldValue = toRaw(oldValue)
    // }

    
    const hadKey = (isArray(target) && isIntegerKey(key)) ? key < target.length : hasOwn(target, key)
    const res = Reflect.set(target, key, value, receiver)
    //代理对象变为原型对象后和当前的target相等，说明当前访问的不是原型链上的属性需要触发更新  
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        //新增
        trigger(target, TriggerOpTypes.ADD, key, value)
      } else if (hasChanged(value, oldValue)) {
        //更新
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
      }
    }
    console.log('触发依赖')
    return res
  }
}


//getter相关
//普通的getter
const get = createGetter();
//只读的getter
const readonlyGet = createGetter(true);
//浅度getter
const shallowGet = createGetter(false, true);
//只读浅度的getter
const shallowReadonlyGet = createGetter(true, true);



/**
 * 
 * const data = reactive({key1:1,key2:2})
 * effect(()=>{
 *    for( const key in data){ // for...in 操作符 会调用 Reflect.ownKeys(target) 对应的拦截函数就是ownKeys()
 *        console.log(key)
 *    }
 * })
 */
// 为什么ownKeys拦截函数没有key这个参数? 例如for...in 操作是没有针对某一个key做操作，而是整个对象所以参数只有target
function ownKeys(target) {
  track(target, TrackOpTypes.ITERATE, isArray(target) ? 'length' : ITERATE_KEY) //这种情况需要收集依赖
  return Reflect.ownKeys(target)
}

/**
 * const data = reactive({key1:1,key2:2})
 * effect(() =>{
 *  'key1' in data  //in 操作符中调用了HasProperty 则对应proxy的拦截函数has(target, key) key = 'key1'
 * })
 */
function has(target, key) {
  const ret = Reflect.has(target, key)
  track(target, TrackOpTypes.HAS, key)
  console.log('has')
  return ret
}

//删除操作时触发
function deleteProperty(target, key) {
  const hadKey = hasOwn(target, key)
  const oldValue = target[key]
  const ret = Reflect.deleteProperty(target, key)
  if (ret && hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, null, oldValue)
  }
  return ret
}


//setter相关
let readOnlyObj = {
  set: (target, key, value) => {
    console.warn(`readonly api 不能设置目标值${key}为${value}`)
  }
}

const set = createSetter()
const shallowSet = createSetter(true)



const mutableHandlers = {
  get,
  set,
  ownKeys,
  has,
  deleteProperty
}

const readonlyHandlers = extend({
  get: readonlyGet
}, readOnlyObj)

const shallowReactiveHandlers = {
  get: shallowGet,
  set: shallowSet
}

const shallowReadonlyHandlers = extend({
  get: shallowReadonlyGet
}, readOnlyObj)


export { mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers }