import type { VercelRequest, VercelResponse } from "@vercel/node";

const BACKEND_BASE = Buffer.from(
  "aHR0cDovLzY0LjIzLjI1MS4xNDU6ODAwOA==",
  "base64"
).toString("utf-8");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body as { url?: string };

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing or invalid url" });
  }

  try {
    const upstream = await fetch(`${BACKEND_BASE}/douyin/redirect/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(30_000),
    });

    const data = await upstream.json();

    if (!upstream.ok || data?.code !== 200) {
      return res
        .status(502)
        .json({ error: data?.message ?? "Backend error", code: data?.code });
    }

    return res.status(200).json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Proxy error: ${msg}` });
  }
}
