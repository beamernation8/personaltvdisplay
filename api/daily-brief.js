const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const SYSTEM_PROMPT = `You are a concise personal assistant generating a daily brief for someone's TV dashboard.
Given the user's calendar events and recent emails, produce a structured JSON overview of their day.

Return ONLY valid JSON with this exact shape:
{
  "summary": "One sentence TL;DR of the day (max 20 words)",
  "priorities": [
    { "text": "Action item or key thing to focus on", "type": "calendar|email|reminder" }
  ],
  "schedule": [
    { "time": "9:00 AM", "title": "Event name", "detail": "optional short detail" }
  ],
  "headsUp": [
    { "text": "Something to be aware of — deadline, travel, follow-up, etc." }
  ]
}

Rules:
- priorities: 2–4 of the most important/actionable items. Derive from both calendar and email.
- schedule: Condensed timeline of today's events only. Use 12-hour times. Max 6 entries.
- headsUp: 1–3 things worth noting — upcoming deadlines, things that need replies, travel reminders, etc. If nothing notable, return an empty array.
- summary: A warm, helpful one-liner like "Busy morning with 3 meetings, lighter afternoon."
- Keep ALL text short and scannable — this is displayed on a TV from across the room.
- Never include raw email addresses or overly long subjects. Summarize.
- If there's very little data, still produce a helpful brief with what you have.`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()

  if (!GEMINI_API_KEY) {
    return res.status(200).json(getMockBrief())
  }

  try {
    const { events = [], emails = [] } = req.body || {}

    const context = [
      events.length
        ? `Today's calendar events:\n${events.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
        : 'No calendar events today.',
      emails.length
        ? `Recent important emails:\n${emails.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
        : 'No notable recent emails.'
    ].join('\n\n')

    const body = {
      contents: [{
        parts: [{ text: `${SYSTEM_PROMPT}\n\nHere is the user's data:\n${context}\n\nGenerate the daily brief JSON now.` }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600,
        topP: 0.9
      }
    }

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    )

    if (!r.ok) {
      console.error('[DailyBrief] Gemini error:', r.status, await r.text())
      return res.status(200).json(getMockBrief())
    }

    const data = await r.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Extract JSON from the response (Gemini sometimes wraps it in markdown fences)
    const jsonMatch = text.match(/\{[\s\S]*"summary"[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return res.status(200).json({
        summary:    String(parsed.summary || '').slice(0, 200),
        priorities: (parsed.priorities || []).slice(0, 4),
        schedule:   (parsed.schedule || []).slice(0, 6),
        headsUp:    (parsed.headsUp || []).slice(0, 3),
        generatedAt: new Date().toISOString()
      })
    }

    // Fallback if JSON parsing fails
    console.warn('[DailyBrief] Could not parse Gemini response, using mock')
    return res.status(200).json(getMockBrief())
  } catch (err) {
    console.error('[DailyBrief] Error:', err)
    return res.status(200).json(getMockBrief())
  }
}

function getMockBrief() {
  return {
    summary: "Moderate day — a few meetings and some emails to catch up on.",
    priorities: [
      { text: "Prep for the 11 AM design review", type: "calendar" },
      { text: "Reply to the project proposal from Alex", type: "email" },
      { text: "Review budget spreadsheet before EOD", type: "reminder" }
    ],
    schedule: [
      { time: "9:00 AM", title: "Morning Standup", detail: "Zoom · Engineering" },
      { time: "11:00 AM", title: "Design Review", detail: "Dashboard v2" },
      { time: "12:30 PM", title: "Lunch with Sarah", detail: "Bocce Club Pizza" },
      { time: "3:00 PM", title: "1:1 with Manager", detail: "Office" }
    ],
    headsUp: [
      { text: "Project deadline Friday — final deliverables due" },
      { text: "Dentist appointment tomorrow at 2 PM" }
    ],
    generatedAt: new Date().toISOString(),
    mock: true
  }
}
