# 水族館モデルの制作・受け渡し

制作の正本は `/Users/ikegayayuuki/workspace/blender-works/assets/environments/pelagic_aquarium/`。Blenderで生きもの・海底・水槽ギャラリーを制作し、検査済みのGLBだけをこのワールドの `public/models/` にコピーする。

コンソールゲームの水中場面を目標に、厚みのある曲面、種の模様、細部、滑らかな遊泳、材質差を優先する。モデルの高密度化だけに依存せず、Three.jsの水中光・陰影・反射と合わせて確認する。

## 配置済みモデル

| ファイル | 内容 | 三角形数 | 動き |
| --- | --- | ---: | --- |
| `manta.glb` | 曲面翼、頭鰭、尾、暗色の眼球、鰓、淡い腹側 | 5,032 | 翼と尾 |
| `turtle.glb` | アオウミガメ。椎甲板・肋甲板、嘴、前額板、水かき、小さな眼球 | 8,104 | 前脚・後脚 |
| `whale_shark.glb` | 幅広い頭、斑点、鰓、背鰭・胸鰭・尾鰭、小さな眼球 | 11,204 | 尾のしなり |
| `silver_fish.glb` | マアジ型の紡錘、側線、鰓蓋の斑、二叉尾、眼球 | 4,372 | 尾のしなり |
| `blue_tang.glb` | ナンヨウハギ。青い胴、パレット状の黒、黄色い尾と胸鰭、金の虹彩 | 4,388 | 尾のしなり |
| `clownfish.glb` | カクレクマノミ。三白帯と黒い縁、丸い尾、虹彩のある眼 | 4,384 | 尾のしなり |
| `moon_jelly.glb` | 半透明の傘、生殖腺、触手、口腕 | 5,300 | 傘の拍動 |
| `coral_staghorn.glb` | ミドリイシ。二股の枝、先端の軸サンゴ個体、側面の管状個体 | 25,004 | なし |
| `coral_fan.glb` | ウミウチワ。一平面の網目と縁のポリプ | 10,708 | なし |
| `reef_rock.glb` | 有機的な岩 | 1,280 | なし |
| `kelp.glb` | 付着器、茎、縁のうねる葉身 | 3,412 | 揺れ |
| `gallery.glb` | 大窓の枠・アクリル・床・壁・梁・ベンチ・床灯 | 10,152 | なし |
| `seabed.glb` | 起伏と砂の色差を持つ海底 | 4,752 | なし |

模様は頂点色。魚・亀・珊瑚は512pxの法線と粗さ、それ以外の微細法線は256px。魚と眼球はクリアコートで濡れを出し、金属度は低く保つ。眼球は虹彩と瞳孔の頂点色で、白いハイライト球は置かない。クラゲは3材質、ギャラリーは5材質、眼球を分けた生物は2材質、その他は1材質。骨リグ、LOD、衝突メッシュは含まない。

## 座標とアニメーション

- 1 unit = 1 m。Blenderは +Z up / -Y forward、GLBは +Y up / +Z forward。旧仕様の魚 +X / マンタ -Z は使用しない。
- 生物の原点は胴体中心。環境部品は接地面。ギャラリーは床の上面を高さ0とし、床板はその下へ入る。
- 生物と海藻には `swim` を1本だけ入れる。24 fps、1〜97フレーム、4秒ループ。先頭と末尾は同じ姿勢で、前進は含まない。
- 大型生物とクラゲはAnimationMixerでGLBのclipを再生。魚群と海藻は同じclipのモーフ値をインスタンスごとにGPUへ渡す。移動経路はThree.jsが管理する。
- スケール適用済み。カメラ・照明などのpreview設備をexportしない。

## 再生成と同期

```sh
cd /Users/ikegayayuuki/workspace/blender-works
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python assets/environments/pelagic_aquarium/build.py
```

`output/pelagic_aquarium/` の `blend/`・`exports/`・`previews/`・`reports/` を確認する。各reportが `passed` であることを確認し、exportsのGLBを `worlds/aquarium/public/models/` へコピーする。

`public/models/manifest.json` は採用した制作commit、SHA-256、ファイルサイズ、三角形数、予算、アニメーション有無を記録する。モデルを更新する場合はこのmanifestも更新する。`npm run build` → `npm test` を実行し、実際のブラウザでシルエット・変形・透明部分・光・モバイル表示を確認する。
