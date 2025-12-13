export type TranslateDirection = "id-to-banjar" | "banjar-to-id";

/**
 * API base path.
 *
 * - Development: default is `/api`, which Vite proxies to `http://127.0.0.1:8000`
 * - Production: keep `/api` and let your reverse-proxy (Nginx/Caddy) forward it
 */
const RAW_BASE = (import.meta as any).env?.VITE_API_BASE as string | undefined;
const BASE =
  RAW_BASE && RAW_BASE.trim().length > 0
    ? RAW_BASE.trim().replace(new RegExp("/+$"), "")
    : "/api";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // ignore JSON parse errors
  }

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return (data ?? {}) as T;
}

export async function translateText(
  text: string,
  direction: TranslateDirection
): Promise<{ translatedText?: string; error?: string }> {
  return await postJson("/translate", { text, direction });
}

export interface AnalyzeImageResult {
  success: boolean;
  extractedText?: string;
  detectedLanguage?: "indonesian" | "banjar";
  translatedText?: string;
  direction?: TranslateDirection;
  error?: string;
}

export async function analyzeImage(
  imageBase64: string
): Promise<AnalyzeImageResult> {
  return await postJson("/analyze-image", { imageBase64 });
}
