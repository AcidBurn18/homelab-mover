import { spawn } from 'node:child_process';

const children = [];

function start(name, command, args, env = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...env,
    },
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      process.exitCode = code;
    }
  });

  children.push(child);
  return child;
}

start('server', process.execPath, ['server/index.mjs'], { PORT: '3001' });
start('client', process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev:client']);

function shutdown(signal) {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
  process.exit(0);
});
