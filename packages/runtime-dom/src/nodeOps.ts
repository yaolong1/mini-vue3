export const nodeOps = {
  //把child节点插入parent中anchor节点之前,anchor=null时相当于 parent.appendChild(child)
  insert: (child, parent, anchor = null) => {
    parent.insertBefore(child, anchor)
  },
  //删除child
  remove: (child) => {
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  },
  createElement: (tag) => {
    return document.createElement(tag)
  },
  //设置元素的文本 <div>元素的文本<div>
  setElementText: (el, text) => { el.textContent = text },
  createText: (text) => {
    return document.createTextNode(text)
  },
  //设置节点的内容
  setText: (node, text) => { node.nodeValue = text },
  //获取父节点
  parentNode: (node) => node.parentNode,
  //获取下一个兄弟节点
  nextSibling: (node) => node.nextSibling,
  //元素选择器
  querySelector: (selector) => document.querySelector(selector)
}