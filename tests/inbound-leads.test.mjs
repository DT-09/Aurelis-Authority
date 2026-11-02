import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as submitLead } from "../functions/api/lead.js";
import { onRequestPost as trackMetric } from "../functions/api/metrics.js";
import { onRequestGet as readLeads } from "../functions/api/admin/leads.js";

function makeDb(){
 const leads=[],metrics=[];
 return {
  leads,metrics,
  prepare(sql){
   return {bind(...values){
    return {
     async first(){
      if(sql.includes("COUNT(*) AS total"))return {total:leads.filter(x=>x.email===values[0]&&x.created_at>=values[1]).length};
      if(sql.includes("SUM(CASE"))return {total:leads.length,urgent:leads.filter(x=>x.urgency==="Within 7 days").length,trace_ready:leads.filter(x=>x.trace_readiness==="Ready to share a sanitized staging export").length};
      return null;
     },
     async run(){
      if(sql.includes("INSERT INTO inbound_leads"))leads.push({id:values[0],name:values[1],email:values[2],company:values[3],role:values[4],buyer_type:values[5],workflow:values[6],urgency:values[7],trace_readiness:values[8],source:values[9],landing_path:values[10],created_at:values[11],consent_at:values[12],status:"NEW"});
      if(sql.includes("INSERT INTO inbound_metrics")){
       const found=metrics.find(x=>x.event_date===values[0]&&x.event_name===values[1]&&x.source===values[2]);
       if(found)found.event_count++;else metrics.push({event_date:values[0],event_name:values[1],source:values[2],event_count:1});
      }
      return {success:true};
     },
     async all(){
      if(sql.includes("FROM inbound_leads"))return {results:leads};
      if(sql.includes("FROM inbound_metrics"))return {results:metrics};
      return {results:[]};
     }
    };
   }};
  }
 };
}
function req(url,body,headers={}){return new Request(url,{method:"POST",headers:{"content-type":"application/json",...headers},body:JSON.stringify(body)});}
const valid={name:"Test Buyer",email:"buyer@example.com",company:"Example Systems",role:"Engineering lead",buyerType:"AI product team",workflow:"Support agent can issue customer refunds through an API.",urgency:"Within 7 days",traceReadiness:"Ready to share a sanitized staging export",source:"github",landingPath:"/",consent:true};

test("stores a qualified enquiry without storing a raw trace",async()=>{
 const DB=makeDb();const response=await submitLead({request:req("https://example.test/api/lead",valid),env:{DB}});
 assert.equal(response.status,201);assert.equal(DB.leads.length,1);assert.equal(DB.leads[0].email,"buyer@example.com");assert.equal(DB.leads[0].status,"NEW");
});
test("rejects incomplete or non-consented enquiries",async()=>{
 const DB=makeDb();const response=await submitLead({request:req("https://example.test/api/lead",{...valid,consent:false}),env:{DB}});
 assert.equal(response.status,400);assert.equal(DB.leads.length,0);
});
test("quietly discards honeypot submissions",async()=>{
 const DB=makeDb();const response=await submitLead({request:req("https://example.test/api/lead",{...valid,website:"spam"}),env:{DB}});
 assert.equal(response.status,201);assert.equal(DB.leads.length,0);
});
test("limits repeated submissions from one email address",async()=>{
 const DB=makeDb();for(let i=0;i<3;i++)assert.equal((await submitLead({request:req("https://example.test/api/lead",valid),env:{DB}})).status,201);
 assert.equal((await submitLead({request:req("https://example.test/api/lead",valid),env:{DB}})).status,429);
});
test("aggregates only allow-listed metric events",async()=>{
 const DB=makeDb();for(let i=0;i<2;i++)assert.equal((await trackMetric({request:req("https://example.test/api/metrics",{event:"page_view",source:"github"}),env:{DB}})).status,202);
 assert.equal(DB.metrics[0].event_count,2);
 assert.equal((await trackMetric({request:req("https://example.test/api/metrics",{event:"email_open",source:"github"}),env:{DB}})).status,400);
});
test("protects lead and metric export with an admin bearer token",async()=>{
 const DB=makeDb();await submitLead({request:req("https://example.test/api/lead",valid),env:{DB}});
 const denied=await readLeads({request:new Request("https://example.test/api/admin/leads"),env:{DB,LEAD_ADMIN_TOKEN:"secret"}});
 assert.equal(denied.status,404);
 const allowed=await readLeads({request:new Request("https://example.test/api/admin/leads",{headers:{authorization:"Bearer secret"}}),env:{DB,LEAD_ADMIN_TOKEN:"secret"}});
 assert.equal(allowed.status,200);const result=await allowed.json();assert.equal(result.leads.length,1);assert.equal(result.summary.urgent,1);
});
