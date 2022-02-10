import { extend, hasChanged, hasOwn, isArray, isIntegerKey, isObject } from "@mini-vue3/shared"
import { track, trigger } from "./effect"
import { TrackOpTypes, TriggerOpTypes } from "./operators"
import { reactive, ReactiveFlags, readonly } from "./reactive"
//实现响应式

//是否仅读 仅读报warn
//是否浅度响应式

function createGetter(isReadOnly = false, isShallow = false) { //拦截对象获取
  return function get(target, key, receiver) {

    //当访问的属性是'__v_isReactive'时直接返回true,在createReactiveObject时要判断是否为响应式对象，如果是响应式对象，就必定触发getter
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    const res = Reflect.get(target, key, receiver)

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
  return function set(target, key, value) {

    const oldValue = target[key]

    const hadKey = (isArray(target) && isIntegerKey(key)) ? key < target.length : hasOwn(target, key)

    const res = Reflect.set(target, key, value)

    if (!hadKey) {
      //新增
      trigger(target, TriggerOpTypes.ADD, key, value)
    } else if (hasChanged(value, oldValue)) {
      //更新
      trigger(target, TriggerOpTypes.SET, key, value, oldValue)
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
  set
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