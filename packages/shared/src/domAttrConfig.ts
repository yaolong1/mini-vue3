

//如果值为true或者值'' 表示包含布尔属性
// <button disabled/> 会编译成 {disabled:''}  
export function includeBooleanAttr(value) {
  return !!value || value === ''

}