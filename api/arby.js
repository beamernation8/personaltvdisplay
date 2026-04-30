const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const SYSTEM_PROMPT = `You are Arbie, a fun, warm, encouraging female AI assistant who lives on a personal TV dashboard. 
You generate exactly ONE message of 1–2 sentences that is encouraging, humorous, and human.
Reference the user's upcoming calendar events, recent emails, or news headlines when relevant — but keep it casual and brief.
Be witty and playful, never robotic or generic. Imagine you're a supportive best friend glancing at someone's day.
Also pick ONE facial expression from this exact list: happy, wink, excited, thinking, laughing, cool
Respond ONLY with valid JSON: {"message": "...", "expression": "..."}`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()

  if (!GEMINI_API_KEY) {
    return res.status(200).json({
      message: "Hey! I'm Arbie — your dashboard bestie. Set up my brain (GEMINI_API_KEY) and I'll have something witty to say! 🧠",
      expression: 'wink'
    })
  }

  try {
    const { events = [], emails = [], news = [] } = req.body || {}

    const context = [
      events.length ? `Upcoming events: ${events.join('; ')}` : 'No upcoming events.',
      emails.length ? `Recent emails from: ${emails.join('; ')}` : 'No recent emails.',
      news.length   ? `Top news: ${news.join('; ')}` : 'No news right now.'
    ].join('\n')

    const body = {
      contents: [{
        parts: [{ text: `${SYSTEM_PROMPT}\n\nHere is the user's current context:\n${context}\n\nGenerate your message now.` }]
      }],
      generationConfig: {
        temperature: 1.0,
        maxOutputTokens: 150,
        topP: 0.95
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
      console.error('[Arbie] Gemini error:', r.status, await r.text())
      return res.status(200).json({
        message: "My brain's taking a quick nap — I'll be back with something clever soon! 💤",
        expression: 'thinking'
      })
    }

    const data = await r.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Extract JSON from the response (Gemini sometimes wraps it in markdown)
    const jsonMatch = text.match(/\{[\s\S]*"message"[\s\S]*"expression"[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const validExpressions = ['happy', 'wink', 'excited', 'thinking', 'laughing', 'cool']
      return res.status(200).json({
        message: String(parsed.message).slice(0, 280),
        expression: validExpressions.includes(parsed.expression) ? parsed.expression : 'happy'
      })
    }

    // Fallback if JSON parsing fails — use the raw text
    return res.status(200).json({
      message: text.replace(/```json|```/g, '').trim().slice(0, 280) || "You're doing great today! Keep it up! ✨",
      expression: 'happy'
    })
  } catch (err) {
    console.error('[Arbie] Error:', err)
    return res.status(200).json({
      message: "Oops, my circuits got tangled — but YOU look amazing today! ✨",
      expression: 'laughing'
    })
  }
}
