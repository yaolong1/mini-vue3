export const nodeOps = {
  //把child节点插入parent中anchor节点之前,anchor=null时相当于 parent.appendChild(child)
  //例子
  /**
   * 元素 [a,b,c,d,e]
   * 
   * insert(a,父级元素,e)
   * 插入后的元素 [b,c,d,a,e]
   * 
   *  insert(a,父级元素)
   *  插入后的元素 [b,c,d,a]
   * 
   *  insert(h,父级元素)
   *  插入后的元素 [a,b,c,d,e,h]
   */
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
  createComment: (text) => {
    return document.createComment(text)
  },
  createText: (text) => {
    return document.createTextNode(text)
  },
  //设置节点的内容
  setText: (node, text) => { node.nodeValue = text },
  //获取父节点
  parentNode: (node) => node.parentNode,
  //获取下一个兄弟节点
  nextSibling: (node) => node.nextSibling,
  //容器的第一个节点
  firstChild: (container) => container.firstChild,
  //元素选择器
  querySelector: (selector) => document.querySelector(selector)
}