import { onUnmounted } from './apiLifecycle';
import { isFunction } from '@mini-vue3/shared';
import { ref, shallowRef } from '@mini-vue3/reactivity';
import { createVNode, Text } from './vnode';
import { rejects } from 'assert';

export interface AsyncComponentOptions<T = any> {
  loader: AsyncComponentLoader<T>,
  timeout?: number,
  delay?: number, //delay毫秒没有加载完成组件就加载loadingComponent
  loadingComponent?: {},
  errorComponent?: {},
  onError?: (err: Error, retry, fail, retries: number) => void
}

export type AsyncComponentLoader<T = any> = () => Promise<T>


export function defineAsyncComponent(source: AsyncComponentOptions | AsyncComponentLoader) {

  //source如果是函数就将source封装成对象
  if (isFunction(source)) {
    source = { loader: source }
  }

  const {
    loader,
    errorComponent,
    loadingComponent,
    delay = 200, // 默认200毫秒后如果异步组件没加载出来就加载loadingComponent
    timeout,
    onError
  } = source

  //默认重试次数
  let retires = 0

  const load = () => {
    return loader()
      //捕获错误
      .catch(err => {
        //如果用户制定了onError就直接将结果交给用户
        if (onError) {
          return new Promise((resolve, reject) => {
            // 重试
            const retry = () => {
              resolve(load())
              retires++
            }
            //失败
            const fail = () => reject(err)

            //将retry和file、retires传入onError回调函数交给用户处理
            onError(err, retry, fail, retires)
          })
        } else {
          throw err;
        }
      })
  }



  //存储异步加载的组件
  let InnerComp = null

  //返回一个包装组件
  return {
    name: 'AsyncComponentWrapper',
    setup() {
      //定义一个ref表示组件是否加载完成
      const loaded = ref(false)

      //是否超时
      const isTimeout = ref(false)

      //定义一个error，当错误发生时，用来存储错误对象
      const error = shallowRef(null)

      //加载延迟,默认不加载
      const isLoading = ref(false)
      let loadingTimer = null //延迟加载的定时器
      if (delay) {
        loadingTimer = setTimeout(() => {
          isLoading.value = true
        }, delay);
      } else {
        isLoading.value = true
      }

      //异步加载组件
      load().then(comp => {
        InnerComp = comp
        loaded.value = true
        console.log('异步组件加载完成')
      }).catch(err => error.value = err).finally(() => {
        isLoading.value = false
        clearTimeout(loadingTimer)
      })


      let timer = null
      //如果启动了超时时长，开启定时器
      if (timeout) {
        timer = setTimeout(() => {
          const err = new Error(`Async component timed out after ${timeout}ms.`)
          error.value = err
          isTimeout.value = true
        }, timeout);
      }

      //在组件卸载之后执行
      onUnmounted(() => {
        clearTimeout(timer)
      })

      // 默认占位符
      const defaultPlaceholder = createVNode(Text, {}, '')

      return () => {
        //加载完毕显示组件、否则加载
        if (loaded.value) {
          return createVNode(InnerComp, {})
        } else if ((errorComponent && error.value)) {
          // 如果存在异常且异常的自定义组件用户已经定义那么就直接返回自定义的组件
          return createVNode(errorComponent, { error: error.value })
        } else if ((loadingComponent && isLoading.value)) {
          // 如果正在加载，就显示加载组件
          return createVNode(loadingComponent, {})
        } else {
          return defaultPlaceholder
        }
      }

    }
  }

}