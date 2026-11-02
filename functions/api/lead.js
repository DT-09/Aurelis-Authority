const HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store, max-age=0","x-content-type-options":"nosniff"};
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BUYER_TYPES=new Set(["AI product team","AI implementation agency","Agent QA or security team","Other"]);
const URGENCY=new Set(["Within 7 days","Within 30 days","Researching"]);
const READINESS=new Set(["Ready to share a sanitized staging export","Can export after setup","No trace export yet"]);
const clean=(v,n)=>typeof v==="string"?v.trim().slice(0,n):"";
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:HEADERS});}
export async function onRequestPost({request,env}){
 if(!env?.DB)return json({error:"Enquiry capture is temporarily unavailable. Please use the email contact link."},503);
 if(!(request.headers.get("content-type")||"").toLowerCase().includes("application/json"))return json({error:"Content-Type must be application/json."},415);
 let p;try{p=await request.json();}catch{return json({error:"Please submit a valid enquiry."},400);}
 if(!p||typeof p!=="object"||Array.isArray(p))return json({error:"Invalid enquiry."},400);
 if(clean(p.website,200))return json({ok:true,message:"Thank you. Your enquiry has been received."},201);
 const name=clean(p.name,80),email=clean(p.email,254).toLowerCase(),company=clean(p.company,120),role=clean(p.role,100),buyer=clean(p.buyerType,80),workflow=clean(p.workflow,300),urgency=clean(p.urgency,40),readiness=clean(p.traceReadiness,80),source=clean(p.source,60).replace(/[^a-zA-Z0-9_-]/g,"")||"direct";
 const rawPath=clean(p.landingPath,160),path=rawPath.startsWith("/")?rawPath:"/";
 if(name.length<2||!EMAIL.test(email)||!BUYER_TYPES.has(buyer)||workflow.length<12||!URGENCY.has(urgency)||!READINESS.has(readiness)||p.consent!==true)return json({error:"Complete the required fields and consent so we can respond to your enquiry."},400);
 const now=new Date().toISOString();
 try{
  const recent=await env.DB.prepare("SELECT COUNT(*) AS total FROM inbound_leads WHERE email=?1 AND created_at>=?2").bind(email,new Date(Date.now()-3600000).toISOString()).first();
  if((recent?.total||0)>=3)return json({error:"Too many enquiries from this address. Please try again later."},429);
  const id=crypto.randomUUID();
  await env.DB.prepare("INSERT INTO inbound_leads (id,name,email,company,role,buyer_type,workflow,urgency,trace_readiness,source,landing_path,created_at,consent_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)").bind(id,name,email,company,role,buyer,workflow,urgency,readiness,source,path,now,now).run();
  return json({ok:true,id,message:"Enquiry received. Aurelis will review the workflow and reply using the email you provided."},201);
 }catch{return json({error:"We could not save your enquiry. Please use the email contact link instead."},503);}
}