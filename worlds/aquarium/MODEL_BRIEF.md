# 水族館モデルの制作・受け渡し

制作の正本は `/Users/ikegayayuuki/workspace/blender-works/assets/environments/pelagic_aquarium/`。Blenderで生きもの・海底・水槽ギャラリーを制作し、検査済みのGLBだけをこのワールドの `public/models/` にコピーする。

コンソールゲームの水中場面を目標に、厚みのある曲面、種の模様、細部、滑らかな遊泳、材質差を優先する。モデルの高密度化だけに依存せず、Three.jsの水中光・陰影・反射と合わせて確認する。

## 配置済みモデル

| ファイル | 内容 | 三角形数 | 動き |
| --- | --- | ---: | --- |
| `manta.glb` | 曲面翼、頭鰭、尾、目、鰓、淡い腹側 | 5,120 | 翼と尾 |
| `turtle.glb` | 甲羅、甲板の縁、頭、目、4枚の脚 | 5,328 | 前脚・後脚 |
| `whale_shark.glb` | 幅広い頭、斑点、鰓、背鰭・胸鰭・尾鰭 | 11,292 | 尾のしなり |
| `silver_fish.glb` | 紡錘形の回遊魚。二又の尾鰭、背鰭、胸鰭 | 3,184 | 尾のしなり |
| `blue_tang.glb` | 側扁した青い胴、黒い斑、黄色い尾鰭 | 3,184 | 尾のしなり |
| `clownfish.glb` | 卵形のオレンジと三本の白帯 | 3,092 | 尾のしなり |
| `moon_jelly.glb` | 半透明の傘、生殖腺、触手、口腕 | 5,300 | 傘の拍動 |
| `coral_staghorn.glb` | 二股に分かれる枝とポリプ | 8,096 | なし |
| `coral_fan.glb` | 肋と横枝のある扇 | 4,492 | なし |
| `reef_rock.glb` | 有機的な岩 | 1,280 | なし |
| `kelp.glb` | 付着器、茎、縁のうねる葉身 | 3,412 | 揺れ |
| `gallery.glb` | 大窓の枠・アクリル・床・壁・梁・ベンチ・床灯 | 10,152 | なし |
| `seabed.glb` | 起伏と砂の色差を持つ海底 | 4,752 | なし |

13点の転送量は合計約3.9 MB。魚・海藻・珊瑚の微細法線は512px、その他は256px。模様は頂点色。魚はクリアコートで濡れを出し、金属度は低く保つ。クラゲは3材質、ギャラリーは5材質、その他は1材質。骨リグ、LOD、衝突メッシュは含まない。

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
