import { useEffect, useId, useRef, useState } from 'react';
import Copyright from '../../../shared/Copyright.jsx';
import { ArrowUpRight, ArrowRight, Camera, Check, ChevronRight, CloudRain, Compass, Crosshair, Download, Expand, Eye, Headphones, HelpCircle, MapPin, Navigation, Pause, Play, Radio, Settings2, Volume2, VolumeX, X, ArrowUp, ArrowDown, ArrowLeft, ExternalLink } from 'lucide-react';
import { createCity, DISTRICTS } from './city.js';
import { createAmbience } from './audio.js';

const REFERENCES = [
  { name: 'Cyber Streets', author: 'HelloRuler / RenderHub', url: 'https://www.renderhub.com/gallery/50113/cyber-streets', image: 'https://cdn.renderhub.com/helloruler/gallery/cyber-streets.jpg', detail: '高密度な看板、雑居ビル、濡れた路面の色。' },
  { name: 'Cyber night city', author: 'Dafikunn / Displate', url: 'https://displate.com/displate/7391931', image: 'https://static.displate.com/857x1200/displate/2024-07-06/426ad270704b165fbdaa09060b242701_e81a80beceeb01c1d8781ca75e94f843.jpg', detail: '赤い提灯と高層ビル。暮らしと未来の技術が同居する路地。' },
  { name: 'Japan Neon Alley', author: 'Space Art / Displate', url: 'https://displate.com/displate/7413490', image: 'https://static.displate.com/857x1200/displate/2024-07-23/3e2e039d4747b49188234ca2943e0899_dcf34ad9a4619ebbad7bb18c604c7b10.jpg', detail: '青緑と赤紫の対比。配線と霧が作る奥行き。' },
];

function Dialog({ title, eyebrow, open, onClose, children, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (open && !ref.current.open) ref.current.showModal();
    if (!open && ref.current.open) ref.current.close();
  }, [open]);
  return <dialog ref={ref} className={`panel ${wide ? 'wide' : ''}`} aria-labelledby={titleId} onCancel={onClose} onClose={onClose} onClick={e => { if (e.target === ref.current) { const r = ref.current.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}>
    <div className="panel-header"><div><span className="eyebrow">{eyebrow}</span><h2 id={titleId}>{title}</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose}><X size={20} /></button></div>
    {children}
  </dialog>;
}

function Minimap({ position, district, onTravel }) {
  const markerY = 24 + (20 - position.z) / 120 * 108;
  return <div className="minimap">
    <div className="map-heading"><span>SECTOR MAP</span><span>N <Navigation size={10} /></span></div>
    <svg viewBox="0 0 190 155" role="img" aria-label={`街区マップ。現在地 ${district.name}`}>
      <defs><pattern id="map-grid" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M14 0H0V14" fill="none" stroke="#7c9399" strokeWidth="0.4" opacity="0.16" /></pattern></defs>
      <rect width="190" height="155" fill="url(#map-grid)" />
      <g fill="#193038" stroke="#4e6870" strokeWidth="0.6" opacity="0.8">
        <path d="M23 16h50v24H23zM29 46h44v21H29zM18 75h55v25H18zM29 108h44v27H29zM114 16h48v29h-48zM114 53h55v22h-55zM114 83h40v24h-40zM114 115h50v20h-50z" />
      </g>
      <path d="M94 14v126M12 71h166M12 105h166" fill="none" stroke="#8dbab5" strokeWidth="1" strokeDasharray="3 4" opacity="0.4" />
      {[33, 74, 111].map((y, i) => <g key={y} className="map-point" onClick={() => onTravel(DISTRICTS[i].id)}><circle cx="94" cy={y} r="9" fill="transparent" /><circle cx="94" cy={y} r="2.5" fill="#699d98" /></g>)}
      <g transform={`translate(${94 + position.x * 4}, ${markerY}) rotate(${-position.yaw * 180 / Math.PI})`}>
        <circle r="11" fill="#9ee9d0" opacity="0.1" /><circle r="5" fill="#9ee9d0" opacity="0.15" /><path d="m0-5 3.5 9L0 2l-3.5 2z" fill="#a4f4d9" />
      </g>
      <text x="10" y="150" fill="#738e93" fontSize="6" fontFamily="monospace">22°18′ N / 114°10′ E</text>
    </svg>
    <div className="map-location"><MapPin size={12} /><span>{district.name}</span><span className="map-sector">N–09</span></div>
  </div>;
}

export default function App() {
  const host = useRef(null), city = useRef(null), audio = useRef(null), toastTimeout = useRef(null);
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  const [mode, setMode] = useState('cinematic'), [districtId, setDistrictId] = useState('alley');
  const [position, setPosition] = useState({ x: 0, z: 17, yaw: 0 });
  const [dialog, setDialog] = useState(null), [sound, setSound] = useState(false);
  const [paused, setPaused] = useState(false), [hidden, setHidden] = useState(false), [toast, setToast] = useState('');
  const [photo, setPhoto] = useState(null);
  const [failedReferences, setFailedReferences] = useState({});
  const [settings, setSettings] = useState({ rain: 0.7, bloom: 0.55, fog: 0.018, quality: 'high' });
  const district = DISTRICTS.find(d => d.id === districtId);
  const notify = message => { setToast(message); clearTimeout(toastTimeout.current); toastTimeout.current = setTimeout(() => setToast(''), 3500); };

  useEffect(() => {
    try {
      city.current = createCity(host.current, { onReady: () => setReady(true), onPosition: setPosition });
    } catch (e) {
      console.error(e); setError('3D表示を開始できませんでした。WebGL 2に対応したブラウザで、ハードウェアアクセラレーションを有効にしてください。');
    }
    return () => { city.current?.dispose(); audio.current?.dispose(); clearTimeout(toastTimeout.current); };
  }, []);
  useEffect(() => { city.current?.setMode(mode); }, [mode]);
  useEffect(() => { city.current?.setPaused(paused || !!dialog); }, [paused, dialog]);
  useEffect(() => { city.current?.settings(settings); audio.current?.rain(settings.rain); }, [settings]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);
  useEffect(() => {
    const onKey = e => {
      if (document.querySelector('dialog[open]') || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === 'KeyH') setHidden(h => !h);
      if (e.code === 'Escape') { setMode('cinematic'); setHidden(false); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);

  const travel = id => { setDistrictId(id); city.current?.travel(id); };
  const changeMode = value => {
    setMode(value);
    if (value === 'walk') { host.current.querySelector('canvas')?.focus(); notify('WASDで移動 · ドラッグで見回す · Shiftで走る'); }
    else city.current?.travel(districtId);
  };
  const toggleSound = async () => {
    try {
      if (!audio.current) audio.current = createAmbience();
      if (!audio.current) { notify('このブラウザでは環境音を再生できません。'); return; }
      await audio.current.enable(!sound); audio.current.rain(settings.rain); setSound(!sound);
    } catch { notify('環境音を開始できませんでした。もう一度お試しください。'); }
  };
  const capture = async () => {
    if (!city.current) return;
    try {
      const blob = await city.current.capture();
      if (!blob) { notify('撮影できませんでした。もう一度お試しください。'); return; }
      setPhoto({ url: URL.createObjectURL(blob), filename: `afterlight-${districtId}-${Date.now()}.png` });
      setDialog('photo');
    } catch { notify('撮影できませんでした。もう一度お試しください。'); }
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else notify('このブラウザでは全画面表示を利用できません。');
    } catch { notify('全画面表示を開始できませんでした。'); }
  };
  const update = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  return <main className={`experience ${hidden ? 'hud-hidden' : ''} ${mode === 'walk' ? 'walking' : ''}`}>
    <div ref={host} className="city-canvas" />
    <div className="cinematic-shade" aria-hidden="true" />
    <div className="film-grain" aria-hidden="true" />
    {!ready && !error && <div className="loading" role="status"><div className="loading-symbol">A</div><span>街の灯りをともしています</span><div className="loading-line" /></div>}
    {error && <div className="error-panel" role="alert"><h1>街に接続できません</h1><p>{error}</p><button className="primary-button" onClick={() => location.reload()}>再接続する <ArrowRight size={18} /></button></div>}

    <header className="header hud">
      <button className="brand" onClick={() => { travel('alley'); setMode('cinematic'); }} aria-label="AFTERLIGHT 街の入口へ戻る">
        <svg viewBox="0 0 36 40" aria-hidden="true"><path d="M2 31 16 3h5l14 28H24l-6-13-6 13z" fill="currentColor" /><path d="M12 37h14" stroke="currentColor" strokeWidth="2" /></svg>
        <span>AFTERLIGHT<span className="brand-sub">WORLD EXPLORER</span></span>
      </button>
      <nav className="top-nav" aria-label="メイン"><button className="active" onClick={() => setDialog(null)}>探索<span>EXPLORE</span></button><button onClick={() => setDialog('world')}>世界観<span>THE WORLD</span></button><button onClick={() => setDialog('references')}>参考イメージ<span>INSPIRATION</span><ArrowUpRight size={12} /></button></nav>
      <div className="header-right"><a className="world-return" href="/" aria-label="エントランスへ戻る"><ArrowLeft size={15} /><span>エントランス</span></a><span className="connection"><i /> LIVE WORLD</span><span className="header-divider" /><button className="icon-button" aria-label="表示設定" onClick={() => setDialog('settings')}><Settings2 size={18} /></button></div>
    </header>

    <aside className="district-label hud"><span className="small-line" /><span>九龍北区</span><span className="mono">KOWLOON NORTH / 2086</span></aside>
    <div className="weather hud"><CloudRain size={21} strokeWidth={1.3} /><div><span>23:48</span><small>{settings.rain > 0 ? '小雨' : '曇り'} <i /> 18°C</small></div><span className="weather-line" /><span className="weather-code">夜<br />NIGHT</span></div>

    <section className="hero hud">
      <div className="hero-kicker"><span className="coordinate">N–09</span><span>THE CITY NEVER SLEEPS</span></div>
      <h1>AFTER<span>LIGHT<span className="title-dot">.</span></span></h1>
      <p className="hero-japanese">光の先に、眠らない街。</p>
      <p className="hero-description">企業の影。路地の熱。雨に滲むネオン。<br />この街では、未来にも裏通りがある。</p>
      <button className="primary-button" disabled={!ready} onClick={() => changeMode(mode === 'walk' ? 'cinematic' : 'walk')}><Navigation size={16} />{mode === 'walk' ? '街を眺める' : '街を歩く'}<ArrowUpRight size={19} /></button>
      <div className="headphone-note"><Headphones size={12} /><span>ヘッドホンで、街の空気まで。</span><button onClick={toggleSound}>{sound ? '音をオフ' : '音をオン'}<ArrowUpRight size={10} /></button></div>
    </section>

    <aside className="right-hud hud"><div className="danger"><span className="danger-cross">+</span><div>UNREGULATED ZONE<small>企業管轄外区域</small></div><span className="danger-bars"><i /><i /><i /><i /><i /></span></div><Minimap position={position} district={district} onTravel={travel} /></aside>

    <nav className="district-selector hud" aria-label="街区を選択"><div className="selector-label"><Compass size={13} /><span>街区を探索</span></div><div className="district-options">{DISTRICTS.map(d => <button key={d.id} className={d.id === districtId ? 'selected' : ''} aria-pressed={d.id === districtId} onClick={() => travel(d.id)}><span className="district-number">{d.number}</span><span className="district-name">{d.name}<small>{d.en}</small></span>{d.id === districtId ? <span className="selected-dot" /> : <ChevronRight size={13} />}</button>)}</div></nav>

    <footer className="footer hud"><div className="world-footer-identity"><div className="footer-left"><span className="footer-diamond" /> A NIGHT IN THE UNDERCITY<span className="footer-slash">/</span><span className="footer-version">VOL. 001</span></div><Copyright /></div><div className="control-hint">{mode === 'walk' ? <><kbd>W A S D</kbd> 移動<span>·</span><kbd>SHIFT</kbd> 走る<span>·</span>ドラッグで見回す</> : <><Crosshair size={12} /> ドラッグで見回す<span>·</span><kbd>H</kbd> UIを隠す</>}</div><div className="toolbar"><button className="icon-button" onClick={() => setPaused(p => !p)} aria-label={paused ? 'アニメーションを再開' : 'アニメーションを停止'} aria-pressed={paused}>{paused ? <Play size={16} /> : <Pause size={16} />}</button><button className="icon-button" onClick={toggleSound} aria-label="環境音" aria-pressed={sound}>{sound ? <Volume2 size={17} /> : <VolumeX size={17} />}</button><span className="toolbar-divider" /><button className="icon-button" onClick={capture} aria-label="風景を撮影" disabled={!ready}><Camera size={17} /></button><button className="icon-button" onClick={() => setHidden(true)} aria-label="UIを隠す"><Eye size={17} /></button><button className="icon-button" onClick={fullscreen} aria-label="全画面表示"><Expand size={17} /></button><button className="icon-button help-button" onClick={() => setDialog('help')} aria-label="操作方法"><HelpCircle size={17} /></button></div></footer>

    {mode === 'walk' && <><div className="crosshair" aria-hidden="true" /><button className="walk-exit hud" onClick={() => changeMode('cinematic')}>眺めるモードに戻る <X size={14} /></button><div className="touch-controls hud" aria-label="タッチ移動">{[[0, 1, ArrowUp, '前に移動'], [-1, 0, ArrowLeft, '左に移動'], [0, -1, ArrowDown, '後ろに移動'], [1, 0, ArrowRight, '右に移動']].map(([x, y, Icon, name]) => <button key={name} aria-label={name} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); city.current?.setTouchMove(x, y); }} onPointerUp={() => city.current?.setTouchMove(0, 0)} onPointerCancel={() => city.current?.setTouchMove(0, 0)} onLostPointerCapture={() => city.current?.setTouchMove(0, 0)}><Icon size={20} /></button>)}</div></>}
    {hidden && <button className="show-hud" onClick={() => setHidden(false)}><Eye size={14} />UIを表示 <kbd>H</kbd></button>}
    <div className={`toast ${toast ? 'visible' : ''}`} role="status">{toast && <><Check size={15} /><span>{toast}</span></>}</div>

    <Dialog open={dialog === 'settings'} onClose={() => setDialog(null)} eyebrow="ATMOSPHERE" title="街の空気を変える">
      <p className="panel-intro">あなたの夜に、光と雨を。</p>
      <div className="setting"><label htmlFor="rain">雨の強さ<span>{Math.round(settings.rain * 100)}%</span></label><input id="rain" type="range" min="0" max="1" step="0.05" value={settings.rain} onChange={e => update('rain', +e.target.value)} /><div className="range-ends"><span>雨なし</span><span>強い雨</span></div></div>
      <div className="setting"><label htmlFor="bloom">ネオンの光<span>{Math.round(settings.bloom * 100)}%</span></label><input id="bloom" type="range" min="0" max="1.3" step="0.05" value={settings.bloom} onChange={e => update('bloom', +e.target.value)} /><div className="range-ends"><span>シャープ</span><span>柔らかい光</span></div></div>
      <div className="setting"><label htmlFor="fog">霧の濃さ<span>{Math.round((settings.fog - 0.006) / 0.03 * 100)}%</span></label><input id="fog" type="range" min="0.006" max="0.036" step="0.001" value={settings.fog} onChange={e => update('fog', +e.target.value)} /><div className="range-ends"><span>澄んだ空気</span><span>深い霧</span></div></div>
      <div className="setting quality-setting"><label htmlFor="quality">描画品質</label><select id="quality" value={settings.quality} onChange={e => update('quality', e.target.value)}><option value="high">高品質 · 路面の反射あり</option><option value="low">軽量 · 動作を優先</option></select></div>
      <button className="text-button" onClick={() => setSettings({ rain: 0.7, bloom: 0.55, fog: 0.018, quality: 'high' })}>初期設定に戻す <ArrowRight size={14} /></button>
    </Dialog>
    <Dialog open={dialog === 'photo'} onClose={() => setDialog(null)} eyebrow="PHOTO MODE" title="この夜を、持ち帰る。" wide>
      {photo && <><img className="photo-preview" src={photo.url} alt={`${district.name}の風景。UIを除いた撮影画像。`} /><div className="photo-actions"><span>{district.name}<small>AFTERLIGHT / 2086</small></span><a className="primary-button" href={photo.url} download={photo.filename}><Download size={15} />PNGを保存<ArrowDown size={16} /></a></div></>}
    </Dialog>
    <Dialog open={dialog === 'help'} onClose={() => setDialog(null)} eyebrow="FIELD GUIDE" title="街の歩き方">
      <p className="panel-intro">「街を歩く」で、路地の中へ。スマートフォンでは画面下の矢印を押して移動できます。</p>
      <div className="help-row"><span>歩く</span><kbd>W A S D</kbd></div><div className="help-row"><span>前後に移動／左右を向く</span><kbd>↑ ↓ ← →</kbd></div><div className="help-row"><span>周囲を見回す</span><span>画面をドラッグ</span></div><div className="help-row"><span>走る</span><kbd>SHIFT</kbd></div><div className="help-row"><span>UIを表示／非表示</span><kbd>H</kbd></div><div className="help-row"><span>眺めるモードに戻る</span><kbd>ESC</kbd></div>
      <p className="panel-footnote">街区ボタンで3つの場所へ移動できます。カメラボタンでUIのない風景を保存。表示設定から雨・ネオン・霧を調整できます。</p>
    </Dialog>
    <Dialog open={dialog === 'world'} onClose={() => setDialog(null)} eyebrow="WORLD ARCHIVE / 2086" title="未来にも、裏通りがある。">
      <div className="world-badge"><span>九</span><span>龍</span><small>NORTH SECTOR · 09</small></div>
      <p className="world-copy">2086年。空の上は企業が所有し、空の下には、そこからこぼれ落ちた人々が暮らす。</p><p className="world-copy">九龍北区は、都市ネットワークから切り離された企業管轄外区域。義体の修理屋、記憶の闇市、一晩だけのホテル。最先端の技術と、変わらない暮らしが、同じ路地で息をしている。</p><p className="world-copy muted">監視ドローンが頭上を通り過ぎる。看板が一瞬だけ消える。雨は、何も洗い流さない。</p>
      <div className="archive-location"><Radio size={16} /><span>接続先：九龍北区<span>FICTIONAL WORLD / ORIGINAL ENVIRONMENT</span></span></div>
    </Dialog>
    <Dialog open={dialog === 'references'} onClose={() => setDialog(null)} eyebrow="VISUAL RESEARCH" title="街のインスピレーション" wide>
      <p className="panel-intro">Webで集めた参考イメージ。光、密度、路地の生活感を、オリジナルの3D空間に落とし込みました。</p>
      <div className="reference-grid">{REFERENCES.map(r => <a className="reference-card" href={r.url} target="_blank" rel="noreferrer" key={r.name}><div className="reference-image">{failedReferences[r.name] ? <span className="reference-fallback">画像は出典で見る<ArrowUpRight size={22} /></span> : <img src={r.image} alt={r.detail} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedReferences(previous => ({ ...previous, [r.name]: true }))} />}<ExternalLink size={16} /></div><small>{r.author}</small><h3>{r.name}<ArrowUpRight size={17} /></h3><p>{r.detail}</p></a>)}</div>
      <p className="panel-footnote">画像は各作者の作品です。参考としてリンクを紹介しています。街の形状・看板・テクスチャはこのプロジェクトで生成しています。</p>
    </Dialog>
  </main>;
}
