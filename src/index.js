const debug = require('debug')('wait-umi');
const fetch = require('node-fetch');
const execa = require('execa')
const psTree = require('ps-tree')
const utils = require('./utils')

const args = process.argv.slice(2);
debug('parsing CLI arguments: %o', args)

const parsed = utils.getArguments(args)
debug('parsed args: %o', parsed)

const TIMEOUT = process.env.WAIT_UMI_TIMEOUT || 3 * 60 * 1000; // 3 minute
const INTERVAL = process.env.WAIT_UMI_INTERVAL || 1000; // 1 second

const { url, start } = parsed;

/**
 * ref: https://github.com/search?q=repo%3Aumijs%2Fumi+__umi%2Fapi%2Fbundle-status&type=code
 */
const realUrl = `${url}/__umi/api/bundle-status`;
debug('checking url %s', realUrl)

debug('starting server with command %s', start)
const server = execa(start, {
  shell: true,
  stdio: ['ignore', 'inherit', 'inherit']
});

let serverStopped;

function stopServer() {
  debug('getting child processes')
  if (!serverStopped) {
    serverStopped = true
    return new Promise((resolve, reject) => {
      psTree(server.pid, (err, children) => {
        if (err) {
          return reject(err)
        }

        debug('stopping child processes')
        children.forEach(child => {
          try {
            process.kill(child.PID, 'SIGINT')
          } catch (e) {
            if (e.code === 'ESRCH') {
              console.log(
                `Child process ${child.PID} exited before trying to stop it`
              )
            } else {
              return reject(e)
            }
          }
        })

        debug('stopping server')
        server.kill()
        resolve()
      });
    })
  }
}
const startTime = Date.now();


/**
 * 轮询检查 Umi 是否已经启动
 */
function check() {
  return fetch(realUrl)
    .then(res => res.json())
    .then(data => {
      /**
       * ref: https://github.com/search?q=repo%3Aumijs%2Fumi+__umi%2Fapi%2Fbundle-status&type=code
       */
      if (
        typeof data === 'object' &&
        data.bundleStatus?.done &&
        (!data.mfsuBundleStatus || data.mfsuBundleStatus.done)
      ) {
        return true
      }
      return false
    })
    .catch(err => {
      return false
    })
}

function wait() {
  return new Promise((resolve, reject) => {
    const onClose = () => {
      reject(new Error('server closed unexpectedly'))
    }

    server.on('close', onClose);

    check()
      .then(ready => {
        if (ready) {
          return resolve();
        }
        if (Date.now() - startTime > TIMEOUT) {
          console.error('Umi server did not start in time')
          return stopServer();
        }

        debug('Umi server is not ready yet, waiting...')
        setTimeout(() => {
          wait().then(resolve).catch(reject)
        }, INTERVAL)
      })
      .catch(reject);
  })
}

wait()
  .then(() => {
    debug('Umi server is ready');
    console.log('Umi server is ready');

    process.exit(0)
  })
  .catch(err => {
    console.error(err);
    process.exit(1)
  })
  .finally(() => {
    server.removeListener('close', onClose);
  });

// 监听进程退出
process.on('SIGINT', () => {
  stopServer();
});
