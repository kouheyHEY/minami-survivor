import { useSelector } from "@tanstack/react-store";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
    GOAL,
    ITEM_LABELS,
    ITEM_SPACES,
    ITEM_TYPES,
    type DicePair,
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
    order,
}: {
    player: Player;
    index: number;
    active: boolean;
    perspective: "self" | "opponent";
    order: string;
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
                    <small>{perspective === "self" ? "YOU" : "RIVAL"} · {order}</small>
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
                    <summary
                        className={`item-slot has-item ${itemLevel === "super" ? "is-super" : ""}`}
                        aria-label={`${itemLevel === "super" ? "SUPER " : ""}${item.label}の説明を表示`}
                    >
                        <>
                            <b>{item.icon}</b>
                        <span>
                            <strong>{item.label}</strong>
                            <small>
                                {itemLevel === "super" ? "SUPER" : "NORMAL"} ·{" "}
                                {item.short}
                                </small>
                            </span>
                            {itemLevel === "super" && (
                                <em className="super-badge">SUPER</em>
                            )}
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

const SPACE_TIPS = {
    item: {
        title: "ITEMマス",
        text: "到達・通過すると、通常アイテムを1つ選べます。持っているときは、保持するか交換するかを選べます。",
    },
    super: {
        title: "SUPER ITEMマス",
        text: "到達・通過すると、最初からSUPERのアイテムを1つ選べます。持っているときは、保持するか交換するかを選べます。",
    },
} as const;

function Board({ players }: { players: GameState["players"] }) {
    // タップで開いたマスの説明。ほかの場所に触れたら閉じる。
    const [openTip, setOpenTip] = useState<number | null>(null);
    useEffect(() => {
        if (openTip === null) return;
        const close = () => setOpenTip(null);
        document.addEventListener("pointerdown", close);
        return () => document.removeEventListener("pointerdown", close);
    }, [openTip]);

    const spaces = Array.from({ length: Math.ceil(GOAL / 15) }, (_, row) => {
        const rowSpaces = Array.from(
            { length: Math.min(15, GOAL - row * 15) },
            (_, column) => row * 15 + column + 1,
        );
        return row % 2 === 1 ? rowSpaces.reverse() : rowSpaces;
    }).flat();
    return (
        <section className="board-panel" aria-label="73マスのゲーム盤">
            <div className="board-scroll">
                <div className="board-grid">
                    {spaces.map((space, order) => {
                        const occupants = players
                            .map((player, index) => ({ player, index }))
                            .filter(({ player }) => player.position === space);
                        const isItem = ITEM_SPACES.includes(space);
                        const tip = isItem ? SPACE_TIPS[space === 45 ? "super" : "item"] : null;
                        const tipOpen = openTip === space;
                        return (
                            <div
                                key={space}
                                className={`space ${isItem ? "item-space has-tip" : ""} ${space === 45 ? "super-space" : ""} ${space === GOAL ? "goal-space" : ""} ${tipOpen ? "is-tip-open" : ""} ${order % 15 > 7 ? "tip-left" : ""}`}
                            >
                                {tip && (
                                    <button
                                        type="button"
                                        className="space-hit"
                                        aria-label={`${space}マス目：${tip.title}の説明`}
                                        aria-expanded={tipOpen}
                                        onPointerDown={(event) => event.stopPropagation()}
                                        onClick={() => setOpenTip(tipOpen ? null : space)}
                                    />
                                )}
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
                                {tip && (
                                    <div className="space-tip" role="tooltip">
                                        <strong>{tip.title}</strong>
                                        <p>{tip.text}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

const DICE_SPIN_MS = 70;
const DICE_SETTLE_MS = 480;
const CELEBRATION_MS = 1400;

const randomFace = () => 1 + Math.floor(Math.random() * 6);

// 回っている間は、目を次々に切り替える（見た目だけ。実際の出目は止めたときに決まる）。
function useSpinningFace(spinning: boolean) {
    const [face, setFace] = useState(randomFace);
    useEffect(() => {
        if (!spinning || prefersReducedMotion()) return;
        const timer = setInterval(() => setFace(randomFace()), DICE_SPIN_MS);
        return () => clearInterval(timer);
    }, [spinning]);
    return face;
}

// 出目が決まってから、少し回して止まるまでの間は false を返す。
function useRevealAfter(key: string | null) {
    const [revealedKey, setRevealedKey] = useState<string | null>(null);
    useEffect(() => {
        if (key === null) return;
        const timer = setTimeout(
            () => setRevealedKey(key),
            prefersReducedMotion() ? 0 : DICE_SETTLE_MS,
        );
        return () => clearTimeout(timer);
    }, [key]);
    return key !== null && revealedKey === key;
}

function SpinningFace() {
    const face = useSpinningFace(true);
    return <>{face}</>;
}

function SpinningDie({ spinning }: { spinning: boolean }) {
    const face = useSpinningFace(spinning);
    return (
        <span className={`die ${spinning ? "is-spinning" : "is-idle"}`}>
            {spinning ? face : "?"}
        </span>
    );
}

// 出た目。少し回ってから止まるので、相手の端末でも振った感じが出る。
function Dice({ value }: { value: number }) {
    const settled = useRevealAfter(String(value));
    return (
        <span
            className={`die ${settled ? "is-settled" : "is-spinning"}`}
            aria-label={settled ? `サイコロの目 ${value}` : "サイコロを振っています"}
        >
            {settled ? value : <SpinningFace />}
        </span>
    );
}

// 自分の手で振って、止める。止めた瞬間に実際の出目が決まる。
// 回す前から「?」のサイコロを置いておき、ボタンの位置が動かないようにする。
function RollAction({
    label,
    onStop,
    extra,
}: {
    label: string;
    onStop: () => void;
    extra?: (spinning: boolean) => ReactNode;
}) {
    const [spinning, setSpinning] = useState(false);
    const press = () => {
        if (spinning) {
            onStop();
            return;
        }
        setSpinning(true);
        playSound("dice", 0.5);
    };

    return (
        <>
            <div className="dice-result roll-stage" aria-hidden="true">
                <SpinningDie spinning={spinning} />
                <SpinningDie spinning={spinning} />
            </div>
            <div className="action-buttons">
                <button
                    className={`primary-button dice-button ${spinning ? "is-stop" : ""}`}
                    onClick={press}
                >
                    {spinning ? "止める" : label}
                </button>
                {extra?.(spinning)}
            </div>
        </>
    );
}

function OrderRollControl({ label, onStop }: { label: string; onStop: () => void }) {
    const [spinning, setSpinning] = useState(false);
    return (
        <>
            <span className="order-roll-dice" aria-hidden="true">
                <SpinningDie spinning={spinning} />
                <SpinningDie spinning={spinning} />
            </span>
            <button
                className={`primary-button ${spinning ? "is-stop" : ""}`}
                onClick={() => {
                    if (spinning) {
                        onStop();
                        return;
                    }
                    setSpinning(true);
                    playSound("dice", 0.5);
                }}
            >
                {spinning ? "止める" : label}
            </button>
        </>
    );
}

function OrderRollResult({ roll }: { roll: DicePair }) {
    const revealed = useRevealAfter(roll.join("-"));
    return (
        <>
            <span className="order-roll-dice">
                <Dice value={roll[0]} />
                <Dice value={roll[1]} />
            </span>
            <strong>{revealed ? `合計 ${roll[0] + roll[1]}` : "合計 ?"}</strong>
        </>
    );
}

type Celebration = { kind: "seven" | "three"; id: number };

// 7や3が出たときの演出。サイコロが止まるのを待ってから大きく見せる。
function useRollCelebration(game: GameState) {
    const [celebration, setCelebration] = useState<Celebration | null>(null);
    const previous = useRef<{
        rollKey: string | null;
        total: number | null;
        chain: string;
        phase: GameState["phase"];
        nextLogId: number;
    } | null>(null);
    const timers = useRef<number[]>([]);

    useEffect(() => () => timers.current.forEach((timer) => clearTimeout(timer)), []);

    useEffect(() => {
        const roll = game.phase === "roll-options" ? game.pendingRoll : null;
        const current = {
            rollKey: roll ? `${roll.dice.join("-")}-${game.nextLogId}` : null,
            total: roll ? roll.dice[0] + roll.dice[1] : null,
            chain: JSON.stringify(game.lastChainResult),
            phase: game.phase,
            nextLogId: game.nextLogId,
        };
        const before = previous.current;
        previous.current = current;
        if (!before || current.nextLogId === before.nextLogId) return;

        const chain = game.lastChainResult;
        let kind: Celebration["kind"] | null = null;
        let delay = 0;
        if (
            current.rollKey !== null &&
            current.rollKey !== before.rollKey &&
            (current.total === 7 || current.total === 3)
        ) {
            // サイコロで7や3が出た
            kind = current.total === 7 ? "seven" : "three";
            delay = DICE_SETTLE_MS;
        } else if (
            chain &&
            current.chain !== before.chain &&
            (chain.outcome === "success" || (chain.outcome === "started" && chain.source !== "dice"))
        ) {
            // 追加ロールでまた7、またはアイテムで7にした
            kind = "seven";
            delay = chain.outcome === "success" ? DICE_SETTLE_MS : 0;
        } else if (
            before.phase === "roll-options" &&
            before.total !== 3 &&
            game.log.some((entry) => entry.id >= before.nextLogId && entry.message.startsWith("合計3"))
        ) {
            // チャームで合計を3にした
            kind = "three";
        }
        if (!kind) return;

        const id = current.nextLogId;
        const found = kind;
        timers.current.push(
            window.setTimeout(() => setCelebration({ kind: found, id }), delay),
            window.setTimeout(
                () => setCelebration((shown) => (shown?.id === id ? null : shown)),
                delay + CELEBRATION_MS,
            ),
        );
    });

    return celebration;
}

// 画面いっぱいの「7！！」「3！」。操作の邪魔をしないよう、触れても下の画面に届く。
function CelebrationOverlay({ celebration }: { celebration: Celebration | null }) {
    if (!celebration) return null;
    return createPortal(
        <div
            key={celebration.id}
            className={`celebration is-${celebration.kind}`}
            aria-hidden="true"
        >
            <strong>{celebration.kind === "seven" ? "7！！" : "3！"}</strong>
            <span>
                {celebration.kind === "seven" ? "追加ロールのチャンス" : "アイテムチャンス"}
            </span>
        </div>,
        document.body,
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
    const resultKey = result
        ? `${result.outcome}-${result.streak}-${result.dice.join("-")}-${game.chainTotal}`
        : null;
    // 追加ロールの出目は、少し回してから見せる（最初の7は振った時点で見せているのでそのまま）。
    const revealed = useRevealAfter(result && result.outcome !== "started" ? resultKey : null);
    if (!result) return null;
    const shown = result.outcome === "started" || revealed;

    return (
        <div
            key={resultKey}
            className={`chain-result ${shown ? "is-success" : "is-rolling"}`}
            role="status"
        >
            <div className="chain-result-copy">
                <span>
                    {!shown
                        ? "EXTRA ROLL"
                        : result.outcome === "completed"
                          ? "CHAIN TOTAL"
                          : result.outcome === "started"
                            ? "CHAIN START"
                            : "CHAIN CONTINUE"}
                </span>
                <strong>
                    {!shown
                        ? "出目は…"
                        : result.outcome === "completed"
                          ? `合計 ${game.chainTotal}マス`
                          : `${result.streak}連チャン！`}
                </strong>
                <small>
                    {!shown
                        ? "サイコロが止まるのを待とう"
                        : result.outcome === "completed"
                          ? `最後の出目 +${result.total} も加算`
                          : `移動 +${game.chainTotal} を保留中`}
                </small>
            </div>
            <div
                className="chain-result-roll"
                aria-label={
                    shown
                        ? `連鎖の出目 ${result.dice[0]} と ${result.dice[1]}、合計 ${result.total}`
                        : "追加ロールを振っています"
                }
            >
                <b>{shown ? result.dice[0] : <SpinningFace />}</b>
                <i>+</i>
                <b>{shown ? result.dice[1] : <SpinningFace />}</b>
                <i>{result.source === "dice" ? "=" : "→"}</i>
                <em>{shown ? result.total : "?"}</em>
            </div>
        </div>
    );
}

// スマホで押しやすいよう、大きなカードをタップして効果を確かめ、すぐ下のボタンで決める。
// 選んでも高さが変わらないようにして、決定ボタンが画面の外へ押し出されないようにする。
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
    const rootRef = useRef<HTMLDivElement>(null);
    const selectedMeta = selected ? ITEM_META[selected] : null;

    // 選び始めたときに決定ボタンが画面の外なら、見える位置まで寄せる。
    useEffect(() => {
        const area = rootRef.current?.closest(".action-area");
        if (area && area.getBoundingClientRect().bottom > window.innerHeight) {
            area.scrollIntoView({ block: "end", behavior: "smooth" });
        }
    }, []);

    return (
        <div className="item-picker" ref={rootRef}>
            <h2>
                {current
                    ? "アイテムを交換する？"
                    : level === "super"
                      ? "SUPERアイテムを選ぶ"
                      : "アイテムを選ぶ"}
            </h2>
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
                    </button>
                ))}
            </div>
            <p className="item-picker-effect" aria-live="polite">
                {selectedMeta ? (
                    <>
                        <b>{level === "super" ? "SUPER：" : "通常："}</b>
                        {level === "super" ? selectedMeta.super : selectedMeta.normal}
                    </>
                ) : current ? (
                    `今は${ITEM_META[current.type].label}を所持中。交換するなら、タップして効果を確かめよう。`
                ) : (
                    "アイテムをタップすると、ここに効果が出ます。持てるのは1つだけです。"
                )}
            </p>
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

// 先手・後手を決める。お互いに2D6を振り、目が大きい人が選ぶ。
function TurnOrderPanel({
    game,
    selfIndex,
    busy,
}: {
    game: GameState;
    selfIndex: number | null;
    busy: boolean;
}) {
    const choosing = game.phase === "order-choice";
    const winner = game.orderWinner;
    const canChoose = choosing && winner !== null && (selfIndex === null || selfIndex === winner);
    const waitingForRival = !choosing && selfIndex !== null && game.orderRolls[selfIndex] !== null;

    return (
        <section className={`action-panel ${busy ? "is-busy" : ""}`} aria-busy={busy}>
            <div className="action-kicker">TURN ORDER</div>
            <h2>
                {choosing && winner !== null
                    ? `${game.players[winner].name}が先手・後手を選ぶ`
                    : "サイコロで先手・後手を決めよう"}
            </h2>
            <div className="order-rolls">
                {game.players.map((player, index) => {
                    const roll = game.orderRolls[index];
                    const canRoll = !choosing && roll === null && (selfIndex === null || selfIndex === index);
                    return (
                        <div
                            key={player.id}
                            className={`order-roll player-${index + 1} ${winner === index ? "is-winner" : ""}`}
                        >
                            <span>{player.name}</span>
                            {roll ? (
                                <OrderRollResult roll={roll} />
                            ) : canRoll ? (
                                <OrderRollControl
                                    label={selfIndex === null ? "サイコロを振る" : "自分のサイコロを振る"}
                                    onStop={() => gameActions.rollForOrder(index as 0 | 1)}
                                />
                            ) : (
                                <small>まだ振っていません</small>
                            )}
                        </div>
                    );
                })}
            </div>
            {canChoose ? (
                <>
                    <p>後手は「めじるしチャーム」を持って始まり、最初の手番だけ振り直せます。</p>
                    <div className="action-buttons">
                        <button
                            className="primary-button"
                            onClick={() => gameActions.chooseTurnOrder("first")}
                        >
                            先手にする
                        </button>
                        <button
                            className="ghost-button"
                            onClick={() => gameActions.chooseTurnOrder("second")}
                        >
                            後手にする
                        </button>
                    </div>
                </>
            ) : choosing && winner !== null ? (
                <p>{game.players[winner].name}が先手か後手を選んでいます。</p>
            ) : waitingForRival ? (
                <p>相手がサイコロを振るのを待っています。</p>
            ) : (
                <p>同じ目のときは、もう一度振ります。</p>
            )}
        </section>
    );
}

// ゲーム開始時の説明。OKを押すまで盤面は操作できない。
function IntroModal() {
    const okRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        okRef.current?.focus();
    }, []);

    return (
        <div className="intro-backdrop">
            <section
                className="intro-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="intro-title"
            >
                <span className="section-index">HOW TO PLAY</span>
                <h2 id="intro-title">先に73マスへ届いた人の勝ち</h2>
                <ol className="intro-steps">
                    <li>
                        <b>1. 先手・後手を決める</b>
                        お互いに2D6を振り、目が大きい人が先手か後手を選びます。後手は「めじるしチャーム」を持って始まり、最初の手番だけ振り直せます。
                    </li>
                    <li>
                        <b>2. サイコロを振って進む</b>
                        2D6の合計だけ進みます。行動が終わったら「番を終わる」を押します。
                    </li>
                    <li>
                        <b>3. 合計7と合計3</b>
                        7なら追加ロールで出目を足し続けられます。3なら進む前にアイテムを取るか、SUPERにできます。
                    </li>
                    <li>
                        <b>4. アイテムマス</b>
                        10・25マス目で通常、45マス目でSUPERのアイテムを選べます。持てるのは1つだけです。
                    </li>
                    <li>
                        <b>5. 2位のとき</b>
                        サイコロで進んだあと、1マス追加で進めます。
                    </li>
                </ol>
                <div className="intro-items">
                    {Object.values(ITEM_META).map((meta) => (
                        <div key={meta.label}>
                            <b aria-hidden="true">{meta.icon}</b>
                            <div>
                                <strong>{meta.label}</strong>
                                <p>通常：{meta.normal}</p>
                                <p>SUPER：{meta.super}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="intro-note">細かいルールは「遊び方」でいつでも見られます。</p>
                <div className="intro-actions">
                    <button
                        ref={okRef}
                        className="primary-button"
                        onClick={gameActions.closeIntro}
                    >
                        OK、はじめる
                    </button>
                </div>
            </section>
        </div>
    );
}

function ActionPanel({
    game,
    canControl,
    online,
    busy,
    selfIndex,
}: {
    game: GameState;
    canControl: boolean;
    online: boolean;
    busy: boolean;
    selfIndex: number | null;
}) {
    const player = game.players[game.currentPlayer];
    const item = player.item;
    const roll = game.pendingRoll;
    // 出目は少し回してから見せるので、止まるまでは合計や次の手を伏せておく。
    const revealed = useRevealAfter(
        roll ? `${roll.dice.join("-")}-${game.nextLogId}` : null,
    );

    if (game.status === "won") {
        const winner = game.players[game.winner ?? 0];
        const dissolve = () => {
            if (window.confirm("部屋を解散すると、相手もこの部屋から出ます。解散しますか？")) {
                void gameActions.dissolveRoom();
            }
        };
        return (
            <div className="winner-panel" role="status">
                <span>WINNER</span>
                <h2>{winner.name}</h2>
                <p>{winner.position}マス目に到達しました。</p>
                <div className="action-buttons">
                    <button
                        className="primary-button"
                        onClick={gameActions.playAgain}
                        disabled={busy}
                    >
                        もう一回
                    </button>
                    <button
                        className="ghost-button"
                        onClick={online ? dissolve : gameActions.reset}
                        disabled={busy}
                    >
                        {online ? "部屋を解散する" : "終わる"}
                    </button>
                </div>
            </div>
        );
    }

    if (game.phase === "order-roll" || game.phase === "order-choice") {
        return <TurnOrderPanel game={game} selfIndex={selfIndex} busy={busy} />;
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
                    <p>「振る」で回して、好きなところで「止める」。</p>
                    <RollAction
                        key={`roll-${game.turn}`}
                        label="2D6を振る"
                        onStop={gameActions.roll}
                        extra={(spinning) =>
                            item?.type === ITEM_TYPES.TOBACCO && (
                                <button
                                    className="ghost-button danger"
                                    onClick={gameActions.useTobacco}
                                    disabled={spinning}
                                >
                                    タバコを使う
                                </button>
                            )
                        }
                    />
                </>
            )}

            {game.phase === "roll-options" && roll && (
                <>
                    <div className="dice-result">
                        <Dice
                            key={`die-1-${game.nextLogId}`}
                            value={roll.dice[0]}
                        />
                        <Dice
                            key={`die-2-${game.nextLogId}`}
                            value={roll.dice[1]}
                        />
                        <span className="equals">=</span>
                        <strong>{revealed ? roll.total : "?"}</strong>
                    </div>
                    <h2>
                        {!revealed
                            ? "出目は…"
                            : roll.total === 7
                              ? "連鎖の入口！"
                              : roll.total === 3
                                ? "アイテムチャンス！"
                                : `${roll.total}マス進む？`}
                    </h2>
                    <div className={`action-buttons wrap ${revealed ? "" : "is-revealing"}`}>
                        <button
                            className="primary-button"
                            onClick={() => gameActions.confirm({})}
                        >
                            {revealed && roll.total === 7 ? "7をキープ" : "この出目で進む"}
                        </button>
                        {player.turnsTaken === 0 &&
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
                    <RollAction
                        key={`chain-${game.chainStreak}-${game.chainTotal}`}
                        label="追加ロールを振る"
                        onStop={gameActions.challenge}
                        extra={(spinning) => (
                            <button
                                className="ghost-button"
                                onClick={gameActions.resolveChain}
                                disabled={spinning}
                            >
                                ここまでを確定して進む
                            </button>
                        )}
                    />
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
    order: string;
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
            order: JSON.stringify(game.orderRolls ?? null),
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
        if (current.order !== before.order && game.orderRolls?.some(Boolean)) sounds.add("dice");
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
    const showIntro = useSelector(gameStore, (state) => state.showIntro);
    const selfIndex = online?.room.seat === 1 ? 1 : 0;
    const ordering = game.phase === "order-roll" || game.phase === "order-choice";
    const orderLabel = (index: number) =>
        ordering ? `PLAYER ${index + 1}` : index === (game.firstPlayer ?? 0) ? "先手" : "後手";
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
    const celebration = useRollCelebration(game);

    const leave = () => {
        if (online && !window.confirm("部屋を出ると、この対戦には戻れません。部屋を出ますか？")) return;
        gameActions.reset();
    };

    return (
        <main className={`game-page ${celebration?.kind === "seven" ? "is-shaking" : ""}`}>
            {showIntro && <IntroModal />}
            <CelebrationOverlay celebration={celebration} />
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
                        order={orderLabel(rivalIndex)}
                        active={game.status === "playing" && !ordering && game.currentPlayer === rivalIndex}
                    />
                </div>
                <Board players={players} />
                <div className="self-row player-strip">
                    <PlayerCard
                        player={players[selfIndex]}
                        index={selfIndex}
                        perspective="self"
                        order={orderLabel(selfIndex)}
                        active={game.status === "playing" && !ordering && game.currentPlayer === selfIndex}
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
                        selfIndex={online ? selfIndex : null}
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
