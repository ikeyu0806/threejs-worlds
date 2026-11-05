# 夜の花園の素材記録

- `source/garden.png`: 2026-10-27にOpenAIの組み込み画像生成ツールで新規生成。入力画像なし。プロンプトは `source/prompt.txt`。
- 特定の画家・既存作品の再現を指定していない。架空の花園、川、開花した枝を題材にしている。
- 参考施設の画像・上映映像・ロゴ・音楽、第三者の美術画像は使用していない。音声なし。
- 参考URL `https://tdp.tv-asahi.co.jp/reve-lumieres/` は壁面と床面による没入展示という体験の検討にのみ使用。
- AI生成物の独占的著作権やあらゆる法域での非侵害を保証する記録ではない。制作由来と不使用素材を明確に残す。


## 画像生成プロンプト

```text
Use case: stylized-concept. Asset type: original panoramic oil painting texture for an immersive digital art installation. Create a visually rich wide landscape painting, aspect ratio 3:2 or wider, titled only in metadata 'Nocturnal Garden'. A luminous imaginary garden at blue hour, a serpentine turquoise stream receding toward a softly glowing amber horizon, dense irises and wildflowers with ivory, coral, lilac and warm gold petals in the lower third, enormous delicate flowering branches curving from both sides, deep midnight indigo and ultramarine foliage, loose clouds in petrol blue sky. Tiny restrained flecks of gold paint among leaves. The entire surface is visibly painted with layered impasto, palette knife ridges, expressive short brush marks and dry-brush broken color, exquisite hand-painted texture. Cohesive original composition, serene but vivid, richly detailed enough for large wall projection. Bottom half full of organic flowers and water patterns, top half branches and open blue sky. Use the whole frame edge to edge with no borders, no typography, no signature, no people, no buildings, no characters, no recognizable existing artwork. Do not emulate any named artist or reference an existing painting. This is the painting itself viewed flat and straight on, NOT a photograph of an exhibition, room, screen, frame or mockup.
```

GLB内の画像はPNGのまま埋め込み。WebではUVのゆらぎ・色温度・床面の明るさを変更。形状・UV・配置の正本は `blender-works/assets/animations/nocturnal_garden/`。
