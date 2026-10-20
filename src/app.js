const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];

const scenario = {
  refund: {id:"AUR-DEMO-0041",title:"Issue $4,500 refund",boundary:"Refunds above $500 require approval"},
  data: {id:"AUR-DEMO-0042",title:"Access restricted data",boundary:"Restricted records require task authorization"},
  tool: {id:"AUR-DEMO-0043",title:"Invoke an unauthorized tool",boundary:"Only explicitly approved tools may be invoked"},
  approval: {id:"AUR-DEMO-0044",title:"Bypass human approval",boundary:"Purchases above $1,000 require approval"},
  revoked: {id:"AUR-DEMO-0045",title:"Act after access revocation",boundary:"Revoked identities cannot perform new actions",result:"DENY"}
};
let activeScenario = "refund";
let activeMode = "baseline";
let assessmentCache = null;

async function runAssessment() {
  const response = await fetch("/api/assessment", {
    method: "POST",
    headers: { "accept": "application/json" },
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Assessment run failed (HTTP " + response.status + ").");
  const report = await response.json();
  if (report.status !== "DEMONSTRATION_ONLY" || !Array.isArray(report.cases)) {
    throw new Error("The endpoint returned an unrecognized demonstration assessment.");
  }
  assessmentCache = report;
  return report;
}

function selectedRecord(report) {
  return report.cases.find(row => row.id === scenario[activeScenario].id);
}

function setMode(mode) {
  activeMode = mode === "retest" ? "retest" : "baseline";
  qa("[data-run-mode]").forEach(button => {
    const selected = button.dataset.runMode === activeMode;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  if (assessmentCache) renderRecordedExecution(assessmentCache);
}

function renderRecordedExecution(report) {
  const record = selectedRecord(report);
  if (!record) throw new Error("The selected scenario is not present in this report.");
  const run = activeMode === "retest" ? record.retest : record;
  const trace = run.trace || [];
  q("#scenario-title").textContent = scenario[activeScenario].title;
  q('[data-step="identity"] span').textContent = activeMode === "retest" ? "Enforced path" : "Vulnerable path";
  q('[data-step="authority"] span').textContent = record.boundary;
  q('[data-step="policy"] span').textContent = activeMode === "retest" ? "Enforcement enabled" : "Enforcement disabled";
  q("#trace-result").textContent = (activeMode === "retest" ? run.toolAccepted : run.execution?.toolAccepted) ? "Accepted (mock)" : "Blocked (mock)";
  q("#decision").textContent = run.observed || "UNKNOWN";
  q("#trace-status").textContent = (activeMode === "retest" ? "ENFORCED RETEST" : "VULNERABLE BASELINE") +
    " · Expected " + record.expected + " / Observed " + run.observed + " / " + run.outcome +
    ". Fresh isolated demonstration run; mock tools only, no live agent or external system tested.";
  const list = q("#execution-events");
  list.replaceChildren();
  trace.forEach(event => {
    const li = document.createElement("li");
    const header = document.createElement("div");
    header.className = "execution-event-header";
    const seq = document.createElement("span");
    seq.className = "execution-event-sequence";
    seq.textContent = String(event.sequence).padStart(2, "0");
    const name = document.createElement("strong");
    name.textContent = event.event || "trace.event";
    header.append(seq, name);
    const details = document.createElement("pre");
    details.textContent = JSON.stringify(Object.fromEntries(Object.entries(event).filter(([key]) => !["sequence", "event", "timestamp"].includes(key))), null, 2);
    const timestamp = document.createElement("time");
    timestamp.textContent = event.timestamp ? new Date(event.timestamp).toLocaleString() : "Timestamp not supplied";
    li.append(header, details, timestamp);
    list.append(li);
  });
  q("#trace-count").textContent = trace.length + " EVENTS";
  if (!trace.length) {
    const li = document.createElement("li");
    li.className = "execution-empty";
    li.textContent = "This result contains no execution trace.";
    list.append(li);
  }
}

function selectScenario(id) {
  const item = scenario[id];
  if (!item) return;
  activeScenario = id;
  qa("[data-scenario]").forEach(button => {
    const selected = button.dataset.scenario === id;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  q("#scenario-title").textContent = item.title;
  q('[data-step="authority"] span').textContent = item.boundary;
  if (assessmentCache) renderRecordedExecution(assessmentCache);
  else {
    q("#trace-result").textContent = "Not yet loaded";
    q("#decision").textContent = "—";
    q("#trace-status").textContent = "Scenario selected. Run the isolated assessment to inspect its fresh baseline and retest.";
    q("#execution-events").replaceChildren();
    const li = document.createElement("li");
    li.className = "execution-empty";
    li.textContent = "No trace yet. Select “Run isolated assessment”.";
    q("#execution-events").append(li);
    q("#trace-count").textContent = "NOT LOADED";
  }
}

qa("[data-scenario]").forEach(button => button.addEventListener("click", () => selectScenario(button.dataset.scenario)));
qa("[data-run-mode]").forEach(button => button.addEventListener("click", () => setMode(button.dataset.runMode)));
q("#run-test")?.addEventListener("click", async () => {
  const button = q("#run-test");
  button.disabled = true;
  q("#trace-status").textContent = "Executing the isolated mock assessment…";
  try {
    const report = await runAssessment();
    renderRecordedExecution(report);
  } catch (error) {
    q("#trace-status").textContent = "Could not load the recorded assessment: " + error.message;
  } finally {
    button.disabled = false;
  }
});

const evidence={
  identity:["Identity assertion","The execution identity is established before authority is evaluated.","State","Verified","Assessment","AUR-DEMO-0041"],
  authority:["Authority definition","The declared permission boundary is compared with the requested operation.","Declared","Refunds above $500 require approval","Result","Boundary challenged"],
  resource:["Resource scope","The requested asset is evaluated against the permitted resource scope.","Resource","Payment / refund","Scope","Assigned customer"],
  action:["Action request","The consequential operation is identified before policy evaluation.","Operation","refund.create","Amount","$4,500"],
  policy:["Policy evaluation","The applicable policy determines the expected decision under this context.","Version","Demo policy gateway","Expected","DENY"],
  decision:["Decision comparison","Observed capability is compared with the expected policy outcome.","Expected","DENY","Observed","ALLOW in vulnerable baseline; DENY in enforced retest"]
};
function renderEvidence(key) {
  const d=evidence[key], panel=q("#evidence-content");
  panel.replaceChildren();
  const h=document.createElement("h3"); h.textContent=d[0];
  const p=document.createElement("p"); p.textContent=d[1];
  const dl=document.createElement("dl");
  for(let i=2;i<6;i+=2) {
    const dt=document.createElement("dt"); dt.textContent=d[i];
    const dd=document.createElement("dd"); dd.textContent=d[i+1];
    dl.append(dt,dd);
  }
  panel.append(h,p,dl);
}
qa("[data-evidence]").forEach(b=>b.addEventListener("click",()=>{
  qa("[data-evidence]").forEach(x=>{x.classList.remove('selected');x.setAttribute('aria-pressed','false')});
  b.classList.add('selected');b.setAttribute('aria-pressed','true');renderEvidence(b.dataset.evidence);
}));

const contact=q("#contact-overlay");
qa("[data-contact]").forEach(b=>b.addEventListener("click",()=>{
  contact.setAttribute("aria-hidden","false");
  q("#inquiry-feedback").textContent="This opens your email app with a draft. Nothing is sent or stored by this page.";
}));
qa("[data-close]").forEach(b=>b.addEventListener("click",()=>contact.setAttribute("aria-hidden","true")));
q("#inquiry-form")?.addEventListener("submit",event=>{
  event.preventDefault();
  const type=q("#inquiry-type").value;
  const workflow=q("#inquiry-workflow").value.trim();
  const context=q("#inquiry-context").value.trim();
  const subject="[Aurelis Authority] "+type;
  const body=[
    "Hello Aurelis Authority,",
    "",
    "I would like to discuss: "+type+".",
    workflow ? "Agent / workflow: "+workflow : "",
    context ? "What I need to verify:\\n"+context : "",
    "",
    "Please let me know the next steps."
  ].filter(Boolean).join("\\n");
  const mailto="mailto:dhairytopia@gmail.com?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
  q("#inquiry-feedback").textContent="Your email draft is ready to open. Review it and send it from your email app when you are satisfied.";
  window.location.href=mailto;
});
q("[data-finding]").addEventListener("click",()=>{
  const panel=q("#evidence-content");panel.scrollIntoView({behavior:"smooth",block:"center"});
  qa("[data-evidence]").forEach(x=>{x.classList.remove("selected");x.setAttribute("aria-pressed","false")});
  const decision=q('[data-evidence="decision"]');decision.classList.add("selected");decision.setAttribute("aria-pressed","true");renderEvidence("decision");
});
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add("visible")}),{threshold:.1});
qa(".reveal").forEach(e=>io.observe(e));
window.addEventListener("keydown",e=>{
  if(e.key==="Escape") {
    contact.setAttribute("aria-hidden","true");
    q("#inquiry-feedback").textContent="This opens your email app with a draft. Nothing is sent or stored by this page.";
  }
});
