
/**
 * 
 * @param fn 当前的副作用函数
 * @param options 副作用函数的一下选项
 * @returns
 */
export function effect(fn, options: any = {}) {

  const effect = createReactiveEffect(fn, options)

  //非懒加载就立即执行
  if (!options.lazy) {
    effect()
  }
  return effect
}

let uid = 0
let watchEffect
let effectStack = [] //防止嵌套effect 导致当前的watchEffect错乱 用栈数据结构的形式解决，在effect函数执行之前就把自己压入栈中执行完后弹出即可
// effect(() => { //effct1
//   stat.a  // effectStack = [effect1]
//   effect(() => {  //effct2
//     stat.b // effectStack = [effect1,effect2]
//   })
//   stat.c // effectStack = [effect1]
// })
export function createReactiveEffect(fn, options) {

  const effect = function effect() {
    try {
      effectStack.push(fn)
      watchEffect = fn
      fn()
    }
    finally {
      effectStack.pop()
      watchEffect = effectStack[effectStack.length - 1]
    }
  }
  effect.raw = fn //保存effect对应的原函数
  effect.id = uid++ //当前effect的唯一标识
  effect._isEffect = true //用于标识当前函数式响应式的effect
  effect.options = options //在effect上保存用户的属性


  return effect
}



const targetMap = new WeakMap() //使用weakMap保存响应式对象所依赖的依赖集 const state = reactive({age: 1})
export function track(target, trackOpType, key) {
  console.log(`开启收集依赖-收集当前属性${key}`)
  if (watchEffect === undefined) {
    return;
  }

  let depsMap = targetMap.get(target) // 获取当前target对象的依赖集
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map)) // 用Map的原因是当前target的属性需要一一对应依赖
  }

  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set))
    // 用Set的原因： 有可能一个响应式对象中的属性在多个effect函数中引用，不使用Array的原因是因为一个effect函数中可能出现多个相同属性使用set去重
    // effect(() => {
    //   state.age
    // })
    // effect(() => {
    //   state.age
    // })
  }
  if (!dep.has(watchEffect)) {
    dep.add(watchEffect)
  } 
  console.log('targetMap', targetMap)
}


