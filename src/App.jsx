import { useState, useRef, useCallback } from "react";

// ═══════════════════════════════════════════
// DESIGN
// ═══════════════════════════════════════════
const C = {
  bg:"#000",surface:"#0d0d0d",surface2:"#161616",surface3:"#1c1c1e",card:"#1c1c1e",
  border:"rgba(255,255,255,0.08)",borderLight:"rgba(255,255,255,0.12)",
  text:"#f5f5f7",textSec:"#86868b",textDim:"#48484a",
  accent:"#0a84ff",green:"#30d158",red:"#ff453a",orange:"#ff9f0a",
  purple:"#bf5af2",teal:"#64d2ff",yellow:"#ffd60a",pink:"#ff375f",
};

const css = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',sans-serif;-webkit-font-smoothing:antialiased}
::selection{background:${C.accent}40}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.textDim};border-radius:3px}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes spin{to{transform:rotate(360deg)}}
.fi{animation:fadeIn .4s ease-out forwards}
`;

const SCENARIOS = [
  { key: "winner", label: "Iterate on Winner", desc: "Upload your winning ad. Claude analyzes what works and generates new variations.", color: C.green, icon: "🏆" },
  { key: "competitor", label: "Iterate on Competitor", desc: "Upload a competitor ad + your brand assets. Steal the strategy, make it yours.", color: C.orange, icon: "🔍" },
  { key: "scratch", label: "Build from Scratch", desc: "No reference ad. Upload brand assets and describe what you want.", color: C.purple, icon: "✨" },
];

const SIZE_OPTIONS = [
  { key: "1080x1080", label: "1080×1080", sub: "Square 1:1", ratio: "1:1", w: 1080, h: 1080 },
  { key: "1080x1350", label: "1080×1350", sub: "Portrait 4:5", ratio: "4:5", w: 1080, h: 1350 },
  { key: "1080x1920", label: "1080×1920", sub: "Story 9:16", ratio: "9:16", w: 1080, h: 1920 },
];

const MODELS = [
  { key: "gemini-2.5-flash-image", label: "Gemini Flash", price: 0.039, desc: "Supports reference images", type: "gemini" },
  { key: "imagen-4.0-generate-001", label: "Imagen 4", price: 0.04, desc: "Best quality", type: "imagen" },
  { key: "imagen-4.0-fast-generate-001", label: "Imagen 4 Fast", price: 0.02, desc: "Fastest, cheapest", type: "imagen" },
];

const VARIATION_COUNTS = [5, 8, 10, 15];

const ASSET_TYPES = {
  winner: [
    { key: "referenceAd", label: "Winning Ad", required: true, multiple: false, desc: "Your top performer" },
    { key: "logo", label: "Logo", required: false, multiple: false, desc: "Brand logo" },
    { key: "productPhotos", label: "Product Photos", required: false, multiple: true, desc: "Product images" },
    { key: "lifestyleImages", label: "Lifestyle", required: false, multiple: true, desc: "Brand imagery" },
  ],
  competitor: [
    { key: "referenceAd", label: "Competitor Ad", required: true, multiple: false, desc: "Ad to iterate on" },
    { key: "logo", label: "Your Logo", required: true, multiple: false, desc: "YOUR brand logo" },
    { key: "productPhotos", label: "Your Products", required: true, multiple: true, desc: "YOUR product images" },
    { key: "lifestyleImages", label: "Your Lifestyle", required: false, multiple: true, desc: "YOUR brand imagery" },
  ],
  scratch: [
    { key: "logo", label: "Logo", required: true, multiple: false, desc: "Brand logo" },
    { key: "productPhotos", label: "Product Photos", required: true, multiple: true, desc: "Product images" },
    { key: "lifestyleImages", label: "Lifestyle", required: false, multiple: true, desc: "Brand imagery" },
  ],
};

const DEFAULT_BRAND = {
  productName: "", productCategory: "", avatar: "", desires: "", objections: "",
  mechanism: "", proofPoints: "", pricePoint: "", offer: "", brandVoice: "",
  primaryColor: "", secondaryColor: "", competitors: "", whatWorked: "",
  headline: "", subheadline: "", keyBenefits: "", testimonial: "",
};

// ═══════════════════════════════════════════
// SYSTEM PROMPT — template knowledge embedded as background, not structure
// ═══════════════════════════════════════════

const SYSTEM_PROMPT = `You are a world-class direct response creative strategist and art director with $50M+ in managed ad spend. Breakthrough Advertising principles deeply internalized.

Your job: Look at the uploaded reference material, understand the brand, and generate detailed image generation prompts that will produce REAL static ad creatives.

CRITICAL PROMPT WRITING RULES:
- Every prompt MUST start with "Use the attached images as brand reference. Match the exact product colors, typography style, and brand tone precisely."
- Every prompt must describe the COMPLETE visual composition: background, product placement, text content, text styling, colors, lighting, camera angle
- ALL text in the ad must be specified with exact words — headlines, subheads, CTAs, stats, review quotes
- Describe typography: font weight, size relative to other elements, color, position
- Describe the layout: what's in the top third, middle, bottom. Left/right splits. Overlapping elements
- Specify colors using the brand's actual colors where possible
- Include aspect ratio as "[ASPECT_RATIO]" — this will be swapped per size
- Prompts must be 100% self-contained — the image generator has NO other context

PROVEN AD FORMATS YOU KNOW WORK (use as inspiration, not rigid structures):
- Pull-quote review cards: emotional quote large at top, star rating, truncated review card with "...Read more", product overlapping card edge
- Social comment screenshots: looks like someone screenshotted a real Facebook/Instagram comment and put product below it
- Before/after UGC: grainy iPhone mirror selfie transformation, looks like real person posted it
- Us vs Them splits: brand product left with green checkmarks vs generic competitor right with red X marks
- Stat surround: product centered with curved arrows pointing to stats around it (protein, calories, reviews, customers)
- Faux press articles: looks like a real news article screenshot with publication masthead
- iPhone Notes style: mimics the iOS Notes app with benefit checklist
- Feature callout arrows: hand holding product with hand-drawn arrows pointing to benefit labels
- Bold statement + gradient: provocative 1-line headline on vibrant gradient, product casually placed
- Testimonial with highlighted phrases: long review text with neon yellow/green highlighter on key phrases
- Advertorial/editorial: moody portrait photo with "HOT TOPIC" pill label and massive headline overlay
- Offer/promo split: primary brand color top, contrast color bottom, product at split point, offer text prominent
- Post-it note on product: casual lifestyle photo with handwritten sticky note stuck to product
- Manifesto/letter: copy-dominant, all text, short punchy lines building argument, product small at bottom
- Bundle showcase: open box hero shot with benefit bar showing what's included
- Product hero + stat bar: centered product, scattered ingredients/elements, clean stat bar at bottom
- Verified review card: mimics real review platform UI with avatar, verified badge, star rating, helpfulness count
- Curiosity gap: truncated social caption with "...more", uncomfortable close-up problem photo, no product visible
- Lifestyle action + product array: person using product in context with color variants fanned in foreground
- Comparison grid table: your product vs competitor in simple table rows, meme-format clarity

STYLE GUIDANCE:
- Match the energy of the brand: clean/clinical brands get clean layouts, bold/fun brands get gradients and playful type
- UGC-native ads should look like real people posted them — grainy, slightly off-center, no perfect layouts
- Social proof ads should mimic real platform UI (review cards, comment sections, star ratings)
- Editorial/press ads should feel like magazine pages or news articles, not ads
- Product hero ads should have magazine-quality lighting and composition
- Copy-led ads let the writing do the selling — minimal imagery, maximum impact from words

Write copy that sells. Use Breakthrough Advertising techniques: Intensification (make the claim bigger through specifics), Identification (make the reader see themselves), Mechanization (explain HOW it works), Gradualization (build belief step by step).`;

// ═══════════════════════════════════════════
// IMAGE UTILS
// ═══════════════════════════════════════════

function compressImage(file, maxSize = 800) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) { const r = Math.min(maxSize / w, maxSize / h); w = Math.round(w * r); h = Math.round(h * r); }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve({ base64: canvas.toDataURL("image/jpeg", 0.7).split(",")[1], mimeType: "image/jpeg", preview: canvas.toDataURL("image/jpeg", 0.4), name: file.name });
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
        if (w > maxSize || h > maxSize) { const r = Math.min(maxSize / w, maxSize / h); w = Math.round(w * r); h = Math.round(h * r); }
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

function buildUserPrompt(scenario, assets, brand, variationCount) {
  const hasRef = !!assets.referenceAd;
  const hasLogo = !!assets.logo;
  const productCount = assets.productPhotos?.length || 0;
  const lifestyleCount = assets.lifestyleImages?.length || 0;

  let brandBlock = "";
  if (brand.productName) {
    brandBlock = `\nBRAND CONTEXT:
Product: ${brand.productName} (${brand.productCategory || "N/A"})
Avatar: ${brand.avatar || "N/A"}
Desires: ${brand.desires || "N/A"}
Objections: ${brand.objections || "N/A"}
Mechanism/USP: ${brand.mechanism || "N/A"}
Proof: ${brand.proofPoints || "N/A"}
Price/Offer: ${brand.pricePoint || "N/A"} / ${brand.offer || "N/A"}
Voice: ${brand.brandVoice || "Direct"}
Colors: Primary ${brand.primaryColor || "N/A"}, Secondary ${brand.secondaryColor || "N/A"}
Competitors: ${brand.competitors || "N/A"}
What's worked: ${brand.whatWorked || "N/A"}`;
    if (brand.headline) brandBlock += `\nPreferred headline: ${brand.headline}`;
    if (brand.subheadline) brandBlock += `\nPreferred subheadline: ${brand.subheadline}`;
    if (brand.keyBenefits) brandBlock += `\nKey benefits to feature: ${brand.keyBenefits}`;
    if (brand.testimonial) brandBlock += `\nTestimonial to use: ${brand.testimonial}`;
  }

  const scenarioBlock = {
    winner: `SCENARIO: ITERATE ON WINNING AD
I've uploaded my best-performing ad. Study it deeply — the layout, colors, copy style, emotional angle, offer framing, what makes someone stop scrolling. Then generate ${variationCount} DIFFERENT ad concepts that keep what works but try completely different visual approaches and angles.

Don't just tweak the original — reimagine it. Different layouts, different social proof styles, different emotional hooks, different visual formats. Each variation should feel like a distinctly different ad that could win on its own.`,

    competitor: `SCENARIO: COMPETE WITH THIS AD
I've uploaded a competitor's ad. Study their approach — what angle are they using, what's their hook, how are they positioning. Then generate ${variationCount} ad concepts for MY brand that beat this competitor's approach.

Use MY product photos, MY logo, MY brand voice. The goal is to out-execute them — take what's smart about their approach and make it work better for my brand. Each variation should attack from a different angle.`,

    scratch: `SCENARIO: BUILD FROM SCRATCH
No reference ad. Use the brand context I've provided and the uploaded assets to generate ${variationCount} distinctly different ad concepts. Each should use a completely different format and emotional approach.

Vary between: social proof approaches, product hero shots, copy-led designs, comparison formats, UGC-native styles, editorial looks, and promotional layouts. Make each one feel like it was designed by a different creative team.`,
  };

  return `${scenarioBlock[scenario]}

AVAILABLE ASSETS:
${hasRef ? "- Reference ad uploaded (see image above)" : "- No reference ad"}
- Logo: ${hasLogo ? "YES" : "NO"}
- Product photos: ${productCount > 0 ? productCount : "NONE"}
- Lifestyle images: ${lifestyleCount > 0 ? lifestyleCount : "NONE"}
${brandBlock}

Generate EXACTLY ${variationCount} variation concepts. For each, write a COMPLETE, DETAILED image generation prompt. Each prompt must be fully self-contained and describe every visual element.

Every prompt must end with "[ASPECT_RATIO] aspect ratio." — this placeholder will be replaced per output size.

Return ONLY valid JSON:
{
  "analysis": {
    "reference_insight": "${hasRef ? 'What the reference ad does well and what angle it takes' : 'null'}",
    "brand_positioning": "How to best position this brand in ads",
    "angles": ["angle 1", "angle 2", "angle 3"]
  },
  "variations": [
    {
      "title": "Short descriptive name (3-5 words)",
      "format": "What type of ad this is (e.g. Review Card, UGC Native, Product Hero, etc)",
      "gemini_prompt": "Use the attached images as brand reference. Match the exact product colors... [COMPLETE DETAILED PROMPT]. [ASPECT_RATIO] aspect ratio.",
      "include_refs": ["product", "logo"],
      "reasoning": "Why this specific approach works for this brand (1 sentence)"
    }
  ]
}

include_refs options: "reference_ad", "product", "logo", "lifestyle"
Make sure to vary the formats significantly — don't generate 5 review cards. Mix it up.`;
}

// ═══════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════

function Btn({children,onClick,v="sec",s="md",disabled,full}){const vs={pri:{bg:C.accent,c:"#fff",b:"none"},sec:{bg:C.surface3,c:C.text,b:`1px solid ${C.border}`},ghost:{bg:"transparent",c:C.textSec,b:"none"},danger:{bg:C.red+"18",c:C.red,b:`1px solid ${C.red}30`}};const ss={sm:{p:"6px 14px",f:12},md:{p:"10px 20px",f:14},lg:{p:"14px 28px",f:15}};const vv=vs[v]||vs.sec,sz=ss[s]||ss.md;return <button onClick={onClick} disabled={disabled} style={{padding:sz.p,fontSize:sz.f,fontFamily:"inherit",fontWeight:500,borderRadius:10,cursor:disabled?"default":"pointer",opacity:disabled?.35:1,transition:"all .2s",width:full?"100%":"auto",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,background:vv.bg,color:vv.c,border:vv.b}}>{children}</button>;}

function Inp({label,value,onChange,placeholder,type="text",textarea,rows=3,hint,compact}){const sh={width:"100%",fontFamily:"inherit",fontSize:14,color:C.text,background:C.surface2,border:`1px solid ${C.border}`,borderRadius:10,padding:compact?"8px 12px":"12px 16px",outline:"none",transition:"border-color .2s"};return <div style={{marginBottom:compact?8:12}}>{label&&<label style={{display:"block",fontSize:12,fontWeight:500,color:C.textSec,marginBottom:hint?2:6}}>{label}</label>}{hint&&<div style={{fontSize:11,color:C.textDim,marginBottom:6}}>{hint}</div>}{textarea?<textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...sh,resize:"vertical",lineHeight:1.6}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>:<input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={sh} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>}</div>;}

function Pill({children,color,active,onClick}){const a=active!==undefined?active:true;return <button onClick={onClick} style={{fontSize:11,fontWeight:600,padding:"4px 12px",borderRadius:16,cursor:onClick?"pointer":"default",transition:"all .15s",fontFamily:"inherit",background:a?(color||C.accent)+"15":"transparent",color:a?(color||C.accent):C.textDim,border:`1px solid ${a?(color||C.accent)+"40":C.border}`,whiteSpace:"nowrap"}}>{children}</button>;}

function ProgressRing({progress,size=48}){const r=(size-4)/2;const circ=2*Math.PI*r;const off=circ-(progress/100)*circ;return <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.surface3} strokeWidth="4"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.accent} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" style={{transition:"stroke-dashoffset .3s"}}/></svg>;}

// ═══════════════════════════════════════════
// ASSET UPLOAD
// ═══════════════════════════════════════════

function AssetUpload({ assetTypes, assets, setAssets }) {
  const refs = useRef({});
  const handleFiles = async (key, files, multiple) => {
    const processed = [];
    for (const file of files) { if (file.type.startsWith("image/")) processed.push(await compressImage(file)); }
    if (!processed.length) return;
    setAssets(prev => ({ ...prev, [key]: multiple ? [...(prev[key] || []), ...processed] : processed[0] }));
  };
  const remove = (key, index) => {
    setAssets(prev => { if (Array.isArray(prev[key])) { const n = [...prev[key]]; n.splice(index, 1); return { ...prev, [key]: n }; } return { ...prev, [key]: null }; });
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
      {assetTypes.map(at => {
        const current = assets[at.key];
        const items = at.multiple ? (current || []) : (current ? [current] : []);
        const has = items.length > 0;
        return (
          <div key={at.key} style={{ background: C.card, borderRadius: 14, padding: 14, border: `1px solid ${has ? C.accent + "30" : C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: has ? C.text : C.textSec }}>{at.label}</span>
              {at.required && <span style={{ fontSize: 9, color: C.red, fontWeight: 600 }}>Required</span>}
            </div>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>{at.desc}</div>
            {has && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
              {items.map((item, i) => (
                <div key={i} style={{ position: "relative", width: 44, height: 44, borderRadius: 8, overflow: "hidden" }}>
                  <img src={item.preview} alt="" style={{ width: 44, height: 44, objectFit: "cover" }} />
                  <button onClick={() => remove(at.key, i)} style={{ position: "absolute", top: -1, right: -1, width: 16, height: 16, borderRadius: 8, background: C.red, color: "#fff", border: `2px solid ${C.card}`, fontSize: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>×</button>
                </div>
              ))}
            </div>}
            <input ref={el => refs.current[at.key] = el} type="file" accept="image/*" multiple={at.multiple} style={{ display: "none" }} onChange={e => handleFiles(at.key, Array.from(e.target.files), at.multiple)} />
            <button onClick={() => refs.current[at.key]?.click()} style={{ width: "100%", padding: 8, borderRadius: 8, background: C.surface2, border: `1px dashed ${C.borderLight}`, color: C.textSec, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>{has ? (at.multiple ? "Add More" : "Replace") : "Upload"}</button>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// SIZE SELECTOR
// ═══════════════════════════════════════════

function SizeSelector({ selected, onChange }) {
  const toggle = (key) => {
    if (selected.includes(key)) { if (selected.length > 1) onChange(selected.filter(s => s !== key)); }
    else onChange([...selected, key]);
  };
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {SIZE_OPTIONS.map(s => {
        const active = selected.includes(s.key);
        const aspect = s.w / s.h; const pH = 56; const pW = Math.round(pH * aspect);
        return (
          <button key={s.key} onClick={() => toggle(s.key)} style={{
            flex: 1, padding: "14px 10px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
            background: active ? C.accent + "10" : C.surface2, border: `2px solid ${active ? C.accent : C.border}`,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all .2s",
          }}>
            <div style={{ width: pW, height: pH, borderRadius: 5, background: active ? C.accent + "25" : C.surface3, border: `1.5px solid ${active ? C.accent + "60" : C.borderLight}` }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: active ? C.text : C.textSec }}>{s.label}</div>
            <div style={{ fontSize: 10, color: C.textDim }}>{s.sub}</div>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════

export default function App() {
  const [step, setStep] = useState("scenario");
  const [scenario, setScenario] = useState(null);
  const [assets, setAssets] = useState({ referenceAd: null, logo: null, productPhotos: [], lifestyleImages: [] });
  const [brand, setBrand] = useState({ ...DEFAULT_BRAND });
  const [variationCount, setVariationCount] = useState(10);
  const [selectedSizes, setSelectedSizes] = useState(["1080x1350"]);
  const [geminiModel, setGeminiModel] = useState(MODELS[0].key);
  const [analysis, setAnalysis] = useState(null);
  const [variations, setVariations] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0, errors: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const abortRef = useRef(false);

  const u = (k) => (v) => setBrand(p => ({ ...p, [k]: v }));

  const assetTypes = scenario ? ASSET_TYPES[scenario] : [];
  const requiredAssets = assetTypes.filter(a => a.required);
  const canProceed = requiredAssets.every(a => {
    const v = assets[a.key]; return a.multiple ? (v && v.length > 0) : !!v;
  });

  const modelInfo = MODELS.find(m => m.key === geminiModel) || MODELS[0];
  const totalImages = variationCount * selectedSizes.length;

  // Build Claude content
  const buildClaudeContent = useCallback(() => {
    const content = [];
    if (assets.referenceAd) {
      content.push({ type: "image", source: { type: "base64", media_type: assets.referenceAd.mimeType, data: assets.referenceAd.base64 } });
      content.push({ type: "text", text: scenario === "competitor" ? "[COMPETITOR AD — study their approach]" : "[WINNING AD — study what works]" });
    }
    if (assets.logo) {
      content.push({ type: "image", source: { type: "base64", media_type: assets.logo.mimeType, data: assets.logo.base64 } });
      content.push({ type: "text", text: "[BRAND LOGO]" });
    }
    (assets.productPhotos || []).slice(0, 3).forEach((p, i) => {
      content.push({ type: "image", source: { type: "base64", media_type: p.mimeType, data: p.base64 } });
      content.push({ type: "text", text: `[PRODUCT PHOTO ${i + 1}]` });
    });
    (assets.lifestyleImages || []).slice(0, 2).forEach((l, i) => {
      content.push({ type: "image", source: { type: "base64", media_type: l.mimeType, data: l.base64 } });
      content.push({ type: "text", text: `[LIFESTYLE IMAGE ${i + 1}]` });
    });
    content.push({ type: "text", text: buildUserPrompt(scenario, assets, brand, variationCount) });
    return content;
  }, [scenario, assets, brand, variationCount]);

  // Run analysis
  const runAnalysis = async () => {
    setIsAnalyzing(true); setError(null); setStep("analyzing");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 16000, system: SYSTEM_PROMPT, messages: [{ role: "user", content: buildClaudeContent() }] }),
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) { const t = await res.text(); throw new Error("Server error (" + res.status + "): " + t.substring(0, 200)); }
      const data = await res.json();
      if (data.error) throw new Error(typeof data.error === "string" ? data.error : (data.error.message || JSON.stringify(data.error)));
      let text = (data.content?.[0]?.text || "").replace(/```json|```/g, "").trim();
      if (!text) throw new Error("Empty response.");
      let parsed;
      try { parsed = JSON.parse(text); } catch(e) {
        const lc = text.lastIndexOf("}"); if (lc > 0) text = text.substring(0, lc + 1);
        let f = text; const ob=(f.match(/{/g)||[]).length,cb=(f.match(/}/g)||[]).length;
        for(let i=0;i<ob-cb;i++) f+="}"; const oq=(f.match(/\[/g)||[]).length,cq=(f.match(/\]/g)||[]).length;
        for(let i=0;i<oq-cq;i++) f+="]"; parsed = JSON.parse(f);
      }
      setAnalysis(parsed.analysis); setVariations(parsed.variations); setStep("review");
    } catch (e) { setError(e.message); setStep("setup"); }
    setIsAnalyzing(false);
  };

  // Generate — each variation × each size
  const runGeneration = async () => {
    if (!variations) return;
    setIsGenerating(true); setError(null); setStep("generating");
    abortRef.current = false;

    const jobs = [];
    for (const v of variations) {
      for (const sizeKey of selectedSizes) {
        const sizeOpt = SIZE_OPTIONS.find(s => s.key === sizeKey);
        const prompt = v.gemini_prompt.replace(/\[ASPECT_RATIO\]/g, sizeOpt.ratio);
        jobs.push({ ...v, size: sizeKey, sizeLabel: sizeOpt.label, prompt });
      }
    }

    setGenProgress({ current: 0, total: jobs.length, errors: 0 });
    setGeneratedImages([]);

    const refCache = {};
    const getRef = async (key) => {
      if (refCache[key]) return refCache[key];
      let b64;
      if (key === "reference_ad" && assets.referenceAd) b64 = assets.referenceAd.base64;
      else if (key === "logo" && assets.logo) b64 = assets.logo.base64;
      else if (key === "product" && assets.productPhotos?.[0]) b64 = assets.productPhotos[0].base64;
      else if (key === "lifestyle" && assets.lifestyleImages?.[0]) b64 = assets.lifestyleImages[0].base64;
      if (!b64) return null;
      const blob = await fetch("data:image/jpeg;base64," + b64).then(r => r.blob());
      refCache[key] = await compressForGemini(blob);
      return refCache[key];
    };

    let errors = 0;
    for (let i = 0; i < jobs.length; i++) {
      if (abortRef.current) break;
      const job = jobs[i];
      setGenProgress(p => ({ ...p, current: i + 1 }));
      try {
        const images = [];
        for (const ref of (job.include_refs || ["product"])) { const img = await getRef(ref); if (img) images.push(img); }
        const res = await fetch("/api/generate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: job.prompt, images, model: geminiModel, modelType: modelInfo.type }),
        });
        const data = await res.json();
        if (data.error) { errors++; setGenProgress(p => ({ ...p, errors })); setGeneratedImages(prev => [...prev, { ...job, index: i, error: typeof data.error === "string" ? data.error : data.error.message, image: null }]); }
        else { setGeneratedImages(prev => [...prev, { ...job, index: i, image: data.image, mimeType: data.mimeType, error: null }]); }
      } catch (e) { errors++; setGenProgress(p => ({ ...p, errors })); setGeneratedImages(prev => [...prev, { ...job, index: i, error: e.message, image: null }]); }
      if (i < jobs.length - 1) await new Promise(r => setTimeout(r, 2500));
    }
    setIsGenerating(false); setStep("gallery");
  };

  const downloadImage = (item) => {
    if (!item.image) return;
    const a = document.createElement("a"); a.href = "data:" + (item.mimeType || "image/png") + ";base64," + item.image;
    a.download = "ad-" + String(item.index + 1).padStart(2, "0") + "-" + (item.format || "var").replace(/\s+/g, "-").toLowerCase() + "-" + (item.size || "var") + ".png"; a.click();
  };
  const downloadAll = () => { const good = filtered.filter(it => it.image); good.forEach((item, i) => setTimeout(() => downloadImage(item), i * 300)); };
  const reset = () => {
    abortRef.current = true; setStep("scenario"); setScenario(null);
    setAssets({ referenceAd: null, logo: null, productPhotos: [], lifestyleImages: [] });
    setBrand({ ...DEFAULT_BRAND }); setVariationCount(10); setSelectedSizes(["1080x1350"]);
    setAnalysis(null); setVariations(null); setGeneratedImages([]); setError(null); setActiveFilter("all");
  };

  const filtered = activeFilter === "all" ? generatedImages : generatedImages.filter(g => (g.format || "").toLowerCase().includes(activeFilter));
  const successCount = generatedImages.filter(g => g.image).length;

  // Get unique formats for filtering
  const formats = [...new Set(generatedImages.map(g => g.format).filter(Boolean))];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
      <style>{css}</style>

      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(0,0,0,.72)", backdropFilter: "blur(20px) saturate(180%)", borderBottom: `1px solid ${C.border}`, padding: "0 28px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.02em" }}>Creative Factory</span>
            <span style={{ fontSize: 12, color: C.textDim }}>v7</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(step === "gallery" || step === "generating") && successCount > 0 && <Btn v="pri" s="sm" onClick={downloadAll}>Download All ({successCount})</Btn>}
            {step !== "scenario" && <Btn v="ghost" s="sm" onClick={reset}>Reset</Btn>}
          </div>
        </div>
      </nav>

      {error && <div style={{ background: C.red + "10", borderBottom: `1px solid ${C.red}25`, padding: "10px 28px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: C.red }}>{error}</span>
          <Btn v="ghost" s="sm" onClick={() => setError(null)}>Dismiss</Btn>
        </div>
      </div>}

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 28px" }}>

        {/* ═══ SCENARIO ═══ */}
        {step === "scenario" && (
          <div className="fi">
            <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-.03em", marginBottom: 4 }}>Create ad variations</h1>
            <p style={{ fontSize: 15, color: C.textSec, marginBottom: 28 }}>Choose your starting point.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {SCENARIOS.map(s => (
                <button key={s.key} onClick={() => { setScenario(s.key); setStep("setup"); }} style={{
                  background: C.card, borderRadius: 16, padding: 24, border: `2px solid ${C.border}`,
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all .2s",
                }} onMouseEnter={e => e.currentTarget.style.borderColor = s.color} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SETUP ═══ */}
        {step === "setup" && scenario && (
          <div className="fi">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <span style={{ fontSize: 28 }}>{SCENARIOS.find(s => s.key === scenario)?.icon}</span>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.03em" }}>{SCENARIOS.find(s => s.key === scenario)?.label}</h1>
                <p style={{ fontSize: 14, color: C.textSec }}>{SCENARIOS.find(s => s.key === scenario)?.desc}</p>
              </div>
            </div>

            {/* Assets */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Upload Assets</div>
              <AssetUpload assetTypes={assetTypes} assets={assets} setAssets={setAssets} />
            </div>

            {/* Brand Context */}
            <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Brand Context <span style={{ fontSize: 11, color: C.textDim, fontWeight: 400 }}>— the more you give, the better the output</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                <Inp label="Product Name" value={brand.productName} onChange={u("productName")} placeholder="Glow Serum" compact />
                <Inp label="Category" value={brand.productCategory} onChange={u("productCategory")} placeholder="Skincare" compact />
              </div>
              <Inp label="Target Avatar" value={brand.avatar} onChange={u("avatar")} placeholder="Women 30-50, post-pregnancy dark spots" compact />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                <Inp label="Desires" value={brand.desires} onChange={u("desires")} placeholder="Confidence without makeup" compact />
                <Inp label="Objections" value={brand.objections} onChange={u("objections")} placeholder="Nothing works, too expensive" compact />
              </div>
              <Inp label="Mechanism / USP" value={brand.mechanism} onChange={u("mechanism")} placeholder="TriBright Complex penetrates 3 layers deep" compact />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 10px" }}>
                <Inp label="Price" value={brand.pricePoint} onChange={u("pricePoint")} placeholder="$39" compact />
                <Inp label="Offer" value={brand.offer} onChange={u("offer")} placeholder="Buy 2 get 1 free" compact />
                <Inp label="Brand Voice" value={brand.brandVoice} onChange={u("brandVoice")} placeholder="Clean, clinical" compact />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                <Inp label="Primary Color" value={brand.primaryColor} onChange={u("primaryColor")} placeholder="#1a2b3c or Navy Blue" compact />
                <Inp label="Secondary Color" value={brand.secondaryColor} onChange={u("secondaryColor")} placeholder="#ffffff or Cream" compact />
              </div>
              <Inp label="Proof Points" value={brand.proofPoints} onChange={u("proofPoints")} placeholder="12K customers, 4.8 stars, dermatologist endorsed" compact />
              <div style={{ height: 1, background: C.border, margin: "8px 0 12px" }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 8 }}>Ad Copy Direction (optional — helps Claude write better headlines)</div>
              <Inp label="Headline" value={brand.headline} onChange={u("headline")} placeholder="e.g. 'Dark spots don't stand a chance'" hint="If you have a headline you want to test" compact />
              <Inp label="Subheadline" value={brand.subheadline} onChange={u("subheadline")} placeholder="e.g. 'Clinically proven to fade spots in 14 days'" compact />
              <Inp label="Key Benefits" value={brand.keyBenefits} onChange={u("keyBenefits")} placeholder="e.g. Fades dark spots, Evens skin tone, Dermatologist endorsed" hint="Comma separated" compact />
              <Inp label="Testimonial / Review" value={brand.testimonial} onChange={u("testimonial")} placeholder="e.g. 'I've literally tried everything. This is the first thing that actually worked.' — Sarah K." hint="A real customer quote to use in review-style ads" textarea rows={2} />
              <Inp label="What's worked before" value={brand.whatWorked} onChange={u("whatWorked")} placeholder="UGC testimonials, proof-stacking, specific pain hooks" compact />
              <Inp label="Competitors" value={brand.competitors} onChange={u("competitors")} placeholder="Brand A, Brand B" compact />
            </div>

            {/* Variation Count */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>How many variations?</div>
              <div style={{ display: "flex", gap: 6 }}>
                {VARIATION_COUNTS.map(n => (
                  <Pill key={n} active={variationCount === n} onClick={() => setVariationCount(n)} color={C.accent}>{n} variations</Pill>
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Output Sizes</div>
              <p style={{ fontSize: 12, color: C.textDim, marginBottom: 10 }}>Every variation renders in ALL selected sizes.</p>
              <SizeSelector selected={selectedSizes} onChange={setSelectedSizes} />
            </div>

            {/* Model + Summary */}
            <div style={{ background: C.accent + "08", borderRadius: 16, padding: 20, border: `1px solid ${C.accent}20`, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{variationCount} concepts × {selectedSizes.length} size{selectedSizes.length > 1 ? "s" : ""} = {totalImages} images</div>
                  <div style={{ fontSize: 13, color: C.textSec, marginTop: 4 }}>Est. cost: ${(totalImages * modelInfo.price).toFixed(2)}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 8 }}>Generation Model</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {MODELS.map(m => (
                  <button key={m.key} onClick={() => setGeminiModel(m.key)} style={{
                    padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                    background: geminiModel === m.key ? C.accent + "15" : C.surface2,
                    border: `1.5px solid ${geminiModel === m.key ? C.accent : C.border}`, transition: "all .2s",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: geminiModel === m.key ? C.text : C.textSec }}>{m.label}</div>
                    <div style={{ fontSize: 10, color: C.textDim }}>${m.price}/img · {m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <Btn v="pri" s="lg" onClick={runAnalysis} disabled={!canProceed || isAnalyzing}>
              {isAnalyzing ? "Analyzing..." : "Analyze & Create Prompts"}
            </Btn>
            {!canProceed && <p style={{ fontSize: 12, color: C.textDim, marginTop: 8 }}>Upload required assets to continue.</p>}
          </div>
        )}

        {/* ═══ ANALYZING ═══ */}
        {step === "analyzing" && (
          <div className="fi" style={{ textAlign: "center", padding: "80px 20px" }}>
            <ProgressRing progress={45} size={64} />
            <h2 style={{ fontSize: 22, fontWeight: 600, marginTop: 20, marginBottom: 8 }}>Analyzing your input</h2>
            <p style={{ fontSize: 14, color: C.textSec, animation: "pulse 2s infinite" }}>Claude is studying your assets and writing {variationCount} ad prompts...</p>
            <p style={{ fontSize: 13, color: C.textDim, marginTop: 6 }}>15–45 seconds</p>
          </div>
        )}

        {/* ═══ REVIEW ═══ */}
        {step === "review" && analysis && variations && (
          <div className="fi">
            {analysis && (
              <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Analysis</div>
                {analysis.reference_insight && analysis.reference_insight !== "null" && <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6, marginBottom: 10 }}>{analysis.reference_insight}</div>}
                {analysis.brand_positioning && <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6, marginBottom: 10 }}>{analysis.brand_positioning}</div>}
                {analysis.angles?.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {analysis.angles.map((a, i) => <Pill key={i} color={C.accent}>{a}</Pill>)}
                </div>}
              </div>
            )}

            <div style={{ background: C.accent + "08", borderRadius: 16, padding: 20, border: `1px solid ${C.accent}20`, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{variations.length} concepts × {selectedSizes.length} size{selectedSizes.length > 1 ? "s" : ""} = {variations.length * selectedSizes.length} images</div>
                  <div style={{ fontSize: 13, color: C.textSec, marginTop: 4 }}>Est: ${(variations.length * selectedSizes.length * modelInfo.price).toFixed(2)}</div>
                </div>
                <Btn v="pri" s="lg" onClick={runGeneration}>Generate {variations.length * selectedSizes.length} Images</Btn>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
              {variations.map((v, i) => (
                <div key={i} style={{ background: C.card, borderRadius: 12, padding: "12px 16px", border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                    <Pill color={C.teal}>{v.format || "Ad"}</Pill>
                    <span style={{ fontSize: 10, color: C.textDim }}>×{selectedSizes.length} sizes</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{v.title}</div>
                  <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.4 }}>{v.reasoning}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ GENERATING / GALLERY ═══ */}
        {(step === "generating" || step === "gallery") && (
          <div className="fi">
            {isGenerating && (
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, padding: "20px 24px", background: C.card, borderRadius: 16, border: `1px solid ${C.border}` }}>
                <ProgressRing progress={Math.round((genProgress.current / genProgress.total) * 100)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>Generating {genProgress.current} of {genProgress.total}</div>
                  <div style={{ fontSize: 13, color: C.textSec }}>{genProgress.errors > 0 ? genProgress.errors + " failed · " : ""}Images appear as they complete</div>
                </div>
                <Btn v="danger" s="sm" onClick={() => { abortRef.current = true; }}>Stop</Btn>
              </div>
            )}

            {!isGenerating && step === "gallery" && (
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.03em", marginBottom: 4 }}>{successCount} images generated</h2>
                <p style={{ fontSize: 14, color: C.textSec }}>Click any image to download.</p>
              </div>
            )}

            {generatedImages.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                <Pill active={activeFilter === "all"} onClick={() => setActiveFilter("all")}>All {generatedImages.length}</Pill>
                {formats.map(f => (
                  <Pill key={f} active={activeFilter === f.toLowerCase()} onClick={() => setActiveFilter(activeFilter === f.toLowerCase() ? "all" : f.toLowerCase())} color={C.teal}>{f}</Pill>
                ))}
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
              {filtered.map((item, fi) => (
                <div key={fi} onClick={() => item.image && downloadImage(item)} style={{
                  width: 280, borderRadius: 14, overflow: "hidden", background: C.card, border: `1px solid ${C.border}`,
                  cursor: item.image ? "pointer" : "default", transition: "transform .15s, box-shadow .15s",
                }}
                  onMouseEnter={e => { if (item.image) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,.4)"; }}}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  {item.image ? (
                    <img src={"data:" + (item.mimeType || "image/png") + ";base64," + item.image} alt={item.title} style={{ width: "100%", display: "block" }} />
                  ) : item.error ? (
                    <div style={{ width: "100%", height: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: C.red + "06" }}>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 12, color: C.red, fontWeight: 600, marginBottom: 4 }}>Failed</div><div style={{ fontSize: 10, color: C.textDim }}>{item.error.substring(0, 80)}</div></div>
                    </div>
                  ) : (
                    <div style={{ width: "100%", height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: C.surface2 }}>
                      <span style={{ fontSize: 12, color: C.accent, animation: "pulse 1.5s infinite" }}>Generating...</span>
                    </div>
                  )}
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                      <Pill color={C.teal}>{item.format || "Ad"}</Pill>
                      <span style={{ fontSize: 10, color: C.textDim }}>{item.sizeLabel || item.size}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.3 }}>{item.reasoning}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer style={{ padding: "24px 28px", textAlign: "center", marginTop: 40 }}>
        <p style={{ fontSize: 12, color: C.textDim }}>Creative Factory v7 · D-DOUBLEU MEDIA</p>
      </footer>
    </div>
  );
}
