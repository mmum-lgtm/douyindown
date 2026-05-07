import {
  createSignal,
  createMemo,
  Show,
  For,
  type Component,
} from "solid-js";
import toast, { Toaster } from "solid-toast";
import {
  type DouyinResult,
  type DouyinQuality,
  qualityLabel,
  fileSizeMB,
  formatCount,
  formatDuration,
  formatDate,
  parseDouyinResult,
} from "../types/douyin";

// ── State ────────────────────────────────────────────────────────────────────

type Status = "idle" | "loading" | "done" | "error";

// ── API calls (hit our Vercel proxy routes) ──────────────────────────────────

async function fetchRedirect(url: string): Promise<string> {
  const res = await fetch("/api/douyin/redirect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to resolve URL");
  const awemeId = data?.data?.aweme_id as string | undefined;
  if (!awemeId) throw new Error("Could not extract video ID");
  return awemeId;
}

async function fetchVideo(aweme_id: string): Promise<DouyinResult> {
  const res = await fetch("/api/douyin/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aweme_id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to fetch video");
  return parseDouyinResult(data);
}

// ── Sub-components ───────────────────────────────────────────────────────────

const StatBadge: Component<{ icon: string; value: string; label: string }> = (
  props
) => (
  <div class="flex flex-col items-center gap-1">
    <span class="text-xl">{props.icon}</span>
    <span class="font-mono text-sm font-bold text-white">{props.value}</span>
    <span class="text-[10px] uppercase tracking-widest text-white/40">
      {props.label}
    </span>
  </div>
);

const QualityChip: Component<{
  quality: DouyinQuality;
  selected: boolean;
  onClick: () => void;
}> = (props) => (
  <button
    onClick={props.onClick}
    class={`
      relative px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200
      border ${
        props.selected
          ? "bg-[#FF2D55] border-[#FF2D55] text-white shadow-[0_0_12px_rgba(255,45,85,0.5)]"
          : "bg-white/5 border-white/10 text-white/60 hover:border-[#FF2D55]/50 hover:text-white"
      }
    `}
  >
    {qualityLabel(props.quality)}
    <span class="ml-1.5 opacity-60">{fileSizeMB(props.quality)} MB</span>
  </button>
);

// ── Main component ───────────────────────────────────────────────────────────

const DouyinDownloader: Component = () => {
  const [url, setUrl] = createSignal("");
  const [status, setStatus] = createSignal<Status>("idle");
  const [result, setResult] = createSignal<DouyinResult | null>(null);
  const [selectedQuality, setSelectedQuality] = createSignal(0);

  const video = createMemo(() => result()?.video ?? null);

  async function handleFetch() {
    const rawUrl = url().trim();
    if (!rawUrl) {
      toast.error("Paste a Douyin video URL first.");
      return;
    }

    setStatus("loading");
    setResult(null);

    try {
      const awemeId = await fetchRedirect(rawUrl);
      const res = await fetchVideo(awemeId);
      setResult(res);
      setSelectedQuality(0);
      setStatus("done");
      toast.success("Video info loaded!");
    } catch (err: unknown) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
    }
  }

  function handleDownloadVideo() {
    const v = video();
    if (!v) return;
    const q = v.videoDetail.qualities[selectedQuality()];
    const dlUrl = q?.url || v.videoDetail.downloadUrl;
    if (!dlUrl) {
      toast.error("No download URL available for this quality.");
      return;
    }
    // Open in new tab — browser will download the mp4 directly
    window.open(dlUrl, "_blank", "noopener,noreferrer");
    toast.success("Download started!");
  }

  function handleDownloadMusic() {
    const v = video();
    if (!v || !v.music.playUrl) {
      toast.error("No music available for this video.");
      return;
    }
    window.open(v.music.playUrl, "_blank", "noopener,noreferrer");
    toast.success("Music download started!");
  }

  return (
    <>
      {/* Toaster — portal, no z-index fights */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#1a1a2e",
            color: "#fff",
            border: "1px solid rgba(255,45,85,0.3)",
            "font-family": "'DM Mono', monospace",
            "font-size": "13px",
          },
          duration: 3500,
        }}
      />

      <div class="min-h-screen bg-[#0d0d0d] text-white font-sans px-4 py-16 selection:bg-[#FF2D55]/30">
        {/* ── Noise texture overlay ── */}
        <div
          class="pointer-events-none fixed inset-0 opacity-[0.03]"
          style={{
            "background-image": `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* ── Glow blob ── */}
        <div class="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[#FF2D55]/10 blur-[120px]" />

        <div class="relative z-10 max-w-2xl mx-auto">
          {/* ── Header ── */}
          <header class="mb-12 text-center">
            <div class="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 tracking-widest uppercase">
              <span class="w-1.5 h-1.5 rounded-full bg-[#FF2D55] animate-pulse" />
              Video Downloader
            </div>
            <h1 class="text-5xl font-black tracking-tight leading-none mb-3">
              Douyin
              <span class="text-[#FF2D55]">.</span>
              <br />
              <span class="text-white/20">Downloader</span>
            </h1>
            <p class="text-white/40 text-sm max-w-sm mx-auto leading-relaxed">
              Paste any Douyin share link. Pick your quality. Download without
              watermark.
            </p>
          </header>

          {/* ── URL Input ── */}
          <div class="relative flex gap-2 mb-10">
            <div class="relative flex-1 group">
              <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-[#FF2D55]/20 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
              <input
                type="url"
                value={url()}
                onInput={(e) => setUrl(e.currentTarget.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                placeholder="https://v.douyin.com/..."
                class="relative w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#FF2D55]/50 transition-colors font-mono"
              />
            </div>
            <button
              onClick={handleFetch}
              disabled={status() === "loading"}
              class="
                flex-shrink-0 px-5 py-3.5 rounded-xl font-bold text-sm
                bg-[#FF2D55] hover:bg-[#e0264d] active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-150
                shadow-[0_0_20px_rgba(255,45,85,0.4)]
              "
            >
              <Show when={status() === "loading"} fallback="Fetch">
                <span class="inline-flex items-center gap-2">
                  <svg
                    class="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Loading…
                </span>
              </Show>
            </button>
          </div>

          {/* ── Result card ── */}
          <Show when={status() === "done" && video()}>
            {(_) => {
              const v = video()!;
              return (
                <div class="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden backdrop-blur-sm animate-[fadeUp_0.4s_ease_both]">
                  {/* Cover */}
                  <div class="relative h-52 bg-white/5 overflow-hidden">
                    <img
                      src={v.coverUrl || v.videoDetail.coverUrl}
                      alt="cover"
                      class="w-full h-full object-cover opacity-80"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                    {/* Duration badge */}
                    <div class="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/70 text-xs font-mono text-white/80 backdrop-blur-sm">
                      {formatDuration(v.videoDetail.duration)}
                    </div>
                    {/* Gradient fade */}
                    <div class="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent" />
                  </div>

                  <div class="px-5 py-5 space-y-5">
                    {/* Author row */}
                    <div class="flex items-center gap-3">
                      <Show when={v.author.avatarUrl}>
                        <img
                          src={v.author.avatarUrl}
                          alt="avatar"
                          class="w-9 h-9 rounded-full border border-white/10 object-cover"
                          onError={(e) => {
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.display = "none";
                          }}
                        />
                      </Show>
                      <div>
                        <p class="font-semibold text-sm text-white">
                          {v.author.nickname}
                        </p>
                        <Show when={v.author.uniqueId}>
                          <p class="text-xs text-white/40">
                            @{v.author.uniqueId}
                          </p>
                        </Show>
                      </div>
                      <div class="ml-auto text-xs text-white/30 font-mono">
                        {formatDate(v.createTime)}
                      </div>
                    </div>

                    {/* Description */}
                    <Show when={v.description}>
                      <p class="text-sm text-white/70 leading-relaxed line-clamp-3">
                        {v.description}
                      </p>
                    </Show>

                    {/* Stats */}
                    <div class="grid grid-cols-4 gap-2 py-3 border-y border-white/[0.07]">
                      <StatBadge
                        icon="❤️"
                        value={formatCount(v.statistics.diggCount)}
                        label="Likes"
                      />
                      <StatBadge
                        icon="💬"
                        value={formatCount(v.statistics.commentCount)}
                        label="Comments"
                      />
                      <StatBadge
                        icon="↗️"
                        value={formatCount(v.statistics.shareCount)}
                        label="Shares"
                      />
                      <StatBadge
                        icon="🔖"
                        value={formatCount(v.statistics.collectCount)}
                        label="Saves"
                      />
                    </div>

                    {/* Quality selector */}
                    <Show when={v.videoDetail.qualities.length > 0}>
                      <div>
                        <p class="text-xs uppercase tracking-widest text-white/30 mb-2.5">
                          Quality
                        </p>
                        <div class="flex flex-wrap gap-2">
                          <For each={v.videoDetail.qualities}>
                            {(q, i) => (
                              <QualityChip
                                quality={q}
                                selected={selectedQuality() === i()}
                                onClick={() => setSelectedQuality(i())}
                              />
                            )}
                          </For>
                        </div>
                      </div>
                    </Show>

                    {/* Music info */}
                    <Show when={v.music.title}>
                      <div class="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-[#FF2D55]/20 flex items-center justify-center text-sm">
                          🎵
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-xs font-medium text-white truncate">
                            {v.music.title}
                          </p>
                          <Show when={v.music.author}>
                            <p class="text-[11px] text-white/40 truncate">
                              {v.music.author}
                            </p>
                          </Show>
                        </div>
                        <button
                          onClick={handleDownloadMusic}
                          class="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-[#FF2D55]/20 border border-white/10 hover:border-[#FF2D55]/40 transition-all duration-150 text-white/70 hover:text-white"
                        >
                          ↓ Music
                        </button>
                      </div>
                    </Show>

                    {/* Download button */}
                    <button
                      onClick={handleDownloadVideo}
                      class="
                        w-full py-3.5 rounded-xl font-bold text-sm
                        bg-[#FF2D55] hover:bg-[#e0264d] active:scale-[0.98]
                        transition-all duration-150
                        shadow-[0_4px_24px_rgba(255,45,85,0.35)]
                        flex items-center justify-center gap-2
                      "
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4"
                        />
                      </svg>
                      Download Video
                    </button>
                  </div>
                </div>
              );
            }}
          </Show>

          {/* ── Footer hint ── */}
          <p class="text-center text-white/20 text-xs mt-8 font-mono">
            For personal use only · No watermark
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default DouyinDownloader;
