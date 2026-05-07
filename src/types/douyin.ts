// ── Mirrors douyin_result.dart exactly ──────────────────────────────────────

export interface DouyinResult {
  video: DouyinVideo;
}

export interface DouyinVideo {
  awemeId: string;
  description: string;
  author: DouyinAuthor;
  videoDetail: DouyinVideoDetail;
  music: DouyinMusic;
  statistics: DouyinStatistics;
  coverUrl: string;
  awemeLink: string;
  createTime: number;
}

export interface DouyinAuthor {
  uid: string;
  nickname: string;
  uniqueId: string;
  signature: string;
  avatarUrl: string;
  link: string;
}

export interface DouyinVideoDetail {
  duration: number;
  coverUrl: string;
  qualities: DouyinQuality[];
  downloadUrl: string;
}

export interface DouyinQuality {
  gearName: string;
  bitRate: number;
  format: string;
  qualityType: number;
  url: string;
  width: number;
  height: number;
  dataSize: number;
}

export interface DouyinMusic {
  id: number;
  title: string;
  author: string;
  playUrl: string;
  coverUrl: string;
}

export interface DouyinStatistics {
  playCount: number;
  diggCount: number;
  shareCount: number;
  commentCount: number;
  collectCount: number;
}

// ── Helpers (mirrors Dart getters) ──────────────────────────────────────────

export function qualityLabel(q: DouyinQuality): string {
  const resolution = `${q.width}x${q.height}`;
  let quality = "";
  if (q.gearName.includes("1080")) quality = "1080p";
  else if (q.gearName.includes("720")) quality = "720p";
  else if (q.gearName.includes("540"))
    quality = q.gearName.includes("lower") ? "540p (Lower)" : "540p";
  else if (q.gearName.includes("480")) quality = "480p";
  else if (q.gearName.includes("360")) quality = "360p";
  return quality ? `${resolution} — ${quality}` : resolution;
}

export function fileSizeMB(q: DouyinQuality): string {
  return (q.dataSize / (1024 * 1024)).toFixed(2);
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

// ── JSON → Model (mirrors fromJson factories) ────────────────────────────────

function parseQualities(bitRateList: any[]): DouyinQuality[] {
  const all: DouyinQuality[] = bitRateList.map((q) => {
    const playAddr = q.play_addr ?? {};
    const urlList: string[] = playAddr.url_list ?? [];
    return {
      gearName: q.gear_name ?? "",
      bitRate: q.bit_rate ?? 0,
      format: q.format ?? "mp4",
      qualityType: q.quality_type ?? 0,
      url: urlList[0] ?? "",
      width: playAddr.width ?? 0,
      height: playAddr.height ?? 0,
      dataSize: playAddr.data_size ?? 0,
    };
  });

  // Deduplicate by resolution, keep highest bitrate
  const map = new Map<string, DouyinQuality>();
  for (const q of all) {
    const key = `${q.width}x${q.height}`;
    if (!map.has(key) || q.bitRate > map.get(key)!.bitRate) map.set(key, q);
  }

  // Sort highest → lowest resolution
  return [...map.values()].sort(
    (a, b) => b.width * b.height - a.width * a.height
  );
}

export function parseDouyinResult(raw: any): DouyinResult {
  const d = raw.data.aweme_detail;

  const cover = d.video?.cover?.url_list ?? [];
  const dlAddr = d.video?.download_addr?.url_list ?? [];
  const avatarThumb = d.author?.avatar_thumb?.url_list ?? [];

  return {
    video: {
      awemeId: d.aweme_id ?? "",
      description: d.desc ?? "",
      author: {
        uid: d.author?.uid ?? "",
        nickname: d.author?.nickname ?? "",
        uniqueId: d.author?.unique_id ?? "",
        signature: d.author?.signature ?? "",
        avatarUrl: avatarThumb[0] ?? "",
        link: d.author?.link ?? "",
      },
      videoDetail: {
        duration: d.video?.duration ?? 0,
        coverUrl: cover[0] ?? "",
        qualities: parseQualities(d.video?.bit_rate ?? []),
        downloadUrl: dlAddr[0] ?? "",
      },
      music: {
        id: d.music?.id ?? 0,
        title: d.music?.title ?? "",
        author: d.music?.author ?? "",
        playUrl: d.music?.play_url ?? "",
        coverUrl: d.music?.cover ?? "",
      },
      statistics: {
        playCount: d.statistics?.play_count ?? 0,
        diggCount: d.statistics?.digg_count ?? 0,
        shareCount: d.statistics?.share_count ?? 0,
        commentCount: d.statistics?.comment_count ?? 0,
        collectCount: d.statistics?.collect_count ?? 0,
      },
      coverUrl: d.cover ?? "",
      awemeLink: d.aweme_link ?? "",
      createTime: d.create_time ?? 0,
    },
  };
}
