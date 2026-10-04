import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../../shared/icons.jsx';
import Copyright from '../../../shared/Copyright.jsx';
import { createCapital, vistas } from './heian.js';

export default function App() {
  const host = useRef(null), stage = useRef(null), settings = useRef(null);
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  const [vista, setVista] = useState('gate'), [walking, setWalking] = useState(false);
  const [paused, setPaused] = useState(false), [hidden, setHidden] = useState(false);
  const [quality, setQuality] = useState('high'), [status, setStatus] = useState('');
  const current = vistas.find(item => item.id === vista);

  useEffect(() => {
    try { stage.current = createCapital(host.current, setError); setReady(true); }
    catch (failure) { console.error(failure); setError('3D 表示を開始できません。WebGL 2 対応のブラウザで、ハードウェアアクセラレーションを有効にしてください。'); }
    return () => stage.current?.dispose();
  }, []);
  useEffect(() => { stage.current?.pause(paused); }, [paused]);
  useEffect(() => { stage.current?.quality(quality); }, [quality]);
  useEffect(() => { stage.current?.walk(walking); }, [walking]);
  useEffect(() => {
    const keydown = event => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName) || settings.current?.open) return;
      if (event.code === 'KeyH') setHidden(value => !value);
      if (event.code === 'Escape') { setWalking(false); setHidden(false); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);
  function travel(item) {
    setWalking(false); setVista(item.id);
    stage.current?.travel(item.position, item.target);
  }
  function walk() {
    setWalking(value => !value);
    if (!walking) requestAnimationFrame(() => stage.current?.canvas.focus({ preventScroll: true }));
  }
  async function capture() {
    try {
      const blob = await stage.current?.capture();
      if (!blob) throw new Error('No image');
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = `heian-${vista}.png`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setStatus('風景を PNG で保存しました。');
    } catch { setStatus('撮影できませんでした。もう一度お試しください。'); }
  }

  return <main className={`heian ${hidden ? 'hidden-ui' : ''} ${walking ? 'walking' : ''}`}>
    <div className="court-canvas" ref={host} />
    <div className="court-vignette" aria-hidden="true" />
    <a href="#vistas" className="skip-link">展望の選択へ</a>
    <header className="heian-header hud">
      <a href="/" className="entrance-link"><Icon name="back" size={16} /><span>エントランス</span></a>
      <a href="/heian/" className="heian-brand" aria-label="HEIAN 古都の入口"><svg viewBox="0 0 32 32" width="30" height="30" fill="none" aria-hidden="true"><path d="M5 24V13h22v11" stroke="currentColor" strokeWidth="1.2"/><path d="M3 13c4-6 22-6 26 0" stroke="currentColor" strokeWidth="1.2"/><circle cx="26" cy="7" r="1.3" fill="currentColor"/></svg><span>HEIAN<small>A QUIET CAPITAL</small></span></a>
      <button className="quiet-button" onClick={() => settings.current.showModal()}>都の案内 <span>＋</span></button>
    </header>

    <section className="court-hero hud">
      <div className="eyebrow"><i /> CAPITAL AT DAWN <span>／</span> 雅の朝</div>
      <h1>A city of<br />quiet <em>light.</em></h1>
      <p className="hero-ja">朝霧のあいだに、都がある。</p>
      <p className="hero-copy">砂利が、空の色を返す。<br />門は、まだ言葉を持たない。</p>
      <button className="walk-button" onClick={walk} disabled={!ready || !!error}><Icon name="compass" size={17} />{walking ? '眺めるモードへ' : '庭を歩く'}<Icon size={17} /></button>
    </section>

    <aside className="court-label hud"><span>SUZAKU GATE</span><div>都と、<br />ひと息。</div><small>HEIAN / QUIET CAPITAL</small></aside>

    <div className="heian-bottom hud">
      <nav className="vista-nav" id="vistas" aria-label="展望を選択" tabIndex="-1">
        {vistas.map(item => <button key={item.id} aria-pressed={vista === item.id} onClick={() => travel(item)}><span className="vista-number">{item.number}</span><span>{item.name}<small>{item.en}</small></span><span className="vista-arrow">{vista === item.id ? '●' : '↗'}</span></button>)}
      </nav>
      <footer className="heian-footer">
        <div className="world-footer-identity"><div className="vista-caption"><span>{current.number} /</span> {current.note}</div><Copyright /></div>
        <div className="toolbar">
          <button aria-label={paused ? '花の動きを再開' : '花の動きを停止'} aria-pressed={paused} onClick={() => setPaused(value => !value)}><Icon name={paused ? 'play' : 'pause'} size={17} /></button>
          <button aria-label="風景を PNG 保存" disabled={!ready || !!error} onClick={capture}><Icon name="camera" size={18} /></button>
          <button aria-label="UIを隠す" onClick={() => setHidden(true)}><Icon name="eye" size={19} /></button>
        </div>
      </footer>
      <div className="interaction-note">{walking ? <><kbd>W A S D</kbd> 移動 <span>·</span> Shift で速く <span>·</span> Esc で戻る</> : <>ドラッグで見回す <span>·</span> <kbd>H</kbd> UI を隠す</>}</div>
    </div>
    {walking && <div className="touch-pad hud" aria-label="庭の移動">{[[0, 1, 'up', '前に移動'], [-1, 0, 'left', '左に移動'], [0, -1, 'down', '後ろに移動'], [1, 0, 'right', '右に移動']].map(([x, z, icon, label]) => <button key={label} aria-label={label} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); stage.current?.move(x, z); }} onPointerUp={() => stage.current?.move(0, 0)} onPointerCancel={() => stage.current?.move(0, 0)} onLostPointerCapture={() => stage.current?.move(0, 0)}><Icon name={icon} size={18} /></button>)}</div>}
    {hidden && <button className="restore-ui" onClick={() => setHidden(false)}><Icon name="eye" size={16} /> UI を表示</button>}
    {!ready && !error && <div className="scene-message" role="status">朝霧を集めています。</div>}
    {error && <div className="scene-message" role="alert"><h2>都に接続できません</h2><p>{error}</p><button onClick={() => location.reload()}>再読み込み</button><a href="/">エントランスへ戻る</a></div>}
    <span className="sr-only" role="status">{status}</span>

    <dialog ref={settings} className="guide" aria-labelledby="guide-title" onClose={() => stage.current?.pause(paused)}>
      <div className="guide-heading"><span>FIELD NOTES / HEIAN</span><button aria-label="案内を閉じる" onClick={() => settings.current.close()}><Icon name="close" /></button></div>
      <h2 id="guide-title">都の過ごし方</h2>
      <p>展望ボタンで、朱雀門・庭の池・月の縁側へ移動できます。画面をドラッグすると周囲を見回せます。</p>
      <dl><div><dt>庭を歩く</dt><dd>WASD / 矢印キー</dd></div><div><dt>速く移動する</dt><dd>Shift</dd></div><div><dt>眺めるモードへ戻る</dt><dd>Esc</dd></div><div><dt>UI の表示切替</dt><dd>H</dd></div></dl>
      <p className="guide-small">スマートフォンでは、歩くモードの矢印ボタンで移動できます。花の動きは右下のボタンで停止できます。</p>
      <label className="quality-label" htmlFor="quality">描画品質<select id="quality" value={quality} onChange={event => setQuality(event.target.value)}><option value="high">高品質</option><option value="low">軽量（発光を省略）</option></select></label>
    </dialog>
  </main>;
}
