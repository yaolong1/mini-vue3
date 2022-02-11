export const isObject = (value) => typeof value === 'object' && value !== null

//继承对象
export const extend = Object.assign
export const isArray = (value) => Array.isArray(value)
export const isIntegerKey = (key) => parseInt(key) + "" === key

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (target, key) => hasOwnProperty.call(target, key)

export const hasChanged = (newValue, oldValue) => oldValue !== newValue

export const isFunction = (value) => typeof value === 'function'