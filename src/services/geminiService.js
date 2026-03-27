const LANGUAGE_MAP = {
  en: "English",
  hi: "Hindi",
  ta: "Tamil",
  bn: "Bengali",
  mr: "Marathi",
};

const getLanguageName = (code = "en") => LANGUAGE_MAP[code] || "English";

const extractText = (payload) => {
  const parts =
    payload?.candidates?.[0]?.content?.parts?.map((part) => part?.text).filter(Boolean) || [];
  return parts.join("\n").trim();
};

const sanitizeAssistantText = (text = "") =>
  text
    .replace(/\*\*/g, "")
    .replace(/^\s*[*-]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const toNumberedPoints = (text = "") => {
  const cleaned = sanitizeAssistantText(text);
  if (!cleaned) return "";

  // If points are numbered but in a single paragraph, force each point to new line.
  if (/\d+\.\s+/.test(cleaned)) {
    const normalized = cleaned
      .replace(/\s*(\d+\.)\s+/g, "\n$1 ")
      .trim()
      .replace(/^\n/, "");

    if (/^\d+\.\s+/.test(normalized)) {
      return normalized;
    }
  }

  const sentences = cleaned
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!sentences.length) return cleaned;
  return sentences.map((s, i) => `${i + 1}. ${s}`).join("\n");
};

export async function askGeminiRegionalAssistant({
  question,
  languageCode,
  context,
}) {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  const configuredModel = process.env.REACT_APP_GEMINI_MODEL;
  const candidateModels = [
    configuredModel,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ].filter(Boolean);
  const candidateApiVersions = ["v1", "v1beta"];

  if (!apiKey) {
    throw new Error("MISSING_GEMINI_KEY");
  }

  const languageName = getLanguageName(languageCode);

  const prompt = [
    "You are a geospatial and agriculture assistant.",
    `Answer in ${languageName}.`,
    "Use only the provided context. Do not invent numbers.",
    "If data is missing, say it clearly and suggest next steps.",
    "Keep answer concise, practical, and actionable.",
    "Do not use markdown.",
    "Do not use bullet symbols such as * or -.",
    "Return the final answer strictly as numbered points (1., 2., 3.).",
    "Do not return paragraph format.",
    "",
    "CONTEXT JSON:",
    JSON.stringify(context, null, 2),
    "",
    "USER QUESTION:",
    question,
  ].join("\n");

  let lastError = null;
  const maxOutputTokens = Number(process.env.REACT_APP_GEMINI_MAX_TOKENS || 1200);

  for (const version of candidateApiVersions) {
    for (const model of candidateModels) {
      const runRequest = async (inputText) =>
        fetch(
          `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: inputText }],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                topP: 0.9,
                maxOutputTokens,
              },
            }),
          }
        );

      const response = await runRequest(prompt);

      if (!response.ok) {
        const raw = await response.text();
        lastError = `GEMINI_API_ERROR (${version}/${model}): ${raw}`;
        continue;
      }

      const payload = await response.json();
      let text = extractText(payload);
      if (!text) {
        lastError = `EMPTY_GEMINI_RESPONSE (${version}/${model})`;
        continue;
      }

      const finishReason = payload?.candidates?.[0]?.finishReason;
      if (finishReason === "MAX_TOKENS") {
        let combinedText = text;

        for (let i = 0; i < 2; i += 1) {
          const continuationPrompt = [
            "Continue the exact same answer from where it stopped.",
            "Do not repeat previous lines.",
            "Return plain text only.",
            "",
            "Current answer:",
            combinedText,
          ].join("\n");

          const continuationResponse = await runRequest(continuationPrompt);
          if (!continuationResponse.ok) break;

          const continuationPayload = await continuationResponse.json();
          const continuationText = extractText(continuationPayload);
          if (!continuationText) break;

          combinedText = `${combinedText}\n${continuationText}`.trim();

          const continuationFinish =
            continuationPayload?.candidates?.[0]?.finishReason;
          if (continuationFinish !== "MAX_TOKENS") break;
        }

        return toNumberedPoints(combinedText);
      }

      return toNumberedPoints(text);
    }
  }

  throw new Error(lastError || "GEMINI_API_ERROR");
}

export function getSpeechLocale(langCode = "en") {
  const map = {
    en: "en-US",
    hi: "hi-IN",
    ta: "ta-IN",
    bn: "bn-IN",
    mr: "mr-IN",
  };
  return map[langCode] || "en-US";
}
