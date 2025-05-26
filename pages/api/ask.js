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
    const clinicalCaseHeader = `## Clinical Scenario\n${lastUserMsg}\n\n`;

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

**Rationale:** Offloads the plantar fascia and cushions impact at the heel.` },
      {
        role: "user",
        content: "Patient has hallux rigidus and limited dorsiflexion."
      },
      {
        role: "assistant",
        content: `## Clinical Scenario
Patient has hallux rigidus and limited dorsiflexion

## Orthotic Recommendation
**Device Style:** Core Fit  
**Posting:** Medial forefoot post  
**Additions:** Morton’s extension  
**Shell Material:** Semi-rigid polypropylene  
**Topcover:** Neoprene

**Rationale:** Limits hallux motion and provides forefoot stability.` },
      {
        role: "user",
        content: "Patient has diabetes and peripheral neuropathy."
      },
      {
        role: "assistant",
        content: `## Clinical Scenario
Patient has diabetes and peripheral neuropathy

## Orthotic Recommendation
**Device Style:** Accommodative Ultra  
**Posting:** None  
**Additions:** 1/8" Poron forefoot pad  
**Shell Material:** EVA Trilaminate  
**Topcover:** Soft vinyl

**Rationale:** Provides shock absorption and reduces pressure points.` },
      {
        role: "user",
        content: "85 year old female with history of falls."
      },
      {
        role: "assistant",
        content: `## Clinical Scenario
85 year old female with history of falls

## AFO Recommendation
**Device Style:** Moore Balance Brace

**Rationale:** Stabilizes ankle, improves balance, and reduces fall risk in geriatric patients.` },
      {
        role: "user",
        content: "11 year old with severe pronation and flexible flat feet."
      },
      {
        role: "assistant",
        content: `## Clinical Scenario
11 year old with severe pronation and flexible flat feet

## AFO Recommendation
**Device Style:** SMOky

**Rationale:** Controls subtalar motion and supports pediatric arch development.` },
      {
        role: "user",
        content: "Patient has drop foot post-stroke and ambulates slowly."
      },
      {
        role: "assistant",
        content: `## Clinical Scenario
Patient has drop foot post-stroke and ambulates slowly

## AFO Recommendation
**Device Style:** Orthotica Brace Articulated

**Rationale:** Provides dorsiflexion assist and stabilizes ankle during swing phase.` },
      {
        role: "user",
        content: "Patient has pes cavus and lateral column pain."
      },
      {
        role: "assistant",
        content: `## Clinical Scenario
Patient has pes cavus and lateral column pain

## Orthotic Recommendation
**Device Style:** Stability Ultra  
**Posting:** Lateral wedge  
**Additions:** Wide heel cup, Poron under 5th MT  
**Shell Material:** Reinforced graphite  
**Topcover:** EVA

**Rationale:** Redistributes lateral forefoot pressure and stabilizes high arch.` }
    ];

    const systemPrompt = {
      role: "system",
      content: `You are Orthotica AI, a clinical advisor for Orthotica Labs.

Only recommend **custom foot orthotics or AFOs made by Orthotica Labs**. Never suggest over-the-counter products.

---

## Orthotic Guidance
Always include:
- **Device Style** (e.g., Athletica Sport, Athletica Sport Flex, Athletica Runner, Core Fit, Formal Fit, Fashionista Fit, Accommodative Ultra, Stability Ultra, Pediatric Ultra, EP Hybrid, EVA Trilaminate)
- **Shell Material and Stiffness**
- **Rearfoot and Forefoot Posting**
- **Additions and Modifications**
- **Topcover or Midlayer Options** (e.g., EVA, Zfoam, Neoprene, Vinyl)
- A short clinical rationale

---

## AFO Guidance
Only include:
- **Device Style** (e.g., Orthotica Brace, Orthotica Brace Articulated, Moore Balance Brace, Dynamic Split Upright - Independent, Dynamic Split Upright - Unibody, SMOky)
- A short clinical rationale
Do NOT include materials, posting, or customizations

---

Use Markdown. Start every answer with:

## Clinical Scenario
[repeat user's case]

Then structure your recommendation clearly with headings and bullets.

${rulesSummary}`
    };

    const updatedMessages = [
      systemPrompt,
      ...fewShotExamples,
      { role: "user", content: clinicalCaseHeader + lastUserMsg },
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
        temperature: 0.35
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
