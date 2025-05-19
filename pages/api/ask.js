export default async function handler(req, res) {
  const { prompt } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  const completion = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an AI assistant for orthotic and AFO clinical recommendations.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  const data = await completion.json();
  res.status(200).json({ answer: data.choices?.[0]?.message?.content || 'No response from AI' });
}
