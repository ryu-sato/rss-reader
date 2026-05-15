# Brief: settings

## Problem

キーボードショートカットをカスタマイズしたい。また嗜好スコアのしきい値を変更したい。設定はセッションをまたいで保持されるべき。

## Current State

実装済み。キーボードショートカットは localStorage に保存。嗜好スコアしきい値は AppSettings テーブルに保存。/settings ページでショートカットの設定・リセットが可能。

## Desired Outcome

ユーザーが /settings ページでキーボードショートカット（モーダルクローズ・前後ナビゲーション・既読トグル・あとで読む・元記事を開く）をカスタマイズし、デフォルトにリセットできる。嗜好スコアしきい値は /preferences ページで設定できる。

## Approach

キーボードショートカット: localStorage への JSON 保存。スコアしきい値: `PATCH /api/settings` エンドポイント + AppSettings テーブル（シングルトンレコード）。

## Scope

- **In**: キーボードショートカットの設定・リセット（localStorage）、/settings ページUI、ArticleModal でのホットキー読み込みと適用
- **Out**: 嗜好スコアしきい値の管理（preference-recommendations が担当）、認証設定

## Boundary Candidates

- /settings ページ
- キーボードショートカット設定UI コンポーネント
- localStorage ホットキー設定の読み書きユーティリティ
- ArticleModal のホットキー適用ロジック

## Out of Boundary

- AppSettings.preferredScoreThreshold（preference-recommendations が担当）
- 認証・セッション管理

## Upstream / Downstream

- **Upstream**: preference-recommendations（AppSettings を共有）
- **Downstream**: entry-viewing（ArticleModal がショートカット設定を読み込む）

## Existing Spec Touchpoints

- **Extends**: entry-viewing（ArticleModal のキーボードショートカット）
- **Adjacent**: preference-recommendations（AppSettings モデルを隣接して使用）

## Constraints

- キーボードショートカットは localStorage に保存し、SSRで読み込まないこと
- デフォルト値へのリセット機能を提供すること
- TypeScript strict モード
