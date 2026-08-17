# Gap分析: 実装 vs Requirements（2026-07-25）

> **この文書は 2026-07-25 時点のスナップショットです。**
> 2026-08-17 のドメイン再編（`ab36ef1`〜`394c97a`）でコアドメインを `src/domain/` に一元化し、
> 残っていた再エクスポートシムを全廃したため、本文中のファイルパスは現在の配置と一致しません。
> 現在の配置は `.kiro/steering/structure.md`、ドメインの定義は `.kiro/steering/domain-model.md` を参照してください。
> 調査記録としての正確さを保つため本文は当時のまま残しています。
>
> **本書の指摘のうち解消済みのもの**: `updateEntryMeta` と `saveEntries` が単一ファイルにある前提で
> 書かれていた design.md の記述は、現在の配置（`src/features/read-status/lib/entry-meta-service.ts` と
> `src/domain/entry/entry-sync.ts`）に更新済み。

## 目的

`requirements.md`（2026-05-15、既存実装からの逆引き生成）に対して現行実装（`src/features/read-status/`, `src/features/entry-viewing/components/article-modal.tsx`, `src/components/sidebar.tsx`, `src/app/read-later/`, `src/app/api/entries/` 配下）がどこまで一致しているかを検証する。

## Requirement-to-Asset Map

| 要件 | 実装状況 | 対応アセット |
|---|---|---|
| 1.1–1.3 既読フラグ管理（自動既読化・トグル） | 実装済み | `src/features/entry-viewing/components/article-modal.tsx`（自動既読化: L179-190、`toggleRead`: L192-214） |
| 1.4 既読トグルのキーボードショートカット | 実装済み（**Gap 2**あり） | `article-modal.tsx` L238-251、`src/lib/hotkey-config.ts`（`toggleRead: 'm'`） |
| 1.5 既読更新失敗時ロールバック | 実装済み | `article-modal.tsx` L203-204 |
| 2.1–2.5 あとで読むフラグ管理 | 実装済み | `article-modal.tsx` `toggleReadLater`: L216-236（`isUpdating` で無効化・ロールバックとも確認） |
| 3.1 isRead シブリング伝播 | 実装済み | `src/features/read-status/lib/entry-meta-service.ts` L4-31、テスト: `src/lib/__tests__/entry-service-query.test.ts` L183-208 |
| 3.2 新規エントリー既読連動 | 実装済み | `src/features/feed-management/lib/entry-sync-service.ts` L34-50（**設計ドキュメントとファイル配置に乖離あり、後述**） |
| 3.3 isReadLater は非伝播 | 実装済み | `entry-meta-service.ts` L22-28、テスト: `entry-service-query.test.ts` L210-222 |
| 4.1–4.5 PUT /api/entries/[id]/meta | 実装済み | `src/app/api/entries/[id]/meta/route.ts`（404/500/部分更新すべて確認）、テスト: 同ディレクトリ `route.test.ts` |
| 5.1 entry:read/entry:unread dispatch | 実装済み | `article-modal.tsx` L206-207 |
| 5.2 entry:updated dispatch | 実装済み | `article-modal.tsx` L229 |
| 5.3 entry:read/entry:unread で Sidebar 未読数再取得 | **Gap 1（未実装/仕様違反）** | `src/components/sidebar.tsx` L121-129 |
| 5.4 entry:updated で readLaterUnreadCount 再取得 | 実装済み | `sidebar.tsx` L131-135 |
| 6.1–6.3 /read-later ページ | 実装済み | `src/app/read-later/page.tsx` |
| 6.4 entry:updated でのエントリー除去 | 実装済み | `src/features/entry-viewing/components/entry-card-grid.tsx` L224-251（L237: `isReadLater && !newIsReadLater` で filter） |
| 7.1–7.2 サイドバー未読数バッジ | 実装済み | `sidebar.tsx` L147, L253, L263 |
| 7.3 GET /api/entries/read-later-unread-count | 実装済み | `src/app/api/entries/read-later-unread-count/route.ts` |
| 8.1–8.3 PWA バッジ | 実装済み | `sidebar.tsx` L149-157 |
| 9. 境界・スコープ外要件（一覧UI/フィルタリングはentry-viewing担当） | **Gap 3（境界違反）** | `src/features/read-status/components/read-filter.tsx` |

## 検出したGap

### Gap 1: Sidebar が `entry:unread` イベントを購読しておらず、要件5.3を満たさない
- **分類**: Missing（明確な要件違反）
- **詳細**: `requirements.md` 5.3 は「`entry:read` **または** `entry:unread` イベントが dispatch された場合、Sidebar はフィードの未読カウントを再取得する」と定めている。しかし実装（`src/components/sidebar.tsx` L121-129）は次の通り `entry:read` のみをリッスンしている。
  ```ts
  useEffect(() => {
    const handler = () => {
      fetch('/api/feeds').then((r) => r.json()).then((res) => { if (res.success) setFeeds(res.data) })
    }
    window.addEventListener('entry:read', handler)
    return () => window.removeEventListener('entry:read', handler)
  }, [])
  ```
  `entry:unread` イベントは `article-modal.tsx` の `toggleRead`（L206）で「未読に戻す」操作時に確かに dispatch されているが（`src/features/entry-viewing/components/article-modal.tsx` L206-207）、Sidebar 側に対応するリスナーがない。結果として、ユーザーが記事を「未読に戻す」と、サイドバーの「全ての記事」バッジおよびフィード別未読数バッジが古いまま（ページリロードするまで）更新されない。
- **design.mdとの関係**: `design.md` の Requirements Traceability 表（5.3行目）は「entry:read で Sidebar 更新」とだけ記載しており、`entry:unread` を含めていない。つまり設計フェーズで要件が無断で狭められ、`requirements.md` 側は未更新のまま矛盾している。逆引き生成時に実装をそのまま書き写した結果と考えられる。
- **影響範囲**: UIの見た目上の不整合（未読数バッジの不一致）。データ自体は正しく更新されるため実害は限定的だが、ユーザーが誤った未読数を見続ける。

### Gap 2: ArticleModal のキーボードショートカット `useEffect` が `isUpdatingRead` / `toggleRead` を依存配列から欠落（要件1.4に関わる静的な欠陥）
- **分類**: Constraint（実装バグ、要件1.4の趣旨を損なう）
- **詳細**: `src/features/entry-viewing/components/article-modal.tsx` L238-251:
  ```ts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      ...
      if (e.key === config.readLater && entry && !isUpdating) toggleReadLater()
      if (e.key === config.toggleRead && entry && !isUpdatingRead) toggleRead()
      ...
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [config, onClose, onPrev, onNext, hasPrev, hasNext, entry, isUpdating, toggleReadLater])
  ```
  依存配列に `isUpdating` と `toggleReadLater`（あとで読む側）は含まれているが、`isUpdatingRead` と `toggleRead`（既読側）が欠落している。他の2つの `useEffect`（L64-74, L158-177付近）には意図的な `// eslint-disable-next-line react-hooks/exhaustive-deps` が付与されているが、この effect にはそれがなく、単純な記載漏れと考えられる。
  結果として `handler` は effect が最後に再生成された時点の `toggleRead`（＝その時点の `isRead` 値）を stale closure として捕捉し続ける。特に「モーダルを開いて自動既読化された直後」は `entry` が変化して effect が再実行されるためその時点では問題ないが、`isRead` を都度参照する古い `toggleRead` 参照を使い続けるため、キーボード操作で状態が想定通りに切り替わらないケースが生じうる（クリック操作は都度最新の `onClick={toggleRead}` を束縛し直すため影響を受けない）。
  要件1.4「既読/未読トグルボタンを…キーボードショートカットでも操作できる」の趣旨に対し、キーボード経路でのトグル動作がクリック経路と等価でないという点で、要件の意図を損なう実装ドリフトと言える。
- **Research Needed**: 実際のユーザー影響（体感できる不具合の再現条件）を確認するため、E2Eもしくは手動確認が必要。

### Gap 3: `ReadFilter`（既読/未読フィルタUI）が read-status 配下に実装されているが、requirements.md に記載がなく、design.md の境界宣言と矛盾する
- **分類**: Missing / Constraint（要件欠落 + 境界違反）
- **詳細**: `src/features/read-status/components/read-filter.tsx` は「未読／すべて」を切り替えるフィルタUIで、`src/app/page.tsx`（L8, L55）、`src/app/preferred/[preferenceId]/page.tsx`、`src/app/preferred/all/page.tsx` から使用されている。フィルタ状態は `filter` クエリパラメータとして管理され、`isUnread` として `findManyEntries`（`src/features/entry-viewing/lib/entry-service.ts` L30, L118: `if (isUnread) baseWhere.OR = [{ meta: null }, { meta: { isRead: false } }]`）に渡り、エントリー一覧のフィルタリングクエリを直接左右する。
  一方で `requirements.md` にはこの機能（記事一覧を既読/未読で絞り込むUI）についての要件が一切存在しない。さらに `requirements.md` §9（境界・スコープ外要件）は「エントリー一覧の表示・フィルタリングUI…は entry-viewing が担当」と明記し、`design.md` の Out of Boundary にも同様の記載がある。しかし実装上、フィルタリングUIそのもの（`ReadFilter`）は read-status フィーチャーのフォルダ（`src/features/read-status/components/`）に置かれており、「フィルタリングUIはentry-viewingの担当」という境界宣言と矛盾している。
- **影響範囲**: 機能自体は正しく動作しており、ユーザー影響はない。ただしspec文書としては、実際に出荷されているUI機能（read/all フィルタ）についての受け入れ基準が存在せず、将来の変更時にリグレッションを検知する仕様上の拠り所がない。

### 参考: 軽微な構造ドリフト（file-location, Constraintのみ・対応不要）
- `design.md` の File Structure Plan / Architecture Analysis は `updateEntryMeta` と `saveEntries` がともに単一ファイル `src/lib/entry-service.ts` にあることを前提に書かれているが、feature-by-folder移行の結果、実際には次のように3フィーチャーに分割されている: `updateEntryMeta` → `src/features/read-status/lib/entry-meta-service.ts`、`saveEntries`（既読連動ロジック含む）→ `src/features/feed-management/lib/entry-sync-service.ts`。旧 `src/lib/entry-service.ts` は3フィーチャー分の re-export シムのみ。これはタスク背景に既知の前提として記載されている移行の一部であり、機能的な差分ではない。
- テストカバレッジ: `src/components/entry-modal.test.tsx` は実際には使われていない旧コンポーネント `EntryModal`（`src/components/entry-modal.tsx`、どこからもimportされていないデッドコード）に対するテストであり、実際にボタン・楽観的更新・イベントdispatchを担う `ArticleModal`（`src/features/entry-viewing/components/article-modal.tsx`, 572行）にはテストファイルが存在しない。同様に `Sidebar`・`/read-later` ページ・`read-later-unread-count` ルートにもテストがなく、`tasks.md` の該当タスク（2.1除く4系, 5系, 6系）はすべて未チェックのまま実態と一致している。要件との機能的な差分ではないため、Gapとしては数えないが、次にこの領域を触る際の優先候補として記録する。

## Implementation Approach Options

### Gap 1（Sidebar の entry:unread 未購読）への対応

#### Option A: Sidebar の既存 `useEffect` に `entry:unread` リスナーを追加
- 対象: `src/components/sidebar.tsx` L121-129 の `addEventListener('entry:read', handler)` の隣に `addEventListener('entry:unread', handler)` を追加するのみ
- ✅ 最小差分・既存パターン踏襲・リグレッションリスクほぼゼロ
- ✅ requirements.md 5.3 に完全準拠
- ❌ 特になし

#### Option B: `entry:read`/`entry:unread` を単一の `entry:read-status-changed` イベントに統合するリファクタ
- ✅ 将来的にイベント種別が増えた際の一貫性が上がる
- ❌ `article-modal.tsx`・`entry-card-grid.tsx` 含む複数箇所のイベント名変更が必要で影響範囲が広い。現状の要件を満たすだけなら過剰

#### Option C: 現状維持（`requirements.md` 5.3 を実装に合わせて `entry:read` のみに修正）
- ✅ コード変更ゼロ
- ❌ ユーザー体験上の不整合（未読に戻した記事がサイドバーの未読数に反映されない）を追認するだけで、UXの実害を放置する

**推奨**: Option A。

### Gap 2（キーボードショートカットのstale closure）への対応

#### Option A: 依存配列に `isUpdatingRead` と `toggleRead` を追加
- ✅ 他の readLater 側と対称になり、意図した動作に修正される
- ❌ なし（`toggleRead`は`useCallback`で安定した参照のため影響は限定的）

#### Option B: 意図的な省略として `eslint-disable-next-line` を追加し、現状を仕様として追認
- ✅ 変更ゼロ
- ❌ キーボード操作でのトグル動作が不安定なまま残る。要件1.4の意図に反する

**推奨**: Option A（Gap 1と合わせて低リスクな修正のため設計フェーズを経ず直接対応可能な粒度）。

### Gap 3（ReadFilterの要件欠落・境界矛盾）への対応

#### Option A: `requirements.md` に新規要件セクション（例: 「10. 記事一覧の既読/未読フィルタ」）を追加し、実装済みの `ReadFilter` を正式に仕様化する
- ✅ 既に出荷済みの機能を正しく文書化でき、リグレッション検知の拠り所ができる
- ✅ `ReadFilter` が read-status フィーチャー配下にある実態とも整合（read-statusが所有する機能として明文化）
- ❌ §9のスコープ外宣言（フィルタリングUIはentry-viewing担当）と矛盾するため、boundary記述も合わせて修正が必要

#### Option B: `ReadFilter` を `entry-viewing` フィーチャーへ移動し、§9の境界宣言をそのまま維持する
- ✅ design.md/requirements.mdの境界宣言を変更せずに済む
- ❌ 実装移動のコストが発生し、read-status側のPUT呼び出しとの結合（isUnreadフィルタ自体はread-statusのisReadフラグに依存）を考えると、featureの所有権としてはread-status側の方が自然

#### Option C: 現状維持（Gap 3として記録のみ、対応は次回spec更新まで見送り）
- ✅ 低リスク
- ❌ 文書と実装の乖離が残り続ける

**推奨**: Option A。`ReadFilter` は isRead フラグに直接依存する機能であり、read-statusフィーチャーが所有する方が自然。§9の境界文言（「一覧UIはentry-viewing」）を「一覧のレンダリング・無限スクロールはentry-viewing、既読/未読フィルタUIはread-status」のように精緻化するのが実態に合う。

## Effort & Risk

- **Gap 1（entry:unread購読追加）**: Effort S（1日未満）／Risk Low — 既存パターンの複製のみ、影響範囲は`sidebar.tsx`の1箇所
- **Gap 2（依存配列修正）**: Effort S（1日未満）／Risk Low — `useCallback`化済みの関数を依存配列に追加するのみ。ただし手動またはE2Eでの動作確認が望ましい
- **Gap 3（ReadFilterの要件化・境界整理）**: Effort S〜M（1-3日）— 文書更新が中心。Option Bを選ぶ場合はファイル移動＋import修正が追加で発生するためMに近づく

## Recommendations

- 要件1.1-1.3, 1.5, 2.1-2.5, 3.1-3.3, 4.1-4.5, 5.1, 5.2, 5.4, 6.1-6.4, 7.1-7.3, 8.1-8.3 は実装と完全に一致しており、追加対応不要。
- **Gap 1（最優先）**: `sidebar.tsx` に `entry:unread` リスナーを追加し、要件5.3を満たす。合わせて `design.md` のTraceability表（5.3行）も `entry:read / entry:unread` に修正する。
- **Gap 2**: `article-modal.tsx` のキーボードショートカット `useEffect` の依存配列に `isUpdatingRead`, `toggleRead` を追加し、クリック操作と同等の動作に揃える。
- **Gap 3**: `requirements.md` に既読/未読フィルタ機能の要件を追記するか（Option A推奨）、`ReadFilter` を entry-viewing に移す（Option B）か、次スペック更新時に方針を確定する。いずれにせよ現状の「実装済みだが仕様書に存在しない機能」という状態は解消すべき。
- Research Needed として持ち越す項目: Gap 2の実際のユーザー影響（体感できる不具合の再現条件）の確認。

---

# Gap分析 追補: entry-sync 最適化コミット（93f0a6f）の影響調査（2026-07-26）

## 目的

上記のGap分析（2026-07-25、コミット `a5bc288`時点）の直後に、`93f0a6f feat(entry-sync): optimize entry saving and read status inheritance logic` がmainにマージされた。このコミットは要件3.2（新規エントリー既読連動）の実装箇所である `src/features/feed-management/lib/entry-sync-service.ts` の `saveEntries` を直接書き換えている。上記Gap分析はこの変更を反映していないため、本追補で最新状態を検証し直す。

## 1. Current State Investigation（差分の実体）

`git show 93f0a6f -- src/features/feed-management/lib/entry-sync-service.ts` を確認した結果、変更内容は次の通り。

- **Before**: `saveEntries` のエントリー毎ループ内で、エントリーごとに `entryMeta.findUnique`（自身のメタ存在確認）→ `entryMeta.findFirst`（同一linkの既読シブリング検索）→ 該当すれば `entryMeta.create` を都度発行していた。エントリー数 N に対し最大 2N 回のDB往復が発生する構造。
- **After**: ループ内では `Entry.upsert` の結果（id, link）を配列に蓄積するだけに変更し、ループ終了後に新設のヘルパー関数 `inheritReadStatusByLink(saved)` を1回だけ呼び出す。この関数は次の3クエリで全件を一括処理する。
  1. `entryMeta.findMany({ entryId: { in: [...] } })` — 保存済みエントリーのうちメタが既にあるものを特定
  2. メタが無い候補（candidates）に対して `entryMeta.findMany({ isRead: true, entry: { link: { in: [...] } } } })` — 同一link群のうち既読メタを持つものを一括検索
  3. 既読linkに合致する候補をまとめて `entryMeta.createMany({ data: [...], skipDuplicates: true })` で作成

コメント（L40-42）に「entries.length に比例したDB往復を避けるため」と明記されており、意図は明確にパフォーマンス最適化であり、要件3.2の振る舞い変更を意図したものではない。

## 2. Requirements Feasibility Analysis（要件3.2への影響評価）

**結論: 要件3.2の充足状況に変化はない（実装済みのまま）。ロジック的に旧実装と等価と判断できる。**

- 候補（candidates）は「保存直後でメタを持たないエントリー」に限定してから既読linkを検索するため、旧実装の `NOT: { id: saved.id }`（自分自身を除外する条件）が新実装では明示的に書かれていないが、候補自体がメタを持たない＝`isRead: true` の対象になり得ないため、自己参照によって誤って既読化される余地はない。実質的に旧実装と同じ集合を返す。
- `createMany` に `skipDuplicates: true` が付与された点は旧実装（`create` を都度呼ぶ）からの機能追加であり、同時実行（例: 複数フィードの並行取得ジョブが同一linkのエントリーを同時に新規作成するケース）で `entryId` のユニーク制約違反が起きても例外にならず安全側に倒れる。これは要件を損なわない改善。
- Prismaスキーマ側のインデックス（`Entry.@@index([link])`、`EntryMeta.@@index([isRead])`）は新しいクエリパターン（`entryMeta.findMany({ isRead: true, entry: { link: { in: [...] } } })`）にも対応できる構成になっており、新規のインデックス追加は不要と判断できる。ただしSQLite/LibSQL上でPrismaのリレーションフィルタが実際にどうSQLへコンパイルされるか（JOINか2クエリ分割か）は未検証であり、エントリー件数が非常に多いフィード（上限500件/フィード、`MAX_ENTRIES_PER_FEED`）でのレイテンシ実測は行っていない。

**新規に検出した懸念（Gapではないが記録）**:

### 懸念A: 同コミットで `vitest.setup.ts` のDBリセット方針が `beforeEach` → `beforeAll` に変更されており、read-status関連の既存テストが現在の環境で実行不能な状態
- **分類**: Constraint / Research Needed
- **詳細**: 同一コミット内で `vitest.setup.ts` が次のように変更されている。
  ```diff
  - beforeEach(async() => { // DBをリセットしてからテストを実行
  + beforeAll(async() => { // テストスイート全体の実行前に一度だけDBをリセットする
      ... spawn('prisma', ['migrate', 'reset', '--force']) ...
  ```
  意図はテスト実行速度の改善（テスト件数分のCLIプロセス起動を1回に削減）だが、本調査環境で `npx vitest run src/lib/__tests__/entry-service-save.test.ts` および `entry-service-query.test.ts`（＝前段のGap分析が要件3.1〜3.3の実装済み根拠として引用したテストファイル）を実行したところ、いずれも `beforeAll` フックの `prisma migrate reset --force` 実行時点で失敗し（`Unknown Error: 1`）、テスト本体は1件も実行されずに全件skip扱いとなった。
  この失敗がサンドボックス実行環境固有の制約（DB書き込み権限やプロセス起動制限）によるものか、CI環境でも再現する実質的な回帰かは本調査だけでは切り分けられない。ただし前段Gap分析が「実装済み」の根拠として名指ししたテストファイルが、少なくとも本調査時点の環境では検証不能であるという事実は重要であり、次フェーズで確認すべき。
  また `.kiro/steering/tech.md` L38 は依然として「Database reset before each test（`beforeEach` in `vitest.setup.ts`）」と記載しており、実装（`beforeAll`）と乖離している（steering未更新のドリフト）。
- **影響範囲**: 要件3.1〜3.3自体の実装コードは目視レビューで妥当と判断できるが、「テストで担保されている」という前段Gap分析の主張は現時点で再検証できていない。CI（GitHub Actions等、未確認）で実際に通っているかどうかは別途確認が必要。
- **Research Needed**: (1) CI環境で `entry-service-save.test.ts` / `entry-service-query.test.ts` が実際にグリーンかどうかの確認。(2) `beforeAll` 化がテスト間のDB状態リーク（あるテストが書き込んだデータを後続テストが誤って参照する）を引き起こしていないかの確認。(3) `.kiro/steering/tech.md` L38 の記述更新（`beforeEach` → `beforeAll`）。

### 懸念B: `saveEntries` の既読連動ロジック自体（新規エントリーが既読シブリングを持つ場合に既読化される、という3.2のコア挙動）を直接検証する単体テストが、最適化の前後を通じて一貫して存在しない
- **分類**: Missing（テストカバレッジ）/ Research Needed
- **詳細**: `git show 93f0a6f^:src/lib/__tests__/entry-service-save.test.ts` を確認したところ、最適化前の時点でも「既読シブリングがいる場合に新規エントリーが既読化される」ケースを検証するテストは存在せず、`beforeEach` で `mockEntryMeta.findUnique/findFirst` を常に `null` を返すようにモックし、「メタなし・既読な兄弟なし」というデフォルトパスのみが暗黙にテストされていた。最適化後も同様に `mockEntryMeta.findMany.mockResolvedValue([])` で空配列固定であり、既読連動が実際に発火するケース（`toCreate` が非空になるケース）を検証するテストケースは追加も削除もされていない。
  つまりこれは新規のGapではなく、最適化コミットの前後を通じて存在し続けている既存の穴だが、ロジックが単純な逐次処理から集合演算（`Set`操作を含む2段階フィルタリング）に変わったことで、テストなしでのロジック複雑度は相対的に上がっている。前段Gap分析には言及がなかったため、本追補で新たに明記する。
- **影響範囲**: 要件3.2のコアロジックが将来のリファクタで壊れても、既存テストスイートでは検知できない。

## 3. Implementation Approach Options

### 懸念A（テスト実行不能）への対応

#### Option A: 現状の `beforeAll` 方針を維持しつつ、CI環境での実行結果を確認して steering (`tech.md`) を実態に合わせて更新するのみ
- ✅ コード変更不要、ドキュメントの正確性のみ回復
- ❌ 本調査環境での「Unknown Error: 1」の根本原因（サンドボックス制約か実質的な回帰か）は未解決のまま

#### Option B: `beforeAll` によるDB状態共有がテスト間で問題を起こしていないか、各 `describe` ブロック内で明示的なクリーンアップ（`afterEach` でのテーブルクリア等）を追加する
- ✅ テスト分離性を担保しつつパフォーマンス改善の効果も維持できる
- ❌ 追加の実装コストが発生し、対象は read-status 固有ではなく全テストスイート共通のインフラ変更になるため、本specのスコープを超える可能性が高い

#### Option C: CI設定（未確認）を確認し、ローカルサンドボックスの `prisma migrate reset` 失敗がサンドボックス固有の問題（DB書き込み権限等）と判明すれば、read-status spec としては静観する
- ✅ 低コスト
- ❌ 「テストが実装済み要件の根拠になっているか」の疑義が残ったままdesignフェーズに進むことになる

**推奨**: Option A + Option C（まずCI実行結果を確認し、steeringのドリフトのみ修正する）。Option Bはテストインフラ全体に関わるため、read-status specの範囲を超えると考えられる。

### 懸念B（既読連動ロジックの単体テスト欠如）への対応

#### Option A: `entry-service-save.test.ts` に「既読シブリングが存在する場合、新規エントリーが `isRead: true` で作成される」ケースと「同一バッチ内の複数エントリーが同一linkを共有し、外部に既読シブリングがいる場合に全件既読化される」ケースを追加する
- ✅ 要件3.2のコア回帰防止になる。`mockEntryMeta.findMany` の返り値を変えるだけで実装できゲート
- ✅ 最適化後の集合演算ロジック（`idsWithMeta` / `readLinks` のSet構築）の妥当性を直接検証できる
- ❌ モックのセットアップがやや複雑（`findMany` が2回呼ばれる＝メタ存在確認用と既読link検索用の2種の返り値を呼び出し順で出し分ける必要がある）

#### Option B: 現状維持（Gapとして記録のみ）
- ✅ 低コスト
- ❌ コアロジックが無防備なまま残る

**推奨**: Option A。Effort Sで対応可能かつ要件3.2の実装済み判定の信頼性を大きく引き上げる。

## 4. Effort & Risk

- **懸念A（テスト実行可否の確認・steering更新）**: Effort S（1日未満）／Risk Low — 調査とドキュメント修正が中心。ただしCI実行結果次第でRiskがMediumに上がる可能性あり（実質的な回帰だった場合）
- **懸念B（既読連動の単体テスト追加）**: Effort S（1日未満）／Risk Low — 既存のモックベーステストパターンを踏襲するのみ

## 5. Recommendations（設計フェーズへの申し送り）

- 要件3.1〜3.3（リンクベースシブリング同期）は `93f0a6f` の最適化後も**機能的には**満たされていると判断できる。ロジックのレビューベースでは旧実装と等価であり、新たな実装Gapは検出されなかった。
- ただし、その根拠として前段Gap分析が引用した既存テスト（`entry-service-save.test.ts`, `entry-service-query.test.ts`）が、本調査環境では `vitest.setup.ts` の `beforeAll` 化に起因すると見られる `prisma migrate reset` 失敗で**実行不能**であることが判明した。design/tasksフェーズに進む前に、CI環境での実際のテスト結果を確認することを強く推奨する（Research Needed）。
- 要件3.2のコア挙動（既読シブリングがいる場合の新規既読連動）を直接検証する単体テストが、最適化の前後を通じて存在しないことも新たに判明した。design/tasksフェーズで本specのスコープに含めるか、既存コードへの独立したテスト追加タスクとして切り出すかを検討されたい。
- `src/components/article-modal.tsx` の legacy re-export shim が同コミットで完全削除されていることを確認した（`src/features/entry-viewing/components/article-modal.tsx` への参照は全てfeatureパス経由であり、壊れたimportは検出されなかった）。read-status固有の影響はないが、feature-by-folder移行がshim維持からshim撤去のフェーズに移りつつあることの傍証として記録する。
- `.kiro/steering/tech.md` のテスト方針記述（L38: `beforeEach` in `vitest.setup.ts`）は実装（`beforeAll`）と乖離しており、read-status spec固有ではないが次回のsteering同期（`/kiro-steering`）で更新すべき。
