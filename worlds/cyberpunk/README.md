# AFTERLIGHT — 九龍北区

React・Vite・Three.js で作った、雨とネオンのサイバーパンク街です。屋台と雨合羽の通行人は blender-works の GLB で、路地や雨、ドローンは手続き生成しています。画面の参照は [REFERENCES.md](./REFERENCES.md) です。

## 起動

リポジトリのルートで実行します。

```sh
npm install
npm run dev
```

`http://localhost:5173/cyberpunk/` を開いてください。ヘッダーの戻り口からエントランスへ移動できます。`npm run build:cyberpunk` で個別にビルドできます。

## 操作

- WASD で移動し、Shift で走れます。矢印キーでは上下で移動、左右で視点を回転できます。ドラッグでも視点を動かせます。
- モバイルでは矢印ボタンとドラッグで操作できます。
- H で UI を切り替え、Esc で眺めるモードに戻れます。
- 街区ボタンで移動できます。表示設定では雨・発光・霧・描画品質を調整できます。
- カメラで風景を PNG 保存できます。環境音や一時停止も切り替えられます。

WebGL 2 対応のブラウザが必要です。「視差効果を減らす」設定に対応し、背景タブでは描画を休止します。

## 資料

参考画像の出典は [REFERENCES.md](./REFERENCES.md)、追加モデルの仕様は [MODEL_BRIEF.md](./MODEL_BRIEF.md) に記載しています。`public/models/` は将来のモデル配置用です。Google Fonts を利用し、読み込めない場合は端末のフォントで表示します。

## Detailed Blender street kit

外壁・遠景外壁・連絡橋・認証端末・ドローン・路地の設備を `blender-works/assets/environments/worlds_detail_kit/cyberpunk.py` で制作。窓枠、空調、配管、シャッター、ボルト、ローター、金属と石の微細法線をGLBへ保存する。制作commitと配布GLBのSHA256は `public/models/detail-manifest.json` に記録する。

外壁は部品別にまとめて描画し、camera距離32m以内（mobileは20m）で詳細モデルを使う。遠景は同じ輪郭の軽いGLB。雨・蒸気・路面反射・看板の表示はブラウザが担当する。既存の屋台と人物を含め、読み込み失敗・画面終了時にモデルと画像を解放する。
