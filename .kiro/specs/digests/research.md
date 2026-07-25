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
