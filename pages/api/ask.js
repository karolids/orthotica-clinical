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
      summariesText = `**Plantar Fasciitis**
Inflammation of the plantar fascia causing heel pain, especially in the morning or after periods of rest.

**Neuroma**
A painful condition, often between the 3rd and 4th toes, caused by thickened nerve tissue (Morton’s neuroma).

**Achilles Tendinitis**
Overuse injury of the Achilles tendon leading to posterior heel pain and swelling.

**Hallux Rigidus**
Arthritic stiffening of the big toe joint (1st MTP), limiting dorsiflexion and causing pain during toe-off.

**Metatarsalgia**
Forefoot pain centered around the metatarsal heads, usually caused by overload or dropped metatarsal arch.

**Pes Cavus**
High-arched foot deformity that creates lateral column pain and instability during gait.

**Flat Feet**
Loss of medial arch leading to overpronation, fatigue, and possible progression to tendon dysfunction.

**Posterior Tibial Tendon Dysfunction**
Progressive collapse of the arch due to posterior tibial tendon weakness, often causing medial pain and flatfoot.

**Diabetic Neuropathy**
Loss of protective sensation in the foot due to diabetes, increasing risk of ulceration and injury.

**Limb Length Discrepancy**
One leg is shorter than the other, often causing pelvic tilt, gait asymmetry, or low back pain.

**Heel Spur**
Bony outgrowth at the calcaneus often associated with plantar fasciitis and heel pain.

**Hallux Valgus**
Deformity of the 1st MTP joint with lateral deviation of the big toe and a prominent medial bunion.

**Tarsal Tunnel Syndrome**
Compression of the tibial nerve in the tarsal tunnel causing burning, tingling, or numbness in the foot.

**Osteoarthritis Of The Ankle**
Degenerative joint disease of the ankle resulting in pain, stiffness, and reduced range of motion.

**Rheumatoid Arthritis**
Autoimmune disease causing joint deformities and inflammation, particularly in the forefoot and midfoot.

**Calcaneal Apophysitis**
Heel pain in growing children caused by irritation of the growth plate at the calcaneus (Sever’s Disease).

**Foot Drop**
Neurological condition resulting in inability to dorsiflex the foot, causing gait issues like toe dragging.

**Balance Issues In Elderly**
Common in geriatric patients with proprioceptive decline, muscle weakness, or fall risk.

**Posterior Tibial Tendon Rupture**
Advanced failure of the posterior tibial tendon, often requiring bracing to stabilize the medial column.

**Pediatric Pronation**
Flexible flatfoot in children, often benign but may require control if symptomatic.

**Charcot Foot**
Collapse of midfoot architecture in neuropathic patients, often diabetic, requiring total contact support.

**Ankle Instability**
Recurrent ankle sprains or giving-way sensation, usually due to ligament laxity.

**Charcot Foot (Advanced)**
End-stage collapse with rocker-bottom deformity; requires immobilization with a custom AFO.

**Rheumatoid Arthritis With Ankle Deformity**
Destruction of the ankle joint with joint instability and pain requiring bracing.

**Severe Flatfoot**
Stage II-III acquired flatfoot due to PTTD or ligament laxity, often requiring bracing.

**Ankle Arthritis With Instability**
Combination of degenerative joint disease and ligament laxity, increasing fall risk.

`;
    }

    const assistantHistory = messages.filter(m => m.role !== 'user');

    const systemPrompt = {
      role: "system",
      content: `You are Orthotica AI, a clinical advisor working with foot specialists and orthotists.

Speak in a professional, conversational tone — like you're consulting with a trusted colleague. Be warm but concise.

Use Markdown formatting with clear headings and bullet points.

You are also familiar with the following clinical conditions:

**Plantar Fasciitis**
Inflammation of the plantar fascia causing heel pain, especially in the morning or after periods of rest.

**Neuroma**
A painful condition, often between the 3rd and 4th toes, caused by thickened nerve tissue (Morton’s neuroma).

**Achilles Tendinitis**
Overuse injury of the Achilles tendon leading to posterior heel pain and swelling.

**Hallux Rigidus**
Arthritic stiffening of the big toe joint (1st MTP), limiting dorsiflexion and causing pain during toe-off.

**Metatarsalgia**
Forefoot pain centered around the metatarsal heads, usually caused by overload or dropped metatarsal arch.

**Pes Cavus**
High-arched foot deformity that creates lateral column pain and instability during gait.

**Flat Feet**
Loss of medial arch leading to overpronation, fatigue, and possible progression to tendon dysfunction.

**Posterior Tibial Tendon Dysfunction**
Progressive collapse of the arch due to posterior tibial tendon weakness, often causing medial pain and flatfoot.

**Diabetic Neuropathy**
Loss of protective sensation in the foot due to diabetes, increasing risk of ulceration and injury.

**Limb Length Discrepancy**
One leg is shorter than the other, often causing pelvic tilt, gait asymmetry, or low back pain.

**Heel Spur**
Bony outgrowth at the calcaneus often associated with plantar fasciitis and heel pain.

**Hallux Valgus**
Deformity of the 1st MTP joint with lateral deviation of the big toe and a prominent medial bunion.

**Tarsal Tunnel Syndrome**
Compression of the tibial nerve in the tarsal tunnel causing burning, tingling, or numbness in the foot.

**Osteoarthritis Of The Ankle**
Degenerative joint disease of the ankle resulting in pain, stiffness, and reduced range of motion.

**Rheumatoid Arthritis**
Autoimmune disease causing joint deformities and inflammation, particularly in the forefoot and midfoot.

**Calcaneal Apophysitis**
Heel pain in growing children caused by irritation of the growth plate at the calcaneus (Sever’s Disease).

**Foot Drop**
Neurological condition resulting in inability to dorsiflex the foot, causing gait issues like toe dragging.

**Balance Issues In Elderly**
Common in geriatric patients with proprioceptive decline, muscle weakness, or fall risk.

**Posterior Tibial Tendon Rupture**
Advanced failure of the posterior tibial tendon, often requiring bracing to stabilize the medial column.

**Pediatric Pronation**
Flexible flatfoot in children, often benign but may require control if symptomatic.

**Charcot Foot**
Collapse of midfoot architecture in neuropathic patients, often diabetic, requiring total contact support.

**Ankle Instability**
Recurrent ankle sprains or giving-way sensation, usually due to ligament laxity.

**Charcot Foot (Advanced)**
End-stage collapse with rocker-bottom deformity; requires immobilization with a custom AFO.

**Rheumatoid Arthritis With Ankle Deformity**
Destruction of the ankle joint with joint instability and pain requiring bracing.

**Severe Flatfoot**
Stage II-III acquired flatfoot due to PTTD or ligament laxity, often requiring bracing.

**Ankle Arthritis With Instability**
Combination of degenerative joint disease and ligament laxity, increasing fall risk.\n\n${rulesSummary}`
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
