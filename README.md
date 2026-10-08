# Three.js Worlds

Three.js のワールドを、`worlds/` 配下の独立したプロジェクトとして管理します。[エントランス](./worlds/entrance/README.md) から [cyberpunk](./worlds/cyberpunk/README.md)、[水族館](./worlds/aquarium/README.md)、[宇宙](./worlds/cosmos/README.md)、[古都](./worlds/heian/README.md)、[渋谷](./worlds/shibuya/README.md)、[秋葉原](./worlds/akihabara/README.md)、[新宿](./worlds/shinjuku/README.md) へ移動できます。

## 公開ワールド

以下のリンクから各ワールドを体験できます。

| ワールド | 内容 |
| --- | --- |
| [エントランス（ORBIT）](https://threejs-worlds.pages.dev/) | 各ワールドへつながるギャラリーです。 |
| [水族館（PELAGIC）](https://threejs-worlds.pages.dev/aquarium/) | 魚群やエイ、ウミガメ、クラゲが泳ぐ水族館です。 |
| [サイバーパンク（AFTERLIGHT）](https://threejs-worlds.pages.dev/cyberpunk/) | 雨とネオンに包まれた街です。 |
| [宇宙（APHELION）](https://threejs-worlds.pages.dev/cosmos/) | 環のある惑星と星雲を眺める観測甲板です。 |
| [古都（HEIAN）](https://threejs-worlds.pages.dev/heian/) | 朝霧のなか、朱雀門と庭の池を歩く古都です。 |
| [渋谷（SCRAMBLE）](https://threejs-worlds.pages.dev/shibuya/) | 夕方のスクランブル交差点です。 |
| [秋葉原（AKIBA）](https://threejs-worlds.pages.dev/akihabara/) | 縦看板が並ぶ電気街です。 |
| [新宿（SHINJUKU）](https://threejs-worlds.pages.dev/shinjuku/) | 夜の大通りと都庁のツインタワーです。 |

## 構成

```text
worlds/
  entrance/          # ORBIT：各ワールドの入口
  cyberpunk/         # AFTERLIGHT：雨とネオンの街
  aquarium/          # PELAGIC：静かな海の水族館
  cosmos/            # APHELION：遠い軌道の宇宙
  heian/             # HEIAN：朝霧の古都
  shibuya/           # SCRAMBLE：渋谷の交差点
  akihabara/         # AKIBA：秋葉原の電気街
  shinjuku/          # SHINJUKU：新宿の夜の塔
shared/              # ワールド一覧・描画・操作の共通処理
scripts/             # まとめて起動・ビルド結果の集約
package.json
package-lock.json
```

npm workspaces を使い、各ワールドがソース・素材・資料・ビルド設定を持ちます。Node.js 22.12 以降が必要です。

## 起動・ビルド

リポジトリのルートで実行します。

```sh
npm install
npm run dev                 # 全ワールドを同じ URL 配下で起動します
npm run build               # 全ワールドをビルドします
npm run preview             # ビルド結果を確認します
npm test                    # ビルド後に各ワールドの配信を確認します
```

開発時は `http://localhost:5173`、プレビュー時は `http://localhost:4173` を開いてください。

| ワールド | パス |
| --- | --- |
| エントランス | `/` |
| cyberpunk | `/cyberpunk/` |
| 水族館 | `/aquarium/` |
| 宇宙 | `/cosmos/` |
| 古都 | `/heian/` |
| 渋谷 | `/shibuya/` |
| 秋葉原 | `/akihabara/` |
| 新宿 | `/shinjuku/` |

各ワールドの `dist/` に加え、ルートの `dist/` にサイト全体を集約します。公開する場合はルートの `dist/` をサイトのルートに配置してください。

個別作業には `dev:entrance`・`dev:cyberpunk`・`dev:aquarium`・`dev:cosmos`・`dev:heian`・`dev:shibuya`・`dev:akihabara`・`dev:shinjuku` も使えます。個別起動では各ワールドが別のポートになるため、ワールド間の往復は `npm run dev` で確認してください。`build:<ワールド名>` と `preview:<ワールド名>` も使えます。

## Cloudflare Pages での公開

GitHub のリポジトリを連携し、以下の設定でサイト全体を公開します。

| 項目 | 設定 |
| --- | --- |
| 本番ブランチ | `main` |
| ルートディレクトリ | リポジトリのルート |
| ビルドコマンド | `npm run build` |
| 出力ディレクトリ | `dist` |
| Node.js | `.node-version` の `24` |

`main` に変更を push すると自動で更新されます。静的ファイルのみを配信するため、Cloudflare Pages の無料枠で運用できます。

## 今後の追加方針

砂漠やオーロラのある雪のワールドも同じ階層に追加する予定です。

新しいワールドは `worlds/<ワールド名>/` に配置し、`package.json` に一意な名前と `dev`・`build`・`preview` コマンドを定義します。Vite の `base` は `/<ワールド名>/` に設定し、エントランスの一覧は `shared/worlds.js` に追加します。追加後にルートで `npm install` を実行し、更新した `package-lock.json` もコミットします。

水族館は [制作仕様](./worlds/aquarium/MODEL_BRIEF.md) の生きもののうち、ジンベエザメを blender-works の GLB で配置しています。街の建物と人物も同じく blender-works で作り、各ワールドの `public/models/` に置いています。
