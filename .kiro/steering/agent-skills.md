# Agent Skills (kiro以外)

kiroのスペック駆動ワークフロー(`kiro-*`)とは別に、UI/UX・パフォーマンス領域を担当する再利用可能なClaude Skillsが導入されている。これらはコードではなく「作業方針」を提供するツールなので、いつどれを参照するかの判断がプロジェクト記憶として重要になる。

## 導入されているSkill

### apple-design
ジェスチャー操作・スプリングアニメーション・ドラッグ/スワイプ/シート・慣性(momentum)・半透明素材・タイポグラフィの微調整・reduced-motion対応など、**「触感」を伴うインタラクション**の設計/レビューに使う。
- 核となる考え方: モーションは現在の画面上の値から始まり、ユーザーの速度を引き継ぎ、いつでも掴んで反転できる(interruptible)べき
- 静的なレイアウトや配色の判断には使わない — それは ui-ux-pro-max の領域

### ui-ux-pro-max
レイアウト、配色パレット、フォントペアリング、コンポーネントのスタイリング、アクセシビリティ、チャート選定など、**UI構造・視覚デザインの意思決定**に使う。
- 実装に入る前のマクロな設計判断(ページ全体のレイアウト、ダッシュボードの配置、配色システムなど)に向く
- shadcn/uiベースの本プロジェクトのコンポーネント構成と相性が良い

### vercel-react-best-practices
React/Next.jsの**パフォーマンスと実装品質**のレビュー・リファクタリングに使う。レンダリング最適化、バンドル削減、Server/Client Componentsの使い分け、データフェッチングのパターンなど。
- `/src/` 配下の `.tsx`/`.ts` を書く・レビューするときはデフォルトで意識する対象
- 見た目に関わらない実装レベルの話が中心

## 使い分けの指針

3つは競合ではなく補完関係にある。例えば「ドラッグで開閉するボトムシート」を実装する場合:
1. **ui-ux-pro-max** — シートの配色・余白・全体レイアウトを先に決める
2. **apple-design** — ドラッグ/スプリングの挙動、慣性、途中で止めた時の振る舞いを設計する
3. **vercel-react-best-practices** — state/effect の組み方、再レンダリングの抑制など実装の質を担保する

迷ったときの優先順位:
- 見た目・構造の話が先に来る → ui-ux-pro-max
- 動き・ジェスチャーの話に踏み込む → apple-design を追加で参照
- `.tsx` を書く/直す作業には常に vercel-react-best-practices の観点を通す

## メンテナンス

- 実体は `.claude/skills/` に通常ファイルとして格納されている(vendored)。以前は `.agents/skills/` との併用・シンボリックリンク構成だったが、Claude Code専用運用に一本化したため廃止した。
- `apple-design` は https://github.com/emilkowalski/skills から `git subtree` で取り込んだもの(現在のprefixは `.claude/skills/apple-design`)。`.git/config` に参照用remote `apple-design-skills` がある。更新は手編集ではなく、subtree split→pullの手順で行うこと。
- これらのSkill自体のルール内容を他のsteeringファイルに転記しない。参照する場合はSkill名でリンクする。
