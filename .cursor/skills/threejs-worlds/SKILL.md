---
name: threejs-worlds
description: Three.jsのワールドを追加・修正し、必要な3Dモデルをblender-worksで制作して配置する。渋谷、秋葉原、新宿、水族館、サイバーパンク、宇宙、古都、エントランスの見た目、建物、人物、生物を扱うときに使う。
---

# Three.js Worlds

## 3Dモデルの置き場

ワールドに必要な3Dモデルは `/Users/ikegayayuuki/workspace/blender-works` で用意する。threejs-worlds 内で形状の正本を手続きメッシュのまま増やさない。配置、ライティング、シェーダ、人の動きは threejs-worlds。形状の正本は blender-works。

1. blender-works の `blender-production-assets` skill と `assets/` の規約に従い、`assets/<category>/<asset_slug>/` に brief と build を書く。
2. Blender background で GLB を `output/<asset_slug>/exports/` に書き出す。`output/` は commit しない。
3. 採用した GLB を利用先の `worlds/<world>/public/models/` に置き、`GLTFLoader` で配置する。glTF の 1 unit = 1 m、Y-up。読み込みは `import.meta.env.BASE_URL` からの相対パスにする。
4. 参照した景色や作品は、そのワールドの README に出典を残す。

## 精度

作業前に、そのワールドが何を再現するかを固定する。

- 渋谷・秋葉原・新宿は、交差点や通りから見える建物の並びを確認してから置く。人物、信号、横断歩道、看板、電車など、その場所に必要なものもモデルかシーン側の配置で足す。
- 水族館は、実在の大水槽（アクリルの大窓、ジンベエザメ、マンタ、ウミガメ）と、光の筋・魚群が主役の海の描写を参照する。
- サイバーパンクは、雨に濡れた路地、屋台、縦看板、巨大な背景ビルが同居する近年の夜の都市を参照する。
- 遠景のシルエット、中景の看板や生物、近景の人物と小物を分ける。カメラの歩く範囲は既存の bounds に合わせる。

商標のロゴや既存キャラクターはテクスチャにしない。建物の量塊、通りの構成、生き物の種で場所を読ませる。

## 作業単位

基盤、モデルの取り込み、ワールドごとの配置を分け、各単位で表示を確認してから commit する。`main` へ push すると GitHub Actions がビルドとテストを実行し、成功後に Cloudflare Pages が `npm run build` の `dist/` を公開する。
