# Loop State — rss-reader

Last run: 2026-07-26T00:07:00Z (daily-triage, L1 report-only, no auto-fix — week one)

## High Priority (loop is acting or waiting on human)

- **feed-list 系テストの型不整合、build を壊す可能性**
  `src/components/feed-list.test.tsx` と `src/app/api/feeds/route.test.ts` のモックデータが `FeedListItem`(`unreadCount`, `lastPublishedAt` が必須)の形を満たしていない(`tsc --noEmit` で TS2322 エラー)。`next.config.ts` に `ignoreBuildErrors`/`ignoreDuringBuilds` の設定はなく、`npm run build` (`prisma generate && next build --webpack`) はデフォルトで型・lintエラーを致命傷として扱うため、このままだと `docker-build-push.yml`(main への push で発火)が失敗する可能性がある。
  次のアクション: 2つのテストファイルのモックに `unreadCount`, `lastPublishedAt` を追加する最小修正。着手前に直近の GitHub Actions 実行結果を確認(本サンドボックスに `gh` 未導入のため未確認)。
  見積もり: 15〜30分。

- **react-hooks lint エラー(ESLint error 扱い、build 阻害の可能性)**
  `src/features/entry-viewing/components/entry-card-grid.tsx`(2箇所: `react-hooks/set-state-in-effect`, `react-hooks/refs` ×2)、`entry-filter-bar.tsx`(`react-hooks/set-state-in-effect`)、`src/hooks/use-hotkey-config.ts`(同)で計6件のerror。warningではなくerrorのため、上と同じ理由でbuildを止めうる。
  次のアクション: setStateをエフェクト外(イベントハンドラ/派生値)に移動、refアクセスをrender外に移動。
  見積もり: 2〜3時間(4ファイル)。

*(week one方針により、上記2件は自動修正せず記録のみ。着手はご判断ください)*

## Watch List

- ローカル環境で `src/generated/prisma`(gitignore対象)が未生成だと `tsc`/lintが大量の派生エラーを出す(今回 `prisma generate` 実行で解消を確認済み)。実際のDocker buildでは`build`スクリプトが常に`prisma generate`を先に実行するため実害なしと判断。開発オンボーディング手順に明記されているか要確認。
- プロジェクト全体の `tsc --noEmit` が本サンドボックス上でメモリ不足(OOM)になり完走しない(`--max-old-space-size=4096` でも失敗)。CI側で型チェックが独立ジョブとして走っているか、またはリソース制約が同様に問題になっていないか要確認。
- `vitest run` が90秒以内に完了せず、`.env.test` もリポジトリに存在しない(意図的にgitignore対象)。この環境単体ではテスト実行可否を検証できなかった。
- `src/features/feed-management/lib/rss-fetcher.ts`: `any`型1件 + 不要な`eslint-disable`コメント1件(低優先度)。
- `src/features/feed-management/components/feed-list.tsx`: `<img>`使用によるLCP低下警告(`next/image`への置き換え検討、低優先度)。
- `.kiro/specs/*` は全specが `tasks-generated`(承認済み)のまま、今回の期間で進捗変化なし。

## Recent Noise (ignored this run)

- `tsc --noEmit`(prisma generate前)で出た大量の "Cannot find module '@/generated/prisma/client'" 派生エラー(`EntryDetail`, `feed-service.ts`, `entry-sync-service.ts`, `db.ts`等の暗黙any) — サンドボックスで`prisma generate`未実行だったことによる誤検知と確認済み(Prismaスキーマ上は該当フィールドはすべて実在)。
- GitHub PR/Issueの直接確認 — 本サンドボックスに`gh` CLI未導入のため実施不可(次回以降も同様の制約が続く見込み)。

## Post-Run Critique (from last run)
- High-noise: dependabot PRsが再度表示された — ignore listに追加する
- False positives: CI flake 1件(既知のflakyテスト)
- Deprioritize: lint警告はWatch Listへ降格
- Friction: triageがnightly deploy失敗を見逃した(infra起因、コードではない)
- Adjustment: infra check statusをスキャン対象に含める

## Post-Run Critique (from this run)
- Friction: `gh` CLI がサンドボックスに無く、PR/Issue/CI実行結果を直接確認できなかった — 次回セットアップ時に導入を検討、または人間に直近のCI結果確認を依頼する運用にする。
- Friction: `tsc --noEmit`が本サンドボックスでOOMし、型チェックの完全な実行結果を得られなかった — 部分実行(prisma generate前後の差分比較)で代替した。
- Adjustment: 次回以降のtriageは「`prisma generate`実行 → lint/tsc実行」の順で行うと誤検知を減らせる(今回学習済み)。

---
Run log: see loop-run-log.md (run 2026-07-26T00:07:00Z)
