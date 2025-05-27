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
    const summariesPath = path.join(process.cwd(), "public", "foot_conditions_summary.md");

    let rulesSummary = '';
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const matchedMods = [];
    let clinicalRules = {};

    try {
      const rulesData = fs.readFileSync(rulesPath, "utf-8");
      clinicalRules = JSON.parse(rulesData);
      for (const category of Object.keys(clinicalRules)) {
        for (const finding of Object.keys(clinicalRules[category])) {
          if (lastUserMsg.toLowerCase().includes(finding.toLowerCase())) {
            const modText = `**Finding:** ${finding} (Category: ${category})\n- ${clinicalRules[category][finding].join("\n- ")}`;
            matchedMods.push(modText);
          }
        }
      }
      if (matchedMods.length) {
        rulesSummary = `\n\n## Modifications Based on Clinical Rules\n${matchedMods.join("\n\n")}`;
      }
    } catch (e) {
      console.warn("⚠️ Skipping clinical rules — file not found or invalid.");
    }

    let summariesText = '';
    try {
      summariesText = fs.readFileSync(summariesPath, "utf-8");
    } catch (e) {
      summariesText = '';
    }

    const assistantHistory = messages.filter(m => m.role !== 'user');

    const systemPrompt = {
      role: "system",
      content: `
You are Orthotica AI, a clinical assistant for Orthotica Labs.

## RULES YOU MUST FOLLOW

1. Always recommend **named Orthotica Labs devices** only. Never use generic terms like "custom orthotic" or "AFO".
2. Choose only from these orthotic styles:
   - Athletica Sport
   - Athletica Sport Flex
   - Athletica Runner
   - Core Fit
   - Fashionista Fit
   - Formal Fit
   - Accommodative Ultra
   - Pediatric Ultra
   - Stability Ultra
   - EP Hybrid
   - EVA Trilaminate

3. Choose only from these AFO styles:
   - Orthotica Brace
   - Orthotica Brace Articulated
   - Moore Balance Brace
   - Dynamic Upright Independent
   - Dynamic Upright Unibody
   - SMOky
   - Custom CROW Walker AFO

4. Your response must include:
   - ## Clinical Scenario (restate user input)
   - ## Orthotic Recommendation (if relevant)
   - ## AFO Recommendation (if relevant)
   - ## Clinical Rationale
   - ## Modifications Based on Clinical Rules (if any match)

5. DO NOT include material descriptions unless directly related to shell, topcover, or cushion
6. DO NOT include footwear recommendations unless user mentions shoes or footgear
7. All responses must be in **Markdown** format with headings and bold device names.

Be precise, structured, and professional. You are speaking to a licensed clinician.
\n\n${summariesText}\n\n${rulesSummary}`
    };

    const updatedMessages = [
      systemPrompt,
      { role: "user", content: lastUserMsg },
      ...assistantHistory
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

    const raw = await response.text();
    const data = JSON.parse(raw);

    if (!response.ok) {
      return res.status(500).json({ error: "OpenAI API error", detail: data });
    }

    const aiAnswer = data.choices?.[0]?.message?.content || "No response from AI.";
    const finalAnswer = `## Clinical Scenario\n${lastUserMsg}\n\n${aiAnswer}`;
    res.status(200).json({ answer: finalAnswer });
  } catch (err) {
    res.status(500).json({ error: "Internal server error", detail: err.toString() });
  }
}
