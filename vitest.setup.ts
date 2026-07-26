import '@testing-library/jest-dom'
import { beforeAll } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';

beforeAll(async() => {
  // テストスイート全体の実行前に一度だけDBをリセットする
  // (以前は beforeEach で毎テストごとに実行しており、テスト件数分の
  //  CLIプロセス起動 + マイグレーション再適用が発生し非常に重かった)
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