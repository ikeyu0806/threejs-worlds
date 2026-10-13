# Three.js Worlds

ワールドに必要な3Dモデルは `/Users/ikegayayuuki/workspace/blender-works` で用意する。threejs-worlds 内で形状の正本を手続きメッシュのまま増やさない。配置、ライティング、シェーダ、人の動きは threejs-worlds。形状の正本は blender-works。

採用してワールドへ置いた GLB は、同じ作業で [3Dモデルカタログ](https://blender-works.pages.dev/) にも載せる。カタログのファイル更新までを、モデル追加の完了条件に含める。

## モデルを追加する

1. blender-works の `blender-production-assets` skill と `assets/` の規約に従い、`assets/<category>/<asset_slug>/` に brief と build を書く。
2. Blender background で GLB、preview、検査 report を `output/<asset_slug>/` に書き出す。`output/` は commit しない。report の `status` が `passed` になるまでカタログへ進めない。
3. 採用した GLB だけを利用先の `worlds/<world>/public/models/` に置く。既存の detail kit は `node scripts/import-detail-assets.mjs <world> /Users/ikegayayuuki/workspace/blender-works` を使う。glTF の 1 unit = 1 m、Y-up。読み込みは `import.meta.env.BASE_URL` からの相対パスにする。
4. 参照した景色や作品は、そのワールドの README に出典を残す。
5. blender-works の `asset.json` にカタログ情報を足し、掲載処理を実行する。手順は下の「カタログへ掲載する」。
6. threejs-worlds の配置と blender-works の掲載は commit を分ける。`output/`、検査前の GLB、依頼と無関係な未コミット変更は含めない。

## カタログへ掲載する

掲載の正本は blender-works の `asset.json`。表示用の `catalog/public/catalog.json` は手で編集せず、掲載処理で生成する。

単体アセットは `catalog` に `published: true` と `sources` を置く。キットの1点は `catalog.pieces` に追加する。`id` は小文字の snake_case で、カタログ内で重複させない。同じ部品を複数ワールドへ渡すときは `{world}_{piece}` のように分ける。

```json
{
  "id": "cosmos_survey_probe",
  "published": true,
  "title": "探査機",
  "description": "宇宙で使う探査機。",
  "alt": "探査機の3Dモデル",
  "category": "宇宙",
  "tags": ["environment", "cosmos"],
  "used_in": [
    { "project": "threejs-worlds", "world": "APHELION", "path": "/cosmos/" }
  ],
  "sources": {
    "glb": "output/worlds_detail_kit/exports/cosmos/survey_probe.glb",
    "preview": "output/worlds_detail_kit/previews/cosmos/survey_probe.png",
    "report": "output/worlds_detail_kit/reports/cosmos/survey_probe.json"
  }
}
```

`used_in` には、その GLB を置いているワールドを書く。`project` は利用先リポジトリ、`world` は表示名、`path` は公開 URL のパス。ワールドで使わない見本は空配列にする。

`sources` は blender-works のルートからの相対パスにする。GLB はワールドへコピーした採用ファイルと同じ内容、preview は検査時の用途照明画像、report は `passed` で `source.bounds_m.dimensions` を持つものを指す。

blender-works のルートで実行する。

```sh
python3 pipeline/catalog/publish.py
python3 -m unittest pipeline.catalog.publish_test
cd catalog && npm test
```

掲載処理は、合格した report とファイルがあるときだけ `catalog/public/models/`、`catalog/public/previews/`、`catalog.json` を更新する。プレビューは長辺 640px の AVIF で、1枚 200KB 以下。GLB は 1ファイル 25MiB 以下。失敗したときは、既に掲載済みのカタログを置き換えない。

`https://blender-works.pages.dev/` への再公開は、ユーザーがデプロイを依頼したときだけ行う。`catalog/` で `npm test` と `npm run build` のあと、`npx wrangler pages deploy dist --project-name blender-works --branch main` を実行する。

## 精度

作業前に、そのワールドが何を再現するかを固定する。

- 水族館は、実在の大水槽（アクリルの大窓、ジンベエザメ、マンタ）と、光の筋・魚群が主役の海の描写を参照する。
- サイバーパンクは、雨に濡れた路地、屋台、縦看板、巨大な背景ビルが同居する近年の夜の都市を参照する。
- 遠景のシルエット、中景の看板や生物、近景の人物と小物を分ける。カメラの歩く範囲は既存の bounds に合わせる。

商標のロゴや既存キャラクターはテクスチャにしない。建物の量塊、通りの構成、生き物の種で場所を読ませる。

## 作業単位

基盤、モデルの取り込み、ワールドごとの配置、カタログ掲載を分け、各単位で表示を確認してから commit する。threejs-worlds の `main` へ push すると GitHub Actions がビルドとテストを実行し、成功後に Cloudflare Pages が `npm run build` の `dist/` を公開する。
