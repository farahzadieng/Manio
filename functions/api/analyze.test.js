import { describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./analyze.js";

describe("Cloudflare Gemini route", () => {
  it("passes a prompt through Cloudflare and returns only generated text", async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "الگوی احتمالی: مکث پیش از خرید." }],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", upstream);
    const request = new Request("https://manio.example/api/analyze", {
      method: "POST",
      headers: { Origin: "https://manio.example", "X-Gemini-Key": "test-key" },
      body: JSON.stringify({ prompt: "تحلیل آزمایشی" }),
    });
    const response = await onRequestPost({ request });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      text: "الگوی احتمالی: مکث پیش از خرید.",
    });
    expect(upstream.mock.calls[0][0]).toContain(
      "generativelanguage.googleapis.com",
    );
    expect(upstream.mock.calls[0][1].headers["x-goog-api-key"]).toBe(
      "test-key",
    );
    const requestBody = JSON.parse(upstream.mock.calls[0][1].body);
    expect(requestBody.generationConfig).not.toHaveProperty("maxOutputTokens");
    vi.unstubAllGlobals();
  });
});
