# ORBIT — Blenderモデルの受け渡し

水族館に続き、入口・宇宙・九龍の近景を `blender-works/assets/environments/worlds_detail_kit` で制作した。輪郭、建築の構造、材質の違い、近景の生活感を優先している。元のワールドの構図を保ち、看板・水・雨・星などの光学表現をモデルと組み合わせる。

## 採用モデル

| ワールド | GLB数 | 合計サイズ | 主な制作対象 |
|---|---:|---:|---|
| 入口 | 3 | 3.07 MB | 石造アトリウム、七つのゲートのフレーム、天球儀 |
| 宇宙 | 4 | 6.08 MB | 観測デッキ、太陽電池付き探査機、望遠鏡、小惑星 |
| 九龍 | 6 | 4.30 MB | 配管・空調付き外壁と遠景LOD、橋、端末、ドローン、路地設備 |

13点は各ワールドの `public/models/detail-manifest.json` に記録している。宇宙の戦闘機・デブリ、九龍の屋台・雨の人物は既存GLBを組み合わせている。水族館の仕様は [PELAGICの制作仕様](worlds/aquarium/MODEL_BRIEF.md) を参照する。

## 仕様と再生成

- Blender 5.2.2 LTS / Three.js 0.186系、1m単位。GLBは +Y up / +Z forward、接地物の原点は高さ0。
- 1 GLBあたり最大80,000 triangles、8 materials、3枚の256px埋め込み法線。石・木・金属・服地の表面はオリジナル。ロゴ・借用キャラクター・外部テクスチャなし。
- GLBにカメラ・照明・外部ファイル参照・不要なアニメーションは含まない。背景プロセスで保存したblendを再読込し、GLB再取込と二回の再生成で計測値の一致を確認している。
- 小惑星と九龍の外壁は instance を使用する。九龍の雨の歩行者と屋台は hero kit の GLB を組み合わせる。
- 九龍はカメラ距離で外壁をLOD切替。モバイルは人物数・描画解像度を下げ、影を省略する。高品質のデスクトップは環境反射と影を追加し、軽量設定で影・発光を省略する。

Blender側で以下を実行すると、編集可能なblend、GLB、用途照明と中立照明のpreview、検査reportが `output/worlds_detail_kit/` に生成される。生成物はBlender側ではGit管理せず、制作スクリプトを正本とする。

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python assets/environments/worlds_detail_kit/build.py -- cosmos
```

`-- cosmos/survey_probe` なら単体を修正・検査できる。検査後にBlender側をcommitし、このPJから `node scripts/import-detail-assets.mjs cosmos /path/to/blender-works` を実行する。採用GLBのみコピーし、SHA256・source commit・材質数・ポリゴン数をmanifestへ固定する。

## 利用先の確認

`npm run build` と `npm test` で公開中のワールドの配信、アイコン、本番バンドル、採用GLBのバイナリ一致・UV・法線・PBR・埋め込み画像・budgetを検査する。各ワールドの `artifacts/detail-*.jpg` はPC・スマートフォンと展望の確認画像。

ブラウザではモデルの表示、全展望、一時停止、散策とEsc、PNG撮影、UI復帰、軽量設定、動きを減らす設定、読み込み失敗時のエラーと描画資源の解放を確認する。

PS5世代のゲームを画作りの目標にしている。ブラウザ上の通信・描画量に収めたアセットであり、コンソール向けの顔・室内・ゲームプレイ用の完成データとは用途が異なる。
