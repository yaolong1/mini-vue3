import { hasChanged, isArray, isObject } from "@mini-vue3/shared"
import { track, trigger } from "./effect"
import { TrackOpTypes, TriggerOpTypes } from "./operators"
import { reactive } from "./reactive"

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


function createObjectRef(target, key) {
  return new ObjectRefImpl(target, key)
}

function createRef(value, isShallow = false) {
  return new RefImpl(value, isShallow)
}


const convert = (val) => isObject(val) ? reactive(val) : val
class RefImpl {
  public _value
  public __v_isRef = true //产生实例时会被添加 表示一个ref实例
  constructor(public rawValue, public isShallow) {

    //如果是浅的就返回原值，如果是深度的且是对象就用reactive进行深度转换
    this._value = isShallow ? rawValue : convert(rawValue)
  }

  get value() {
    track(this, TrackOpTypes.GET, 'value')
    return this._value
  }

  set value(newValue) {
    if (hasChanged(newValue, this.rawValue)) {
      this.rawValue = newValue
      this._value = this.isShallow ? newValue : convert(newValue)
      trigger(this, TriggerOpTypes.SET, 'value', newValue)
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
