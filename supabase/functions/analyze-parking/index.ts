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
Analyze parking sign photos and return ONLY valid JSON - no markdown, no explanations.

MULTI-ZONE SIGNS: When a sign has multiple boxes/panels (left/right, top/bottom, stacked):
- Each box is a SEPARATE parking rule
- Transcribe ALL boxes and describe their position (e.g., "Left panel", "Right panel", "Top", "Bottom")
- Evaluate which box(es) match the current day/time
- If multiple boxes match, pick the longest duration
- If no box matches, verdict is NO PARKING

DAY TYPES:
- "SCHOOL DAYS" = Monday-Friday (non-holidays)
- "SATURDAYS" / "SAT" = Saturday only  
- "OTHER DAYS" = Any day not specified
- "SUN" / "PUBLIC HOLIDAYS" = Sunday or public holidays

TIME MATCHING: A box applies if current time falls within its time ranges AND day matches.

CONTEXTCARDS: For each zone that exists (matching or not), create a contextCard explaining:
- What the zone allows
- When it applies (days/times)
- Whether it matches current conditions

REGULATORY BREAKDOWN: Add items explaining:
- Time match (Does current time fall in allowed range?)
- Day match (Does current day match restrictions?)
- Zone selection (Which zone has priority if multiple match?)
- Duration allowed

CRITICAL: Always return valid JSON with populated contextCards and regulatoryBreakdown. Never return empty arrays.`;

function buildUserPrompt(req: AnalyzeRequest): string {
  const dayType = req.isPublicHoliday 
    ? "Public Holiday" 
    : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(req.currentDay)
      ? "Weekday"
      : "Weekend";
  
  return `Analyze this parking sign thoroughly. Current conditions:
- Time: ${req.currentTime} (${dayType}, ${req.currentDay})
- Location: ${req.location ?? "Unknown"}

INSTRUCTIONS:
1. Identify EACH distinct zone/panel (left, right, top, bottom, etc.)
2. For EACH zone: transcribe text, identify day restrictions, time ranges
3. Determine which zone(s) match BOTH current day AND time
4. Build rich response with detailed breakdown

Return EXACTLY this JSON (with real data):
{
  "canPark": boolean,
  "verdict": "YES, YOU CAN PARK" or "NO PARKING",
  "description": "Detailed explanation of which zone applies and why",
  "maxDuration": "e.g. '2 Hours' or null",
  "until": "e.g. '2:30 PM' or null",
  "rawSignText": "Full transcription of ALL zones",
  "activeZone": "Which zone(s) apply now",
  "contextCards": [
    {
      "icon": "info",
      "iconBg": "#2a2a2a",
      "iconColor": "#ffb84d",
      "title": "Zone name (e.g., 'Right Panel')",
      "description": "What this zone allows/restricts",
      "colSpan": 2
    },
    {
      "icon": "schedule",
      "iconBg": "#2a2a2a",
      "iconColor": "#ffb84d",
      "title": "Time Restrictions",
      "description": "When this zone applies",
      "colSpan": 2
    }
  ],
  "regulatoryBreakdown": [
    {
      "status": "ok" or "warning" or "error" or "info",
      "title": "Check name (e.g., 'Time Match')",
      "detail": "Explanation (e.g., '10:07 AM falls within 9:30 AM - 2:30 PM')"
    }
  ]
}`;
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
      // Remove markdown code blocks
      const clean = content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      
      parsed = JSON.parse(clean);
      
      // Ensure required fields exist and have content
      if (!parsed.canPark || !parsed.verdict) {
        console.error("Missing required fields in response:", parsed);
        return jsonResponse({
          canPark: false,
          verdict: "NO PARKING",
          description: "Unable to determine parking status",
          maxDuration: null,
          until: null,
          rawSignText: content,
          activeZone: "Unknown",
          contextCards: [
            {
              icon: "error",
              iconBg: "#2a2a2a",
              iconColor: "#ff6b6b",
              title: "Analysis Error",
              description: "Could not analyze this parking sign",
              colSpan: 2
            }
          ],
          regulatoryBreakdown: [
            {
              status: "error",
              title: "Sign Analysis",
              detail: "Unable to determine parking status from sign"
            }
          ]
        });
      }
      
      // Ensure contextCards and regulatoryBreakdown have content
      if (!parsed.contextCards || parsed.contextCards.length === 0) {
        parsed.contextCards = [
          {
            icon: "info",
            iconBg: "#2a2a2a",
            iconColor: "#ffb84d",
            title: "Parking Information",
            description: parsed.description || "See regulatory breakdown for details",
            colSpan: 2
          }
        ];
      }
      
      if (!parsed.regulatoryBreakdown || parsed.regulatoryBreakdown.length === 0) {
        parsed.regulatoryBreakdown = [
          {
            status: parsed.canPark ? "ok" : "error",
            title: "Parking Status",
            detail: parsed.description || (parsed.canPark ? "Parking allowed" : "No parking")
          }
        ];
      }
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Content:", content);
      return jsonResponse({
        canPark: false,
        verdict: "NO PARKING",
        description: "Error analyzing sign",
        maxDuration: null,
        until: null,
        rawSignText: content,
        activeZone: "Error",
        contextCards: [
          {
            icon: "error",
            iconBg: "#2a2a2a",
            iconColor: "#ff6b6b",
            title: "Analysis Error",
            description: "Could not parse sign analysis",
            colSpan: 2
          }
        ],
        regulatoryBreakdown: [
          {
            status: "error",
            title: "Sign Analysis",
            detail: "Error analyzing this parking sign"
          }
        ]
      }, 200);
    }

    return jsonResponse(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected analyze-parking error";
    return jsonResponse({ error: message }, 500);
  }
});
