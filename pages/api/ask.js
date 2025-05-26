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
        content: "Patient has chronic heel pain from plantar fasciitis."
      },
      {
        role: "assistant",
        content: `## Clinical Scenario
Patient has plantar fasciitis and heel pain
      
##Orthotic Recommendation
**Device Style:** Athletica Sport Flex  
**Shell Material:** Ploypropylene – moderate flex  
**Posting:** 3° rearfoot varus post  
**Additions:** Deep heel seat (5/8"), Hole in Heel Seat with O-Foam plug, 1/8" O-Foam heel cushion  
**Topcover:** Full-length EVA35

**Clinical Rationale:** This setup helps offload the plantar fascia by stabilizing the heel in slight varus and increasing surface contact. The deep heel seat improves rearfoot control, and Poron/EVA materials reduce impact forces at heel strike.`
      },
      {
        role: "user",
        content: "Patient is 80 years old with recurrent falls and balance issues."
      },
      {
        role: "assistant",
        content: `## AFO Recommendation
**Device Style:** Moore Balance Brace

**Clinical Rationale:** Ideal for fall-risk patients over 65. This brace supports both medial and lateral ankle motion while enhancing proprioception. Its low-profile design fits easily into orthopedic shoes, encouraging compliance and stability in gait.` }
    ];

    const systemPrompt = {
      role: "system",
      content: `You are Orthotica AI, a clinical advisor working with foot specialists and orthotists.

Speak in a professional, conversational tone — like you're consulting with a trusted colleague. Be warm but concise.

---

## Orthotic Recommendations
Include:
- **Device Style** (Orthotica Labs only)
- **Shell Material and Stiffness**
- **Rearfoot and/or Forefoot Posting**
- **Additions or Modifications**
- **Topcover or Midlayer Material**
- **Clinical Rationale**: Explain how each element benefits the pathology. Be specific.

Device Styles include: Athletica Sport, Athletica Sport Flex, Athletica Runner, Core Fit, Fashionista Fit, Formal Fit, Accommodative Ultra, Pediatric Ultra, Stability Ultra, EP Hybrid, EVA Trilaminate

Materials include: Polypropylen Shell or Graphite Shell (flex/flexible/stiff), Top Cover Material (Vinyl, Vegan Leather, EVA35, Neoprene), Midlayer Material (O-Foam, Z-Foam, EVA25) 

---

## AFO Recommendations
Include:
- **Device Style** (e.g., Orthotica Brace, Articulated, Moore Balance Brace, SMOky, Dynamic Upright Independent or Unibody)
- **Clinical Rationale**: Explain clearly how the brace supports gait, stability, or ankle motion.

Mention appropriate footwear pairing if relevant for AFOs.

---

Use Markdown formatting with clear headings and bullet points.

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
    res.status(200).json({ answer: aiAnswer });
  } catch (err) {
    res.status(500).json({ error: "Internal server error", detail: err.toString() });
  }
}
