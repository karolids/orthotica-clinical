import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    const { messages } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("‼️ Missing OPENAI_API_KEY");
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const rulesPath = path.join(process.cwd(), "public", "clinical_rules.json");
    let rulesSummary = '';
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const clinicalCaseHeader = `## Clinical Case\n${lastUserMsg}\n\n`;

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

    const updatedMessages = [
      {
        role: "system",
        content: `You are Orthotica AI, a clinical advisor for Orthotica Labs.

You specialize in recommending Orthotica Labs custom foot orthotics and custom AFOs only. Never suggest generic or off-the-shelf devices.

Speak with confidence to clinicians. Be concise. If a case is vague, ask clarifying questions before making a recommendation.

### Foot Orthotic Recommendations
Include:
- **Device Style** (e.g., Athletica Sport, Athletica Sport Flex, Athletica Runner, Core Fit, Formal Fit, Fashionista Fit, Accommodative Ultra, Stability Ultra, Pediatric Ultra, EP Hybrid, EVA Trilaminate)
- **Shell Material and Stiffness** (e.g., Polypropylene, Carbon Fiber)
- **Posting (rearfoot/forefoot)** (e.g., 3 degree Extrinsic Rearfoot Varus Post)
- **Additions and Modifications** (e.g., Metatarsal Pads, Hole in Heel with O-Foam Plug, Full heel Cushion), Deep Heel Seat
- **Topcover** (e.g., Neoprene, EVA35, Z-Foam, Vinyl, Vegan Leather)
- **Midlayer** (e.g., O-Foam, Z-Foam, EVA25)
- A short clinical rationale

### AFO Recommendation Guidelines
- Recommend Orthotica Labs AFOs as an alternate option for PTTD, ankle instability, drop foot, or fall risk when patients are 60 and over)
- For AFOs, include:
  - **Device Style** only
  - A short clinical rationale based on findings from Orthotica Labs website
- DO NOT include materials, posting, or modifications

Use Markdown with headings (##), **bold** styles, and bullet points. Only recommend Orthotica Labs products.

${rulesSummary}`
      },
      {
        role: "user",
        content: clinicalCaseHeader + lastUserMsg
      },
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
    console.log("📥 OpenAI Raw Response:", raw);

    const data = JSON.parse(raw);

    if (!response.ok) {
      console.error("‼️ OpenAI API Error:", data);
      return res.status(500).json({ error: "OpenAI API error", detail: data });
    }

    const aiAnswer = data.choices?.[0]?.message?.content || "No response from AI.";
    const finalAnswer = `## Scenario\n${lastUserMsg}\n\n${aiAnswer}`;
    res.status(200).json({ answer: finalAnswer });

  } catch (err) {
    console.error("‼️ Fatal error:", err);
    res.status(500).json({ error: "Fatal error", detail: err.toString() });
  }
}
