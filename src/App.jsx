import { useState, useEffect, useRef, useCallback } from "react";

const C={bg:"#000",surface:"#0d0d0d",surface2:"#161616",surface3:"#1c1c1e",card:"#1c1c1e",border:"rgba(255,255,255,0.08)",borderLight:"rgba(255,255,255,0.12)",text:"#f5f5f7",textSec:"#86868b",textDim:"#48484a",accent:"#0a84ff",green:"#30d158",red:"#ff453a",orange:"#ff9f0a",purple:"#bf5af2",teal:"#64d2ff",yellow:"#ffd60a",pink:"#ff375f"};
const css=`*{margin:0;padding:0;box-sizing:border-box}body{background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',sans-serif;-webkit-font-smoothing:antialiased}::selection{background:${C.accent}40}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.textDim};border-radius:3px}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes spin{to{transform:rotate(360deg)}}.fi{animation:fadeIn .3s ease-out forwards}`;
const genId=()=>Math.random().toString(36).substring(2,10);

const SIZES=[{key:"1080x1080",label:"1080×1080",sub:"Square 1:1",ratio:"1:1"},{key:"1080x1350",label:"1080×1350",sub:"Portrait 4:5",ratio:"4:5"},{key:"1080x1920",label:"1080×1920",sub:"Story 9:16",ratio:"9:16"}];
const MODELS=[{key:"gemini-2.5-flash-image",label:"Gemini Flash",price:0.039,desc:"Uses product refs",type:"gemini"},{key:"imagen-4.0-generate-001",label:"Imagen 4",price:0.04,desc:"Best quality",type:"imagen"},{key:"imagen-4.0-fast-generate-001",label:"Imagen 4 Fast",price:0.02,desc:"Fastest",type:"imagen"}];
const COUNTS=[10,20,30,40];

async function apiGet(path){const r=await fetch(path);return r.json();}
async function apiPost(path,body){const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});return r.json();}

const SYSTEM=`You are a world-class direct response creative strategist and art director with $50M+ in managed ad spend. Breakthrough Advertising principles deeply internalized.

You have been given a complete brand package:
- SOURCE DOCUMENTS: Brand DNA, customer reviews, persona research, survey data, marketing materials
- WINNING ADS: Images of the brand's best-performing static ads — study what works
- LOSING ADS: Images of ads that failed — study what to avoid
- PRODUCT PHOTOS: The actual product images that will be attached to every generation call

Using ALL of this context, generate completely unique static ad image generation prompts. Each must be a DIFFERENT format, angle, and visual approach.

PROMPT RULES:
- Every prompt starts with "Use the attached product reference images. Match the exact product design, colors, and packaging precisely."
- Describe COMPLETE composition: background, product placement, all text with exact words, typography, colors, lighting, camera
- ALL text written out — headlines, subheads, offers, CTAs, review quotes, stats
- Use REAL data from source docs: actual review quotes, real stats, real customer language
- Headlines specific and emotional — never generic
- Each ad a completely different format — vary between: review cards, UGC native, product hero, comparison, editorial, copy-led, social proof, stat callout, testimonial highlight, before/after, manifesto, offer/promo, feature callout, bold statement, faux press, etc.
- Reference winning ad patterns. Avoid losing ad patterns.
- Use Breakthrough Advertising techniques: Intensification, Identification, Mechanization, Gradualization
- Every prompt ends with "[ASPECT_RATIO] aspect ratio."

Respond ONLY in valid JSON:
{
  "brand_analysis": {
    "positioning": "How this brand should be positioned",
    "key_desires": ["Top desires from reviews"],
    "key_objections": ["Top objections"],
    "proof_points": ["Strongest proof"],
    "winning_patterns": ["What works from winning ads"],
    "losing_patterns": ["What to avoid from losing ads"]
  },
  "prompts": [
    {
      "id": 1,
      "title": "Concept name (3-5 words)",
      "format": "Ad format type",
      "angle": "Strategic angle",
      "awareness_level": "Unaware/Problem/Solution/Product/Most Aware",
      "prompt": "Use the attached product reference images... [FULL PROMPT]. [ASPECT_RATIO] aspect ratio.",
      "reasoning": "Why this approach for this brand (1 sentence)"
    }
  ]
}`;

// ═══ FILE UTILS ═══
function compressImage(file, maxSize=600) {
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
        resolve({ base64: canvas.toDataURL("image/jpeg",0.6).split(",")[1], mimeType: "image/jpeg", preview: canvas.toDataURL("image/jpeg",0.3), name: file.name });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
function readTextFile(file) { return new Promise((resolve) => { const r = new FileReader(); r.onload = (e) => resolve({ name: file.name, text: e.target.result }); r.readAsText(file); }); }
async function readPdfFile(file) {
  const ab = await file.arrayBuffer();
  const lib = await loadPdfJs();
  const pdf = await lib.getDocument({ data: ab }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) { const p = await pdf.getPage(i); const c = await p.getTextContent(); text += c.items.map(it => it.str).join(" ") + "\n"; }
  return { name: file.name, text: text.trim() };
}
let _pdfjs = null;
function loadPdfJs() {
  if (_pdfjs) return Promise.resolve(_pdfjs);
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { _pdfjs = window.pdfjsLib; resolve(_pdfjs); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = () => { const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; _pdfjs = lib; resolve(lib); };
    s.onerror = () => reject(new Error("PDF.js load failed"));
    document.head.appendChild(s);
  });
}

// ═══ UI ═══
function Btn({children,onClick,v="sec",s="md",disabled,full}){const vs={pri:{bg:C.accent,c:"#fff",b:"none"},sec:{bg:C.surface3,c:C.text,b:`1px solid ${C.border}`},ghost:{bg:"transparent",c:C.textSec,b:"none"},danger:{bg:C.red+"18",c:C.red,b:`1px solid ${C.red}30`}};const ss={sm:{p:"6px 14px",f:12},md:{p:"10px 20px",f:14},lg:{p:"14px 28px",f:15}};const vv=vs[v]||vs.sec,sz=ss[s]||ss.md;return <button onClick={onClick} disabled={disabled} style={{padding:sz.p,fontSize:sz.f,fontFamily:"inherit",fontWeight:500,borderRadius:10,cursor:disabled?"default":"pointer",opacity:disabled?.35:1,transition:"all .2s",width:full?"100%":"auto",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,background:vv.bg,color:vv.c,border:vv.b}}>{children}</button>;}
function Inp({label,value,onChange,placeholder,textarea,rows=3,hint,compact}){const sh={width:"100%",fontFamily:"inherit",fontSize:14,color:C.text,background:C.surface2,border:`1px solid ${C.border}`,borderRadius:10,padding:compact?"8px 12px":"12px 16px",outline:"none"};return <div style={{marginBottom:compact?8:12}}>{label&&<label style={{display:"block",fontSize:12,fontWeight:500,color:C.textSec,marginBottom:hint?2:6}}>{label}</label>}{hint&&<div style={{fontSize:11,color:C.textDim,marginBottom:6}}>{hint}</div>}{textarea?<textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...sh,resize:"vertical",lineHeight:1.5}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>:<input value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={sh} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>}</div>;}
function Pill({children,color,active,onClick}){const a=active!==undefined?active:true;return <button onClick={onClick} style={{fontSize:11,fontWeight:600,padding:"4px 12px",borderRadius:16,cursor:onClick?"pointer":"default",transition:"all .15s",fontFamily:"inherit",background:a?(color||C.accent)+"15":"transparent",color:a?(color||C.accent):C.textDim,border:`1px solid ${a?(color||C.accent)+"40":C.border}`,whiteSpace:"nowrap"}}>{children}</button>;}
function ProgressRing({progress,size=48}){const r=(size-4)/2;const circ=2*Math.PI*r;const off=circ-(progress/100)*circ;return <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.surface3} strokeWidth="4"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.accent} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" style={{transition:"stroke-dashoffset .3s"}}/></svg>;}
function Modal({children,onClose,title}){return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}><div onClick={e=>e.stopPropagation()} className="fi" style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto"}}><div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:16,fontWeight:600}}>{title}</span><button onClick={onClose} style={{width:26,height:26,borderRadius:13,background:C.surface3,border:"none",color:C.textSec,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button></div><div style={{padding:20}}>{children}</div></div></div>;}

function ImageGrid({ images, onAdd, onRemove, max, label, desc, required }) {
  const ref = useRef(null);
  const handleFiles = async (files) => {
    const p = [];
    for (const f of files) { if (f.type.startsWith("image/") && images.length + p.length < max) p.push(await compressImage(f)); }
    if (p.length) onAdd(p);
  };
  return <div style={{ background: C.card, borderRadius: 14, padding: 16, border: `1px solid ${images.length > 0 ? C.accent + "30" : C.border}`, marginBottom: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: images.length > 0 ? C.text : C.textSec }}>{label} <span style={{ fontSize: 11, color: C.textDim, fontWeight: 400 }}>({images.length}/{max})</span></span>
      {required && <span style={{ fontSize: 9, color: C.red, fontWeight: 600 }}>Required</span>}
    </div>
    <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>{desc}</div>
    {images.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
      {images.map((img, i) => <div key={i} style={{ position: "relative", borderRadius: 8, overflow: "hidden" }}>
        <img src={img.preview || ("data:image/jpeg;base64," + img.base64)} alt="" style={{ height: 72, width: "auto", display: "block", borderRadius: 8 }} />
        <button onClick={() => onRemove(i)} style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: 9, background: C.red, color: "#fff", border: "none", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
      </div>)}
    </div>}
    <input ref={ref} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => handleFiles(Array.from(e.target.files))} />
    {images.length < max && <button onClick={() => ref.current?.click()} style={{ width: "100%", padding: 10, borderRadius: 8, background: C.surface2, border: `1px dashed ${C.borderLight}`, color: C.textSec, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{images.length > 0 ? "Add More" : "Upload Images"}</button>}
  </div>;
}

// ═══ MAIN APP ═══
export default function App() {
  const [data, setData] = useState({ clients: [] });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("clients"); // clients, profile, generate, review, generating, gallery
  const [selectedClient, setSelectedClient] = useState(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState(null);

  // Generation state (not persisted)
  const [promptCount, setPromptCount] = useState(30);
  const [selectedSizes, setSelectedSizes] = useState(["1080x1350"]);
  const [model, setModel] = useState(MODELS[0].key);
  const [analysis, setAnalysis] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, errors: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedPrompt, setExpandedPrompt] = useState(null);
  const abortRef = useRef(false);
  const docRef = useRef(null);

  useEffect(() => { apiGet("/api/data").then(d => { setData(d); setLoaded(true); }); }, []);

  const save = useCallback(async (nd) => { setData(nd); setSaving(true); await apiPost("/api/data", nd); setSaving(false); }, []);
  const updateClient = (uc) => { const nd = { ...data, clients: data.clients.map(c => c.id === uc.id ? uc : c) }; save(nd); setSelectedClient(uc); };

  const createClient = () => {
    if (!newName.trim()) return;
    const nc = { id: genId(), name: newName.trim(), createdAt: new Date().toISOString(), brand: { productName: "", category: "", pricePoint: "", offer: "", brandVoice: "", primaryColor: "", secondaryColor: "" }, sourceDocs: [], sourceText: "", winningAds: [], losingAds: [], productPhotos: [] };
    const nd = { ...data, clients: [...data.clients, nc] };
    save(nd); setNewName(""); setShowNewClient(false); setSelectedClient(nc); setView("profile");
  };
  const deleteClient = (id) => { if (!confirm("Delete this client and all saved data?")) return; save({ ...data, clients: data.clients.filter(c => c.id !== id) }); if (selectedClient?.id === id) { setSelectedClient(null); setView("clients"); } };

  const cl = selectedClient; // shorthand
  const ub = (k) => (v) => updateClient({ ...cl, brand: { ...cl.brand, [k]: v } });
  const modelInfo = MODELS.find(m => m.key === model) || MODELS[0];
  const totalImages = promptCount * selectedSizes.length;
  const canGenerate = cl && cl.productPhotos?.length >= 1 && (cl.sourceDocs?.length > 0 || cl.sourceText?.trim());
  const successCount = results.filter(r => r.image).length;
  const toggleSize = (key) => { if (selectedSizes.includes(key)) { if (selectedSizes.length > 1) setSelectedSizes(p => p.filter(s => s !== key)); } else setSelectedSizes(p => [...p, key]); };

  // Doc handlers
  const handleDocFiles = async (files) => {
    const newDocs = [];
    for (const f of files) {
      if (f.name.endsWith(".pdf") || f.type === "application/pdf") {
        try { newDocs.push(await readPdfFile(f)); } catch (e) { setError("PDF read failed: " + e.message); }
      } else if (f.name.endsWith(".txt") || f.name.endsWith(".md") || f.name.endsWith(".csv") || f.type.startsWith("text/")) {
        newDocs.push(await readTextFile(f));
      }
    }
    if (newDocs.length) updateClient({ ...cl, sourceDocs: [...(cl.sourceDocs || []), ...newDocs] });
  };

  // ═══ BUILD CONTENT ═══
  const buildContent = () => {
    const content = [];
    const allText = [...(cl.sourceDocs || []).map(d => `--- ${d.name} ---\n${d.text}`), cl.sourceText?.trim() ? `--- Pasted ---\n${cl.sourceText}` : ""].filter(Boolean).join("\n\n");
    if (allText) content.push({ type: "text", text: `SOURCE DOCUMENTS:\n\n${allText.substring(0, 50000)}` });
    (cl.winningAds || []).slice(0, 6).forEach((img, i) => { content.push({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.base64 } }); content.push({ type: "text", text: `[WINNING AD ${i + 1}]` }); });
    (cl.losingAds || []).slice(0, 6).forEach((img, i) => { content.push({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.base64 } }); content.push({ type: "text", text: `[LOSING AD ${i + 1}]` }); });
    (cl.productPhotos || []).slice(0, 4).forEach((img, i) => { content.push({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.base64 } }); content.push({ type: "text", text: `[PRODUCT REF ${i + 1}]` }); });
    let bb = ""; const b = cl.brand || {};
    if (b.productName) bb += `Product: ${b.productName}`; if (b.category) bb += ` (${b.category})`; if (b.pricePoint) bb += `\nPrice: ${b.pricePoint}`; if (b.offer) bb += `\nOffer: ${b.offer}`; if (b.brandVoice) bb += `\nVoice: ${b.brandVoice}`; if (b.primaryColor) bb += `\nPrimary: ${b.primaryColor}`; if (b.secondaryColor) bb += `\nSecondary: ${b.secondaryColor}`;
    content.push({ type: "text", text: `${bb ? `BRAND:\n${bb}\n\n` : ""}Generate exactly ${promptCount} unique static ad prompts. Each completely different format. Use real data from source docs. End each with "[ASPECT_RATIO] aspect ratio."` });
    return content;
  };

  // ═══ ANALYZE ═══
  const runAnalysis = async () => {
    setIsAnalyzing(true); setError(null); setView("review");
    try {
      const res = await apiPost("/api/analyze", { model: "claude-sonnet-4-20250514", max_tokens: 16000, system: SYSTEM, messages: [{ role: "user", content: buildContent() }] });
      if (res.error) throw new Error(typeof res.error === "string" ? res.error : res.error.message);
      let text = (res.content?.[0]?.text || "").replace(/```json|```/g, "").trim();
      let parsed; try { parsed = JSON.parse(text); } catch (e) { let f = text; const ob=(f.match(/{/g)||[]).length,cb=(f.match(/}/g)||[]).length; for(let i=0;i<ob-cb;i++) f+="}"; const oq=(f.match(/\[/g)||[]).length,cq=(f.match(/\]/g)||[]).length; for(let i=0;i<oq-cq;i++) f+="]"; parsed=JSON.parse(f); }
      setAnalysis(parsed.brand_analysis); setPrompts(parsed.prompts || []);
    } catch (e) { setError(e.message); setView("generate"); }
    setIsAnalyzing(false);
  };

  const exportPrompts = () => {
    const lines = prompts.map((p, i) => `PROMPT ${i + 1}: ${p.title}\nFormat: ${p.format} | Angle: ${p.angle} | Awareness: ${p.awareness_level}\n\n${p.prompt}\n\n${"═".repeat(60)}\n`).join("\n");
    const blob = new Blob([`CREATIVE FACTORY — ${cl?.name || "Brand"}\nDate: ${new Date().toLocaleDateString()}\n${"═".repeat(60)}\n\n${lines}`], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `prompts-${cl?.name?.replace(/\s+/g, "-") || "brand"}-${new Date().toISOString().split("T")[0]}.txt`; a.click();
  };

  // ═══ GENERATE ═══
  const runGeneration = async () => {
    if (!prompts.length) return;
    setIsGenerating(true); setError(null); setView("generating"); abortRef.current = false;
    const jobs = []; for (const p of prompts) { for (const sk of selectedSizes) { const so = SIZES.find(s => s.key === sk); jobs.push({ ...p, sizeKey: sk, sizeLabel: so.label, ratio: so.ratio, prompt: (p.prompt || "").replace(/\[ASPECT_RATIO\]/g, so.ratio) }); } }
    setProgress({ current: 0, total: jobs.length, errors: 0 }); setResults([]);
    const productRefs = (cl.productPhotos || []).slice(0, 2).map(img => ({ base64: img.base64, mimeType: img.mimeType }));
    let errors = 0;
    for (let i = 0; i < jobs.length; i++) {
      if (abortRef.current) break;
      setProgress(p => ({ ...p, current: i + 1 }));
      const job = jobs[i];
      try {
        const images = modelInfo.type === "gemini" ? productRefs : [];
        const res = await apiPost("/api/generate", { prompt: job.prompt, images, model, modelType: modelInfo.type });
        if (res.error) {
          await new Promise(r => setTimeout(r, 3000));
          const res2 = await apiPost("/api/generate", { prompt: job.prompt, images, model, modelType: modelInfo.type });
          if (res2.image) { setResults(prev => [...prev, { ...job, idx: i, image: res2.image, mimeType: res2.mimeType, error: null }]); continue; }
          errors++; setProgress(p => ({ ...p, errors })); setResults(prev => [...prev, { ...job, idx: i, image: null, error: typeof res.error === "string" ? res.error : res.error.message }]);
        } else { setResults(prev => [...prev, { ...job, idx: i, image: res.image, mimeType: res.mimeType, error: null }]); }
      } catch (e) { errors++; setProgress(p => ({ ...p, errors })); setResults(prev => [...prev, { ...job, idx: i, image: null, error: e.message }]); }
      if (i < jobs.length - 1) await new Promise(r => setTimeout(r, 2500));
    }
    setIsGenerating(false); setView("gallery");
  };

  const downloadImage = (item) => { if (!item.image) return; const a = document.createElement("a"); a.href = "data:" + (item.mimeType || "image/png") + ";base64," + item.image; a.download = `ad-${String(item.id).padStart(2, "0")}-${(item.format || "ad").replace(/\s+/g, "-").toLowerCase()}-${item.sizeKey}.png`; a.click(); };
  const downloadAll = () => { results.filter(r => r.image).forEach((item, i) => setTimeout(() => downloadImage(item), i * 300)); };

  if (!loaded) return <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><style>{css}</style><div style={{ color: C.textDim }}>Loading...</div></div>;

  return <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
    <style>{css}</style>

    <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(0,0,0,.72)", backdropFilter: "blur(20px) saturate(180%)", borderBottom: `1px solid ${C.border}`, padding: "0 28px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Creative Factory</span>
          {saving && <span style={{ fontSize: 11, color: C.accent, animation: "pulse 1s infinite" }}>Saving</span>}
          {isAnalyzing && <span style={{ fontSize: 11, color: C.accent, animation: "pulse 1s infinite" }}>Analyzing...</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {successCount > 0 && <Btn v="pri" s="sm" onClick={downloadAll}>Download All ({successCount})</Btn>}
          {view !== "clients" && <Btn v="ghost" s="sm" onClick={() => { setView("clients"); setSelectedClient(null); setPrompts([]); setResults([]); setAnalysis(null); }}>All Clients</Btn>}
          {view === "clients" && <Btn v="pri" s="sm" onClick={() => setShowNewClient(true)}>New Client</Btn>}
        </div>
      </div>
    </nav>

    {error && <div style={{ background: C.red + "10", borderBottom: `1px solid ${C.red}25`, padding: "10px 28px" }}><div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, color: C.red }}>{error}</span><Btn v="ghost" s="sm" onClick={() => setError(null)}>Dismiss</Btn></div></div>}

    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 28px" }}>

      {/* ═══ CLIENT LIST ═══ */}
      {view === "clients" && <div className="fi">
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-.03em", marginBottom: 4 }}>Creative Factory</h1>
        <p style={{ fontSize: 15, color: C.textSec, marginBottom: 24 }}>Select a client to manage their brand assets and generate ads.</p>
        {data.clients.length === 0 ? <div style={{ textAlign: "center", padding: 60 }}><div style={{ fontSize: 15, fontWeight: 600, color: C.textSec, marginBottom: 8 }}>No clients yet</div><Btn v="pri" s="lg" onClick={() => setShowNewClient(true)}>New Client</Btn></div>
        : data.clients.map(c => (
          <div key={c.id} onClick={() => { setSelectedClient(c); setView("profile"); setPrompts([]); setResults([]); setAnalysis(null); }} style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, marginBottom: 8, padding: "18px 22px", cursor: "pointer", transition: "border-color .15s, transform .15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>{c.name}</div>
                <div style={{ display: "flex", gap: 8, fontSize: 12, color: C.textDim }}>
                  <span>{(c.sourceDocs || []).length} docs</span>
                  <span>{(c.winningAds || []).length} winners</span>
                  <span>{(c.losingAds || []).length} losers</span>
                  <span>{(c.productPhotos || []).length} products</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Btn v="ghost" s="sm" onClick={e => { e.stopPropagation(); deleteClient(c.id); }}>Delete</Btn>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            </div>
          </div>
        ))}
      </div>}

      {/* ═══ CLIENT PROFILE (manage saved assets) ═══ */}
      {view === "profile" && cl && <div className="fi">
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.03em", marginBottom: 4 }}>{cl.name}</h1>
        <p style={{ fontSize: 14, color: C.textSec, marginBottom: 20 }}>Manage brand assets. Everything saves automatically. When ready, hit Generate.</p>

        {/* Source Docs */}
        <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Source Documents <span style={{ fontSize: 11, color: C.textDim, fontWeight: 400 }}>({(cl.sourceDocs || []).length} files)</span></div>
            <span style={{ fontSize: 9, color: cl.sourceDocs?.length > 0 || cl.sourceText?.trim() ? C.green : C.red, fontWeight: 600 }}>{cl.sourceDocs?.length > 0 || cl.sourceText?.trim() ? "Ready" : "Required"}</span>
          </div>
          <div style={{ fontSize: 11, color: C.textDim, marginBottom: 12 }}>Brand DNA, reviews, persona docs, survey data. Upload .txt, .md, or .pdf files.</div>

          {(cl.sourceDocs || []).length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {cl.sourceDocs.map((d, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: C.surface2, borderRadius: 8, padding: "4px 10px" }}>
              <span style={{ fontSize: 11, color: C.green }}>📄</span>
              <span style={{ fontSize: 12, color: C.textSec }}>{d.name}</span>
              <span style={{ fontSize: 10, color: C.textDim }}>{(d.text.length / 1000).toFixed(1)}k</span>
              <button onClick={() => updateClient({ ...cl, sourceDocs: cl.sourceDocs.filter((_, idx) => idx !== i) })} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 12 }}>×</button>
            </div>)}
          </div>}

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input ref={docRef} type="file" accept=".txt,.md,.csv,.pdf,text/*,application/pdf" multiple style={{ display: "none" }} onChange={e => handleDocFiles(Array.from(e.target.files))} />
            <Btn v="sec" s="sm" onClick={() => docRef.current?.click()}>Upload Documents</Btn>
          </div>
          <Inp label="Or paste content directly" value={cl.sourceText} onChange={v => updateClient({ ...cl, sourceText: v })} placeholder="Paste brand DNA, reviews, persona research..." textarea rows={3} />
        </div>

        {/* Winning + Losing */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <ImageGrid images={cl.winningAds || []} onAdd={imgs => updateClient({ ...cl, winningAds: [...(cl.winningAds || []), ...imgs].slice(0, 6) })} onRemove={i => updateClient({ ...cl, winningAds: (cl.winningAds || []).filter((_, idx) => idx !== i) })} max={6} label="Winning Ads" desc="Top performing statics. Claude studies what works." />
          <ImageGrid images={cl.losingAds || []} onAdd={imgs => updateClient({ ...cl, losingAds: [...(cl.losingAds || []), ...imgs].slice(0, 6) })} onRemove={i => updateClient({ ...cl, losingAds: (cl.losingAds || []).filter((_, idx) => idx !== i) })} max={6} label="Losing Ads" desc="Ads that failed. Claude learns what to avoid." />
        </div>

        {/* Product Photos */}
        <ImageGrid images={cl.productPhotos || []} onAdd={imgs => updateClient({ ...cl, productPhotos: [...(cl.productPhotos || []), ...imgs].slice(0, 4) })} onRemove={i => updateClient({ ...cl, productPhotos: (cl.productPhotos || []).filter((_, idx) => idx !== i) })} max={4} label="Product Reference Photos" desc="Attached to every generation call. Gemini matches your product." required />

        {/* Brand Context */}
        <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Brand Context</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 10px" }}>
            <Inp label="Product Name" value={cl.brand?.productName} onChange={ub("productName")} placeholder="Glow Serum" compact />
            <Inp label="Category" value={cl.brand?.category} onChange={ub("category")} placeholder="Skincare" compact />
            <Inp label="Price" value={cl.brand?.pricePoint} onChange={ub("pricePoint")} placeholder="$39" compact />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 10px" }}>
            <Inp label="Offer" value={cl.brand?.offer} onChange={ub("offer")} placeholder="Buy 2 get 1 free" compact />
            <Inp label="Primary Color" value={cl.brand?.primaryColor} onChange={ub("primaryColor")} placeholder="#1a2b3c" compact />
            <Inp label="Secondary Color" value={cl.brand?.secondaryColor} onChange={ub("secondaryColor")} placeholder="#ffffff" compact />
          </div>
          <Inp label="Brand Voice" value={cl.brand?.brandVoice} onChange={ub("brandVoice")} placeholder="Clean, clinical, warm" compact />
        </div>

        <Btn v="pri" s="lg" full onClick={() => setView("generate")} disabled={!canGenerate}>
          {canGenerate ? "Configure & Generate Ads" : "Upload product photos + source docs first"}
        </Btn>
      </div>}

      {/* ═══ GENERATE CONFIG ═══ */}
      {view === "generate" && cl && <div className="fi">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.03em" }}>Generate for {cl.name}</h2>
            <div style={{ fontSize: 13, color: C.textDim, marginTop: 4 }}>{(cl.sourceDocs || []).length} docs · {(cl.winningAds || []).length} winners · {(cl.losingAds || []).length} losers · {(cl.productPhotos || []).length} products</div>
          </div>
          <Btn v="ghost" s="sm" onClick={() => setView("profile")}>Edit Assets</Btn>
        </div>

        <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textSec, marginBottom: 8 }}>How many prompts?</div>
            <div style={{ display: "flex", gap: 6 }}>{COUNTS.map(n => <Pill key={n} active={promptCount === n} onClick={() => setPromptCount(n)} color={C.accent}>{n}</Pill>)}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textSec, marginBottom: 8 }}>Sizes (each prompt × each size)</div>
            <div style={{ display: "flex", gap: 8 }}>{SIZES.map(s => { const a = selectedSizes.includes(s.key); return <button key={s.key} onClick={() => toggleSize(s.key)} style={{ flex: 1, padding: "12px 8px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", background: a ? C.accent + "10" : C.surface2, border: `2px solid ${a ? C.accent : C.border}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><div style={{ fontSize: 13, fontWeight: 600, color: a ? C.text : C.textSec }}>{s.label}</div><div style={{ fontSize: 10, color: C.textDim }}>{s.sub}</div></button>; })}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textSec, marginBottom: 8 }}>Model</div>
            <div style={{ display: "flex", gap: 6 }}>{MODELS.map(m => <button key={m.key} onClick={() => setModel(m.key)} style={{ padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", background: model === m.key ? C.accent + "15" : C.surface2, border: `1.5px solid ${model === m.key ? C.accent : C.border}` }}><div style={{ fontSize: 13, fontWeight: 600, color: model === m.key ? C.text : C.textSec }}>{m.label}</div><div style={{ fontSize: 10, color: C.textDim }}>${m.price}/img · {m.desc}</div></button>)}</div>
          </div>
        </div>

        <div style={{ background: C.accent + "08", borderRadius: 16, padding: 20, border: `1px solid ${C.accent}20`, marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{promptCount} prompts × {selectedSizes.length} size{selectedSizes.length > 1 ? "s" : ""} = {totalImages} images</div>
          <div style={{ fontSize: 13, color: C.textSec, marginTop: 4 }}>Est: ${(totalImages * modelInfo.price).toFixed(2)}</div>
        </div>
        <Btn v="pri" s="lg" full onClick={runAnalysis} disabled={isAnalyzing}>{isAnalyzing ? "Analyzing..." : `Generate ${promptCount} Prompts`}</Btn>
      </div>}

      {/* ═══ REVIEW ═══ */}
      {view === "review" && <div className="fi">
        {isAnalyzing ? <div style={{ textAlign: "center", padding: "80px 20px" }}><ProgressRing progress={40} size={64} /><h2 style={{ fontSize: 22, fontWeight: 600, marginTop: 20, marginBottom: 8 }}>Analyzing {cl?.name}</h2><p style={{ fontSize: 14, color: C.textSec, animation: "pulse 2s infinite" }}>Claude reading docs, studying winning/losing ads, writing {promptCount} prompts...</p><p style={{ fontSize: 13, color: C.textDim, marginTop: 6 }}>30-60 seconds</p></div>
        : <>
          {analysis && <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Brand Analysis</div>
            {analysis.positioning && <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6, marginBottom: 10 }}>{analysis.positioning}</div>}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {analysis.key_desires?.length > 0 && <div style={{ flex: 1, minWidth: 200 }}><div style={{ fontSize: 10, fontWeight: 600, color: C.green, marginBottom: 4 }}>DESIRES</div>{analysis.key_desires.map((d, i) => <div key={i} style={{ fontSize: 12, color: C.textSec }}>→ {d}</div>)}</div>}
              {analysis.winning_patterns?.length > 0 && <div style={{ flex: 1, minWidth: 200 }}><div style={{ fontSize: 10, fontWeight: 600, color: C.accent, marginBottom: 4 }}>WINNING</div>{analysis.winning_patterns.map((p, i) => <div key={i} style={{ fontSize: 12, color: C.textSec }}>✓ {p}</div>)}</div>}
              {analysis.losing_patterns?.length > 0 && <div style={{ flex: 1, minWidth: 200 }}><div style={{ fontSize: 10, fontWeight: 600, color: C.orange, marginBottom: 4 }}>LOSING</div>{analysis.losing_patterns.map((p, i) => <div key={i} style={{ fontSize: 12, color: C.textSec }}>✗ {p}</div>)}</div>}
            </div>
          </div>}
          <div style={{ background: C.accent + "08", borderRadius: 16, padding: 20, border: `1px solid ${C.accent}20`, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div><div style={{ fontSize: 18, fontWeight: 700 }}>{prompts.length} × {selectedSizes.length} = {prompts.length * selectedSizes.length} images</div><div style={{ fontSize: 13, color: C.textSec }}>Est: ${(prompts.length * selectedSizes.length * modelInfo.price).toFixed(2)}</div></div>
            <div style={{ display: "flex", gap: 8 }}><Btn v="sec" onClick={exportPrompts}>Export Prompts</Btn><Btn v="pri" s="lg" onClick={runGeneration}>Generate</Btn></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 8 }}>
            {prompts.map((p, i) => <div key={i} onClick={() => setExpandedPrompt(expandedPrompt === i ? null : i)} style={{ background: C.card, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}`, cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.borderColor = C.borderLight} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}><span style={{ fontSize: 11, fontWeight: 700, color: C.accent, background: C.accent + "20", width: 22, height: 22, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{p.id}</span><Pill color={C.teal}>{p.format}</Pill>{p.awareness_level && <Pill color={C.purple}>{p.awareness_level}</Pill>}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: C.textDim }}>{p.reasoning}</div>
              {expandedPrompt === i && <div style={{ marginTop: 10, padding: 12, background: C.surface2, borderRadius: 8, fontSize: 12, color: C.textSec, lineHeight: 1.6, maxHeight: 200, overflowY: "auto" }}>{p.prompt}</div>}
            </div>)}
          </div>
        </>}
      </div>}

      {/* ═══ GENERATING / GALLERY ═══ */}
      {(view === "generating" || view === "gallery") && <div className="fi">
        {isGenerating && <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, padding: "20px 24px", background: C.card, borderRadius: 16, border: `1px solid ${C.border}` }}><ProgressRing progress={Math.round((progress.current / progress.total) * 100)} /><div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 600 }}>Generating {progress.current} of {progress.total}</div><div style={{ fontSize: 13, color: C.textSec }}>{progress.errors > 0 ? progress.errors + " failed · " : ""}Auto-retries · Images appear live</div></div><Btn v="danger" s="sm" onClick={() => { abortRef.current = true; }}>Stop</Btn></div>}
        {!isGenerating && view === "gallery" && <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><h2 style={{ fontSize: 28, fontWeight: 700 }}>{successCount} images generated</h2><p style={{ fontSize: 14, color: C.textSec }}>Click to download. <span style={{ cursor: "pointer", color: C.accent }} onClick={() => { setView("generate"); setPrompts([]); setResults([]); }}>Run another batch</span></p></div><Btn v="sec" onClick={exportPrompts}>Export Prompts</Btn></div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          {results.map((item, fi) => <div key={fi} onClick={() => item.image && downloadImage(item)} style={{ width: 260, borderRadius: 14, overflow: "hidden", background: C.card, border: `1px solid ${C.border}`, cursor: item.image ? "pointer" : "default", transition: "transform .15s" }} onMouseEnter={e => { if (item.image) e.currentTarget.style.transform = "scale(1.02)"; }} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
            {item.image ? <img src={"data:" + (item.mimeType || "image/png") + ";base64," + item.image} alt="" style={{ width: "100%", display: "block" }} />
              : item.error ? <div style={{ width: "100%", height: 180, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: C.red + "06" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>Failed</div><div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>{item.error.substring(0, 60)}</div></div></div>
              : <div style={{ width: "100%", height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: C.surface2 }}><span style={{ fontSize: 12, color: C.accent, animation: "pulse 1.5s infinite" }}>Generating...</span></div>}
            <div style={{ padding: "10px 12px" }}><div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}><span style={{ fontSize: 10, fontWeight: 700, color: C.accent }}>#{item.id}</span><Pill color={C.teal}>{item.format}</Pill><span style={{ fontSize: 10, color: C.textDim }}>{item.sizeLabel}</span></div><div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div></div>
          </div>)}
        </div>
      </div>}
    </div>

    {showNewClient && <Modal title="New Client" onClose={() => setShowNewClient(false)}>
      <Inp label="Client Name" value={newName} onChange={setNewName} placeholder="Brand name" />
      <Btn v="pri" full onClick={createClient} disabled={!newName.trim()}>Create</Btn>
    </Modal>}

    <footer style={{ padding: "24px 28px", textAlign: "center", marginTop: 40 }}><p style={{ fontSize: 12, color: C.textDim }}>Creative Factory v8 · D-DOUBLEU MEDIA</p></footer>
  </div>;
}
