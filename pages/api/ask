export default async function handler(req, res) {
  try {
    const { prompt } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    // Validate environment variable
    if (!apiKey) {
      console.error("Missing OPENAI_API_KEY in environment variables.");
      return res.status(500).json({ error: "API key missing." });
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are an AI assistant that helps clinicians recommend orthotic and AFO devices, styles, additions, and modifications based on patient symptoms or diagnoses.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    // If OpenAI returns an error
    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return res.status(500).json({
        error: "OpenAI API error",
        detail: data,
      });
    }

    const message = data.choices?.[0]?.message?.content;

    res.status(200).json({ answer: message || "No response from AI." });
  } catch (err) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "Internal server error", detail: err.toString() });
  }
}
