# Gap分析: 実装 vs Requirements（2026-07-25）

## 目的

`requirements.md`（EARS形式、2026-05-15作成の逆引きspec）に対して現行実装（`src/lib/digest-service.ts`, `src/components/digest-form.tsx`, `src/components/delete-digest-button.tsx`, `src/app/digests/*`, `src/app/api/digests/*`）がどこまで一致しているかを検証する。digestsフィーチャーは `structure.md` により folder-by-feature 移行の対象外と明記されており（`src/features/digests/` は存在しない）、`src/lib/` / `src/components/` 直下に実体があることは想定どおりの状態である。

## Requirement-to-Asset Map

| 要件 | 実装状況 | 対応アセット | 確認方法 |
|---|---|---|---|
| 1. ダイジェスト一覧（1.1–1.5） | 実装済み | `src/app/digests/page.tsx` | `getDigests(1, 50)` 呼び出し、`total`件数ヘッダー、`/digests/new`リンク、空状態UI（BookOpenアイコン）を確認 |
| 2. ダイジェスト作成（2.1–2.5） | 実装済み | `src/components/digest-form.tsx`, `src/app/api/digests/route.ts` | クライアント側`content.trim()`空チェック、成功時`router.push`、失敗時エラー表示を確認 |
| 3. ダイジェスト詳細閲覧（3.1–3.6） | 実装済み | `src/app/digests/[id]/page.tsx` | `getCachedDigestById`、`ReactMarkdown` + `remarkGfm`/`rehypeRaw`/`rehypeSanitize`、404ハンドリング、ヘッダー3要素（一覧・編集・削除）を確認 |
| 4. ダイジェスト編集（4.1–4.5） | 実装済み | `src/app/digests/[id]/edit/page.tsx`, `digest-form.tsx` | `defaultValues`初期化、`PATCH`呼び出し、`revalidateTag`呼び出しを確認 |
| 5. ダイジェスト削除（5.1–5.4） | 実装済み | `src/components/delete-digest-button.tsx`, `src/app/api/digests/[id]/route.ts` | `confirm()`ダイアログ、`DELETE`呼び出し、`deleteDigest`内の存在確認→404スロー、`revalidateTag`を確認 |
| 6. REST API（6.1–6.7） | 実装済み（軽微な不整合あり、下記Gap参照） | `src/app/api/digests/route.ts`, `src/app/api/digests/[id]/route.ts` | 全メソッドのレスポンス形状・ステータスコードをdesign.mdの契約と突き合わせ |

**確認できた実装の要点**（証跡付き）:
- `src/lib/digest-service.ts:35`: `getDigestById`は存在しないIDで`AppError('DIGEST_NOT_FOUND', 'Digest not found', 404)`をスロー。`updateDigest`(51行目)・`deleteDigest`(63行目)はいずれも先に`getDigestById`を呼び存在確認してから操作するため、要件4.2/5.3/6.7を満たす。
- `src/lib/digest-service.ts:39-45`: `getCachedDigestById`は`unstable_cache`でタグ`[digest-${id}]`を設定。`src/app/api/digests/[id]/route.ts:37,48`でPATCH/DELETE成功後に`revalidateTag(`digest-${id}`, 'max')`を呼んでおり、要件3.6/4.5/5.4と設計を満たす。
- `src/app/digests/[id]/page.tsx:72`: `rehypePlugins={[rehypeRaw, rehypeSanitize]}`の順序が`rehype-raw`→`rehype-sanitize`であり、design.md Security Considerations（521行目「rehype-sanitizeを必ずrehype-rawの後に適用」）およびXSS防止の要件3.3を満たす。`hast-util-sanitize`のデフォルトschemaは`input`タグを許可しており、GFMチェックリスト（要件3.2）のレンダリングも妨げない。
- `src/types/feed.ts`（`@/features/feed-management/types/feed`への再エクスポートシム経由）の`ErrorCode`型に`DIGEST_NOT_FOUND`・`VALIDATION_ERROR`・`INTERNAL_SERVER_ERROR`が含まれることを確認（`src/features/feed-management/types/feed.ts:82-92`）。digestsは移行対象外だが、エラーコード型は移行済みfeed-managementのシム経由で共有されている。

## 検出したGap（すべてConstraint分類。Missing＝未実装のEARS要件はゼロ）

### Gap 1: POST/PATCHでcontentの「非空」バリデーション基準が不一致
- **分類**: Constraint（REST APIの一次仕様面での不整合）
- **詳細**: `src/app/api/digests/route.ts:34`（POST）は `if (!content || typeof content !== 'string')` のみでチェックしており、空白のみの文字列（例: `"   "`）は`!content`がfalseになるため通過してしまう。一方 `src/app/api/digests/[id]/route.ts:22`（PATCH）は `content.trim() === ''` を明示的にチェックしており、空白のみの文字列を拒否する。
- **design.mdとの関係**: design.md 285行目は「`content` が文字列かつ非空であることをチェック」とPOSTの実装ノートに明記しており、PATCHと同等の非空判定を期待している。現状はPOSTがPATCHより緩い基準になっている。
- **影響範囲**: `DigestForm`は送信前に`content.trim()`が空でないかクライアント側でチェックしているため、通常のUIフローでは到達しない。直接API呼び出し（例: `curl`）でのみ顕在化する。

### Gap 2: タイトルの空文字列(`''`)とnullの扱いがコンポーネント間で不整合
- **分類**: Constraint（コンポーネント間の実装不整合、要件が明示的に規定しているわけではない）
- **詳細**:
  - `src/app/digests/page.tsx:50`: `{digest.title ?? formatDate(digest.createdAt)}` — Nullish coalescing。`title`が`''`の場合、`''`は`null`/`undefined`ではないため空文字列がそのまま表示される（要件1.3が期待する「作成日時をタイトルの代わりに表示」にならない）。
  - `src/app/digests/page.tsx:52`: `{digest.title && (<span>{formatDate(...)}</span>)}` — こちらは truthy チェックのため`''`ではfalseとなり、日時サブテキストも表示されない。
  - 結果として`title: ''`のダイジェストが一覧に存在すると、そのリンク項目は**視覚的に空白**（タイトルもサブテキストの日時も出ない）になる。
  - `src/lib/digest-service.ts:10`: `createDigest`内の`title: data.title ?? null`も`''`をそのまま通すため、DBに空文字列が保存され得る。
  - `DigestForm`（`digest-form.tsx:46`）は送信時に`title.trim() || null`で空文字列をnullに正規化しているため、通常のUIフローでは`''`はDBに保存されない。直接API POST（`title: ""`を明示送信）でのみ顕在化する。
- **要件との関係**: 要件1.2/1.3は「タイトルが設定されている/されていない」の二値を前提としており、`''`という中間状態のハンドリングは要件文からは規定されていない。実装のバグというより仕様の考慮漏れに近い。

### Gap 3: DeleteDigestButtonに削除失敗時のエラーUIがない
- **分類**: Constraint（design.mdのError Handling戦略との不整合、requirements.mdは規定なし）
- **詳細**: `src/components/delete-digest-button.tsx:20-24`は`fetch`が`response.ok`でない場合、何もUIに表示せず`isDeleting`を`false`に戻すのみ（`error`状態自体が存在しない）。design.md 486行目は「クライアントコンポーネント: APIエラーはエラーメッセージをUI内に表示」と汎用的なエラー処理戦略を定めており、`DigestForm`（`error`状態でエラー表示）はこれに従っているが、`DeleteDigestButton`は従っていない。
- **要件との関係**: requirements.md 5.1–5.4は削除確認ダイアログ・成功時の遷移・404・キャッシュ無効化のみを規定し、削除失敗時のUI表示までは明示的に要求していない。したがってrequirements.md違反ではなく、design.mdのエラー処理方針からの逸脱として記録する。

### Gap 4（参考）: テストファイルが一切存在しない
- **分類**: タスク完了状況のギャップ（requirements.mdにはテストに関するEARS基準が存在しないため、Gapというよりtasks.mdとの整合性メモ）
- **詳細**: `find`で `*digest*.test.*` / `*digest*.spec.*` を検索した結果、ヒットなし。`tasks.md`のタスク8.1（`digest-service.test.ts`のユニットテスト）・8.2（APIルート統合テスト、`*`付きでオプション扱い）はいずれも`[ ]`未完了のまま。逆引きspec生成時点（2026-05-15）から状態は変わっていないと推測され、今回の監査で新たに発生したドリフトではない。

## Implementation Approach Options（Gap 1・2への対応）

### Option A: サービス層で正規化・バリデーションを一元化
- `createDigest`/`updateDigest`内で`content.trim()`チェックと`title`の`'' → null`正規化を行い、APIルート層のバリデーションと重複させずサービス層に集約する。
- ✅ POST/PATCHの基準が自動的に一致する。UIコンポーネント側の`??`/`&&`不整合も、そもそも`''`がDBに入らなくなるため実質的に解消。
- ❌ design.mdの責任分担（「入力バリデーションはAPIルートハンドラー層で行い、サービス層はバリデーション済みデータのみを受け取る」243行目）と矛盾するため、design.md自体の改訂が必要。

### Option B: APIルート層のバリデーションのみ修正
- `route.ts`（POST）の`!content`チェックを`!content || typeof content !== 'string' || content.trim() === ''`に統一し、PATCHと同じ基準にする。titleは`title === '' ? null : title`のような正規化をAPIルート層で行う。
- ✅ design.mdの既存責任分担（バリデーションはAPIルート層）を維持したまま最小差分で修正できる。
- ❌ 2箇所（POST/PATCH）で同じロジックを重複させることになり、将来また乖離するリスクが残る。

### Option C: 現状維持（記録のみ）
- 通常のUIフロー（DigestForm経由）では到達しないエッジケースであるため、対応を見送り記録に留める。
- ✅ 低リスク、機能要件（1〜6）はUIフロー上100%満たされている。
- ❌ 直接API利用者（将来のモバイルアプリや外部連携）が存在する場合、`''`タイトルの空白行や空白のみcontentの登録という顕在化しやすい不具合を持ち込むことになる。

Gap 3（DeleteDigestButtonのエラーUI欠如）については、`DigestForm`と同様の`error`状態を追加し`role="alert"`でメッセージ表示する対応がOption A/Bどちらとも独立に低コストで可能。

## Effort & Risk

- **Effort**: S（1〜3日）— Gap 1〜3はいずれも1〜2ファイルの局所修正で完結する軽微な差分。Gap 4（テスト追加）を含めてもS〜M範囲に収まる。
- **Risk**: Low — 該当箇所は既存の自動テストが存在しないため回帰検知はできないが、変更範囲がバリデーション条件式とエラーUIの追加のみで、既存の正常系フロー（DigestForm経由）には影響しない。

## Recommendations

- **機能要件（EARS 1〜6）はすべて実装済みで、UIフローを通した通常利用では要件と実装の間にMissing（未実装）は存在しない。** 検出した4件のGapはいずれもConstraint分類であり、直接API利用や特殊な入力値（空白文字列のtitle/content）でのみ顕在化するエッジケース、またはdesign.mdのエラー処理方針からの局所的な逸脱にとどまる。
- Gap 1（content空白バリデーションの不一致）は、design.mdが明示的に「POSTでcontentの非空チェック」を要求している以上、最も優先度が高い。Option Bでの局所修正を推奨。
- Gap 2（title空文字列の扱い）は要件文自体が`''`という中間状態を想定していないため、次にDigestForm/APIを触るタイミングでのついで対応で十分。
- Gap 3（DeleteDigestButtonのエラーUI欠如）はdesign.mdの方針と実装の乖離のため、記録した上でチームに要修正か許容かを確認する。
- Gap 4（テスト不在）はrequirements.mdの範囲外だが、tasks.md 8.1/8.2が未完了である事実は今後の実装作業のTODOとして引き続き有効。

---

# Gap分析: 実装 vs Requirements（2026-07-26 再検証）

## 目的

2026-07-25付けの上記Gap分析から1日が経過した時点で、`digests`フィーチャーの実装状況に変化（ドリフト）が生じていないか、また新たに再利用可能なコンポーネント/サービスが追加されていないかを再検証する。本フィーチャーは`requirements.md`/`design.md`/`tasks.md`すべて承認済み（`ready_for_implementation: true`）であるため、本分析は実装方針の決定ではなく、設計フェーズ着手前の前提再確認（Current State Investigation）を目的とする。

## 1. Current State Investigation（現状調査）

### ディレクトリ構成とfolder-by-feature移行状況
- `git log --oneline -- '*digest*'` で全コミット履歴を確認した結果、digest関連ファイルへの直近の変更は `c763d3e`（2026-07-20、"add motion library and implement reduced motion preferences"）であり、内容は`src/app/digests/page.tsx`・`src/app/digests/[id]/page.tsx`の1行差分（リンクの軽微な調整）のみ。**前回分析（2026-07-25付、コミット`a5bc288`）以降、digest関連ファイルへのコード変更は一切ない**ことを確認した。
- `find src/features -iname '*digest*'` はヒットなし。`ls src/features/` は `entry-viewing`, `feed-management`, `preference-recommendations`, `read-status`, `tag-management` の5フィーチャーのみで、`digests`は含まれない。`.kiro/steering/structure.md`（44行目）の「`digests`は未移行」という記述は**現時点でも正確**であり、ドリフトは無い。
- 実装ファイルの所在は前回分析と同一: `src/lib/digest-service.ts`, `src/types/digest.ts`, `src/components/digest-form.tsx`, `src/components/delete-digest-button.tsx`, `src/app/digests/**`, `src/app/api/digests/**`。

### 再利用可能アセットの再確認
- `src/middleware.ts` を新規に確認した結果、`/api/digests`を含む全パス（`/login`, `/api/auth`を除く）がセッション認証・許可メールアドレス（`ALLOWED_EMAILS`）チェックの対象になっている（グローバル適用、matcher設定で静的アセット等を除外）。digest APIルート自身には認証コードが存在しないが、これは`src/app/api/feeds/route.ts`など他フィーチャーのAPIルートも同様であり、本アプリ全体の設計パターン（認証はmiddleware層に一元化）と整合している。認証欠如は本フィーチャー固有のGapではない。
- `prisma/schema.prisma`の`Digest`モデル（93-101行目）は前回確認時と同一: `id, title?, content, createdAt`のみで`userId`等のオーナーシップ列は無い。他モデル（`User`等）との関連も無く、シングルテナント（許可ユーザー全員が全ダイジェストを共有閲覧）を前提とした設計のまま変化なし。
- AI関連ライブラリ（`openai`, `anthropic`, `@ai-sdk/*`等）を`package.json`から検索したが該当なし。`generate.*digest`等のキーワードでのコード内検索もヒットなし。project descriptionにある「AIが生成した...ダイジェスト」という文言は、現行のEARS要件（1〜6章）には一切反映されておらず、**AI生成トリガー機能はrequirements.mdのスコープ外**であることを再確認した（前回分析では明示的に言及されていなかった点）。

### tasks.mdとの整合性（新規確認事項）
- `tasks.md`の全21タスク行（`- [ ]`表記）を確認したところ、**チェック済み（`- [x]`）が0件、未チェックが21件**であった。前回分析（Gap 4）はテストタスク8.1/8.2の未完了にのみ言及していたが、実際にはFoundation（1.x）・Core実装（2.x〜7.x）を含む**タスクリスト全体が未着手のマーキングのまま**である一方、対応する実装コード自体はすべて存在し前回分析で機能済みと確認されている。これは実装漏れではなく、逆引きspec生成時（2026-05-15）にtasks.mdのチェックボックスが実装状況と同期されなかった**進捗トラッキング上のドリフト**であり、設計フェーズでの技術判断には影響しないが、次回`/kiro-spec-status`や`/kiro-impl`実行時に誤って「未着手」と判断されるリスクがあるため記録する。

## 2. Requirements Feasibility Analysis（再確認）

前回分析のRequirement-to-Asset Map（要件1〜6すべて実装済み）は、コード差分が無いため**そのまま有効**。再検証で追加確認した事実:
- `src/app/api/digests/route.ts:34`（POST content検証）と`src/app/api/digests/[id]/route.ts:22`（PATCH content検証）の非対称性（前回Gap 1）は、該当行を再読し**現在も同一のコードのまま**であることを確認した。
- `src/lib/digest-service.ts`のtitle正規化（`title ?? null`のみで空文字列は素通り、前回Gap 2）も変更なし。
- `src/components/delete-digest-button.tsx`のエラーUI欠如（前回Gap 3）も変更なし。

新たなMissing（未実装のEARS要件）は検出されなかった。新たなUnknownとしては、上記「AI生成トリガーの要件スコープ」を「Research Needed」として計上する（下記参照）。

## 3. Implementation Approach Options（変更なし、再提示）

前回分析のOption A/B/Cは、対象コードが変化していないため**そのまま有効**。要約:
- **Option A（サービス層でバリデーション/正規化を一元化）**: POST/PATCHの基準を自動的に一致させられるが、design.mdの「バリデーションはAPIルート層」責任分担（243行目）と矛盾するため設計文書の改訂を伴う。
- **Option B（APIルート層のみ修正）**: design.mdの既存責任分担を維持したまま`route.ts`（POST）の空文字列チェックをPATCHと同一基準に揃える最小差分。重複ロジックが2箇所に残るリスクはある。
- **Option C（現状維持）**: 通常のUIフロー（DigestForm経由）では到達しないエッジケースのため見送り、記録のみ残す。

Gap 3（DeleteDigestButtonのエラーUI欠如）への対応は、Option A/Bいずれとも独立して`error`状態の追加のみで対応可能な点も変更なし。

## 4. Effort & Risk（再評価）

- **Effort**: S（1〜3日）— 前回評価から変更なし。対象ファイルが1日経過後も変化しておらず、修正範囲の見積り根拠（1〜2ファイルの局所修正）は引き続き妥当。
- **Risk**: Low — 変更なし。既存の正常系フロー（DigestForm経由のUI操作）に影響しない、既知パターンの延長線上の修正であることを再確認した。

## 5. Recommendations（設計フェーズ向け）

- **コードドリフトは検出されなかった**。2026-07-25時点の分析内容（Requirement-to-Asset Map、Gap 1〜4、Option A/B/C、Effort/Risk）はすべて現時点でも有効であり、設計フェーズはこの前提の上に進めてよい。
- **新規推奨事項**: `tasks.md`の全21項目が未チェックのまま実装が完了している状態は、今後`/kiro-impl digests`を誤って実行し重複実装を招くリスクがあるため、設計/タスクフェーズを再訪する際に`tasks.md`のチェックボックスを実装状況に合わせて更新することを推奨する（本Gap分析のスコープでは変更を加えず、記録のみ）。
- **Research Needed**: project description記載の「AIが生成した」ダイジェストという文言について、AI生成トリガー機能（例: 記事群からのダイジェスト自動生成API）が将来的に別スペックとして計画されているか、あるいは本スペックのスコープから意図的に除外されたのかをプロダクトオーナーに確認する。現行のrequirements.mdはこの点を明示的に扱っておらず、EARS要件からは判断できない。
- 優先順位は前回分析を踏襲: Gap 1（POST content空白バリデーション）を最優先、Gap 2（title空文字列正規化）は次回改修時のついで対応、Gap 3（削除失敗時UI）はチーム確認、Gap 4（テスト不在）はtasks.md 8.1/8.2として引き続き有効なTODO。
