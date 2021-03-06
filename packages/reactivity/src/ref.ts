import { hasChanged, isArray, isObject } from "@mini-vue3/shared"
import { createDep } from "./dep"
import { isTracking, track, trackEffects, trigger, triggerEffects } from "./effect"
import { TrackOpTypes, TriggerOpTypes } from "./operators"
import { isReactive, reactive, toReactive } from "./reactive"

/**
 * 深度响应式ref
 * @param value 
 * @returns 
 */
export function ref(value) {
  return createRef(value)
}

/**
 * 浅的响应ref
 * @param value 
 * @returns 
 */
export function shallowRef(value) {
  return createRef(value, true)
}

/**
 * 将对象转化为ref
 * @param target 目标对象
 * @param key 目标key
 * @returns 
 */
export function toRef(target: Object | string, key: string) {
  return createObjectRef(target, key);
}


export function toRefs(object) {
  const ret = isArray(object) ? new Array(object.length) : {}
  for (let key in object) {
    ret[key] = toRef(object, key)
  }
  return ret
}


const shallowUnwrapHandlers = {
  get(target, key, receiver) {
    console.log(target, key)
    return unref(Reflect.get(target, key, receiver))
  },
  set(target, key, value, receiver) {
    const oldValue = target[key]
    //如果oldValue是一个Ref,value不是ref
    if (isRef(oldValue) && !isRef(value)) {
      //直接设置
      oldValue.value = value
      return true
    } else {
      return Reflect.set(target, key, value, receiver)
    }
  }
}

/**
 * 自动脱ref
 * @param objectWithRefs  
 */
export function proxyRefs(objectWithRefs) {
  return isReactive(objectWithRefs) ? objectWithRefs : new Proxy(objectWithRefs, shallowUnwrapHandlers)
}


function createObjectRef(target, key) {
  return new ObjectRefImpl(target, key)
}

function createRef(value, isShallow = false) {
  return new RefImpl(value, isShallow)
}

class RefImpl {
  public dep //当前ref的依赖
  public _value
  public __v_isRef = true //产生实例时会被添加 表示一个ref实例
  constructor(public rawValue, public isShallow) {

    //如果是浅的就返回原值，如果是深度的且是对象就用reactive进行深度转换
    this._value = isShallow ? rawValue : toReactive(rawValue)
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newValue) {
    if (hasChanged(newValue, this.rawValue)) {
      this.rawValue = newValue
      this._value = this.isShallow ? newValue : toReactive(newValue)
      triggerRefValue(this)
    }
  }
}

class ObjectRefImpl {
  public __v_isRef = true
  public _object
  constructor(public target, public key) {
    this._object = target
  }

  set value(newValue) {
    if (hasChanged(newValue, this.target[this.key])) {
      this.target[this.key] = newValue
    }
  }

  get value() {
    return this.target[this.key]
  }
}


export function trackRefValue(ref) {
  if (isTracking()) {
    const dep = ref.dep || (ref.dep = new Set)
    trackEffects(dep)
  }
}

export function triggerRefValue(ref) {
  //此处的createDep是为了和cleanupEffect配合，直接重新创建一个引用避免循环执行
  triggerEffects(createDep(ref.dep))
}

export const isRef = (val) => {
  return !!val.__v_isRef
}

export const unref = (ref) => {
  return isRef(ref) ? ref.value : ref
}