const H={"content-type":"application/json; charset=utf-8","cache-control":"no-store, max-age=0","x-content-type-options":"nosniff"};
const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:H});
export async function onRequestGet({request,env}){
 const token=env?.LEAD_ADMIN_TOKEN;
 if(!token||request.headers.get("authorization")!=="Bearer "+token)return json({error:"Not found."},404);
 if(!env?.DB)return json({error:"Lead database unavailable."},503);
 const days=Math.min(30,Math.max(1,Number(new URL(request.url).searchParams.get("days")||7)));
 const since=new Date(Date.now()-days*86400000).toISOString();
 try{
  const [leads,metrics,summary]=await Promise.all([
   env.DB.prepare("SELECT id,name,email,company,role,buyer_type,workflow,urgency,trace_readiness,source,landing_path,created_at,status FROM inbound_leads WHERE created_at>=?1 ORDER BY created_at DESC LIMIT 100").bind(since).all(),
   env.DB.prepare("SELECT event_date,event_name,source,event_count FROM inbound_metrics WHERE event_date>=?1 ORDER BY event_date DESC,event_name,source").bind(since.slice(0,10)).all(),
   env.DB.prepare("SELECT COUNT(*) AS total,SUM(CASE WHEN urgency='Within 7 days' THEN 1 ELSE 0 END) AS urgent,SUM(CASE WHEN trace_readiness='Ready to share a sanitized staging export' THEN 1 ELSE 0 END) AS trace_ready FROM inbound_leads WHERE created_at>=?1").bind(since).first()
  ]);
  return json({periodDays:days,summary:summary||{},leads:leads.results||[],metrics:metrics.results||[]});
 }catch{return json({error:"Could not read lead records."},503);}
}