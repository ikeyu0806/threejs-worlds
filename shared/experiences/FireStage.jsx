import { useEffect, useRef, useState } from 'react';
import { createCampfireStage } from './generated/campfire.js';

export default function FireStage({ model, preview, playing }) {
  const host = useRef(null);
  const runtime = useRef(null);
  const playingRef = useRef(playing);
  const [status, setStatus] = useState('loading');
  playingRef.current = playing;

  useEffect(() => {
    setStatus('loading');
    try {
      runtime.current = createCampfireStage(host.current, model, {
        playing: playingRef.current,
        onReady: () => setStatus('ready'),
        onError: () => setStatus('error'),
      });
    } catch {
      setStatus('unsupported');
    }
    return () => { runtime.current?.dispose(); runtime.current = null; };
  }, [model]);

  useEffect(() => { runtime.current?.setPlaying(playing); }, [playing]);

  return <div className="stage-shell">
    <div ref={host} className="fire-stage" />
    {status === 'loading' && <div className="stage-message" role="status">読み込み中…</div>}
    {status === 'unsupported' && <div className="stage-message" role="status">この環境では3D表示を利用できません。</div>}
    {status === 'error' && <div className="stage-message" role="alert">読み込みに失敗しました。再読み込みしてください。</div>}
    {(status === 'unsupported' || status === 'error') && <img className="stage-fallback" src={preview} alt="焚き火" />}
  </div>;
}
