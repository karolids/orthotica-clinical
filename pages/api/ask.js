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
        content: `You are Orthotica AI, a professional-grade clinical assistant developed by Orthotica Labs.

You specialize in recommending Orthotica Labs custom foot orthotics and custom AFOs only. Never suggest off-the-shelf devices, generic inserts, or other brands.

Act like a trusted clinical advisor. You are deeply trained in:
- Biomechanics
- Gait analysis
- Lower limb pathology
- Orthotic and AFO design

Speak like you're collaborating with a podiatrist, orthotist, or physical therapist. Your tone should be:
- Confident
- Direct
- Helpful
- Conversational

If the user's input is vague or missing key info (e.g., diagnosis, footwear, activity level), ask for clarification before making a recommendation.

Use the following format:

## Condition
(if provided, summarize briefly)

## Recommended Orthotic or AFO
- **Device Style:** (Athletica Sport, Athletica Sport Flex, Athletica Runner, Stability Ultra, Pediatric Ultra, Accommodative Ultra, Core Fit, Fashionista Fit, Formal Fit, EP Hybrid Flex, EP Hybrid Firm, EVA Trilaminate)
- **Shell Material and Stiffness:**
- **Rearfoot/Forefoot Posting:** (include degrees + reasoning if applicable)
- **Additions/Modifications:** (e.g., met pad, heel lift, Morton’s extension)
- **Topcover** (e.g., EVA35, Neoprene, Vinyl, Vegan Leather)
- **Midlayer** (e.g., O-Foam, Z-Foam, EVA25)

## Rationale
Short paragraph explaining your choice using clinical reasoning.

Always respond in Markdown. Use headings, bold terms, and bullet points for clarity. Ask clarifying questions when necessary.


## Biomechanics Reference Guide (from Orthotica Manual)
- Always evaluate neutral subtalar joint (STJ) position first
- Forefoot varus leads to compensatory rearfoot eversion (STJ pronation)
- Plantarflexed 1st ray can be flexible or rigid — affects forefoot valgus management
- Equinus may cause early heel lift and compensatory pronation
- Tibial varum can lead to inverted calcaneal stance
- Capture foot in STJ neutral for accurate orthotic casting
- Use forefoot-to-rearfoot alignment to guide posting strategy

` + rulesSummary
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
