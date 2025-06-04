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
    let deviceType = '';

    try {
      const rulesData = fs.readFileSync(rulesPath, "utf-8");
      clinicalRules = JSON.parse(rulesData);
      for (const category of Object.keys(clinicalRules)) {
        for (const finding of Object.keys(clinicalRules[category])) {
          if (lastUserMsg.toLowerCase().includes(finding.toLowerCase())) {
            const modText = `**Finding:** ${finding} (Category: ${category})\n- ${clinicalRules[category][finding].join("\n- ")}`;
            matchedMods.push(modText);
            if (category === "AFO_Indications") {
              deviceType = "AFO";
            }
          }
        }
      }
      if (matchedMods.length && deviceType !== "AFO") {
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
      content: \`You are Orthotica AI, a clinical assistant for Orthotica Labs.

You ONLY recommend one device: either an Orthotica Labs custom orthotic OR a custom AFO — never both.

Use only these orthotic styles:
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

Use only these AFO styles:
- Orthotica Brace
- Orthotica Brace Articulated
- Moore Balance Brace
- Dynamic Upright Independent
- Dynamic Upright Unibody
- SMOky
- Custom CROW Walker AFO

Use this structure:
## Clinical Scenario
Summarize the patient's condition clearly.

## Orthotic Recommendation (only if deviceType is Orthotic)
**Device Style:** [Orthotica orthotic name]  
**Posting:** [e.g., 4° Rearfoot Varus Post]  
**Shell Modifications:** [e.g., flange, skive]  
**Covers:** [e.g., Neoprene Topcover]  
**Padding/Accommodation:** [e.g., O-Foam Heel Cushion]

## AFO Recommendation (only if deviceType is AFO)
**Device Style:** [Orthotica AFO name]

## Clinical Rationale
Explain clearly and briefly why the selected device is appropriate.

DO NOT return both an orthotic and an AFO.
DO NOT include footwear unless the user mentions shoes.

\${summariesText}\${rulesSummary}\`
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
        "Authorization": \`Bearer \${apiKey}\`
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
    res.status(200).json({ answer: aiAnswer });
  } catch (err) {
    res.status(500).json({ error: "Internal server error", detail: err.toString() });
  }
}
