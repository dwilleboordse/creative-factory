import { useState, useEffect, useRef, useCallback } from "react";

const C={bg:"#000",surface:"#0d0d0d",surface2:"#161616",surface3:"#1c1c1e",card:"#1c1c1e",border:"rgba(255,255,255,0.08)",borderLight:"rgba(255,255,255,0.12)",text:"#f5f5f7",textSec:"#86868b",textDim:"#48484a",accent:"#0a84ff",green:"#30d158",red:"#ff453a",orange:"#ff9f0a",purple:"#bf5af2",teal:"#64d2ff",yellow:"#ffd60a",pink:"#ff375f"};
const css=`*{margin:0;padding:0;box-sizing:border-box}body{background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',sans-serif;-webkit-font-smoothing:antialiased}::selection{background:${C.accent}40}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.textDim};border-radius:3px}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes spin{to{transform:rotate(360deg)}}.fi{animation:fadeIn .3s ease-out forwards}`;
const genId=()=>Math.random().toString(36).substring(2,10);

const SIZES=[{key:"1080x1080",label:"1080×1080",sub:"1:1",ratio:"1:1"},{key:"1080x1350",label:"1080×1350",sub:"4:5",ratio:"4:5"},{key:"1080x1920",label:"1080×1920",sub:"9:16",ratio:"9:16"}];
const MODELS=[{key:"gemini-2.5-flash-image",label:"Gemini Flash",price:0.039,desc:"Uses product refs · Good text",type:"gemini"},{key:"imagen-4.0-generate-001",label:"Imagen 4",price:0.04,desc:"Best text rendering",type:"imagen"},{key:"imagen-4.0-fast-generate-001",label:"Imagen 4 Fast",price:0.02,desc:"Fast · Decent text",type:"imagen"}];
const COUNTS=[10,20,30,40];

async function apiGet(p){return(await fetch(p)).json();}
async function apiPost(p,b){return(await fetch(p,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)})).json();}

// ═══ SYSTEM PROMPTS ═══
const GEN_SYSTEM=`You are a world-class direct response creative strategist with $50M+ in managed ad spend. Breakthrough Advertising principles deeply internalized.

You have a complete brand package: source docs (brand DNA, reviews, persona, surveys), winning ads (study what works), losing ads (avoid these patterns), and product reference photos.

Generate completely unique static ad prompts. Each a DIFFERENT format, angle, and visual approach.

PROMPT RULES:
- Start with "Use the attached product reference images. Match the exact product design, colors, and packaging precisely."
- Describe COMPLETE composition: background, product, all text with exact words, typography, colors, lighting
- Use REAL data from source docs: actual review quotes, real stats, real customer language
- Each ad completely different format: review cards, UGC native, product hero, comparison, editorial, copy-led, social proof, stat callout, testimonial, manifesto, offer/promo, feature callout, bold statement, faux press, etc.

TEXT RENDERING RULES:
- Headlines: MAX 5 words, ALL CAPS. "GLOW IN 14 DAYS" not "Get Your Natural Glow Back In Just 14 Days"
- Subheads: max 8 words
- Review quotes: one short sentence, 5-8 words max
- Numbers/stats render well: "4.8", "12K+", "$39", "93%"
- Avoid apostrophes, quotation marks, ampersands in image text
- Max 4 text elements per ad
- Always include: "All text must be rendered with perfect spelling and clean typography."
- Every prompt ends with "[ASPECT_RATIO] aspect ratio."

Respond ONLY in valid JSON:
{"brand_analysis":{"positioning":"","key_desires":[],"key_objections":[],"proof_points":[],"winning_patterns":[],"losing_patterns":[]},"prompts":[{"id":1,"title":"","format":"","angle":"","awareness_level":"","prompt":"","reasoning":""}]}`;

const TRANSFORM_SYSTEM=`You are a world-class ad creative director. You recreate existing ads for a different brand.

You receive:
- REFERENCE ADS: 1-5 ads to recreate (from competitors, other brands, or past campaigns)
- BRAND PACKAGE: The target brand's source docs, product photos, brand context
- INSTRUCTIONS: Specific directions from the creative team

For EACH reference ad:
1. Analyze the EXACT layout (where text sits, product placement, background, graphic elements, splits, overlays)
2. Identify ALL text content (headlines, subheads, offers, CTAs)
3. Note the visual style (colors, typography, photography, mood)
4. Generate a NEW prompt that keeps the SAME layout structure but transforms everything to the target brand

The layout and composition must stay the same. Only the brand, text, colors, and theme change.

TEXT RENDERING RULES:
- Headlines: MAX 5 words, ALL CAPS
- Subheads: max 8 words
- Max 4 text elements per ad
- Avoid apostrophes, quotation marks, ampersands
- Always include: "All text must be rendered with perfect spelling and clean typography."

Each prompt starts with "Use the attached product reference images. Match the exact product design precisely."
Each prompt ends with "[ASPECT_RATIO] aspect ratio."

Respond ONLY in valid JSON:
{"transformations":[{"index":0,"original_description":"What the original ad looks like","original_text":{"headline":"","sub":"","offer":"","cta":""},"new_text":{"headline":"","sub":"","offer":"","cta":""},"prompt":"Full generation prompt","reasoning":"Why this transformation works"}]}`;

// ═══ FILE UTILS ═══
function compressImage(file,mx=600){return new Promise(r=>{const rd=new FileReader();rd.onload=e=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");let w=img.width,h=img.height;if(w>mx||h>mx){const ra=Math.min(mx/w,mx/h);w=Math.round(w*ra);h=Math.round(h*ra);}c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);r({base64:c.toDataURL("image/jpeg",.6).split(",")[1],mimeType:"image/jpeg",preview:c.toDataURL("image/jpeg",.3),name:file.name,width:img.width,height:img.height});};img.src=e.target.result;};rd.readAsDataURL(file);});}
function readTextFile(f){return new Promise(r=>{const rd=new FileReader();rd.onload=e=>r({name:f.name,text:e.target.result});rd.readAsText(f);});}
async function readPdfFile(f){const ab=await f.arrayBuffer();const lib=await loadPdfJs();const pdf=await lib.getDocument({data:ab}).promise;let t="";for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i);const c=await p.getTextContent();t+=c.items.map(it=>it.str).join(" ")+"\n";}return{name:f.name,text:t.trim()};}
let _pdfjs=null;function loadPdfJs(){if(_pdfjs)return Promise.resolve(_pdfjs);return new Promise((res,rej)=>{if(window.pdfjsLib){_pdfjs=window.pdfjsLib;res(_pdfjs);return;}const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";s.onload=()=>{const l=window.pdfjsLib;l.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";_pdfjs=l;res(l);};s.onerror=()=>rej(new Error("PDF.js failed"));document.head.appendChild(s);});}

// ═══ UI ═══
function Btn({children,onClick,v="sec",s="md",disabled,full}){const vs={pri:{bg:C.accent,c:"#fff",b:"none"},sec:{bg:C.surface3,c:C.text,b:`1px solid ${C.border}`},ghost:{bg:"transparent",c:C.textSec,b:"none"},danger:{bg:C.red+"18",c:C.red,b:`1px solid ${C.red}30`}};const ss={sm:{p:"6px 14px",f:12},md:{p:"10px 20px",f:14},lg:{p:"14px 28px",f:15}};const vv=vs[v]||vs.sec,sz=ss[s]||ss.md;return <button onClick={onClick} disabled={disabled} style={{padding:sz.p,fontSize:sz.f,fontFamily:"inherit",fontWeight:500,borderRadius:10,cursor:disabled?"default":"pointer",opacity:disabled?.35:1,transition:"all .2s",width:full?"100%":"auto",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,background:vv.bg,color:vv.c,border:vv.b}}>{children}</button>;}
function Inp({label,value,onChange,placeholder,textarea,rows=3,hint,compact}){const sh={width:"100%",fontFamily:"inherit",fontSize:14,color:C.text,background:C.surface2,border:`1px solid ${C.border}`,borderRadius:10,padding:compact?"8px 12px":"12px 16px",outline:"none"};return <div style={{marginBottom:compact?8:12}}>{label&&<label style={{display:"block",fontSize:12,fontWeight:500,color:C.textSec,marginBottom:hint?2:6}}>{label}</label>}{hint&&<div style={{fontSize:11,color:C.textDim,marginBottom:6}}>{hint}</div>}{textarea?<textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...sh,resize:"vertical",lineHeight:1.5}}/>:<input value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={sh}/>}</div>;}
function Pill({children,color,active,onClick}){const a=active!==undefined?active:true;return <button onClick={onClick} style={{fontSize:11,fontWeight:600,padding:"4px 12px",borderRadius:16,cursor:onClick?"pointer":"default",fontFamily:"inherit",background:a?(color||C.accent)+"15":"transparent",color:a?(color||C.accent):C.textDim,border:`1px solid ${a?(color||C.accent)+"40":C.border}`,whiteSpace:"nowrap"}}>{children}</button>;}
function PR({progress,size=48}){const r=(size-4)/2;const ci=2*Math.PI*r;const off=ci-(progress/100)*ci;return <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.surface3} strokeWidth="4"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.accent} strokeWidth="4" strokeDasharray={ci} strokeDashoffset={off} strokeLinecap="round"/></svg>;}
function Modal({children,onClose,title}){return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}><div onClick={e=>e.stopPropagation()} className="fi" style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto"}}><div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:16,fontWeight:600}}>{title}</span><button onClick={onClose} style={{width:26,height:26,borderRadius:13,background:C.surface3,border:"none",color:C.textSec,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button></div><div style={{padding:20}}>{children}</div></div></div>;}

function ImageGrid({images,onAdd,onRemove,max,label,desc,required}){
  const ref=useRef(null);
  const hf=async(files)=>{const p=[];for(const f of files){if(f.type.startsWith("image/")&&images.length+p.length<max)p.push(await compressImage(f));}if(p.length)onAdd(p);};
  return <div style={{background:C.card,borderRadius:14,padding:16,border:`1px solid ${images.length>0?C.accent+"30":C.border}`,marginBottom:12}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:13,fontWeight:600,color:images.length>0?C.text:C.textSec}}>{label} ({images.length}/{max})</span>{required&&<span style={{fontSize:9,color:C.red,fontWeight:600}}>Required</span>}</div>
    <div style={{fontSize:11,color:C.textDim,marginBottom:10}}>{desc}</div>
    {images.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>{images.map((img,i)=><div key={i} style={{position:"relative",borderRadius:8,overflow:"hidden"}}><img src={img.preview||("data:image/jpeg;base64,"+img.base64)} alt="" style={{height:72,width:"auto",display:"block",borderRadius:8}}/><button onClick={()=>onRemove(i)} style={{position:"absolute",top:2,right:2,width:18,height:18,borderRadius:9,background:C.red,color:"#fff",border:"none",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button></div>)}</div>}
    <input ref={ref} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>hf(Array.from(e.target.files))}/>
    {images.length<max&&<button onClick={()=>ref.current?.click()} style={{width:"100%",padding:10,borderRadius:8,background:C.surface2,border:`1px dashed ${C.borderLight}`,color:C.textSec,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{images.length>0?"Add More":"Upload"}</button>}
  </div>;
}

// ═══ IMAGE RESULT CARD ═══
function ResultCard({item,onDownload}){
  return <div onClick={()=>item.image&&onDownload(item)} style={{width:260,borderRadius:14,overflow:"hidden",background:C.card,border:`1px solid ${C.border}`,cursor:item.image?"pointer":"default",transition:"transform .15s"}} onMouseEnter={e=>{if(item.image)e.currentTarget.style.transform="scale(1.02)";}} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
    {item.image?<img src={"data:"+(item.mimeType||"image/png")+";base64,"+item.image} alt="" style={{width:"100%",display:"block"}}/>
    :item.error?<div style={{width:"100%",height:180,display:"flex",alignItems:"center",justifyContent:"center",padding:16,background:C.red+"06"}}><div style={{textAlign:"center"}}><div style={{fontSize:12,color:C.red,fontWeight:600}}>Failed</div><div style={{fontSize:10,color:C.textDim,marginTop:4}}>{item.error.substring(0,60)}</div></div></div>
    :<div style={{width:"100%",height:180,display:"flex",alignItems:"center",justifyContent:"center",background:C.surface2}}><span style={{fontSize:12,color:C.accent,animation:"pulse 1.5s infinite"}}>Generating...</span></div>}
    <div style={{padding:"10px 12px"}}><div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>{item.id&&<span style={{fontSize:10,fontWeight:700,color:C.accent}}>#{item.id}</span>}<Pill color={C.teal}>{item.format||item.sizeLabel||"Ad"}</Pill>{item.sizeLabel&&item.id&&<span style={{fontSize:10,color:C.textDim}}>{item.sizeLabel}</span>}</div><div style={{fontSize:13,fontWeight:600}}>{item.title||""}</div></div>
  </div>;
}

// ═══ MAIN APP ═══
export default function App(){
  const [data,setData]=useState({clients:[]});const [loaded,setLoaded]=useState(false);const [saving,setSaving]=useState(false);
  const [view,setView]=useState("clients"); // clients | profile | generate | genReview | generating | gallery | transform | txReview | txGenerating | txGallery
  const [selectedClient,setSelectedClient]=useState(null);const [clientMode,setClientMode]=useState("generate"); // generate | transform
  const [showNewClient,setShowNewClient]=useState(false);const [newName,setNewName]=useState("");const [error,setError]=useState(null);

  // Generate state
  const [promptCount,setPromptCount]=useState(30);const [selectedSizes,setSelectedSizes]=useState(["1080x1350"]);const [model,setModel]=useState(MODELS[0].key);
  const [analysis,setAnalysis]=useState(null);const [prompts,setPrompts]=useState([]);const [results,setResults]=useState([]);
  const [progress,setProgress]=useState({current:0,total:0,errors:0});const [isWorking,setIsWorking]=useState(false);
  const [expandedPrompt,setExpandedPrompt]=useState(null);const abortRef=useRef(false);const docRef=useRef(null);

  // Transform state
  const [txAds,setTxAds]=useState([]);const [txInstructions,setTxInstructions]=useState("");
  const [txAnalysis,setTxAnalysis]=useState(null);const [txResults,setTxResults]=useState([]);
  const [txProgress,setTxProgress]=useState({current:0,total:0,errors:0});

  useEffect(()=>{apiGet("/api/data").then(d=>{setData(d);setLoaded(true);});},[]);
  const save=useCallback(async(nd)=>{setData(nd);setSaving(true);await apiPost("/api/data",nd);setSaving(false);},[]);
  const updateClient=(uc)=>{const nd={...data,clients:data.clients.map(c=>c.id===uc.id?uc:c)};save(nd);setSelectedClient(uc);};

  const createClient=()=>{if(!newName.trim())return;const nc={id:genId(),name:newName.trim(),createdAt:new Date().toISOString(),brand:{productName:"",category:"",pricePoint:"",offer:"",brandVoice:"",primaryColor:"",secondaryColor:""},sourceDocs:[],sourceText:"",winningAds:[],losingAds:[],productPhotos:[]};save({...data,clients:[...data.clients,nc]});setNewName("");setShowNewClient(false);setSelectedClient(nc);setView("profile");};
  const deleteClient=(id)=>{if(!confirm("Delete?"))return;save({...data,clients:data.clients.filter(c=>c.id!==id)});if(selectedClient?.id===id){setSelectedClient(null);setView("clients");}};

  const cl=selectedClient;const ub=(k)=>(v)=>updateClient({...cl,brand:{...cl.brand,[k]:v}});
  const modelInfo=MODELS.find(m=>m.key===model)||MODELS[0];const totalImages=promptCount*selectedSizes.length;
  const canGenerate=cl&&cl.productPhotos?.length>=1&&(cl.sourceDocs?.length>0||cl.sourceText?.trim());
  const successCount=results.filter(r=>r.image).length;const txSuccessCount=txResults.filter(r=>r.image).length;
  const toggleSize=(k)=>{if(selectedSizes.includes(k)){if(selectedSizes.length>1)setSelectedSizes(p=>p.filter(s=>s!==k));}else setSelectedSizes(p=>[...p,k]);};

  const handleDocFiles=async(files)=>{const nd=[];for(const f of files){if(f.name.endsWith(".pdf")||f.type==="application/pdf"){try{nd.push(await readPdfFile(f));}catch(e){setError("PDF: "+e.message);}}else if(f.name.endsWith(".txt")||f.name.endsWith(".md")||f.name.endsWith(".csv")||f.type.startsWith("text/")){nd.push(await readTextFile(f));}}if(nd.length)updateClient({...cl,sourceDocs:[...(cl.sourceDocs||[]),...nd]});};

  const TEXT_BOOST=" CRITICAL: All text must be rendered with PERFECT spelling — no typos. Spell every word exactly. Clean crisp professional typography.";

  // ═══ BUILD GENERATE CONTENT ═══
  const buildGenContent=()=>{
    const content=[];
    const allText=[...(cl.sourceDocs||[]).map(d=>`--- ${d.name} ---\n${d.text}`),cl.sourceText?.trim()?`--- Pasted ---\n${cl.sourceText}`:""].filter(Boolean).join("\n\n");
    if(allText)content.push({type:"text",text:`SOURCE DOCUMENTS:\n\n${allText.substring(0,50000)}`});
    (cl.winningAds||[]).slice(0,6).forEach((img,i)=>{content.push({type:"image",source:{type:"base64",media_type:img.mimeType,data:img.base64}});content.push({type:"text",text:`[WINNING AD ${i+1}]`});});
    (cl.losingAds||[]).slice(0,6).forEach((img,i)=>{content.push({type:"image",source:{type:"base64",media_type:img.mimeType,data:img.base64}});content.push({type:"text",text:`[LOSING AD ${i+1}]`});});
    (cl.productPhotos||[]).slice(0,4).forEach((img,i)=>{content.push({type:"image",source:{type:"base64",media_type:img.mimeType,data:img.base64}});content.push({type:"text",text:`[PRODUCT REF ${i+1}]`});});
    let bb="";const b=cl.brand||{};if(b.productName)bb+=`Product: ${b.productName}`;if(b.category)bb+=` (${b.category})`;if(b.pricePoint)bb+=`\nPrice: ${b.pricePoint}`;if(b.offer)bb+=`\nOffer: ${b.offer}`;if(b.brandVoice)bb+=`\nVoice: ${b.brandVoice}`;if(b.primaryColor)bb+=`\nPrimary: ${b.primaryColor}`;if(b.secondaryColor)bb+=`\nSecondary: ${b.secondaryColor}`;
    content.push({type:"text",text:`${bb?`BRAND:\n${bb}\n\n`:""}Generate exactly ${promptCount} unique static ad prompts. Each completely different. Use real data. End each with "[ASPECT_RATIO] aspect ratio."`});
    return content;
  };

  // ═══ BUILD TRANSFORM CONTENT ═══
  const buildTxContent=()=>{
    const content=[];
    // Reference ads to transform
    txAds.forEach((img,i)=>{content.push({type:"image",source:{type:"base64",media_type:img.mimeType,data:img.base64}});content.push({type:"text",text:`[REFERENCE AD ${i+1} — recreate this for the target brand]`});});
    // Brand package
    const allText=[...(cl.sourceDocs||[]).map(d=>`--- ${d.name} ---\n${d.text}`),cl.sourceText?.trim()?`--- Pasted ---\n${cl.sourceText}`:""].filter(Boolean).join("\n\n");
    if(allText)content.push({type:"text",text:`TARGET BRAND SOURCE DOCS:\n\n${allText.substring(0,30000)}`});
    (cl.productPhotos||[]).slice(0,4).forEach((img,i)=>{content.push({type:"image",source:{type:"base64",media_type:img.mimeType,data:img.base64}});content.push({type:"text",text:`[TARGET BRAND PRODUCT ${i+1}]`});});
    let bb="";const b=cl.brand||{};if(b.productName)bb+=`Product: ${b.productName}`;if(b.category)bb+=` (${b.category})`;if(b.pricePoint)bb+=`\nPrice: ${b.pricePoint}`;if(b.offer)bb+=`\nOffer: ${b.offer}`;if(b.brandVoice)bb+=`\nVoice: ${b.brandVoice}`;if(b.primaryColor)bb+=`\nPrimary: ${b.primaryColor}`;if(b.secondaryColor)bb+=`\nSecondary: ${b.secondaryColor}`;
    let instructions=`TARGET BRAND:\n${bb}\n\nRecreate each of the ${txAds.length} reference ads for this brand. Keep the EXACT layout structure but transform all text, colors, and branding.`;
    if(txInstructions.trim())instructions+=`\n\nADDITIONAL INSTRUCTIONS:\n${txInstructions}`;
    content.push({type:"text",text:instructions});
    return content;
  };

  // ═══ PARSE JSON ═══
  const parseJSON=(text)=>{let t=text.replace(/```json|```/g,"").trim();try{return JSON.parse(t);}catch(e){let f=t;const ob=(f.match(/{/g)||[]).length,cb=(f.match(/}/g)||[]).length;for(let i=0;i<ob-cb;i++)f+="}";const oq=(f.match(/\[/g)||[]).length,cq=(f.match(/\]/g)||[]).length;for(let i=0;i<oq-cq;i++)f+="]";return JSON.parse(f);}};

  // ═══ RUN GENERATE ═══
  const runGenerate=async()=>{
    setIsWorking(true);setError(null);setView("genReview");
    try{
      const res=await apiPost("/api/analyze",{model:"claude-sonnet-4-20250514",max_tokens:16000,system:GEN_SYSTEM,messages:[{role:"user",content:buildGenContent()}]});
      if(res.error)throw new Error(typeof res.error==="string"?res.error:res.error.message);
      const parsed=parseJSON(res.content?.[0]?.text||"");
      setAnalysis(parsed.brand_analysis);setPrompts(parsed.prompts||[]);
    }catch(e){setError(e.message);setView("generate");}
    setIsWorking(false);
  };

  // ═══ RUN TRANSFORM ANALYSIS ═══
  const runTransform=async()=>{
    setIsWorking(true);setError(null);setView("txReview");
    try{
      const res=await apiPost("/api/analyze",{model:"claude-sonnet-4-20250514",max_tokens:16000,system:TRANSFORM_SYSTEM,messages:[{role:"user",content:buildTxContent()}]});
      if(res.error)throw new Error(typeof res.error==="string"?res.error:res.error.message);
      const parsed=parseJSON(res.content?.[0]?.text||"");
      setTxAnalysis(parsed.transformations||[]);
    }catch(e){setError(e.message);setView("transform");}
    setIsWorking(false);
  };

  // ═══ GENERATE IMAGES (shared logic) ═══
  const runImageGen=async(jobs,setRes,setProg,viewDone)=>{
    setIsWorking(true);setError(null);abortRef.current=false;
    setProg({current:0,total:jobs.length,errors:0});setRes([]);
    const productRefs=(cl.productPhotos||[]).slice(0,2).map(img=>({base64:img.base64,mimeType:img.mimeType}));
    let errors=0;
    for(let i=0;i<jobs.length;i++){
      if(abortRef.current)break;setProg(p=>({...p,current:i+1}));const job=jobs[i];
      try{
        const images=modelInfo.type==="gemini"?productRefs:[];
        const res=await apiPost("/api/generate",{prompt:job.prompt+TEXT_BOOST,images,model,modelType:modelInfo.type});
        if(res.error){await new Promise(r=>setTimeout(r,3000));const r2=await apiPost("/api/generate",{prompt:job.prompt+TEXT_BOOST,images,model,modelType:modelInfo.type});
          if(r2.image){setRes(prev=>[...prev,{...job,idx:i,image:r2.image,mimeType:r2.mimeType,error:null}]);continue;}
          errors++;setProg(p=>({...p,errors}));setRes(prev=>[...prev,{...job,idx:i,image:null,error:typeof res.error==="string"?res.error:res.error.message}]);
        }else{setRes(prev=>[...prev,{...job,idx:i,image:res.image,mimeType:res.mimeType,error:null}]);}
      }catch(e){errors++;setProg(p=>({...p,errors}));setRes(prev=>[...prev,{...job,idx:i,image:null,error:e.message}]);}
      if(i<jobs.length-1)await new Promise(r=>setTimeout(r,2500));
    }
    setIsWorking(false);setView(viewDone);
  };

  const startGenImages=()=>{
    const jobs=[];for(const p of prompts){for(const sk of selectedSizes){const so=SIZES.find(s=>s.key===sk);jobs.push({...p,sizeKey:sk,sizeLabel:so.label,ratio:so.ratio,prompt:(p.prompt||"").replace(/\[ASPECT_RATIO\]/g,so.ratio)});}}
    setView("generating");runImageGen(jobs,setResults,setProgress,"gallery");
  };
  const startTxImages=()=>{
    const jobs=[];txAnalysis.forEach((tx,i)=>{selectedSizes.forEach(sk=>{const so=SIZES.find(s=>s.key===sk);const r=so.ratio;const prompt=(tx.prompt||"").replace(/\[ASPECT_RATIO\]/g,r);jobs.push({...tx,id:i+1,title:tx.new_text?.headline||`Ad ${i+1}`,format:"Transform",sizeKey:sk,sizeLabel:so.label,ratio:r,prompt,originalIndex:tx.index||i});});});
    setView("txGenerating");runImageGen(jobs,setTxResults,setTxProgress,"txGallery");
  };

  const dl=(item,prefix)=>{if(!item.image)return;const a=document.createElement("a");a.href="data:"+(item.mimeType||"image/png")+";base64,"+item.image;a.download=`${prefix}-${String(item.id||item.idx+1).padStart(2,"0")}-${item.sizeKey}.png`;a.click();};
  const dlAll=(items,prefix)=>{items.filter(r=>r.image).forEach((item,i)=>setTimeout(()=>dl(item,prefix),i*300));};

  const exportPrompts=()=>{const lines=prompts.map((p,i)=>`#${i+1}: ${p.title} (${p.format})\n${p.prompt}\n${"─".repeat(60)}\n`).join("\n");const blob=new Blob([`CREATIVE FACTORY — ${cl?.name}\n${new Date().toLocaleDateString()}\n${"═".repeat(60)}\n\n${lines}`],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`prompts-${cl?.name?.replace(/\s+/g,"-")||"brand"}-${new Date().toISOString().split("T")[0]}.txt`;a.click();};

  const goClient=(c)=>{setSelectedClient(c);setView("profile");setPrompts([]);setResults([]);setAnalysis(null);setTxAds([]);setTxInstructions("");setTxAnalysis(null);setTxResults([]);setClientMode("generate");};

  if(!loaded)return <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><style>{css}</style><div style={{color:C.textDim}}>Loading...</div></div>;

  return <div style={{background:C.bg,minHeight:"100vh",color:C.text}}>
    <style>{css}</style>

    <nav style={{position:"sticky",top:0,zIndex:100,background:"rgba(0,0,0,.72)",backdropFilter:"blur(20px) saturate(180%)",borderBottom:`1px solid ${C.border}`,padding:"0 28px"}}>
      <div style={{maxWidth:1000,margin:"0 auto",height:52,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:15,fontWeight:600}}>Creative Factory</span>
          {saving&&<span style={{fontSize:11,color:C.accent,animation:"pulse 1s infinite"}}>Saving</span>}
          {isWorking&&<span style={{fontSize:11,color:C.accent,animation:"pulse 1s infinite"}}>Working...</span>}
        </div>
        <div style={{display:"flex",gap:8}}>
          {(successCount>0||txSuccessCount>0)&&<Btn v="pri" s="sm" onClick={()=>view==="gallery"?dlAll(results,"gen"):dlAll(txResults,"tx")}>Download All ({view==="gallery"?successCount:txSuccessCount})</Btn>}
          {view!=="clients"&&<Btn v="ghost" s="sm" onClick={()=>{setView("clients");setSelectedClient(null);}}>All Clients</Btn>}
          {view==="clients"&&<Btn v="pri" s="sm" onClick={()=>setShowNewClient(true)}>New Client</Btn>}
        </div>
      </div>
    </nav>

    {error&&<div style={{background:C.red+"10",borderBottom:`1px solid ${C.red}25`,padding:"10px 28px"}}><div style={{maxWidth:1000,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,color:C.red}}>{error}</span><Btn v="ghost" s="sm" onClick={()=>setError(null)}>×</Btn></div></div>}

    <div style={{maxWidth:1000,margin:"0 auto",padding:"32px 28px"}}>

      {/* ═══ CLIENT LIST ═══ */}
      {view==="clients"&&<div className="fi">
        <h1 style={{fontSize:32,fontWeight:700,letterSpacing:"-.03em",marginBottom:24}}>Creative Factory</h1>
        {data.clients.length===0?<div style={{textAlign:"center",padding:60}}><Btn v="pri" s="lg" onClick={()=>setShowNewClient(true)}>New Client</Btn></div>
        :data.clients.map(c=><div key={c.id} onClick={()=>goClient(c)} style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,marginBottom:8,padding:"18px 22px",cursor:"pointer",transition:"all .15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.borderLight} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><div style={{fontSize:17,fontWeight:600,marginBottom:4}}>{c.name}</div><div style={{fontSize:12,color:C.textDim}}>{(c.sourceDocs||[]).length} docs · {(c.winningAds||[]).length}W · {(c.losingAds||[]).length}L · {(c.productPhotos||[]).length} products</div></div>
          <div style={{display:"flex",gap:8}}><Btn v="ghost" s="sm" onClick={e=>{e.stopPropagation();deleteClient(c.id);}}>Delete</Btn><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></div></div>
        </div>)}
      </div>}

      {/* ═══ PROFILE ═══ */}
      {view==="profile"&&cl&&<div className="fi">
        <h1 style={{fontSize:28,fontWeight:700,letterSpacing:"-.03em",marginBottom:4}}>{cl.name}</h1>
        <p style={{fontSize:14,color:C.textSec,marginBottom:16}}>Manage brand assets. Everything saves automatically.</p>

        {/* Source Docs */}
        <div style={{background:C.card,borderRadius:16,padding:20,border:`1px solid ${C.border}`,marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>Source Documents ({(cl.sourceDocs||[]).length})</div>
          <div style={{fontSize:11,color:C.textDim,marginBottom:12}}>Brand DNA, reviews, persona docs. Upload .txt, .md, .pdf</div>
          {(cl.sourceDocs||[]).length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>{cl.sourceDocs.map((d,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,background:C.surface2,borderRadius:8,padding:"4px 10px"}}><span style={{fontSize:11,color:C.green}}>📄</span><span style={{fontSize:12,color:C.textSec}}>{d.name}</span><button onClick={()=>updateClient({...cl,sourceDocs:cl.sourceDocs.filter((_,idx)=>idx!==i)})} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:12}}>×</button></div>)}</div>}
          <div style={{display:"flex",gap:8,marginBottom:10}}><input ref={docRef} type="file" accept=".txt,.md,.csv,.pdf,text/*,application/pdf" multiple style={{display:"none"}} onChange={e=>handleDocFiles(Array.from(e.target.files))}/><Btn v="sec" s="sm" onClick={()=>docRef.current?.click()}>Upload Documents</Btn></div>
          <Inp label="Or paste content" value={cl.sourceText} onChange={v=>updateClient({...cl,sourceText:v})} placeholder="Paste brand DNA, reviews..." textarea rows={3}/>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <ImageGrid images={cl.winningAds||[]} onAdd={imgs=>updateClient({...cl,winningAds:[...(cl.winningAds||[]),...imgs].slice(0,6)})} onRemove={i=>updateClient({...cl,winningAds:(cl.winningAds||[]).filter((_,idx)=>idx!==i)})} max={6} label="Winning Ads" desc="Top performers. Claude studies what works."/>
          <ImageGrid images={cl.losingAds||[]} onAdd={imgs=>updateClient({...cl,losingAds:[...(cl.losingAds||[]),...imgs].slice(0,6)})} onRemove={i=>updateClient({...cl,losingAds:(cl.losingAds||[]).filter((_,idx)=>idx!==i)})} max={6} label="Losing Ads" desc="Failed ads. Claude avoids these patterns."/>
        </div>
        <ImageGrid images={cl.productPhotos||[]} onAdd={imgs=>updateClient({...cl,productPhotos:[...(cl.productPhotos||[]),...imgs].slice(0,4)})} onRemove={i=>updateClient({...cl,productPhotos:(cl.productPhotos||[]).filter((_,idx)=>idx!==i)})} max={4} label="Product Photos" desc="Attached to every generation." required/>

        <div style={{background:C.card,borderRadius:16,padding:20,border:`1px solid ${C.border}`,marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>Brand Context</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 10px"}}><Inp label="Product" value={cl.brand?.productName} onChange={ub("productName")} placeholder="Name" compact/><Inp label="Category" value={cl.brand?.category} onChange={ub("category")} placeholder="Skincare" compact/><Inp label="Price" value={cl.brand?.pricePoint} onChange={ub("pricePoint")} placeholder="$39" compact/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 10px"}}><Inp label="Offer" value={cl.brand?.offer} onChange={ub("offer")} placeholder="Buy 2 get 1" compact/><Inp label="Primary" value={cl.brand?.primaryColor} onChange={ub("primaryColor")} placeholder="#1a2b3c" compact/><Inp label="Secondary" value={cl.brand?.secondaryColor} onChange={ub("secondaryColor")} placeholder="#ffffff" compact/></div>
          <Inp label="Voice" value={cl.brand?.brandVoice} onChange={ub("brandVoice")} placeholder="Clean, clinical, warm" compact/>
        </div>

        {/* TWO ACTION BUTTONS */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <button onClick={()=>{setClientMode("generate");setView("generate");}} disabled={!canGenerate} style={{padding:24,borderRadius:16,border:`2px solid ${C.border}`,background:C.card,cursor:canGenerate?"pointer":"default",opacity:canGenerate?1:.4,fontFamily:"inherit",textAlign:"left",transition:"border-color .2s"}} onMouseEnter={e=>{if(canGenerate)e.currentTarget.style.borderColor=C.accent;}} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{fontSize:28,marginBottom:8}}>🎨</div>
            <div style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:4}}>Generate Ads</div>
            <div style={{fontSize:13,color:C.textSec,lineHeight:1.5}}>Create 10-40 unique ad concepts from scratch using the full brand package.</div>
          </button>
          <button onClick={()=>{setClientMode("transform");setView("transform");}} disabled={!cl.productPhotos?.length} style={{padding:24,borderRadius:16,border:`2px solid ${C.border}`,background:C.card,cursor:cl.productPhotos?.length?"pointer":"default",opacity:cl.productPhotos?.length?1:.4,fontFamily:"inherit",textAlign:"left",transition:"border-color .2s"}} onMouseEnter={e=>{if(cl.productPhotos?.length)e.currentTarget.style.borderColor=C.purple;}} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{fontSize:28,marginBottom:8}}>🔄</div>
            <div style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:4}}>Transform Ads</div>
            <div style={{fontSize:13,color:C.textSec,lineHeight:1.5}}>Upload competitor or past ads. Recreate them for this brand with the same layout.</div>
          </button>
        </div>
      </div>}

      {/* ═══ GENERATE CONFIG ═══ */}
      {view==="generate"&&cl&&<div className="fi">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div><h2 style={{fontSize:24,fontWeight:700}}>Generate — {cl.name}</h2><div style={{fontSize:13,color:C.textDim,marginTop:4}}>{(cl.sourceDocs||[]).length} docs · {(cl.winningAds||[]).length}W · {(cl.losingAds||[]).length}L · {(cl.productPhotos||[]).length} products</div></div><Btn v="ghost" s="sm" onClick={()=>setView("profile")}>Back</Btn></div>
        <div style={{background:C.card,borderRadius:16,padding:20,border:`1px solid ${C.border}`,marginBottom:16}}>
          <div style={{marginBottom:16}}><div style={{fontSize:13,fontWeight:600,color:C.textSec,marginBottom:8}}>Prompts</div><div style={{display:"flex",gap:6}}>{COUNTS.map(n=><Pill key={n} active={promptCount===n} onClick={()=>setPromptCount(n)} color={C.accent}>{n}</Pill>)}</div></div>
          <div style={{marginBottom:16}}><div style={{fontSize:13,fontWeight:600,color:C.textSec,marginBottom:8}}>Sizes</div><div style={{display:"flex",gap:8}}>{SIZES.map(s=>{const a=selectedSizes.includes(s.key);return <button key={s.key} onClick={()=>toggleSize(s.key)} style={{flex:1,padding:"10px 8px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",background:a?C.accent+"10":C.surface2,border:`2px solid ${a?C.accent:C.border}`,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><div style={{fontSize:13,fontWeight:600,color:a?C.text:C.textSec}}>{s.label}</div><div style={{fontSize:10,color:C.textDim}}>{s.sub}</div></button>;})}</div></div>
          <div><div style={{fontSize:13,fontWeight:600,color:C.textSec,marginBottom:8}}>Model</div><div style={{display:"flex",gap:6}}>{MODELS.map(m=><button key={m.key} onClick={()=>setModel(m.key)} style={{padding:"8px 14px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",background:model===m.key?C.accent+"15":C.surface2,border:`1.5px solid ${model===m.key?C.accent:C.border}`}}><div style={{fontSize:12,fontWeight:600,color:model===m.key?C.text:C.textSec}}>{m.label}</div><div style={{fontSize:10,color:C.textDim}}>${m.price} · {m.desc}</div></button>)}</div></div>
        </div>
        <div style={{background:C.accent+"08",borderRadius:16,padding:20,border:`1px solid ${C.accent}20`,marginBottom:20}}><div style={{fontSize:18,fontWeight:700}}>{promptCount} × {selectedSizes.length} = {totalImages} images</div><div style={{fontSize:13,color:C.textSec}}>Est: ${(totalImages*modelInfo.price).toFixed(2)}</div></div>
        <Btn v="pri" s="lg" full onClick={runGenerate} disabled={isWorking}>{isWorking?"Analyzing...":"Generate Prompts"}</Btn>
      </div>}

      {/* ═══ TRANSFORM INPUT ═══ */}
      {view==="transform"&&cl&&<div className="fi">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div><h2 style={{fontSize:24,fontWeight:700}}>Transform — {cl.name}</h2><div style={{fontSize:13,color:C.textDim,marginTop:4}}>Upload ads to recreate for this brand</div></div><Btn v="ghost" s="sm" onClick={()=>setView("profile")}>Back</Btn></div>

        <ImageGrid images={txAds} onAdd={imgs=>setTxAds(prev=>[...prev,...imgs].slice(0,5))} onRemove={i=>setTxAds(prev=>prev.filter((_,idx)=>idx!==i))} max={5} label="Ads to Transform" desc="Upload 1-5 ads from competitors, past campaigns, or inspiration. Each will be recreated for this brand." required/>

        <Inp label="Instructions (optional)" value={txInstructions} onChange={setTxInstructions} placeholder="e.g. Use our summer offer, make it more premium, keep the exact same layout but change colors to our brand..." textarea rows={3} hint="Tell Claude anything specific about how to transform these ads"/>

        <div style={{background:C.card,borderRadius:16,padding:20,border:`1px solid ${C.border}`,marginBottom:16}}>
          <div style={{marginBottom:12}}><div style={{fontSize:13,fontWeight:600,color:C.textSec,marginBottom:8}}>Sizes</div><div style={{display:"flex",gap:8}}>{SIZES.map(s=>{const a=selectedSizes.includes(s.key);return <button key={s.key} onClick={()=>toggleSize(s.key)} style={{flex:1,padding:"10px 8px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",background:a?C.accent+"10":C.surface2,border:`2px solid ${a?C.accent:C.border}`,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><div style={{fontSize:13,fontWeight:600,color:a?C.text:C.textSec}}>{s.label}</div></button>;})}</div></div>
          <div><div style={{fontSize:13,fontWeight:600,color:C.textSec,marginBottom:8}}>Model</div><div style={{display:"flex",gap:6}}>{MODELS.map(m=><button key={m.key} onClick={()=>setModel(m.key)} style={{padding:"8px 14px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",background:model===m.key?C.accent+"15":C.surface2,border:`1.5px solid ${model===m.key?C.accent:C.border}`}}><div style={{fontSize:12,fontWeight:600,color:model===m.key?C.text:C.textSec}}>{m.label}</div><div style={{fontSize:10,color:C.textDim}}>${m.price} · {m.desc}</div></button>)}</div></div>
        </div>

        <div style={{background:C.purple+"08",borderRadius:16,padding:20,border:`1px solid ${C.purple}20`,marginBottom:20}}><div style={{fontSize:18,fontWeight:700}}>{txAds.length} ads × {selectedSizes.length} size{selectedSizes.length>1?"s":""} = {txAds.length*selectedSizes.length} images</div><div style={{fontSize:13,color:C.textSec}}>Brand data from profile feeds into every transformation</div></div>
        <Btn v="pri" s="lg" full onClick={runTransform} disabled={isWorking||txAds.length===0}>{isWorking?"Analyzing...":"Analyze & Transform"}</Btn>
      </div>}

      {/* ═══ GEN REVIEW ═══ */}
      {view==="genReview"&&<div className="fi">
        {isWorking?<div style={{textAlign:"center",padding:"80px 20px"}}><PR progress={40} size={64}/><h2 style={{fontSize:22,fontWeight:600,marginTop:20}}>Analyzing {cl?.name}</h2><p style={{fontSize:14,color:C.textSec,animation:"pulse 2s infinite",marginTop:8}}>Writing {promptCount} prompts...</p></div>
        :<>{analysis&&<div style={{background:C.card,borderRadius:16,padding:20,border:`1px solid ${C.border}`,marginBottom:16}}><div style={{fontSize:14,fontWeight:700,marginBottom:10}}>Brand Analysis</div>{analysis.positioning&&<div style={{fontSize:13,color:C.textSec,lineHeight:1.6,marginBottom:10}}>{analysis.positioning}</div>}<div style={{display:"flex",gap:12,flexWrap:"wrap"}}>{analysis.winning_patterns?.length>0&&<div style={{flex:1,minWidth:200}}><div style={{fontSize:10,fontWeight:600,color:C.green,marginBottom:4}}>WINNING</div>{analysis.winning_patterns.map((p,i)=><div key={i} style={{fontSize:12,color:C.textSec}}>✓ {p}</div>)}</div>}{analysis.losing_patterns?.length>0&&<div style={{flex:1,minWidth:200}}><div style={{fontSize:10,fontWeight:600,color:C.red,marginBottom:4}}>LOSING</div>{analysis.losing_patterns.map((p,i)=><div key={i} style={{fontSize:12,color:C.textSec}}>✗ {p}</div>)}</div>}</div></div>}
          <div style={{background:C.accent+"08",borderRadius:16,padding:20,border:`1px solid ${C.accent}20`,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}><div><div style={{fontSize:18,fontWeight:700}}>{prompts.length} × {selectedSizes.length} = {prompts.length*selectedSizes.length}</div><div style={{fontSize:13,color:C.textSec}}>Est: ${(prompts.length*selectedSizes.length*modelInfo.price).toFixed(2)}</div></div><div style={{display:"flex",gap:8}}><Btn v="sec" onClick={exportPrompts}>Export</Btn><Btn v="pri" s="lg" onClick={startGenImages}>Generate</Btn></div></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:8}}>{prompts.map((p,i)=><div key={i} onClick={()=>setExpandedPrompt(expandedPrompt===i?null:i)} style={{background:C.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${C.border}`,cursor:"pointer"}}><div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}><span style={{fontSize:11,fontWeight:700,color:C.accent}}>#{p.id}</span><Pill color={C.teal}>{p.format}</Pill>{p.awareness_level&&<Pill color={C.purple}>{p.awareness_level}</Pill>}</div><div style={{fontSize:14,fontWeight:600,marginBottom:2}}>{p.title}</div><div style={{fontSize:12,color:C.textDim}}>{p.reasoning}</div>{expandedPrompt===i&&<div style={{marginTop:10,padding:12,background:C.surface2,borderRadius:8,fontSize:12,color:C.textSec,lineHeight:1.6,maxHeight:200,overflowY:"auto"}}>{p.prompt}</div>}</div>)}</div>
        </>}
      </div>}

      {/* ═══ TX REVIEW ═══ */}
      {view==="txReview"&&<div className="fi">
        {isWorking?<div style={{textAlign:"center",padding:"80px 20px"}}><PR progress={40} size={64}/><h2 style={{fontSize:22,fontWeight:600,marginTop:20}}>Analyzing {txAds.length} ads</h2><p style={{fontSize:14,color:C.textSec,animation:"pulse 2s infinite",marginTop:8}}>Generating transformations for {cl?.name}...</p></div>
        :txAnalysis&&<>
          <h2 style={{fontSize:24,fontWeight:700,marginBottom:16}}>Transformation Preview</h2>
          {txAnalysis.map((tx,i)=><div key={i} style={{background:C.card,borderRadius:16,border:`1px solid ${C.border}`,marginBottom:12,overflow:"hidden"}}>
            <div style={{display:"flex"}}><div style={{width:160,flexShrink:0,borderRight:`1px solid ${C.border}`}}>{txAds[tx.index||i]&&<img src={txAds[tx.index||i].preview||("data:image/jpeg;base64,"+txAds[tx.index||i].base64)} alt="" style={{width:"100%",display:"block"}}/>}</div>
            <div style={{flex:1,padding:16}}><div style={{display:"flex",gap:6,marginBottom:8}}><Pill color={C.teal}>Ad {(tx.index||i)+1}</Pill><span style={{fontSize:11,color:C.textDim}}>→</span><Pill color={C.purple}>{cl?.name}</Pill></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
                <div><div style={{fontSize:10,fontWeight:600,color:C.red,marginBottom:4}}>OLD</div>{tx.original_text?.headline&&<div style={{fontSize:12,color:C.textSec}}>{tx.original_text.headline}</div>}{tx.original_text?.offer&&<div style={{fontSize:11,color:C.textDim}}>{tx.original_text.offer}</div>}</div>
                <div><div style={{fontSize:10,fontWeight:600,color:C.green,marginBottom:4}}>NEW</div>{tx.new_text?.headline&&<div style={{fontSize:12,color:C.text,fontWeight:600}}>{tx.new_text.headline}</div>}{tx.new_text?.offer&&<div style={{fontSize:11,color:C.accent}}>{tx.new_text.offer}</div>}</div>
              </div>
              <div style={{fontSize:11,color:C.textDim,lineHeight:1.4}}>{tx.original_description?.substring(0,120)}...</div>
            </div></div>
          </div>)}
          <div style={{background:C.purple+"08",borderRadius:16,padding:20,border:`1px solid ${C.purple}20`,marginTop:16,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}><div><div style={{fontSize:18,fontWeight:700}}>{txAnalysis.length} × {selectedSizes.length} = {txAnalysis.length*selectedSizes.length}</div></div><div style={{display:"flex",gap:8}}><Btn v="sec" onClick={()=>setView("transform")}>Back</Btn><Btn v="pri" s="lg" onClick={startTxImages}>Generate</Btn></div></div>
        </>}
      </div>}

      {/* ═══ GENERATING ═══ */}
      {(view==="generating"||view==="txGenerating")&&<div className="fi">
        {isWorking&&<div style={{display:"flex",alignItems:"center",gap:20,marginBottom:24,padding:"20px 24px",background:C.card,borderRadius:16,border:`1px solid ${C.border}`}}><PR progress={Math.round(((view==="generating"?progress:txProgress).current/(view==="generating"?progress:txProgress).total)*100)}/><div style={{flex:1}}><div style={{fontSize:16,fontWeight:600}}>Generating {(view==="generating"?progress:txProgress).current} of {(view==="generating"?progress:txProgress).total}</div><div style={{fontSize:13,color:C.textSec}}>Auto-retries · Images appear live</div></div><Btn v="danger" s="sm" onClick={()=>{abortRef.current=true;}}>Stop</Btn></div>}
        <div style={{display:"flex",flexWrap:"wrap",gap:12,justifyContent:"center"}}>{(view==="generating"?results:txResults).map((item,fi)=><ResultCard key={fi} item={item} onDownload={it=>dl(it,view==="generating"?"gen":"tx")}/>)}</div>
      </div>}

      {/* ═══ GALLERY ═══ */}
      {(view==="gallery"||view==="txGallery")&&<div className="fi">
        <div style={{marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><h2 style={{fontSize:28,fontWeight:700}}>{view==="gallery"?successCount:txSuccessCount} images</h2><p style={{fontSize:14,color:C.textSec}}>Click to download. <span style={{cursor:"pointer",color:C.accent}} onClick={()=>setView("profile")}>Back to {cl?.name}</span></p></div><div style={{display:"flex",gap:8}}>{view==="gallery"&&<Btn v="sec" onClick={exportPrompts}>Export</Btn>}<Btn v="pri" onClick={()=>dlAll(view==="gallery"?results:txResults,view==="gallery"?"gen":"tx")}>Download All</Btn></div></div>
        <div style={{display:"flex",flexWrap:"wrap",gap:12,justifyContent:"center"}}>{(view==="gallery"?results:txResults).map((item,fi)=><ResultCard key={fi} item={item} onDownload={it=>dl(it,view==="gallery"?"gen":"tx")}/>)}</div>
      </div>}
    </div>

    {showNewClient&&<Modal title="New Client" onClose={()=>setShowNewClient(false)}><Inp label="Client Name" value={newName} onChange={setNewName} placeholder="Brand name"/><Btn v="pri" full onClick={createClient} disabled={!newName.trim()}>Create</Btn></Modal>}
    <footer style={{padding:"24px 28px",textAlign:"center",marginTop:40}}><p style={{fontSize:12,color:C.textDim}}>Creative Factory v9 · D-DOUBLEU MEDIA</p></footer>
  </div>;
}
