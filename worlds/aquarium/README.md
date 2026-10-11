# PELAGIC — Kuroshio

ジンベエザメ1頭と大水槽だけに絞った、静かな観覧体験です。旧 PELAGIC の展示・13点のモデル・資料は [aquarium-legacy](../aquarium-legacy/README.md) に保存し、[旧版の URL](https://threejs-worlds.pages.dev/aquarium-legacy/) から引き続き開けます。アーカイブの基準コミットは `e376a38` です。

[新しい大水槽を開く](https://threejs-worlds.pages.dev/aquarium/)

## 制作

- オリジナルのジンベエザメ GLB：約8.3m、133,428三角形、約4.3MB。胴体は240×144の曲面、ヒレは64×32の断面で造形。平たい頭、前端の口、小さい側眼、5対のえら、3本の体側隆起、非対称の尾びれを含みます。
- 背・腹の塗り分けと不規則な白点・淡い縞を4,096×2,048の体表テクスチャに収録。ヒレには2K、皮膚には微細法線を使います。6材質を分け、プラスチックのような強い反射を抑えています。
- GPUで胴体から尾へ伝わる横方向の遊泳を計算し、約190秒で水槽内を1周します。メッシュの法線も曲げに合わせて補正します。
- 観覧窓は22.5×8.2m。アクリルの厚み0.6m・屈折率1.49、水中の距離に応じた波長別の減衰、水面の光、砂床、床面の淡い反射を実装しています。
- カメラは観覧室側の目の高さを維持。正面・窓のそば・右側を切り替えられます。

実施設の忠実なデジタルツインではなく、資料を参考にした CG の習作です。スキャン由来のモデル、骨格リグ、流体シミュレーション、レイトレーシングは使用していません。

## 操作

ドラッグで見回し、スクロールまたはピンチで拡大します。縦画面の「正面から」は魚をゆっくり追い、ドラッグすると手動に切り替わります。キーボードの矢印で視線を動かし、Spaceで停止・再開、Hで操作表示を隠せます。写真保存・全画面表示・軽量表示もあります。OSの「動きを減らす」設定では停止した状態から始まり、再生を選ぶと動きます。非表示タブでは描画を停止します。

## 起動・検証

ルートで `npm install` → `npm run dev`、`http://localhost:5173/aquarium/` を開きます。公開用は `npm run build` → `npm test`。モデルの再生成は [MODEL_BRIEF.md](MODEL_BRIEF.md) を参照してください。

## 参照資料（2026-10-11 確認）

- [沖縄美ら海水族館「黒潮の海」](https://churaumi.okinawa/area/the-kuroshio/kuroshio/)：大水槽の寸法、観覧室から見上げる体験。
- [美ら海水族館の紹介](https://churaumi.okinawa/haisai/)：アクリルパネルの寸法と厚み。
- [Florida Museum — Whale Shark](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/whale-shark/)：頭部、口、体側隆起、鰭、白点・縞、腹側の形と配色。公開されているFAOの側面図と写真を観察。
- [Three.js MeshPhysicalMaterial](https://threejs.org/docs/#MeshPhysicalMaterial)：透過・減衰・屈折のパラメータ。

参照先の写真・モデルは成果物に含めていません。モデルと模様は[blender-works の制作スクリプト](https://github.com/ikeyu0806/blender-works/tree/main/assets/creatures/kuroshio_whale_shark)で生成しています。

## 検証記録

2026-10-12：全9ワールドのビルドと6件のテストが成功。ブラウザで1280×720・390×844の画面、3つの観覧位置、停止/再開、操作表示の復帰、ガイドのEsc終了、軽量表示、写真保存を確認。公開用ビルドに描画エラーはありません。[PC画面](artifacts/kuroshio-desktop.jpg) / [モバイル画面](artifacts/kuroshio-mobile.jpg)。
