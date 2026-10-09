# APHELION — 遠い軌道

観測甲板から、環のある惑星と星雲を眺める Three.js の宇宙です。小惑星、デブリ、観測船は blender-works の既存 GLB（asteroid set、space debris、Trace Fighter）を配置しています。

ルートで `npm install`、`npm run dev` を実行し、`http://localhost:5173/cosmos/` を開いてください。

- 展望ボタンで観測位置を切り替え、ドラッグで見回せます。
- 「甲板を歩く」で WASD・矢印キー・タッチボタンによる移動ができます。Shift で速く移動し、Esc で戻れます。
- H で UI を切り替えられます。右下から星の動きを停止し、風景を PNG 保存できます。
- 軌道ガイドで軽量表示に切り替えられます。動きを減らす設定と背景タブの描画休止に対応しています。

WebGL 2 対応のブラウザが必要です。

## Blenderで制作した観測設備

甲板の分割パネル、ボルト、手すり、操作盤、探査機の太陽電池とパラボラ、軌道望遠鏡、小惑星の凹凸を `blender-works/assets/environments/worlds_detail_kit/cosmos.py` で制作。GLBを `public/models/` へ受け渡し、制作commitとSHA256を `detail-manifest.json` に記録する。

小惑星帯は同じモデルをまとめて描画し、既存の宇宙船・破片も含めて共有資源をシーンが所有する。惑星、大気、環、星雲は光学表現としてブラウザ側に残す。DesktopはPBR環境反射と甲板の影、mobile/軽量は影を省略する。
