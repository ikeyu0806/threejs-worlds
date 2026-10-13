# Kuroshio / Whale shark model

## 再生成

Blender 5.2.2 LTS の標準 Python と NumPy で制作しています。制作元は [blender-works](https://github.com/ikeyu0806/blender-works/tree/main/assets/creatures/kuroshio_whale_shark) です。そのリポジトリのルートで次を実行します。

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python assets/creatures/kuroshio_whale_shark/build.py
```

出力は `output/kuroshio_whale_shark/` の blend、exports、previews、reports。合格したGLBを本ワールドの `public/models/whale-shark.glb` にコピーし、manifestにハッシュを記録します。乱数シードは固定です。全メッシュの座標を統合し、滑らかな法線を計算して書き出します。GLBはY上・頭が+Z方向（頂点のローカル編集軸は-X）、メートル単位です。外部テクスチャへの参照はありません。

| 内容 | 仕様 |
| --- | --- |
| 三角形数 | 133,420 |
| ダウンロード | 約4.3MB（予算6MiB未満） |
| 胴体の形状 | 240区間 × 144周方向、Hermite補間、連続した体側隆起 |
| 鰭の形状 | 64区間 × 32断面、厚みのある滑らかな曲面 |
| 基本色 | 胴体4096×2048 / 鰭2048×2048、JPEG品質90 |
| 微細法線 | 512×512、皮膚の微細な凹凸 |
| 材質 | 胴体・鰭・腹側・口/えら・唇・眼の6種 |
| アニメーション | GLBに焼き込まず、Three.jsの頂点シェーダーで横方向の波を伝播 |

`npm test` はファイルのハッシュ、サイズ、材質・埋め込み画像、三角形数、座標と単位法線の有限性、全長と鰭の範囲を検査します。旧版の13点のモデルにも従来の検査を維持しています。

解剖学的な資料は [README](README.md) に記載しています。研究用途の形態計測モデルではなく、観覧体験のための独自造形です。

保存blendの再読み込み、GLBの再取り込み、閉じたトポロジ、2回生成した計測値の一致を制作側で検査します。同じGLBを [3Dモデルカタログ](https://blender-works.pages.dev/) に掲載しています。

2026-10-12：胸鰭・腹鰭・背鰭・臀鰭の根元を、先細りする胴体の断面に沿わせて修正。7か所の全周が胴体の内側に入ることを制作側で検査し、低い側面視点と左右の遊泳変形で目視確認しています。
