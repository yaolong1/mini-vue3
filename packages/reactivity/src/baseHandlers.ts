import { extend, hasChanged, hasOwn, isArray, isIntegerKey, isObject, isSymbol, makeMap } from "@mini-vue3/shared"
import { enableTracking, ITERATE_KEY, pauseTracking, track, trigger } from "./effect"
import { TrackOpTypes, TriggerOpTypes } from "./operators"
import { reactive, ReactiveFlags, reactiveMap, readonly, readonlyMap, shallowReactiveMap, shallowReadonlyMap, toRaw } from "./reactive"
//实现响应式

//是否仅读 仅读报warn
//是否浅度响应式



const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
)

const isNonTrackableKeys = makeMap(`__proto__,__v_isRef,__isVue`)



//数组重写的方法对象
const arrayInstrumentations = createInstrumentations()

function createInstrumentations() {
  const instrumentations: Record<string, Function> = {}

    //数组的查找类方法
    ; (['indexOf', 'includes', 'lastIndexOf'] as const).forEach(key => {
      const originMethod = Array.prototype[key] // 拿到原型上的方法
      instrumentations[key] = function (this, ...args) {

        //在vue3源码中这里是需要对数组中的所有值进行track,以此来绑定effect。但是我们实现的miniVue3中的源码是不需要进行track的

        //因为在includes方法内部会遍历this（代理数组），由于vue3中是将this转toRaw成普通的对象了，不存在响应式，所以在遍历的时候不会track
        //在我们的miniVue3中为了减少代码量就没有将this转toRaw成普通的对象，所以在调用includes方法时直接遍历的是响应式数组，会自动触发track，


        //首先去this即Proxy中取找是否存在
        let res = originMethod.apply(this, args)
        if (res === -1 || res === false) {
          //Proxy没找到就在原对象中找
          res = originMethod.apply(this[ReactiveFlags.RAW], args)
        }
        return res
      }
    });

  ; (['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => {
    const originMethod = Array.prototype[key] // 拿到原型上的方法
    instrumentations[key] = function (this, ...args) {

      //在调用数组的修改值的方法前要暂停收集依赖，保证数组添加的正确性（多次循环触发依赖引起的）
      /**
       * 
       * 
       class ReactiveEffect {
          //省略部分代码   
          run() {

            //此时如果没有加判断!effectStack.includes(this)下面的例子会导致循环的track和trigger,解决的办法就是拦截push方法不让push方法执行的时候收集相应的依赖,这种方式最终数组的结果是正确的
            // 此时如果加上了判断!effectStack.includes(this) 下面的例子不会导致循环的track和trigger。

            // 在这之上我们还应该为了保证数组的正确性所以要在调用此方法之前暂停依赖的追踪（收集），等方法执行完成之后再允许追踪----因为调用数组方法时，方法内部会访问数组的length属性并收集length的依赖，但是对于一个修改类型的操作是不需要收集依赖的 
            // 【这个理解有点牵强了，如果没懂看去看《vue.js 设计与实现》#129页】
            if (!effectStack.includes(this)) { 
              //省略部分代码              
            }
          }
        }
       * 例子
       *  const arr = reactive([0])
          effect(() => {
            arr.push(1) // 内部会触发length访问操作和设置值的操作
          })

          effect(() => {
            arr.push(2) // 内部会触发length访问操作和设置值的操作
          })
       */
      pauseTracking() // 调用方法的过程中禁止收集依赖
      let res = originMethod.apply(this, args)
      enableTracking() //方法执行完后再设置回允许收集依赖

      return res
    }
  })

  return instrumentations
}

function createGetter(isReadOnly = false, isShallow = false) { //拦截对象获取
  return function get(target, key, receiver) {

    //当访问的属性是'__v_isReactive'时直接返回true,在createReactiveObject时要判断是否为响应式对象，如果是响应式对象，就必定触发getter
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadOnly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadOnly
    } else if (
      key === ReactiveFlags.RAW
      // &&
      // // 根据不同的类型(readonly、shallow)返回不同的receiver
      // (receiver =
      //   isReadOnly
      //     ? isShallow ? shallowReadonlyMap : readonlyMap
      //     : isShallow ? shallowReactiveMap : reactiveMap
      // ).get(target)
    ) { //  如果外部访问的是__v_raw说明需要拿原对象
      return target
    }

    /**
     * 如果当前的操作对象时数组，并且操作的属性是一个重写的方法,就走自定义的重写方法的逻辑
     */
    if (!isReadOnly && isArray(target) && hasOwn(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }

    const res = Reflect.get(target, key, receiver)

    console.log('当前访问的key', key)

    // 当使用for...of循环时，他们都会读取数组的Symbol.iterator属性。
    // 此属性是一个symbol值，为了避免发生意外的错误, 以及性能的考虑，不应该和副作用函数建立联系, 因此需要过滤掉  《vue.js 设计与实现 --霍春阳》 #123页
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
    if (isObject(res)) { //vue2是一上来就递归，vue3是取值时会进行代理
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

    console.log('set值', key, value)
    const hadKey = (isArray(target) && isIntegerKey(key)) ? key < target.length : hasOwn(target, key)
    const res = Reflect.set(target, key, value, receiver)
    //代理对象变为原型对象后和当前的target相等，说明当前访问的不是原型链上的属性需要触发更新  
    /**
     例子
      const obj = {}
      const proto = { a: 1 } //原型
      const parent = reactive(proto)
      const child = reactive(obj)
      // child.__proto__ = parent
      Object.setPrototypeOf(child, parent)
      console.log(child)
      effect(() => {
        console.log(child.a) // child原对象上没有，就回去原型链上找a
      })

      // 如果child原对象上没有该属性，就回去原型链上找a执行trigger 此时会触发两次trigger,第一次触发是在child响应式对象上、第二次是在parent对象上由于两个对象都是响应式，
      所以要触发两次。解决办法： target === toRaw(receiver) 《vue.js 设计与实现》 #合理的触发响应性-106页
      child.a = 2 
     */
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        //新增
        trigger(target, TriggerOpTypes.ADD, key, value)
      } else if (hasChanged(value, oldValue)) {
        //更新
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
      }
    }
    // console.log('触发依赖')
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
// 为什么ownKeys拦截函数没有key这个参数? 例如对象和数组的for...in 操作是没有针对某一个key做操作，而是整个对象所以参数只有target
function ownKeys(target) {
  // 如果当前操作的对象时数组时直接用length为依赖的key名称，因为操作数组都要改变数组长度
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

  // Symbol不收集
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    track(target, TrackOpTypes.HAS, key)
    console.log('has')
  }
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
  },
  deleteProperty(target, key) {
    console.warn(`readonly api 不能删除目标属性${key}`)
    return true
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