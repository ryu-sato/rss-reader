# RULE-agent-rule-authoring-style: エージェントルールは Agent Rule Authoring の規約に従って書く

## 背景・理由

ルールファイルの形式が書き手ごとにばらつくと、エージェントは条件・理由・参照先をファイルごとに異なる構造から読み取ることになり、守るべき条件を取り違える。規約の置き場所を固定しないまま書き始めると、ルールを追加するたびに形式を再発明することになる。

## 適用条件

- agent-rule-authoring-style-1: When エージェントが `.claude/rules/` 配下のファイルを新規作成しようとする（ユーザーからの直接依頼か他作業の副産物かによらず、また `/kiro-*` 経由かどうかにもよらず）, the Agent shall 着手前に `.claude/output-styles/agent-rule-authoring.md` を通読する.
- agent-rule-authoring-style-2: When エージェントが `.claude/rules/` 配下のファイルを編集しようとする, the Agent shall 着手前に `.claude/output-styles/agent-rule-authoring.md` を通読し、その記述規約に従って編集する.
- agent-rule-authoring-style-3: If 編集対象以外の既存ルールが規約の形式に従っていないことに気づく, then the Agent shall 依頼された範囲を超えて書き換えず、不一致をユーザーに報告する.

## 管理

- 単一の情報源: `.claude/output-styles/agent-rule-authoring.md`（同ファイルは output style としても機能する）
- 独立ファイルの理由: `CLAUDE.md` は cc-sdd が生成・更新するため、転記すると上書きで失われる
- frontmatter に `paths` を付けない理由: `paths` の発火条件が下記のとおりで、このルールの主要な適用条件を取りこぼす
  - 引き金はファイルの読み取りであり、あらゆるツール実行で発火するわけではない — 公式ドキュメント `https://code.claude.com/docs/en/memory` 記載
  - 発火するのは Read ツールと IDE でのファイルオープンのみで、Edit / Write / Grep / Glob / Bash では発火しない（Edit は事前の Read で結果的に発火する）（v2.1.220 の実装で確認）
  - 新規ファイル作成では Read が走らないため発火しない。`paths` を付けると条件 `agent-rule-authoring-style-1` が事実上無効になる（v2.1.220 の実装で確認）
  - 注入はトリガーとなった Read の完了後、次のモデル呼び出し時。`paths` は「着手前に読む」を保証しない（同）
  - グロブはプロジェクトルートからの相対パスに対して gitignore 構文で評価され、プロジェクト外のパスはマッチしない（同）