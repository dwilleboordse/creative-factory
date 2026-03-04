import { useState, useRef, useCallback } from "react";

// ═══════════════════════════════════════════
// APPLE-INSPIRED DESIGN SYSTEM
// ═══════════════════════════════════════════

const C = {
  bg: "#000000",
  surface: "#0d0d0d",
  surface2: "#161616",
  surface3: "#1c1c1e",
  card: "#1c1c1e",
  cardHover: "#242426",
  border: "rgba(255,255,255,0.08)",
  borderLight: "rgba(255,255,255,0.12)",
  text: "#f5f5f7",
  textSecondary: "#86868b",
  textTertiary: "#48484a",
  accent: "#0a84ff",
  accentHover: "#409cff",
  green: "#30d158",
  red: "#ff453a",
  orange: "#ff9f0a",
  purple: "#bf5af2",
  teal: "#64d2ff",
  pink: "#ff375f",
  yellow: "#ffd60a",
};

const CAT_COLORS = {
  hook: C.accent, awareness: C.purple, angle: C.orange, cta: C.green,
  offer: C.pink, proof: C.teal, visual: C.yellow, format: "#a1a1a6",
};

const CATEGORIES = [
  { key: "hook", label: "Hook" }, { key: "awareness", label: "Awareness" },
  { key: "angle", label: "Angle" }, { key: "cta", label: "CTA" },
  { key: "offer", label: "Offer" }, { key: "proof", label: "Proof" },
  { key: "visual", label: "Visual" }, { key: "format", label: "Format" },
];

const SIZE_OPTIONS = [
  { key: "1080x1080", label: "1080 x 1080", sub: "Square", ratio: "1:1", w: 1080, h: 1080 },
  { key: "1080x1350", label: "1080 x 1350", sub: "Portrait 4:5", ratio: "4:5", w: 1080, h: 1350 },
  { key: "1080x1920", label: "1080 x 1920", sub: "Story 9:16", ratio: "9:16", w: 1080, h: 1920 },
];

const ASSET_TYPES = [
  { key: "winningAd", label: "Winning Ad", required: true, multiple: false, desc: "The ad to iterate on" },
  { key: "logo", label: "Logo", required: false, multiple: false, desc: "Brand logo" },
  { key: "productPhotos", label: "Product Photos", required: false, multiple: true, desc: "Product images" },
  { key: "lifestyleImages", label: "Lifestyle", required: false, multiple: true, desc: "Brand imagery" },
  { key: "competitorAds", label: "Competitors", required: false, multiple: true, desc: "Competitor ads" },
];

const DEFAULT_BRAND = {
  productName: "", productCategory: "", avatar: "", avatarTriedBefore: "", avatarStuckOn: "",
  desire1: "", desire2: "", desire3: "", objection1: "", objection2: "", objection3: "",
  mechanism: "", sophisticationStage: "3", proofPoints: "", pricePoint: "", offerStructure: "", brandVoice: "",
};

const MODELS = [
  { key: "gemini-2.5-flash-image", label: "Flash", price: 0.039, desc: "Fast, free tier" },
  { key: "gemini-3.1-flash-image-preview", label: "Flash Pro", price: 0.067, desc: "Better text" },
  { key: "gemini-3-pro-image-preview", label: "Pro", price: 0.134, desc: "Best quality" },
];

// ═══════════════════════════════════════════
// GLOBAL STYLES
// ═══════════════════════════════════════════

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: ${C.bg}; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
  ::selection { background: ${C.accent}40; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.textTertiary}; border-radius: 3px; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  .fade-in { animation: fadeIn 0.4s ease-out forwards; }
`;

// ═══════════════════════════════════════════
// MARKETING PRINCIPLES
// ═══════════════════════════════════════════

const PRINCIPLES = `You are a world-class direct response creative strategist. $50M+ in managed ad spend. Breakthrough Advertising principles deeply internalized.
AWARENESS: Unaware=emotion. Problem-aware=agitate. Solution-aware=mechanism. Product-aware=proof+offer. Most-aware=offer/scarcity.
SOPHISTICATION: 1=claim. 2=enlarge. 3=new mechanism. 4=proof. 5=identification.
TECHNIQUES: Intensification, Identification, Gradualization, Redefinition, Mechanization, Concentration, Camouflage.
Never generic. Always specific to brand and avatar.`;

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
        resolve({ base64: canvas.toDataURL("image/jpeg", 0.7).split(",")[1], mimeType: "image/jpeg", preview: canvas.toDataURL("image/jpeg", 0.4) });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function compressForGemini(blob, maxSize = 800) {
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
    reader.readAsDataURL(blob);
  });
}

// ═══════════════════════════════════════════
// PROMPT BUILDER
// ═══════════════════════════════════════════

function buildAnalyzePrompt(assets, brand, selectedSizes) {
  const hasLogo = !!assets.logo;
  const productCount = assets.productPhotos?.length || 0;
  const lifestyleCount = assets.lifestyleImages?.length || 0;
  const competitorCount = assets.competitorAds?.length || 0;
  const hasBrand = brand && brand.productName;

  const sizeSpecs = selectedSizes.map(s => {
    const opt = SIZE_OPTIONS.find(o => o.key === s);
    return opt ? `${opt.w}x${opt.h} (${opt.ratio})` : s;
  }).join(", ");

  let brandBlock = "";
  if (hasBrand) {
    brandBlock = `\nBRAND CONTEXT:\nProduct: ${brand.productName} (${brand.productCategory})\nAvatar: ${brand.avatar}\nTried: ${brand.avatarTriedBefore || "Unknown"}\nStuck: ${brand.avatarStuckOn || "Unknown"}\nDesires: ${[brand.desire1, brand.desire2, brand.desire3].filter(Boolean).join(" / ")}\nObjections: ${[brand.objection1, brand.objection2, brand.objection3].filter(Boolean).join(" / ")}\nMechanism: ${brand.mechanism || "N/A"}\nSophistication: ${brand.sophisticationStage}/5\nProof: ${brand.proofPoints || "N/A"}\nPrice/Offer: ${brand.pricePoint || "N/A"} / ${brand.offerStructure || "N/A"}\nVoice: ${brand.brandVoice || "Direct"}`;
  }

  const variationsPerSize = Math.max(2, Math.floor(30 / selectedSizes.length));
  const totalVariations = variationsPerSize * selectedSizes.length;

  return `You are given a WINNING AD image${competitorCount > 0 ? " and " + competitorCount + " COMPETITOR AD(S)" : ""}.

AVAILABLE ASSETS:
- Winning ad: YES (style reference)
- Logo: ${hasLogo ? "YES" : "NO"}
- Product photos: ${productCount > 0 ? productCount + " provided" : "NONE"}
- Lifestyle images: ${lifestyleCount > 0 ? lifestyleCount + " provided" : "NONE"}
${brandBlock}

OUTPUT SIZES REQUESTED: ${sizeSpecs}
Generate variations distributed EVENLY across all requested sizes.

TASK 1 — ANALYSIS (JSON):
headline, subheadline, cta_text, badge_text, offer, awareness_level, emotional_angle, breakthrough_technique, sophistication_stage, primary_color, secondary_color, text_color, accent_color, what_works (array), target_avatar, hook_mechanism${competitorCount > 0 ? ", competitor_gaps" : ""}

TASK 2 — ${totalVariations} VARIATION PROMPTS:
Each is a COMPLETE image generation prompt for Google Gemini.

Each prompt MUST:
- Start with "Create a professional static advertisement image."
- Specify exact pixel dimensions from the requested sizes
- Reference uploaded images: "Using the product from the reference images..."
${hasLogo ? '- Include logo: "Include the brand logo from the reference images..."' : ""}
- Specify ALL text content with exact words
- Describe full composition: background, product placement, text position, colors, typography
- Be completely self-contained (Gemini has no other context)

CATEGORIES (distribute evenly across sizes):
hook (5): Scroll-stopping headlines, varied visuals
awareness (4): One per awareness level
angle (5): Different emotional triggers, each using distinct Breakthrough technique
cta (3): Same concept, different CTAs
offer (4): Price anchor, risk reversal, exclusivity, value stack
proof (4): Social proof, numbers, authority, transformation
visual (3): Dark/moody, bright/bold, minimal/clean
format (2): Experimental layouts

Return ONLY valid JSON:
{
  "analysis": { ...fields... },
  "variations": [
    {
      "category": "hook",
      "title": "3-5 word name",
      "gemini_prompt": "Create a professional static advertisement image at 1080x1080 pixels. [FULL PROMPT]...",
      "include_refs": ["winning_ad", "product", "logo"],
      "size": "1080x1080",
      "reasoning": "Principle + why (1 sentence)"
    }
  ]
}

include_refs options: "winning_ad", "product", "logo", "lifestyle"`;
}

// ═══════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════

function Button({ children, onClick, variant = "secondary", size = "md", disabled, fullWidth }) {
  const variants = {
    primary: { background: C.accent, color: "#fff", border: "none" },
    secondary: { background: C.surface3, color: C.text, border: `1px solid ${C.border}` },
    ghost: { background: "transparent", color: C.textSecondary, border: "none" },
    danger: { background: C.red + "18", color: C.red, border: `1px solid ${C.red}30` },
  };
  const sizes = {
    sm: { padding: "6px 14px", fontSize: 12 },
    md: { padding: "10px 20px", fontSize: 14 },
    lg: { padding: "14px 28px", fontSize: 15 },
  };
  const v = variants[variant]; const s = sizes[size];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...s, fontFamily: "inherit", fontWeight: 500, borderRadius: 10,
      cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.35 : 1,
      transition: "all 0.2s ease", width: fullWidth ? "100%" : "auto",
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      background: v.background, color: v.color, border: v.border || "none",
      letterSpacing: "-0.01em",
    }}>{children}</button>
  );
}

function TextField({ label, value, onChange, placeholder, multiline, compact }) {
  const shared = {
    width: "100%", fontFamily: "inherit", fontSize: 14, color: C.text,
    background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: compact ? "8px 12px" : "12px 16px", outline: "none",
    transition: "border-color 0.2s ease",
  };
  return (
    <div style={{ marginBottom: compact ? 8 : 12 }}>
      {label && <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{label}</label>}
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...shared, resize: "vertical" }}
            onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.border} />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={shared}
            onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.border} />}
    </div>
  );
}

function Chip({ children, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 20,
      cursor: onClick ? "pointer" : "default", transition: "all 0.2s ease", fontFamily: "inherit",
      background: active ? (color || C.accent) + "18" : "transparent",
      color: active ? (color || C.accent) : C.textSecondary,
      border: `1px solid ${active ? (color || C.accent) + "40" : C.border}`,
    }}>{children}</button>
  );
}

function SizeSelector({ selected, onChange }) {
  const toggle = (key) => {
    if (selected.includes(key)) {
      if (selected.length > 1) onChange(selected.filter(s => s !== key));
    } else {
      onChange([...selected, key]);
    }
  };
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {SIZE_OPTIONS.map(s => {
        const active = selected.includes(s.key);
        const aspect = s.w / s.h;
        const previewH = 64;
        const previewW = Math.round(previewH * aspect);
        return (
          <button key={s.key} onClick={() => toggle(s.key)} style={{
            flex: 1, padding: "16px 12px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
            background: active ? C.accent + "10" : C.surface2, transition: "all 0.2s ease",
            border: `2px solid ${active ? C.accent : C.border}`,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: previewW, height: previewH, borderRadius: 6,
              background: active ? C.accent + "25" : C.surface3,
              border: `1.5px solid ${active ? C.accent + "60" : C.borderLight}`,
              transition: "all 0.2s ease",
            }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: active ? C.text : C.textSecondary }}>{s.label}</div>
              <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>{s.sub}</div>
            </div>
            {active && (
              <div style={{ width: 20, height: 20, borderRadius: 10, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ProgressRing({ progress, size = 48, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.surface3} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.accent} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.3s ease" }} />
    </svg>
  );
}

// ═══════════════════════════════════════════
// ASSET UPLOAD
// ═══════════════════════════════════════════

function AssetUpload({ assets, setAssets }) {
  const refs = useRef({});
  const handleFiles = async (key, files, multiple) => {
    const processed = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      processed.push({ ...(await compressImage(file)), name: file.name });
    }
    if (!processed.length) return;
    setAssets(prev => ({ ...prev, [key]: multiple ? [...(prev[key] || []), ...processed] : processed[0] }));
  };
  const remove = (key, index) => {
    setAssets(prev => {
      if (Array.isArray(prev[key])) { const n = [...prev[key]]; n.splice(index, 1); return { ...prev, [key]: n }; }
      return { ...prev, [key]: null };
    });
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
      {ASSET_TYPES.map(at => {
        const current = assets[at.key];
        const items = at.multiple ? (current || []) : (current ? [current] : []);
        const has = items.length > 0;
        return (
          <div key={at.key} style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${has ? C.accent + "30" : C.border}`, transition: "all 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: has ? C.text : C.textSecondary }}>{at.label}</span>
              {at.required && <span style={{ fontSize: 10, color: C.red, fontWeight: 500 }}>Required</span>}
            </div>
            <div style={{ fontSize: 12, color: C.textTertiary, marginBottom: 12 }}>{at.desc}</div>
            {has && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {items.map((item, i) => (
                  <div key={i} style={{ position: "relative", width: 48, height: 48, borderRadius: 8, overflow: "hidden" }}>
                    <img src={item.preview || ("data:image/jpeg;base64," + item.base64)} alt="" style={{ width: 48, height: 48, objectFit: "cover", display: "block" }} />
                    <button onClick={(e) => { e.stopPropagation(); remove(at.key, i); }} style={{
                      position: "absolute", top: -1, right: -1, width: 18, height: 18, borderRadius: 9,
                      background: C.red, color: "#fff", border: "2px solid " + C.card, fontSize: 10,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
                    }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <input ref={el => refs.current[at.key] = el} type="file" accept="image/*" multiple={at.multiple}
              style={{ display: "none" }} onChange={e => handleFiles(at.key, Array.from(e.target.files), at.multiple)} />
            <button onClick={() => refs.current[at.key]?.click()} style={{
              width: "100%", padding: 10, borderRadius: 10, background: C.surface2,
              border: `1px dashed ${C.borderLight}`, color: C.textSecondary,
              fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
            }}>{has ? (at.multiple ? "Add More" : "Replace") : "Upload"}</button>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// BRAND FORM
// ═══════════════════════════════════════════

function BrandForm({ brand, setBrand }) {
  const u = (k) => (v) => setBrand(p => ({ ...p, [k]: v }));
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <TextField label="Product Name" value={brand.productName} onChange={u("productName")} placeholder="GO 1000 MG" />
        <TextField label="Category" value={brand.productCategory} onChange={u("productCategory")} placeholder="THC, Skincare" />
      </div>
      <div style={{ height: 1, background: C.border, margin: "8px 0 16px" }} />
      <TextField label="Ideal Customer" value={brand.avatar} onChange={u("avatar")} placeholder="Price-conscious THC buyer" multiline />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <TextField label="Tried Before" value={brand.avatarTriedBefore} onChange={u("avatarTriedBefore")} placeholder="Premium brands" compact />
        <TextField label="Where Stuck" value={brand.avatarStuckOn} onChange={u("avatarStuckOn")} placeholder="Overpaying" compact />
      </div>
      <div style={{ height: 1, background: C.border, margin: "8px 0 16px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 8px" }}>
        <TextField label="Desire 1" value={brand.desire1} onChange={u("desire1")} placeholder="Best value" compact />
        <TextField label="Desire 2" value={brand.desire2} onChange={u("desire2")} placeholder="Not overpaying" compact />
        <TextField label="Desire 3" value={brand.desire3} onChange={u("desire3")} placeholder="Quality" compact />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 8px" }}>
        <TextField label="Objection 1" value={brand.objection1} onChange={u("objection1")} placeholder="All same" compact />
        <TextField label="Objection 2" value={brand.objection2} onChange={u("objection2")} placeholder="Don't trust" compact />
        <TextField label="Objection 3" value={brand.objection3} onChange={u("objection3")} placeholder="Ban worry" compact />
      </div>
      <div style={{ height: 1, background: C.border, margin: "8px 0 16px" }} />
      <TextField label="Unique Mechanism" value={brand.mechanism} onChange={u("mechanism")} placeholder="Lab-tested comparison across 8 brands" multiline />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 8px" }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>Sophistication</label>
          <select value={brand.sophisticationStage} onChange={e => u("sophisticationStage")(e.target.value)}
            style={{ width: "100%", fontFamily: "inherit", fontSize: 14, color: C.text, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px" }}>
            <option value="1">1 — First</option><option value="2">2 — Copying</option><option value="3">3 — Exhausted</option><option value="4">4 — Elaborated</option><option value="5">5 — Skeptical</option>
          </select>
        </div>
        <TextField label="Price" value={brand.pricePoint} onChange={u("pricePoint")} placeholder="$12" compact />
        <TextField label="Offer" value={brand.offerStructure} onChange={u("offerStructure")} placeholder="Free report" compact />
      </div>
      <TextField label="Proof Points" value={brand.proofPoints} onChange={u("proofPoints")} placeholder="8 brands tested, 12K downloads" multiline />
      <TextField label="Brand Voice" value={brand.brandVoice} onChange={u("brandVoice")} placeholder="Direct, no-BS" />
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN APPLICATION
// ═══════════════════════════════════════════

export default function App() {
  const [step, setStep] = useState("upload");
  const [assets, setAssets] = useState({ winningAd: null, logo: null, productPhotos: [], lifestyleImages: [], competitorAds: [] });
  const [brand, setBrand] = useState({ ...DEFAULT_BRAND });
  const [useBrand, setUseBrand] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState(["1080x1350"]);
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash-image");
  const [analysis, setAnalysis] = useState(null);
  const [variations, setVariations] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0, errors: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const abortRef = useRef(false);

  const canProceed = !!assets.winningAd;

  const buildClaudeContent = useCallback(() => {
    const content = [];
    content.push({ type: "image", source: { type: "base64", media_type: assets.winningAd.mimeType, data: assets.winningAd.base64 } });
    content.push({ type: "text", text: "[WINNING AD]" });
    const comps = (assets.competitorAds || []).slice(0, 3);
    for (let i = 0; i < comps.length; i++) {
      content.push({ type: "image", source: { type: "base64", media_type: comps[i].mimeType, data: comps[i].base64 } });
      content.push({ type: "text", text: `[COMPETITOR ${i + 1}]` });
    }
    content.push({ type: "text", text: buildAnalyzePrompt(assets, useBrand ? brand : null, selectedSizes) });
    return content;
  }, [assets, brand, useBrand, selectedSizes]);

  const runAnalysis = async () => {
    setIsAnalyzing(true); setError(null); setStep("analyzing");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 8000, system: PRINCIPLES, messages: [{ role: "user", content: buildClaudeContent() }] }),
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) { const t = await res.text(); throw new Error("Server error (" + res.status + "): " + t.substring(0, 200)); }
      const data = await res.json();
      if (data.error) throw new Error(typeof data.error === "string" ? data.error : (data.error.message || JSON.stringify(data.error)));
      const text = (data.content?.[0]?.text || "").replace(/```json|```/g, "").trim();
      if (!text) throw new Error("Empty response.");
      const parsed = JSON.parse(text);
      setAnalysis(parsed.analysis); setVariations(parsed.variations); setStep("review");
    } catch (e) { setError(e.message); setStep("upload"); }
    setIsAnalyzing(false);
  };

  const runGeneration = async () => {
    if (!variations) return;
    setIsGenerating(true); setError(null); setStep("generating");
    abortRef.current = false;
    setGenProgress({ current: 0, total: variations.length, errors: 0 }); setGeneratedImages([]);

    const refCache = {};
    const getRef = async (key) => {
      if (refCache[key]) return refCache[key];
      let b64;
      if (key === "winning_ad" && assets.winningAd) b64 = assets.winningAd.base64;
      else if (key === "logo" && assets.logo) b64 = assets.logo.base64;
      else if (key === "product" && assets.productPhotos[0]) b64 = assets.productPhotos[0].base64;
      else if (key === "lifestyle" && assets.lifestyleImages[0]) b64 = assets.lifestyleImages[0].base64;
      if (!b64) return null;
      const blob = await fetch("data:image/jpeg;base64," + b64).then(r => r.blob());
      const c = await compressForGemini(blob);
      refCache[key] = c; return c;
    };

    let errors = 0;
    for (let i = 0; i < variations.length; i++) {
      if (abortRef.current) break;
      const v = variations[i];
      setGenProgress(p => ({ ...p, current: i + 1 }));
      try {
        const images = [];
        for (const ref of (v.include_refs || ["winning_ad"])) { const img = await getRef(ref); if (img) images.push(img); }
        const res = await fetch("/api/generate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: v.gemini_prompt, images, model: geminiModel }),
        });
        const data = await res.json();
        if (data.error) { errors++; setGenProgress(p => ({ ...p, errors })); setGeneratedImages(prev => [...prev, { ...v, index: i, error: typeof data.error === "string" ? data.error : data.error.message, image: null }]); }
        else { setGeneratedImages(prev => [...prev, { ...v, index: i, image: data.image, mimeType: data.mimeType, error: null }]); }
      } catch (e) { errors++; setGenProgress(p => ({ ...p, errors })); setGeneratedImages(prev => [...prev, { ...v, index: i, error: e.message, image: null }]); }
      if (i < variations.length - 1) await new Promise(r => setTimeout(r, 2500));
    }
    setIsGenerating(false); setStep("gallery");
  };

  const downloadImage = (item) => {
    if (!item.image) return;
    const a = document.createElement("a"); a.href = "data:" + (item.mimeType || "image/png") + ";base64," + item.image;
    a.download = "ad-" + String(item.index + 1).padStart(2, "0") + "-" + item.category + "-" + (item.size || "var") + ".png"; a.click();
  };
  const downloadAll = () => { filtered.filter(it => it.image).forEach((item, i) => setTimeout(() => downloadImage(item), i * 300)); };
  const reset = () => {
    abortRef.current = true; setStep("upload");
    setAssets({ winningAd: null, logo: null, productPhotos: [], lifestyleImages: [], competitorAds: [] });
    setBrand({ ...DEFAULT_BRAND }); setUseBrand(false);
    setAnalysis(null); setVariations(null); setGeneratedImages([]); setError(null); setActiveFilter("all");
  };

  const filtered = activeFilter === "all" ? generatedImages : generatedImages.filter(g => g.category === activeFilter);
  const successCount = generatedImages.filter(g => g.image).length;
  const modelInfo = MODELS.find(m => m.key === geminiModel) || MODELS[0];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
      <style>{globalCSS}</style>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(20px) saturate(180%)", borderBottom: `1px solid ${C.border}`, padding: "0 28px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em" }}>Creative Factory</span>
            <span style={{ fontSize: 12, color: C.textTertiary }}>v5</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(step === "gallery" || step === "generating") && successCount > 0 && <Button variant="primary" size="sm" onClick={downloadAll}>Download All ({successCount})</Button>}
            {step !== "upload" && <Button variant="ghost" size="sm" onClick={reset}>Reset</Button>}
          </div>
        </div>
      </nav>

      {/* ERROR */}
      {error && (
        <div style={{ background: C.red + "10", borderBottom: `1px solid ${C.red}25`, padding: "12px 28px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: C.red }}>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>Dismiss</Button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 28px" }}>

        {/* UPLOAD */}
        {step === "upload" && (
          <div className="fade-in">
            <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 4 }}>Upload your assets</h2>
            <p style={{ fontSize: 15, color: C.textSecondary, marginBottom: 24 }}>Start with a winning ad. Add brand assets for better variations.</p>
            <AssetUpload assets={assets} setAssets={setAssets} />
            <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", marginTop: 36, marginBottom: 4 }}>Output sizes</h2>
            <p style={{ fontSize: 15, color: C.textSecondary, marginBottom: 16 }}>Select one or more. Variations distribute evenly across sizes.</p>
            <SizeSelector selected={selectedSizes} onChange={setSelectedSizes} />
            <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
              <Button variant="primary" size="lg" onClick={() => setStep("brand")} disabled={!canProceed}>Continue</Button>
              <Button variant="secondary" size="lg" onClick={() => { setUseBrand(false); runAnalysis(); }} disabled={!canProceed}>Skip to Analysis</Button>
            </div>
            {!canProceed && <p style={{ fontSize: 13, color: C.textTertiary, marginTop: 8 }}>Upload a winning ad to continue.</p>}
          </div>
        )}

        {/* BRAND */}
        {step === "brand" && (
          <div className="fade-in" style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            <div style={{ flex: "0 0 180px" }}>
              <img src={assets.winningAd.preview || ("data:image/jpeg;base64," + assets.winningAd.base64)} alt="" style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.border}` }} />
              <p style={{ fontSize: 11, color: C.textTertiary, marginTop: 8, textAlign: "center" }}>
                {assets.productPhotos.length} product · {assets.competitorAds.length} competitor · {selectedSizes.length} size{selectedSizes.length > 1 ? "s" : ""}
              </p>
            </div>
            <div style={{ flex: 1, minWidth: 360 }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 4 }}>Brand context</h2>
              <p style={{ fontSize: 15, color: C.textSecondary, marginBottom: 20 }}>More context = more specific variations.</p>
              <BrandForm brand={brand} setBrand={setBrand} />
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <Button variant="primary" size="lg" onClick={() => { setUseBrand(true); runAnalysis(); }} disabled={!brand.productName}>Analyze</Button>
                <Button variant="secondary" size="lg" onClick={() => { setUseBrand(false); runAnalysis(); }}>Skip</Button>
              </div>
            </div>
          </div>
        )}

        {/* ANALYZING */}
        {step === "analyzing" && (
          <div className="fade-in" style={{ textAlign: "center", padding: "100px 20px" }}>
            <div style={{ marginBottom: 24 }}><ProgressRing progress={45} size={64} /></div>
            <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.03em", marginBottom: 8 }}>Analyzing creative</h2>
            <p style={{ fontSize: 15, color: C.textSecondary, animation: "pulse 2s infinite" }}>Studying your ad, brand context, and competitors.</p>
            <p style={{ fontSize: 13, color: C.textTertiary, marginTop: 8 }}>15–30 seconds</p>
          </div>
        )}

        {/* REVIEW */}
        {step === "review" && analysis && variations && (
          <div className="fade-in">
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 32 }}>
              <div style={{ flex: "0 0 200px" }}>
                <img src={assets.winningAd.preview || ("data:image/jpeg;base64," + assets.winningAd.base64)} alt="" style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.border}` }} />
              </div>
              <div style={{ flex: 1, minWidth: 300 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 16 }}>Analysis</h2>
                <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}` }}>
                  {analysis.headline && <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 500 }}>HEADLINE</div><div style={{ fontSize: 16, fontWeight: 600 }}>{analysis.headline}</div></div>}
                  {analysis.offer && <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 500 }}>OFFER</div><div style={{ fontSize: 14, color: C.textSecondary }}>{analysis.offer}</div></div>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {analysis.awareness_level && <Chip active color={C.purple}>{analysis.awareness_level.replace(/_/g, " ")}</Chip>}
                    {analysis.breakthrough_technique && <Chip active color={C.accent}>{analysis.breakthrough_technique}</Chip>}
                    {analysis.sophistication_stage && <Chip active color={C.orange}>Stage {analysis.sophistication_stage}</Chip>}
                  </div>
                  {analysis.what_works?.length > 0 && (
                    <div style={{ background: C.surface2, borderRadius: 12, padding: 14, marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 500, marginBottom: 8 }}>WHY IT WORKS</div>
                      {analysis.what_works.map((w, i) => (
                        <div key={i} style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 4, paddingLeft: 20, position: "relative" }}>
                          <span style={{ position: "absolute", left: 0, color: C.accent, fontSize: 12, fontWeight: 600 }}>{i + 1}</span>{w}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Generation controls */}
            <div style={{ background: C.card, borderRadius: 20, padding: 28, border: `1px solid ${C.border}`, marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20, marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 }}>{variations.length} variations ready</h3>
                  <p style={{ fontSize: 14, color: C.textSecondary }}>Sizes: {selectedSizes.map(s => SIZE_OPTIONS.find(o => o.key === s)?.label).join(", ")}</p>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {CATEGORIES.map(c => {
                    const n = variations.filter(v => v.category === c.key).length;
                    return n > 0 ? <Chip key={c.key} active color={CAT_COLORS[c.key]}>{c.label} {n}</Chip> : null;
                  })}
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.textTertiary, fontWeight: 500, marginBottom: 10 }}>GEMINI MODEL</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {MODELS.map(m => (
                  <button key={m.key} onClick={() => setGeminiModel(m.key)} style={{
                    flex: 1, padding: "12px 14px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                    background: geminiModel === m.key ? C.accent + "10" : C.surface2,
                    border: `1.5px solid ${geminiModel === m.key ? C.accent : C.border}`, transition: "all 0.2s ease",
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: geminiModel === m.key ? C.text : C.textSecondary }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>${m.price}/img · {m.desc}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <p style={{ fontSize: 14, color: C.textSecondary }}>Estimated: <span style={{ color: C.text, fontWeight: 600 }}>${(variations.length * modelInfo.price).toFixed(2)}</span></p>
                <Button variant="primary" size="lg" onClick={runGeneration}>Generate {variations.length} Images</Button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
              {variations.map((v, i) => (
                <div key={i} style={{ background: C.card, borderRadius: 12, padding: "12px 16px", border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                    <Chip active color={CAT_COLORS[v.category]}>{v.category}</Chip>
                    <span style={{ fontSize: 11, color: C.textTertiary }}>{v.size || "—"}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{v.title}</div>
                  <div style={{ fontSize: 12, color: C.textTertiary, lineHeight: 1.4 }}>{v.reasoning}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GENERATING / GALLERY */}
        {(step === "generating" || step === "gallery") && (
          <div className="fade-in">
            {isGenerating && (
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, padding: "20px 24px", background: C.card, borderRadius: 16, border: `1px solid ${C.border}` }}>
                <ProgressRing progress={Math.round((genProgress.current / genProgress.total) * 100)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>Generating {genProgress.current} of {genProgress.total}</div>
                  <div style={{ fontSize: 13, color: C.textSecondary }}>{genProgress.errors > 0 ? genProgress.errors + " failed · " : ""}Images appear as they complete</div>
                </div>
                <Button variant="danger" size="sm" onClick={() => { abortRef.current = true; }}>Stop</Button>
              </div>
            )}
            {!isGenerating && step === "gallery" && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 4 }}>{successCount} images generated</h2>
                <p style={{ fontSize: 15, color: C.textSecondary }}>Click any image to download.</p>
              </div>
            )}
            {generatedImages.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
                <Chip active={activeFilter === "all"} onClick={() => setActiveFilter("all")}>All {generatedImages.length}</Chip>
                {CATEGORIES.map(c => {
                  const n = generatedImages.filter(g => g.category === c.key).length;
                  return n > 0 ? <Chip key={c.key} active={activeFilter === c.key} onClick={() => setActiveFilter(c.key)} color={CAT_COLORS[c.key]}>{c.label} {n}</Chip> : null;
                })}
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
              {filtered.map((item, fi) => (
                <div key={fi} onClick={() => item.image && downloadImage(item)} style={{
                  width: 300, borderRadius: 16, overflow: "hidden", background: C.card, border: `1px solid ${C.border}`,
                  cursor: item.image ? "pointer" : "default", transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                  onMouseEnter={e => { if (item.image) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.4)"; }}}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  {item.image ? (
                    <img src={"data:" + (item.mimeType || "image/png") + ";base64," + item.image} alt={item.title} style={{ width: "100%", display: "block" }} />
                  ) : item.error ? (
                    <div style={{ width: "100%", height: 260, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: C.red + "06" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 13, color: C.red, fontWeight: 500, marginBottom: 4 }}>Failed</div>
                        <div style={{ fontSize: 11, color: C.textTertiary }}>{item.error.substring(0, 100)}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: "100%", height: 260, display: "flex", alignItems: "center", justifyContent: "center", background: C.surface2 }}>
                      <div style={{ fontSize: 13, color: C.accent, animation: "pulse 1.5s infinite" }}>Generating...</div>
                    </div>
                  )}
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                      <Chip active color={CAT_COLORS[item.category]}>{item.category}</Chip>
                      <span style={{ fontSize: 11, color: C.textTertiary }}>{item.size || ""}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: C.textTertiary, lineHeight: 1.4 }}>{item.reasoning}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer style={{ padding: "24px 28px 32px", textAlign: "center", marginTop: 40 }}>
        <p style={{ fontSize: 12, color: C.textTertiary }}>Creative Factory · Claude + Gemini</p>
      </footer>
    </div>
  );
}
