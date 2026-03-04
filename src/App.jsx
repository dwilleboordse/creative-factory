import { useState, useRef, useCallback } from "react";

// ═══════════════════════════════════════════
// THEME & CONSTANTS
// ═══════════════════════════════════════════

const T = {
  bg: "#08080a", surface: "#111114", surface2: "#19191d", surface3: "#222228",
  border: "#2a2a30", text: "#f0f0f2", textSoft: "#a0a0a8", textDim: "#606068",
  accent: "#e8ff47", accentBg: "rgba(232,255,71,0.06)",
  hook: "#3b82f6", awareness: "#8b5cf6", angle: "#f59e0b", cta: "#22c55e",
  offer: "#ec4899", proof: "#06b6d4", visual: "#f97316", format: "#a855f7",
  error: "#ef4444", success: "#22c55e",
};
const mono = "'JetBrains Mono','IBM Plex Mono',monospace";
const sans = "'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif";

const CATEGORIES = [
  { key: "hook", label: "Hook", color: T.hook },
  { key: "awareness", label: "Awareness", color: T.awareness },
  { key: "angle", label: "Angle", color: T.angle },
  { key: "cta", label: "CTA", color: T.cta },
  { key: "offer", label: "Offer", color: T.offer },
  { key: "proof", label: "Proof", color: T.proof },
  { key: "visual", label: "Visual", color: T.visual },
  { key: "format", label: "Format", color: T.format },
];

const ASSET_TYPES = [
  { key: "winningAd", label: "Winning Ad", required: true, multiple: false, desc: "The ad you want to iterate on" },
  { key: "logo", label: "Logo", required: false, multiple: false, desc: "Brand logo (PNG with transparency)" },
  { key: "productPhotos", label: "Product Photos", required: false, multiple: true, desc: "Product images to reference" },
  { key: "lifestyleImages", label: "Lifestyle Images", required: false, multiple: true, desc: "Brand/lifestyle imagery" },
  { key: "competitorAds", label: "Competitor Ads", required: false, multiple: true, desc: "Competitor ads for positioning" },
];

const DEFAULT_BRAND = {
  productName: "", productCategory: "", avatar: "", avatarTriedBefore: "", avatarStuckOn: "",
  desire1: "", desire2: "", desire3: "", objection1: "", objection2: "", objection3: "",
  mechanism: "", sophisticationStage: "3", proofPoints: "", pricePoint: "", offerStructure: "", brandVoice: "",
};

// ═══════════════════════════════════════════
// MARKETING PRINCIPLES (Claude System Prompt)
// ═══════════════════════════════════════════

const PRINCIPLES = `You are a world-class direct response creative strategist. $50M+ in managed ad spend. You understand Breakthrough Advertising principles deeply.

AWARENESS STAGES: Unaware→emotion/story. Problem-aware→agitate. Solution-aware→mechanism. Product-aware→proof+offer. Most-aware→offer/scarcity.
SOPHISTICATION: 1=claim. 2=enlarge. 3=new mechanism. 4=proof layers. 5=identification.
TECHNIQUES: Intensification, Identification, Gradualization, Redefinition, Mechanization, Concentration, Camouflage.

You analyze ads with surgical precision and generate variations rooted in these principles. Never generic. Always specific to the brand and avatar.`;

// ═══════════════════════════════════════════
// IMAGE UTILITIES
// ═══════════════════════════════════════════

function compressImage(file, maxSize = 800) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          const r = Math.min(maxSize / w, maxSize / h);
          w = Math.round(w * r); h = Math.round(h * r);
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
        resolve({ base64, mimeType: "image/jpeg", preview: canvas.toDataURL("image/jpeg", 0.4) });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function compressForGemini(file, maxSize = 800) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          const r = Math.min(maxSize / w, maxSize / h);
          w = Math.round(w * r); h = Math.round(h * r);
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve({ base64: canvas.toDataURL("image/jpeg", 0.8).split(",")[1], mimeType: "image/jpeg" });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ═══════════════════════════════════════════
// PROMPT BUILDERS
// ═══════════════════════════════════════════

function buildAnalyzePrompt(assets, brand) {
  const hasLogo = !!assets.logo;
  const productCount = assets.productPhotos?.length || 0;
  const lifestyleCount = assets.lifestyleImages?.length || 0;
  const competitorCount = assets.competitorAds?.length || 0;
  const hasBrand = brand && brand.productName;

  let brandBlock = "";
  if (hasBrand) {
    brandBlock = `
BRAND CONTEXT:
Product: ${brand.productName} (${brand.productCategory})
Avatar: ${brand.avatar}
Tried before: ${brand.avatarTriedBefore || "Unknown"}
Stuck on: ${brand.avatarStuckOn || "Unknown"}
Desires: ${[brand.desire1, brand.desire2, brand.desire3].filter(Boolean).join(" / ")}
Objections: ${[brand.objection1, brand.objection2, brand.objection3].filter(Boolean).join(" / ")}
Mechanism: ${brand.mechanism || "N/A"}
Sophistication stage: ${brand.sophisticationStage}/5
Proof: ${brand.proofPoints || "N/A"}
Price/Offer: ${brand.pricePoint || "N/A"} / ${brand.offerStructure || "N/A"}
Voice: ${brand.brandVoice || "Direct"}`;
  }

  return `You are given a WINNING AD image${competitorCount > 0 ? " and " + competitorCount + " COMPETITOR AD(S)" : ""}.

AVAILABLE REFERENCE ASSETS for image generation:
- Winning ad: YES (use as style/composition reference)
- Logo: ${hasLogo ? "YES — include in generated ads where appropriate" : "NO"}
- Product photos: ${productCount > 0 ? productCount + " provided — use the ACTUAL product in generated ads" : "NONE"}
- Lifestyle images: ${lifestyleCount > 0 ? lifestyleCount + " provided — use for mood/context reference" : "NONE"}
${brandBlock}

TASK: Two steps.

STEP 1 — ANALYSIS
Analyze the winning ad. Return a JSON object with:
- headline, subheadline, cta_text, badge_text, offer
- awareness_level, emotional_angle, breakthrough_technique, sophistication_stage
- primary_color, secondary_color, text_color, accent_color (hex codes)
- what_works (3-5 reasons), target_avatar, hook_mechanism
${competitorCount > 0 ? "- competitor_gaps: what competitors are missing that we can exploit" : ""}

STEP 2 — 30 VARIATION PROMPTS
Generate exactly 30 ad variations. Each variation is a COMPLETE IMAGE GENERATION PROMPT for Gemini (Google's image model).

Each prompt must describe a COMPLETE, STANDALONE static advertisement image. Be extremely specific about:
- Exact background (color, gradient, texture, scene)
- Product placement (size, position — reference "the product shown in reference images")
${hasLogo ? '- Logo placement (reference "the brand logo shown in reference images")' : ""}
- ALL text to render: headline (exact words), subheadline, CTA button text, badge/label text
- Typography style (bold, clean sans-serif, etc)
- Color palette (specific hex or descriptive colors)
- Composition and layout
- Mood and style (professional, bold, minimal, etc)
- Aspect ratio

CRITICAL PROMPT RULES:
- Each prompt must start with "Create a professional static advertisement image."
- Reference uploaded images: "Using the product from the reference images..." or "Include the brand logo from the reference images..."
- Specify ALL text content explicitly — Gemini needs exact words to render
- Describe composition precisely: "headline at top, product center-right, CTA button at bottom"
- Include aspect ratio in the prompt

CATEGORIES (distribute across):
- hook (5): Different scroll-stopping headlines. Vary visual treatments.
- awareness (4): One per awareness level. Unaware=emotional scene, no product. Problem-aware=product small, big text. Solution-aware=mechanism focus. Product-aware=proof stacked.
- angle (5): Different emotional triggers. Each must use a distinct Breakthrough technique.
- cta (3): Same composition concept, different CTAs and button treatments.
- offer (4): Price anchor, risk reversal, exclusivity, value stack. Use badges.
- proof (4): Social proof, numbers, testimonial, authority, transformation.
- visual (3): Dramatically different visual treatments — one dark/moody, one bright/bold, one minimal/clean.
- format (2): One square (1:1), one story (9:16).

Return ONLY valid JSON (no markdown fences):
{
  "analysis": { ...step 1 fields... },
  "variations": [
    {
      "category": "hook",
      "title": "3-5 word name",
      "gemini_prompt": "Create a professional static advertisement image. [FULL DETAILED PROMPT]...",
      "include_refs": ["winning_ad", "product", "logo"],
      "aspect_ratio": "4:5",
      "reasoning": "Principle applied + why (1 sentence)"
    }
  ]
}

For include_refs, use any combination of: "winning_ad", "product", "logo", "lifestyle"
- winning_ad: always include as style reference
- product: include when product should appear in the ad
- logo: include when logo should be visible
- lifestyle: include for mood/scene reference

CRITICAL: The gemini_prompt must be self-contained and incredibly detailed. Gemini has no context beyond the prompt and reference images. Describe EVERYTHING.`;
}

// ═══════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════

function Btn({ children, onClick, accent, small, outline, disabled, fullWidth, danger }) {
  const base = {
    fontFamily: mono, fontSize: small ? 10 : 11, fontWeight: 600,
    cursor: disabled ? "default" : "pointer", letterSpacing: "0.05em",
    textTransform: "uppercase", border: "none", transition: "all 0.15s",
    padding: small ? "6px 14px" : "12px 24px", opacity: disabled ? 0.4 : 1,
    width: fullWidth ? "100%" : "auto",
  };
  if (danger) return <button onClick={onClick} disabled={disabled} style={{ ...base, color: "#fff", background: T.error }}>{children}</button>;
  if (outline) return <button onClick={onClick} disabled={disabled} style={{ ...base, color: T.textSoft, background: "none", border: "1px solid " + T.border }}>{children}</button>;
  if (accent) return <button onClick={onClick} disabled={disabled} style={{ ...base, color: T.bg, background: T.accent }}>{children}</button>;
  return <button onClick={onClick} disabled={disabled} style={{ ...base, color: T.text, background: T.surface3 }}>{children}</button>;
}

function Input({ label, value, onChange, placeholder, textarea, small: sm }) {
  const s = { width: "100%", fontFamily: sans, fontSize: 13, color: T.text, background: T.surface2, border: "1px solid " + T.border, padding: sm ? "8px 10px" : "10px 14px", outline: "none" };
  return (<div style={{ marginBottom: 10 }}>
    <div style={{ fontFamily: mono, fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
    {textarea ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...s, resize: "vertical" }} />
      : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={s} />}
  </div>);
}

function Tag({ children, color }) {
  return <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 600, color, background: color + "12", padding: "2px 6px", border: "1px solid " + color + "25", textTransform: "uppercase" }}>{children}</span>;
}

function ProgressBar({ label, progress, sub }) {
  return (<div style={{ marginTop: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
      <span style={{ fontFamily: mono, fontSize: 10, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
      <span style={{ fontFamily: mono, fontSize: 10, color: T.textDim }}>{progress}%</span>
    </div>
    <div style={{ height: 4, background: T.surface3, overflow: "hidden" }}>
      <div style={{ height: "100%", background: T.accent, width: progress + "%", transition: "width 0.3s" }} />
    </div>
    {sub && <div style={{ fontFamily: mono, fontSize: 10, color: T.textDim, marginTop: 4 }}>{sub}</div>}
  </div>);
}

// ═══════════════════════════════════════════
// ASSET UPLOAD COMPONENT
// ═══════════════════════════════════════════

function AssetUpload({ assets, setAssets }) {
  const refs = useRef({});

  const handleFiles = async (key, files, multiple) => {
    const processed = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const compressed = await compressImage(file);
      processed.push({ ...compressed, name: file.name });
    }
    if (processed.length === 0) return;

    setAssets(prev => ({
      ...prev,
      [key]: multiple ? [...(prev[key] || []), ...processed] : processed[0],
    }));
  };

  const removeAsset = (key, index) => {
    setAssets(prev => {
      if (Array.isArray(prev[key])) {
        const next = [...prev[key]];
        next.splice(index, 1);
        return { ...prev, [key]: next };
      }
      return { ...prev, [key]: null };
    });
  };

  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 10, color: T.accent, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>Upload Assets</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {ASSET_TYPES.map(at => {
          const current = assets[at.key];
          const items = at.multiple ? (current || []) : (current ? [current] : []);
          const hasItems = items.length > 0;

          return (
            <div key={at.key} style={{ background: T.surface, border: "1px solid " + (hasItems ? T.accent + "30" : T.border), padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: hasItems ? T.accent : T.text, textTransform: "uppercase" }}>{at.label}</span>
                  {at.required && <span style={{ fontFamily: mono, fontSize: 8, color: T.error, marginLeft: 6 }}>REQ</span>}
                </div>
                {hasItems && <span style={{ fontFamily: mono, fontSize: 9, color: T.accent }}>{items.length}</span>}
              </div>
              <div style={{ fontSize: 11, color: T.textDim, marginBottom: 10, lineHeight: 1.4 }}>{at.desc}</div>

              {/* Thumbnails */}
              {hasItems && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {items.map((item, i) => (
                    <div key={i} style={{ position: "relative", width: 56, height: 56 }}>
                      <img src={item.preview || ("data:image/jpeg;base64," + item.base64)} alt="" style={{ width: 56, height: 56, objectFit: "cover", border: "1px solid " + T.border, display: "block" }} />
                      <button onClick={() => removeAsset(at.key, i)} style={{
                        position: "absolute", top: -4, right: -4, width: 16, height: 16,
                        background: T.error, color: "#fff", border: "none", fontSize: 9,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: mono, fontWeight: 700, lineHeight: 1,
                      }}>x</button>
                    </div>
                  ))}
                </div>
              )}

              <input ref={el => refs.current[at.key] = el} type="file" accept="image/*"
                multiple={at.multiple} style={{ display: "none" }}
                onChange={e => handleFiles(at.key, Array.from(e.target.files), at.multiple)} />
              <button onClick={() => refs.current[at.key]?.click()} style={{
                width: "100%", padding: "8px", background: T.surface2, border: "1px dashed " + T.border,
                color: T.textDim, fontFamily: mono, fontSize: 10, cursor: "pointer",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>{hasItems ? (at.multiple ? "+ Add More" : "Replace") : "+ Upload"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// BRAND FORM COMPONENT
// ═══════════════════════════════════════════

function BrandForm({ brand, setBrand }) {
  const u = (k) => (v) => setBrand(p => ({ ...p, [k]: v }));
  return (<div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      <Input label="Product Name" value={brand.productName} onChange={u("productName")} placeholder="e.g. GO 1000 MG" />
      <Input label="Category" value={brand.productCategory} onChange={u("productCategory")} placeholder="e.g. THC, Skincare" />
    </div>
    <div style={{ fontFamily: mono, fontSize: 9, color: T.accent, textTransform: "uppercase", marginTop: 12, marginBottom: 8, paddingTop: 12, borderTop: "1px solid " + T.border }}>Avatar</div>
    <Input label="Ideal customer" value={brand.avatar} onChange={u("avatar")} placeholder="Price-conscious THC buyer comparing brands" textarea />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      <Input label="Tried before" value={brand.avatarTriedBefore} onChange={u("avatarTriedBefore")} placeholder="Premium brands, dispensary" />
      <Input label="Where stuck" value={brand.avatarStuckOn} onChange={u("avatarStuckOn")} placeholder="Overpaying, can't compare" />
    </div>
    <div style={{ fontFamily: mono, fontSize: 9, color: T.accent, textTransform: "uppercase", marginTop: 12, marginBottom: 8, paddingTop: 12, borderTop: "1px solid " + T.border }}>Desires & Objections</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 10px" }}>
      <Input label="Desire 1" value={brand.desire1} onChange={u("desire1")} placeholder="Best value" small />
      <Input label="Desire 2" value={brand.desire2} onChange={u("desire2")} placeholder="Not overpaying" small />
      <Input label="Desire 3" value={brand.desire3} onChange={u("desire3")} placeholder="Trusted quality" small />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 10px" }}>
      <Input label="Objection 1" value={brand.objection1} onChange={u("objection1")} placeholder="All brands same" small />
      <Input label="Objection 2" value={brand.objection2} onChange={u("objection2")} placeholder="Don't trust reviews" small />
      <Input label="Objection 3" value={brand.objection3} onChange={u("objection3")} placeholder="Hemp ban worry" small />
    </div>
    <div style={{ fontFamily: mono, fontSize: 9, color: T.accent, textTransform: "uppercase", marginTop: 12, marginBottom: 8, paddingTop: 12, borderTop: "1px solid " + T.border }}>Product</div>
    <Input label="Unique Mechanism" value={brand.mechanism} onChange={u("mechanism")} placeholder="Lab-tested price-per-mg comparison" textarea />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 10px" }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: T.textDim, textTransform: "uppercase", marginBottom: 4 }}>Sophistication</div>
        <select value={brand.sophisticationStage} onChange={e => u("sophisticationStage")(e.target.value)}
          style={{ width: "100%", fontFamily: sans, fontSize: 13, color: T.text, background: T.surface2, border: "1px solid " + T.border, padding: "10px" }}>
          <option value="1">1 - First</option><option value="2">2 - Copying</option><option value="3">3 - Exhausted</option><option value="4">4 - Elaborated</option><option value="5">5 - Skeptical</option>
        </select>
      </div>
      <Input label="Price" value={brand.pricePoint} onChange={u("pricePoint")} placeholder="$12/serving" small />
      <Input label="Offer" value={brand.offerStructure} onChange={u("offerStructure")} placeholder="Free report" small />
    </div>
    <Input label="Proof Points" value={brand.proofPoints} onChange={u("proofPoints")} placeholder="8 brands tested, 12K downloads" textarea />
    <Input label="Brand Voice" value={brand.brandVoice} onChange={u("brandVoice")} placeholder="Direct, no-BS, data-driven" />
  </div>);
}

// ═══════════════════════════════════════════
// ANALYSIS DISPLAY
// ═══════════════════════════════════════════

function AnalysisPanel({ analysis }) {
  if (!analysis) return null;
  return (
    <div style={{ background: T.surface, border: "1px solid " + T.border, padding: 20 }}>
      <div style={{ fontFamily: mono, fontSize: 10, color: T.accent, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>Winning Elements</div>
      {analysis.headline && <div style={{ marginBottom: 8 }}><div style={{ fontFamily: mono, fontSize: 8, color: T.textDim, textTransform: "uppercase" }}>Headline</div><div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>{analysis.headline}</div></div>}
      {analysis.offer && <div style={{ marginBottom: 8 }}><div style={{ fontFamily: mono, fontSize: 8, color: T.textDim, textTransform: "uppercase" }}>Offer</div><div style={{ fontSize: 13, color: T.textSoft }}>{analysis.offer}</div></div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {analysis.awareness_level && <Tag color={T.awareness}>{analysis.awareness_level.replace(/_/g, " ")}</Tag>}
        {analysis.breakthrough_technique && <Tag color={T.hook}>{analysis.breakthrough_technique}</Tag>}
        {analysis.sophistication_stage && <Tag color={T.offer}>Stage {analysis.sophistication_stage}</Tag>}
      </div>
      {analysis.what_works?.length > 0 && (
        <div style={{ background: T.accentBg, border: "1px solid " + T.accent + "15", padding: 14, marginTop: 8 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: T.accent, textTransform: "uppercase", marginBottom: 6 }}>Why It Works</div>
          {analysis.what_works.map((w, i) => (
            <div key={i} style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.5, marginBottom: 3 }}>
              <span style={{ color: T.accent, marginRight: 8, fontFamily: mono, fontSize: 10 }}>{String(i + 1).padStart(2, "0")}</span>{w}
            </div>
          ))}
        </div>
      )}
      {analysis.competitor_gaps && (
        <div style={{ background: T.offer + "08", border: "1px solid " + T.offer + "15", padding: 14, marginTop: 8 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: T.offer, textTransform: "uppercase", marginBottom: 6 }}>Competitor Gaps</div>
          <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.5 }}>{Array.isArray(analysis.competitor_gaps) ? analysis.competitor_gaps.join(". ") : analysis.competitor_gaps}</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════

export default function App() {
  const [step, setStep] = useState("upload"); // upload|brand|analyzing|review|generating|gallery
  const [assets, setAssets] = useState({ winningAd: null, logo: null, productPhotos: [], lifestyleImages: [], competitorAds: [] });
  const [brand, setBrand] = useState({ ...DEFAULT_BRAND });
  const [useBrand, setUseBrand] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [variations, setVariations] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0, errors: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash-image");
  const abortRef = useRef(false);

  const canAnalyze = !!assets.winningAd;

  // ── Build Claude message content ──
  const buildClaudeContent = useCallback(() => {
    const content = [];

    // Winning ad (always)
    content.push({ type: "image", source: { type: "base64", media_type: assets.winningAd.mimeType, data: assets.winningAd.base64 } });
    content.push({ type: "text", text: "[WINNING AD — the ad above is the winning creative to iterate on]" });

    // Competitor ads (max 3 to keep payload manageable)
    const comps = (assets.competitorAds || []).slice(0, 3);
    if (comps.length > 0) {
      for (let i = 0; i < comps.length; i++) {
        content.push({ type: "image", source: { type: "base64", media_type: comps[i].mimeType, data: comps[i].base64 } });
        content.push({ type: "text", text: `[COMPETITOR AD ${i + 1}]` });
      }
    }

    // Analysis prompt
    content.push({ type: "text", text: buildAnalyzePrompt(assets, useBrand ? brand : null) });
    return content;
  }, [assets, brand, useBrand]);

  // ── Analyze with Claude ──
  const runAnalysis = async () => {
    setIsAnalyzing(true); setError(null); setStep("analyzing");
    try {
      const content = buildClaudeContent();
      const res = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 8000, system: PRINCIPLES,
          messages: [{ role: "user", content }],
        }),
      });

      // Handle non-JSON responses (Vercel error pages, etc)
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error("Server returned non-JSON response (status " + res.status + "): " + text.substring(0, 200));
      }

      const data = await res.json();

      // Handle API errors
      if (data.error) {
        const msg = typeof data.error === "string" ? data.error : (data.error.message || JSON.stringify(data.error));
        throw new Error(msg);
      }

      const text = (data.content?.[0]?.text || "").replace(/```json|```/g, "").trim();
      if (!text) throw new Error("Claude returned empty response. Try again.");

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (parseErr) {
        throw new Error("Claude response wasn't valid JSON. First 200 chars: " + text.substring(0, 200));
      }

      setAnalysis(parsed.analysis);
      setVariations(parsed.variations);
      setStep("review");
    } catch (e) {
      setError("Analysis failed: " + e.message);
      setStep("upload");
    }
    setIsAnalyzing(false);
  };

  // ── Build Gemini reference images for a variation ──
  const buildGeminiRefs = useCallback(async (includeRefs) => {
    const images = [];

    if (includeRefs.includes("winning_ad") && assets.winningAd) {
      const compressed = await compressForGemini(await fetch("data:image/jpeg;base64," + assets.winningAd.base64).then(r => r.blob()));
      images.push(compressed);
    }
    if (includeRefs.includes("product") && assets.productPhotos.length > 0) {
      for (const p of assets.productPhotos.slice(0, 3)) {
        const compressed = await compressForGemini(await fetch("data:image/jpeg;base64," + p.base64).then(r => r.blob()));
        images.push(compressed);
      }
    }
    if (includeRefs.includes("logo") && assets.logo) {
      const compressed = await compressForGemini(await fetch("data:image/jpeg;base64," + assets.logo.base64).then(r => r.blob()));
      images.push(compressed);
    }
    if (includeRefs.includes("lifestyle") && assets.lifestyleImages.length > 0) {
      const compressed = await compressForGemini(await fetch("data:image/jpeg;base64," + assets.lifestyleImages[0].base64).then(r => r.blob()));
      images.push(compressed);
    }

    return images;
  }, [assets]);

  // ── Generate all images with Gemini ──
  const runGeneration = async () => {
    if (!variations) return;
    setIsGenerating(true); setError(null); setStep("generating");
    abortRef.current = false;
    setGenProgress({ current: 0, total: variations.length, errors: 0 });
    setGeneratedImages([]);

    // Pre-compress reference images once
    const refCache = {};
    const compressRef = async (key, blob) => {
      if (refCache[key]) return refCache[key];
      const compressed = await compressForGemini(blob);
      refCache[key] = compressed;
      return compressed;
    };

    // Pre-build ref blobs
    const refBlobs = {};
    if (assets.winningAd) refBlobs.winning_ad = await fetch("data:image/jpeg;base64," + assets.winningAd.base64).then(r => r.blob());
    if (assets.logo) refBlobs.logo = await fetch("data:image/jpeg;base64," + assets.logo.base64).then(r => r.blob());
    if (assets.productPhotos.length > 0) refBlobs.product = await fetch("data:image/jpeg;base64," + assets.productPhotos[0].base64).then(r => r.blob());
    if (assets.lifestyleImages.length > 0) refBlobs.lifestyle = await fetch("data:image/jpeg;base64," + assets.lifestyleImages[0].base64).then(r => r.blob());

    let errors = 0;

    for (let i = 0; i < variations.length; i++) {
      if (abortRef.current) break;

      const v = variations[i];
      setGenProgress(p => ({ ...p, current: i + 1 }));

      try {
        // Build reference images for this variation
        const images = [];
        for (const ref of (v.include_refs || ["winning_ad"])) {
          if (refBlobs[ref]) {
            const compressed = await compressRef(ref, refBlobs[ref]);
            images.push(compressed);
          }
        }

        const res = await fetch("/api/generate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: v.gemini_prompt,
            images,
            aspectRatio: v.aspect_ratio || "4:5",
            model: geminiModel,
          }),
        });
        const data = await res.json();

        if (data.error) {
          console.error("Generation error for #" + (i + 1) + ":", data.error);
          errors++;
          setGenProgress(p => ({ ...p, errors }));
          setGeneratedImages(prev => [...prev, { ...v, index: i, error: data.error, image: null }]);
        } else {
          setGeneratedImages(prev => [...prev, { ...v, index: i, image: data.image, mimeType: data.mimeType, error: null }]);
        }
      } catch (e) {
        errors++;
        setGenProgress(p => ({ ...p, errors }));
        setGeneratedImages(prev => [...prev, { ...v, index: i, error: e.message, image: null }]);
      }

      // Small delay between requests to avoid rate limiting
      if (i < variations.length - 1) {
        await new Promise(r => setTimeout(r, 2500));
      }
    }

    setIsGenerating(false);
    setStep("gallery");
  };

  // ── Download image ──
  const downloadImage = (item, index) => {
    if (!item.image) return;
    const a = document.createElement("a");
    a.href = "data:" + (item.mimeType || "image/png") + ";base64," + item.image;
    a.download = "ad-" + String(index + 1).padStart(2, "0") + "-" + item.category + ".png";
    a.click();
  };

  const downloadAll = () => {
    const items = filtered.filter(it => it.image);
    items.forEach((item, i) => {
      setTimeout(() => downloadImage(item, item.index), i * 300);
    });
  };

  // ── Reset ──
  const reset = () => {
    abortRef.current = true;
    setStep("upload"); setAssets({ winningAd: null, logo: null, productPhotos: [], lifestyleImages: [], competitorAds: [] });
    setBrand({ ...DEFAULT_BRAND }); setUseBrand(false);
    setAnalysis(null); setVariations(null); setGeneratedImages([]); setError(null);
    setActiveFilter("all");
  };

  // ── Filter ──
  const filtered = activeFilter === "all" ? generatedImages : generatedImages.filter(g => g.category === activeFilter);
  const successCount = generatedImages.filter(g => g.image).length;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: sans }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{"@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}"}</style>

      {/* HEADER */}
      <div style={{ borderBottom: "1px solid " + T.border, padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 10, color: T.accent, textTransform: "uppercase", letterSpacing: "0.15em" }}>D-DOUBLEU MEDIA</div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Creative Variation Factory <span style={{ fontFamily: mono, fontSize: 11, color: T.textDim, fontWeight: 400 }}>v5.0</span></div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {(step === "gallery" || step === "generating") && successCount > 0 && (
            <Btn small accent onClick={downloadAll}>Download All ({successCount})</Btn>
          )}
          {step !== "upload" && <Btn small outline onClick={reset}>Start Over</Btn>}
        </div>
      </div>

      {/* ERROR BAR */}
      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", borderBottom: "1px solid rgba(239,68,68,0.2)", padding: "12px 28px", fontFamily: mono, fontSize: 12, color: T.error }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 16, fontFamily: mono, fontSize: 11, color: T.error, background: "none", border: "1px solid rgba(239,68,68,0.3)", padding: "2px 8px", cursor: "pointer" }}>dismiss</button>
        </div>
      )}

      <div style={{ padding: "28px", maxWidth: 1400, margin: "0 auto" }}>

        {/* ═══ STEP 1: UPLOAD ═══ */}
        {step === "upload" && (
          <div>
            <AssetUpload assets={assets} setAssets={setAssets} />
            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <Btn accent onClick={() => setStep("brand")} disabled={!canAnalyze}>Continue to Brand Context</Btn>
              <Btn outline onClick={() => { setUseBrand(false); runAnalysis(); }} disabled={!canAnalyze}>Skip Brand Context — Analyze Now</Btn>
            </div>
            {!canAnalyze && <div style={{ fontFamily: mono, fontSize: 10, color: T.textDim, marginTop: 8 }}>Upload at least the winning ad to continue.</div>}
          </div>
        )}

        {/* ═══ STEP 2: BRAND CONTEXT ═══ */}
        {step === "brand" && (
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div style={{ flex: "0 0 200px" }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: T.textDim, textTransform: "uppercase", marginBottom: 6 }}>Winning Ad</div>
              <img src={assets.winningAd.preview || ("data:image/jpeg;base64," + assets.winningAd.base64)} alt="" style={{ width: "100%", border: "1px solid " + T.border, display: "block" }} />
              <div style={{ fontFamily: mono, fontSize: 9, color: T.textDim, marginTop: 8 }}>
                {assets.productPhotos.length} product · {assets.lifestyleImages.length} lifestyle · {assets.competitorAds.length} competitor · {assets.logo ? "logo" : "no logo"}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 400 }}>
              <div style={{ fontFamily: mono, fontSize: 10, color: T.accent, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>Brand Context</div>
              <div style={{ fontSize: 14, color: T.textSoft, marginBottom: 16 }}>More context = more specific variations. Fill what you can.</div>
              <BrandForm brand={brand} setBrand={setBrand} />
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <Btn accent onClick={() => { setUseBrand(true); runAnalysis(); }} disabled={!brand.productName}>Analyze with Brand Context</Btn>
                <Btn outline onClick={() => { setUseBrand(false); runAnalysis(); }}>Skip — Analyze Without</Btn>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: ANALYZING ═══ */}
        {step === "analyzing" && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontFamily: mono, fontSize: 12, color: T.accent, textTransform: "uppercase", letterSpacing: "0.15em", animation: "pulse 1.5s infinite" }}>Analyzing winning ad + generating 30 variation specs...</div>
            <div style={{ fontFamily: mono, fontSize: 11, color: T.textDim, marginTop: 12 }}>Claude is studying your creative, brand context, and competitors.</div>
            <div style={{ fontFamily: mono, fontSize: 11, color: T.textDim, marginTop: 4 }}>This takes 15-30 seconds.</div>
          </div>
        )}

        {/* ═══ STEP 4: REVIEW ═══ */}
        {step === "review" && analysis && variations && (
          <div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
              <div style={{ flex: "0 0 200px" }}>
                <img src={assets.winningAd.preview || ("data:image/jpeg;base64," + assets.winningAd.base64)} alt="" style={{ width: "100%", border: "1px solid " + T.border, display: "block" }} />
              </div>
              <div style={{ flex: 1, minWidth: 300 }}>
                <AnalysisPanel analysis={analysis} />
              </div>
            </div>

            <div style={{ background: T.surface, border: "1px solid " + T.border, padding: 20, marginBottom: 20 }}>
              <div style={{ fontFamily: mono, fontSize: 10, color: T.accent, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>{variations.length} Variations Ready</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                {CATEGORIES.map(c => {
                  const n = variations.filter(v => v.category === c.key).length;
                  return n > 0 ? <Tag key={c.key} color={c.color}>{c.label} ({n})</Tag> : null;
                })}
              </div>

              {/* Model selector */}
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: T.textDim, textTransform: "uppercase" }}>Gemini Model:</div>
                <label style={{ fontFamily: mono, fontSize: 11, color: geminiModel === "gemini-2.5-flash-image" ? T.accent : T.textSoft, cursor: "pointer" }}>
                  <input type="radio" name="model" value="gemini-2.5-flash-image" checked={geminiModel === "gemini-2.5-flash-image"} onChange={e => setGeminiModel(e.target.value)} style={{ marginRight: 4 }} />
                  2.5 Flash ($0.039/img, free tier)
                </label>
                <label style={{ fontFamily: mono, fontSize: 11, color: geminiModel === "gemini-3.1-flash-image-preview" ? T.accent : T.textSoft, cursor: "pointer" }}>
                  <input type="radio" name="model" value="gemini-3.1-flash-image-preview" checked={geminiModel === "gemini-3.1-flash-image-preview"} onChange={e => setGeminiModel(e.target.value)} style={{ marginRight: 4 }} />
                  3.1 Flash ($0.067/img, better text)
                </label>
                <label style={{ fontFamily: mono, fontSize: 11, color: geminiModel === "gemini-3-pro-image-preview" ? T.accent : T.textSoft, cursor: "pointer" }}>
                  <input type="radio" name="model" value="gemini-3-pro-image-preview" checked={geminiModel === "gemini-3-pro-image-preview"} onChange={e => setGeminiModel(e.target.value)} style={{ marginRight: 4 }} />
                  3 Pro ($0.134/img, best quality)
                </label>
              </div>

              <div style={{ fontFamily: mono, fontSize: 10, color: T.textDim, marginBottom: 16 }}>
                Estimated cost: {variations.length} images x ${geminiModel === "gemini-3-pro-image-preview" ? "0.134" : geminiModel === "gemini-3.1-flash-image-preview" ? "0.067" : "0.039"} = <span style={{ color: T.accent }}>${(variations.length * (geminiModel === "gemini-3-pro-image-preview" ? 0.134 : geminiModel === "gemini-3.1-flash-image-preview" ? 0.067 : 0.039)).toFixed(2)}</span>
                {" "}+ Claude analysis ~$0.04
              </div>

              <Btn accent onClick={runGeneration}>Generate {variations.length} Ad Images with Gemini</Btn>
            </div>

            {/* Variation list preview */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
              {variations.map((v, i) => {
                const cat = CATEGORIES.find(c => c.key === v.category) || CATEGORIES[0];
                return (
                  <div key={i} style={{ background: T.surface, border: "1px solid " + T.border, padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                      <Tag color={cat.color}>{cat.label}</Tag>
                      <span style={{ fontFamily: mono, fontSize: 9, color: T.textDim }}>#{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>{v.title}</div>
                    <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.4 }}>{v.reasoning}</div>
                    <div style={{ fontFamily: mono, fontSize: 9, color: T.textDim, marginTop: 4 }}>{v.aspect_ratio} · refs: {(v.include_refs || []).join(", ")}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ STEP 5: GENERATING ═══ */}
        {(step === "generating" || step === "gallery") && (
          <div>
            {isGenerating && (
              <div style={{ marginBottom: 20 }}>
                <ProgressBar
                  label={`Generating ${genProgress.current}/${genProgress.total}`}
                  progress={Math.round((genProgress.current / genProgress.total) * 100)}
                  sub={genProgress.errors > 0 ? genProgress.errors + " errors" : "Images appear as they complete..."}
                />
                <div style={{ marginTop: 12 }}>
                  <Btn small danger onClick={() => { abortRef.current = true; }}>Stop Generation</Btn>
                </div>
              </div>
            )}

            {/* Filter bar */}
            {generatedImages.length > 0 && (
              <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => setActiveFilter("all")} style={{
                  fontFamily: mono, fontSize: 9, fontWeight: 600, cursor: "pointer",
                  letterSpacing: "0.05em", textTransform: "uppercase", padding: "6px 12px",
                  color: activeFilter === "all" ? T.accent : T.textDim,
                  background: activeFilter === "all" ? T.accent + "10" : "transparent",
                  border: "1px solid " + (activeFilter === "all" ? T.accent + "30" : T.border),
                }}>All ({generatedImages.length})</button>
                {CATEGORIES.map(c => {
                  const n = generatedImages.filter(g => g.category === c.key).length;
                  return n > 0 ? (
                    <button key={c.key} onClick={() => setActiveFilter(c.key)} style={{
                      fontFamily: mono, fontSize: 9, fontWeight: 600, cursor: "pointer",
                      letterSpacing: "0.05em", textTransform: "uppercase", padding: "6px 12px",
                      color: activeFilter === c.key ? c.color : T.textDim,
                      background: activeFilter === c.key ? c.color + "10" : "transparent",
                      border: "1px solid " + (activeFilter === c.key ? c.color + "30" : T.border),
                    }}>{c.label} ({n})</button>
                  ) : null;
                })}
              </div>
            )}

            {/* Image grid */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
              {filtered.map((item, fi) => {
                const cat = CATEGORIES.find(c => c.key === item.category) || CATEGORIES[0];
                return (
                  <div key={fi} style={{ width: 320, background: T.surface, border: "1px solid " + T.border }}>
                    {item.image ? (
                      <img src={"data:" + (item.mimeType || "image/png") + ";base64," + item.image}
                        alt={item.title} style={{ width: "100%", display: "block" }} />
                    ) : item.error ? (
                      <div style={{ width: "100%", height: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: T.error + "08" }}>
                        <div style={{ fontFamily: mono, fontSize: 11, color: T.error, textAlign: "center" }}>
                          Failed<br /><span style={{ fontSize: 9, color: T.textDim }}>{item.error.substring(0, 120)}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: "100%", height: 300, display: "flex", alignItems: "center", justifyContent: "center", background: T.surface2 }}>
                        <div style={{ fontFamily: mono, fontSize: 11, color: T.accent, animation: "pulse 1.5s infinite" }}>Generating...</div>
                      </div>
                    )}
                    <div style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                        <Tag color={cat.color}>{cat.label}</Tag>
                        <span style={{ fontFamily: mono, fontSize: 9, color: T.textDim }}>#{String(item.index + 1).padStart(2, "0")}</span>
                        <span style={{ fontFamily: mono, fontSize: 9, color: T.textDim }}>{item.aspect_ratio}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.4, marginBottom: 8 }}>{item.reasoning}</div>
                      {item.image && <Btn small outline onClick={() => downloadImage(item, item.index)}>Download PNG</Btn>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ padding: "20px 28px", borderTop: "1px solid " + T.border, fontFamily: mono, fontSize: 10, color: T.textDim, textAlign: "center", marginTop: 40 }}>
        D-DOUBLEU MEDIA — Creative Variation Factory v5.0 — Claude Analysis + Gemini Image Generation
      </div>
    </div>
  );
}
