//打包单个模块

const fs = require('fs')
const execa = require('execa') //开启子进程进行打包，最终还是使用rollup打包
const minimist = require('minimist') //命令工具

//获取执行命令的参数
const args = minimist(process.argv.slice(2)) //前两个是执行的命令 node script/dev.js
const target = args['m'] ? args['m'] : 'reactivity' //默认打包reactivity

console.log('当前打包模块:', target)

if (fs.statSync(`packages/${target}`).isDirectory()) {
  build(target)
}


async function build(target) {
  //'rollup'(执行rollup命令进行打包), ['-c'(c采用某个配置文件 w监听改变时动态打包), '--environment'（采用环境变量的形式设置）,`TARGET:${target}` (需要打包的目标)
  await execa('rollup', ['-cw', '--environment', `TARGET:${target}`], {
    stdio: 'inherit' //将子进程的打包信息共享给父进程
  })
}