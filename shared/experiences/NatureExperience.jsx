import { Suspense, lazy, useEffect, useRef, useState } from 'react';

const FireStage = lazy(() => import('./FireStage.jsx'));
const LakeStage = lazy(() => import('./LakeStage.jsx'));
const asset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export default function NatureExperience({ world }) {
  const isLake = world.id === 'lakeside';
  const Stage = isLake ? LakeStage : FireStage;
  const [resetKey, setResetKey] = useState(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [sound, setSound] = useState(false);
  const audio = useRef(null);

  useEffect(() => {
    document.title = `${world.title} | Three.js Worlds`;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event) => { if (event.matches) setPlaying(false); };
    preference.addEventListener('change', onChange);
    return () => preference.removeEventListener('change', onChange);
  }, [world.title]);
  useEffect(() => {
    if (!audio.current) return;
    if (sound) audio.current.play().catch(() => setSound(false));
    else audio.current.pause();
  }, [sound]);

  return <div className={`site-shell detail-page ${isLake ? 'lakeside-page' : ''}`}>
    <header className="site-header"><a className="brand" href="/">THREE.JS<small>WORLDS</small></a><nav><a href="/">ワールド一覧 ↗</a></nav><span className="header-edition">{world.english.toUpperCase()}</span></header>
    <main>
      <section className="detail-head"><a className="back-link" href="/">← <span>ワールド一覧へ戻る</span></a><span>{world.title}</span></section>
      <section className="detail-content" aria-labelledby="detail-title">
        <div className="detail-stage-column">
          <div className="detail-stage-frame"><Suspense fallback={<div className="stage-message" role="status">{world.title}を準備しています…</div>}><Stage model={asset(world.model)} preview={asset(world.preview)} playing={playing} resetKey={resetKey} /></Suspense><span className="stage-corner top-left">THREE.JS / {world.english.toUpperCase()}</span><span className="stage-corner bottom-right">ドラッグで視点変更</span></div>
          <div className="stage-controls"><div className="control-buttons"><button type="button" onClick={() => setPlaying((value) => !value)} aria-pressed={playing}><span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span>{playing ? '動きを止める' : '動かす'}</button>{world.audio && <button type="button" onClick={() => setSound((value) => !value)} aria-pressed={sound}><span aria-hidden="true">{sound ? '◖))' : '◖'}</span>{sound ? '音を消す' : '焚き火の音を聴く'}</button>}{isLake && <button type="button" onClick={() => setResetKey((value) => value + 1)}><span aria-hidden="true">↺</span>視点を戻す</button>}</div><span>{isLake ? 'ドラッグ・矢印キーで視点変更' : 'ドラッグで角度を変えられます'}</span></div>
          {world.audio && <audio ref={audio} src={asset(world.audio)} loop preload="none" />}
        </div>
        <div className="detail-copy"><div className="detail-eyebrow">INTERACTIVE WORLD <span>—</span> EXPLORE</div><h1 id="detail-title">{world.title}</h1><p className="detail-english">{world.english.toUpperCase()}</p><div className="detail-rule" /><p className="detail-lead">{world.lead}</p><p className="detail-description">{world.description}</p><div className="detail-spec"><div><span>操作</span><strong>視点変更・再生/停止</strong></div><div><span>モデル</span><strong>Blender</strong></div><div><span>空間</span><strong>Three.js</strong></div></div></div>
      </section>
      <section className="detail-after"><div><h2>{world.title}の空間</h2><p>{world.note}</p>{world.audio && <p>環境音: “Campfire sound ambience” by Glaneur de sons · <a href="https://commons.wikimedia.org/wiki/File:Campfire_sound_ambience.ogg" target="_blank" rel="noreferrer">CC BY 3.0</a></p>}</div><a href="/" className="return-link">ワールド一覧へ戻る →</a></section>
    </main>
    <footer className="site-footer"><span>Three.js Worlds</span><span>Blender + Three.js</span><span>© 2026</span></footer>
  </div>;
}
