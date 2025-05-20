export default async function handler(req, res) {
  try {
    const { prompt } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("Missing OPENAI_API_KEY in environment variables.");
      return res.status(500).json({ error: "API key missing." });
    }

    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: `You are Orthotica AI, a professional-grade clinical assistant trained by Orthotica Labs.
You specialize in recommending custom foot orthotic and custom AFO devices, styles, additions, and modifications.
Always address:
- Device style (e.g., Athletica Sport, Athletica Sport Flex, Athletica Runner, Formal Fit, Fashionista Fit, Accommodative Ultra, Stability Ultra, Pediatric Ultra, Orthotica Brace, AFO styles)
- Shell material and stiffness recommendations
- Posting (rearfoot, forefoot — angles and materials)
- Accommodations (e.g., poron plugs, cutouts, met pads)
- Topcover and padding materials (e.g., EVA, OFoam, Vinyl, Neoprene, Zfoam)
Always respond like a podiatry expert speaking to another clinician.
Structure your answers clearly, using headings, bullet points, and clinical terminology.
Only recommend custom orthotic and custom AFO styles that are produced by Orthotica Labs. 
Never guess. Be direct. Ask clarifying questions, if necessary. If multiple valid options exist, explain the pros and cons of each.
Respond in **Markdown** format. Always structure your answer with:
- Headings (use ##)
- Use **bold** for device names and material names
- Use bullet points for modifications
- Add short rationale for each recommendation
- Short paragraphs
Keep it focused: recommend specific *modifications*, not just general advice.
If the request is vague, ask the clinician for more information.
Use a confident, expert tone. You are speaking to a clinician, not a patient.` },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await completion.json();

    if (!completion.ok) {
      console.error("OpenAI API error:", data);
      return res.status(500).json({ error: "OpenAI API returned an error.", detail: data });
    }

    res.status(200).json({ answer: data.choices?.[0]?.message?.content || "No response from AI." });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error.", detail: err.toString() });
  }
}
