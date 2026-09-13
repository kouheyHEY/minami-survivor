import { useSelector } from "@tanstack/react-store";
import { useEffect, useRef, useState } from "react";
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
import { inviteUrl, normalizeRoomCode } from "../online/roomClient.js";
import { playSound, type SoundName } from "../audio/sound.js";

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

function OnlineSetup() {
    const name = useSelector(gameStore, (state) => state.onlineName);
    const joinCode = useSelector(gameStore, (state) => state.joinCode);
    const busy = useSelector(gameStore, (state) => state.busy);
    const error = useSelector(gameStore, (state) => state.error);
    const invited = joinCode.length === 6;
    // 入力欄に見せる文字。日本語入力の変換中は整えずにそのまま持つ（整えると文字が二重になる）。
    const [codeText, setCodeText] = useState(joinCode);
    const commitCode = (value: string) => {
        gameActions.setJoinCode(value);
        setCodeText(normalizeRoomCode(value));
    };

    return (
        <div className={`online-setup ${invited ? "is-invited" : ""}`}>
            <label className="player-input player-1">
                <span>
                    <i />
                    あなたの名前
                </span>
                <input
                    value={name}
                    maxLength={16}
                    placeholder="相手に表示されます"
                    onChange={(event) =>
                        gameActions.setOnlineName(event.target.value)
                    }
                    aria-label="あなたの名前"
                />
            </label>
            <button
                className={`${invited ? "ghost-button" : "primary-button"} start-button`}
                onClick={() => void gameActions.createRoom()}
                disabled={busy}
            >
                部屋をつくる <span aria-hidden="true">→</span>
            </button>
            <div className="join-block">
                <p className="online-divider">部屋コードをもらったら</p>
                <form
                    className="join-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void gameActions.joinRoom();
                    }}
                >
                    <input
                        value={codeText}
                        onChange={(event) => {
                            if ((event.nativeEvent as InputEvent).isComposing) {
                                setCodeText(event.target.value);
                            } else {
                                commitCode(event.target.value);
                            }
                        }}
                        onCompositionEnd={(event) =>
                            commitCode(event.currentTarget.value)
                        }
                        placeholder="6文字のコード"
                        aria-label="部屋コード"
                        autoCapitalize="characters"
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <button
                        className={invited ? "primary-button" : "ghost-button"}
                        disabled={busy || !invited}
                    >
                        参加する
                    </button>
                </form>
            </div>
            {error && (
                <p className="error-message" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

function SetupScreen() {
    const names = useSelector(gameStore, (state) => state.names);
    const mode = useSelector(gameStore, (state) => state.mode);

    return (
        <main className="setup-page">
            <section className="hero-card">
                <div className="mode-switch" role="group" aria-label="遊び方">
                    <button
                        aria-pressed={mode === "local"}
                        onClick={() => gameActions.setMode("local")}
                    >
                        この端末で2人
                    </button>
                    <button
                        aria-pressed={mode === "online"}
                        onClick={() => gameActions.setMode("online")}
                    >
                        オンライン対戦
                    </button>
                </div>
                {mode === "online" ? (
                    <OnlineSetup />
                ) : (
                <>
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
                </>
                )}
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

function WaitingScreen() {
    const room = useSelector(gameStore, (state) => state.online?.room);
    const [copied, setCopied] = useState(false);
    if (!room) return null;

    const share = async () => {
        const url = inviteUrl(room.code);
        try {
            if (typeof navigator.share === "function") {
                await navigator.share({
                    title: "みなみサバイバー",
                    text: `部屋コード ${room.code} で一緒に遊ぼう`,
                    url,
                });
            } else {
                await navigator.clipboard.writeText(url);
                setCopied(true);
            }
        } catch {
            // 共有をキャンセルしたときは何もしない
        }
    };

    return (
        <main className="waiting-page">
            <section className="waiting-card" aria-live="polite">
                <span className="section-index">ONLINE ROOM</span>
                <h1>相手を待っています</h1>
                <p>部屋コードか招待リンクを相手に送ってください。相手が参加すると始まります。</p>
                <strong className="room-code">{room.code}</strong>
                <div className="action-buttons">
                    <button
                        className="primary-button"
                        onClick={() => void share()}
                    >
                        {copied ? "リンクをコピーしました" : "招待リンクを送る"}
                    </button>
                    <button className="ghost-button" onClick={gameActions.reset}>
                        部屋を閉じる
                    </button>
                </div>
            </section>
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

// 直近の出来事。画面の上に重ねず、操作パネルのすぐ上に高さを固定して並べる。
function EventFeed({ events }: { events: GameState["log"] }) {
    return (
        <div className="event-feed" aria-live="polite">
            {events.slice(0, 2).map((event, index) => (
                <p
                    key={event.id}
                    className={`event-line ${event.tone} ${index === 0 ? "is-latest" : ""}`}
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

// スマホで押しやすいよう、まず大きなカードをタップして効果を確かめ、下のボタンで決める。
function ItemPicker({
    current,
    level,
    canKeep,
}: {
    current: Player["item"];
    level: "normal" | "super";
    canKeep: boolean;
}) {
    const [selected, setSelected] = useState<ItemType | null>(null);
    const selectedMeta = selected ? ITEM_META[selected] : null;

    return (
        <div className="item-picker">
            <h2>
                {current
                    ? "アイテムを交換する？"
                    : level === "super"
                      ? "SUPERアイテムを選ぶ"
                      : "アイテムを選ぶ"}
            </h2>
            <p>
                {current
                    ? `現在は「${ITEM_META[current.type].label}」を所持中。保持することもできます。`
                    : "持てるアイテムは1つだけ。タップして効果を見てから決めよう。"}
            </p>
            <div className="item-choices" role="radiogroup" aria-label="選べるアイテム">
                {(
                    Object.entries(ITEM_META) as Array<
                        [ItemType, (typeof ITEM_META)[ItemType]]
                    >
                ).map(([type, meta]) => (
                    <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={selected === type}
                        className={`item-choice ${selected === type ? "is-selected" : ""}`}
                        onClick={() => setSelected(type)}
                    >
                        <b aria-hidden="true">{meta.icon}</b>
                        <strong>{meta.label}</strong>
                        <small>{meta.short}</small>
                    </button>
                ))}
            </div>
            <div className="item-picker-detail" aria-live="polite">
                {selected ? (
                    <ItemDescription type={selected} />
                ) : (
                    <p className="item-picker-hint">
                        アイテムをタップすると、ここに効果が出ます。
                    </p>
                )}
            </div>
            <div className="action-buttons">
                <button
                    className="primary-button"
                    disabled={!selected}
                    onClick={() => selected && gameActions.chooseItem(selected)}
                >
                    {selectedMeta
                        ? `${selectedMeta.label}${current ? "に交換" : "にする"}`
                        : "アイテムを選んでください"}
                </button>
                {canKeep && current && (
                    <button className="ghost-button" onClick={gameActions.keepItem}>
                        今の{ITEM_META[current.type].label}を保持
                    </button>
                )}
            </div>
        </div>
    );
}

function ActionPanel({
    game,
    canControl,
    online,
    busy,
}: {
    game: GameState;
    canControl: boolean;
    online: boolean;
    busy: boolean;
}) {
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
                    disabled={busy}
                >
                    もう一度あそぶ
                </button>
            </div>
        );
    }

    if (!canControl) {
        return (
            <section className="action-panel">
                <div className="action-kicker">
                    TURN {game.turn} — {player.name}
                </div>
                <div className="rival-turn-panel" role="status" aria-live="polite">
                    <span>RIVAL TURN</span>
                    <h2>{player.name}の番です</h2>
                    <p>{game.log[0]?.message}</p>
                    <ChainResult game={game} />
                </div>
            </section>
        );
    }

    return (
        <section
            className={`action-panel ${busy ? "is-busy" : ""}`}
            aria-busy={busy}
        >
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
                <ItemPicker
                    key={`${game.turn}-${player.position}`}
                    current={item}
                    level={game.pendingItemLevel ?? "normal"}
                    canKeep={item !== null && game.pendingItemSource === "space"}
                />
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
                    <p>
                        {online
                            ? "結果を確認したら、相手の番へ進めてください。"
                            : "結果を確認してから、次のプレイヤーへ渡してください。"}
                    </p>
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

const MOVEMENT_STEP_MS = 160;

const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// オンラインではサーバーが移動先まで一度に確定させるので、駒は画面側で1マスずつ追いかける。
function useDisplayedPositions(targets: number[], animate: boolean) {
    const [shown, setShown] = useState(targets);
    // 戻る移動や動かさない場合は、その場で目標の位置を返す。
    // 古い位置を1回でも描画すると、移動中の表示が切り替わって画面が揺れるため。
    const display = targets.map((target, index) =>
        !animate || shown[index] > target ? target : shown[index],
    );
    const displayKey = display.join(",");
    const targetKey = targets.join(",");

    useEffect(() => {
        if (displayKey === targetKey) {
            // 次に前へ進むときの出発点として、表示中の位置を覚えておく。
            if (shown.join(",") !== targetKey) setShown(targets);
            return;
        }
        const timer = setTimeout(() => {
            setShown(
                display.map((position, index) =>
                    position < targets[index] ? position + 1 : position,
                ),
            );
        }, MOVEMENT_STEP_MS);
        return () => clearTimeout(timer);
    }, [displayKey, targetKey]);

    return display;
}

type SoundSnapshot = {
    status: GameState["status"];
    currentPlayer: GameState["currentPlayer"];
    turn: number;
    dice: string;
    chain: string;
    items: string[];
    positions: number[];
    shown: number[];
};

// 状態の変化から効果音を選ぶ。操作した端末でも、相手の操作を受け取った端末でも同じように鳴る。
function useGameSounds(game: GameState, shown: number[], selfIndex: number | null) {
    const previous = useRef<SoundSnapshot | null>(null);

    useEffect(() => {
        const current: SoundSnapshot = {
            status: game.status,
            currentPlayer: game.currentPlayer,
            turn: game.turn,
            dice: JSON.stringify(game.pendingRoll?.dice ?? null),
            chain: JSON.stringify(game.lastChainResult),
            items: game.players.map((player) => JSON.stringify(player.item)),
            positions: game.players.map((player) => player.position),
            shown,
        };
        const before = previous.current;
        previous.current = current;
        // 最初の表示や、再戦で最初に戻ったときは鳴らさない
        if (!before || current.turn < before.turn) return;

        const sounds = new Set<SoundName>();
        if (current.status === "won" && before.status !== "won") sounds.add("win");
        if (current.dice !== "null" && current.dice !== before.dice) sounds.add("dice");
        if (current.chain !== before.chain && game.lastChainResult) {
            sounds.add(game.lastChainResult.outcome === "completed" ? "dice" : "chain");
        }
        if (current.items.some((item, index) => item !== "null" && item !== before.items[index])) {
            sounds.add("item");
        }
        if (current.positions.some((position, index) => position < before.positions[index])) {
            sounds.add("danger");
        }
        if (current.status === "playing" && current.currentPlayer !== before.currentPlayer) {
            sounds.add(selfIndex !== null && current.currentPlayer === selfIndex ? "myTurn" : "turn");
        }
        if (current.shown.some((position, index) => position > before.shown[index])) {
            sounds.add("step");
        }
        for (const sound of sounds) playSound(sound, sound === "step" ? 0.35 : 0.8);
    });
}

function GameScreen() {
    const game = useSelector(gameStore, (state) => state.game);
    if (!game) return null;
    return <MatchScreen game={game} />;
}

function MatchScreen({ game }: { game: GameState }) {
    const online = useSelector(gameStore, (state) => state.online);
    const busy = useSelector(gameStore, (state) => state.busy);
    const error = useSelector(gameStore, (state) => state.error);
    const selfIndex = online?.room.seat === 1 ? 1 : 0;
    const rivalIndex = selfIndex === 0 ? 1 : 0;
    const shown = useDisplayedPositions(
        game.players.map((player) => player.position),
        online !== null && !prefersReducedMotion(),
    );
    const remaining = shown.reduce(
        (sum, position, index) =>
            sum + Math.max(0, game.players[index].position - position),
        0,
    );
    const players = game.players.map((player, index) => ({
        ...player,
        position: shown[index],
    })) as GameState["players"];
    const canControl = online === null || game.currentPlayer === selfIndex;
    useGameSounds(game, shown, online ? selfIndex : null);

    const leave = () => {
        if (online && !window.confirm("部屋を出ると、この対戦には戻れません。部屋を出ますか？")) return;
        gameActions.reset();
    };

    return (
        <main className="game-page">
            <div className="game-toolbar">
                <div>
                    <span>{online ? `ONLINE · ROOM ${online.room.code}` : "LOCAL MATCH"}</span>
                    <strong>FIRST TO 73</strong>
                </div>
                <button onClick={leave}>
                    {online ? "部屋を出る" : "名前入力へ戻る"}
                </button>
            </div>
            {online && error && (
                <p className="error-message online-error" role="alert">
                    {error}
                </p>
            )}
            <div className="match-layout">
                <div className="opponent-row player-strip">
                    <PlayerCard
                        player={players[rivalIndex]}
                        index={rivalIndex}
                        perspective="opponent"
                        active={game.status === "playing" && game.currentPlayer === rivalIndex}
                    />
                </div>
                <Board players={players} />
                <div className="self-row player-strip">
                    <PlayerCard
                        player={players[selfIndex]}
                        index={selfIndex}
                        perspective="self"
                        active={game.status === "playing" && game.currentPlayer === selfIndex}
                    />
                </div>
                <div className="action-area">
                <EventFeed events={game.log} />
                {remaining > 0 ? (
                    <section className="action-panel">
                        <div className="moving-panel" role="status" aria-live="polite">
                            <span>MOVING</span>
                            <h2>1マスずつ移動中</h2>
                            <p>
                                <strong>残り {remaining}マス</strong>
                            </p>
                        </div>
                    </section>
                ) : (
                    <ActionPanel
                        game={game}
                        canControl={canControl}
                        online={online !== null}
                        busy={busy}
                    />
                )}
                </div>
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

    // 前に入っていた部屋があれば、読み込み直しても同じ席へ戻る。
    useEffect(() => {
        void gameActions.resumeRoom();
    }, []);

    if (screen === "waiting") return <WaitingScreen />;
    return screen === "setup" ? <SetupScreen /> : <GameScreen />;
}
