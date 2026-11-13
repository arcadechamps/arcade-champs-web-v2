import { useMutation } from "@tanstack/react-query";

const WEBHOOK_URL =
  "https://arcadechamps.app.n8n.cloud/webhook/71c8c8f1-b181-4809-9a17-ba1cf226feaa";

export interface ScoreExtractionResult {
  // null = the webhook could not read a score (e.g. "Error to fetch score")
  score?: number | null;
  [key: string]: unknown;
}

export const useScoreExtraction = () => {
  return useMutation<ScoreExtractionResult, Error, { file: File; gameName: string }>({
    mutationFn: async ({ file, gameName }) => {
      const formData = new FormData();
      formData.append("data", file);
      formData.append("gamename", gameName);

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const text = await response.text();
      try {
        const raw = text ? JSON.parse(text) : {};
        // Normalize: webhook may return plain number, string number, or { score: N }
        if (typeof raw === "number") return { score: raw };
        if (typeof raw === "string" && !isNaN(Number(raw))) return { score: Number(raw) };
        if (typeof raw?.score === "number") return raw as ScoreExtractionResult;
        if (typeof raw?.score === "string" && !isNaN(Number(raw.score))) return { score: Number(raw.score) };
        // Anything else ("Error to fetch score", "Empty or Wrong Image", ...) is a failed read
        const extra = raw && typeof raw === "object" ? raw : { message: raw };
        return { ...extra, score: null } as ScoreExtractionResult;
      } catch {
        console.warn("[ScoreExtraction] Non-JSON response:", text);
        return { score: null, message: text } as ScoreExtractionResult;
      }
    },
  });
};
