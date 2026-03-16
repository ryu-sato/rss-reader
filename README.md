# RSS Reader

RSSリーダーWebアプリケーション。ユーザーがRSSフィードURLを登録・管理し、記事を閲覧できるサービス。

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript (strict mode)
- **スタイリング**: Tailwind CSS v4 + shadcn/ui
- **ORM**: Prisma
- **DB**: SQLite (`prisma/dev.db`)
- **RSSパース**: rss-parser
- **テスト**: Vitest + Testing Library

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env` ファイルを作成:

```env
DATABASE_URL="file:./dev.db"
```

### 3. データベースのセットアップ (TASK-0002以降)

```bash
npx prisma migrate dev --name init
npx prisma generate
```

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# テスト実行（ウォッチモード）
npm run test

# テスト実行（1回のみ）
npm run test:run

# カバレッジ付きテスト
npm run test:coverage

# ビルド
npm run build

# Lint
npm run lint
```

## プロジェクト構造

```
./
├── app/                      # Next.js App Router
│   ├── page.tsx              # フィード一覧ページ
│   ├── feeds/
│   │   ├── new/page.tsx      # フィード登録ページ
│   │   └── [id]/edit/page.tsx # フィード編集ページ
│   └── api/feeds/            # API Route Handlers
├── components/
│   ├── ui/                   # shadcn/ui コンポーネント
│   ├── feed-list.tsx
│   ├── feed-form.tsx
│   └── delete-confirm-dialog.tsx
├── lib/
│   ├── db.ts                 # Prisma クライアント
│   ├── feed-service.ts       # ビジネスロジック
│   ├── rss-fetcher.ts        # RSS取得・パース
│   └── ssrf-guard.ts         # SSRF対策
├── prisma/
│   ├── schema.prisma         # DBスキーマ
│   └── dev.db                # SQLiteファイル
├── docker-compose/           # docker-compose 関連ファイル
│   ├── docker-compose.yaml
│   ├── .env.docker-compose.example
│   ├── ngrok-start.sh
│   ├── update-app.sh
│   ├── update-app.service
│   └── update-app.timer
└── types/
    └── feed.ts               # 型定義
```

## 簡易トンネルによる公開方法（docker-compose）

### 概要

- ngrok でトンネルを張り、Google 認証 (OIDC/OAuth) で保護している
- docker-compose 関連ファイルは `docker-compose/` ディレクトリにまとめてある

### 起動方法

`docker-compose/` ディレクトリに `.env.docker-compose` を作成（`.env.docker-compose.example` を参考に）し、以下を実行:

```bash
cd docker-compose
docker compose up -d
```

### image 更新方法

`update-app.sh` を実行する:

```bash
cd /var/www/
sudo ./update-app.sh
```

毎時自動実行させるには関連ファイルを参照のこと。

### ngrok のドメインが変わったときの対応

1. Google 認証の承認 URL を変更する
2. Claude Code の cowork のプロンプトに書かれた URL を変える
3. Edge のインストール済みアプリを更新する

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
