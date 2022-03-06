import { currentInstance, LifecycleHooks } from "./component"


export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated = createHook(LifecycleHooks.UPDATED)
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNT)
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED)


/**
 * 创建生命周期函数
 * @param lifecycle 
 * @returns 
 */
function createHook(lifecycle) {
  return (hook, target = currentInstance) => injectHook(lifecycle, hook, target)
}


/**
 * 注入钩子
 * @param type 生命周期类型
 * @param hook 注入的钩子函数
 * @param target 当前的组件实例
 */
function injectHook(type: LifecycleHooks, hook: Function, target) {
  const hooks = target[type] || (target[type] = [])
  if (target) {
    //一个组件实例中可以有多个相同的生命周期函数，所以需要用数组存着
    hooks.push(hook)
  } else {
    console.error('生命周期函数只能在setup中调用')
  }
}