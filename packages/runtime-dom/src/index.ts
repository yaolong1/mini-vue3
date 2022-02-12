// 主要是一些与浏览器平台相关的代码（dom操作Api,属性操作的Api --->传入runtime-core），依赖runtime-core


import { extend } from '@mini-vue3/shared';
// 渲染页面需要操作节点的代码
import { nodeOps } from './nodeOps';
import { patchProp } from './patchProp';



const renderOptions = extend(nodeOps, { patchProp }) //浏览器平台渲染包含的所有api

console.log(renderOptions)

export * from '@mini-vue3/runtime-core'