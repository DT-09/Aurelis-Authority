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
  const selectedEvidence = q("[data-evidence].selected");
  if (selectedEvidence) renderEvidence(selectedEvidence.dataset.evidence);
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
  if (!d || !panel) return;
  const record = assessmentCache ? selectedRecord(assessmentCache) : null;
  const run = record ? (activeMode === "retest" ? record.retest : record) : null;
  const rows = {
    identity: ["Execution path", run ? (activeMode === "retest" ? "demo-agent-with-enforcement" : "vulnerable-demo-agent") : "Illustrative execution identity", "Assessment", record ? record.id : "AUR-DEMO-0041", "Environment", "In-memory mock tools only"],
    authority: ["Declared boundary", record ? record.boundary : d[3], "Expected decision", record ? record.expected : "DENY", "Policy mode", run ? (activeMode === "retest" ? "Enforcement enabled" : "Enforcement disabled") : "Illustrative"],
    resource: ["Resource scope", record ? (record.args?.scope || record.args?.userId || record.args?.identityStatus || "Mock resource") : "Illustrative mock resource", "External effects", "None", "Scope", "Local simulation"],
    action: ["Requested operation", record ? record.action : "refund.create", "Arguments", record ? JSON.stringify(record.args || {}) : "amount: 4500; approvalToken: null", "Tool acceptance", run ? ((run.execution?.toolAccepted ?? run.toolAccepted) ? "Accepted by mock tool" : "Blocked by mock tool") : "Not run"],
    policy: ["Policy evaluation", record ? record.boundary : d[1], "Expected", record ? record.expected : "DENY", "Enforcement gate", run ? (activeMode === "retest" ? "Enabled in mock gateway" : "Disabled in vulnerable baseline") : "Illustrative"],
    decision: ["Observed result", run ? run.observed : "Not run", "Outcome", run ? run.outcome : "Illustrative only", "Remediation", record ? record.remediation : "Configure and verify enforcement at the tool boundary."]
  };
  const values = rows[key] || [d[0], d[1], d[2], d[3], d[4], d[5]];
  panel.replaceChildren();
  const h=document.createElement("h3"); h.textContent=d[0];
  const p=document.createElement("p"); p.textContent=run ? "Values below reflect the selected scenario and the most recent local demonstration run. This is not live customer evidence." : d[1];
  const dl=document.createElement("dl");
  for(let i=0;i<6;i+=2) {
    const dt=document.createElement("dt"); dt.textContent=values[i];
    const dd=document.createElement("dd"); dd.textContent=values[i+1];
    dl.append(dt,dd);
  }
  panel.append(h,p,dl);
}
qa("[data-evidence]").forEach(b=>b.addEventListener("click",()=>{
  qa("[data-evidence]").forEach(x=>{x.classList.remove('selected');x.setAttribute('aria-pressed','false')});
  b.classList.add('selected');b.setAttribute('aria-pressed','true');renderEvidence(b.dataset.evidence);
}));

const contact=q("#contact-overlay");
let previouslyFocused = null;
function openContact() {
  previouslyFocused = document.activeElement;
  contact.setAttribute("aria-hidden","false");
  q("#inquiry-feedback").textContent="This opens your email app with a draft. Nothing is sent or stored by this page.";
  q("#inquiry-type").focus();
}
function closeContact() {
  contact.setAttribute("aria-hidden","true");
  if (previouslyFocused && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
}
qa("[data-contact]").forEach(b=>b.addEventListener("click",openContact));
qa("[data-close]").forEach(b=>b.addEventListener("click",closeContact));
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
    context ? "What I need to verify:\n"+context : "",
    "",
    "Please let me know the next steps."
  ].filter(Boolean).join("\n");
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
  if(contact.getAttribute("aria-hidden") !== "false") return;
  if(e.key==="Escape") {
    closeContact();
    return;
  }
  if(e.key==="Tab") {
    const focusable = [...contact.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled])')];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if(e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* Low-density background field: decorative only, with reduced-motion support. */
const fieldCanvas = q("#field-canvas");
if (fieldCanvas && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const ctx = fieldCanvas.getContext("2d");
  let points = [];
  let frame = 0;
  let width = 0, height = 0;
  const resizeField = () => {
    const rect = fieldCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = rect.width; height = rect.height;
    fieldCanvas.width = Math.max(1, Math.floor(width * dpr));
    fieldCanvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(22, Math.max(10, Math.floor(width / 70)));
    points = Array.from({length: count}, (_, i) => ({
      x: (i * 97.3 % Math.max(width, 1)),
      y: (i * 173.7 % Math.max(height, 1)),
      vx: ((i % 3) - 1) * 0.07,
      vy: ((i % 4) - 1.5) * 0.045
    }));
  };
  const drawField = () => {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
      for (let j = i + 1; j < points.length; j++) {
        const other = points[j], dx = p.x - other.x, dy = p.y - other.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 145) {
          ctx.strokeStyle = "rgba(101,116,91," + ((1 - distance / 145) * 0.16) + ")";
          ctx.lineWidth = 0.65;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(other.x, other.y); ctx.stroke();
        }
      }
      ctx.fillStyle = "rgba(101,116,91,0.28)";
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.35, 0, Math.PI * 2); ctx.fill();
    }
    if (!document.hidden) frame = requestAnimationFrame(drawField);
  };
  resizeField();
  drawField();
  window.addEventListener("resize", () => {
    cancelAnimationFrame(frame);
    resizeField();
    drawField();
  }, {passive:true});
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else drawField();
  });
}
