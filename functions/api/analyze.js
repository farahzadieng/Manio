const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

export async function onRequestPost({ request }) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin)
    return json({ error: "درخواست نامعتبر است." }, 403);
  const key = request.headers.get("X-Gemini-Key")?.trim();
  if (!key || key.length > 512)
    return json({ error: "کلید Gemini را در تنظیمات وارد کنید." }, 400);
  if (Number(request.headers.get("Content-Length")) > 600_000)
    return json({ error: "حجم داده بیش از حد مجاز است." }, 413);
  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "داده نامعتبر است." }, 400);
  }
  if (
    typeof input?.prompt !== "string" ||
    !input.prompt.trim() ||
    input.prompt.length > 500_000
  )
    return json({ error: "پرامپت نامعتبر است." }, 400);
  try {
    const upstream = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: input.prompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
      },
    );
    const result = await upstream.json();
    if (!upstream.ok)
      return json(
        {
          error:
            upstream.status === 429
              ? "سقف استفاده از Gemini پر شده است؛ کمی بعد دوباره تلاش کنید."
              : upstream.status === 400 || upstream.status === 403
                ? "کلید Gemini یا دسترسی مدل را بررسی کنید."
                : "Gemini پاسخ نداد؛ دوباره تلاش کنید.",
        },
        502,
      );
    const text = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("\n")
      .trim();
    if (!text) return json({ error: "Gemini پاسخ متنی تولید نکرد." }, 502);
    return json({ text });
  } catch {
    return json({ error: "ارتباط Cloudflare با Gemini برقرار نشد." }, 502);
  }
}
