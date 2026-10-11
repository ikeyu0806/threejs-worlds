import { useEffect, useRef, useState } from "react";
import { createAquarium, viewpoints } from "./aquarium.js";

function Icon({ name }) {
  const paths = {
    back: "M19 12H5m6-6-6 6 6 6",
    pause: "M9 5v14M15 5v14",
    play: "m9 5 10 7-10 7V5Z",
    camera: "M4 7h4l2-3h4l2 3h4v13H4V7Zm12 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    expand: "M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    close: "m6 6 12 12M6 18 18 6",
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export default function App() {
  const host = useRef(null),
    stage = useRef(null),
    guide = useRef(null);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(0);
  const [view, setView] = useState("front"),
    [paused, setPaused] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  const [hidden, setHidden] = useState(false),
    [quality, setQuality] = useState("high"),
    [status, setStatus] = useState("");
  useEffect(() => {
    let active = true,
      created;
    createAquarium(host.current, {
      onError: (message) => active && setError(message),
      onProgress: (value) => active && setProgress(value),
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    })
      .then((value) => {
        created = value;
        if (!active) {
          value.dispose();
          return;
        }
        stage.current = value;
        setReady(true);
      })
      .catch((failure) => {
        console.error(failure);
        if (active)
          setError(
            failure.message.includes("ジンベエザメ")
              ? failure.message
              : "3D 表示を開始できませんでした。WebGL 2 に対応したブラウザでお試しください。",
          );
      });
    return () => {
      active = false;
      created?.dispose();
      stage.current = null;
    };
  }, []);
  useEffect(() => {
    stage.current?.pause(paused);
  }, [paused, ready]);
  useEffect(() => {
    stage.current?.quality(quality);
  }, [quality, ready]);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const changed = (event) => {
      if (event.matches) setPaused(true);
    };
    motion.addEventListener("change", changed);
    const key = (event) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        guide.current?.open ||
        ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(event.target.tagName)
      )
        return;
      if (event.code === "KeyH") setHidden((value) => !value);
      if (event.code === "Space") {
        event.preventDefault();
        setPaused((value) => !value);
      }
      if (event.code === "Escape") setHidden(false);
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      motion.removeEventListener("change", changed);
    };
  }, []);
  function changeView(id) {
    setView(id);
    stage.current?.selectView(id);
  }
  async function capture() {
    try {
      const blob = await stage.current?.capture();
      if (!blob) throw Error();
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "pelagic-kuroshio.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setStatus("水槽の写真を保存しました。");
    } catch {
      setStatus("写真を保存できませんでした。もう一度お試しください。");
    }
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else setStatus("このブラウザは全画面表示に対応していません。");
    } catch {
      setStatus("全画面表示に切り替えられませんでした。");
    }
  }
  return (
    <main className={`aquarium ${hidden ? "immersed" : ""}`}>
      <div className="canvas-host" ref={host} />
      <div className="vignette" aria-hidden="true" />
      <header className="topbar hud">
        <a className="back" href="/" aria-label="エントランスへ戻る">
          <Icon name="back" />
          <span>WORLDS</span>
        </a>
        <a className="brand" href="/aquarium/">
          PELAGIC<span>AQUARIUM STUDIES</span>
        </a>
        <button
          className="guide-button"
          onClick={() => guide.current.showModal()}
        >
          この水槽について<span>＋</span>
        </button>
      </header>
      <div className="exhibit-index hud">
        <span className="live-dot" /> ONE TANK. ONE ENCOUNTER.
        <span className="index-rule" />
        STUDY 01
      </div>
      <div className="bottom-panel hud">
        <section className="title-block">
          <p className="eyebrow">黒潮に、身をゆだねる。</p>
          <h1>
            Kuroshio<span>黒潮</span>
          </h1>
          <p className="subtitle">ジンベエザメのいる、大きな青。</p>
        </section>
        <div className="specimen">
          <span className="specimen-line" />
          <div>
            <p>ジンベエザメ</p>
            <i>Rhincodon typus</i>
            <small>WHALE SHARK</small>
          </div>
        </div>
        <div className="control-row">
          <nav className="viewpoints" aria-label="観覧位置">
            {viewpoints.map((item) => (
              <button
                key={item.id}
                aria-pressed={view === item.id}
                disabled={!ready || !!error}
                onClick={() => changeView(item.id)}
              >
                <small>{item.number}</small>
                {item.label}
              </button>
            ))}
          </nav>
          <p className="gesture-hint">
            ドラッグで見回す<span> · </span>スクロールで近づく
          </p>
          <div className="tools">
            <button
              aria-label={paused ? "泳ぎを再開" : "泳ぎを止める"}
              title={paused ? "泳ぎを再開" : "泳ぎを止める"}
              aria-pressed={paused}
              disabled={!ready || !!error}
              onClick={() => setPaused((value) => !value)}
            >
              <Icon name={paused ? "play" : "pause"} />
            </button>
            <button
              aria-label="写真を保存"
              title="写真を保存"
              disabled={!ready || !!error}
              onClick={capture}
            >
              <Icon name="camera" />
            </button>
            <button
              aria-label="全画面表示"
              title="全画面表示"
              onClick={fullscreen}
            >
              <Icon name="expand" />
            </button>
            <button
              aria-label="操作表示を隠す"
              title="操作表示を隠す（H）"
              onClick={() => setHidden(true)}
            >
              <Icon name="eye" />
            </button>
          </div>
        </div>
        <footer>
          <span>
            PELAGIC <span className="muted">/</span> A MOMENT UNDER THE SURFACE
          </span>
          <span>© {new Date().getFullYear()} ikeyu</span>
        </footer>
      </div>
      {hidden && (
        <button
          className="restore"
          onClick={() => setHidden(false)}
          aria-label="操作表示を戻す"
        >
          <Icon name="eye" />
          <span>操作を表示</span>
        </button>
      )}
      {(!ready || error) && (
        <div className="loading" role={error ? "alert" : "status"}>
          <span className="loading-mark">P</span>
          <h2>{error ? "水槽を表示できません" : "青の向こうへ。"}</h2>
          <p>{error || "ジンベエザメを迎えています"}</p>
          {error ? (
            <button onClick={() => window.location.reload()}>再読み込み</button>
          ) : (
            <div className="loading-track">
              <span style={{ width: `${Math.max(4, progress * 100)}%` }} />
            </div>
          )}
        </div>
      )}
      <div className="toast" role="status" onAnimationEnd={() => setStatus("")}>
        {status}
      </div>
      <dialog ref={guide} className="guide" aria-labelledby="guide-title">
        <button
          className="close"
          aria-label="閉じる"
          onClick={() => guide.current.close()}
        >
          <Icon name="close" />
        </button>
        <p className="eyebrow">PELAGIC / STUDY 01</p>
        <h2 id="guide-title">
          ひとつの水槽を、
          <br />
          ゆっくり眺める。
        </h2>
        <p>
          幅広い頭、小さな目、5対のえら。白い斑点をまとったジンベエザメが、尾をゆっくり振って回遊します。観覧室の目の高さから、大きさと水の奥行きを感じてください。
        </p>
        <dl>
          <div>
            <dt>モデルの全長</dt>
            <dd>約 8.3 m</dd>
          </div>
          <div>
            <dt>観覧窓の寸法</dt>
            <dd>22.5 × 8.2 m</dd>
          </div>
          <div>
            <dt>操作</dt>
            <dd>ドラッグ / ピンチ・スクロール</dd>
          </div>
          <div>
            <dt>キーボード</dt>
            <dd>矢印：見回す / Space：停止 / H：表示</dd>
          </div>
        </dl>
        <label className="quality-setting">
          描画品質
          <select
            value={quality}
            onChange={(event) => setQuality(event.target.value)}
          >
            <option value="high">高精細</option>
            <option value="low">軽量（床の反射を省略）</option>
          </select>
        </label>
        <p className="reference-note">
          沖縄美ら海水族館の大水槽と、生物学的な資料を参考に制作したオリジナルの
          CG です。実在する施設や個体を正確に再現したものではありません。
        </p>
        <div className="reference-links">
          <a
            href="https://churaumi.okinawa/area/the-kuroshio/kuroshio/"
            target="_blank"
            rel="noreferrer"
          >
            美ら海水族館「黒潮の海」 ↗
          </a>
          <a
            href="https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/whale-shark/"
            target="_blank"
            rel="noreferrer"
          >
            Florida Museum / 形状の資料 ↗
          </a>
          <a href="/aquarium-legacy/">旧 PELAGIC アーカイブ ↗</a>
        </div>
      </dialog>
    </main>
  );
}
