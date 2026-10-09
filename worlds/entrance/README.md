# ORBIT — ワールドエントランス

石造りのギャラリーと各ワールドへのゲートを持つ Three.js のエントランスです。cyberpunk、水族館、宇宙、古都、渋谷、秋葉原、新宿へ移動できます。

ルートで `npm install`、`npm run dev` を実行し、`http://localhost:5173/` を開いてください。

ゲートをクリックするか、画面下のワールドリンクを選んでください。ドラッグで周囲を見回せます。右下のボタンで動きを停止できます。

ワールドの名称・説明・URL は `shared/worlds.js` で管理しています。外部モデルなしで動作し、動きを減らす設定と背景タブの描画休止に対応しています。3D 表示が使えない場合も、ワールドリンクから移動できます。

## Blender detail models

`limestone_atrium` / `portal_frame` / `orbit_sculpture` は blender-works の `assets/environments/worlds_detail_kit/` が正本。石材の継ぎ目、縁の面取り、真鍮の部品と微細法線をGLBへ固定し、ポータルの映像・文字・選択操作はブラウザ側で扱う。配布内容と制作commitは `public/models/detail-manifest.json` に記録する。

DesktopはPBR環境反射と影、mobileは同じモデルで影を省略。モデルの読み込み失敗時はレンダラを解放してリンクによる移動を維持する。二回build、blend/GLB再読込、desktop/mobile表示と操作、通信失敗時の解放を検証済み。
