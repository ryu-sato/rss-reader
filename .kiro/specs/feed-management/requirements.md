# Requirements Document

## Project Description (Input)

RSSフィードリーダーにおけるフィード管理機能。ユーザーがRSS/AtomフィードのURLを登録すると、フィードのメタデータ（タイトル・説明・ファビコン）とエントリーが自動取得・保存される。フィードの編集・削除・手動リフレッシュも提供する。SSRF攻撃を防ぐためURLバリデーションを必須とし、フィードあたり最大500件のエントリーを保持する。

## Requirements

### 1. フィードURL登録

ユーザーがRSS/AtomフィードのURLを入力してフィードを登録できる。

**受け入れ基準**

- 1.1: When ユーザーが有効なRSS/AtomフィードURLを送信する, the Feed Management System shall SSRFバリデーションを実行し、メタデータとエントリーを取得してフィードをDBに保存する
- 1.2: When フィード登録が成功する, the Feed Management System shall 登録されたフィード情報（タイトル・説明・ファビコンURL・lastFetchedAt）をレスポンスとして返す
- 1.3: If URLのフォーマットが不正（httpまたはhttpsで始まらない、2048文字超過、パース不能）の場合, the Feed Management System shall バリデーションエラーを返しフィードを保存しない
- 1.4: If 同一URLのフィードが既に登録済みの場合, the Feed Management System shall 重複エラー（FEED_ALREADY_EXISTS）を返す
- 1.5: If URLが解決するIPアドレスがプライベートIPレンジ（RFC1918、ループバック、リンクローカル等）に該当する場合, the Feed Management System shall SSRF保護エラー（URL_NOT_ALLOWED）を返す
- 1.6: If URLへのHTTPリクエストが失敗またはタイムアウトした場合, the Feed Management System shall フェッチエラー（FEED_FETCH_FAILED）を返す
- 1.7: If フェッチしたコンテンツが有効なRSS/Atomフィードでない場合, the Feed Management System shall フォーマットエラー（INVALID_FEED_FORMAT）を返す

### 2. フィードメタデータ取得

フィード登録時にメタデータを自動取得して保存する。

**受け入れ基準**

- 2.1: When フィードURLがフェッチされる, the RSS Fetcher shall フィードのタイトル・説明・ファビコンURL（RSS 2.0のimage.urlまたはAtomのicon）を抽出する
- 2.2: If フィードにタイトルが存在しない場合, the RSS Fetcher shall URLをフィードタイトルとして使用する
- 2.3: If フィードに説明やファビコンURLが存在しない場合, the RSS Fetcher shall それらをnullとして保存する
- 2.4: The Feed Management System shall フェッチ完了日時をlastFetchedAtとして記録する

### 3. フィードエントリー取得・保存

フィードリフレッシュ時にエントリーを取得し保存する。エントリー管理の上限・重複排除・画像抽出を含む。

**受け入れ基準**

- 3.1: When フィードがリフレッシュされる, the Entry Service shall フィードURLからエントリー一覧を取得し、guidによる重複排除を行った上で保存する
- 3.2: The Entry Service shall エントリー画像URLをRSS enclosure・media:content・media:thumbnail・itunes:image・コンテンツ内imgタグの優先順位で抽出する
- 3.3: If エントリーにRSSフィードからの画像が存在しない場合, the Entry Service shall エントリーのlinkページからOGP画像（og:imageまたはtwitter:image）を取得する
- 3.4: When フィードのエントリー総数が500件を超える場合, the Entry Service shall publishedAtが古い順にエントリーを削除して上限を500件以内に維持する
- 3.5: When 既読リンクと同一URLを持つ新規エントリーが保存される場合, the Entry Service shall その新規エントリーを自動的に既読状態にする
- 3.6: The Entry Service shall フィードリフレッシュ完了後にfeed.lastFetchedAtを更新する
- 3.7: If 特定フィードのエントリー取得に失敗する場合, the Entry Service shall そのフィードをスキップして他のフィードの処理を継続する

### 4. フィード一覧表示

登録済みフィードの一覧を未読数・最新投稿日時と共に表示する。

**受け入れ基準**

- 4.1: The Feed Management System shall 登録済みの全フィードをフィードIDと共に返す
- 4.2: The Feed Management System shall 各フィードの未読エントリー数（EntryMetaが存在しないまたはisReadがfalseのエントリー数）を返す
- 4.3: The Feed Management System shall 各フィードの最新エントリー公開日時（lastPublishedAt）を返す
- 4.4: The Feed Management System shall フィード一覧を最新エントリー公開日時の降順でソートし、lastPublishedAtがnullのフィードは末尾に表示する

### 5. フィード詳細取得

フィードIDを指定して単一フィードの詳細情報を取得できる。

**受け入れ基準**

- 5.1: When 有効なフィードIDを指定してフィード詳細を取得する, the Feed Management System shall フィードの全フィールド（title・description・url・faviconUrl・memo・lastFetchedAt等）を返す
- 5.2: If 指定されたフィードIDが存在しない場合, the Feed Management System shall 404エラー（FEED_NOT_FOUND）を返す

### 6. フィード編集

登録済みフィードのタイトル・説明・メモを編集できる。

**受け入れ基準**

- 6.1: When ユーザーがフィードのタイトル・説明・メモを送信する, the Feed Management System shall 更新されたフィード情報をDBに保存して返す
- 6.2: If 編集でタイトルが空文字に設定される場合, the Feed Management System shall バリデーションエラーを返す
- 6.3: The Feed Management System shall URLは編集対象から除外する（URLは変更不可）
- 6.4: If 編集対象のフィードIDが存在しない場合, the Feed Management System shall 404エラー（FEED_NOT_FOUND）を返す

### 7. フィード削除

登録済みフィードを削除できる。

**受け入れ基準**

- 7.1: When ユーザーが特定のフィードを削除する, the Feed Management System shall そのフィードとカスケードで関連エントリーをDBから削除する
- 7.2: If 削除対象のフィードIDが存在しない場合, the Feed Management System shall 404エラー（FEED_NOT_FOUND）を返す
- 7.3: When フィード削除が成功する, the Feed Management System shall 成功レスポンスを返す

### 8. 手動リフレッシュ

全フィードのエントリーを手動で一括更新できる。

**受け入れ基準**

- 8.1: When 手動リフレッシュがトリガーされる, the Feed Management System shall 全登録フィードに対してSSRFバリデーションを再実行した上でエントリーを取得・保存する
- 8.2: When 手動リフレッシュが完了する, the Feed Management System shall 成功レスポンスを返す
- 8.3: If リフレッシュ中にエラーが発生した場合, the Feed Management System shall サーバーエラー（500）を返す

### 9. SSRF保護

全フィードURL操作においてSSRF攻撃を防止する。

**受け入れ基準**

- 9.1: The Feed Management System shall 全フィードURLへのHTTPリクエスト前に必ずSSRFバリデーション（validateUrl）を実行する
- 9.2: The SSRF Guard shall URLのプロトコルがhttpまたはhttpsであることを検証する
- 9.3: The SSRF Guard shall URLの長さが2048文字以下であることを検証する
- 9.4: The SSRF Guard shall DNSルックアップにより解決された全IPアドレスがプライベートIPレンジ外であることを検証する
- 9.5: The SSRF Guard shall IPv4（RFC1918・ループバック・リンクローカル・CGNAT）およびIPv6（ループバック・リンクローカル・ユニークローカル）のプライベートアドレスを拒否する

### 10. フィード管理UI

フィード管理のためのWebインターフェースを提供する。

**受け入れ基準**

- 10.1: When ユーザーがフィード管理ページにアクセスする, the Feed Management UI shall 登録済みフィードの一覧をタイトル・URLと共に表示する
- 10.2: While フィード一覧がロード中, the Feed Management UI shall スケルトンUIを表示する
- 10.3: If 登録済みフィードが存在しない場合, the Feed Management UI shall フィード追加を促す空状態UIを表示する
- 10.4: When ユーザーがフィードを削除する, the Feed Management UI shall 確認ダイアログを表示した後に削除APIを呼び出す
- 10.5: When フィード追加フォームにURLを入力して送信する, the Feed Management UI shall 登録中はローディング状態を表示しエラー時にはエラーメッセージを表示する
- 10.6: When フィード編集フォームでタイトル・説明・メモを更新して保存する, the Feed Management UI shall 更新APIを呼び出し成功後にフィード一覧へリダイレクトする
