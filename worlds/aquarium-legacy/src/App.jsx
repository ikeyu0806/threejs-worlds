import ocean from "../artifacts/pelagic-desktop.jpg";
import reef from "../artifacts/pelagic-reef.jpg";
import jelly from "../artifacts/pelagic-jelly.jpg";

export default function App() {
  return (
    <main className="archive">
      <header>
        <a href="/aquarium/">← 今の水槽へ</a>
        <span>PELAGIC / ARCHIVE</span>
      </header>
      <section className="archive-intro">
        <p>THE FIRST AQUARIUM</p>
        <h1>青の記憶。</h1>
        <p>
          はじまりの PELAGIC を、写真で振り返る。
          <br />
          生きものたちは、新しい黒潮の水槽へ。
        </p>
        <a href="/aquarium/">ジンベエザメと泳ぐ、7種に会う ↗</a>
      </section>
      <div className="archive-gallery">
        {[
          [ocean, "01 / 大海の窓", "旧水族館の大水槽と観覧室"],
          [reef, "02 / 珊瑚の庭", "旧水族館の珊瑚礁展示"],
          [jelly, "03 / クラゲの光", "旧水族館のクラゲ展示"],
        ].map(([src, title, alt]) => (
          <figure key={title}>
            <img src={src} alt={alt} loading="lazy" width="1440" height="900" />
            <figcaption>{title}</figcaption>
          </figure>
        ))}
      </div>
      <footer>
        PELAGIC — 2026 ARCHIVE <a href="/">エントランスへ</a>
      </footer>
    </main>
  );
}
