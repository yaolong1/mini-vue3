import { isArray } from '@mini-vue3/shared';

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
      el.removeEventListener(evenName, existingInvoker)
      invokers[key] = null
    }
  }

}


function createInvoker(nextValue) {
  //e : 事件源
  const invoker = (e) => { //每次调用都是invoker


    // 时间冒泡与更新时机问题的解决
    // const data = reactive({ value: false })
    // createApp({
    //   render() {
    //     //这里会出现事件冒泡与更新时机。什么是事件冒泡？如果一个div存在一个事件,它的孩子标签也存在一个事件，当点击的时候就会先执行孩子标签的事件随后再执行父标签的事件，这就是事件冒泡

    //     // 当点击p标签修改响应式数据data.value=true 时，居然div的点击事件也执行了，这不符合常理
    //     // 按道理来说只执行p标签的点击事件，并不能导致div点击事件的执行。因为点击的时候div并没有事件
    //     // 但是由于data是响应式的数据，data改变会导致再次执行render,而此时data.value=true,div已经绑定事件。
    //     // 此时执行div标签执行只有一个原因：说明事件绑定发生在事件冒泡之前 《vue.js 设计与实现》 #201页

    //     // 解决：屏蔽事件绑定时间晚于事件触发时间的事件处理函数
    //     console.log(1)
    //     return h('div', { onClick: data.value ? () => console.log('父级div') : {} }, h('p', { onClick: () => { data.value = true } }, 'p孩子标签'))
    //   }
    // }).mount('#app')

    const timeStamp = e.timeStamp //事件触发的时间
    console.log('事件触发时间', e.timeStamp)
    console.log('事件创建时间', invoker.attached)
    console.log('触发函数', invoker.value)
    if (timeStamp < invoker.attached) return

    // 一个事件有可能会绑定多个方法 addEventLister('onClick',fn1) addEventLister('onClick',fn2) 点击时会执行fn1和fn2 《vue.js 设计与实现》 #200页
    // eg： { onClick: [() => console.log(1), () => console.log(1)] } 
    isArray(invoker.value) ? invoker.value.map(fn => fn(e)) : invoker.value(e)

  }
  invoker.value = nextValue // 将当前的value (函数) 存到invoker.value变量上，到时候如果改变了就直接修改  invoker.value = newValue即可。 因为invoker是一个引用
  invoker.attached = performance.now() //事件绑定的时间    performance.now()是高精时间、e.timeStamp 也是高精时间，方便比较
  return invoker
}

