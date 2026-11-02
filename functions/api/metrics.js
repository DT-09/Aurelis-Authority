const H={"content-type":"application/json; charset=utf-8","cache-control":"no-store, max-age=0","x-content-type-options":"nosniff"};
const EVENTS=new Set(["page_view","workspace_open","audit_success","lead_form_open","lead_submit"]);
const SOURCES=new Set(["direct","github","agentfirst","agentdrawer","attest","other"]);
const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:H});
export async function onRequestPost({request,env}){
 if(!env?.DB)return json({ok:false},503);
 if(!(request.headers.get("content-type")||"").toLowerCase().includes("application/json"))return json({ok:false},415);
 let p;try{p=await request.json();}catch{return json({ok:false},400);}
 const event=typeof p?.event==="string"?p.event:"",source=SOURCES.has(p?.source)?p.source:"other";
 if(!EVENTS.has(event))return json({ok:false},400);
 const date=new Date().toISOString().slice(0,10);
 try{
  await env.DB.prepare("INSERT INTO inbound_metrics (event_date,event_name,source,event_count) VALUES (?1,?2,?3,1) ON CONFLICT(event_date,event_name,source) DO UPDATE SET event_count=event_count+1").bind(date,event,source).run();
  return json({ok:true},202);
 }catch{return json({ok:false},503);}
}