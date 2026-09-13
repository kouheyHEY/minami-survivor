import { useSelector } from "@tanstack/react-store";
import {
    GOAL,
    ITEM_LABELS,
    ITEM_SPACES,
    ITEM_TYPES,
    type GameState,
    type ItemType,
    type Player,
} from "../game/engine.js";
import { gameActions, gameStore } from "../game/store.js";

const ITEM_META: Record<
    ItemType,
    { icon: string; label: string; short: string; normal: string; super: string }
> = {
    [ITEM_TYPES.BADGE]: {
        icon: "✦",
        label: "ぬいぐるみバッジ",
        short: "振り直し / 7確定",
        normal: "振った2D6を1回振り直せます。使用後は消費します。",
        super: "出目を7に確定し、そのまま追加ロールへ進めます。使用後は消費します。",
    },
    [ITEM_TYPES.CHARM]: {
        icon: "◇",
        label: "めじるしチャーム",
        short: "合計値を調整",
        normal: "2D6の合計値を±1調整できます。使用後は消費します。",
        super: "2D6の合計値を±2調整できます。使用後は消費します。",
    },
    [ITEM_TYPES.TOBACCO]: {
        icon: "↯",
        label: "タバコ",
        short: "相手を7マス戻す",
        normal: "自分が3マス戻り、相手を7マス戻します。使用しても手番は続きます。",
        super: "自分が3マス進み、相手を7マス戻します。この移動ではアイテムマスを通過します。",
    },
};

function ItemDescription({ type }: { type: ItemType }) {
    const item = ITEM_META[type];
    return (
        <div className="item-description">
            <strong>{item.icon} {item.label}</strong>
            <p><b>通常：</b>{item.normal}</p>
            <p><b>SUPER：</b>{item.super}</p>
        </div>
    );
}

function SetupScreen() {
    const names = useSelector(gameStore, (state) => state.names);

    return (
        <main className="setup-page">
            <section className="hero-card">
                <div className="player-inputs">
                    {names.map((name, index) => (
                        <label
                            key={index}
                            className={`player-input player-${index + 1}`}
                        >
                            <span>
                                <i />
                                PLAYER {index + 1}
                                {index === 1 && <small>後手補正あり</small>}
                            </span>
                            <input
                                value={name}
                                maxLength={16}
                                onChange={(event) =>
                                    gameActions.setName(
                                        index as 0 | 1,
                                        event.target.value,
                                    )
                                }
                                aria-label={`プレイヤー${index + 1}の名前`}
                            />
                        </label>
                    ))}
                </div>

                <button
                    className="primary-button start-button"
                    onClick={gameActions.start}
                >
                    ゲームをはじめる <span aria-hidden="true">→</span>
                </button>
            </section>

            <aside className="setup-aside" aria-label="ゲームのポイント">
                <div className="big-seven">7</div>
                <div className="feature-list">
                    <div>
                        <b>01</b>
                        <span>
                            <strong>ROLL</strong>2D6で一本道を進む
                        </span>
                    </div>
                    <div>
                        <b>02</b>
                        <span>
                            <strong>CHAIN</strong>7が続く限り加速する
                        </span>
                    </div>
                    <div>
                        <b>03</b>
                        <span>
                            <strong>SURVIVE</strong>先に73へ届けば勝利
                        </span>
                    </div>
                </div>
            </aside>
        </main>
    );
}

function PlayerCard({
    player,
    index,
    active,
    perspective,
}: {
    player: Player;
    index: number;
    active: boolean;
    perspective: "self" | "opponent";
}) {
    const item = player.item ? ITEM_META[player.item.type] : null;
    const itemLevel = player.item?.level;
    return (
        <article
            className={`player-card player-${index + 1} ${active ? "is-active" : ""}`}
        >
            <div className="player-title">
                <span className="token">{player.name.slice(0, 1)}</span>
                <div>
                    <small>{perspective === "self" ? "YOU" : "RIVAL"} · PLAYER {index + 1}</small>
                    <h2>{player.name}</h2>
                </div>
                {active && <span className="turn-badge">TURN</span>}
            </div>
            <div className="position">
                <strong>{player.position}</strong>
                <span>/ {GOAL}</span>
            </div>
            {item && player.item ? (
                <details
                    key={`${player.item.type}-${itemLevel ?? "none"}`}
                    className="item-inspector"
                >
                    <summary className="item-slot has-item" aria-label={`${item.label}の説明を表示`}>
                        <>
                            <b>{item.icon}</b>
                        <span>
                            <strong>{item.label}</strong>
                            <small>
                                {itemLevel === "super" ? "SUPER" : "NORMAL"} ·{" "}
                                {item.short}
                                </small>
                            </span>
                        </>
                    </summary>
                    <ItemDescription type={player.item.type} />
                </details>
            ) : (
                <div className="item-slot">
                    <span className="empty-item">NO ITEM</span>
                </div>
            )}
        </article>
    );
}

function Board({ players }: { players: GameState["players"] }) {
    const spaces = Array.from({ length: Math.ceil(GOAL / 15) }, (_, row) => {
        const rowSpaces = Array.from(
            { length: Math.min(15, GOAL - row * 15) },
            (_, column) => row * 15 + column + 1,
        );
        return row % 2 === 1 ? rowSpaces.reverse() : rowSpaces;
    }).flat();
    return (
        <section className="board-panel" aria-label="73マスのゲーム盤">
            <div className="board-head">
                <div>
                    <span className="section-index">01</span>
                    <h2>THE ROAD</h2>
                </div>
                <p>
                    <span className="legend-dot item" /> ITEM{" "}
                    <span className="legend-dot super" /> SUPER
                </p>
            </div>
            <div className="board-scroll">
                <div className="board-grid">
                    {spaces.map((space) => {
                        const occupants = players
                            .map((player, index) => ({ player, index }))
                            .filter(({ player }) => player.position === space);
                        const isItem = ITEM_SPACES.includes(space);
                        return (
                            <div
                                key={space}
                                className={`space ${isItem ? "item-space" : ""} ${space === 45 ? "super-space" : ""} ${space === GOAL ? "goal-space" : ""}`}
                            >
                                <span className="space-number">{space}</span>
                                {isItem && (
                                    <span className="space-symbol">
                                        {space === 45 ? "S" : "✦"}
                                    </span>
                                )}
                                {space === GOAL && (
                                    <span className="goal-label">GOAL</span>
                                )}
                                <div className="space-tokens">
                                    {occupants.map(({ player, index }) => (
                                        <span
                                            key={`${player.id}-${player.position}`}
                                            className={`board-token player-${index + 1}`}
                                            title={player.name}
                                        >
                                            {player.name.slice(0, 1)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function Dice({ value }: { value: number }) {
    return (
        <span className="die" aria-label={`サイコロの目 ${value}`}>
            {value}
        </span>
    );
}

function EventStage({ events }: { events: GameState["log"] }) {
    return (
        <div className="event-stage" aria-live="assertive" aria-atomic="false">
            {events
                .slice(0, 3)
                .reverse()
                .map((event, index) => (
                    <p
                        key={event.id}
                        className={`event-card ${event.tone}`}
                        style={{ animationDelay: `${index * 140}ms` }}
                    >
                        {event.message}
                    </p>
                ))}
        </div>
    );
}

function ChainResult({ game }: { game: GameState }) {
    const result = game.lastChainResult;
    if (!result) return null;
    const resultKey = `${result.outcome}-${result.streak}-${result.dice.join("-")}`;

    return (
        <div key={resultKey} className="chain-result is-success" role="status">
            <div className="chain-result-copy">
                <span>
                    {result.outcome === "completed"
                        ? "CHAIN TOTAL"
                        : result.outcome === "started"
                          ? "CHAIN START"
                          : "CHAIN CONTINUE"}
                </span>
                <strong>
                    {result.outcome === "completed"
                        ? `合計 ${game.chainTotal}マス`
                        : `${result.streak}連チャン！`}
                </strong>
                <small>
                    {result.outcome === "completed"
                        ? `最後の出目 +${result.total} も加算`
                        : `移動 +${game.chainTotal} を保留中`}
                </small>
            </div>
            <div
                className="chain-result-roll"
                aria-label={`連鎖の出目 ${result.dice[0]} と ${result.dice[1]}、合計 ${result.total}`}
            >
                <b>{result.dice[0]}</b>
                <i>+</i>
                <b>{result.dice[1]}</b>
                <i>{result.source === "dice" ? "=" : "→"}</i>
                <em>{result.total}</em>
            </div>
        </div>
    );
}

function ActionPanel({ game }: { game: GameState }) {
    const player = game.players[game.currentPlayer];
    const item = player.item;
    const roll = game.pendingRoll;

    if (game.status === "won") {
        const winner = game.players[game.winner ?? 0];
        return (
            <div className="winner-panel" role="status">
                <span>WINNER</span>
                <h2>{winner.name}</h2>
                <p>{winner.position}マス目に到達しました。</p>
                <button
                    className="primary-button"
                    onClick={gameActions.playAgain}
                >
                    もう一度あそぶ
                </button>
            </div>
        );
    }

    return (
        <section className="action-panel">
            <div className="action-kicker">
                TURN {game.turn} — {player.name}
            </div>
            {game.phase === "awaiting-roll" && (
                <>
                    <h2>サイコロを振ろう</h2>
                    <p>2つの出目の合計だけ進みます。</p>
                    <div className="action-buttons">
                        <button
                            className="primary-button dice-button"
                            onClick={gameActions.roll}
                        >
                            2D6を振る <span>⚄ ⚁</span>
                        </button>
                        {item?.type === ITEM_TYPES.TOBACCO && (
                            <button
                                className="ghost-button danger"
                                onClick={gameActions.useTobacco}
                            >
                                タバコを使う
                            </button>
                        )}
                    </div>
                </>
            )}

            {game.phase === "roll-options" && roll && (
                <>
                    <div className="dice-result">
                        <Dice
                            key={`die-1-${game.log[0]?.id}`}
                            value={roll.dice[0]}
                        />
                        <Dice
                            key={`die-2-${game.log[0]?.id}`}
                            value={roll.dice[1]}
                        />
                        <span className="equals">=</span>
                        <strong>{roll.total}</strong>
                    </div>
                    <h2>
                        {roll.total === 7
                            ? "連鎖の入口！"
                            : roll.total === 3
                              ? "アイテムチャンス！"
                              : `${roll.total}マス進む？`}
                    </h2>
                    <div className="action-buttons wrap">
                        <button
                            className="primary-button"
                            onClick={() => gameActions.confirm({})}
                        >
                            {roll.total === 7 ? "7をキープ" : "この出目で進む"}
                        </button>
                        {game.currentPlayer === 1 &&
                            player.turnsTaken === 0 &&
                            player.openingRerollAvailable && (
                                <button
                                    className="ghost-button"
                                    onClick={() =>
                                        gameActions.reroll("opening")
                                    }
                                >
                                    後手補正で振り直す
                                </button>
                            )}
                        {item?.type === ITEM_TYPES.BADGE &&
                            item.level === "normal" && (
                                <button
                                    className="ghost-button"
                                    onClick={() => gameActions.reroll("badge")}
                                >
                                    バッジで振り直す
                                </button>
                            )}
                        {item?.type === ITEM_TYPES.BADGE &&
                            item.level === "super" && (
                                <button
                                    className="ghost-button accent"
                                    onClick={() =>
                                        gameActions.confirm({
                                            useSuperBadge: true,
                                        })
                                    }
                                >
                                    SUPERで7にする
                                </button>
                            )}
                        {item?.type === ITEM_TYPES.CHARM &&
                            (item.level === "super"
                                ? [-2, -1, 1, 2]
                                : [-1, 1]
                            ).map((adjustment) => (
                                <button
                                    key={adjustment}
                                    className="ghost-button accent"
                                    onClick={() =>
                                        gameActions.confirm({ adjustment })
                                    }
                                >
                                    {adjustment > 0 ? "+" : ""}
                                    {adjustment}して進む
                                </button>
                            ))}
                    </div>
                </>
            )}

            {game.phase === "moving" && (
                <div className="moving-panel" role="status" aria-live="polite">
                    <span>MOVING</span>
                    <h2>1マスずつ移動中</h2>
                    <p>
                        <strong>
                            残り {game.pendingMovement?.remaining ?? 0}マス
                        </strong>{" "}
                        — アイテムマスでは一度止まります。
                    </p>
                    <div className="movement-meter" aria-hidden="true">
                        <i
                            style={{
                                width: `${game.pendingMovement ? ((game.pendingMovement.total - game.pendingMovement.remaining) / game.pendingMovement.total) * 100 : 100}%`,
                            }}
                        />
                    </div>
                </div>
            )}

            {game.phase === "choose-item" && (
                <>
                    <h2>
                        {item
                            ? "アイテムを交換する？"
                            : game.pendingItemLevel === "super"
                              ? "SUPERアイテムを選ぶ"
                              : "アイテムを選ぶ"}
                    </h2>
                    <p>
                        {item
                            ? `現在は「${ITEM_META[item.type].label}」を所持中。保持することもできます。`
                            : "持てるアイテムは1つだけ。ここで決めよう。"}
                    </p>
                    {item && game.pendingItemSource === "space" && (
                        <button
                            className="ghost-button keep-item-button"
                            onClick={gameActions.keepItem}
                        >
                            今の{ITEM_META[item.type].label}を保持する
                        </button>
                    )}
                    <div className="item-choices">
                        {(
                            Object.entries(ITEM_META) as Array<
                                [ItemType, (typeof ITEM_META)[ItemType]]
                            >
                            ).map(([type, meta]) => (
                                <details className="item-choice" key={type}>
                                    <summary>
                                        <b>{meta.icon}</b>
                                        <span>
                                            <strong>{item ? `${meta.label}へ交換` : meta.label}</strong>
                                            <small>タップして説明</small>
                                        </span>
                                    </summary>
                                    <div className="item-choice-popover">
                                        <ItemDescription type={type} />
                                        <button
                                            className="choose-item-button"
                                            onClick={() => gameActions.chooseItem(type)}
                                        >
                                            このアイテムを選ぶ
                                        </button>
                                    </div>
                                </details>
                            ))}
                    </div>
                </>
            )}

            {game.phase === "upgrade-item-choice" && item && (
                <div className="decision-panel">
                    <span>ITEM UPGRADE</span>
                    <h2>{ITEM_META[item.type].label}をSUPER化する？</h2>
                    <p>選択を確定してから3マス移動します。</p>
                    <ItemDescription type={item.type} />
                    <div className="action-buttons">
                        <button className="primary-button" onClick={gameActions.acceptItemUpgrade}>SUPER化する</button>
                        <button className="ghost-button" onClick={gameActions.declineItemUpgrade}>そのまま進む</button>
                    </div>
                </div>
            )}

            {game.phase === "item-exchange-choice" && (
                <div className="decision-panel">
                    <span>ITEM EXCHANGE</span>
                    <h2>アイテムを交換する？</h2>
                    <p>同じマスに着地しました。交換せずに保持することもできます。</p>
                    <div className="action-buttons">
                        <button className="primary-button" onClick={gameActions.acceptItemExchange}>交換する</button>
                        <button className="ghost-button" onClick={gameActions.declineItemExchange}>交換しない</button>
                    </div>
                </div>
            )}

            {game.phase === "chain-choice" && (
                <>
                    <ChainResult game={game} />
                    <h2>7！ 追加ロールできる</h2>
                    <p>次の出目も足し算します。駒は確定するまで動きません。</p>
                    <div className="action-buttons">
                        <button
                            className="primary-button"
                            onClick={gameActions.challenge}
                        >
                            追加ロールを振る
                        </button>
                        <button
                            className="ghost-button"
                            onClick={gameActions.resolveChain}
                        >
                            ここまでを確定して進む
                        </button>
                    </div>
                </>
            )}

            {game.phase === "chain-resolution" && (
                <>
                    <ChainResult game={game} />
                    <h2>合計移動を確定しよう</h2>
                    <p>7と追加ロールの出目を、そのまま合計して進みます。</p>
                    <div className="action-buttons">
                        <button
                            className="primary-button"
                            onClick={gameActions.resolveChain}
                        >
                            結果を確定して進む
                        </button>
                    </div>
                </>
            )}

            {game.phase === "rank-bonus-choice" && (
                <div className="turn-complete-panel">
                    <span>RANK BONUS</span>
                    <h2>順位ボーナスを使う？</h2>
                    <p>現在2位なので、任意で1マス追加できます。</p>
                    <div className="action-buttons">
                        <button
                            className="primary-button"
                            onClick={gameActions.takeRankBonus}
                        >
                            +1マス進む
                        </button>
                        <button
                            className="ghost-button"
                            onClick={gameActions.skipRankBonus}
                        >
                            追加移動しない
                        </button>
                    </div>
                </div>
            )}

            {game.phase === "turn-complete" && (
                <div className="turn-complete-panel">
                    <span>ACTION COMPLETE</span>
                    <h2>{player.position}マス目で行動完了</h2>
                    <p>結果を確認してから、次のプレイヤーへ渡してください。</p>
                    <div className="action-buttons">
                        <button
                            className="primary-button end-turn-button"
                            onClick={gameActions.endTurn}
                        >
                            番を終わる →
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}

function GameScreen() {
    const game = useSelector(gameStore, (state) => state.game);
    const error = useSelector(gameStore, (state) => state.error);
    if (!game) return null;

    return (
        <main className="game-page">
            <EventStage events={game.log} />
            <div className="game-toolbar">
                <div>
                    <span>LOCAL MATCH</span>
                    <strong>FIRST TO 73</strong>
                </div>
                <button onClick={gameActions.reset}>名前入力へ戻る</button>
            </div>
            <div className="match-layout">
                <div className="opponent-row player-strip">
                    <PlayerCard
                        player={game.players[1]}
                        index={1}
                        perspective="opponent"
                        active={game.status === "playing" && game.currentPlayer === 1}
                    />
                </div>
                <Board players={game.players} />
                <div className="self-row player-strip">
                    <PlayerCard
                        player={game.players[0]}
                        index={0}
                        perspective="self"
                        active={game.status === "playing" && game.currentPlayer === 0}
                    />
                </div>
                <ActionPanel game={game} />
                <details className="log-panel">
                    <summary>
                        <span className="section-index">02</span>
                        <strong>MATCH LOG</strong>
                        <small>{game.log[0]?.message}</small>
                    </summary>
                    {error && (
                        <p className="error-message" role="alert">
                            {error}
                        </p>
                    )}
                    <ol>
                        {game.log.map((entry) => (
                            <li key={entry.id} className={entry.tone}>
                                {entry.message}
                            </li>
                        ))}
                    </ol>
                </details>
            </div>
        </main>
    );
}

export function GamePage() {
    const screen = useSelector(gameStore, (state) => state.screen);
    return screen === "setup" ? <SetupScreen /> : <GameScreen />;
}
