# APHELION — 遠い軌道

観測甲板から、環のある惑星と星雲を眺める Three.js の宇宙です。小惑星、デブリ、観測船は blender-works の既存 GLB（asteroid set、space debris、Trace Fighter）を配置しています。

ルートで `npm install`、`npm run dev` を実行し、`http://localhost:5173/cosmos/` を開いてください。

- 展望ボタンで観測位置を切り替え、ドラッグで見回せます。
- 「甲板を歩く」で WASD・矢印キー・タッチボタンによる移動ができます。Shift で速く移動し、Esc で戻れます。
- H で UI を切り替えられます。右下から星の動きを停止し、風景を PNG 保存できます。
- 軌道ガイドで軽量表示に切り替えられます。動きを減らす設定と背景タブの描画休止に対応しています。

WebGL 2 対応のブラウザが必要です。
