# Three.js Worlds

Three.js のワールドを、`worlds/` 配下の独立したプロジェクトとして管理します。現在は [cyberpunk](./worlds/cyberpunk/README.md) のみ実装しています。

## 構成

```text
worlds/
  cyberpunk/
    src/             # ワールドの実装
    public/          # 素材・モデル
    artifacts/       # スクリーンショット
    index.html
    vite.config.js
    package.json
    README.md
package.json         # ワールド共通の実行コマンド
package-lock.json    # 依存パッケージのバージョン管理
```

npm workspaces を使い、各ワールドが依存パッケージとビルド設定を持ちます。ビルド結果は各ワールドの `dist/` に出力します。

## 起動・ビルド

リポジトリのルートで実行します。

```sh
npm install
npm run dev                 # cyberpunk を起動します
npm run build               # 全ワールドをビルドします
npm run preview             # cyberpunk のビルド結果を確認します
```

cyberpunk を指定する場合は、`dev:cyberpunk`、`build:cyberpunk`、`preview:cyberpunk` も使えます。

## 今後の追加方針

`worlds/entrance/` を各ワールドへの入口となるエントランスとして追加する予定です。砂漠やオーロラのある雪のワールドも同じ階層に追加します。これらはまだ実装していません。

新しいワールドは `worlds/<ワールド名>/` に配置し、`package.json` に一意な名前と `dev`・`build`・`preview` コマンドを定義します。追加後にルートで `npm install` を実行し、更新した `package-lock.json` もコミットします。

個別のワールドは `npm run dev --workspace=worlds/<ワールド名>` で起動できます。エントランス実装時に、既定の起動先とワールド間の移動方法を整えます。
