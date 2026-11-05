# 夜の花園 — Nocturnal Garden

`/Users/ikegayayuuki/workspace/blender-animation` から移管した、視点を操作できる3Dワールド。

形状の正本: `blender-works/assets/animations/nocturnal_garden/`。このプロジェクトでは配置、描画、操作を担当します。

`npm run dev:garden` で起動し、`/garden/` を開きます。

ドラッグ・矢印キー・Homeキーで視点を操作し、絵画へ近づく表示と全画面を選べます。作品の動きを停止・再開でき、音声はありません。展示室の形状とUVは検査済みGLB、花びらと投影画像の時間変化は `shared/experiences/generated/garden.js` のThree.js runtimeです。[素材の制作記録](docs/nocturnal-garden.md)も保存しています。モデルは `blender-works` の3Dモデルカタログにも掲載します。
