import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../../shared/icons.jsx';
import Copyright from '../../../shared/Copyright.jsx';
import { worlds } from '../../../shared/worlds.js';
import { createGallery } from './gallery.js';

export default function App() {
  const container = useRef(null), stage = useRef(null);
  const [focused, setFocused] = useState(null), [paused, setPaused] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    try { stage.current = createGallery(container.current, { onHover: setFocused, onError: setError }); }
    catch (failure) { console.error(failure); setError('3D 表示を開始できませんでした。画面下のリンクから各ワールドへ移動できます。'); }
    return () => stage.current?.dispose();
  }, []);
  useEffect(() => { stage.current?.focus(focused); }, [focused]);
  useEffect(() => { stage.current?.pause(paused); }, [paused]);

  return <main className="entrance">
    <div ref={container} className="gallery-canvas" />
    <div className="gallery-wash" aria-hidden="true" />
    <a className="skip-link" href="#worlds">ワールドを選ぶ</a>
    <header className="entrance-header">
      <a href="/" className="orbit-brand" aria-label="ORBIT エントランス"><svg viewBox="0 0 40 40" width="38" height="38" fill="none" aria-hidden="true"><circle cx="20" cy="20" r="8" stroke="currentColor"/><ellipse cx="20" cy="20" rx="18" ry="6.7" stroke="currentColor" transform="rotate(-35 20 20)"/><circle cx="32" cy="10" r="2.2" fill="currentColor"/></svg><span>ORBIT<small>A WORLD ATELIER</small></span></a>
      <nav aria-label="メイン"><a href="#worlds">ワールドを選ぶ <Icon size={13} /></a></nav>
      <span className="entrance-edition">COLLECTION <span>01—{String(worlds.length).padStart(2, '0')}</span></span>
    </header>

    <section className="entrance-intro">
      <div className="intro-eyebrow">THE SPACE BETWEEN WORLDS</div>
      <h1>Somewhere, <em>beyond.</em></h1>
      <p>ここから、世界へ。</p>
    </section>

    <div className="gallery-spacer"><span className="gallery-side-note">A DIFFERENT WORLD.<br />A DIFFERENT FEELING.</span><span className="gallery-instruction"><Icon name="compass" size={14} /> ゲートをクリックして、その先へ。</span></div>

    <section className="worlds-section" id="worlds" tabIndex="-1" aria-labelledby="worlds-title">
      <div className="worlds-heading"><h2 id="worlds-title">次は、どこへ。</h2><span>TWO WORLDS, YOUR OWN PACE</span></div>
      <div className="world-links">{worlds.map(world => <a key={world.id} href={world.href} className={`world-card ${focused === world.id ? 'focused' : ''}`} onMouseEnter={() => setFocused(world.id)} onMouseLeave={() => setFocused(null)} onFocus={() => setFocused(world.id)} onBlur={() => setFocused(null)} style={{ '--world-color': world.color }}><span className="world-number">{world.number}</span><div className="world-details"><div className="world-category">{world.category}</div><h3>{world.title}<span>{world.subtitle}</span></h3><p>{world.description}</p></div><span className="world-enter"><Icon size={22} /><span>この世界へ</span></span></a>)}</div>
    </section>

    <footer className="entrance-footer"><div className="world-footer-identity"><span className="footer-tagline">ORBIT <i /> A COLLECTION OF SMALL ESCAPES</span><Copyright /></div><div className="entrance-footer-controls"><span>ドラッグで見回す</span><button onClick={() => setPaused(value => !value)} aria-label={paused ? 'ギャラリーの動きを再開' : 'ギャラリーの動きを停止'} aria-pressed={paused}><Icon name={paused ? 'play' : 'pause'} size={15} /></button></div></footer>
    {error && <p className="gallery-error" role="alert">{error}</p>}
  </main>;
}
