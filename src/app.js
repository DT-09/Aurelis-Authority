const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
const pop=q('#lattice-popover'),
      lattice=q('#lattice'),
      stage=q('#lattice-stage');

const scenario={
  id:"AUR-DEMO-0041",
  title:"Refund authorization",
  description:"An AI agent attempts a refund operation against a controlled business resource.",
  requestedAction:"issue_refund",
  resource:"customer_refund",
  authorityBoundary:"Refunds above $500 require approval"
};

const nodeInfo={
  agent:['Agent','The workflow being assessed — its role, tools and intended operating scope.'],
  identity:['Identity','The principal under which the agent reaches systems and requests actions.'],
  resource:['Resource','The data, system or asset the agent is attempting to reach.'],
  action:['Action','The operation that turns access into an actual business effect.'],
  policy:['Policy','The control that defines what should be permitted under stated conditions.'],
  context:['Context','Conditions such as amount, tenant, approval state or authorization lifecycle.'],
  decision:['Decision','The resulting determination: allow, deny, constrain or escalate.']
};

const authorityRelationships=[
  ['agent','identity'],['agent','resource'],['agent','action'],
  ['identity','action'],['resource','action'],['policy','action'],
  ['context','action'],['identity','policy'],['resource','policy'],
  ['resource','context'],['policy','decision'],['context','decision'],
  ['action','decision']
];

if(lattice && stage){
  if(!document.querySelector('#authority-model-runtime-style')){
    const style=document.createElement('style');
    style.id='authority-model-runtime-style';
    style.textContent=`
      #lattice-stage{
        position:relative!important;
        display:block!important;
        width:100%;
        min-height:0!important;
        height:auto!important;
        padding:24px 12px;
        overflow:hidden;
        perspective:none!important;
        cursor:default!important;
        touch-action:auto!important;
        box-sizing:border-box;
      }
      #lattice{
        position:relative!important;
        inset:auto!important;
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr));
        grid-template-rows:auto auto auto auto;
        grid-template-areas:
          ". agent ."
          "identity action resource"
          "policy . context"
          ". decision .";
        gap:20px 10px;
        width:100%;
        height:auto!important;
        min-height:0!important;
        padding:18px 0 24px;
        transform:none!important;
        transform-style:flat!important;
        box-sizing:border-box;
      }
      #lattice > .node{
        position:relative!important;
        inset:auto!important;
        left:auto!important;
        top:auto!important;
        transform:none!important;
        display:flex!important;
        align-items:center;
        justify-content:center;
        width:100%!important;
        min-width:0!important;
        min-height:92px;
        margin:0!important;
        padding:12px 5px!important;
        border:1px solid rgba(192,154,98,.35)!important;
        border-radius:4px;
        background:rgba(192,154,98,.035)!important;
        color:#E9E2D2!important;
        cursor:pointer;
        box-sizing:border-box;
        z-index:2;
      }
      #lattice > .n-agent{grid-area:agent}
      #lattice > .n-identity{grid-area:identity}
      #lattice > .n-resource{grid-area:resource}
      #lattice > .n-action{grid-area:action}
      #lattice > .n-policy{grid-area:policy}
      #lattice > .n-context{grid-area:context}
      #lattice > .n-decision{grid-area:decision}
      #lattice > .node .node-face{
        display:flex!important;
        flex-direction:column;
        align-items:center;
        gap:7px;
      }
      #lattice > .node .node-face b{
        color:#A9824F;
        font-size:10px;
        letter-spacing:.12em;
      }
      #lattice > .node .node-face strong{
        font-size:11px;
        letter-spacing:.1em;
      }
      #lattice > .node .node-face small{
        color:#A8A49A;
        font-size:10px;
        line-height:1.4;
      }
      #lattice > .node.is-selected{
        border-color:#C09A62!important;
        background:rgba(192,154,98,.12)!important;
      }
      #lattice > .node.is-related{
        border-color:rgba(36,90,104,.9)!important;
      }
      #line-layer{
        position:absolute!important;
        inset:0!important;
        width:100%!important;
        height:100%!important;
        pointer-events:none!important;
        overflow:visible;
        z-index:1;
      }
      #lattice-popover{
        position:relative!important;
        inset:auto!important;
        display:none;
        width:100%!important;
        max-width:none!important;
        margin-top:8px;
        padding:16px;
        border:1px solid rgba(192,154,98,.3);
        background:#0b0d0d;
        box-sizing:border-box;
      }
      #lattice-popover.is-open{display:block!important}
      #pop-kicker{
        display:block;
        margin-bottom:8px;
        color:#A9824F;
        font-size:10px;
        letter-spacing:.16em;
      }
      #pop-title{
        display:block;
        margin-bottom:8px;
        color:#E9E2D2;
        font-size:18px;
      }
      #pop-copy{
        margin:0;
        color:#A8A49A;
        font-size:13px;
        line-height:1.6;
      }
      .lattice-hint{
        position:relative!important;
        inset:auto!important;
        margin-top:8px;
        text-align:center;
        color:#A8A49A;
        font-size:10px;
        letter-spacing:.12em;
      }
      @media(max-width:480px){
        #lattice{gap:12px 6px;padding:12px 0}
        #lattice > .node{min-height:82px;padding:8px 2px!important}
        #lattice > .node .node-face strong{font-size:9px}
        #lattice > .node .node-face small{font-size:9px}
      }
    `;
    document.head.appendChild(style);
  }

  const lineLayer=q('#line-layer');
  const popTitle=q('#pop-title');
  const popCopy=q('#pop-copy');
  let selected=null;

  if(lineLayer){
    lineLayer.innerHTML='';
    lineLayer.style.display='block';
  }

  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width','100%');
  svg.setAttribute('height','100%');
  svg.style.cssText='position:absolute;inset:0;overflow:visible';
  if(lineLayer) lineLayer.appendChild(svg);

  const nodeEls={};
  ['agent','identity','resource','action','policy','context','decision'].forEach(id=>{
    const el=lattice.querySelector(`[data-node="${id}"]`);
    if(!el) return;
    nodeEls[id]=el;
    el.setAttribute('aria-pressed','false');
    el.addEventListener('click',event=>{
      event.stopPropagation();
      selectAuthorityNode(id);
    });
  });

  function drawRelationships(){
    if(!lineLayer || !svg) return;
    svg.replaceChildren();

    const bounds=lattice.getBoundingClientRect();
    if(!bounds.width || !bounds.height) return;

    svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);

    authorityRelationships.forEach(([a,b])=>{
      const first=nodeEls[a],second=nodeEls[b];
      if(!first || !second) return;

      const r1=first.getBoundingClientRect();
      const r2=second.getBoundingClientRect();
      const x1=r1.left+r1.width/2-bounds.left;
      const y1=r1.top+r1.height/2-bounds.top;
      const x2=r2.left+r2.width/2-bounds.left;
      const y2=r2.top+r2.height/2-bounds.top;

      const line=document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1',x1);
      line.setAttribute('y1',y1);
      line.setAttribute('x2',x2);
      line.setAttribute('y2',y2);
      line.setAttribute('stroke',
        selected && (a===selected || b===selected)
          ? 'rgba(36,120,135,.95)'
          : 'rgba(192,154,98,.32)');
      line.setAttribute('stroke-width','1.2');
      svg.appendChild(line);
    });
  }

  function selectAuthorityNode(id){
    const info=nodeInfo[id];
    if(!info) return;
    selected=id;

    Object.entries(nodeEls).forEach(([key,el])=>{
      const related=key===id || authorityRelationships.some(
        pair=>pair.includes(id) && pair.includes(key)
      );
      el.classList.toggle('is-selected',key===id);
      el.classList.toggle('is-related',related && key!==id);
      el.setAttribute('aria-pressed',String(key===id));
    });

    if(popTitle) popTitle.textContent=info[0];
    if(popCopy) popCopy.textContent=info[1];
    if(pop){
      pop.classList.add('is-open');
      pop.setAttribute('aria-hidden','false');
    }
    requestAnimationFrame(drawRelationships);
  }

  function clearAuthoritySelection(){
    selected=null;
    Object.values(nodeEls).forEach(el=>{
      el.classList.remove('is-selected','is-related');
      el.setAttribute('aria-pressed','false');
    });
    if(pop){
      pop.classList.remove('is-open');
      pop.setAttribute('aria-hidden','true');
    }
    requestAnimationFrame(drawRelationships);
  }

  window.showInspect=function(id){
    if(id && nodeInfo[id]) selectAuthorityNode(id);
    else clearAuthoritySelection();
  };

  stage.addEventListener('click',event=>{
    if(event.target===stage) clearAuthoritySelection();
  });

  if('ResizeObserver' in window){
    new ResizeObserver(()=>requestAnimationFrame(drawRelationships)).observe(lattice);
  }else{
    window.addEventListener('resize',drawRelationships);
  }

  requestAnimationFrame(drawRelationships);
}
const evidence={identity:['Identity assertion','The execution identity is established before authority is evaluated.','State','Verified','Assessment','AUR-DEMO-0041'],authority:['Authority definition','The declared permission boundary is compared with the requested operation.','Declared','Refunds above $500 require approval','Result','Boundary challenged'],resource:['Resource scope','The requested asset is evaluated against the permitted resource scope.','Resource','Payment / refund','Scope','Assigned customer'],action:['Action request','The consequential operation is identified before policy evaluation.','Operation','refund.create','Amount','$4,500'],policy:['Policy evaluation','The applicable policy determines the expected decision under this context.','Version','3.2','Expected','DENY'],decision:['Decision comparison','Observed capability is compared with the expected policy outcome.','Expected','DENY','Observed','ALLOW']};
function renderEvidence(key){const d=evidence[key];q('#evidence-content').innerHTML=`<h3>${d[0]}</h3><p>${d[1]}</p><dl><dt>${d[2]}</dt><dd>${d[3]}</dd><dt>${d[4]}</dt><dd>${d[5]}</dd></dl>`}
qa('[data-evidence]').forEach(b=>b.addEventListener('click',()=>{qa('[data-evidence]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');renderEvidence(b.dataset.evidence)}));
const contact=q('#contact-overlay');qa('[data-contact]').forEach(b=>b.addEventListener('click',()=>{contact.setAttribute('aria-hidden','false');q('#mail-choice').classList.remove('open')}));qa('[data-close]').forEach(b=>b.addEventListener('click',()=>contact.setAttribute('aria-hidden','true')));q('[data-email]').addEventListener('click',()=>q('#mail-choice').classList.toggle('open'));
q('[data-finding]').addEventListener('click',()=>{const panel=q('#evidence-content');panel.scrollIntoView({behavior:'smooth',block:'center'});qa('[data-evidence]').forEach(x=>x.classList.remove('selected'));q('[data-evidence="decision"]').classList.add('selected');renderEvidence('decision')});
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.1});qa('.reveal').forEach(e=>io.observe(e));
window.addEventListener('keydown',e=>{if(e.key==='Escape'){contact.setAttribute('aria-hidden','true');pop.classList.remove('open');qa('.node').forEach(x=>x.classList.remove('selected'))}});


