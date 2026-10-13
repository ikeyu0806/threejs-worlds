# PELAGIC — Kuroshio

ジンベエザメ1頭と7種の魚・エイが泳ぐ、大水槽の静かな観覧体験です。

[新しい大水槽を開く](https://threejs-worlds.pages.dev/aquarium/)

## 制作

- オリジナルのジンベエザメ GLB：約8.3m、133,420三角形、約4.3MB。胴体は240×144の曲面、ヒレは64×32の断面で造形。平たい頭、前端の口、小さい側眼、5対のえら、3本の体側隆起、非対称の尾びれを含みます。
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

2026-10-13：ひれの根元7か所を胴体の曲面に合わせて接続。保存・再読込検査、左右の遊泳変形、全6テスト、ブラウザの拡大表示で確認。[接合部の拡大画面](artifacts/fin-attachment-closeup.jpg)。


## 黒潮の群れ（2026-10-13）

ジンベエザメに加え、7種を新規制作。旧水族館モデルを再利用しない。原本は `blender-works/assets/creatures/kuroshio_community/`、配布ファイルとSHA-256は `public/models/community-manifest.json`。

| 種 | 高精細 / 軽量の個体数 | 制作サイズ・特徴 |
|---|---:|---|
| コバンザメ | 4 / 4 | 約68cm、吸着盤と黒帯、ジンベエザメを追泳 |
| コガネシマアジ | 22 / 14 | 約42cm、黄色と黒帯の若魚 |
| ウメイロモドキ | 64 / 36 | 約32cm、青い体と黄色い背・尾 |
| グルクマ | 48 / 28 | 約36cm、銀色の紡錘形、尾柄の小離鰭 |
| ナンヨウマンタ | 2 / 2 | 翼幅3.4m、V型の肩斑、淡い口元 |
| オニイトマキエイ | 1 / 1 | 翼幅4.8m、T型の肩斑、暗い口元 |
| ヒメイトマキエイ | 3 / 3 | 翼幅1.7m、青紫の背、腹側の口 |

魚は種ごとの楕円状の群れに分け、立体的な間隔を固定seedで確保。コバンザメはジンベエザメと同じ軌道と方位を使用。エイは高さ・奥行きを分けた周回路で羽ばたく。群れの1種は1 InstancedMesh、各個体の尾振り/羽ばたき位相を別にする。水中減衰はinstanceMatrixを含むワールド座標、法線も変形に追随する。全生物を停止/動きを減らす設定/非表示タブの停止の対象とする。

魚群は6MiB弱の追加ダウンロード。全7種のGLBに法線画像を埋め込み、1材質/種。エイの胴体と翼は連続曲面。自動検査では書出しハッシュ、有限座標・単位法線、群れの10分間の水槽内軌道・進行方向と3分間の個体間隔を確認。実在の展示や個体数を再現したものではない。

7種は同じバイト列で3Dモデルカタログにも掲載しています。

### 生物の参照資料

- [美ら海水族館・コバンザメ](https://churaumi.okinawa/sp/fishbook/00000512/)
- [Museums Victoria・コガネシマアジ](https://fishesofaustralia.net.au/home/species/4274)
- [Reef Life Survey・ウメイロモドキ](https://reeflife.org/species/caesio-teres/)
- [美ら海水族館・グルクマ](https://churaumi.okinawa/fishbook/00000515/)
- [美ら海水族館・マンタ2種の違い](https://www.churaumi.okinawa/blog/1594098628/)
- [美ら海水族館・ヒメイトマキエイ](https://oki-churaumi.jp/fishbook/1571380500/)
- [海遊館・ヒメイトマキエイの口と泳ぎ](https://www.kaiyukan.com/connect/notes/vol118.html)

資料は形態の観察に使用し、写真・モデル・テクスチャは転載しない。

2026-10-13（群れ追加）：全9ワールドのビルドと7テストが成功。7モデルの保存再読込・GLB再取込・同条件2回の構造一致を検査。PC/390×844の縦画面、停止/再開、軽量表示、7種のガイド、画像アーカイブをブラウザで確認。描画エラーなし。[群れのPC画面](artifacts/community-desktop.jpg) / [縦画面](artifacts/community-mobile.jpg)。
