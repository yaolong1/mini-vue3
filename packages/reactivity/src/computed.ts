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
  _dirty = true //是否是脏的（默认取值时进行计算）
  __v_isRef = true
  dep; //当前计算属性被访问时收集的依赖
  _value
  constructor(getter, private _setter) {
    this.effect = new ReactiveEffect(getter, () => {
      //此函数为调度函数：当getter中的响应式数据发生变化后，不会自动的触发依赖，将控制权交给scheduler调度函数，也就是当前所在的函数。
      // 由于计算属性就是当getter中的响应式数据发生变化后该计算属性的依赖会触发，所以在当前函数内直接触发计算属性所依赖的effect函数，就不会触发getter中响应式对象所收集的effect,这也就是scheduler函数的真正用意

      if (!this._dirty) {
        this._dirty = true
      //触发计算属性被访问时收集的依赖
        triggerRefValue(this)
      }
    })
  }

  //属性访问器，当访问的时候收集当前计算属性所依赖的effect,并且要获取到该计算属性的值this.effect.run()，也就是调用getter函数得到最终的结果
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

