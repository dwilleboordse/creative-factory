import { useState, useEffect, useRef, useCallback } from "react";

const C={bg:"#000",surface:"#0d0d0d",surface2:"#161616",surface3:"#1c1c1e",card:"#1c1c1e",border:"rgba(255,255,255,0.08)",borderLight:"rgba(255,255,255,0.12)",text:"#f5f5f7",textSec:"#86868b",textDim:"#48484a",accent:"#0a84ff",green:"#30d158",red:"#ff453a",orange:"#ff9f0a",purple:"#bf5af2",teal:"#64d2ff",yellow:"#ffd60a",pink:"#ff375f"};
const css=`*{margin:0;padding:0;box-sizing:border-box}body{background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',sans-serif;-webkit-font-smoothing:antialiased}::selection{background:${C.accent}40}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.textDim};border-radius:3px}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes spin{to{transform:rotate(360deg)}}.fi{animation:fadeIn .3s ease-out forwards}`;
const genId=()=>Math.random().toString(36).substring(2,10);

const SIZES=[{key:"1080x1080",label:"1080×1080",sub:"1:1",ratio:"1:1"},{key:"1080x1350",label:"1080×1350",sub:"4:5",ratio:"4:5"},{key:"1080x1920",label:"1080×1920",sub:"9:16",ratio:"9:16"}];
const MODELS=[{key:"gemini-2.5-flash-image",label:"Gemini Flash",price:0.039,desc:"Uses product refs",type:"gemini"},{key:"imagen-4.0-generate-001",label:"Imagen 4",price:0.04,desc:"Best text",type:"imagen"},{key:"imagen-4.0-fast-generate-001",label:"Imagen Fast",price:0.02,desc:"Fastest",type:"imagen"}];
const COUNTS=[10,15,20,30];

async function apiGet(p){return(await fetch(p)).json();}
async function apiPost(p,b){return(await fetch(p,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)})).json();}

const ANDROMEDA_BLOCK=`
META ANDROMEDA OPTIMIZATION (3 VARIATIONS PER CONCEPT):
For EACH concept, generate 3 meaningfully different variations. Per Meta's Andromeda update, surface-level changes (same layout + different headline) do NOT count as diverse. Each variation MUST change at least one of:
- Different PERSONA (budget shopper vs luxury buyer vs gift giver)
- Different SETTING (home vs workplace vs outdoor vs travel)
- Different EMOTIONAL ANGLE (fear vs aspiration vs belonging vs achievement)
- Different USE CASE (different application or scenario)
Keep the core concept/format the same, but make each variation distinct enough that Andromeda classifies them as separate ads.

JSON format for each prompt:
{"id":1,"title":"Concept","format":"Type","angle":"Angle","awareness_level":"Level","variations":[
  {"var_id":"1a","persona":"Persona","setting":"Setting","emotion":"Emotion","prompt":"Full prompt...","reasoning":"Why different"},
  {"var_id":"1b","persona":"Different persona","setting":"Different setting","emotion":"Different emotion","prompt":"Full prompt...","reasoning":"Why different"},
  {"var_id":"1c","persona":"Third persona","setting":"Third setting","emotion":"Third emotion","prompt":"Full prompt...","reasoning":"Why different"}
]}`;

const NO_ANDROMEDA_BLOCK=`
JSON format: {"id":1,"title":"","format":"","angle":"","awareness_level":"","prompt":"Full prompt...","reasoning":""}`;

const BASE_SYSTEM=`You are a world-class direct response creative strategist with $50M+ in managed ad spend. Breakthrough Advertising principles deeply internalized.

You have a complete brand package: source docs (brand DNA, reviews, persona, surveys), winning ads (study what works), losing ads (avoid these), product reference photos.

Generate unique static ad prompts. Each a DIFFERENT format, angle, and approach.

PROMPT RULES:
- Start with "Use the attached product reference images. Match the exact product design precisely."
- Describe COMPLETE composition: background, product, all text with exact words, typography, colors, lighting
- Use REAL data from source docs: actual review quotes, real stats, real customer language
- Each ad completely different format: review cards, UGC, product hero, comparison, editorial, copy-led, social proof, stat callout, testimonial, manifesto, offer/promo, feature callout, bold statement, faux press etc.

TEXT RULES:
- Headlines: MAX 5 words, ALL CAPS
- Subheads: max 8 words
- Max 4 text elements per ad
- Avoid apostrophes, quotes, ampersands
- Include "All text must be rendered with perfect spelling and clean typography."
- End with "[ASPECT_RATIO] aspect ratio."`;

const TX_SYSTEM=`You are a world-class ad creative director. You recreate existing ads for a different brand.

For EACH reference ad: analyze layout, identify text, note style. Generate a NEW prompt keeping SAME layout but transforming brand, text, colors. Start with "Use the attached product reference images." End with "[ASPECT_RATIO] aspect ratio."

TEXT RULES: Headlines MAX 5 words CAPS. Max 4 text elements. Include "All text rendered with perfect spelling."`;

// ═══ FILE UTILS ═══
function compressImage(file,mx=600){return new Promise(r=>{const rd=new FileReader();rd.onload=e=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");let w=img.width,h=img.height;if(w>mx||h>mx){const ra=Math.min(mx/w,mx/h);w=Math.round(w*ra);h=Math.round(h*ra);}c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);r({base64:c.toDataURL("image/jpeg",.6).split(",")[1],mimeType:"image/jpeg",preview:c.toDataURL("image/jpeg",.3),name:file.name});};img.src=e.target.result;};rd.readAsDataURL(file);});}
function readTextFile(f){return new Promise(r=>{const rd=new FileReader();rd.onload=e=>r({name:f.name,text:e.target.result});rd.readAsText(f);});}
async function readPdfFile(f){const ab=await f.arrayBuffer();const lib=await loadPdfJs();const pdf=await lib.getDocument({data:ab}).promise;let t="";for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i);const c=await p.getTextContent();t+=c.items.map(it=>it.str).join(" ")+"\n";}return{name:f.name,text:t.trim()};}
let _pdfjs=null;function loadPdfJs(){if(_pdfjs)return Promise.resolve(_pdfjs);return new Promise((res,rej)=>{if(window.pdfjsLib){_pdfjs=window.pdfjsLib;res(_pdfjs);return;}const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";s.onload=()=>{const l=window.pdfjsLib;l.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";_pdfjs=l;res(l);};s.onerror=()=>rej(new Error("PDF.js failed"));document.head.appendChild(s);});}

// ═══ UI ═══
function Btn({children,onClick,v="sec",s="md",disabled,full}){const vs={pri:{bg:C.accent,c:"#fff",b:"none"},sec:{bg:C.surface3,c:C.text,b:`1px solid ${C.border}`},ghost:{bg:"transparent",c:C.textSec,b:"none"},danger:{bg:C.red+"18",c:C.red,b:`1px solid ${C.red}30`}};const ss={sm:{p:"5px 12px",f:11},md:{p:"9px 18px",f:13},lg:{p:"13px 26px",f:14}};const vv=vs[v]||vs.sec,sz=ss[s]||ss.md;return <button onClick={onClick} disabled={disabled} style={{padding:sz.p,fontSize:sz.f,fontFamily:"inherit",fontWeight:500,borderRadius:10,cursor:disabled?"default":"pointer",opacity:disabled?.35:1,transition:"all .2s",width:full?"100%":"auto",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,background:vv.bg,color:vv.c,border:vv.b}}>{children}</button>;}
function Inp({label,value,onChange,placeholder,textarea,rows=3,compact}){const sh={width:"100%",fontFamily:"inherit",fontSize:13,color:C.text,background:C.surface2,border:`1px solid ${C.border}`,borderRadius:9,padding:compact?"7px 10px":"10px 14px",outline:"none"};return <div style={{marginBottom:compact?6:10}}>{label&&<label style={{display:"block",fontSize:11,fontWeight:500,color:C.textSec,marginBottom:4}}>{label}</label>}{textarea?<textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...sh,resize:"vertical",lineHeight:1.5}}/>:<input value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={sh}/>}</div>;}
function Pill({children,color,active,onClick}){const a=active!==undefined?active:true;return <button onClick={onClick} style={{fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:14,cursor:onClick?"pointer":"default",fontFamily:"inherit",background:a?(color||C.accent)+"15":"transparent",color:a?(color||C.accent):C.textDim,border:`1px solid ${a?(color||C.accent)+"40":C.border}`,whiteSpace:"nowrap"}}>{children}</button>;}
function PR({progress,size=44}){const r=(size-4)/2;const ci=2*Math.PI*r;const off=ci-(progress/100)*ci;return <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.surface3} strokeWidth="4"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.accent} strokeWidth="4" strokeDasharray={ci} strokeDashoffset={off} strokeLinecap="round"/></svg>;}
function Modal({children,onClose,title}){return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}><div onClick={e=>e.stopPropagation()} className="fi" style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto"}}><div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:15,fontWeight:600}}>{title}</span><button onClick={onClose} style={{width:24,height:24,borderRadius:12,background:C.surface3,border:"none",color:C.textSec,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button></div><div style={{padding:18}}>{children}</div></div></div>;}
function ImageGrid({images,onAdd,onRemove,max,label,desc,required}){const ref=useRef(null);const hf=async(files)=>{const p=[];for(const f of files){if(f.type.startsWith("image/")&&images.length+p.length<max)p.push(await compressImage(f));}if(p.length)onAdd(p);};return <div style={{background:C.card,borderRadius:12,padding:14,border:`1px solid ${images.length>0?C.accent+"30":C.border}`,marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:12,fontWeight:600,color:images.length>0?C.text:C.textSec}}>{label} ({images.length}/{max})</span>{required&&<span style={{fontSize:9,color:C.red,fontWeight:600}}>Req</span>}</div><div style={{fontSize:10,color:C.textDim,marginBottom:8}}>{desc}</div>{images.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{images.map((img,i)=><div key={i} style={{position:"relative",borderRadius:6,overflow:"hidden"}}><img src={img.preview||("data:image/jpeg;base64,"+img.base64)} alt="" style={{height:60,width:"auto",display:"block",borderRadius:6}}/><button onClick={()=>onRemove(i)} style={{position:"absolute",top:1,right:1,width:16,height:16,borderRadius:8,background:C.red,color:"#fff",border:"none",fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button></div>)}</div>}<input ref={ref} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>hf(Array.from(e.target.files))}/>{images.length<max&&<button onClick={()=>ref.current?.click()} style={{width:"100%",padding:8,borderRadius:7,background:C.surface2,border:`1px dashed ${C.borderLight}`,color:C.textSec,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{images.length>0?"Add":"Upload"}</button>}</div>;}

// ═══ TOGGLE COMPONENT ═══
function Toggle({label,value,onChange,desc}){return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:value?C.accent+"10":C.card,border:`1px solid ${value?C.accent+"30":C.border}`,borderRadius:12,marginBottom:10,cursor:"pointer"}} onClick={()=>onChange(!value)}>
  <div><div style={{fontSize:13,fontWeight:600,color:value?C.text:C.textSec}}>{label}</div>{desc&&<div style={{fontSize:11,color:C.textDim,marginTop:2}}>{desc}</div>}</div>
  <div style={{width:42,height:24,borderRadius:12,background:value?C.accent:C.surface3,padding:2,transition:"all .2s"}}><div style={{width:20,height:20,borderRadius:10,background:"#fff",transform:value?"translateX(18px)":"translateX(0)",transition:"transform .2s"}}/></div>
</div>;}

// ═══ MAIN APP ═══
export default function App(){
  const [data,setData]=useState({clients:[]});const [loaded,setLoaded]=useState(false);const [saving,setSaving]=useState(false);
  const [view,setView]=useState("clients");const [sel,setSel]=useState(null);
  const [showNew,setShowNew]=useState(false);const [newName,setNewName]=useState("");const [error,setError]=useState(null);

  // Config
  const [promptCount,setPromptCount]=useState(15);const [sizes,setSizes]=useState(["1080x1350"]);const [model,setModel]=useState(MODELS[0].key);
  const [andromeda,setAndromeda]=useState(true);

  // Generate state
  const [prompts,setPrompts]=useState([]);const [analysis,setAnalysis]=useState(null);
  const [results,setResults]=useState([]);const [progress,setProgress]=useState({current:0,total:0,errors:0});
  const [isWorking,setIsWorking]=useState(false);const abortRef=useRef(false);const docRef=useRef(null);

  // Transform state
  const [txAds,setTxAds]=useState([]);const [txInstructions,setTxInstructions]=useState("");
  const [txAnalysis,setTxAnalysis]=useState(null);const [txResults,setTxResults]=useState([]);const [txProgress,setTxProgress]=useState({current:0,total:0,errors:0});

  // History
  const [history,setHistory]=useState([]);const [historyLoading,setHistoryLoading]=useState(false);

  useEffect(()=>{apiGet("/api/data").then(d=>{setData(d);setLoaded(true);});},[]);
  const save=useCallback(async(nd)=>{setData(nd);setSaving(true);await apiPost("/api/data",nd);setSaving(false);},[]);
  const updateClient=(uc)=>{const nd={...data,clients:data.clients.map(c=>c.id===uc.id?uc:c)};save(nd);setSel(uc);};

  const createClient=()=>{if(!newName.trim())return;const nc={id:genId(),name:newName.trim(),createdAt:new Date().toISOString(),brand:{productName:"",category:"",pricePoint:"",offer:"",brandVoice:"",primaryColor:"",secondaryColor:""},sourceDocs:[],sourceText:"",winningAds:[],losingAds:[],productPhotos:[]};save({...data,clients:[...data.clients,nc]});setNewName("");setShowNew(false);setSel(nc);setView("profile");};
  const deleteClient=(id)=>{if(!confirm("Delete?"))return;save({...data,clients:data.clients.filter(c=>c.id!==id)});if(sel?.id===id){setSel(null);setView("clients");}};

  const cl=sel;const ub=(k)=>(v)=>updateClient({...cl,brand:{...cl.brand,[k]:v}});
  const mi=MODELS.find(m=>m.key===model)||MODELS[0];
  const varMultiplier=andromeda?3:1;
  const promptsGenerated=promptCount*varMultiplier;
  const totalImages=promptsGenerated*sizes.length;
  const canGen=cl&&cl.productPhotos?.length>=1&&(cl.sourceDocs?.length>0||cl.sourceText?.trim());
  const sc=results.filter(r=>r.image).length;const txSc=txResults.filter(r=>r.image).length;
  const toggleSize=(k)=>{if(sizes.includes(k)){if(sizes.length>1)setSizes(p=>p.filter(s=>s!==k));}else setSizes(p=>[...p,k]);};

  const handleDocs=async(files)=>{const nd=[];for(const f of files){if(f.name.endsWith(".pdf")||f.type==="application/pdf"){try{nd.push(await readPdfFile(f));}catch(e){setError("PDF: "+e.message);}}else if(f.name.endsWith(".txt")||f.name.endsWith(".md")||f.name.endsWith(".csv")||f.type.startsWith("text/")){nd.push(await readTextFile(f));}}if(nd.length)updateClient({...cl,sourceDocs:[...(cl.sourceDocs||[]),...nd]});};

  const loadHistory=async(clientId)=>{setHistoryLoading(true);try{const d=await apiGet("/api/history?clientId="+clientId);setHistory(d.items||[]);}catch(e){setHistory([]);}setHistoryLoading(false);};
  const deleteHistoryItem=async(itemId)=>{await apiPost("/api/history?clientId="+cl.id,{action:"delete",deleteId:itemId});setHistory(prev=>prev.filter(h=>h.id!==itemId));};
  const saveToHistory=async(items)=>{if(!cl)return;const toSave=items.filter(i=>i.image).map(i=>({id:genId(),date:new Date().toISOString(),title:i.title||"",format:i.format||"",size:i.sizeKey||"",image:i.image,mimeType:i.mimeType||"image/png",concept:i.id||"",varId:i.var_id||""}));if(toSave.length>0)await apiPost("/api/history?clientId="+cl.id,{action:"add",items:toSave});};

  const TEXT_BOOST=" CRITICAL: All text PERFECT spelling. No typos. Clean crisp typography.";

  // ═══ BUILD CONTENT ═══
  const buildGenContent=()=>{
    const content=[];
    const allText=[...(cl.sourceDocs||[]).map(d=>`--- ${d.name} ---\n${d.text}`),cl.sourceText?.trim()?`--- Pasted ---\n${cl.sourceText}`:""].filter(Boolean).join("\n\n");
    if(allText)content.push({type:"text",text:`SOURCE DOCUMENTS:\n\n${allText.substring(0,50000)}`});
    (cl.winningAds||[]).slice(0,6).forEach((img,i)=>{content.push({type:"image",source:{type:"base64",media_type:img.mimeType,data:img.base64}});content.push({type:"text",text:`[WINNING AD ${i+1}]`});});
    (cl.losingAds||[]).slice(0,6).forEach((img,i)=>{content.push({type:"image",source:{type:"base64",media_type:img.mimeType,data:img.base64}});content.push({type:"text",text:`[LOSING AD ${i+1}]`});});
    (cl.productPhotos||[]).slice(0,4).forEach((img,i)=>{content.push({type:"image",source:{type:"base64",media_type:img.mimeType,data:img.base64}});content.push({type:"text",text:`[PRODUCT REF ${i+1}]`});});
    let bb="";const b=cl.brand||{};if(b.productName)bb+=`Product: ${b.productName}`;if(b.category)bb+=` (${b.category})`;if(b.pricePoint)bb+=`\nPrice: ${b.pricePoint}`;if(b.offer)bb+=`\nOffer: ${b.offer}`;if(b.brandVoice)bb+=`\nVoice: ${b.brandVoice}`;if(b.primaryColor)bb+=`\nPrimary: ${b.primaryColor}`;if(b.secondaryColor)bb+=`\nSecondary: ${b.secondaryColor}`;
    content.push({type:"text",text:`${bb?`BRAND:\n${bb}\n\n`:""}Generate exactly ${promptCount} unique concepts.${andromeda?" For EACH concept, create 3 Andromeda-optimized variations (different persona/setting/emotion each).":""} Use real data. End each with "[ASPECT_RATIO] aspect ratio."\n\nRespond ONLY in valid JSON:\n{"brand_analysis":{"positioning":"","winning_patterns":[],"losing_patterns":[]},"prompts":[...]}`});
    return content;
  };

  const buildTxContent=()=>{
    const content=[];
    txAds.forEach((img,i)=>{content.push({type:"image",source:{type:"base64",media_type:img.mimeType,data:img.base64}});content.push({type:"text",text:`[REFERENCE AD ${i+1}]`});});
    const allText=[...(cl.sourceDocs||[]).map(d=>`--- ${d.name} ---\n${d.text}`),cl.sourceText?.trim()?`--- Pasted ---\n${cl.sourceText}`:""].filter(Boolean).join("\n\n");
    if(allText)content.push({type:"text",text:`TARGET BRAND DOCS:\n\n${allText.substring(0,30000)}`});
    (cl.productPhotos||[]).slice(0,4).forEach((img,i)=>{content.push({type:"image",source:{type:"base64",media_type:img.mimeType,data:img.base64}});content.push({type:"text",text:`[TARGET PRODUCT ${i+1}]`});});
    let bb="";const b=cl.brand||{};if(b.productName)bb+=`Product: ${b.productName}`;if(b.category)bb+=` (${b.category})`;if(b.pricePoint)bb+=`\nPrice: ${b.pricePoint}`;if(b.offer)bb+=`\nOffer: ${b.offer}`;if(b.brandVoice)bb+=`\nVoice: ${b.brandVoice}`;
    let inst=`TARGET BRAND:\n${bb}\n\nRecreate each of the ${txAds.length} reference ads.${andromeda?" For EACH ad, create 3 Andromeda-optimized variations (different persona/setting/emotion each).":""}`;
    if(txInstructions.trim())inst+=`\n\nINSTRUCTIONS:\n${txInstructions}`;
    inst+=`\n\nRespond ONLY in valid JSON:\n{"transformations":[{"index":0,"original_text":{"headline":"","offer":""},"new_text":{"headline":"","offer":""}${andromeda?',"variations":[{"var_id":"1a","prompt":"...","persona":"","emotion":""},{"var_id":"1b",...},{"var_id":"1c",...}]':',"prompt":"..."'}}]}`;
    content.push({type:"text",text:inst});
    return content;
  };

  const parseJSON=(text)=>{let t=text.replace(/```json|```/g,"").trim();try{return JSON.parse(t);}catch(e){let f=t;const ob=(f.match(/{/g)||[]).length,cb=(f.match(/}/g)||[]).length;for(let i=0;i<ob-cb;i++)f+="}";const oq=(f.match(/\[/g)||[]).length,cq=(f.match(/\]/g)||[]).length;for(let i=0;i<oq-cq;i++)f+="]";return JSON.parse(f);}};

  // ═══ RUN GENERATE ═══
  const runGenerate=async()=>{
    setIsWorking(true);setError(null);setView("genReview");
    const sys=BASE_SYSTEM+(andromeda?ANDROMEDA_BLOCK:NO_ANDROMEDA_BLOCK);
    try{
      const res=await apiPost("/api/analyze",{model:"claude-sonnet-4-20250514",max_tokens:16000,system:sys,messages:[{role:"user",content:buildGenContent()}]});
      if(res.error)throw new Error(typeof res.error==="string"?res.error:res.error.message);
      const parsed=parseJSON(res.content?.[0]?.text||"");
      setAnalysis(parsed.brand_analysis);setPrompts(parsed.prompts||[]);
    }catch(e){setError(e.message);setView("generate");}
    setIsWorking(false);
  };

  const runTransform=async()=>{
    setIsWorking(true);setError(null);setView("txReview");
    const sys=TX_SYSTEM+(andromeda?"\n\nFor EACH ad, create 3 Andromeda-optimized variations. Each variation must change persona, setting, or emotional angle.":"");
    try{
      const res=await apiPost("/api/analyze",{model:"claude-sonnet-4-20250514",max_tokens:16000,system:sys,messages:[{role:"user",content:buildTxContent()}]});
      if(res.error)throw new Error(typeof res.error==="string"?res.error:res.error.message);
      const parsed=parseJSON(res.content?.[0]?.text||"");
      setTxAnalysis(parsed.transformations||[]);
    }catch(e){setError(e.message);setView("transform");}
    setIsWorking(false);
  };

  // ═══ IMAGE GENERATION ═══
  const flattenPrompts=(prArray)=>{
    const jobs=[];
    for(const p of prArray){
      if(andromeda&&p.variations?.length>0){
        for(const v of p.variations){
          for(const sk of sizes){const so=SIZES.find(s=>s.key===sk);
            jobs.push({id:p.id,var_id:v.var_id,title:p.title||"",format:p.format||"",persona:v.persona,emotion:v.emotion,sizeKey:sk,sizeLabel:so.label,ratio:so.ratio,prompt:(v.prompt||"").replace(/\[ASPECT_RATIO\]/g,so.ratio)});
          }
        }
      }else{
        for(const sk of sizes){const so=SIZES.find(s=>s.key===sk);
          jobs.push({id:p.id,title:p.title||"",format:p.format||"",sizeKey:sk,sizeLabel:so.label,ratio:so.ratio,prompt:(p.prompt||"").replace(/\[ASPECT_RATIO\]/g,so.ratio)});
        }
      }
    }
    return jobs;
  };

  const flattenTx=(txArray)=>{
    const jobs=[];
    for(const tx of txArray){
      if(andromeda&&tx.variations?.length>0){
        for(const v of tx.variations){
          for(const sk of sizes){const so=SIZES.find(s=>s.key===sk);
            jobs.push({id:tx.index+1,var_id:v.var_id,title:tx.new_text?.headline||`Ad ${tx.index+1}`,format:"Transform",persona:v.persona,emotion:v.emotion,sizeKey:sk,sizeLabel:so.label,ratio:so.ratio,prompt:(v.prompt||"").replace(/\[ASPECT_RATIO\]/g,so.ratio),originalIndex:tx.index});
          }
        }
      }else{
        for(const sk of sizes){const so=SIZES.find(s=>s.key===sk);
          jobs.push({id:tx.index+1,title:tx.new_text?.headline||`Ad ${tx.index+1}`,format:"Transform",sizeKey:sk,sizeLabel:so.label,ratio:so.ratio,prompt:(tx.prompt||"").replace(/\[ASPECT_RATIO\]/g,so.ratio),originalIndex:tx.index});
        }
      }
    }
    return jobs;
  };

  const runImageGen=async(jobs,setRes,setProg,viewDone)=>{
    setIsWorking(true);abortRef.current=false;setProg({current:0,total:jobs.length,errors:0});setRes([]);
    const refs=(cl.productPhotos||[]).slice(0,2).map(img=>({base64:img.base64,mimeType:img.mimeType}));
    let errors=0;
    for(let i=0;i<jobs.length;i++){
      if(abortRef.current)break;setProg(p=>({...p,current:i+1}));const job=jobs[i];
      try{
        const images=mi.type==="gemini"?refs:[];
        const res=await apiPost("/api/generate",{prompt:job.prompt+TEXT_BOOST,images,model,modelType:mi.type});
        if(res.error){await new Promise(r=>setTimeout(r,3000));const r2=await apiPost("/api/generate",{prompt:job.prompt+TEXT_BOOST,images,model,modelType:mi.type});
          if(r2.image){setRes(prev=>[...prev,{...job,idx:i,image:r2.image,mimeType:r2.mimeType,error:null}]);continue;}
          errors++;setProg(p=>({...p,errors}));setRes(prev=>[...prev,{...job,idx:i,image:null,error:typeof res.error==="string"?res.error:res.error.message}]);
        }else{setRes(prev=>[...prev,{...job,idx:i,image:res.image,mimeType:res.mimeType,error:null}]);}
      }catch(e){errors++;setProg(p=>({...p,errors}));setRes(prev=>[...prev,{...job,idx:i,image:null,error:e.message}]);}
      if(i<jobs.length-1)await new Promise(r=>setTimeout(r,2500));
    }
    setIsWorking(false);setView(viewDone);
  };

  const startGenImages=()=>{const jobs=flattenPrompts(prompts);setView("generating");runImageGen(jobs,setResults,setProgress,"gallery");};
  const startTxImages=()=>{const jobs=flattenTx(txAnalysis);setView("txGenerating");runImageGen(jobs,setTxResults,setTxProgress,"txGallery");};

  // Save + download
  const dl=(item,prefix)=>{if(!item.image)return;const a=document.createElement("a");a.href="data:"+(item.mimeType||"image/png")+";base64,"+item.image;a.download=`${prefix}-${item.id||item.idx+1}${item.var_id?"-"+item.var_id:""}-${item.sizeKey}.png`;a.click();};
  const dlAll=(items,prefix)=>{items.filter(r=>r.image).forEach((item,i)=>setTimeout(()=>dl(item,prefix),i*300));};

  const saveAndGo=async(items,viewTarget)=>{await saveToHistory(items);setView(viewTarget);};

  const goClient=(c)=>{setSel(c);setView("profile");setPrompts([]);setResults([]);setAnalysis(null);setTxAds([]);setTxInstructions("");setTxAnalysis(null);setTxResults([]);setHistory([]);loadHistory(c.id);};

  if(!loaded)return <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><style>{css}</style><div style={{color:C.textDim}}>Loading...</div></div>;

  // ═══ RENDER ═══
  return <div style={{background:C.bg,minHeight:"100vh",color:C.text}}>
    <style>{css}</style>
    <nav style={{position:"sticky",top:0,zIndex:100,background:"rgba(0,0,0,.72)",backdropFilter:"blur(20px) saturate(180%)",borderBottom:`1px solid ${C.border}`,padding:"0 24px"}}>
      <div style={{maxWidth:1000,margin:"0 auto",height:48,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:14,fontWeight:600}}>Creative Factory</span>{saving&&<span style={{fontSize:10,color:C.accent,animation:"pulse 1s infinite"}}>Saving</span>}{isWorking&&<span style={{fontSize:10,color:C.accent,animation:"pulse 1s infinite"}}>Working...</span>}</div>
        <div style={{display:"flex",gap:6}}>
          {(sc>0||txSc>0)&&<Btn v="pri" s="sm" onClick={()=>{const items=view.includes("tx")?txResults:results;dlAll(items,view.includes("tx")?"tx":"gen");saveToHistory(items);}}>Save & Download ({view.includes("tx")?txSc:sc})</Btn>}
          {view!=="clients"&&<Btn v="ghost" s="sm" onClick={()=>{setView("clients");setSel(null);}}>Clients</Btn>}
          {view==="clients"&&<Btn v="pri" s="sm" onClick={()=>setShowNew(true)}>New</Btn>}
        </div>
      </div>
    </nav>

    {error&&<div style={{background:C.red+"10",borderBottom:`1px solid ${C.red}25`,padding:"8px 24px"}}><div style={{maxWidth:1000,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:C.red}}>{error}</span><Btn v="ghost" s="sm" onClick={()=>setError(null)}>×</Btn></div></div>}

    <div style={{maxWidth:1000,margin:"0 auto",padding:"28px 24px"}}>

      {/* CLIENTS */}
      {view==="clients"&&<div className="fi">
        <h1 style={{fontSize:28,fontWeight:700,letterSpacing:"-.03em",marginBottom:20}}>Creative Factory</h1>
        {data.clients.length===0?<div style={{textAlign:"center",padding:50}}><Btn v="pri" s="lg" onClick={()=>setShowNew(true)}>New Client</Btn></div>
        :data.clients.map(c=><div key={c.id} onClick={()=>goClient(c)} style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,marginBottom:6,padding:"16px 20px",cursor:"pointer",transition:"all .15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.borderLight} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><div style={{fontSize:16,fontWeight:600,marginBottom:3}}>{c.name}</div><div style={{fontSize:11,color:C.textDim}}>{(c.sourceDocs||[]).length} docs · {(c.winningAds||[]).length}W · {(c.losingAds||[]).length}L · {(c.productPhotos||[]).length} products</div></div><div style={{display:"flex",gap:6}}><Btn v="ghost" s="sm" onClick={e=>{e.stopPropagation();deleteClient(c.id);}}>Del</Btn></div></div>
        </div>)}
      </div>}

      {/* PROFILE */}
      {view==="profile"&&cl&&<div className="fi">
        <h1 style={{fontSize:24,fontWeight:700,marginBottom:3}}>{cl.name}</h1>
        <p style={{fontSize:13,color:C.textSec,marginBottom:14}}>Everything saves automatically.</p>

        {/* Docs */}
        <div style={{background:C.card,borderRadius:14,padding:16,border:`1px solid ${C.border}`,marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:6}}>Source Docs ({(cl.sourceDocs||[]).length})</div>
          {(cl.sourceDocs||[]).length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{cl.sourceDocs.map((d,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:4,background:C.surface2,borderRadius:6,padding:"3px 8px"}}><span style={{fontSize:10,color:C.green}}>📄</span><span style={{fontSize:11,color:C.textSec}}>{d.name}</span><button onClick={()=>updateClient({...cl,sourceDocs:cl.sourceDocs.filter((_,idx)=>idx!==i)})} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:11}}>×</button></div>)}</div>}
          <div style={{display:"flex",gap:6,marginBottom:8}}><input ref={docRef} type="file" accept=".txt,.md,.csv,.pdf,text/*,application/pdf" multiple style={{display:"none"}} onChange={e=>handleDocs(Array.from(e.target.files))}/><Btn v="sec" s="sm" onClick={()=>docRef.current?.click()}>Upload Docs</Btn></div>
          <Inp label="Or paste" value={cl.sourceText} onChange={v=>updateClient({...cl,sourceText:v})} placeholder="Brand DNA, reviews..." textarea rows={2}/>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <ImageGrid images={cl.winningAds||[]} onAdd={imgs=>updateClient({...cl,winningAds:[...(cl.winningAds||[]),...imgs].slice(0,6)})} onRemove={i=>updateClient({...cl,winningAds:(cl.winningAds||[]).filter((_,idx)=>idx!==i)})} max={6} label="Winners" desc="Top performers"/>
          <ImageGrid images={cl.losingAds||[]} onAdd={imgs=>updateClient({...cl,losingAds:[...(cl.losingAds||[]),...imgs].slice(0,6)})} onRemove={i=>updateClient({...cl,losingAds:(cl.losingAds||[]).filter((_,idx)=>idx!==i)})} max={6} label="Losers" desc="Failed ads"/>
        </div>
        <ImageGrid images={cl.productPhotos||[]} onAdd={imgs=>updateClient({...cl,productPhotos:[...(cl.productPhotos||[]),...imgs].slice(0,4)})} onRemove={i=>updateClient({...cl,productPhotos:(cl.productPhotos||[]).filter((_,idx)=>idx!==i)})} max={4} label="Product Photos" desc="Attached to every generation" required/>

        <div style={{background:C.card,borderRadius:14,padding:16,border:`1px solid ${C.border}`,marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Brand</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 8px"}}><Inp label="Product" value={cl.brand?.productName} onChange={ub("productName")} compact/><Inp label="Category" value={cl.brand?.category} onChange={ub("category")} compact/><Inp label="Price" value={cl.brand?.pricePoint} onChange={ub("pricePoint")} compact/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 8px"}}><Inp label="Offer" value={cl.brand?.offer} onChange={ub("offer")} compact/><Inp label="Primary" value={cl.brand?.primaryColor} onChange={ub("primaryColor")} compact/><Inp label="Secondary" value={cl.brand?.secondaryColor} onChange={ub("secondaryColor")} compact/></div>
          <Inp label="Voice" value={cl.brand?.brandVoice} onChange={ub("brandVoice")} compact/>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <button onClick={()=>setView("generate")} disabled={!canGen} style={{padding:20,borderRadius:14,border:`2px solid ${C.border}`,background:C.card,cursor:canGen?"pointer":"default",opacity:canGen?1:.4,fontFamily:"inherit",textAlign:"left"}} onMouseEnter={e=>{if(canGen)e.currentTarget.style.borderColor=C.accent;}} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{fontSize:24,marginBottom:6}}>🎨</div><div style={{fontSize:15,fontWeight:700,marginBottom:3}}>Generate</div><div style={{fontSize:11,color:C.textSec}}>Create fresh ad concepts</div>
          </button>
          <button onClick={()=>setView("transform")} disabled={!cl.productPhotos?.length} style={{padding:20,borderRadius:14,border:`2px solid ${C.border}`,background:C.card,cursor:cl.productPhotos?.length?"pointer":"default",opacity:cl.productPhotos?.length?1:.4,fontFamily:"inherit",textAlign:"left"}} onMouseEnter={e=>{if(cl.productPhotos?.length)e.currentTarget.style.borderColor=C.purple;}} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{fontSize:24,marginBottom:6}}>🔄</div><div style={{fontSize:15,fontWeight:700,marginBottom:3}}>Transform</div><div style={{fontSize:11,color:C.textSec}}>Recreate existing ads</div>
          </button>
          <button onClick={()=>{setView("history");loadHistory(cl.id);}} style={{padding:20,borderRadius:14,border:`2px solid ${C.border}`,background:C.card,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.teal} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{fontSize:24,marginBottom:6}}>📁</div><div style={{fontSize:15,fontWeight:700,marginBottom:3}}>History</div><div style={{fontSize:11,color:C.textSec}}>Past generations ({history.length})</div>
          </button>
        </div>
      </div>}

      {/* GENERATE CONFIG */}
      {view==="generate"&&cl&&<div className="fi">
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><h2 style={{fontSize:22,fontWeight:700}}>Generate — {cl.name}</h2><Btn v="ghost" s="sm" onClick={()=>setView("profile")}>Back</Btn></div>
        <Toggle label="Andromeda 3x Variations" value={andromeda} onChange={setAndromeda} desc="Generate 3 meaningfully different variations per concept (different persona, setting, emotion). Optimized for Meta's Andromeda algorithm."/>
        <div style={{background:C.card,borderRadius:14,padding:16,border:`1px solid ${C.border}`,marginBottom:12}}>
          <div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:600,color:C.textSec,marginBottom:6}}>Concepts</div><div style={{display:"flex",gap:4}}>{COUNTS.map(n=><Pill key={n} active={promptCount===n} onClick={()=>setPromptCount(n)} color={C.accent}>{n}</Pill>)}</div></div>
          <div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:600,color:C.textSec,marginBottom:6}}>Sizes</div><div style={{display:"flex",gap:6}}>{SIZES.map(s=>{const a=sizes.includes(s.key);return <button key={s.key} onClick={()=>toggleSize(s.key)} style={{flex:1,padding:"8px 6px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",background:a?C.accent+"10":C.surface2,border:`2px solid ${a?C.accent:C.border}`,textAlign:"center"}}><div style={{fontSize:12,fontWeight:600,color:a?C.text:C.textSec}}>{s.label}</div></button>;})}</div></div>
          <div><div style={{fontSize:12,fontWeight:600,color:C.textSec,marginBottom:6}}>Model</div><div style={{display:"flex",gap:4}}>{MODELS.map(m=><button key={m.key} onClick={()=>setModel(m.key)} style={{padding:"6px 12px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",background:model===m.key?C.accent+"15":C.surface2,border:`1.5px solid ${model===m.key?C.accent:C.border}`}}><div style={{fontSize:11,fontWeight:600,color:model===m.key?C.text:C.textSec}}>{m.label}</div><div style={{fontSize:9,color:C.textDim}}>${m.price} · {m.desc}</div></button>)}</div></div>
        </div>
        <div style={{background:C.accent+"08",borderRadius:14,padding:16,border:`1px solid ${C.accent}20`,marginBottom:14}}>
          <div style={{fontSize:16,fontWeight:700}}>{promptCount} concepts{andromeda?` × 3 vars`:""} × {sizes.length} size{sizes.length>1?"s":""} = {totalImages} images</div>
          <div style={{fontSize:12,color:C.textSec}}>Est: ${(totalImages*mi.price).toFixed(2)}{andromeda?" · Andromeda optimized":""}</div>
        </div>
        <Btn v="pri" s="lg" full onClick={runGenerate} disabled={isWorking}>{isWorking?"Analyzing...":"Generate Prompts"}</Btn>
      </div>}

      {/* TRANSFORM */}
      {view==="transform"&&cl&&<div className="fi">
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><h2 style={{fontSize:22,fontWeight:700}}>Transform — {cl.name}</h2><Btn v="ghost" s="sm" onClick={()=>setView("profile")}>Back</Btn></div>
        <ImageGrid images={txAds} onAdd={imgs=>setTxAds(prev=>[...prev,...imgs].slice(0,5))} onRemove={i=>setTxAds(prev=>prev.filter((_,idx)=>idx!==i))} max={5} label="Ads to Transform" desc="Upload 1-5 ads to recreate for this brand" required/>
        <Inp label="Instructions (optional)" value={txInstructions} onChange={setTxInstructions} placeholder="Use our summer offer, make it more premium..." textarea rows={2}/>
        <Toggle label="Andromeda 3x Variations" value={andromeda} onChange={setAndromeda} desc="3 variations per ad — different persona, setting, emotion each"/>
        <div style={{background:C.card,borderRadius:14,padding:16,border:`1px solid ${C.border}`,marginBottom:12}}>
          <div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:600,color:C.textSec,marginBottom:6}}>Sizes</div><div style={{display:"flex",gap:6}}>{SIZES.map(s=>{const a=sizes.includes(s.key);return <button key={s.key} onClick={()=>toggleSize(s.key)} style={{flex:1,padding:"8px 6px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",background:a?C.accent+"10":C.surface2,border:`2px solid ${a?C.accent:C.border}`,textAlign:"center"}}><div style={{fontSize:12,fontWeight:600,color:a?C.text:C.textSec}}>{s.label}</div></button>;})}</div></div>
          <div><div style={{fontSize:12,fontWeight:600,color:C.textSec,marginBottom:6}}>Model</div><div style={{display:"flex",gap:4}}>{MODELS.map(m=><button key={m.key} onClick={()=>setModel(m.key)} style={{padding:"6px 12px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",background:model===m.key?C.accent+"15":C.surface2,border:`1.5px solid ${model===m.key?C.accent:C.border}`}}><div style={{fontSize:11,fontWeight:600,color:model===m.key?C.text:C.textSec}}>{m.label}</div></button>)}</div></div>
        </div>
        <div style={{background:C.purple+"08",borderRadius:14,padding:16,border:`1px solid ${C.purple}20`,marginBottom:14}}>
          <div style={{fontSize:16,fontWeight:700}}>{txAds.length} ads{andromeda?` × 3 vars`:""} × {sizes.length} = {txAds.length*(andromeda?3:1)*sizes.length} images</div>
        </div>
        <Btn v="pri" s="lg" full onClick={runTransform} disabled={isWorking||txAds.length===0}>{isWorking?"Analyzing...":"Analyze & Transform"}</Btn>
      </div>}

      {/* REVIEW SCREENS */}
      {(view==="genReview"||view==="txReview")&&<div className="fi">
        {isWorking?<div style={{textAlign:"center",padding:"60px 20px"}}><PR progress={40} size={56}/><h2 style={{fontSize:20,fontWeight:600,marginTop:16}}>Analyzing{view==="txReview"?` ${txAds.length} ads`:""}</h2><p style={{fontSize:13,color:C.textSec,animation:"pulse 2s infinite",marginTop:6}}>{view==="genReview"?`Writing ${promptCount}${andromeda?" × 3":""}  prompts...`:"Generating transformations..."}</p></div>
        :<>
          {view==="genReview"&&analysis&&<div style={{background:C.card,borderRadius:12,padding:14,border:`1px solid ${C.border}`,marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Analysis</div>
            {analysis.positioning&&<div style={{fontSize:12,color:C.textSec,lineHeight:1.5,marginBottom:8}}>{analysis.positioning}</div>}
          </div>}
          <div style={{background:C.accent+"08",borderRadius:12,padding:14,border:`1px solid ${C.accent}20`,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div style={{fontSize:16,fontWeight:700}}>{view==="genReview"?`${prompts.length} concepts → ${flattenPrompts(prompts).length} images`:`${txAnalysis?.length||0} ads → ${flattenTx(txAnalysis||[]).length} images`}{andromeda?" (3x Andromeda)":""}</div>
            <div style={{display:"flex",gap:6}}><Btn v="sec" s="sm" onClick={()=>setView(view==="genReview"?"generate":"transform")}>Back</Btn><Btn v="pri" onClick={view==="genReview"?startGenImages:startTxImages}>Generate</Btn></div>
          </div>
          {view==="genReview"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:6}}>
            {prompts.map((p,i)=><div key={i} style={{background:C.card,borderRadius:10,padding:"12px 14px",border:`1px solid ${C.border}`}}>
              <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:4}}><span style={{fontSize:10,fontWeight:700,color:C.accent}}>#{p.id}</span><Pill color={C.teal}>{p.format}</Pill>{andromeda&&<Pill color={C.purple}>3 vars</Pill>}</div>
              <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{p.title}</div>
              {andromeda&&p.variations?.length>0&&<div style={{fontSize:10,color:C.textDim,marginTop:4}}>{p.variations.map(v=>`${v.var_id}: ${v.persona||v.emotion||""}`).join(" · ")}</div>}
            </div>)}
          </div>}
          {view==="txReview"&&txAnalysis&&txAnalysis.map((tx,i)=><div key={i} style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,marginBottom:8,padding:14,display:"flex",gap:12}}>
            {txAds[tx.index||i]&&<img src={txAds[tx.index||i].preview||("data:image/jpeg;base64,"+txAds[tx.index||i].base64)} alt="" style={{height:80,borderRadius:8}}/>}
            <div><div style={{display:"flex",gap:4,marginBottom:4}}><Pill color={C.teal}>Ad {(tx.index||i)+1}</Pill>{andromeda&&<Pill color={C.purple}>3 vars</Pill>}</div>
              <div style={{fontSize:12,color:C.textSec}}><span style={{color:C.red}}>Old: </span>{tx.original_text?.headline} → <span style={{color:C.green}}>New: </span><strong>{tx.new_text?.headline}</strong></div>
            </div>
          </div>)}
        </>}
      </div>}

      {/* GENERATING */}
      {(view==="generating"||view==="txGenerating")&&<div className="fi">
        {isWorking&&<div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,padding:"16px 20px",background:C.card,borderRadius:14,border:`1px solid ${C.border}`}}>
          <PR progress={Math.round(((view==="generating"?progress:txProgress).current/Math.max((view==="generating"?progress:txProgress).total,1))*100)}/>
          <div style={{flex:1}}><div style={{fontSize:15,fontWeight:600}}>Generating {(view==="generating"?progress:txProgress).current} / {(view==="generating"?progress:txProgress).total}</div><div style={{fontSize:12,color:C.textSec}}>Auto-retry on failure</div></div>
          <Btn v="danger" s="sm" onClick={()=>{abortRef.current=true;}}>Stop</Btn>
        </div>}
        <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center"}}>{(view==="generating"?results:txResults).map((item,fi)=><div key={fi} onClick={()=>item.image&&dl(item,"ad")} style={{width:240,borderRadius:12,overflow:"hidden",background:C.card,border:`1px solid ${C.border}`,cursor:item.image?"pointer":"default",transition:"transform .15s"}} onMouseEnter={e=>{if(item.image)e.currentTarget.style.transform="scale(1.02)";}} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
          {item.image?<img src={"data:"+(item.mimeType||"image/png")+";base64,"+item.image} alt="" style={{width:"100%",display:"block"}}/>:item.error?<div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",background:C.red+"06"}}><div style={{textAlign:"center",padding:12}}><div style={{fontSize:11,color:C.red}}>Failed</div></div></div>:<div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",background:C.surface2}}><span style={{fontSize:11,color:C.accent,animation:"pulse 1.5s infinite"}}>Generating...</span></div>}
          <div style={{padding:"8px 10px"}}><div style={{display:"flex",gap:4,alignItems:"center"}}><span style={{fontSize:9,fontWeight:700,color:C.accent}}>#{item.id}{item.var_id?item.var_id.slice(-1):""}</span><Pill color={C.teal}>{item.format||item.sizeLabel}</Pill><span style={{fontSize:9,color:C.textDim}}>{item.sizeLabel}</span></div>{item.persona&&<div style={{fontSize:9,color:C.purple,marginTop:2}}>{item.persona}</div>}</div>
        </div>)}</div>
      </div>}

      {/* GALLERY */}
      {(view==="gallery"||view==="txGallery")&&<div className="fi">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><h2 style={{fontSize:24,fontWeight:700}}>{view==="gallery"?sc:txSc} images</h2><p style={{fontSize:13,color:C.textSec}}>Click to download</p></div>
          <div style={{display:"flex",gap:6}}>
            <Btn v="sec" s="sm" onClick={()=>{saveToHistory(view==="gallery"?results:txResults);}}>Save to History</Btn>
            <Btn v="pri" s="sm" onClick={()=>{dlAll(view==="gallery"?results:txResults,"ad");saveToHistory(view==="gallery"?results:txResults);}}>Download All</Btn>
            <Btn v="ghost" s="sm" onClick={()=>setView("profile")}>Back to {cl?.name}</Btn>
          </div>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center"}}>{(view==="gallery"?results:txResults).filter(r=>r.image).map((item,fi)=><div key={fi} onClick={()=>dl(item,"ad")} style={{width:240,borderRadius:12,overflow:"hidden",background:C.card,border:`1px solid ${C.border}`,cursor:"pointer",transition:"transform .15s"}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.02)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
          <img src={"data:"+(item.mimeType||"image/png")+";base64,"+item.image} alt="" style={{width:"100%",display:"block"}}/>
          <div style={{padding:"8px 10px"}}><div style={{display:"flex",gap:4,alignItems:"center"}}><span style={{fontSize:9,fontWeight:700,color:C.accent}}>#{item.id}{item.var_id?item.var_id.slice(-1):""}</span><Pill color={C.teal}>{item.format||""}</Pill><span style={{fontSize:9,color:C.textDim}}>{item.sizeLabel}</span></div>{item.persona&&<div style={{fontSize:9,color:C.purple,marginTop:2}}>{item.persona}</div>}</div>
        </div>)}</div>
      </div>}

      {/* HISTORY */}
      {view==="history"&&cl&&<div className="fi">
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><h2 style={{fontSize:22,fontWeight:700}}>History — {cl.name}</h2><Btn v="ghost" s="sm" onClick={()=>setView("profile")}>Back</Btn></div>
        {historyLoading?<div style={{textAlign:"center",padding:40,color:C.textDim}}>Loading...</div>
        :history.length===0?<div style={{textAlign:"center",padding:40,color:C.textDim}}>No saved generations yet. Generate ads and click "Save to History".</div>
        :<div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center"}}>
          {history.slice().reverse().map((item,i)=><div key={item.id||i} style={{width:220,borderRadius:12,overflow:"hidden",background:C.card,border:`1px solid ${C.border}`,position:"relative"}}>
            {item.hasImage!==false&&<img src={item.image?("data:"+(item.mimeType||"image/png")+";base64,"+item.image):""} alt="" style={{width:"100%",display:"block"}} onError={e=>e.target.style.display="none"}/>}
            <div style={{padding:"8px 10px"}}>
              <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:2}}><Pill color={C.teal}>{item.format||item.size||""}</Pill>{item.varId&&<Pill color={C.purple}>{item.varId}</Pill>}</div>
              <div style={{fontSize:11,fontWeight:600}}>{item.title||""}</div>
              <div style={{fontSize:9,color:C.textDim}}>{new Date(item.date).toLocaleDateString()}</div>
            </div>
            <button onClick={()=>{if(confirm("Delete this image?"))deleteHistoryItem(item.id);}} style={{position:"absolute",top:6,right:6,width:22,height:22,borderRadius:11,background:"rgba(0,0,0,.6)",border:`1px solid ${C.red}40`,color:C.red,fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>×</button>
          </div>)}
        </div>}
      </div>}
    </div>

    {showNew&&<Modal title="New Client" onClose={()=>setShowNew(false)}><Inp label="Client Name" value={newName} onChange={setNewName} placeholder="Brand name"/><Btn v="pri" full onClick={createClient} disabled={!newName.trim()}>Create</Btn></Modal>}
    <footer style={{padding:"20px 24px",textAlign:"center",marginTop:32}}><p style={{fontSize:11,color:C.textDim}}>Creative Factory v10 · Andromeda Optimized · D-DOUBLEU MEDIA</p></footer>
  </div>;
}
