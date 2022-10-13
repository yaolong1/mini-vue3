//开发模式直接用esbuild打包，速度快，生成模式采用rollup

const minimist = require('minimist'); //命令工具
const {
  resolve
} = require('path');
const {
  build
} = require('esbuild');
//获取执行命令的参数
const args = minimist(process.argv.slice(2)); //前两个是执行的命令 node script/dev.js
console.log('参数',args);
const target = args._[0] || 'reactivity'; //默认打包reactivity
const format = args['f'] || 'global'; //默认打包reactivity

const pkg = require(resolve(__dirname, `../packages/${target}/package.json`));
const options = pkg.buildOptions; //package.json中的自定义的配置

const outputConfig = {
  'esm': {
    file: resolve(__dirname, `../packages/${target}/dist/${target}.esm-bundler.js`), //打包输出
    format: 'es'
  },
  'cjs': {
    file: resolve(__dirname, `../packages/${target}/dist/${target}.cjs.js`),
    format: 'cjs'
  },
  'global': {
    file: resolve(__dirname, `../packages/${target}/dist/${target}.global.js`),
    format: 'iife' //立即执行函数
  }
}

const outputFormat = outputConfig[format].format;
const outfile = outputConfig[format].file;
console.log('当前打包模块:', target);



//esbuild打包
build({
  entryPoints: [resolve(__dirname, `../packages/${target}/src/index.ts`)], //打包入口
  outfile,
  bundle: true, //是否全部打包到一起
  sourcemap: true,
  format: outputFormat,
  globalName: options.name,
  platform: outputFormat === 'cjs' ? 'node' : 'browser',
  watch: {
    onRebuild(error) {
      if (!error) console.log('rebuild....', target)
    }
  }
}).then(res => {
  console.log('watching....', target)
});