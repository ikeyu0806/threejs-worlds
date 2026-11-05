import { useEffect, useRef, useState } from 'react';
import { createLakesideStage } from './generated/lakeside.js';

export default function LakeStage({ model, preview, playing, resetKey }) {
  const host = useRef(null);
  const runtime = useRef(null);
  const playingRef = useRef(playing);
  const [status, setStatus] = useState('loading');
  playingRef.current = playing;

  useEffect(() => {
    setStatus('loading');
    try {
      runtime.current = createLakesideStage(host.current, model, {
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
  useEffect(() => { if (resetKey) runtime.current?.resetView(); }, [resetKey]);

  return <div className="stage-shell">
    <div ref={host} className="fire-stage lake-stage" />
    {status === 'loading' && <div className="stage-message" role="status">湖畔を準備しています…</div>}
    {status === 'unsupported' && <div className="stage-message" role="status">この環境では3D表示を利用できません。プレビュー画像を表示しています。</div>}
    {status === 'error' && <div className="stage-message" role="alert">3D表示を読み込めませんでした。再読み込みしてください。</div>}
    {(status === 'unsupported' || status === 'error') && <img className="stage-fallback" src={preview} alt="月と森が映る湖、桟橋と蛍" />}
  </div>;
}
