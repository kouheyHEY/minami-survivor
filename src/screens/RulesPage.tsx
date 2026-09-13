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
        <article><span>02</span><h2>合計7 — 追加ロール</h2><p>7が出たら、任意でもう一度2D6を振れます。追加ロールの出目もそのまま移動数へ加え、再び7ならさらに続行できます。7の後に5なら合計12マス。デメリットはありません。</p></article>
        <article><span>03</span><h2>合計3 — 強化</h2><p>未所持なら3種類から1つ取得。所持中ならそのアイテムをSUPERにします。アイテムは1人1個までです。</p></article>
        <article><span>04</span><h2>アイテムマス</h2><p>10、25、45マス目へ到達するか通過するとアイテムを選べます。所持中は今のアイテムを保持するか、新しいアイテムへ交換できます。45マス目のアイテムは最初からSUPERです。</p></article>
        <article><span>05</span><h2>同マス交換</h2><p>サイコロ移動で相手と同じマスに着地すると、互いの所持アイテムを強制交換します。</p></article>
        <article><span>06</span><h2>順位・後手補正</h2><p>主移動後に2位なら、任意で1マス追加できます。後手は通常チャームを持って開始し、最初の手番だけ2D6を1回振り直せます。</p></article>
      </section>

      <section className="item-rules">
        <div className="section-heading"><span className="section-index">07</span><h2>ITEM ARCHIVE</h2></div>
        <div className="item-rule-grid">
          <article><b>✦</b><h3>{ITEM_LABELS[ITEM_TYPES.BADGE]}</h3><p><strong>NORMAL</strong> 2D6を1回振り直す。</p><p><strong>SUPER</strong> 出目を7に確定する。</p></article>
          <article><b>◇</b><h3>{ITEM_LABELS[ITEM_TYPES.CHARM]}</h3><p><strong>NORMAL</strong> 合計を±1する。</p><p><strong>SUPER</strong> 合計を±2する。</p></article>
          <article><b>↯</b><h3>{ITEM_LABELS[ITEM_TYPES.TOBACCO]}</h3><p><strong>NORMAL</strong> 自分-3、相手-7。</p><p><strong>SUPER</strong> 自分+3、相手-7。</p><p>使用後も通常行動を続けます。この移動ではアイテムを取得しません。</p></article>
        </div>
      </section>
    </main>
  )
}
