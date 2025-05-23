import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    const { messages } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const rulesPath = path.join(process.cwd(), "public", "clinical_rules.json");
    let rulesSummary = '';
    try {
      const rulesData = fs.readFileSync(rulesPath, "utf-8");
      const clinicalRules = JSON.parse(rulesData);

      const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
      const matchedMods = [];

      for (const category of Object.keys(clinicalRules)) {
        for (const finding of Object.keys(clinicalRules[category])) {
          if (lastUserMsg.toLowerCase().includes(finding.toLowerCase())) {
            matchedMods.push(`**Finding:** ${finding} (Category: ${category})\n- ${clinicalRules[category][finding].join("\n- ")}`);
          }
        }
      }

      if (matchedMods.length) {
        rulesSummary = `\n\n## Modifications Based on Clinical Rules\n${matchedMods.join("\n\n")}`;
      }
    } catch (err) {
      console.warn("Could not load clinical rules:", err.message);
    }

    const updatedMessages = [
      {
        role: "system",
        content: `
You are Orthotica AI, a clinical advisor for Orthotica Labs.

You specialize in recommending Orthotica Labs custom foot orthotics and custom AFOs only. Never suggest generic or over-the-counter devices.

Speak to clinicians with confidence and professionalism. Be concise. If the user input is unclear, ask clarifying questions before making recommendations.

For foot orthotics, include:
- **Device Style**
- **Shell Material and Stiffness**
- **Posting (rearfoot/forefoot)**
- **Additions and Modifications**
- **Topcover or Midlayer Options**
- A short clinical rationale


## AFO Recommendation Guidelines
- Only recommend Orthotica Labs AFOs when the condition requires ankle control, drop foot support, or balance improvement.
- DO NOT include materials, posting, shell modifications, or cover layers for AFOs.
- For AFOs, only return:
  - **Device Style** (e.g., Orthotica Brace, Orthotica Brace Articulated, Moore Balance Brace, SMOky)
  - A short clinical rationale


Use Markdown with headings (##), bolded styles, and bullet points. Only recommend Orthotica Labs products.

${rulesSummary}`
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
