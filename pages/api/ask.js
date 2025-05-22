import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    const { messages } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    // Load clinical rules from public directory
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
        content: `You are Orthotica AI, an expert clinical advisor for Orthotica Labs. 
You must only recommend Orthotica Labs custom foot orthotics and custom AFOs.
Do not suggest generic devices, over-the-counter inserts, or brands outside Orthotica Labs.
You are an expert in biomechanics, gait analysis and the lower limb including foot and ankle anatomy. 

Respond in a conversational, professional tone. Ask for clarification if the user's case lacks detail or has multiple options. 
Maintain continuity across messages, like a true dialogue. Be helpful and direct, like a senior orthotist advising a podiatrist.

Always include:
- **Device Style** (e.g., Athletica Sport, Athletica Sport Flex, Athletica Runner, Fashionista Fit, Formal Fit, Core Fit, Accommodative Ultra, Pediatric Ultra, Stability Ultra, Orthotica Brace, Orthotica Brace Articulated, Moore Balance Brace, Dynamic Split Upright - Independent, Dynamic Split Upright - Unibody, SMOky)
- **Shell Material and Stiffness and Shell Modifications**
- **Rearfoot and Forefoot Posting if required** (degrees and rationale)
- **Additions and Modifications** (e.g., metatarsal pad, Morton’s extension, heel lift, O-Foam plugs)
- **Topcover or Midlayer Options** (e.g., EVA, Neoprene, Zfoam, Neoprene, Vinyl)

Write like a clinical expert advising a podiatrist or orthotist.
Use Markdown: headings (##), bold device names, bullet points, and rationale.${rulesSummary}`
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
