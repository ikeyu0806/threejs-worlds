# Three.js Worlds

Three.js のワールドを、`worlds/` 配下の独立したプロジェクトとして管理します。[エントランス](./worlds/entrance/README.md) から [cyberpunk](./worlds/cyberpunk/README.md)、[水族館](./worlds/aquarium/README.md)、[宇宙](./worlds/cosmos/README.md) へ移動できます。

## 公開ワールド

以下のリンクから各ワールドを体験できます。

| ワールド | 内容 |
| --- | --- |
| [エントランス（ORBIT）](https://threejs-worlds.pages.dev/) | 各ワールドへつながるギャラリーです。 |
| [水族館（PELAGIC）](https://threejs-worlds.pages.dev/aquarium/) | ジンベエザメと7種の魚・エイが泳ぐ、Kuroshio大水槽です。 |
| [サイバーパンク（AFTERLIGHT）](https://threejs-worlds.pages.dev/cyberpunk/) | 雨とネオンに包まれた街です。 |
| [宇宙（APHELION）](https://threejs-worlds.pages.dev/cosmos/) | 環のある惑星と星雲を眺める観測甲板です。 |

## 構成

```text
worlds/
  entrance/          # ORBIT：各ワールドの入口
  cyberpunk/         # AFTERLIGHT：雨とネオンの街
  aquarium/          # PELAGIC：ジンベエザメの大水槽
  cosmos/            # APHELION：遠い軌道の宇宙
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

各ワールドの `dist/` に加え、ルートの `dist/` にサイト全体を集約します。公開する場合はルートの `dist/` をサイトのルートに配置してください。

個別作業には `dev:entrance`・`dev:cyberpunk`・`dev:aquarium`・`dev:cosmos` も使えます。個別起動では各ワールドが別のポートになるため、ワールド間の往復は `npm run dev` で確認してください。`build:<ワールド名>` と `preview:<ワールド名>` も使えます。

## Cloudflare Pages での公開

`main` への push で GitHub Actions が `npm ci`、`npm run build`、`npm test` を実行します。テストが成功すると、リポジトリシークレット `CLOUDFLARE_PAGES_DEPLOY_HOOK` から Cloudflare Pages の本番ビルドを起動します。本番ブランチの Git 連携による自動ビルドは止めてあり、テストを通過したコミットだけが公開されます。`main` 以外のブランチは、これまでどおり Cloudflare Pages がプレビューをビルドします。

| 項目 | 設定 |
| --- | --- |
| 本番ブランチ | `main` |
| ルートディレクトリ | リポジトリのルート |
| ビルドコマンド | `npm run build` |
| 出力ディレクトリ | `dist` |
| Node.js | `.node-version` の `24` |

静的ファイルのみを配信するため、Cloudflare Pages の無料枠で運用できます。

## 今後の追加方針

砂漠やオーロラのある雪のワールドも同じ階層に追加する予定です。

新しいワールドは `worlds/<ワールド名>/` に配置し、`package.json` に一意な名前と `dev`・`build`・`preview` コマンドを定義します。Vite の `base` は `/<ワールド名>/` に設定し、エントランスの一覧は `shared/worlds.js` の `worlds` に追加します。エントランスから外すワールドは同じファイルの `archivedWorlds` に移します。追加後にルートで `npm install` を実行し、更新した `package-lock.json` もコミットします。

現在の水族館は、オリジナルの高精細ジンベエザメと7種の魚・エイが泳ぐ Kuroshio です。[制作仕様](./worlds/aquarium/MODEL_BRIEF.md) に再生成手順と仕様を記載しています。

入口・宇宙・九龍には、Blenderで制作・検査した詳細モデルを追加しています。[モデルの制作・受け渡し仕様](MODEL_BRIEF.md) に一覧、再生成、検証方法を記載しています。
