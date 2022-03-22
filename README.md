# mini-vue3

#### 声明

源码中的注释都是凭自己对 vue 的理解所写的，如有注释错误或者语义不清晰，希望大家提交中文注释的pr。

#### 介绍

迷你版 vue3 (带详细注释),采用和vue3源码相同的monorepo前端项目管理，源码结构、函数名和vue3基本一致

- 已实现：
  - ① reactivity: 响应式 APi computed ref toRefs toRef reactive effect readonly shallowReadonly shallowReactive
  - ② runtime-dom: createApp
  - ③ runtime-core: createRender (包含 diff 算法)
  - ④ compiler-dom: parse compile
  - ⑤ template-explorer: 模板浏览器，可用于查看html模板生成的render函数，（由于compiler-core没完全实现，现在只是一个界面）
- 未实现:
  - ① compiler-core baseParse(已实现) baseCompile（未实现）

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
    yarn dev -f 模块名
  ```

3. 使用
   将打包好的模块中的 dist 目录下的`xxxx.global.js` 引用到 html 中

```html
<body>
  <div id="app"></div>
  <script src="../dist/runtime-dom.global.js"></script>
  <script>
    const { createApp, h, reactive, toRefs, ref } = MiniVue3RuntimeDOM;

    function useCounter() {
      const data = reactive({ counter: 1 });
      const add = () => {
        data.counter++;
        console.log('xxx');
      };
      return { add, ...toRefs(data) };
    }

    const APP = {
      props: {
        title: {
          type: String,
        },
      },
      setup(props, ctx) {
        const { add, counter } = useCounter();
        const flag = ref(true);

        setTimeout(() => {
          flag.value = !flag.value;
        }, 2000);
        return {
          add,
          counter,
          flag,
        };
      },
      render(proxy) {
        const children1 = [
          h('li', { key: 'a' }, 'a'),
          h('li', { key: 'b' }, 'b'),
          h('li', { key: 'c' }, 'c'),
          h('li', { key: 'd' }, 'd'),
          h('li', { key: 'e' }, 'e'),
          h('li', { key: 'j' }, 'J'),
          h('li', { key: 'f' }, 'f'),
          h('li', { key: 'g' }, 'g'),
        ];

        const children2 = [
          h('li', { key: 'a' }, 'a'),
          h('li', { key: 'b' }, 'b'),
          h('li', { key: 'e' }, 'e'),
          h('li', { key: 'c' }, 'c'),
          h('li', { key: 'd' }, 'd'),
          h('li', { key: 'h' }, 'h'),
          h('li', { key: 'f' }, 'f'),
          h('li', { key: 'g' }, 'g'),
        ];
        const oldNode = h('h1', {}, children1);
        const newNode = h('h1', {}, children2);

        let vnode = this.flag.value ? oldNode : newNode;

        return vnode;
      },
    };
    const app = createApp(APP, { title: 'test', a: '10' });
    app.mount('#app');
  </script>
</body>
```

#### 参与贡献

1.  Fork 本仓库
2.  新建 Feat_xxx 分支
3.  提交代码
4.  新建 Pull Request
