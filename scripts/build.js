//打包所有

const fs = require('fs')


const execa = require('execa') //开启子进程进行打包，最终还是使用rollup打包

//找到packages文件夹的所有文件夹
const dirs = fs.readdirSync('packages').filter(dir => {
  if (!fs.statSync(`packages/${dir}`).isDirectory()) {
    return false
  }
  return true
})



async function build(target) {
  //'rollup'(执行rollup命令进行打包), ['-c'(采用某个配置文件), '--environment'（采用环境变量的形式设置）,`TARGET:${target}` (需要打包的目标)
  await execa('rollup', ['-c', '--environment', `TARGET:${target}`], {
    stdio: 'inherit' //将子进程的打包信息共享给父进程
  })
}


function runParallel(targets, iteratorFun) {

  const res = []
  for (const item of targets) {
    const p = iteratorFun(item)
    res.push(p)
  }
  return Promise.all(res)
}


runParallel(dirs, build)