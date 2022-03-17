//compiler-core 主要逻辑
//1、html模板字符串 =====>  templateAST(模板抽象语法树) parse.ts
//2、templateAST =====>  javaScriptAST(js抽象语法树)
//3、javaScriptAST =====>  renderFunction(渲染函数)


export * from './parse'
export * from './ast'

