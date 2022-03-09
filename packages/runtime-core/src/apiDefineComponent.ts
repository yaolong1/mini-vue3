import { isFunction } from '@mini-vue3/shared';
export function defineComponent(options: unknown) {
  return isFunction(options) ? { setup: options, name: options.name } : options
}