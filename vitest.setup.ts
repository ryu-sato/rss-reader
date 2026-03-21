import '@testing-library/jest-dom'
import { beforeEach } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';

beforeEach(async() => {
  // DBをリセットしてからテストを実行
  const prismaBin = path.join(process.cwd(), 'node_modules', '.bin', 'prisma');
  await new Promise((res, rej) => {
    const process = spawn(
      prismaBin,
      ['migrate', 'reset', '--force'],
      {
          stdio: 'ignore',
      }
    );
    process.on('exit', (code) => (code === 0 ? res(0) : rej(code)));
  })
})