# TypeScript 型チェックのメモリ高騰 — 調査記録と対策

調査日: 2026-08-02
対象: devcontainer 上で `tsc --noEmit` を実行するとメモリが高騰し、ホストごと応答不能になる問題

## 結論（先に要点）

**原因は 1 行の型推論だった。** テストコードの
`vi.mocked(prisma.<モデル>).<メソッド>.mockResolvedValue(...)` というパターンが、
Prisma 7 の生成型を完全展開させ、**1 行あたり約 238 万件の型インスタンス化**を発生させていた。
プロジェクト全体では 5 ファイル 12 箇所にこのパターンがあり、
型チェックを最後まで走らせると **7.2 GB** を消費する（tsgo での実測値。
tsc は 2 GB ヒープに達した時点で OOM するため完走できず、必要量を測れない）。

スワップ 0 の WSL2 (総メモリ 9.5 GB) でこれが起きると、
OOM killer が働く前にページ回収のスラッシングでホストが応答不能になる。
これが「OS を再起動するしかない」状態の正体である。

修正後は **807 MB / 7.9 秒**で完走する。

## 実測データ

計測は使い捨てコンテナ (cgroup でメモリ上限を固定) およびホスト上の
`node --max-old-space-size=<上限>` で行い、`--extendedDiagnostics` の
`Instantiations` を指標とした。

### 1. プロジェクト全体

| 構成 | メモリ | 時間 | 結果 |
|---|---|---|---|
| **修正前** tsc (V8 ヒープ 1 GB) | 1120 MB | 34 秒 | **OOM** |
| **修正前** tsc (V8 ヒープ 2 GB) | 2194 MB | 93 秒 | **OOM** |
| **修正前** tsgo (Go 実装) | **7217 MB** | 153 秒 | 完走 |
| **修正後** tsc (V8 ヒープ 2 GB) | **807 MB** | **7.9 秒** | 完走 |
| **修正後** tsgo | **687 MB** | **2.0 秒** | 完走 |

修正後は tsc / tsgo とも同一の既存型エラー 3 件を報告する
（`effectedDate` 欠落。今回の問題とは無関係の別課題）。

### 2. 原因の切り分け（`src/lib` 配下をファイル単位で計測）

| ファイル | Types | Instantiations | メモリ |
|---|---|---|---|
| **feed-service.test.ts** | **2,738,317** | **11,235,726** | **1624 MB** |
| cron.ts | 25,991 | 86,324 | 369 MB |
| entry-service.ts | 25,722 | 86,145 | 371 MB |
| tag-service.ts | 13,841 | 46,005 | 332 MB |
| auth-client.ts | 10,945 | 53,376 | 396 MB |
| auth.ts | 4,737 | 7,940 | 400 MB |
| db.ts (Prisma) | 2,872 | 3,729 | 330 MB |
| その他 17 ファイル | いずれも 1 万件未満 | | 250〜340 MB |

`feed-service.test.ts` だけが他ファイルの **3 桁上**。

### 3. 原因行の特定（最小プローブによる検証）

| プローブ内容 | Instantiations | メモリ |
|---|---|---|
| `prisma.feed` を参照するだけ | 3,732 | 331 MB |
| `vi.mocked(prisma.feed)` | 5,616 | 324 MB |
| `vi.mocked(prisma.feed.findUnique)` | 4,298 | 344 MB |
| **`vi.mocked(prisma.feed).findUnique.mockResolvedValue(null)`** | **2,387,483** | **850 MB** |

`vi.mocked()` 自体は軽い。**`mockResolvedValue()` を呼んだ瞬間に 425 倍に跳ね上がる。**

理由: `mockResolvedValue(v)` は `Awaited<ReturnType<T>>` を解決するため、
それまで遅延評価されていた Prisma 7 の戻り値型
(`Prisma__FeedClient<GetFindResult<...>>` などの条件型・分配型の入れ子) を
完全に展開せざるを得ない。Prisma のデリゲート型は 1 メソッドあたりの型が巨大なため、
展開結果が爆発する。

### 4. 修正案の効果検証

`mockResolvedValue` を 5 回呼ぶ同等コードで比較:

| 実装 | Instantiations | メモリ | 時間 |
|---|---|---|---|
| 現状 `vi.mocked(prisma.feed)` | 11,221,207 | 1862 MB | 41.3 秒 |
| **`prisma.feed as unknown as Record<string, Mock>`** | **3,807** | **329 MB** | **1.7 秒** |
| `vi.mocked(...)` + 各呼び出しを `as unknown as Mock` | 7,856 | 347 MB | 2.0 秒 |

**約 2,950 分の 1** に削減される。

## 検証の結果、効果が無かった対策

### tsconfig.json の `include` 絞り込み — 効果ゼロ

`include: ["**/*.ts"]` を `src/**` に絞る変更が施されていたが、
`tsc --listFilesOnly` の出力を新旧で比較したところ **`diff` で完全一致（ともに 2366 ファイル）**。
プログラムに入るファイルは 1 つも減っていない。

理由は、tsc の `**` ワイルドカードが**ドットで始まるディレクトリを展開対象から除外する**ため。
`.claude/` `.kiro/` `.foundry/` の中身は、広いグロブでもそもそも拾われていなかった
（`.next/types/**/*.ts` を明示的に列挙する必要があるのも同じ理由）。
なお vitest のグロブにはこの除外がないため、そちらでは複製が拾われていた（後述 F 項）。

原因はファイル数ではなく**型チェックのコスト**である。
その証拠に、プログラム構築のみ (`--listFilesOnly`) なら 441 MB で済む。

### `NODE_OPTIONS=--max-old-space-size=2048` 単独 — 逆効果

修正前の状態では 2 GB ヒープで **OOM することを実測済み**。
この設定だけを入れると、フリーズが「確実に失敗する型チェック」に変わるだけだった。

### tsgo (`@typescript/native-preview`) への切り替え — 単独では解決しない

修正前は tsgo でも **7.2 GB** を消費した（`GOMEMLIMIT` は Go のソフトリミットのため上限として機能しない）。
むしろ tsc が OOM で自死していたのに対し、tsgo は最後まで走り切ろうとする分、
ホストを圧迫する時間が長い。
**修正後**であれば tsgo は 687 MB / 2.0 秒と非常に優秀なので、
コード修正とセットでなら有力な高速化手段になる。

### 型定義の重複 — 該当なし

`@types/react` は pnpm ストアに 19.2.14 と 19.2.18 が並存するが、
プログラムに入るのは 19.2.18 の 7 ファイルのみ。二重ロードは起きていない。

## 対策

### A. 根本対策 — テストのモック型を単純化する（必須）

対象 5 ファイル 12 箇所:

- `src/lib/feed-service.test.ts`
- `src/lib/__tests__/tag-service.test.ts`
- `src/lib/__tests__/entry-service-query.test.ts`
- `src/lib/__tests__/entry-service-save.test.ts`
- `src/__tests__/integration/entry-fetcher.test.ts`

```diff
-import { describe, it, expect, vi, beforeEach } from 'vitest'
+import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

-const mockFeed = vi.mocked(prisma.feed)
-const mockQueryRaw = vi.mocked(prisma.$queryRaw)
+const mockFeed = prisma.feed as unknown as Record<'findUnique' | 'findMany' | 'create' | 'update' | 'delete', Mock>
+const mockQueryRaw = prisma.$queryRaw as unknown as Mock
```

キーは `Record<string, Mock>` でも削減効果は同じ（実測 3,807 件）だが、
それだと `mockFeed.findUnqiue` のような綴り間違いまで型が通ってしまうため、
**実際に使うメソッド名を列挙する**。Prisma の型を参照しないので追加コストはない。
この形での全体型チェックも実測済み（819 MB / 7.4 秒、既存エラー 3 件のみ）。

`vi.mock('@/lib/db', ...)` でモジュール自体を差し替えている以上、
`prisma.feed` の実体は `vi.fn()` の集合であり、Prisma の厳密な型を
モック変数に持たせる意味はない。型安全性の実質的な損失はない。

**今後のルール**: Prisma のデリゲート (`prisma.<モデル>`) を
`vi.mocked()` に通さない。通すのは自前の関数だけにする
（`vi.mocked(getAllFeeds)` のような使い方は軽量で問題ない）。

**テストへの影響を確認済み**: 修正前後で `npm run test:run` を実行し比較した。
`src/` 本体のテストは修正前後とも同じ結果（すべて成功）で、
失敗するのは後述のワークツリー混入分のみ。型のみの変更であり実行時の挙動は変わらない。

### B. 安全網 — devcontainer にメモリ上限を課す（必須）

調査時点で devcontainer には**メモリ制限が一切なかった**
(`HostConfig.Memory = 0`、コンテナ内 `cgroup memory.max = max`)。
このため 1 プロセスが WSL2 の全メモリを奪える状態だった。

`.devcontainer/devcontainer.json`:

```json
"runArgs": ["--memory=7g", "--memory-swap=7g"]
```

これにより、暴走してもコンテナ内プロセスが OOM kill されるだけで、
ホストは生き残り、調査が可能になる。
**反映にはコンテナの Rebuild が必要。**

7g という値は、`next build`（`--max-old-space-size=3072` で約 3.5GB）と
tsserver（上限 2048 で約 2.3GB）、VS Code サーバー（約 0.5GB）が
同時に動くケースを見込んだもの。これより小さくすると、
フリーズの代わりにビルドが OOM kill される事故に変わりうる。

**適用順序に注意**: 先に C（スワップ設定）を入れてから B を入れること。
スワップの余裕がない状態で上限だけを課すと、緩衝材のないまま
プロセスが kill されるようになる。

### C. ホスト側 — WSL2 にスワップを設定する（強く推奨・Windows 側の作業）

調査時点の `C:\Users\ryu\.wslconfig`:

```ini
[wsl2]
processors=3
memory=10485760000
swap=0
```

メモリ上限は設定済みだが、**`swap=0`** である点が問題。
これが「OOM kill されずにフリーズする」直接の理由である。
スワップが無いと、カーネルは回収可能なページキャッシュを延々と再利用しようとして
ライブロックに陥り、OOM killer が犠牲者を選ぶ前にマシンが応答しなくなる。

また `memory=` は **WSL2 VM 全体**の上限であって、コンテナ単位の上限ではない。
VM 内では devcontainer・VS Code サーバー・Claude Code が同じ 9.5GB を奪い合うため、
1 プロセスが 7.2GB を取れば全体が巻き添えになる。B 項のコンテナ上限が必要なのはこのため。

変更するのは swap の行だけでよい:

```ini
swap=4GB
```

適用は PowerShell で `wsl --shutdown` した後、WSL を起動し直す。
数 GB のスワップがあるだけで、同じ暴走が「重いが操作可能」に変わる。

なお A 項のコード修正により型チェックのピークは 819 MB まで下がっているため、
この設定は「次に別の型爆発が起きたときの保険」であり、
今回の問題を直すために必須ではない。

**2026-08-02 時点の方針: `swap=0` は変更しない。** 上記は将来の判断材料として残す。

この方針を採る場合、**B 項のコンテナ上限が唯一の安全網**になる点に注意する。
`memory=` は VM 全体の上限でしかなく、暴走プロセスを止める役には立たないため、
`runArgs` の `--memory` を外したり、後から緩めたりしないこと。
7g の内訳は B 項のとおりで、WSL2 の残り約 2.5 GB が
ホスト側 (Docker Desktop の基盤プロセス、ホストで動かす Claude Code など) の取り分になる。
ホスト側で重い処理を並行させる場合は、その 2.5 GB が上限であることを意識する。

### D. 型チェックコマンドを固定する

`package.json`:

```json
"typecheck": "prisma generate && NODE_OPTIONS=\"$NODE_OPTIONS --max-old-space-size=2048\" tsc --noEmit"
```

`NODE_OPTIONS` は**上書きではなく追記**にすること。
上書きすると `devcontainer.json` の `containerEnv` で設定している
`--dns-result-order=ipv4first` が消える。

修正後の実測が 807 MB なので 2048 MB は十分な余裕がある。

### E. tsserver の常駐メモリを抑える

`.vscode/settings.json` に `typescript.tsserver.maxTsServerMemory: 2048` を設定済み。
tsserver は VS Code 起動中ずっと常駐するため、上限を与えないと
Node のデフォルト（このマシンでは 2240 MB）まで膨張しうる。

### F. 副次的な発見 — vitest がワークツリーのテストを二重に収集していた

`.claude/worktrees/` 配下には git worktree としてリポジトリの複製が置かれるが、
`vitest.config.ts` の `exclude` に含まれていなかったため、
**同じテストが複製側からも収集されていた**（55 ファイル中 6 ファイルが複製由来）。
複製側は `src/generated`（Prisma 生成物、gitignore 対象）を持たないため必ず失敗する。

```diff
-    exclude: ['**/node_modules/**', '**/.foundry/**'],
+    exclude: ['**/node_modules/**', '**/.foundry/**', '**/.claude/**'],
```

今回の型チェック問題とは別件だが、テスト時間とメモリを無駄に消費し、
「原因不明のテスト失敗」の元にもなるため合わせて修正した。

## 調査手法についてのメモ

この問題は「調べようとするとマシンが落ちる」ため、計測自体に安全策が要る。
今回有効だった手順:

1. **`--listFilesOnly` から始める** — 型チェックをせずプログラムだけ構築するのでほぼ無害。
   ファイル数の問題かコストの問題かをこれだけで切り分けられる。
2. **メモリ上限を必ず外部から与える** — 使い捨てコンテナなら
   `docker run --memory=2g --memory-swap=2g`、ホストなら `node --max-old-space-size=N`。
   V8 は上限に達すると自死するので、ホストを巻き込まない。
3. **`--extendedDiagnostics` の `Instantiations` を見る** — メモリや時間より
   桁の違いが明確に出る。ファイル単位・行単位で比較すると犯人が一発で分かる。
4. **`files: [...]` の最小 tsconfig で二分探索する** — 1 ファイル単位なら
   数秒・数百 MB で済むため、何度でも安全に試せる。

なお `GOMEMLIMIT` (tsgo) は Go のソフトリミットであり、上限として当てにできない。
実測で 2 GiB 指定に対し 7.2 GB を消費した。
