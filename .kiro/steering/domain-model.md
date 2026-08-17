# ドメインモデル

本アプリケーション（セルフホスト型 RSS リーダー）のソースコードを網羅的に調査し、要件とドメインを整理したもの。

ドメインの定義（何がコアで何が支援か、どの概念がどこに属するか）はこの文書を単一の情報源とする。
ディレクトリ構成の規約は `.kiro/steering/structure.md` が持ち、本書はその根拠にあたる。
ドメインの切り方を変えるときは、まず本書を更新してから structure.md を追随させる。

## 1. アプリケーションの要件（実装から抽出した要約）

| # | 要件 | 実現箇所 |
| --- | --- | --- |
| R1 | RSS/Atom フィードの URL を登録し、タイトル・説明・ファビコンを取得して保存する | `domain/feed` |
| R2 | 登録 URL は SSRF 検証（スキーム・長さ・名前解決先の private IP 判定）を通過したものだけを受け付ける | `domain/shared/ssrf-guard` |
| R3 | フィードの一覧・取得・編集（タイトル / 説明 / メモ）・削除ができる | `domain/feed` / `features/feed-management` |
| R4 | フィードから記事を取得して保存する。毎正時の cron と手動リフレッシュの 2 経路がある | `domain/entry`（同期） / `lib/cron` |
| R5 | 記事はフィードあたり最大 500 件を保持し、超過分は古いものから削除する | `domain/entry/entry-sync` |
| R6 | 記事一覧をフィード・タグ・タイトル検索・既読状態・嗜好スコアで絞り込める | `domain/entry/entry-repository` |
| R7 | 記事一覧は新しい順 / 古い順を切り替えられ、カーソルベースで追加読み込みする | `domain/entry` / `features/entry-viewing` |
| R8 | フィード横断の一覧では同一 URL の記事を重複排除して表示する | `domain/entry/entry-repository` |
| R9 | 記事を開くと自動的に既読になり、既読状態は同一 URL の記事すべてに連動する | `features/read-status` / `domain/entry/entry-sync` |
| R10 | 記事を「あとで読む」に登録し、専用ページで閲覧できる | `features/read-status` |
| R11 | 記事にタグを付与・除去でき、タグのリネーム・削除・一括付与ができる | `features/tag-management` |
| R12 | 嗜好テキストを登録し、外部スコアリングが付けたスコアで「好みの記事」を絞り込める | `features/preference-recommendations` |
| R13 | 好みの記事のスコアしきい値をアプリ全体設定として保持する | `features/preference-recommendations` |
| R14 | Markdown 形式のダイジェストを作成・閲覧・編集・削除できる | `features/digests` |
| R15 | キーボードショートカットをユーザーが変更でき、localStorage に永続化される | `features/settings` |
| R16 | OIDC による認証を行い、未認証アクセスをログインへ誘導する | `features/auth` / `middleware` |

## 2. ドメイン一覧

### コアドメイン: RSS コンテンツ（`src/domain/`）

このアプリの存在理由そのもの。「外部の RSS を取り込んで記事として保持する」という関心であり、
他のすべてのドメインはこれを参照する側に回る。ここだけは機能をまたいで共有されるため、
実装を `src/domain/` に一元化し、`src/features/` 側からの逆方向の依存を作らない。

| 概念 | 種別 | 説明 |
| --- | --- | --- |
| **Feed** | 集約ルート | 購読対象の RSS/Atom フィード。URL が同一性を決める（`url` は一意） |
| **Entry** | 集約ルート | フィードから取り込んだ記事。`(feedId, guid)` が同一性を決める |
| EntryMeta | Entry 配下のエンティティ | 記事ごとの既読 / あとで読むフラグ。Entry と 1:1 |
| EntryTag | 関連 | Entry と Tag の関連。Entry 集約から辿る |
| EntryListQuery | 値オブジェクト | 記事一覧の絞り込み条件一式。画面・追加読み込み・API の 3 者がこの 1 つの記述子だけを受け渡す |
| EntryPageParams | 値オブジェクト | 一覧のどの位置を取るか（offset 指定 / カーソル指定） |
| effectedDate | 不変条件 | 並び順の基準。`publishedAt ?? 取り込み日時`。`publishedAt` は null を取り得るため、並び替えとカーソル比較は必ず `effectedDate` + `id` の組で行う |

コアドメインが持つ責務:

- エンティティ型の定義（`entry.ts` / `feed.ts`）
- 永続化（`*-repository.ts`）— Prisma に触れてよいのは原則ここと各機能のサービスのみ
- 外部 RSS からの取り込み（`rss-fetcher.ts` / `entry-fetcher.ts` / `entry-sync.ts`）
- 一覧クエリ記述子の直列化・復元（`entry-list-query.ts`）

### 支援ドメイン（`src/features/`）

コアドメインの Entry / Feed に対して、ユーザーごとの意味づけや見せ方を与える。
それぞれ `.kiro/specs/` の 1 スペックに対応する。

| ドメイン | 中心概念 | 責務 |
| --- | --- | --- |
| **feed-management** | Feed | フィードの登録・編集・削除・手動リフレッシュの UI と API 型 |
| **entry-viewing** | Entry | 記事一覧の描画、無限スクロール、記事モーダル、並び替え・絞り込み UI |
| **read-status** | EntryMeta | 既読 / 未読・あとで読むの更新。既読は同一 link の記事へ連動させる |
| **tag-management** | Tag | タグの正規化（小文字化・トリム）・付与・除去・リネーム・削除・一括付与 |
| **preference-recommendations** | UserPreference / EntryPreferenceScore / AppSettings | 嗜好テキストの CRUD と、スコアしきい値による「好みの記事」の絞り込み |
| **digests** | Digest | Markdown ダイジェストの CRUD と描画 |
| **settings** | HotkeyConfig | キーボードショートカットの設定と localStorage への永続化 |
| **auth** | User / Session / Account | OIDC 認証、セッション取得、サインアウト |

### 汎用サブドメイン（`src/domain/shared/`, `src/lib/`, `src/components/ui/`）

ドメイン知識を持たない、あるいはドメインをまたいで使われる部品。

| 対象 | 置き場所 | 説明 |
| --- | --- | --- |
| Prisma クライアント | `domain/shared/db.ts` | シングルトン。開発時は 50ms 超のクエリを警告 |
| アプリケーションエラー | `domain/shared/errors.ts` | `AppError` と `ErrorCode`。HTTP ステータスを保持する |
| SSRF ガード | `domain/shared/ssrf-guard.ts` | 外部 URL を取得する前の検証 |
| cron スケジューラ | `lib/cron.ts` | 記事取得（毎時 00 分）とスコアリング（毎時 30 分） |
| UI プリミティブ | `components/ui/` | shadcn ベース。ビジネスロジックを持たない |
| レイアウト | `components/layout/` | サイドバーなどアプリ全体の骨格 |
| 汎用ユーティリティ | `lib/utils.ts`, `lib/motion.ts`, `hooks/` | クラス名結合、モーション定数、メディアクエリ |

## 3. 依存の方向

```
app/ (ページ・API ルート)
  ↓
features/<機能>/     ← 機能どうしは原則相互参照しない
  ↓
domain/              ← ここから上（features / app）を参照しない
  ↓
generated/prisma, shared
```

- コアドメインは `src/features/`・`src/app/`・`src/components/` の何も import しない。
  タグ関連型のようにコアが必要とする型は、機能側の型ではなく Prisma 生成型から直接導出する。
- 機能どうしは、画面の composition のために UI を借りるときだけ相互参照してよい。
  現状の相互参照は次の 2 つで、いずれも記事モーダル / 一覧が他機能の UI を埋め込むもの:
  - `entry-viewing` → `tag-management`（記事へのタグ付与 UI）
  - `entry-viewing` → `settings`（キーボードショートカット設定の読み込み）
  機能のサービス層（`lib/*-service.ts`）を他機能から呼ぶのは避け、共有が必要ならコアへ引き上げる。
- API ルートとページは薄く保ち、処理はドメイン層／機能のサービスに委譲する。
  現状 `app/api/health`・`app/api/tags/batch`・`app/api/entries/read-later-unread-count` の
  3 つのルートハンドラだけが Prisma を直接触っており、この原則から外れている（今回の再編では未着手）。
- 同じ実装へ 2 つ以上の import 経路を作らない（再エクスポートのシムを置かない）。
  経路が二重化すると「一元管理されている」という前提が静かに崩れるため。

## 4. ドメインと実装の対応

| ドメイン | 実装の置き場所 |
| --- | --- |
| コア: Entry | `src/domain/entry/` — `entry.ts` / `entry-repository.ts` / `entry-list-query.ts` / `entry-fetcher.ts` / `entry-sync.ts` |
| コア: Feed | `src/domain/feed/` — `feed.ts` / `feed-repository.ts` / `rss-fetcher.ts` |
| 汎用（コア基盤） | `src/domain/shared/` — `db.ts` / `errors.ts` / `ssrf-guard.ts` |
| 支援ドメイン各種 | `src/features/<機能>/` — `components/` / `lib/` / `types/` |
| 画面・API | `src/app/` |
| 共有 UI | `src/components/ui/`（デザインシステム）、`src/components/layout/`（骨格） |
| ドメイン知識を持たない部品 | `src/lib/`（cron / motion / utils）、`src/hooks/` |

ディレクトリの命名規約・テストの置き方・import の書き方は `.kiro/steering/structure.md` を参照。
本書はどの概念がどのドメインに属するかだけを定める。

## 5. 永続化スキーマとの対応

`prisma/schema.prisma` のモデルとドメインの対応:

| モデル | ドメイン |
| --- | --- |
| `Feed`, `Entry` | コア |
| `EntryMeta` | コア（型） / read-status（更新ロジック） |
| `Tag`, `EntryTag` | コア（型） / tag-management（操作） |
| `UserPreference`, `EntryPreferenceScore`, `AppSettings` | preference-recommendations |
| `Digest` | digests |
| `User`, `Session`, `Account`, `Verification` | auth（better-auth が管理） |
