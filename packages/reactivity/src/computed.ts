import { isFunction } from "@mini-vue3/shared";
import { ReactiveEffect } from "./effect";
import { trackRefValue, triggerRefValue } from "./ref";

export function computed(getterOrSetter) {
  const onlyGetter = isFunction(getterOrSetter)

  let getter;
  let setter;

  if (onlyGetter) {
    getter = getterOrSetter
    setter = () => { }
  } else {
    getter = getterOrSetter.get
    setter = getterOrSetter.set
  }

  return new ComputedRefImpl(getter, setter)

}

class ComputedRefImpl {
  effect // 当前计算属性的effect
  _dirty = true
  __v_isRef = true
  dep; //当前计算属性被访问时收集的依赖
  _value
  constructor(getter, private _setter) {
    this.effect = new ReactiveEffect(getter, () => {
      //触发计算属性被访问时收集的依赖
      if (!this._dirty) {
        this._dirty = true
        triggerRefValue(this)
      }
    })
  }

  get value() {
    trackRefValue(this)
    if (this._dirty) {
      this._dirty = false
      this._value = this.effect.run()
    }

    return this._value
  }

  set value(newValue) {
    this._setter(newValue)
  }
}

