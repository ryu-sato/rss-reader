import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    maxWorkers: 1,
    setupFiles: ['./vitest.setup.ts'],
    // .claude/worktrees/ には git worktree としてリポジトリの複製が置かれるため、
    // 除外しないと同じテストが二重に収集され、複製側は生成物 (src/generated) を
    // 持たないので必ず失敗する
    exclude: ['**/node_modules/**', '**/.foundry/**', '**/.claude/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
