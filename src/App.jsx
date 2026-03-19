import { useState, useRef } from "react";

const C={bg:"#000",surface:"#0d0d0d",surface2:"#161616",surface3:"#1c1c1e",card:"#1c1c1e",border:"rgba(255,255,255,0.08)",borderLight:"rgba(255,255,255,0.12)",text:"#f5f5f7",textSec:"#86868b",textDim:"#48484a",accent:"#0a84ff",green:"#30d158",red:"#ff453a",orange:"#ff9f0a",purple:"#bf5af2",teal:"#64d2ff",yellow:"#ffd60a",pink:"#ff375f"};
const css=`*{margin:0;padding:0;box-sizing:border-box}body{background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',sans-serif;-webkit-font-smoothing:antialiased}::selection{background:${C.accent}40}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.textDim};border-radius:3px}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes spin{to{transform:rotate(360deg)}}.fi{animation:fadeIn .3s ease-out forwards}`;

const SIZES=[
  {key:"1080x1080",label:"1080×1080",sub:"Square 1:1",ratio:"1:1"},
  {key:"1080x1350",label:"1080×1350",sub:"Portrait 4:5",ratio:"4:5"},
  {key:"1080x1920",label:"1080×1920",sub:"Story 9:16",ratio:"9:16"},
];
const MODELS=[
  {key:"gemini-2.5-flash-image",label:"Gemini Flash",price:0.039,desc:"Uses product refs",type:"gemini"},
  {key:"imagen-4.0-generate-001",label:"Imagen 4",price:0.04,desc:"Best quality",type:"imagen"},
  {key:"imagen-4.0-fast-generate-001",label:"Imagen 4 Fast",price:0.02,desc:"Fastest",type:"imagen"},
];
const PROMPT_COUNTS=[10,20,30,40];

const SYSTEM=`You are a world-class direct response creative strategist and art director with $50M+ in managed ad spend. Breakthrough Advertising principles deeply internalized.

You have been given a complete brand package:
- SOURCE DOCUMENTS: Brand DNA, customer reviews, persona research, survey data, marketing materials
- WINNING ADS: Images of the brand's best-performing static ads — study what works
- LOSING ADS: Images of ads that failed — study what to avoid
- PRODUCT PHOTOS: The actual product images that will be attached to every generation call

Your job: Using ALL of this context, generate completely unique static ad image generation prompts. Each prompt must be a DIFFERENT format, angle, and visual approach.

CRITICAL PROMPT WRITING RULES:
- Every prompt MUST start with "Use the attached product reference images. Match the exact product design, colors, and packaging precisely."
- Every prompt must describe the COMPLETE visual composition: background, product placement, all text content with exact words, typography styling, colors, lighting, camera angles
- ALL text in the ad must be written out — headlines, subheads, offer text, CTAs, review quotes, stat numbers
- Use REAL data from the source docs: actual review quotes, real stats, real customer language, real proof points
- Headlines must be specific and emotional — never generic
- Each ad must be a completely different format/style — vary between: review cards, UGC native, product hero, comparison, editorial, copy-led, social proof, stat callout, testimonial highlight, before/after, manifesto, offer/promo, feature callout, bold statement, faux press, etc.
- Reference what works from winning ads and avoid patterns from losing ads
- Write copy that uses Breakthrough Advertising techniques: Intensification, Identification, Mechanization, Gradualization

WINNING AD PATTERNS TO REPLICATE:
Study the winning ads carefully. Note their:
- Layout structure (where text sits, where product sits)
- Copy style (short punchy vs long form, question hooks vs statement hooks)
- Social proof approach (stars, review quotes, stat numbers)
- Color usage and mood
- What makes them scroll-stopping

LOSING AD PATTERNS TO AVOID:
Study the losing ads. Identify:
- What went wrong (too generic? wrong audience? weak hook? bad layout?)
- Patterns to avoid in new creatives

Every prompt ends with "[ASPECT_RATIO] aspect ratio."

Respond ONLY in valid JSON:
{
  "brand_analysis": {
    "positioning": "How this brand should be positioned based on source docs",
    "key_desires": ["Top customer desires from reviews/surveys"],
    "key_objections": ["Top objections to address"],
    "proof_points": ["Strongest proof points available"],
    "voice": "Brand voice summary",
    "winning_patterns": ["What works based on winning ads"],
    "losing_patterns": ["What to avoid based on losing ads"]
  },
  "prompts": [
    {
      "id": 1,
      "title": "Short concept name (3-5 words)",
      "format": "Ad format type (Review Card, UGC Native, Product Hero, etc)",
      "angle": "Strategic angle — what emotional/rational lever this pulls",
      "awareness_level": "Unaware / Problem / Solution / Product / Most Aware",
      "prompt": "Use the attached product reference images. Match the exact product design... [COMPLETE PROMPT]. [ASPECT_RATIO] aspect ratio.",
      "reasoning": "1 sentence — why this specific approach for this brand"
    }
  ]
}`;

// ═══ IMAGE UTILS ═══
function compressImage(file, maxSize=800) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) { const r = Math.min(maxSize/w, maxSize/h); w = Math.round(w*r); h = Math.round(h*r); }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve({ base64: canvas.toDataURL("image/jpeg",0.7).split(",")[1], mimeType: "image/jpeg", preview: canvas.toDataURL("image/jpeg",0.4), name: file.name });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
function readTextFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve({ name: file.name, text: e.target.result });
    reader.readAsText(file);
  });
}
async function readPdfFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await loadPdfJs();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(" ") + "\n";
  }
  return { name: file.name, text: text.trim() };
}
let _pdfjs = null;
function loadPdfJs() {
  if (_pdfjs) return Promise.resolve(_pdfjs);
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { _pdfjs = window.pdfjsLib; resolve(_pdfjs); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      const lib = window.pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      _pdfjs = lib;
      resolve(lib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js"));
    document.head.appendChild(script);
  });
}

// ═══ UI ═══
function Btn({children,onClick,v="sec",s="md",disabled,full}){const vs={pri:{bg:C.accent,c:"#fff",b:"none"},sec:{bg:C.surface3,c:C.text,b:`1px solid ${C.border}`},ghost:{bg:"transparent",c:C.textSec,b:"none"},danger:{bg:C.red+"18",c:C.red,b:`1px solid ${C.red}30`}};const ss={sm:{p:"6px 14px",f:12},md:{p:"10px 20px",f:14},lg:{p:"14px 28px",f:15}};const vv=vs[v]||vs.sec,sz=ss[s]||ss.md;return <button onClick={onClick} disabled={disabled} style={{padding:sz.p,fontSize:sz.f,fontFamily:"inherit",fontWeight:500,borderRadius:10,cursor:disabled?"default":"pointer",opacity:disabled?.35:1,transition:"all .2s",width:full?"100%":"auto",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,background:vv.bg,color:vv.c,border:vv.b}}>{children}</button>;}
function Inp({label,value,onChange,placeholder,textarea,rows=3,hint,compact}){const sh={width:"100%",fontFamily:"inherit",fontSize:14,color:C.text,background:C.surface2,border:`1px solid ${C.border}`,borderRadius:10,padding:compact?"8px 12px":"12px 16px",outline:"none"};return <div style={{marginBottom:compact?8:12}}>{label&&<label style={{display:"block",fontSize:12,fontWeight:500,color:C.textSec,marginBottom:hint?2:6}}>{label}</label>}{hint&&<div style={{fontSize:11,color:C.textDim,marginBottom:6}}>{hint}</div>}{textarea?<textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...sh,resize:"vertical",lineHeight:1.6}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>:<input value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={sh} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>}</div>;}
function Pill({children,color,active,onClick}){const a=active!==undefined?active:true;return <button onClick={onClick} style={{fontSize:11,fontWeight:600,padding:"4px 12px",borderRadius:16,cursor:onClick?"pointer":"default",transition:"all .15s",fontFamily:"inherit",background:a?(color||C.accent)+"15":"transparent",color:a?(color||C.accent):C.textDim,border:`1px solid ${a?(color||C.accent)+"40":C.border}`,whiteSpace:"nowrap"}}>{children}</button>;}
function ProgressRing({progress,size=48}){const r=(size-4)/2;const circ=2*Math.PI*r;const off=circ-(progress/100)*circ;return <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.surface3} strokeWidth="4"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.accent} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" style={{transition:"stroke-dashoffset .3s"}}/></svg>;}

function ImageUploadGrid({ images, setImages, max, label, desc, required }) {
  const ref = useRef(null);
  const handleFiles = async (files) => {
    const p = [];
    for (const f of files) { if (f.type.startsWith("image/") && images.length + p.length < max) p.push(await compressImage(f)); }
    if (p.length) setImages(prev => [...prev, ...p].slice(0, max));
  };
  const remove = (i) => setImages(prev => prev.filter((_,idx) => idx !== i));
  return (
    <div style={{ background: C.card, borderRadius: 14, padding: 16, border: `1px solid ${images.length > 0 ? C.accent + "30" : C.border}`, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: images.length > 0 ? C.text : C.textSec }}>{label} <span style={{ fontSize: 11, color: C.textDim, fontWeight: 400 }}>({images.length}/{max})</span></span>
        {required && <span style={{ fontSize: 9, color: C.red, fontWeight: 600 }}>Required</span>}
      </div>
      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>{desc}</div>
      {images.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {images.map((img, i) => (
          <div key={i} style={{ position: "relative", borderRadius: 8, overflow: "hidden" }}>
            <img src={img.preview} alt="" style={{ height: 72, width: "auto", display: "block", borderRadius: 8 }} />
            <button onClick={() => remove(i)} style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: 9, background: C.red, color: "#fff", border: "none", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        ))}
      </div>}
      <input ref={ref} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => handleFiles(Array.from(e.target.files))} />
      <button onClick={() => ref.current?.click()} style={{ width: "100%", padding: 10, borderRadius: 8, background: C.surface2, border: `1px dashed ${C.borderLight}`, color: C.textSec, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{images.length > 0 ? "Add More" : "Upload Images"}</button>
    </div>
  );
}

// ═══ MAIN APP ═══
export default function App() {
  const [step, setStep] = useState("setup"); // setup, analyzing, review, generating, gallery
  
  // Inputs
  const [sourceDocs, setSourceDocs] = useState([]); // {name, text}
  const [sourceText, setSourceText] = useState(""); // pasted text
  const [winningAds, setWinningAds] = useState([]);
  const [losingAds, setLosingAds] = useState([]);
  const [productPhotos, setProductPhotos] = useState([]);
  const [promptCount, setPromptCount] = useState(30);
  const [selectedSizes, setSelectedSizes] = useState(["1080x1350"]);
  const [model, setModel] = useState(MODELS[0].key);
  
  // Brand context
  const [brand, setBrand] = useState({ productName:"", category:"", pricePoint:"", offer:"", brandVoice:"", primaryColor:"", secondaryColor:"" });
  const u = (k) => (v) => setBrand(p => ({...p, [k]: v}));

  // Results
  const [analysis, setAnalysis] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, errors: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPrompt, setExpandedPrompt] = useState(null);
  const abortRef = useRef(false);
  const docRef = useRef(null);

  const modelInfo = MODELS.find(m => m.key === model) || MODELS[0];
  const totalImages = promptCount * selectedSizes.length;
  const canProceed = productPhotos.length >= 1 && (sourceDocs.length > 0 || sourceText.trim());
  const successCount = results.filter(r => r.image).length;

  const toggleSize = (key) => {
    if (selectedSizes.includes(key)) { if (selectedSizes.length > 1) setSelectedSizes(p => p.filter(s => s !== key)); }
    else setSelectedSizes(p => [...p, key]);
  };

  const handleDocFiles = async (files) => {
    for (const f of files) {
      if (f.name.endsWith(".pdf") || f.type === "application/pdf") {
        try { const doc = await readPdfFile(f); setSourceDocs(prev => [...prev, doc]); } catch(e) { setError("Failed to read PDF: " + e.message); }
      } else if (f.name.endsWith(".txt") || f.name.endsWith(".md") || f.name.endsWith(".csv") || f.type.startsWith("text/")) {
        const doc = await readTextFile(f);
        setSourceDocs(prev => [...prev, doc]);
      }
    }
  };
  const removeDoc = (i) => setSourceDocs(prev => prev.filter((_, idx) => idx !== i));

  // ═══ BUILD CLAUDE CONTENT ═══
  const buildContent = () => {
    const content = [];

    // Source docs as text
    const allText = [
      ...sourceDocs.map(d => `--- ${d.name} ---\n${d.text}`),
      sourceText.trim() ? `--- Pasted Content ---\n${sourceText}` : "",
    ].filter(Boolean).join("\n\n");

    if (allText) content.push({ type: "text", text: `SOURCE DOCUMENTS:\n\n${allText.substring(0, 50000)}` });

    // Winning ads
    winningAds.slice(0, 6).forEach((img, i) => {
      content.push({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.base64 } });
      content.push({ type: "text", text: `[WINNING AD ${i + 1}]` });
    });

    // Losing ads
    losingAds.slice(0, 6).forEach((img, i) => {
      content.push({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.base64 } });
      content.push({ type: "text", text: `[LOSING AD ${i + 1}]` });
    });

    // Product photos
    productPhotos.slice(0, 4).forEach((img, i) => {
      content.push({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.base64 } });
      content.push({ type: "text", text: `[PRODUCT REFERENCE ${i + 1} — this will be attached to every image generation call]` });
    });

    // Brand context
    let brandBlock = "";
    if (brand.productName) brandBlock += `Product: ${brand.productName}`;
    if (brand.category) brandBlock += ` (${brand.category})`;
    if (brand.pricePoint) brandBlock += `\nPrice: ${brand.pricePoint}`;
    if (brand.offer) brandBlock += `\nCurrent offer: ${brand.offer}`;
    if (brand.brandVoice) brandBlock += `\nVoice: ${brand.brandVoice}`;
    if (brand.primaryColor) brandBlock += `\nPrimary color: ${brand.primaryColor}`;
    if (brand.secondaryColor) brandBlock += `\nSecondary color: ${brand.secondaryColor}`;

    content.push({ type: "text", text: `${brandBlock ? `BRAND:\n${brandBlock}\n\n` : ""}Generate exactly ${promptCount} unique static ad prompts. Each must be a completely different format and visual approach. Use real data, real quotes, real proof points from the source docs. Each prompt ends with "[ASPECT_RATIO] aspect ratio."` });

    return content;
  };

  // ═══ ANALYZE ═══
  const runAnalysis = async () => {
    setIsAnalyzing(true); setError(null); setStep("analyzing");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 16000, system: SYSTEM, messages: [{ role: "user", content: buildContent() }] }),
      });
      const data = await res.json();
      if (data.error) throw new Error(typeof data.error === "string" ? data.error : data.error.message);
      let text = (data.content?.[0]?.text || "").replace(/```json|```/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(text); } catch(e) {
        let f = text; const ob=(f.match(/{/g)||[]).length,cb=(f.match(/}/g)||[]).length;
        for(let i=0;i<ob-cb;i++) f+="}"; const oq=(f.match(/\[/g)||[]).length,cq=(f.match(/\]/g)||[]).length;
        for(let i=0;i<oq-cq;i++) f+="]"; parsed = JSON.parse(f);
      }
      setAnalysis(parsed.brand_analysis);
      setPrompts(parsed.prompts || []);
      setStep("review");
    } catch (e) { setError(e.message); setStep("setup"); }
    setIsAnalyzing(false);
  };

  // ═══ EXPORT PROMPTS ═══
  const exportPrompts = () => {
    const lines = prompts.map((p, i) => `PROMPT ${i + 1}: ${p.title}\nFormat: ${p.format}\nAngle: ${p.angle}\nAwareness: ${p.awareness_level}\nReasoning: ${p.reasoning}\n\n${p.prompt}\n\n${"═".repeat(60)}\n`).join("\n");
    const header = `CREATIVE FACTORY — PROMPT SHEET\nDate: ${new Date().toLocaleDateString()}\nBrand: ${brand.productName || "N/A"}\nPrompts: ${prompts.length}\n\n${"═".repeat(60)}\n\n`;
    const blob = new Blob([header + lines], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `prompts-${brand.productName?.replace(/\s+/g,"-") || "brand"}-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
  };

  // ═══ GENERATE ═══
  const runGeneration = async () => {
    if (!prompts.length) return;
    setIsGenerating(true); setError(null); setStep("generating");
    abortRef.current = false;

    const jobs = [];
    for (const p of prompts) {
      for (const sizeKey of selectedSizes) {
        const sizeOpt = SIZES.find(s => s.key === sizeKey);
        const prompt = (p.prompt || "").replace(/\[ASPECT_RATIO\]/g, sizeOpt.ratio);
        jobs.push({ ...p, sizeKey, sizeLabel: sizeOpt.label, ratio: sizeOpt.ratio, prompt });
      }
    }

    setProgress({ current: 0, total: jobs.length, errors: 0 });
    setResults([]);

    // Prepare product ref cache for Gemini
    const productRefs = productPhotos.slice(0, 2).map(img => ({ base64: img.base64, mimeType: img.mimeType }));

    let errors = 0;
    for (let i = 0; i < jobs.length; i++) {
      if (abortRef.current) break;
      const job = jobs[i];
      setProgress(p => ({ ...p, current: i + 1 }));
      try {
        const images = modelInfo.type === "gemini" ? productRefs : [];
        const res = await fetch("/api/generate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: job.prompt, images, model, modelType: modelInfo.type }),
        });
        const data = await res.json();
        if (data.error) {
          errors++; setProgress(p => ({ ...p, errors }));
          // Retry once
          await new Promise(r => setTimeout(r, 3000));
          try {
            const res2 = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: job.prompt, images, model, modelType: modelInfo.type }) });
            const data2 = await res2.json();
            if (data2.image) { errors--; setProgress(p => ({ ...p, errors })); setResults(prev => [...prev, { ...job, idx: i, image: data2.image, mimeType: data2.mimeType, error: null }]); continue; }
          } catch(e2) {}
          setResults(prev => [...prev, { ...job, idx: i, image: null, error: typeof data.error === "string" ? data.error : data.error.message }]);
        } else { setResults(prev => [...prev, { ...job, idx: i, image: data.image, mimeType: data.mimeType, error: null }]); }
      } catch (e) { errors++; setProgress(p => ({ ...p, errors })); setResults(prev => [...prev, { ...job, idx: i, image: null, error: e.message }]); }
      if (i < jobs.length - 1) await new Promise(r => setTimeout(r, 2500));
    }
    setIsGenerating(false); setStep("gallery");
  };

  const downloadImage = (item) => {
    if (!item.image) return;
    const a = document.createElement("a"); a.href = "data:" + (item.mimeType || "image/png") + ";base64," + item.image;
    a.download = `ad-${String(item.id).padStart(2,"0")}-${(item.format||"ad").replace(/\s+/g,"-").toLowerCase()}-${item.sizeKey}.png`; a.click();
  };
  const downloadAll = () => { results.filter(r => r.image).forEach((item, i) => setTimeout(() => downloadImage(item), i * 300)); };

  const reset = () => {
    abortRef.current = true; setStep("setup"); setSourceDocs([]); setSourceText("");
    setWinningAds([]); setLosingAds([]); setProductPhotos([]); setPromptCount(30);
    setSelectedSizes(["1080x1350"]); setBrand({ productName:"", category:"", pricePoint:"", offer:"", brandVoice:"", primaryColor:"", secondaryColor:"" });
    setAnalysis(null); setPrompts([]); setResults([]); setError(null); setExpandedPrompt(null);
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
      <style>{css}</style>

      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(0,0,0,.72)", backdropFilter: "blur(20px) saturate(180%)", borderBottom: `1px solid ${C.border}`, padding: "0 28px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Creative Factory</span>
            <span style={{ fontSize: 12, color: C.textDim }}>v8</span>
            {step === "setup" && <span style={{ fontSize: 11, color: C.textDim }}>Full Pipeline</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {successCount > 0 && <Btn v="pri" s="sm" onClick={downloadAll}>Download All ({successCount})</Btn>}
            {step !== "setup" && <Btn v="ghost" s="sm" onClick={reset}>Reset</Btn>}
          </div>
        </div>
      </nav>

      {error && <div style={{ background: C.red + "10", borderBottom: `1px solid ${C.red}25`, padding: "10px 28px" }}><div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, color: C.red }}>{error}</span><Btn v="ghost" s="sm" onClick={() => setError(null)}>Dismiss</Btn></div></div>}

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 28px" }}>

        {/* ═══ SETUP ═══ */}
        {step === "setup" && (
          <div className="fi">
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-.03em", marginBottom: 4 }}>Creative Factory</h1>
            <p style={{ fontSize: 15, color: C.textSec, marginBottom: 28 }}>Upload your brand package. Claude analyzes everything and writes {promptCount} unique ad prompts. Gemini generates the images.</p>

            {/* Step indicator */}
            <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
              {["Source Docs", "Winning / Losing Ads", "Product Photos", "Configure"].map((s, i) => (
                <div key={i} style={{ flex: 1, padding: "8px 0", textAlign: "center", borderBottom: `2px solid ${C.accent}`, fontSize: 11, fontWeight: 600, color: C.accent }}>{s}</div>
              ))}
            </div>

            {/* 1. SOURCE DOCS */}
            <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>1. Source Documents</div>
                <span style={{ fontSize: 9, color: C.red, fontWeight: 600 }}>Required</span>
              </div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 12 }}>Brand DNA, customer reviews, persona research, survey data, marketing materials. Upload .txt, .md, or .pdf files — or paste below.</div>
              
              {sourceDocs.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {sourceDocs.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: C.surface2, borderRadius: 8, padding: "4px 10px" }}>
                    <span style={{ fontSize: 11, color: C.green }}>📄</span>
                    <span style={{ fontSize: 12, color: C.textSec }}>{d.name}</span>
                    <span style={{ fontSize: 10, color: C.textDim }}>{(d.text.length / 1000).toFixed(1)}k chars</span>
                    <button onClick={() => removeDoc(i)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 12 }}>×</button>
                  </div>
                ))}
              </div>}

              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input ref={docRef} type="file" accept=".txt,.md,.csv,.pdf,text/*,application/pdf" multiple style={{ display: "none" }} onChange={e => handleDocFiles(Array.from(e.target.files))} />
                <Btn v="sec" s="sm" onClick={() => docRef.current?.click()}>Upload Documents</Btn>
              </div>

              <Inp label="Or paste content directly" value={sourceText} onChange={setSourceText} placeholder="Paste brand DNA, reviews, persona research, survey responses..." textarea rows={4} hint="Paste anything: reviews, survey data, brand guidelines, competitor research" />
            </div>

            {/* 2. WINNING & LOSING ADS */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <ImageUploadGrid images={winningAds} setImages={setWinningAds} max={6} label="2. Winning Ads" desc="Your top performing statics. Claude studies what works." />
              <ImageUploadGrid images={losingAds} setImages={setLosingAds} max={6} label="3. Losing Ads" desc="Ads that failed. Claude learns what to avoid." />
            </div>

            {/* 3. PRODUCT PHOTOS */}
            <ImageUploadGrid images={productPhotos} setImages={setProductPhotos} max={4} label="4. Product Reference Photos" desc="These get attached to every image generation call so Gemini matches your product exactly." required />

            {/* 4. BRAND CONTEXT */}
            <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>5. Brand Context <span style={{ fontSize: 11, color: C.textDim, fontWeight: 400 }}>— optional if source docs are thorough</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 10px" }}>
                <Inp label="Product Name" value={brand.productName} onChange={u("productName")} placeholder="Glow Serum" compact />
                <Inp label="Category" value={brand.category} onChange={u("category")} placeholder="Skincare" compact />
                <Inp label="Price" value={brand.pricePoint} onChange={u("pricePoint")} placeholder="$39" compact />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 10px" }}>
                <Inp label="Current Offer" value={brand.offer} onChange={u("offer")} placeholder="Buy 2 get 1 free" compact />
                <Inp label="Primary Color" value={brand.primaryColor} onChange={u("primaryColor")} placeholder="#1a2b3c or Navy" compact />
                <Inp label="Secondary Color" value={brand.secondaryColor} onChange={u("secondaryColor")} placeholder="#ffffff or Cream" compact />
              </div>
              <Inp label="Brand Voice" value={brand.brandVoice} onChange={u("brandVoice")} placeholder="Clean, clinical, warm but confident" compact />
            </div>

            {/* 5. CONFIG */}
            <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>6. Configuration</div>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 8 }}>How many prompts?</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {PROMPT_COUNTS.map(n => <Pill key={n} active={promptCount === n} onClick={() => setPromptCount(n)} color={C.accent}>{n} prompts</Pill>)}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 8 }}>Output sizes (each prompt × each size)</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {SIZES.map(s => {
                    const active = selectedSizes.includes(s.key);
                    return <button key={s.key} onClick={() => toggleSize(s.key)} style={{ flex: 1, padding: "12px 8px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", background: active ? C.accent + "10" : C.surface2, border: `2px solid ${active ? C.accent : C.border}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: active ? C.text : C.textSec }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: C.textDim }}>{s.sub}</div>
                    </button>;
                  })}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 8 }}>Generation model</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {MODELS.map(m => (
                    <button key={m.key} onClick={() => setModel(m.key)} style={{ padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", background: model === m.key ? C.accent + "15" : C.surface2, border: `1.5px solid ${model === m.key ? C.accent : C.border}` }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: model === m.key ? C.text : C.textSec }}>{m.label}</div>
                      <div style={{ fontSize: 10, color: C.textDim }}>${m.price}/img · {m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SUMMARY */}
            <div style={{ background: C.accent + "08", borderRadius: 16, padding: 20, border: `1px solid ${C.accent}20`, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{promptCount} prompts × {selectedSizes.length} size{selectedSizes.length > 1 ? "s" : ""} = {totalImages} images</div>
                  <div style={{ fontSize: 13, color: C.textSec, marginTop: 4 }}>
                    {sourceDocs.length} docs · {winningAds.length} winners · {losingAds.length} losers · {productPhotos.length} product refs · Est: ${(totalImages * modelInfo.price).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <Btn v="pri" s="lg" onClick={runAnalysis} disabled={!canProceed || isAnalyzing}>
              {isAnalyzing ? "Analyzing..." : `Analyze & Generate ${promptCount} Prompts`}
            </Btn>
            {!canProceed && <p style={{ fontSize: 12, color: C.textDim, marginTop: 8 }}>Need: at least 1 product photo + source docs or pasted content.</p>}
          </div>
        )}

        {/* ═══ ANALYZING ═══ */}
        {step === "analyzing" && (
          <div className="fi" style={{ textAlign: "center", padding: "80px 20px" }}>
            <ProgressRing progress={40} size={64} />
            <h2 style={{ fontSize: 22, fontWeight: 600, marginTop: 20, marginBottom: 8 }}>Analyzing brand package</h2>
            <p style={{ fontSize: 14, color: C.textSec, animation: "pulse 2s infinite" }}>Claude is reading source docs, studying winning/losing ads, and writing {promptCount} prompts...</p>
            <p style={{ fontSize: 13, color: C.textDim, marginTop: 6 }}>30-60 seconds</p>
          </div>
        )}

        {/* ═══ REVIEW ═══ */}
        {step === "review" && (
          <div className="fi">
            {/* Brand Analysis */}
            {analysis && (
              <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Brand Analysis</div>
                {analysis.positioning && <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6, marginBottom: 10 }}>{analysis.positioning}</div>}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {analysis.key_desires?.length > 0 && <div style={{ flex: 1, minWidth: 200 }}><div style={{ fontSize: 10, fontWeight: 600, color: C.green, marginBottom: 4 }}>KEY DESIRES</div>{analysis.key_desires.map((d, i) => <div key={i} style={{ fontSize: 12, color: C.textSec, marginBottom: 2 }}>→ {d}</div>)}</div>}
                  {analysis.key_objections?.length > 0 && <div style={{ flex: 1, minWidth: 200 }}><div style={{ fontSize: 10, fontWeight: 600, color: C.red, marginBottom: 4 }}>OBJECTIONS</div>{analysis.key_objections.map((o, i) => <div key={i} style={{ fontSize: 12, color: C.textSec, marginBottom: 2 }}>→ {o}</div>)}</div>}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                  {analysis.winning_patterns?.length > 0 && <div style={{ flex: 1, minWidth: 200 }}><div style={{ fontSize: 10, fontWeight: 600, color: C.accent, marginBottom: 4 }}>WINNING PATTERNS</div>{analysis.winning_patterns.map((p, i) => <div key={i} style={{ fontSize: 12, color: C.textSec, marginBottom: 2 }}>✓ {p}</div>)}</div>}
                  {analysis.losing_patterns?.length > 0 && <div style={{ flex: 1, minWidth: 200 }}><div style={{ fontSize: 10, fontWeight: 600, color: C.orange, marginBottom: 4 }}>LOSING PATTERNS</div>{analysis.losing_patterns.map((p, i) => <div key={i} style={{ fontSize: 12, color: C.textSec, marginBottom: 2 }}>✗ {p}</div>)}</div>}
                </div>
              </div>
            )}

            {/* Summary + Actions */}
            <div style={{ background: C.accent + "08", borderRadius: 16, padding: 20, border: `1px solid ${C.accent}20`, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{prompts.length} prompts × {selectedSizes.length} size{selectedSizes.length > 1 ? "s" : ""} = {prompts.length * selectedSizes.length} images</div>
                <div style={{ fontSize: 13, color: C.textSec }}>Est: ${(prompts.length * selectedSizes.length * modelInfo.price).toFixed(2)}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn v="sec" onClick={exportPrompts}>Export Prompts</Btn>
                <Btn v="sec" onClick={() => setStep("setup")}>Back</Btn>
                <Btn v="pri" s="lg" onClick={runGeneration}>Generate {prompts.length * selectedSizes.length} Images</Btn>
              </div>
            </div>

            {/* Prompt list */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 8 }}>
              {prompts.map((p, i) => (
                <div key={i} onClick={() => setExpandedPrompt(expandedPrompt === i ? null : i)} style={{ background: C.card, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}`, cursor: "pointer", transition: "border-color .15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.borderLight}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, background: C.accent + "20", width: 22, height: 22, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{p.id}</span>
                    <Pill color={C.teal}>{p.format}</Pill>
                    {p.awareness_level && <Pill color={C.purple}>{p.awareness_level}</Pill>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: C.textDim }}>{p.reasoning}</div>
                  {expandedPrompt === i && (
                    <div style={{ marginTop: 10, padding: 12, background: C.surface2, borderRadius: 8, fontSize: 12, color: C.textSec, lineHeight: 1.6, maxHeight: 200, overflowY: "auto" }}>
                      {p.prompt}
                    </div>
                  )}
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
                <ProgressRing progress={Math.round((progress.current / progress.total) * 100)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>Generating {progress.current} of {progress.total}</div>
                  <div style={{ fontSize: 13, color: C.textSec }}>{progress.errors > 0 ? progress.errors + " failed · " : ""}Auto-retries on failure · Images appear as they complete</div>
                </div>
                <Btn v="danger" s="sm" onClick={() => { abortRef.current = true; }}>Stop</Btn>
              </div>
            )}

            {!isGenerating && step === "gallery" && (
              <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.03em" }}>{successCount} images generated</h2>
                  <p style={{ fontSize: 14, color: C.textSec }}>Click any image to download. {progress.errors > 0 ? progress.errors + " failed." : ""}</p>
                </div>
                <Btn v="sec" onClick={exportPrompts}>Export Prompts</Btn>
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
              {results.map((item, fi) => (
                <div key={fi} onClick={() => item.image && downloadImage(item)} style={{
                  width: 260, borderRadius: 14, overflow: "hidden", background: C.card, border: `1px solid ${C.border}`,
                  cursor: item.image ? "pointer" : "default", transition: "transform .15s",
                }}
                  onMouseEnter={e => { if (item.image) e.currentTarget.style.transform = "scale(1.02)"; }}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  {item.image ? (
                    <img src={"data:" + (item.mimeType || "image/png") + ";base64," + item.image} alt="" style={{ width: "100%", display: "block" }} />
                  ) : item.error ? (
                    <div style={{ width: "100%", height: 180, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: C.red + "06" }}>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>Failed</div><div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>{item.error.substring(0, 60)}</div></div>
                    </div>
                  ) : (
                    <div style={{ width: "100%", height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: C.surface2 }}>
                      <span style={{ fontSize: 12, color: C.accent, animation: "pulse 1.5s infinite" }}>Generating...</span>
                    </div>
                  )}
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.accent }}>#{item.id}</span>
                      <Pill color={C.teal}>{item.format}</Pill>
                      <span style={{ fontSize: 10, color: C.textDim }}>{item.sizeLabel}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer style={{ padding: "24px 28px", textAlign: "center", marginTop: 40 }}>
        <p style={{ fontSize: 12, color: C.textDim }}>Creative Factory v8 · Full Pipeline · D-DOUBLEU MEDIA</p>
      </footer>
    </div>
  );
}
