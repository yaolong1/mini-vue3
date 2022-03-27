import * as m from 'monaco-editor'
import { compile, CompilerOptions } from '@mini-vue3/compiler-dom'
import { toRaw, effect } from '@mini-vue3/runtime-dom'
import { SourceMapConsumer } from 'source-map'
import theme from './theme'
import {
  defaultOptions,
  compilerOptions,
  initOptions,
} from './options'
declare global {
  interface Window {
    monaco: typeof m
    _deps: any
    init: () => void
  }
}

interface PersistedState {
  src: string
  ssr: boolean
  options: CompilerOptions
}

const sharedEditorOptions: m.editor.IStandaloneEditorConstructionOptions = {
  fontSize: 14,
  scrollBeyondLastLine: false,
  renderWhitespace: 'selection',
  minimap: {
    enabled: false
  }
}

window.init = () => {
  const monaco = window.monaco

  monaco.editor.defineTheme('my-theme', theme)
  monaco.editor.setTheme('my-theme')

  let persistedState: PersistedState | undefined

  try {
    let hash = window.location.hash.slice(1)
    try {
      hash = escape(atob(hash))
    } catch (e) { }
    persistedState = JSON.parse(
      decodeURIComponent(hash) || localStorage.getItem('state') || `{}`
    )
  } catch (e: any) {
    // bad stored state, clear it
    console.warn(
      'Persisted state in localStorage seems to be corrupted, please reload.\n' +
      e.message
    )
    localStorage.clear()
  }

  let lastSuccessfulCode: string
  let lastSuccessfulMap: SourceMapConsumer | undefined = undefined
  function compileCode(source: string): string {
    console.clear()
    try {
      const errors = []
      const compileFn = compile
      const start = performance.now()
      const { code, ast } = compileFn(source, {
        ...compilerOptions,
      })
      console.log(`Compiled in ${(performance.now() - start).toFixed(2)}ms.`)
      console.log(`AST: `, ast)
      console.log(`CODE: `, code)
      lastSuccessfulCode = code + `\n// Check the console for the AST`
    } catch (e: any) {
      console.error(e)
      lastSuccessfulCode = `/* ERROR: ${e.message} (see console for more info) */`
    }
    return lastSuccessfulCode
  }



  function reCompile() {
    const src = editor.getValue()
    // every time we re-compile, persist current state

    const optionsToSave = {}
    let key: keyof CompilerOptions
    for (key in compilerOptions) {
      const val = compilerOptions[key]
      if (typeof val !== 'object' && val !== defaultOptions[key]) {
        // @ts-ignore
        optionsToSave[key] = val
      }
    }


    const state = JSON.stringify({
      src,
      options: optionsToSave
    } as PersistedState)
    localStorage.setItem('state', state)
    window.location.hash = btoa(unescape(encodeURIComponent(state)))
    const res = compileCode(src)
    if (res) {
      output.setValue(res)
    }
  }

  const editor = monaco.editor.create(document.getElementById('source')!, {
    value: persistedState?.src || `<div>Hello World!</div>`,
    language: 'html',
    ...sharedEditorOptions,
    wordWrap: 'bounded'
  })

  editor.getModel()!.updateOptions({
    tabSize: 2
  })

  const output = monaco.editor.create(document.getElementById('output')!, {
    value: '',
    language: 'javascript',
    readOnly: true,
    ...sharedEditorOptions
  })
  output.getModel()!.updateOptions({
    tabSize: 2
  })

  // handle resize
  window.addEventListener('resize', () => {
    editor.layout()
    output.layout()
  })

  // update compile output when input changes
  editor.onDidChangeModelContent(debounce(reCompile))

  // highlight output code
  let prevOutputDecos: string[] = []
  function clearOutputDecos() {
    prevOutputDecos = output.deltaDecorations(prevOutputDecos, [])
  }

  editor.onDidChangeCursorPosition(
    debounce(e => {
      clearEditorDecos()
      if (lastSuccessfulMap) {
        const pos = lastSuccessfulMap.generatedPositionFor({
          source: 'ExampleTemplate.vue',
          line: e.position.lineNumber,
          column: e.position.column - 1
        })
        if (pos.line != null && pos.column != null) {
          prevOutputDecos = output.deltaDecorations(prevOutputDecos, [
            {
              range: new monaco.Range(
                pos.line,
                pos.column + 1,
                pos.line,
                pos.lastColumn ? pos.lastColumn + 2 : pos.column + 2
              ),
              options: {
                inlineClassName: `highlight`
              }
            }
          ])
          output.revealPositionInCenter({
            lineNumber: pos.line,
            column: pos.column + 1
          })
        } else {
          clearOutputDecos()
        }
      }
    }, 100)
  )

  let previousEditorDecos: string[] = []
  function clearEditorDecos() {
    previousEditorDecos = editor.deltaDecorations(previousEditorDecos, [])
  }

  output.onDidChangeCursorPosition(
    debounce(e => {
      clearOutputDecos()
      if (lastSuccessfulMap) {
        const pos = lastSuccessfulMap.originalPositionFor({
          line: e.position.lineNumber,
          column: e.position.column - 1
        })
        if (
          pos.line != null &&
          pos.column != null &&
          !(
            // ignore mock location
            (pos.line === 1 && pos.column === 0)
          )
        ) {
          const translatedPos = {
            column: pos.column + 1,
            lineNumber: pos.line
          }
          previousEditorDecos = editor.deltaDecorations(previousEditorDecos, [
            {
              range: new monaco.Range(
                pos.line,
                pos.column + 1,
                pos.line,
                pos.column + 1
              ),
              options: {
                isWholeLine: true,
                className: `highlight`
              }
            }
          ])
          editor.revealPositionInCenter(translatedPos)
        } else {
          clearEditorDecos()
        }
      }
    }, 100)
  )
  initOptions()
  effect(reCompile)
}

function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): T {
  let prevTimer: number | null = null
  return ((...args: any[]) => {
    if (prevTimer) {
      clearTimeout(prevTimer)
    }
    prevTimer = window.setTimeout(() => {
      fn(...args)
      prevTimer = null
    }, delay)
  }) as any
}
