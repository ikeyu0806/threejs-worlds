# PELAGIC — 静かな海の水族館

大水槽のアクリルの前に立つ水族館です。視点は目の高さで、窓の向こうの青へ少し見上げます。生きもの、珊瑚、岩、海藻、海底、水槽の厚い窓枠・アクリル・観覧ギャラリーは、blender-works の `assets/environments/pelagic_aquarium/` で制作したGLBです。ジンベエザメ、マンタ2体、ウミガメ、銀色の魚群、ナンヨウハギ、クマノミ、ミズクラゲが泳ぎます。窓に近い魚は手前を横切り、奥の魚は青い霞に溶けます。

魚は種ごとの胴とヒレ、海藻は茎と波打つ葉、珊瑚は枝と扇の骨格です。表面は頂点色に、鱗・角質・孔の法線と粗さの差を重ねています。眼球は白い点を置かず、虹彩と瞳孔、クリアコートの反射で見ます。Three.js側は配置、目線、アクリルの透過、水面から落ちる光、距離による色の吸収を担当します。

## 参照

- Sam Brimlow, [UE5 Aquarium: Refraction](https://sambrimlow.com/2025/02/04/the-art-of-connection/)
- Epic Developer Community, [Forest in a (Water) Bottle](https://forums.unrealengine.com/t/forest-in-a-water-bottle-virtual-aquarium/2650585)
- [aquarium-night](https://github.com/StarKnightt/aquarium-night)
- [ocean-simulator](https://github.com/forbiddenlink/ocean-simulator)

生きものの形は次の記載に合わせ、テクスチャはオリジナルです。上の作品からは、ガラス越しの視線、光の筋、距離で青くなる水の扱いを参照しています。

- アオウミガメの甲板と頭鱗: [NOAA species profile, Chelonia mydas](https://www.sealifebase.se/FieldGuide/FieldGuideSummary.php?genusname=Chelonia&speciesname=mydas&c_code=508)（椎甲板5、肋甲板4対、縁甲板、前額板1対）
- ナンヨウハギ: [Australian Museum, Blue Tang](https://australian.museum/learn/animals/fishes/blue-tang-paracanthurus-hepatus/) と [USGS species profile](https://nas.er.usgs.gov/queries/FactSheet.aspx?SpeciesID=3339)（眼から続く黒いパレット模様、黄色い尾）
- カクレクマノミ: [Fishes of Australia, Amphiprion ocellaris](https://fishesofaustralia.net.au/home/species/1275)（三本の白帯、白い帯の黒い縁は細い）
- ミドリイシ: [Naturalis, Acropora cervicornis](https://caribbean-diving.linnaeus.naturalis.nl/linnaeus_ng/app/views/species/taxon.php?id=6710)（円い枝、軸サンゴ個体と放射サンゴ個体）
- ウミウチワ: [NSU, Gorgonia ventalina](https://nsuworks.nova.edu/octocoral_g_ventalina/)（一平面の網目）

ルートで `npm install`、`npm run dev` を実行し、`http://localhost:5173/aquarium/` を開いてください。

- 展示ボタンで観覧位置を切り替え、ドラッグで見回せます。
- 「館内を歩く」で WASD・矢印キー・タッチボタンによる移動ができます。Shift で速く移動し、Esc で戻れます。
- H で UI を切り替えられます。右下から生きものの動きを停止し、風景を PNG 保存できます。
- 館内ガイドで軽量表示に切り替えられます。軽量表示は発光と影を省き、モバイルでは魚群や海底の配置数を減らします。動きを減らす設定と背景タブの描画休止に対応しています。

WebGL 2 対応のブラウザが必要です。モデルの再生成・受け渡しと予算は [MODEL_BRIEF.md](./MODEL_BRIEF.md) に記載しています。

## 確認済みの内容

- Blender 5.2.2 LTSで13点を生成。保存blendの再読込、GLB再取込、形状・材質・4秒ループを検査し、再生成2回の主要計測値が一致。
- `npm run build` / `npm test` で全8ワールドと13点のモデル配信、モデルのハッシュ、PBR・モーフ・アニメーションの仕様を検査。
- Chromeの1440×960と390×844で、全展示・停止・歩行・撮影・軽量表示・UI切り替えを確認。動きを減らす設定での初期配置、読み込み失敗時の表示と描画の破棄も確認。
- 本番用のビルドをブラウザで再確認。[大海](artifacts/pelagic-desktop.jpg)、[珊瑚](artifacts/pelagic-reef.jpg)、[クラゲ](artifacts/pelagic-jelly.jpg)、[モバイル](artifacts/pelagic-mobile.jpg) のスクリーンショットは、目線を下げる前の構図です。
- 2026-10-11 に、目の高さの窓、魚3種、海藻、枝珊瑚、扇珊瑚を更新し、ブラウザで大海・珊瑚・クラゲの切り替え、館内歩行、UIを隠した状態、幅390pxのレイアウトを確認した。

現時点で写実的なスキャン素材や骨リグ、LOD切り替えは使用していません。魚・海藻・珊瑚の微細法線は512px、その他は256pxです。大型生物はそれぞれ1材質です。カメラは館内の床に立ち、アクリル越しに水槽を見上げます。
