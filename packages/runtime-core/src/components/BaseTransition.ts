import { RendererElement } from './../renderer';

export interface TransitionHooks<HostElement = RendererElement> {
  beforeEnter(el: HostElement): void
  enter(el: HostElement): void
  leave(el: HostElement, remove: () => void): void
}

export interface TransitionProps<HostElement = RendererElement> {
  mode: 'in-out' | 'out-in' | 'default'
  onBeforeEnter?: (el: HostElement) => void
  onEnter?: (el: HostElement, done: () => void) => void
  onAfterEnter?: (el: HostElement) => void
  // leave
  onBeforeLeave?: (el: HostElement) => void
  onLeave?: (el: HostElement, done: () => void) => void

}

//TODO 暂未实现通用的Transition