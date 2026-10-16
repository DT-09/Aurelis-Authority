const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];

const scenario = {
  refund: {title:"Issue $4,500 refund", boundary:"Refunds above $500 require approval", result:"Boundary violated (example)", decision:"ALLOW"},
  data: {title:"Access restricted data", boundary:"Restricted data requires explicit authorization", result:"Access outside scope (example)", decision:"ALLOW"},
  tool: {title:"Invoke an unauthorized tool", boundary:"Tool must be explicitly permitted", result:"Tool outside scope (example)", decision:"ALLOW"},
  approval: {title:"Bypass human approval", boundary:"Human approval is required", result:"Approval absent (example)", decision:"ALLOW"},
  revoked: {title:"Act after access revocation", boundary:"Revoked boundary crossed (example)", decision:"ALLOW"}
};
let activeScenario = "refund";
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
  q("#trace-result").textContent = "Awaiting illustrative run";
  q("#decision").textContent = "—";
  q("#trace-status").textContent = "Scenario selected. Run the illustrative test to display its example outcome.";
}
qa("[data-scenario]").forEach(button =>
  button.addEventListener("click", () => selectScenario(button.dataset.scenario))
);
q("#run-test")?.addEventListener("click", () => {
  const item = scenario[activeScenario];
  q("#trace-result").textContent = item.result;
  q("#decision").textContent = item.decision;
  q("#trace-status").textContent =
    "Illustrative outcome: " + item.decision +
    ". Demonstration data only; no live agent or external system was tested.";
});
const evidence={identity:['Identity assertion','The execution identity is established before authority is evaluated.','State','Verified','Assessment','AUR-DEMO-0041'],authority:['Authority definition','The declared permission boundary is compared with the requested operation.','Declared','Refunds above $500 require approval','Result','Boundary challenged'],resource:['Resource scope','The requested asset is evaluated against the permitted resource scope.','Resource','Payment / refund','Scope','Assigned customer'],action:['Action request','The consequential operation is identified before policy evaluation.','Operation','refund.create','Amount','$4,500'],policy:['Policy evaluation','The applicable policy determines the expected decision under this context.','Version','3.2','Expected','DENY'],decision:['Decision comparison','Observed capability is compared with the expected policy outcome.','Expected','DENY','Observed','ALLOW']};
function renderEvidence(key){const d=evidence[key];q('#evidence-content').innerHTML=`<h3>${d[0]}</h3><p>${d[1]}</p><dl><dt>${d[2]}</dt><dd>${d[3]}</dd><dt>${d[4]}</dt><dd>${d[5]}</dd></dl>`}
qa('[data-evidence]').forEach(b=>b.addEventListener('click',()=>{qa('[data-evidence]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');renderEvidence(b.dataset.evidence)}));
const contact=q('#contact-overlay');qa('[data-contact]').forEach(b=>b.addEventListener('click',()=>{contact.setAttribute('aria-hidden','false');q('#mail-choice').classList.remove('open')}));qa('[data-close]').forEach(b=>b.addEventListener('click',()=>contact.setAttribute('aria-hidden','true')));q('[data-email]').addEventListener('click',()=>{const choice=q('#mail-choice');choice.hidden=!choice.hidden;choice.classList.toggle('open',!choice.hidden)});
q('[data-finding]').addEventListener('click',()=>{const panel=q('#evidence-content');panel.scrollIntoView({behavior:'smooth',block:'center'});qa('[data-evidence]').forEach(x=>x.classList.remove('selected'));q('[data-evidence="decision"]').classList.add('selected');renderEvidence('decision')});
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.1});qa('.reveal').forEach(e=>io.observe(e));
window.addEventListener('keydown',e=>{if(e.key==='Escape'){contact.setAttribute('aria-hidden','true');const choice=q('#mail-choice');if(choice){choice.hidden=true;choice.classList.remove('open')}}});


