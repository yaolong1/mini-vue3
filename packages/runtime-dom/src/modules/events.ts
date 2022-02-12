
export function patchEvent(el, key, nextValue) {
  //vei vue event invoker 缓存的事件绑定  对于相同事件,值不同的情况直接从缓存中取即可
  //例如 <div onclick="()=>{console.log('aaaaa')}"> </div> <div onclick="()=>{console.log('bbb')}"> </div> 无需频繁的addEventListener() removeEventListener() 
  const invokers = el._vei || (el._vei = {})
  //事件名称
  const evenName = key.slice(2).toLowerCase()

  const existingInvoker = invokers[key]
  //有缓存、有新的值 从缓存修改引用换绑事件函数nextValue
  if (existingInvoker && nextValue) {
    existingInvoker.value = nextValue
  } else {
    //有新值、缓存中没有，添加事件addEventListener 添加缓存
    if (nextValue) {
      const invoker = invokers[key] = createInvoker(nextValue)
      el.addEventListener(evenName, invoker)

      //value=null,existingInvoker有值 删除当前的事件，清空缓存
    } else if (existingInvoker) {
      el.removeEventListener(evenName)
      invokers[key] = null
    }
  }

}


function createInvoker(nextValue) {
  //e : 事件源
  const invoker = (e) => { //每次调用都是invoker
    invoker.value(e)
  }
  invoker.value = nextValue // 将当前的value (函数) 存到invoker.value变量上，到时候如果改变了就直接修改  invoker.value = newValue即可。 因为invoker是一个引用
  return invoker
}

