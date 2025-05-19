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
          { role: 'system', content: 'You are an AI assistant for orthotic and AFO clinical recommendations.' },
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
