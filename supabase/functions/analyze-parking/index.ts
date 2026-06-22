import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, prefer",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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
You are skilled at parsing complex, multi-zone stacked parking signs with different rules for different times/days.

KEY PARSING RULES:
1. Multi-zone signs: Each box/zone represents separate, distinct parking rules. Evaluate the zone that applies NOW.
2. Day types: 
   - "SCHOOL DAYS" = Monday-Friday during school term (non-holidays)
   - "SATURDAYS" / "SAT" = Saturday only
   - "OTHER DAYS" / "MON-SAT" = All weekdays and Saturday
   - "SUN & PUBLIC HOLIDAYS" = Sunday or public holiday dates
3. Time matching: Given current time, find ALL matching time slots and determine longest allowed duration
4. School zones: If "SCHOOL" appears, apply SCHOOL DAYS rule only on weekday school days
5. No continuous match = NO PARKING allowed

ANALYSIS PROCESS:
1. Transcribe ALL text from ALL zones/panels on the sign
2. Parse each zone as a separate rule set
3. For current time/day, identify which zone(s) apply
4. If multiple zones apply, choose the one with longest duration
5. If no zone matches current time/day, verdict is NO PARKING

Always respond with valid JSON only - no markdown, no explanation, just the JSON object.`;

function buildUserPrompt(req: AnalyzeRequest): string {
  const dayType = req.isPublicHoliday 
    ? "Public Holiday" 
    : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(req.currentDay)
      ? "Weekday (School Day)"
      : "Weekend";
  
  return `Analyze this parking sign photo. Handle multi-zone/stacked signs carefully.

CURRENT CONDITIONS:
- Time: ${req.currentTime} (24-hour format)
- Day: ${req.currentDay}
- Day Type: ${dayType}
- Public Holiday: ${req.isPublicHoliday ? "YES" : "NO"}
- Location: ${req.location ?? "Unknown"}

MULTI-ZONE SIGN INSTRUCTIONS:
If the sign has multiple boxes/sections (stacked or side-by-side):
1. Treat each box as a separate, independent parking rule
2. Transcribe text from EACH box separately
3. Determine which box(es) apply to the CURRENT day/time
4. If "SCHOOL DAYS" appears in a box: only apply that box on weekday school days (Mon-Fri, non-holiday)
5. If time slot doesn't match current time: that box does NOT apply
6. Pick the box with the LONGEST allowed duration that matches current day/time
7. If NO box matches current day/time: verdict is NO PARKING

Return a JSON object with EXACTLY this structure:
{
  "canPark": boolean,
  "verdict": "YES, YOU CAN PARK" or "NO PARKING",
  "description": "One sentence explaining current parking status based on matching zone(s)",
  "maxDuration": "e.g. '2 Hours' or '5 Minutes' or null if unrestricted",
  "until": "e.g. '4:00 PM' or null",
  "rawSignText": "Full transcription of all text from all zones/boxes on the sign",
  "activeZone": "Description of which zone/box applies right now",
  "contextCards": [
    {
      "icon": "material_symbol_name",
      "iconBg": "#hex color",
      "iconColor": "#hex color",
      "title": "Card title",
      "description": "Explanation",
      "colSpan": 2
    }
  ],
  "regulatoryBreakdown": [
    {
      "status": "ok" | "warning" | "error" | "info",
      "title": "Check name",
      "detail": "Detail"
    }
  ]
}

CRITICAL: For time ranges like "9AM-2:30PM", check if ${req.currentTime} falls within. Be precise with time matching.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return jsonResponse(
        {
        error:
          "OPENROUTER_API_KEY secret not configured. Add it in Supabase Dashboard → Edge Functions → Secrets.",
        },
        500
      );
    }

    let body: AnalyzeRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    if (!body.imageBase64) {
      return jsonResponse({ error: "imageBase64 is required" }, 400);
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
      return jsonResponse({ error: `OpenRouter API error ${response.status}: ${errText}` }, 502);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content ?? "{}";

    let parsed: Record<string, unknown>;
    try {
      const clean = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      return jsonResponse({ error: "Failed to parse AI response", raw: content }, 502);
    }

    return jsonResponse(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected analyze-parking error";
    return jsonResponse({ error: message }, 500);
  }
});
