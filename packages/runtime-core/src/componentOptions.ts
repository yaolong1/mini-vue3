import { reactive } from "@mini-vue3/reactivity";

export function applyOptions(instance) { 
  const { beforeCreate, created } = instance.type
  const publicThis = instance.proxy;



  //执行beforeCreate生命周期
  beforeCreate && beforeCreate.call(publicThis)
  console.log('生命周期 beforeCreate 调用')

  //初始化optionsApi,主要是为options创建this
  //injectOptions
  //TODO


  //methods
  //TODO


  //dataOptions
  instance.data = reactive(instance.data)


  //computedOptions
  //TODO

  //watchOptions
  //TODO

  //provideOptions
  //TODO


  //执行created生命周期
  created && created.call(publicThis)
  console.log('生命周期 created 调用')



  //为选项生命周期注册this
  //TODO

  //expose处理
  //TODO


  
  //components
  //directives
  //TODO
}