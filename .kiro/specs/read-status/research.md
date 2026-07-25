# Gap分析: 実装 vs Requirements（2026-07-25）

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
