import { CompilerOptions } from "@mini-vue3/compiler-dom";
import { createApp, h, reactive } from "@mini-vue3/runtime-dom";

export const defaultOptions: CompilerOptions = {
  mode: 'module',
  whitespace: 'preserve',
  prefixIdentifiers: false,
}

export const compilerOptions: CompilerOptions = reactive(
  Object.assign({}, defaultOptions)
)

const App = {
  setup() {
    return () => {
      const isModule = compilerOptions.mode === 'module'
      const usePrefix =
        compilerOptions.prefixIdentifiers || compilerOptions.mode === 'module'

      return [
        h('h1', `MiniVue 3 Template Explorer`),

        h('div', { id: 'options-wrapper' }, [
          h('div', { id: 'options-label' }, 'Options ↘'),
          h('ul', { id: 'options' }, [
            // mode selection
            h('li', { id: 'mode' }, [
              h('span', { class: 'label' }, 'Mode: '),
              h('input', {
                type: 'radio',
                id: 'mode-module',
                name: 'mode',
                checked: isModule,
                onChange() {
                  compilerOptions.mode = 'module'
                }
              }),
              h('label', { for: 'mode-module' }, 'module'),
              ' ',
              h('input', {
                type: 'radio',
                id: 'mode-function',
                name: 'mode',
                checked: !isModule,
                onChange() {
                  compilerOptions.mode = 'function'
                }
              }),
              h('label', { for: 'mode-function' }, 'function')
            ]),
            // whitespace handling
            h('li', { id: 'whitespace' }, [
            h('span', { class: 'label' }, 'whitespace: '),
            h('input', {
              type: 'radio',
              id: 'whitespace-condense',
              name: 'whitespace',
              checked: compilerOptions.whitespace === 'condense',
              onChange() {
                compilerOptions.whitespace = 'condense'
              }
            }),
            h('label', { for: 'whitespace-condense' }, 'condense'),
            ' ',
            h('input', {
              type: 'radio',
              id: 'whitespace-preserve',
              name: 'whitespace',
              checked: compilerOptions.whitespace === 'preserve',
              onChange() {
                compilerOptions.whitespace = 'preserve'
              }
            }),
            h('label', { for: 'whitespace-preserve' }, 'preserve')
            ]),

            // toggle prefixIdentifiers
            h('li', [
              h('input', {
                type: 'checkbox',
                id: 'prefix',
                disabled: isModule,
                checked: usePrefix,
                onChange(e: Event) {
                  compilerOptions.prefixIdentifiers =
                    (e.target as HTMLInputElement).checked || isModule
                }
              }),
              h('label', { for: 'prefix' }, 'prefixIdentifiers')
            ]),

          ])
        ])
      ]
    }
  }
}

export function initOptions() {
  createApp(App).mount(document.getElementById('header')!)
}
