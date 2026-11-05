import { useEffect, useRef, useState } from 'react';
import { createGardenStage } from './generated/garden.js';

const asset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export default function GardenExperience({ work }) {
  const host = useRef(null), stage = useRef(null), runtime = useRef(null), expandButton = useRef(null);
  const [status, setStatus] = useState('loading');
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [view, setView] = useState('room');
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const failed = status === 'error' || status === 'unsupported';

  useEffect(() => {
    document.title = '夜の花園 | Three.js Worlds';
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = (event) => { if (event.matches) setPlaying(false); };
    preference.addEventListener('change', changed);
    try {
      runtime.current = createGardenStage(host.current, asset(work.model), {
        playing: playingRef.current,
        onReady: () => setStatus('ready'),
        onError: () => setStatus('error'),
      });
    } catch { setStatus('unsupported'); }
    return () => { runtime.current?.dispose(); runtime.current = null; preference.removeEventListener('change', changed); };
  }, [work.model]);
  useEffect(() => { runtime.current?.setPlaying(playing); }, [playing]);
  useEffect(() => { runtime.current?.setView(view); }, [view]);
  useEffect(() => {
    const changed = () => setFullscreen(document.fullscreenElement === stage.current);
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event) => {
      if (event.key === 'Escape') { setExpanded(false); expandButton.current?.focus(); }
      if (event.key === 'Tab') {
        const controls = [...stage.current.querySelectorAll('button:not(:disabled), canvas[tabindex]')];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', escape); };
  }, [expanded]);

  async function toggleFullscreen() {
    if (fullscreen) { await document.exitFullscreen(); return; }
    if (expanded) { setExpanded(false); return; }
    if (stage.current.requestFullscreen) {
      try { await stage.current.requestFullscreen(); return; } catch { /* Embedded browsers can deny fullscreen; expand within the page. */ }
    }
    setExpanded(true);
  }

  return <div className="garden-page">
    <header className="garden-header"><a href="/" aria-label="Three.js Worldsのワールド一覧へ">← <span>ワールド一覧</span></a><span className="garden-wordmark">THREE.JS <i>/</i> WORLDS</span><span>GARDEN</span></header>
    <main>
      <section className={`garden-theatre ${expanded ? 'is-expanded' : ''}`} ref={stage} aria-label="夜の花園の鑑賞画面" role={expanded ? 'dialog' : undefined} aria-modal={expanded || undefined}>
        <div className="garden-canvas" ref={host} />
        {status !== 'ready' && <img className="garden-preview" src={asset(work.preview)} alt={work.alt} />}
        <div className="garden-shade" aria-hidden="true" />
        <div className="garden-title"><p>IMMERSIVE GALLERY</p><h1>夜の花園</h1><span>NOCTURNAL GARDEN</span></div>
        <div className="garden-badge"><span aria-hidden="true" /> ORIGINAL ARTWORK</div>
        {status === 'loading' && <p className="garden-status" role="status">絵画の空間を準備しています…</p>}
        {failed && <p className="garden-status" role="status">{status === 'unsupported' ? 'この環境では3D表示を利用できません。' : '3D表示を読み込めませんでした。'}プレビュー画像を表示しています。{status === 'error' && <button onClick={() => window.location.reload()}>再読み込み</button>}</p>}
        <div className="garden-toolbar">
          <div className="garden-toolbar-main"><button className="garden-play" type="button" disabled={status !== 'ready'} onClick={() => setPlaying((value) => !value)} aria-pressed={playing}><span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span>{playing ? '一時停止' : '再生する'}</button><span className="garden-control-divider" /><div className="garden-view-switch" role="group" aria-label="鑑賞する位置"><button type="button" disabled={status !== 'ready'} aria-pressed={view === 'room'} onClick={() => setView('room')}>空間を眺める</button><button type="button" disabled={status !== 'ready'} aria-pressed={view === 'painting'} onClick={() => setView('painting')}>絵画に近づく</button></div><button className="garden-icon-button" type="button" disabled={status !== 'ready'} onClick={() => runtime.current?.resetView()} aria-label="視点を戻す" title="視点を戻す">↺</button><button className="garden-icon-button" ref={expandButton} type="button" onClick={toggleFullscreen} aria-label={fullscreen || expanded ? '全画面を終了' : '全画面で鑑賞'} title={fullscreen || expanded ? '全画面を終了' : '全画面で鑑賞'}>{fullscreen || expanded ? '↙' : '⛶'}</button></div>
          <p>{failed ? 'プレビュー表示' : 'ドラッグ・矢印キーで見渡す'}<span>48秒ループ · 音声なし</span></p>
        </div>
      </section>
      <section className="garden-notes" aria-labelledby="garden-about"><div className="garden-note-intro"><p className="garden-section-label">ABOUT THIS WORK</p><h2 id="garden-about">絵画に包まれる、<br />小さな展示室。</h2></div><div className="garden-note-body"><p>藍色の空、花の咲く枝、水辺の光。<br />オリジナルの花園の絵が、壁から床へと広がります。</p><p>枝と水面がゆらぎ、花びらがゆっくりと漂う48秒。<br />見渡したり、絵画に近づいたり、好きな場所から眺めてください。</p><details><summary>作品と素材について</summary><p>この作品のためにAIで新規生成した絵画と、Blenderで制作した展示空間を使っています。既存の絵画や、他施設の上映映像・画像・音楽は使用していません。</p><a href={asset('/credits/nocturnal-garden.txt')}>素材の制作記録を読む ↗</a></details></div><div className="garden-work-number" aria-hidden="true">03</div></section>
    </main>
    <footer className="garden-footer"><a href="/">← ワールド一覧へ戻る</a><span>Three.js Worlds <i>© 2026</i></span></footer>
  </div>;
}
