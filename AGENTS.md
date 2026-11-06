# AGENTS.md

Three.js で歩くワールドを、`worlds/` 配下の独立したプロジェクトとして管理する。

このファイルは、Claude Code / Codex / Cursor が共通で参照するプロジェクト指示の正本です。エージェント固有のファイルには同じ手順を複製せず、このファイルと `docs/skills/` を参照します。

## スキル

手順の正本は `docs/skills/` です。一覧は `docs/skills/README.md`。

ワールド、建物、人物、生物、GLB を追加または修正するときは、先に `docs/skills/threejs-worlds.md` を読む。形状は blender-works で作り、採用した GLB は threejs-worlds へ配置した同じ作業で、blender-works の 3D モデルカタログにも掲載する。

ポインタは次の3か所にあり、中身は同じです。

- `.cursor/skills/threejs-worlds/SKILL.md`（Cursor）
- `.agents/skills/threejs-worlds/SKILL.md`（Codex）
- `.claude/skills/threejs-worlds/SKILL.md`（Claude Code）

## 作業時のルール

- 依頼と無関係な未コミット変更を、commit や整形に混ぜない。
- threejs-worlds の配置と blender-works のカタログ掲載は commit を分ける。
- 依頼された作業は、検証と差分確認を終えた論理単位ごとに commit し、そのまま設定済みのリモートへ push する。commit・push・既存の公開処理について毎回確認を求めない。ユーザーがその依頼で「pushしない」「ローカルのみ」などと指定した場合は従う。
- `main` への push 後は GitHub Actions のビルド・テストと Cloudflare Pages の本番反映を確認する。複数PJの移行では移行先の公開を確認してから旧URLの転送を公開する。失敗は原因を調べ、無関係な変更の追加やforce pushで回避しない。
