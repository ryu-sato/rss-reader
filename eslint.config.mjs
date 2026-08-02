import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // .claude/worktrees/ や .foundry/sessions/ にはリポジトリの複製が git worktree
    // として置かれるため、除外しないと同じソースが二重に lint 対象になる
    // (vitest.config.ts の exclude と同じ理由)
    ".claude/**",
    ".foundry/**",
    // serwist が `next build`/`next dev` 時に生成する Service Worker バンドル
    // (.gitignore 対象、ソースではないので lint 不要)
    "public/sw.js",
    "public/sw.js.map",
  ]),
  {
    // Dockerコンテナ内で `node entrypoint.js` として直接実行されるCommonJSブートストラップ
    // スクリプトのため、require() を許可する。
    files: ["entrypoint.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
