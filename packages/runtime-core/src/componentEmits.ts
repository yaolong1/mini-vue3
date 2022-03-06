import { camelize, toHandlerKey } from "@mini-vue3/shared"

/**
 * 事件发射器
 * @param event 事件名称
 * @param args 事件参数
 * @param instance 组件实例
 */
export function emit(instance, event: string, ...args) {
  const props = instance.props

  //转换为指定格式on开头的驼峰命名
  const evenName = toHandlerKey(camelize(event))

  const handler = props[evenName] //得到事件函数

  if (handler) {
    handler(...args)
  } else {
    console.error('事件不存在')
  }

} 