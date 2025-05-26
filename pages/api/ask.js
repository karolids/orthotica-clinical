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
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';

    let clinicalRules = {};
    try {
      const rulesData = fs.readFileSync(rulesPath, "utf-8");
      clinicalRules = JSON.parse(rulesData);
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
    } catch (e) {
      console.warn("⚠️ Skipping clinical rules — file not found or invalid.");
    }

    const assistantHistory = messages.filter(m => m.role !== 'user');

    const fewShotExamples = [
      {
        role: "user",
        content: "Patient has plantar fasciitis and heel pain."
      },
      {
        role: "assistant",
        content: `## Clinical Scenario
Patient has plantar fasciitis and heel pain

## Orthotic Recommendation
**Device Style:** Athletica Sport  
**Posting:** 3° rearfoot varus post  
**Additions:** Deep heel seat (5/8"), Poron plug, 1/8" EVA heel cushion  
**Shell Material:** Moderate flex graphite  
**Topcover:** Full-length EVA

**Why this works:** Supports the arch and cushions the heel to relieve fascia tension.`
      },
      {
        role: "user",
        content: "85 year old woman with frequent falls and shuffling gait."
      },
      {
        role: "assistant",
        content: `## Clinical Scenario
85 year old woman with frequent falls and shuffling gait

## AFO Recommendation
**Device Style:** Moore Balance Brace

**Why this works:** Enhances proprioception and ankle stability to reduce fall risk.`
      }
    ];

    const systemPrompt = {
      role: "system",
      content: `You are Orthotica AI, a clinical advisor for Orthotica Labs.

Speak to the user like a colleague—concise, confident, and supportive. Avoid repeating the clinical question unless it improves clarity.

Only recommend **custom foot orthotics or AFOs made by Orthotica Labs**. Never suggest over-the-counter products.

---

## Orthotic Guidance
Always include:
- **Device Style** (e.g., Athletica Sport, Core Fit, Fashionista Fit, Stability Ultra, Pediatric Ultra, etc.)
- **Shell Material and Stiffness**
- **Rearfoot and Forefoot Posting**
- **Additions and Modifications**
- **Topcover or Midlayer Options** (EVA, Zfoam, Neoprene, Vinyl)
- A brief rationale labeled **Why this works**

---

## AFO Guidance
Only include:
- **Device Style** (Orthotica Brace, Articulated, Moore Balance Brace, Dynamic Uprights, SMOky)
- A short rationale labeled **Why this works**
Do NOT include materials, posting, or trim details

---

Use Markdown. Use headings and bullet points for clarity.

${rulesSummary}`
    };

    const updatedMessages = [
      systemPrompt,
      ...fewShotExamples,
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
        temperature: 0.4
      })
    });

    const raw = await response.text();
    const data = JSON.parse(raw);

    if (!response.ok) {
      return res.status(500).json({ error: "OpenAI API error", detail: data });
    }

    const aiAnswer = data.choices?.[0]?.message?.content || "No response from AI.";
    res.status(200).json({ answer: aiAnswer });
  } catch (err) {
    res.status(500).json({ error: "Internal server error", detail: err.toString() });
  }
}
