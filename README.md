# mini-vue3

#### 声明

源码中的注释都是凭自己对 vue 的理解所写的，如有注释错误或者语义不清晰，希望大家提交中文注释的pr。

#### 介绍

迷你版 vue3 (带详细注释),采用和vue3源码相同的monorepo前端项目管理，源码结构、函数名和vue3基本一致

- 已实现：
  - ① reactivity: 响应式 APi computed ref toRefs toRef reactive effect readonly shallowReadonly shallowReactive
  - ② runtime-dom: createApp Transition render hydrate createSSRApp
  - ③ runtime-core: createRender (包含 diff 算法) watch KeepAlive Teleport AsyncComponent Emit slots scheduler 组件生命周期
  - ④ compiler-dom: parse compile
  - ⑤ template-explorer: 模板浏览器，可用于查看html模板生成的render函数
  - ⑥ compiler-core baseParse baseCompile vBind vOn transformElement transformText transformExpression
  - ⑦ vue 全局模块，统一导出miniVue3供外部使用 支持global引入和esModule方式引入
  - ① server-renderer 服务端渲染 renderVNode renderToString
- 未实现
  - ② compiler-sfc 单文件组件
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
