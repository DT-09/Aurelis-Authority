const params=new URLSearchParams(window.location.search);
const known=new Set(["github","agentfirst","agentdrawer","attest","other"]);
const raw=(params.get("utm_source")||"direct").toLowerCase();
const source=known.has(raw)?raw:"direct";
function track(event){
  if(!["page_view","workspace_open","audit_success","lead_form_open","lead_submit"].includes(event))return;
  fetch("/api/metrics",{method:"POST",headers:{"content-type":"application/json"},cache:"no-store",keepalive:true,body:JSON.stringify({event,source})}).catch(()=>{});
}
window.aurelisTrack=track;
track("page_view");
if(window.location.pathname==="/workspace.html")track("workspace_open");
