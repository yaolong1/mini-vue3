# mini-vue3

#### 声明

源码中的注释都是凭自己对 vue 的理解所写的，如有注释错误或者语义不清晰，希望大家提交中文注释的pr。

#### 介绍

迷你版 vue3 (带详细注释),采用和vue3源码相同的monorepo前端项目管理，源码结构、函数名和vue3基本一致

#### 核心功能
- reactivity
    - [x] reactive 只支持普通对象和Map、Set对象的响应式代理
    - [x] shallowReactive
    - [x] readonly
    - [x] shallowReadonly
    - [x] ref
    - [x] shallowRef
    - [x] unref
    - [x] proxyRefs
    - [x] toRef
    - [x] toRefs
    - [x] effect
    - [x] ReactiveEffect
    - [x] computed
- runtime-core
    - [x] KeepAlive组件
    - [x] Teleport组件
    - [x] defineAsyncComponent
    - [x] defineComponent
    - [x] createAppAPI
    - [x] onBeforeMount
    - [x] onMounted
    - [x] onBeforeUpdate
    - [x] onUpdated
    - [x] onBeforeUnmount
    - [x] onUnmounted
    - [x] watch
    - [x] patch
    - [x] emit
    - [x] slots
    - [x] h
    - [x] scheduler调度器
    - [x] createVNode
    - [x] createRenderer
- runtime-dom
    - [x] createApp
    - [x] createSSRApp
    - [x] Transition 组件
    - [x] ensureRenderer
    - [x] ensureHydrationRenderer
    - [x] render
    - [x] hydrate
 - compiler-core
    - [x] baseParse
    - [x] baseCompile
    - [x] codegen
    - [x] transform
    - [x] transformElement
    - [x] transformText
    - [x] transformExpression
    - [x] transformBind
    - [x] transformOn
    - [ ] transformIf
    - [ ] transformFor
- compiler-dom
    - [x] parse
    - [x] compile
- template-explorer
    - [x] 支持编译生成render函数代码预览
- shared
    - [x] 基本的通用工具函数和枚举
- vue 
    - [x] compile 返回一个render函数
    - [x] 全局统一导出miniVue3供外部使用，目前只支持global引入和esModule方式引入
- server-renderer
    - [x] renderToString
    - [x] renderVNode
- compiler-sfc
    - [ ] 未完成
#### 使用说明

1. 安装依赖

```
  yarn install
```

2. 打包

- 打包全部模块
  ```
    yarn build
  ```
- 打包单个模块
  ```
    yarn dev -m 模块名
  ```

3. 使用
   将打包好的模块中的 dist 目录下的`xxxx.global.js` 引用到 html 中

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>编译测试 全局引入Global</title>
</head>

<style>
  .test {
    color: red;
    font-size: large;
  }
</style>

<body>
  <div id="app1"></div>
  <div id="app2"></div>
  <div id="app3"></div>
  <script src="../dist/vue.global.js"></script>
  <script type="text/x-template" id="name1">
    <div @Click="change" class="test">{{counter}}方式1</div>
  </script>



  <script type="text/x-template" id="name2">
    <div @Click="change" class="test">{{counter}} 方式2</div>
  </script>


  <script>
    const { compile, createApp, ref } = MiniVue3
  </script>

  <!-- 方式1 -->
  <script>
    const render = compile('#name1') //外部直接创建 需要将全局模式
    const App = {
      setup() {
        const counter = ref(1)
        return {
          counter,
          change: () => {
            counter.value++
          }
        }
      },
      render() {
        return render(this) //这里绑定
      }
    }
    createApp(App).mount('#app1')

  </script>


  <!-- 方式2 -->
  <script>
    const App2 = {
      template: '#name2',
      setup() {
        const counter = ref(1)
        return {
          counter,
          change: () => {
            counter.value++
          }
        }
      }
    }
    createApp(App2).mount('#app2')

  </script>


  <!-- 方式3 -->
  <script>
    const App3 = {
      template: '<div @click="change"> {{counter}}方式三 </div>',
      setup() {
        const counter = ref(1)
        return {
          counter,
          change: () => {
            counter.value++
          }
        }
      }
    }
    createApp(App3).mount('#app3')

  </script>
</body>

</html>
```

#### 参与贡献

1.  Fork 本仓库
2.  新建 Feat_xxx 分支
3.  提交代码
4.  新建 Pull Request
