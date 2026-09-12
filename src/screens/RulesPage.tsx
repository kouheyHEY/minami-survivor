import { ITEM_LABELS, ITEM_TYPES } from '../game/engine.js'

export function RulesPage() {
  return (
    <main className="rules-page">
      <header className="rules-hero">
        <p className="eyebrow">HOW TO SURVIVE</p>
        <h1>遊び方</h1>
        <p>2D6を振って73マスを目指す。簡単なのは、そこまでです。</p>
      </header>

      <section className="rule-grid">
        <article><span>01</span><h2>基本移動</h2><p>手番では6面サイコロを2個振り、合計値だけ進みます。結果を確認して「番を終わる」を押すまで、次の手番には移りません。先に73マス以上へ到達したプレイヤーが即勝利です。</p></article>
        <article><span>02</span><h2>合計7 — 連鎖</h2><p>7をキープして任意で再挑戦。もう一度7なら移動予定がさらに7マス増えます。駒は「連鎖を確定して進む」を押した時にまとめて移動し、失敗時は合計移動から2マス引きます。ただし連鎖開始時に相手より後ろなら劣勢ボーナスが発動し、失敗してもマイナスはありません。</p></article>
        <article><span>03</span><h2>合計3 — 強化</h2><p>未所持なら3種類から1つ取得。所持中ならそのアイテムをSUPERにします。アイテムは1人1個までです。</p></article>
        <article><span>04</span><h2>アイテムマス</h2><p>10、25、45マス目でアイテムを取得できます。45マス目のアイテムは最初からSUPERです。</p></article>
        <article><span>05</span><h2>同マス交換</h2><p>サイコロ移動で相手と同じマスに着地すると、互いの所持アイテムを強制交換します。</p></article>
        <article><span>06</span><h2>後手補正</h2><p>後手は通常アイテムをランダムで1つ持って開始し、最初の手番だけ2D6を1回振り直せます。</p></article>
      </section>

      <section className="item-rules">
        <div className="section-heading"><span className="section-index">07</span><h2>ITEM ARCHIVE</h2></div>
        <div className="item-rule-grid">
          <article><b>✦</b><h3>{ITEM_LABELS[ITEM_TYPES.BADGE]}</h3><p><strong>NORMAL</strong> 2D6を1回振り直す。</p><p><strong>SUPER</strong> 出目を7に確定する。</p></article>
          <article><b>◇</b><h3>{ITEM_LABELS[ITEM_TYPES.CHARM]}</h3><p><strong>NORMAL</strong> 合計を±1する。</p><p><strong>SUPER</strong> 合計を±2する。</p></article>
          <article><b>↯</b><h3>{ITEM_LABELS[ITEM_TYPES.TOBACCO]}</h3><p><strong>NORMAL</strong> 自分-3、相手-7。</p><p><strong>SUPER</strong> 相手だけ-7。</p></article>
        </div>
      </section>
    </main>
  )
}
