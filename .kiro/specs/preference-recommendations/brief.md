# Brief: preference-recommendations

## Problem

ユーザーが関心のあるトピック（例：「機械学習」「Python」）を定義し、それに合致した記事を優先して読みたい。

## Current State

実装済み。UserPreference モデルでユーザー定義の嗜好テキストを管理。EntryPreferenceScore モデルでエントリーごとのスコアを保存。スコアしきい値（0.0〜1.0）で「好みの記事」をフィルタリング。嗜好ごと・全嗜好のエントリーページが存在。

## Desired Outcome

ユーザーが嗜好テキストを管理し（追加・編集・削除）、スコアしきい値を設定できる。嗜好ごと、または全嗜好OR条件でエントリーをフィルタリングして閲覧できる。

## Approach

PreferenceService + AppSettings。`/api/preferences/*` と `/api/settings` エンドポイント。スコアリング自体は外部システムが担当し、EntryPreferenceScore テーブルへの書き込みは外部から行われる前提。

## Scope

- **In**: 嗜好の作成・一覧・更新・削除、スコアしきい値の設定・保存（AppSettings）、単一嗜好・全嗜好によるエントリーフィルタリング、嗜好別エントリーページ（/preferred/[id]）、全嗜好エントリーページ（/preferred/all）
- **Out**: エントリースコアリングロジック（外部システム）、エントリー閲覧モーダル（entry-viewing が担当）

## Boundary Candidates

- PreferenceService（DB操作）
- AppSettings / SettingsService（しきい値管理）
- Preference API Routes（/api/preferences/*, /api/settings）
- /preferences ページ
- /preferred/* ページ群
- サイドバーの「お好みの記事」セクション

## Out of Boundary

- スコアリングエンジン（外部システム）
- キーボードショートカット設定（settings が担当）

## Upstream / Downstream

- **Upstream**: entry-viewing（エントリー表示基盤）
- **Downstream**: settings（AppSettings.preferredScoreThreshold を共有）

## Existing Spec Touchpoints

- **Extends**: entry-viewing（エントリーAPIにスコアフィルターを追加）
- **Adjacent**: settings（AppSettings モデルを共有）

## Constraints

- しきい値は 0.0〜1.0 の範囲で検証すること
- スコアリングエンジンは外部依存とし、スペック内に含めない
- TypeScript strict モード
