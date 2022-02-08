//打包单个模块

const fs = require('fs')


const execa = require('execa') //开启子进程进行打包，最终还是使用rollup打包


const target = 'reactivity'

if (fs.statSync(`packages/${target}`).isDirectory()) {
  build(target)
}


async function build(target) {
  //'rollup'(执行rollup命令进行打包), ['-c'(c采用某个配置文件 w监听改变时动态打包), '--environment'（采用环境变量的形式设置）,`TARGET:${target}` (需要打包的目标)
  await execa('rollup', ['-cw', '--environment', `TARGET:${target}`], {
    stdio: 'inherit' //将子进程的打包信息共享给父进程
  })
}