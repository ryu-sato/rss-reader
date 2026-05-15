# Requirements Document

## Project Description (Input)

RSSフィードリーダーにおける既読/未読管理とあとで読む機能。エントリーごとに isRead（既読）と isReadLater（あとで読む）フラグを管理する。モーダルで記事を開くと自動的に既読化される。同一URLを持つ複数エントリーの既読状態はリンクベースで同期される。専用の「あとで読む」ページで保存した記事を閲覧できる。サイドバーとブラウザバッジで未読数を表示する。

## Requirements

### 1. 既読フラグ管理

**1.1** When ユーザーが記事モーダルを開いた場合、the Read Status Service shall 対象エントリーを自動的に既読（isRead: true）としてマークする。

**1.2** When ユーザーがモーダルのツールバーで「既読にする」ボタンを押した場合、the Read Status Service shall 対象エントリーの isRead を true に更新する。

**1.3** When ユーザーがモーダルのツールバーで「未読に戻す」ボタンを押した場合、the Read Status Service shall 対象エントリーの isRead を false に更新する。

**1.4** The Read Status Service shall 既読/未読トグルボタンを、キーボードショートカット（設定可能なキー）でも操作できる。

**1.5** If 既読フラグの更新APIリクエストが失敗した場合、the Read Status Service shall ボタンの状態を元の値に戻す（楽観的更新のロールバック）。

---

### 2. あとで読むフラグ管理

**2.1** When ユーザーがモーダルのツールバーで「あとで読む」ボタンを押した場合、the Read Status Service shall 対象エントリーの isReadLater を true に更新する。

**2.2** When ユーザーがモーダルのツールバーで「保存済み」ボタン（既にあとで読む状態）を押した場合、the Read Status Service shall 対象エントリーの isReadLater を false に更新する。

**2.3** The Read Status Service shall あとで読むトグルボタンを、キーボードショートカット（設定可能なキー）でも操作できる。

**2.4** If あとで読むフラグの更新APIリクエストが失敗した場合、the Read Status Service shall ボタンの状態を元の値に戻す（楽観的更新のロールバック）。

**2.5** While あとで読むフラグを更新中の場合、the Read Status Service shall ボタンを無効化して重複リクエストを防ぐ。

---

### 3. リンクベースシブリング同期

**3.1** When ユーザーが任意のエントリーの isRead を更新した場合、the Read Status Service shall 同一 link URL を持つすべてのエントリーに同じ isRead 状態を伝播させる。

**3.2** When 新しいエントリーが保存（フィード取得）される場合、the Read Status Service shall 同一 link URL を持つ既読エントリーが存在するとき、新規エントリーを既読状態で作成する。

**3.3** The Read Status Service shall isRead の伝播処理において、isReadLater フラグは対象エントリーのみに適用し、シブリングエントリーには伝播させない。

---

### 4. フラグ更新API

**4.1** The Read Status Service shall `PUT /api/entries/[id]/meta` エンドポイントで isRead および isReadLater の更新を受け付ける。

**4.2** The Read Status Service shall リクエストボディで isRead または isReadLater のいずれか一方のみ、あるいは両方を同時に更新できる。

**4.3** If 指定されたエントリーIDが存在しない場合、the Read Status Service shall 404 エラーを返す。

**4.4** If サーバー内部エラーが発生した場合、the Read Status Service shall 500 エラーを返す。

**4.5** When PUT リクエストが成功した場合、the Read Status Service shall 更新後の EntryMeta オブジェクトをレスポンスとして返す。

---

### 5. UIイベントによる状態同期

**5.1** When 既読フラグが更新された場合、the Read Status Service shall `entry:read` または `entry:unread` カスタムイベントを window に dispatch する。

**5.2** When あとで読むフラグが更新された場合、the Read Status Service shall `entry:updated` カスタムイベントを window に dispatch する。

**5.3** When `entry:read` または `entry:unread` イベントが dispatch された場合、the Sidebar shall フィードの未読カウントを再取得して表示を更新する。

**5.4** When `entry:updated` イベントが dispatch された場合、the Sidebar shall あとで読む未読数を再取得して表示を更新する。

---

### 6. あとで読む一覧ページ

**6.1** The Read Status Service shall `/read-later` パスで、isReadLater が true のエントリー一覧を表示するページを提供する。

**6.2** The Read Status Service shall あとで読む一覧を、新しい順（降順）または古い順（昇順）で表示でき、URLクエリパラメータで状態を管理する。

**6.3** The Read Status Service shall あとで読む一覧の件数を画面上部に表示する。

**6.4** When あとで読む一覧ページでエントリーの `entry:updated` イベントが発生した場合、the Read Status Service shall 当該エントリーを一覧から除去する。

---

### 7. サイドバー未読数表示

**7.1** The Read Status Service shall サイドバーの「全ての記事」項目に、全フィードの未読エントリー総数をバッジとして表示する。

**7.2** The Read Status Service shall サイドバーの「あとで読む」項目に、isReadLater が true かつ isRead が false のエントリー数をバッジとして表示する。

**7.3** The Read Status Service shall `GET /api/entries/read-later-unread-count` エンドポイントで、isReadLater が true かつ isRead が false のエントリー数を返す。

---

### 8. ブラウザ/PWAバッジ通知

**8.1** When 全フィードの未読エントリー総数が変化した場合、the Read Status Service shall `navigator.setAppBadge(count)` でブラウザ/PWA バッジ通知を更新する。

**8.2** When 全フィードの未読エントリー総数が 0 になった場合、the Read Status Service shall `navigator.clearAppBadge()` でブラウザ/PWA バッジをクリアする。

**8.3** Where ブラウザが `setAppBadge` API をサポートしている場合、the Read Status Service shall バッジ通知を表示する。

---

### 9. 境界・スコープ外要件

> 本フィーチャーのスコープ外であることを明示する。

- エントリー一覧の表示・フィルタリングUI（カードグリッド・無限スクロール）は entry-viewing が担当
- フィードごとの未読カウント計算クエリは entry-viewing（EntryService.findManyEntries）が担当
- タグの付与・削除・管理は tag-management が担当
- 記事モーダルの全文表示・スワイプ・ナビゲーション全体は entry-viewing（ArticleModal）が担当
  - ただし、モーダル内の既読/あとで読むボタンとそのAPI呼び出しは本フィーチャーが担当する
