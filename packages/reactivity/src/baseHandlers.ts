import { extend, isObject } from "@mini-vue3/shared"
import { reactive, readonly } from "./reactive"
//实现响应式

//是否仅读 仅读报warn
//是否浅度响应式

function createGetter(isReadOnly = false, isShallow = false) { //拦截对象获取
  return function get(target, key, receiver) {

    const res = Reflect.get(target, key, receiver)

    if (!isReadOnly) {
      //不是只读收集依赖
      console.log("收集依赖")
    }
    console.log('只读的,不收集依赖')

    //浅度代理直接返回结果 默认的Proxy只代理一层（浅度的）
    if (isShallow) {
      console.log('我是浅度的')
      return res
    }

    console.log(isObject(res))
    //如果是对象就深度代理
    if (isObject(res)) { //vue是一上来就递归，vue3是取值时会进行代理
      return isReadOnly ? readonly(res) : reactive(res)
    }

    return res

  }
}

function createSetter(isShallow = false) { //拦截对象设置
  return function set(target, key, value) {
    const res = Reflect.set(target, key, value)
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