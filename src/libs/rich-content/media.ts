/**
 * 儲存 provider／影片 ID 或 HTTPS 來源，不儲存產生的 iframe HTML；播放權限由 renderer 擁有。
 */
export type RichMediaNode =
  | {
      type: "videoEmbed";
      attrs: { provider: "youtube" | "bilibili"; videoId: string };
    }
  | { type: "videoEmbed"; attrs: { provider: "direct"; src: string } }
  | { type: "audioEmbed"; attrs: { src: string } };
export type MediaKind = "auto" | "youtube" | "bilibili" | "video" | "audio";

/**
 * 不支援的使用者輸入屬於可修正的驗證失敗，不是營運 incident。
 */
export class MediaInputError extends Error {
  constructor(
    message = "目前無法辨識這個媒體網址。請使用 YouTube、Bilibili 或直接影音檔網址。",
  ) {
    super(message);
    this.name = "MediaInputError";
  }
}
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const BILIBILI_ID = /^BV[A-Za-z0-9]{10}$/;
const VIDEO_FILE = /\.(mp4|webm|ogv|mov|m4v)$/i;
const AUDIO_FILE = /\.(mp3|ogg|oga|wav|m4a|aac|flac)$/i;

/**
 * 驗證 HTTPS 來源，不發出 Server fetch；拒絕帳密與容易被誤解的 URL 語法。
 */
export function isSafeMediaUrl(value: string): boolean {
  if (
    value.length > 2048 ||
    !/^https:\/\//i.test(value) ||
    /[\s\u0000-\u001f\u007f<>"'\\]/u.test(value)
  )
    return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isProviderPage(host: string) {
  return [
    "youtube.com",
    "youtu.be",
    "youtube-nocookie.com",
    "bilibili.com",
    "b23.tv",
    "spotify.com",
    "music.apple.com",
    "soundcloud.com",
  ].some((domain) => host === domain || host.endsWith("." + domain));
}

/**
 * 只辨識嚴格受限的單一 iframe 片段，不是通用 HTML parser。
 * 不掛載 DOM、不載入資源，只取唯一且加引號的 src；多元素、子節點、重複 src 與殘缺語法一律拒絕。
 */
function iframeSource(input: string): string {
  const match = /^<iframe\b([^<>]*)>\s*<\/iframe\s*>$/i.exec(input);
  if (!match)
    throw new MediaInputError(
      "請貼上單一 YouTube／Bilibili 官方 iframe 嵌入碼。",
    );
  let rest = match[1];
  let src: string | undefined;
  while (rest.trim()) {
    const attribute =
      /^\s+([a-zA-Z][\w:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/.exec(
        rest,
      );
    if (!attribute)
      throw new MediaInputError("嵌入碼格式不完整，請重新複製官方 iframe。");
    if (attribute[1].toLowerCase() === "src") {
      if (
        src !== undefined ||
        (attribute[2] === undefined && attribute[3] === undefined)
      )
        throw new MediaInputError("嵌入碼必須只有一個加引號的 src。");
      src = attribute[2] ?? attribute[3];
    }
    rest = rest.slice(attribute[0].length);
  }
  if (!src) throw new MediaInputError("嵌入碼缺少 src 網址。");
  // 只解碼 URL attribute 的字元參照，不解析 HTML 或巢狀編碼標記。
  src = src
    .replace(/&amp;/gi, "&")
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, code: string) => {
      const point =
        code[0].toLowerCase() === "x"
          ? parseInt(code.slice(1), 16)
          : Number(code);
      if (point > 0x10ffff) throw new MediaInputError("嵌入碼含有無效字元。");
      return String.fromCodePoint(point);
    });
  return src.startsWith("//") ? "https:" + src : src;
}

/**
 * 把分享 URL／官方 iframe 正規化為 canonical provider 與影片 ID。
 * 嚴格比對 hostname 和路徑，丟棄 iframe attributes、播放選項與分享追蹤參數。
 * 直接影音必須是檔案 URL；音樂／影片平台頁面需要明確 provider adapter，不能假裝成原生媒體來源。
 */
export function resolveMediaInput(
  input: string,
  kind: MediaKind = "auto",
): RichMediaNode {
  if (input.length > 8192) throw new MediaInputError("媒體網址或嵌入碼過長。");
  const trimmed = input.trim();
  const isHtml = trimmed.startsWith("<");
  const value = isHtml ? iframeSource(trimmed) : trimmed;
  if (!isSafeMediaUrl(value))
    throw new MediaInputError("請輸入不含帳密的完整 HTTPS 媒體網址。");
  const url = new URL(value);
  let provider: "youtube" | "bilibili" | undefined;
  let videoId: string | null = null;
  if (
    !url.port &&
    [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "www.youtube-nocookie.com",
      "youtube-nocookie.com",
      "youtu.be",
    ].includes(url.hostname)
  ) {
    provider = "youtube";
    if (url.hostname === "youtu.be")
      videoId = /^\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1] ?? null;
    else if (
      url.pathname === "/watch" &&
      !url.hostname.includes("nocookie") &&
      url.searchParams.getAll("v").length === 1
    )
      videoId = url.searchParams.get("v");
    else
      videoId =
        /^\/embed\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1] ?? null;
    if (!videoId || !YOUTUBE_ID.test(videoId))
      throw new MediaInputError("無法辨識 YouTube 影片編號。");
  }
  if (
    !url.port &&
    [
      "bilibili.com",
      "www.bilibili.com",
      "m.bilibili.com",
      "player.bilibili.com",
    ].includes(url.hostname)
  ) {
    provider = "bilibili";
    // BV 編號區分大小寫；v1 不處理 aid、影集／集數或分 P 播放設定。
    if (
      url.hostname === "player.bilibili.com" &&
      url.pathname === "/player.html" &&
      url.searchParams.getAll("bvid").length === 1
    )
      videoId = url.searchParams.get("bvid");
    else if (url.hostname !== "player.bilibili.com")
      videoId =
        /^\/video\/(BV[A-Za-z0-9]{10})\/?$/.exec(url.pathname)?.[1] ?? null;
    if (!videoId || !BILIBILI_ID.test(videoId))
      throw new MediaInputError(
        "無法辨識 Bilibili 影片編號，請使用 BV 影片分享網址。",
      );
  }
  if (provider && videoId) {
    if (kind !== "auto" && kind !== provider)
      throw new MediaInputError(
        "這是影音平台頁面，請使用自動辨識或對應的影片平台。",
      );
    return { type: "videoEmbed", attrs: { provider, videoId } };
  }
  if (isHtml || isProviderPage(url.hostname)) throw new MediaInputError();
  if ((kind === "auto" || kind === "video") && VIDEO_FILE.test(url.pathname))
    return { type: "videoEmbed", attrs: { provider: "direct", src: url.href } };
  if ((kind === "auto" || kind === "audio") && AUDIO_FILE.test(url.pathname))
    return { type: "audioEmbed", attrs: { src: url.href } };
  throw new MediaInputError();
}

/**
 * 保留指定媒體類型的呼叫入口，仍共用同一 resolver，不另建解析規則。
 */
export function normalizeMedia(kind: MediaKind, value: string): RichMediaNode {
  if (value !== value.trim())
    throw new MediaInputError("請移除網址前後的空白。");
  return resolveMediaInput(value, kind);
}

/**
 * 獨立驗證持久化節點，不依賴插入 UI。
 * 既有 v1 無副檔名 direct URL 仍可讀取以保持相容；已知平台頁面不能當作直接影音。
 */
export function isRichMediaNode(value: unknown): value is RichMediaNode {
  if (!value || typeof value !== "object") return false;
  const node = value as Record<string, unknown>;
  if (
    Object.keys(node).some((key) => !["type", "attrs"].includes(key)) ||
    !node.attrs ||
    typeof node.attrs !== "object"
  )
    return false;
  const attrs = node.attrs as Record<string, unknown>;
  const exact = (allowed: string[]) =>
    Object.keys(attrs).length === allowed.length &&
    Object.keys(attrs).every((key) => allowed.includes(key));
  const direct = () =>
    typeof attrs.src === "string" &&
    isSafeMediaUrl(attrs.src) &&
    !isProviderPage(new URL(attrs.src).hostname);
  if (node.type === "audioEmbed") return exact(["src"]) && direct();
  if (node.type !== "videoEmbed") return false;
  if (attrs.provider === "youtube" || attrs.provider === "bilibili")
    return (
      exact(["provider", "videoId"]) &&
      typeof attrs.videoId === "string" &&
      (attrs.provider === "youtube" ? YOUTUBE_ID : BILIBILI_ID).test(
        attrs.videoId,
      )
    );
  return attrs.provider === "direct" && exact(["provider", "src"]) && direct();
}

/**
 * 產生可讀的 canonical URL，供編輯預填及純文字搜尋 companion 使用。
 */
export function mediaSource(node: RichMediaNode): string {
  if (node.type === "audioEmbed") return node.attrs.src;
  if (node.attrs.provider === "direct") return node.attrs.src;
  return node.attrs.provider === "youtube"
    ? "https://www.youtube.com/watch?v=" + node.attrs.videoId
    : "https://www.bilibili.com/video/" + node.attrs.videoId + "/";
}
