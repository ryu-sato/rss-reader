# RSS Reader

セルフホスト型の RSS リーダー Web アプリケーション。RSS/Atom フィードを登録すると記事を自動で取り込み、
既読管理・タグ分類・「あとで読む」・嗜好スコアによる絞り込み・Markdown ダイジェストを備えた画面で閲覧できる。

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router) + React 19
- **言語**: TypeScript (strict mode)
- **スタイリング**: Tailwind CSS v4 + shadcn/ui
- **ORM**: Prisma 7 + LibSQL アダプタ
- **DB**: SQLite (開発時は `prisma/dev.db`)
- **認証**: better-auth (OIDC)
- **RSSパース**: rss-parser
- **定期実行**: node-cron（記事取得: 毎時 00 分 / 嗜好スコアリング: 毎時 30 分）
- **PWA**: Serwist (Service Worker)
- **環境変数**: dotenvx
- **テスト**: Vitest + Testing Library

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env`（または `.env.development`）を作成:

```env
DATABASE_URL="file:./dev.db"

# 認証 (better-auth + OIDC)
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="<ランダムな長い文字列>"
OIDC_CLIENT_ID="<OIDCプロバイダのクライアントID>"
OIDC_CLIENT_SECRET="<OIDCプロバイダのクライアントシークレット>"
OIDC_DISCOVERY_URL="<https://.../.well-known/openid-configuration>"
```

### 3. データベースのセットアップ

```bash
pnpm exec prisma migrate dev
pnpm exec prisma generate
```

## 開発コマンド

```bash
# 開発サーバー起動
pnpm dev

# テスト実行（ウォッチモード）
pnpm test

# テスト実行（1回のみ）
pnpm test:run

# カバレッジ付きテスト
pnpm test:coverage

# ビルド
pnpm build

# Lint
pnpm lint

# 型チェック
pnpm typecheck
```

## プロジェクト構造

コアドメイン（RSS コンテンツ = Feed / Entry）を `src/domain/` に一元化し、その上に機能モジュールを重ねる構成。
依存は `app` → `features` → `domain` の一方向で、`domain` は上位を参照しない。
詳細は `.kiro/steering/structure.md`、ドメインの定義は `.kiro/steering/domain-model.md` を参照。

```
src/
├── domain/                    # コアドメイン（RSSコンテンツ）
│   ├── entry/                 # Entry: 型・永続化・一覧クエリ・RSS取り込み・同期
│   ├── feed/                  # Feed: 型・永続化・フィードメタ取得
│   └── shared/                # Prismaクライアント・AppError・SSRFガード
├── features/                  # 機能モジュール（.kiro/specs/ の各スペックに対応）
│   ├── feed-management/       # フィードの登録・編集・削除
│   ├── entry-viewing/         # 記事一覧・記事モーダル・無限スクロール
│   ├── read-status/           # 既読 / あとで読む
│   ├── tag-management/        # タグ付与・一括タグ付け
│   ├── preference-recommendations/  # 嗜好テキストとスコアしきい値
│   ├── digests/               # Markdownダイジェスト
│   ├── settings/              # キーボードショートカット設定
│   └── auth/                  # OIDC認証
├── app/                       # Next.js App Router（ページ・APIルート）
├── components/
│   ├── ui/                    # shadcn/ui プリミティブ
│   └── layout/                # サイドバーなどアプリ全体の骨格
├── lib/                       # 汎用ユーティリティ（cron / motion / utils）
├── hooks/                     # 汎用フック
└── generated/prisma/          # Prisma生成コード（手で編集しない）

prisma/
├── schema.prisma              # DBスキーマ
└── migrations/                # マイグレーション
scripts/scoring/               # 嗜好スコアリング（Python、外部プロセス）
docker-compose/                # セルフホスト用のcompose一式
.kiro/                         # スペック駆動開発の steering / specs
```

## トンネルによる公開方法（docker-compose）

### 概要

- `docker-compose/compose.yaml` は次の 2 コンテナ構成。リバースプロキシは使っていない
  - `app`: `ghcr.io/ryu-sato/rss-reader` を 3000 番で公開。`/api/health` に healthcheck を張り、
    DB は名前付きボリューム `db-data` を `/app/data` にマウントして永続化する
  - `tunnel`: `cloudflare/cloudflared` で Cloudflare Tunnel を張る
- アクセスは OIDC 認証で保護している（プロバイダは `OIDC_DISCOVERY_URL` で指定）

### 起動方法

`docker-compose/` ディレクトリに次の 2 ファイルを用意してから起動する:

- `.env` — `CLOUDFLARE_TUNNEL_TOKEN` を記載（compose がトンネル起動時に参照する）
- `.env.app.secret` — `BETTER_AUTH_URL` / `NEXT_PUBLIC_BETTER_AUTH_URL` / `BETTER_AUTH_SECRET` /
  `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` / `OIDC_DISCOVERY_URL` を記載（app の `env_file`）

```bash
cd docker-compose
docker compose up -d
```

`DATABASE_URL` は compose 側で `file:/app/data/db.sqlite` を指定済みなので、`.env.app.secret` に書く必要はない。
マイグレーションはコンテナ起動時に `entrypoint.js` が `prisma migrate deploy` を実行する。

### image 更新方法

`update-app.sh` を実行する:

```bash
cd /var/www/
sudo ./update-app.sh
```

このスクリプトは `docker compose pull` して app イメージに更新があるときだけ再起動し、
healthcheck が通らなければ**直前のイメージへ自動でロールバック**する。
同ディレクトリに `.env.deploy` を置いて `NTFY_TOPIC` を設定すると、更新・ロールバックの結果が ntfy.sh に通知される。

毎時自動実行させるには関連ファイルを参照のこと。

### 公開 URL が変わったときの対応

1. OIDC プロバイダ側のリダイレクト URL（承認済み URL）を変更する
2. `.env.app.secret` の `BETTER_AUTH_URL` / `NEXT_PUBLIC_BETTER_AUTH_URL` を新しい URL に更新して `docker compose up -d`
3. インストール済み PWA を更新する

### 関連ファイル

#### 自動 image 更新 (systemd)

`www` ユーザーを追加:

```bash
sudo useradd -s /sbin/nologin www
sudo usermod -G docker www
```

`docker-compose/update-app.service` を `/etc/systemd/system/update-app.service` に配置:

```ini
[Unit]
Description=Update App Script

[Service]
Type=oneshot
WorkingDirectory=/var/www
ExecStart=/bin/bash /var/www/update-app.sh
User=www
```

`docker-compose/update-app.timer` を `/etc/systemd/system/update-app.timer` に配置:

```ini
[Unit]
Description=Run update-app.sh periodically

[Timer]
OnCalendar=*-*-* *:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

#### timer を登録する場合

```bash
# 設定を再読み込み
sudo systemctl daemon-reload

# タイマーを有効化（自動起動ON）
sudo systemctl enable update-app.timer

# タイマーを今すぐ起動
sudo systemctl start update-app.service
```

**確認:**

```bash
# タイマーの状態確認
sudo systemctl status update-app.timer

# 全タイマー一覧と次回実行時刻
systemctl list-timers

# ログ確認
journalctl -u update-app.service
```

#### timer を更新した場合

```bash
sudo systemctl daemon-reload
```
