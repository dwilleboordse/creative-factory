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

// ═══════════════════════════════════════════
// TEMPLATE LIBRARY (40 templates, categorized)
// ═══════════════════════════════════════════

const TEMPLATE_CATEGORIES = [
  { key: "social_proof", label: "Social Proof", color: C.green, templates: [
    { id: "pull_quote_review", name: "Pull-Quote Review Card", num: 11 },
    { id: "verified_review", name: "Verified Review Card", num: 17 },
    { id: "social_comment", name: "Social Comment Screenshot", num: 15 },
    { id: "social_proof_stack", name: "Social Proof Stack", num: 6 },
    { id: "testimonial", name: "Testimonial", num: 3 },
    { id: "highlighted_testimonial", name: "Highlighted Testimonial", num: 19 },
  ]},
  { key: "comparison", label: "Comparison", color: C.orange, templates: [
    { id: "us_vs_them", name: "Us vs Them", num: 7 },
    { id: "us_vs_them_color", name: "Us vs Them Color Split", num: 25 },
    { id: "comparison_grid", name: "Comparison Grid", num: 31 },
  ]},
  { key: "ugc_native", label: "UGC Native", color: C.pink, templates: [
    { id: "before_after", name: "Before & After", num: 8 },
    { id: "story_callout", name: "Story Callout", num: 32 },
    { id: "viral_post", name: "Viral Post Overlay", num: 29 },
    { id: "postit_note", name: "Post-It Note", num: 40 },
    { id: "ugc_lifestyle_split", name: "UGC Lifestyle Split", num: 38 },
    { id: "whiteboard", name: "Whiteboard Before/After", num: 36 },
  ]},
  { key: "editorial", label: "Editorial / Press", color: C.purple, templates: [
    { id: "advertorial", name: "Advertorial Content", num: 20 },
    { id: "faux_press", name: "Faux Press Article", num: 33 },
    { id: "iphone_notes", name: "iPhone Notes", num: 34 },
    { id: "press_editorial", name: "Press/Editorial", num: 10 },
  ]},
  { key: "product_hero", label: "Product Hero", color: C.teal, templates: [
    { id: "stat_surround", name: "Stat Surround", num: 13 },
    { id: "stat_lifestyle", name: "Stat Surround Lifestyle", num: 18 },
    { id: "hero_showcase", name: "Hero Showcase + Stat Bar", num: 35 },
    { id: "bundle_showcase", name: "Bundle + Benefit Bar", num: 14 },
    { id: "feature_callout", name: "Feature Arrow Callout", num: 28 },
    { id: "features_benefits", name: "Features/Benefits Diagram", num: 4 },
    { id: "hero_statement_icons", name: "Hero Statement + Icons", num: 30 },
    { id: "hero_promo", name: "Hero + Promo Burst", num: 37 },
  ]},
  { key: "lifestyle", label: "Lifestyle", color: C.yellow, templates: [
    { id: "lifestyle_action", name: "Lifestyle Action + Array", num: 12 },
    { id: "flavor_story", name: "Flavor Story", num: 22 },
  ]},
  { key: "copy_led", label: "Copy-Led", color: C.accent, templates: [
    { id: "headline", name: "Headline Ad", num: 1 },
    { id: "manifesto", name: "Long-Form Manifesto", num: 23 },
    { id: "bold_statement", name: "Bold Statement", num: 21 },
    { id: "curiosity_gap", name: "Curiosity Gap Hook", num: 39 },
    { id: "hook_quote", name: "Curiosity Quote Testimonial", num: 16 },
    { id: "bullet_points", name: "Bullet Points Split", num: 5 },
    { id: "benefit_checklist", name: "Benefit Checklist", num: 27 },
  ]},
  { key: "promotional", label: "Promotional", color: C.red, templates: [
    { id: "offer_promo", name: "Offer/Promotion", num: 2 },
    { id: "negative_marketing", name: "Negative Marketing Bait", num: 9 },
    { id: "product_comment", name: "Product + Comment", num: 24 },
    { id: "stat_callout_data", name: "Stat Callout Data", num: 26 },
  ]},
];

const ALL_TEMPLATES = TEMPLATE_CATEGORIES.flatMap(c => c.templates.map(t => ({ ...t, category: c.key, categoryLabel: c.label, categoryColor: c.color })));

const SCENARIOS = [
  { key: "winner", label: "Iterate on Winner", desc: "Upload your winning ad + brand assets. Generate variations using proven templates.", color: C.green, icon: "🏆" },
  { key: "competitor", label: "Iterate on Competitor", desc: "Upload a competitor ad + your brand assets. Steal the angle, make it yours.", color: C.orange, icon: "🔍" },
  { key: "scratch", label: "Build from Scratch", desc: "No reference ad. Select templates, fill brand context, generate fresh concepts.", color: C.purple, icon: "✨" },
];

const SIZE_OPTIONS = [
  { key: "1080x1080", label: "1080×1080", sub: "Square 1:1", ratio: "1:1", w: 1080, h: 1080 },
  { key: "1080x1350", label: "1080×1350", sub: "Portrait 4:5", ratio: "4:5", w: 1080, h: 1350 },
  { key: "1080x1920", label: "1080×1920", sub: "Story 9:16", ratio: "9:16", w: 1080, h: 1920 },
];

const MODELS = [
  { key: "gemini-2.5-flash-image", label: "Gemini Flash", price: 0.039, desc: "Fast, supports refs", type: "gemini" },
  { key: "imagen-4.0-generate-001", label: "Imagen 4", price: 0.04, desc: "Best quality", type: "imagen" },
  { key: "imagen-4.0-fast-generate-001", label: "Imagen 4 Fast", price: 0.02, desc: "Fastest", type: "imagen" },
];

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
};

// ═══════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════

const PRINCIPLES = `You are a world-class direct response creative strategist with $50M+ in managed ad spend. Breakthrough Advertising principles deeply internalized.

You have a library of 40 proven ad templates. Your job is to:
1. Analyze the reference material provided
2. Select the most relevant templates for this brand/product
3. Fill in each template with brand-specific copy, colors, and product details
4. Output complete, self-contained Gemini image generation prompts

CRITICAL RULES:
- Every prompt must start with "Use the attached images as brand reference."
- Every prompt must specify exact text content (headlines, subheads, copy)
- Every prompt must describe full composition (layout, colors, lighting, product placement)
- Prompts must be 100% self-contained — Gemini has NO other context
- Write copy that sells — use Breakthrough Advertising techniques: Intensification, Identification, Gradualization, Mechanization
- Headlines must be specific and emotional, never generic
- Match the brand voice provided`;

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

function buildAnalyzePrompt(scenario, assets, brand, selectedTemplates) {
  const hasLogo = !!assets.logo;
  const productCount = assets.productPhotos?.length || 0;
  const hasRef = !!assets.referenceAd;

  let brandBlock = "";
  if (brand.productName) {
    brandBlock = `\nBRAND CONTEXT:
Product: ${brand.productName} (${brand.productCategory || "N/A"})
Avatar: ${brand.avatar || "N/A"}
Desires: ${brand.desires || "N/A"}
Objections: ${brand.objections || "N/A"}
Mechanism: ${brand.mechanism || "N/A"}
Proof: ${brand.proofPoints || "N/A"}
Price/Offer: ${brand.pricePoint || "N/A"} / ${brand.offer || "N/A"}
Voice: ${brand.brandVoice || "Direct"}
Colors: Primary ${brand.primaryColor || "N/A"}, Secondary ${brand.secondaryColor || "N/A"}
Competitors: ${brand.competitors || "N/A"}
What's worked before: ${brand.whatWorked || "N/A"}`;
  }

  const templateList = selectedTemplates.map(t => `- #${t.num} ${t.name} (${t.categoryLabel})`).join("\n");
  const scenarioInstructions = {
    winner: `SCENARIO: ITERATE ON WINNER
You have a WINNING AD as reference. Analyze what makes it work (hook, layout, emotional angle, offer framing). Then generate variations using the templates below — each variation should KEEP what works from the winner but apply a different proven format.`,
    competitor: `SCENARIO: ITERATE ON COMPETITOR
You have a COMPETITOR AD as reference. Analyze their angle, offer, and creative approach. Then generate variations for OUR brand using the templates below — steal the strategy, not the execution. Use OUR product, OUR brand assets, OUR voice.`,
    scratch: `SCENARIO: BUILD FROM SCRATCH
No reference ad. Use the brand context and uploaded assets to generate fresh ad concepts using the templates below. Lean heavily on the avatar's desires, objections, and the brand's mechanism.`,
  };

  return `${scenarioInstructions[scenario]}

AVAILABLE ASSETS:
${hasRef ? "- Reference ad: YES (analyze this)" : "- Reference ad: NONE"}
- Logo: ${hasLogo ? "YES" : "NO"}
- Product photos: ${productCount > 0 ? productCount + " provided" : "NONE"}
- Lifestyle images: ${assets.lifestyleImages?.length > 0 ? assets.lifestyleImages.length + " provided" : "NONE"}
${brandBlock}

TEMPLATES TO USE (generate one variation per template):
${templateList}

For each template, output a COMPLETE Gemini image generation prompt. Every prompt must:
1. Start with "Use the attached images as brand reference. Match the exact product colors, typography style, and brand tone precisely."
2. Include the full template layout description
3. Fill in ALL copy/text with brand-specific content (headlines, subheads, benefits, stats, quotes)
4. Specify colors matching the brand
5. Include aspect ratio placeholder [ASPECT_RATIO] — this will be replaced per size

Return ONLY valid JSON:
{
  "analysis": {
    "reference_summary": "What the reference ad does well (or null if scratch)",
    "brand_positioning": "How to position this brand",
    "key_angles": ["angle 1", "angle 2", "angle 3"],
    "emotional_triggers": ["trigger 1", "trigger 2"]
  },
  "variations": [
    {
      "template_id": "pull_quote_review",
      "template_name": "Pull-Quote Review Card",
      "category": "social_proof",
      "title": "3-5 word variation name",
      "gemini_prompt": "Use the attached images as brand reference. Match the exact product colors... [FULL PROMPT with all copy filled in]. [ASPECT_RATIO] aspect ratio.",
      "include_refs": ["product", "logo"],
      "reasoning": "Why this template + angle works for this brand (1 sentence)"
    }
  ]
}

include_refs options: "reference_ad", "product", "logo", "lifestyle"`;
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
// TEMPLATE SELECTOR
// ═══════════════════════════════════════════

function TemplateSelector({ selected, onChange, mode }) {
  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter(s => s !== id));
    else if (selected.length < 15) onChange([...selected, id]);
  };
  const selectCategory = (cat) => {
    const ids = cat.templates.map(t => t.id);
    const allSelected = ids.every(id => selected.includes(id));
    if (allSelected) onChange(selected.filter(s => !ids.includes(s)));
    else { const newSet = new Set([...selected, ...ids]); onChange([...newSet].slice(0, 15)); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Select Templates <span style={{ fontSize: 12, color: C.textSec }}>({selected.length}/15)</span></div>
        {mode === "scratch" && <div style={{ fontSize: 11, color: C.textDim }}>Select templates to generate from</div>}
      </div>
      {TEMPLATE_CATEGORIES.map(cat => (
        <div key={cat.key} style={{ marginBottom: 12 }}>
          <div onClick={() => selectCategory(cat)} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }}>
            <Pill color={cat.color} active>{cat.label}</Pill>
            <span style={{ fontSize: 10, color: C.textDim }}>{cat.templates.filter(t => selected.includes(t.id)).length}/{cat.templates.length}</span>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingLeft: 4 }}>
            {cat.templates.map(t => (
              <Pill key={t.id} color={cat.color} active={selected.includes(t.id)} onClick={() => toggle(t.id)}>
                {t.name}
              </Pill>
            ))}
          </div>
        </div>
      ))}
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
  const [step, setStep] = useState("scenario"); // scenario, setup, analyzing, review, generating, gallery
  const [scenario, setScenario] = useState(null);
  const [assets, setAssets] = useState({ referenceAd: null, logo: null, productPhotos: [], lifestyleImages: [] });
  const [brand, setBrand] = useState({ ...DEFAULT_BRAND });
  const [selectedTemplates, setSelectedTemplates] = useState([]);
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
    const v = assets[a.key];
    return a.multiple ? (v && v.length > 0) : !!v;
  }) && selectedTemplates.length > 0;

  const selectedTemplateObjects = ALL_TEMPLATES.filter(t => selectedTemplates.includes(t.id));
  const totalImages = selectedTemplateObjects.length * selectedSizes.length;
  const modelInfo = MODELS.find(m => m.key === geminiModel) || MODELS[0];

  // Build Claude content
  const buildClaudeContent = useCallback(() => {
    const content = [];
    if (assets.referenceAd) {
      content.push({ type: "image", source: { type: "base64", media_type: assets.referenceAd.mimeType, data: assets.referenceAd.base64 } });
      content.push({ type: "text", text: scenario === "competitor" ? "[COMPETITOR AD — analyze their approach]" : "[WINNING AD — analyze what works]" });
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
    content.push({ type: "text", text: buildAnalyzePrompt(scenario, assets, brand, selectedTemplateObjects) });
    return content;
  }, [scenario, assets, brand, selectedTemplateObjects]);

  // Run analysis
  const runAnalysis = async () => {
    setIsAnalyzing(true); setError(null); setStep("analyzing");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 16000, system: PRINCIPLES, messages: [{ role: "user", content: buildClaudeContent() }] }),
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) { const t = await res.text(); throw new Error("Server error (" + res.status + "): " + t.substring(0, 200)); }
      const data = await res.json();
      if (data.error) throw new Error(typeof data.error === "string" ? data.error : (data.error.message || JSON.stringify(data.error)));
      let text = (data.content?.[0]?.text || "").replace(/```json|```/g, "").trim();
      if (!text) throw new Error("Empty response.");
      // Safe parse
      try { var parsed = JSON.parse(text); } catch(e) {
        const lc = text.lastIndexOf("}"); if (lc > 0) text = text.substring(0, lc + 1);
        let f = text; const ob=(f.match(/{/g)||[]).length,cb=(f.match(/}/g)||[]).length;
        for(let i=0;i<ob-cb;i++) f+="}"; const oq=(f.match(/\[/g)||[]).length,cq=(f.match(/\]/g)||[]).length;
        for(let i=0;i<oq-cq;i++) f+="]"; parsed = JSON.parse(f);
      }
      setAnalysis(parsed.analysis); setVariations(parsed.variations); setStep("review");
    } catch (e) { setError(e.message); setStep("setup"); }
    setIsAnalyzing(false);
  };

  // Run generation — each variation × each size
  const runGeneration = async () => {
    if (!variations) return;
    setIsGenerating(true); setError(null); setStep("generating");
    abortRef.current = false;

    const jobs = [];
    for (const v of variations) {
      for (const sizeKey of selectedSizes) {
        const sizeOpt = SIZE_OPTIONS.find(s => s.key === sizeKey);
        const prompt = v.gemini_prompt.replace("[ASPECT_RATIO]", sizeOpt.ratio).replace(/\[ASPECT_RATIO\]/g, sizeOpt.ratio);
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
    a.download = "ad-" + String(item.index + 1).padStart(2, "0") + "-" + item.template_id + "-" + (item.size || "var") + ".png"; a.click();
  };
  const downloadAll = () => { filtered.filter(it => it.image).forEach((item, i) => setTimeout(() => downloadImage(item), i * 300)); };
  const reset = () => {
    abortRef.current = true; setStep("scenario"); setScenario(null);
    setAssets({ referenceAd: null, logo: null, productPhotos: [], lifestyleImages: [] });
    setBrand({ ...DEFAULT_BRAND }); setSelectedTemplates([]); setSelectedSizes(["1080x1350"]);
    setAnalysis(null); setVariations(null); setGeneratedImages([]); setError(null); setActiveFilter("all");
  };

  const filtered = activeFilter === "all" ? generatedImages : generatedImages.filter(g => g.category === activeFilter);
  const successCount = generatedImages.filter(g => g.image).length;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
      <style>{css}</style>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(0,0,0,.72)", backdropFilter: "blur(20px) saturate(180%)", borderBottom: `1px solid ${C.border}`, padding: "0 28px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.02em" }}>Creative Factory</span>
            <span style={{ fontSize: 12, color: C.textDim }}>v6</span>
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

        {/* ═══ SCENARIO SELECT ═══ */}
        {step === "scenario" && (
          <div className="fi">
            <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-.03em", marginBottom: 4 }}>Create ad variations</h1>
            <p style={{ fontSize: 15, color: C.textSec, marginBottom: 28 }}>Choose your starting point. Every variation uses proven ad templates.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {SCENARIOS.map(s => (
                <button key={s.key} onClick={() => { setScenario(s.key); setStep("setup"); }} style={{
                  background: C.card, borderRadius: 16, padding: 24, border: `2px solid ${C.border}`,
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all .2s",
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = s.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 6, letterSpacing: "-.02em" }}>{s.label}</div>
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
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Brand Context <span style={{ fontSize: 11, color: C.textDim, fontWeight: 400 }}>— more context = better output</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                <Inp label="Product Name" value={brand.productName} onChange={u("productName")} placeholder="Glow Serum" compact />
                <Inp label="Category" value={brand.productCategory} onChange={u("productCategory")} placeholder="Skincare" compact />
              </div>
              <Inp label="Target Avatar" value={brand.avatar} onChange={u("avatar")} placeholder="Women 30-50, post-pregnancy dark spots" compact />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                <Inp label="Desires" value={brand.desires} onChange={u("desires")} placeholder="Confidence without makeup, younger look" compact />
                <Inp label="Objections" value={brand.objections} onChange={u("objections")} placeholder="Nothing works, too expensive, skeptical" compact />
              </div>
              <Inp label="Mechanism / USP" value={brand.mechanism} onChange={u("mechanism")} placeholder="TriBright Complex penetrates 3 layers" compact />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 10px" }}>
                <Inp label="Price" value={brand.pricePoint} onChange={u("pricePoint")} placeholder="$39" compact />
                <Inp label="Offer" value={brand.offer} onChange={u("offer")} placeholder="Buy 2 get 1 free" compact />
                <Inp label="Brand Voice" value={brand.brandVoice} onChange={u("brandVoice")} placeholder="Clean, clinical, warm" compact />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                <Inp label="Primary Color" value={brand.primaryColor} onChange={u("primaryColor")} placeholder="#1a2b3c or Navy Blue" compact />
                <Inp label="Secondary Color" value={brand.secondaryColor} onChange={u("secondaryColor")} placeholder="#ffffff or Cream" compact />
              </div>
              <Inp label="Proof Points" value={brand.proofPoints} onChange={u("proofPoints")} placeholder="12K customers, 4.8 stars, dermatologist endorsed" compact />
              <Inp label="Competitors" value={brand.competitors} onChange={u("competitors")} placeholder="Brand A (ingredient-led), Brand B (before/after)" compact />
              <Inp label="What's worked before" value={brand.whatWorked} onChange={u("whatWorked")} placeholder="UGC testimonials, proof-stacking, specific pain hooks" compact />
            </div>

            {/* Templates */}
            <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, marginBottom: 24 }}>
              <TemplateSelector selected={selectedTemplates} onChange={setSelectedTemplates} mode={scenario} />
            </div>

            {/* Sizes */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Output Sizes</div>
              <p style={{ fontSize: 12, color: C.textDim, marginBottom: 10 }}>Every variation is generated in ALL selected sizes.</p>
              <SizeSelector selected={selectedSizes} onChange={setSelectedSizes} />
            </div>

            {/* Summary + CTA */}
            <div style={{ background: C.accent + "08", borderRadius: 16, padding: 20, border: `1px solid ${C.accent}20`, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedTemplateObjects.length} templates × {selectedSizes.length} size{selectedSizes.length > 1 ? "s" : ""} = {totalImages} images</div>
                  <div style={{ fontSize: 13, color: C.textSec, marginTop: 4 }}>Est. cost: ${(totalImages * modelInfo.price).toFixed(2)} ({modelInfo.label})</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {MODELS.map(m => (
                    <button key={m.key} onClick={() => setGeminiModel(m.key)} style={{
                      padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                      background: geminiModel === m.key ? C.accent + "15" : C.surface2,
                      border: `1.5px solid ${geminiModel === m.key ? C.accent : C.border}`, transition: "all .2s",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: geminiModel === m.key ? C.text : C.textSec }}>{m.label}</div>
                      <div style={{ fontSize: 10, color: C.textDim }}>${m.price}/img</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Btn v="pri" s="lg" onClick={runAnalysis} disabled={!canProceed || isAnalyzing}>
              {isAnalyzing ? "Analyzing..." : "Analyze & Generate Prompts"}
            </Btn>
            {!canProceed && <p style={{ fontSize: 12, color: C.textDim, marginTop: 8 }}>Upload required assets and select at least 1 template.</p>}
          </div>
        )}

        {/* ═══ ANALYZING ═══ */}
        {step === "analyzing" && (
          <div className="fi" style={{ textAlign: "center", padding: "80px 20px" }}>
            <ProgressRing progress={45} size={64} />
            <h2 style={{ fontSize: 22, fontWeight: 600, marginTop: 20, marginBottom: 8 }}>Analyzing & selecting templates</h2>
            <p style={{ fontSize: 14, color: C.textSec, animation: "pulse 2s infinite" }}>Claude is studying your assets, filling template variables, writing headlines...</p>
            <p style={{ fontSize: 13, color: C.textDim, marginTop: 6 }}>15–30 seconds</p>
          </div>
        )}

        {/* ═══ REVIEW ═══ */}
        {step === "review" && analysis && variations && (
          <div className="fi">
            {/* Analysis summary */}
            {analysis && (
              <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Analysis</div>
                {analysis.reference_summary && <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6, marginBottom: 10 }}>{analysis.reference_summary}</div>}
                {analysis.key_angles?.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {analysis.key_angles.map((a, i) => <Pill key={i} color={C.accent}>{a}</Pill>)}
                </div>}
                {analysis.emotional_triggers?.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {analysis.emotional_triggers.map((t, i) => <Pill key={i} color={C.pink}>{t}</Pill>)}
                </div>}
              </div>
            )}

            {/* Generation summary */}
            <div style={{ background: C.accent + "08", borderRadius: 16, padding: 20, border: `1px solid ${C.accent}20`, marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{variations.length} variations × {selectedSizes.length} size{selectedSizes.length > 1 ? "s" : ""} = {variations.length * selectedSizes.length} images</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {TEMPLATE_CATEGORIES.map(cat => {
                  const n = variations.filter(v => v.category === cat.key).length;
                  return n > 0 ? <Pill key={cat.key} color={cat.color}>{cat.label} {n}</Pill> : null;
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <span style={{ fontSize: 14, color: C.textSec }}>Est: <span style={{ color: C.text, fontWeight: 600 }}>${(variations.length * selectedSizes.length * modelInfo.price).toFixed(2)}</span></span>
                <Btn v="pri" s="lg" onClick={runGeneration}>Generate {variations.length * selectedSizes.length} Images</Btn>
              </div>
            </div>

            {/* Variation specs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
              {variations.map((v, i) => {
                const cat = TEMPLATE_CATEGORIES.find(c => c.key === v.category);
                return (
                  <div key={i} style={{ background: C.card, borderRadius: 12, padding: "12px 16px", border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                      <Pill color={cat?.color}>{v.template_name || v.category}</Pill>
                      <span style={{ fontSize: 10, color: C.textDim }}>×{selectedSizes.length} sizes</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{v.title}</div>
                    <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.4 }}>{v.reasoning}</div>
                  </div>
                );
              })}
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
                {TEMPLATE_CATEGORIES.map(c => {
                  const n = generatedImages.filter(g => g.category === c.key).length;
                  return n > 0 ? <Pill key={c.key} active={activeFilter === c.key} onClick={() => setActiveFilter(c.key)} color={c.color}>{c.label} {n}</Pill> : null;
                })}
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
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 12, color: C.red, fontWeight: 600, marginBottom: 4 }}>Failed</div>
                        <div style={{ fontSize: 10, color: C.textDim }}>{item.error.substring(0, 80)}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: "100%", height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: C.surface2 }}>
                      <span style={{ fontSize: 12, color: C.accent, animation: "pulse 1.5s infinite" }}>Generating...</span>
                    </div>
                  )}
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                      {(() => { const cat = TEMPLATE_CATEGORIES.find(c => c.key === item.category); return <Pill color={cat?.color}>{item.template_name || item.category}</Pill>; })()}
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
        <p style={{ fontSize: 12, color: C.textDim }}>Creative Factory v6 · Template-Driven · D-DOUBLEU MEDIA</p>
      </footer>
    </div>
  );
}
