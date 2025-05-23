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

You specialize in recommending Orthotica Labs custom foot orthotics and custom AFOs only. Never suggest generic or off-the-shelf devices.

Speak with confidence to clinicians. Be concise. If a case is vague, ask clarifying questions before making a recommendation.

### Foot Orthotic Recommendations
Include:
- **Device Style**
- **Shell Material and Stiffness**
- **Posting (rearfoot/forefoot)**
- **Additions and Modifications**
- **Topcover or Midlayer Options**
- A short clinical rationale

### AFO Recommendation Guidelines
- Only recommend Orthotica Labs AFOs for ankle instability, drop foot, or fall risk
- For AFOs, include:
  - **Device Style** only
  - A short clinical rationale
- DO NOT include materials, posting, or modifications

### AFO Trigger Rule
- For patients age 65+ with fall risk, weakness, or history of falls, recommend **Moore Balance Brace**
- Do not recommend foot orthotics unless AFO is clearly inappropriate

Use Markdown with headings (##), **bold** styles, and bullet points. Only recommend Orthotica Labs products.
\n${rulesSummary}`
      },
      {'role': 'user', 'content': 'Patient is 82 with peripheral neuropathy and balance issues, history of two falls.'},
      {'role': 'assistant', 'content': '## Recommended AFO\n\n- **Device Style:** Moore Balance Brace\n\n## Rationale\nThe Moore Balance Brace is appropriate for this patient due to advanced age, history of falls, and gait instability. It provides medial-lateral support and improved proprioception to help reduce future fall risk.'},
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
