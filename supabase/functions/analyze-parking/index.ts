import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalyzeRequest {
  imageBase64: string;
  mimeType: string;
  currentTime: string;
  currentDay: string;
  isPublicHoliday: boolean;
  location?: string;
}

const SYSTEM_PROMPT = `You are an expert parking sign analyzer for Australian cities.
You analyze photos of parking signs and return a structured JSON response indicating whether parking is currently allowed.
Always respond with valid JSON only - no markdown, no explanation, just the JSON object.`;

function buildUserPrompt(req: AnalyzeRequest): string {
  return `Analyze this parking sign photo.

Context:
- Current time: ${req.currentTime}
- Current day: ${req.currentDay}
- Is public holiday today: ${req.isPublicHoliday ? "YES" : "NO"}
- Location: ${req.location ?? "Unknown"}

Return a JSON object with EXACTLY this structure:
{
  "canPark": boolean,
  "verdict": "YES, YOU CAN PARK" or "NO PARKING",
  "description": "One sentence explaining current parking status",
  "maxDuration": "e.g. 2 Hours or null if unrestricted",
  "until": "e.g. 4:00 PM or null if no time limit",
  "rawSignText": "Transcribe all text visible on the sign(s)",
  "contextCards": [
    {
      "icon": "material_symbol_name",
      "iconBg": "hex color for icon background",
      "iconColor": "hex color for icon",
      "title": "Card title",
      "description": "Detailed explanation",
      "colSpan": 2
    }
  ],
  "regulatoryBreakdown": [
    {
      "status": "ok" | "warning" | "error" | "info",
      "title": "Check name",
      "detail": "Detail about this check"
    }
  ]
}

Include relevant contextCards for: time restrictions, school zones (if applicable), clearway status, tow-away zones, permit areas.
Include regulatory breakdown items for: time limits, clearway status, permit zones, parking fees, no-stopping rules.
Be specific about CURRENT status given the time/day/holiday context provided.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          "OPENROUTER_API_KEY secret not configured. Add it in Supabase Dashboard → Edge Functions → Secrets.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.imageBase64) {
    return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = {
    model: "openai/gpt-4o",
    max_tokens: 1200,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${body.mimeType ?? "image/jpeg"};base64,${body.imageBase64}`,
              detail: "high",
            },
          },
          { type: "text", text: buildUserPrompt(body) },
        ],
      },
    ],
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://parkwise.ai",
      "X-Title": "ParkWise AI",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    return new Response(
      JSON.stringify({ error: `OpenRouter API error ${response.status}: ${errText}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content ?? "{}";

  let parsed: Record<string, unknown>;
  try {
    const clean = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(clean);
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to parse AI response", raw: content }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
