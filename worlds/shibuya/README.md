# SCRAMBLE — 渋谷

夕方のスクランブル交差点です。ハチ公口側から、北東の曲面ビジョン、西の円筒商業ビル、駅前広場の秋田犬、斜めに渡る人を配置しています。建物と人物の形状は blender-works の `assets/environments/worlds_hero_kit` で作り、`public/models/` の GLB を置いています。並びは渋谷駅ハチ公口、QFRONT 側の大型ビジョン、スクランブルスクエア方面の塔、円筒のファッションビルを参照しています。商標のロゴは入れていません。

ルートで `npm install`、`npm run dev` を実行し、`http://localhost:5173/shibuya/` を開いてください。

- 展望ボタンで交差点・ビジョン・駅前を切り替え、ドラッグで見回せます。
- 「交差点を歩く」で WASD・矢印キー・タッチボタンによる移動ができます。Shift で速く移動し、Esc で戻れます。
- H で UI を切り替えられます。右下から人の流れを停止し、風景を PNG 保存できます。
- 街の案内で軽量表示に切り替えられます。動きを減らす設定と背景タブの描画休止に対応しています。

WebGL 2 対応のブラウザが必要です。

## Detailed Blender crossing

既存の商業塔を制作ソースから拡張し、窓枠・エントランス・屋上設備を加える。信号柱、電気バス、広場のベンチと植栽、秋田犬のブロンズ像、周辺ビルも `blender-works/assets/environments/worlds_detail_kit/shibuya.py` で制作。GLBの制作commitとSHA256は `public/models/detail-manifest.json` に記録する。

道路の表示と大型ビジョン、群衆と信号の周期はブラウザで制御。モデルはPBR環境反射とdesktopの影に対応し、mobile/軽量では影を省略する。

主要な建物と街の設備は、Blenderの詳細モデルです。[制作・受け渡し仕様](../../MODEL_BRIEF.md) を参照してください。
