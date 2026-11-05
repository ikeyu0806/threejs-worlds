# 焚き火 — Campfire

`/Users/ikegayayuuki/workspace/blender-animation` から移管した、視点を操作できる3Dワールド。

形状の正本: `blender-works/assets/animations/hearth_fire/`。このプロジェクトでは配置、描画、操作を担当します。

`npm run dev:campfire` で起動し、`/campfire/` を開きます。

ドラッグで視点を変え、動きを停止・再開できます。環境音はボタンで再生します。録音は [Campfire sound ambience](https://commons.wikimedia.org/wiki/File:Campfire_sound_ambience.ogg) by Glaneur de sons（CC BY 3.0）をそのまま使用します。

炎・火の粉・煙は `shared/experiences/generated/campfire.js` のThree.js runtime、薪・石・熾火の形状は検査済みGLBです。モデルは `blender-works` の3Dモデルカタログにも掲載します。
