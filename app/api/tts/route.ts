import { connection } from "next/server";

/** 字幕 1 場面ぶん。これより長い文は、プレビューの字幕としても長すぎる */
const MAX_TEXT_CHARS = 400;
const VOICEVOX_TIMEOUT_MS = 20_000;
/** VOICEVOX の speedScale が受け付ける範囲 */
const MIN_SPEED = 0.5;
const MAX_SPEED = 2;

/**
 * VOICEVOX が読み違える語と、その読み（カタカナ）。
 * 置き換えるのは VOICEVOX に渡す文だけなので、画面の字幕はそのまま。
 * 例: 「Flowline」はそのままだと「フローリン」と読まれる。
 */
const READINGS: [RegExp, string][] = [[/\bFlowline\b/gi, "フローライン"]];

function toSpeech(text: string): string {
  return READINGS.reduce((t, [word, kana]) => t.replace(word, kana), text);
}

function baseUrl(): string {
  return process.env.VOICEVOX_BASE_URL ?? "http://127.0.0.1:50021";
}

const isId = (n: number) => Number.isInteger(n) && n >= 0;

/** 既定の話者（スタイル ID） */
function speakerId(): number {
  const n = Number(process.env.VOICEVOX_SPEAKER ?? 8);
  return isId(n) ? n : 8;
}

/**
 * ブラウザから選べる話者（スタイル ID）。選べるのはサーバ側で決めたこの中だけ。
 * 既定は 春日部つむぎ（8）と 麒ヶ島宗麟（53）。既定の話者は必ず先頭に入る。
 */
function allowedSpeakers(): number[] {
  const listed = (process.env.VOICEVOX_SPEAKERS ?? "8,53")
    .split(",")
    .map((x) => Number(x.trim()))
    .filter(isId);
  return [...new Set([speakerId(), ...listed])];
}

function describeFailure(base: string, e: unknown): string {
  if (e instanceof Error && e.name === "TimeoutError") {
    return `VOICEVOX (${base}) が ${VOICEVOX_TIMEOUT_MS / 1000} 秒以内に応答しませんでした`;
  }
  const cause = e instanceof Error ? (e as { cause?: { code?: string } }).cause : undefined;
  if (cause?.code === "ECONNREFUSED") {
    return `VOICEVOX (${base}) が起動していません`;
  }
  return `VOICEVOX (${base}): ${e instanceof Error ? e.message : "不明なエラー"}`;
}

async function call(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${baseUrl()}${path}`, { ...init, signal: AbortSignal.timeout(VOICEVOX_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

// 話者名（スタイル ID → キャラクター名）。エンジンを入れ替えない限り変わらないので、一度引いたら覚えておく
let names: Map<number, string> | null = null;

async function speakerNames(ids: number[]): Promise<Map<number, string>> {
  if (!names || ids.some((id) => !names!.has(id))) {
    const res = await call("/speakers");
    const speakers = (await res.json()) as { name: string; styles: { id: number }[] }[];
    names = new Map(speakers.flatMap((s) => s.styles.map((st) => [st.id, s.name] as const)));
  }
  return names;
}

/**
 * 選べる声と、そのクレジット（「VOICEVOX:春日部つむぎ」）。
 * VOICEVOX の利用規約で、音声を使う画面に表記が要る。疎通確認も兼ねる。
 * `credit` は既定の声のもの（古い画面向けに残す）。
 */
export async function GET() {
  // エンジンの状態はリクエストのたびに確かめる（ビルド時に引いた結果を返さない）
  await connection();
  const speaker = speakerId();
  try {
    const found = await speakerNames(allowedSpeakers());
    if (!found.has(speaker)) throw new Error(`話者 ${speaker} がエンジンにありません（VOICEVOX_SPEAKER を確認）`);
    // エンジンに無い声は選ばせない
    const voices = allowedSpeakers()
      .filter((id) => found.has(id))
      .map((id) => ({ id, name: found.get(id)!, credit: `VOICEVOX:${found.get(id)}` }));
    return Response.json({ credit: `VOICEVOX:${found.get(speaker)}`, default: speaker, voices });
  } catch (e) {
    return Response.json({ error: describeFailure(baseUrl(), e) }, { status: 502 });
  }
}

/** 字幕 1 つを読み上げた WAV を返す */
export async function POST(request: Request) {
  let body: { text?: unknown; speed?: unknown; speaker?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON を解析できません" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return Response.json({ error: "text がありません" }, { status: 400 });
  if (text.length > MAX_TEXT_CHARS) return Response.json({ error: "text が長すぎます" }, { status: 413 });
  const speed =
    typeof body.speed === "number" && Number.isFinite(body.speed)
      ? Math.min(MAX_SPEED, Math.max(MIN_SPEED, body.speed))
      : 1;

  // 話者は選べる声の中からだけ。指定が無ければ既定の声
  if (body.speaker !== undefined && !(typeof body.speaker === "number" && allowedSpeakers().includes(body.speaker))) {
    return Response.json({ error: "その声は選べません" }, { status: 400 });
  }
  const speaker = String(typeof body.speaker === "number" ? body.speaker : speakerId());
  try {
    // VOICEVOX は 2 段階。読み・アクセントを作ってから（audio_query）、それを音にする（synthesis）
    const query = (await (
      await call(`/audio_query?${new URLSearchParams({ text: toSpeech(text), speaker })}`, { method: "POST" })
    ).json()) as Record<string, unknown>;
    query.speedScale = speed;
    const wav = await call(`/synthesis?${new URLSearchParams({ speaker })}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });
    return new Response(await wav.arrayBuffer(), {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
    });
  } catch (e) {
    return Response.json({ error: describeFailure(baseUrl(), e) }, { status: 502 });
  }
}
