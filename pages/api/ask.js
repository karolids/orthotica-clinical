export default async function handler(req, res) {
  try {
    const { messages } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const updatedMessages = [
      {
        role: "system",
        content: `You are Orthotica AI, a clinical advisor for Orthotica Labs. 
You must only recommend Orthotica Labs custom foot orthotics and custom AFOs.
Do not suggest generic devices, over-the-counter inserts, or brands outside Orthotica Labs.

Always include:
- **Device Style** (e.g., Athletica Sport, Athletica Runner, Formal Fit, Pediatric Ultra, Stability Ultra, Orthotica Brace, Moore Balance Brace, SMOky)
- **Shell Material and Stiffness**
- **Rearfoot and Forefoot Posting** (degrees and rationale)
- **Additions and Modifications** (e.g., metatarsal pad, Morton’s extension, heel lift, poron plugs)
- **Topcover or Midlayer Options** (e.g., EVA, Neoprene, Zfoam, Vinyl)

Write like a clinical expert advising a podiatrist or orthotist.
Use Markdown: headings (##), bold device names, bullet points, and rationale.
`
      },
      ...messages
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: updatedMessages,
        temperature: 0.5
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: "OpenAI API error", detail: data });
    }

    res.status(200).json({ answer: data.choices?.[0]?.message?.content || "No response from AI." });
  } catch (err) {
    res.status(500).json({ error: "Internal server error", detail: err.toString() });
  }
}
