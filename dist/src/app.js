const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
const pop=q('#lattice-popover'),
      lattice=q('#lattice'),
      stage=q('#lattice-stage');

function showInspect(){}

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

/*
 * AURELIS AUTHORITY MODEL
 *
 * This is deliberately a spatial authority system rather than
 * a flowchart, polygon, or rigid lattice.
 */

const authorityPositions={
  agent:{x:50,y:18,z:120},
  identity:{x:23,y:37,z:20},
  resource:{x:77,y:37,z:20},
  action:{x:50,y:47,z:155},
  policy:{x:27,y:67,z:55},
  context:{x:73,y:67,z:55},
  decision:{x:50,y:84,z:190}
};

const authorityRelationships=[
  ['agent','identity'],
  ['agent','resource'],
  ['agent','action'],
  ['identity','action'],
  ['resource','action'],
  ['policy','action'],
  ['context','action'],
  ['identity','policy'],
  ['resource','policy'],
  ['resource','context'],
  ['policy','decision'],
  ['context','decision'],
  ['action','decision']
];

if(lattice && stage){

  /*
   * Make the visual self-contained so the model does not depend
   * on fragile assumptions in the old lattice CSS.
   */
  if(!document.querySelector('#authority-model-runtime-style')){
    const style=document.createElement('style');
    style.id='authority-model-runtime-style';
    style.textContent=`
      #lattice-stage{
        position:relative;
        width:100%;
        min-height:620px;
        perspective:1400px;
        overflow:hidden;
        cursor:grab;
        touch-action:none;
      }

      #lattice-stage.is-dragging{
        cursor:grabbing;
      }

      #lattice{
        position:absolute;
        inset:0;
        transform-style:preserve-3d;
        transform:rotateX(-7deg) rotateY(0deg);
        transition:transform .08s linear;
      }

      .authority-runtime-line{
        position:absolute;
        height:1px;
        transform-origin:0 50%;
        background:rgba(192,154,98,.30);
        pointer-events:none;
        transform-style:preserve-3d;
      }

      .authority-runtime-line.is-related{
        background:rgba(36,90,104,.72);
      }

      .authority-runtime-node{
        position:absolute;
        transform:
          translate(-50%,-50%)
          translateZ(var(--authority-z));
        transform-style:preserve-3d;
        border:0;
        padding:0;
        background:none;
        color:#E9E2D2;
        cursor:pointer;
        text-align:center;
        z-index:5;
        min-width:105px;
      }

      .authority-runtime-node .node-point{
        display:block;
        width:13px;
        height:13px;
        margin:0 auto 12px;
        border:1px solid rgba(192,154,98,.85);
        border-radius:50%;
        background:#101313;
        box-shadow:0 0 0 5px rgba(192,154,98,.055);
        transition:
          transform .25s ease,
          box-shadow .25s ease,
          border-color .25s ease;
      }

      .authority-runtime-node .node-label{
        display:block;
        font-family:inherit;
        font-size:11px;
        letter-spacing:.20em;
        font-weight:600;
        white-space:nowrap;
      }

      .authority-runtime-node .node-role{
        display:block;
        margin-top:6px;
        font-size:10px;
        letter-spacing:.06em;
        color:#A8A49A;
        opacity:.82;
        white-space:nowrap;
      }

      .authority-runtime-node[data-node="decision"] .node-point{
        width:17px;
        height:17px;
        border-color:#245A68;
        box-shadow:0 0 0 7px rgba(36,90,104,.09);
      }

      .authority-runtime-node.is-selected .node-point{
        transform:scale(1.35);
        border-color:#C09A62;
        box-shadow:
          0 0 0 7px rgba(192,154,98,.09),
          0 0 24px rgba(192,154,98,.12);
      }

      .authority-runtime-node.is-related .node-label{
        color:#C09A62;
      }

      .authority-runtime-detail{
        position:absolute;
        left:50%;
        bottom:22px;
        width:min(360px,calc(100% - 40px));
        transform:translateX(-50%) translateY(8px);
        padding:16px 18px;
        border:1px solid rgba(192,154,98,.20);
        background:rgba(8,10,10,.92);
        backdrop-filter:blur(10px);
        opacity:0;
        pointer-events:none;
        transition:opacity .22s ease,transform .22s ease;
        z-index:20;
      }

      .authority-runtime-detail.is-open{
        opacity:1;
        transform:translateX(-50%) translateY(0);
      }

      .authority-runtime-detail .detail-kicker{
        font-size:9px;
        letter-spacing:.18em;
        color:#A9824F;
        margin-bottom:7px;
      }

      .authority-runtime-detail .detail-title{
        font-family:inherit;
        font-size:20px;
        letter-spacing:.04em;
        color:#E9E2D2;
        margin-bottom:7px;
      }

      .authority-runtime-detail .detail-copy{
        font-size:12px;
        line-height:1.55;
        color:#A8A49A;
      }

      @media(max-width:700px){
        #lattice-stage{
          min-height:540px;
        }

        .authority-runtime-node{
          min-width:80px;
        }

        .authority-runtime-node .node-label{
          font-size:9px;
          letter-spacing:.14em;
        }

        .authority-runtime-node .node-role{
          display:none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  lattice.innerHTML='';
  lattice.style.transform='rotateX(-7deg) rotateY(0deg)';

  const lines=document.createElement('div');
  lines.className='authority-runtime-lines';
  lines.style.cssText='position:absolute;inset:0;transform-style:preserve-3d;';

  const nodes=document.createElement('div');
  nodes.className='authority-runtime-nodes';
  nodes.style.cssText='position:absolute;inset:0;transform-style:preserve-3d;';

  const detail=document.createElement('div');
  detail.className='authority-runtime-detail';
  detail.setAttribute('aria-hidden','true');

  lattice.appendChild(lines);
  lattice.appendChild(nodes);
  stage.appendChild(detail);

  let selected=null;
  let dragging=false;
  let lastX=0;
  let lastY=0;
  let rotationX=-7;
  let rotationY=0;

  const nodeEls={};

  function render(){

    lattice.style.transform=
      `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;

    Object.entries(nodeEls).forEach(([id,el])=>{
      const p=authorityPositions[id];

      el.style.left=`${p.x}%`;
      el.style.top=`${p.y}%`;
      el.style.setProperty('--authority-z',`${p.z}px`);

      el.classList.toggle('is-selected',id===selected);

      const related=
        selected &&
        (id===selected ||
         authorityRelationships.some(pair=>
           pair.includes(selected) && pair.includes(id)
         ));

      el.classList.toggle('is-related',Boolean(related));
    });

    lines.innerHTML='';

    const rect=stage.getBoundingClientRect();

    authorityRelationships.forEach(([a,b])=>{
      const p1=authorityPositions[a];
      const p2=authorityPositions[b];

      const x1=rect.width*p1.x/100;
      const y1=rect.height*p1.y/100;
      const x2=rect.width*p2.x/100;
      const y2=rect.height*p2.y/100;

      const dx=x2-x1;
      const dy=y2-y1;
      const length=Math.sqrt(dx*dx+dy*dy);
      const angle=Math.atan2(dy,dx)*180/Math.PI;

      const line=document.createElement('div');
      line.className='authority-runtime-line';

      if(
        selected &&
        (
          a===selected ||
          b===selected
        )
      ){
        line.classList.add('is-related');
      }

      line.style.left=`${x1}px`;
      line.style.top=`${y1}px`;
      line.style.width=`${length}px`;
      line.style.transform=`rotate(${angle}deg) translateZ(0)`;

      lines.appendChild(line);
    });
  }

  function selectAuthorityNode(id){

    const info=nodeInfo[id];
    if(!info) return;

    selected=id;

    detail.innerHTML=`
      <div class="detail-kicker">AUTHORITY MODEL</div>
      <div class="detail-title">${info[0]}</div>
      <div class="detail-copy">${info[1]}</div>
    `;

    detail.classList.add('is-open');
    detail.setAttribute('aria-hidden','false');

    render();
  }

  function clearAuthoritySelection(){

    selected=null;
    detail.classList.remove('is-open');
    detail.setAttribute('aria-hidden','true');

    render();
  }

  AUTHORITY_NODES:
  ['agent','identity','resource','action','policy','context','decision']
    .forEach(id=>{
      const info=nodeInfo[id];

      const button=document.createElement('button');
      button.type='button';
      button.className='authority-runtime-node';
      button.dataset.node=id;
      button.setAttribute('aria-label',info[0]);

      button.innerHTML=`
        <span class="node-point"></span>
        <span class="node-label">${info[0].toUpperCase()}</span>
        <span class="node-role">${info[1].split('.')[0]}</span>
      `;

      button.addEventListener('click',event=>{
        event.stopPropagation();
        selectAuthorityNode(id);
      });

      nodes.appendChild(button);
      nodeEls[id]=button;
    });

  /*
   * Preserve compatibility with the original test suite/API.
   */
  window.showInspect=function(id){
    if(id && nodeInfo[id]){
      selectAuthorityNode(id);
    }else if(!id){
      clearAuthoritySelection();
    }
  };

  stage.addEventListener('pointerdown',event=>{
    if(event.target.closest('.authority-runtime-node') ||
       event.target.closest('.authority-runtime-detail')){
      return;
    }

    dragging=true;
    lastX=event.clientX;
    lastY=event.clientY;
    stage.classList.add('is-dragging');

    try{
      stage.setPointerCapture(event.pointerId);
    }catch{}
  });

  stage.addEventListener('pointermove',event=>{
    if(!dragging) return;

    const dx=event.clientX-lastX;
    const dy=event.clientY-lastY;

    rotationY+=dx*.22;
    rotationX-=dy*.14;

    rotationX=Math.max(-25,Math.min(25,rotationX));

    lastX=event.clientX;
    lastY=event.clientY;

    render();
  });

  stage.addEventListener('pointerup',event=>{
    dragging=false;
    stage.classList.remove('is-dragging');

    try{
      stage.releasePointerCapture(event.pointerId);
    }catch{}
  });

  stage.addEventListener('pointercancel',()=>{
    dragging=false;
    stage.classList.remove('is-dragging');
  });

  stage.addEventListener('click',event=>{
    if(
      event.target===stage ||
      event.target===lattice ||
      event.target===lines ||
      event.target===nodes
    ){
      clearAuthoritySelection();
    }
  });

  render();
}
const evidence={identity:['Identity assertion','The execution identity is established before authority is evaluated.','State','Verified','Assessment','AUR-DEMO-0041'],authority:['Authority definition','The declared permission boundary is compared with the requested operation.','Declared','Refunds above $500 require approval','Result','Boundary challenged'],resource:['Resource scope','The requested asset is evaluated against the permitted resource scope.','Resource','Payment / refund','Scope','Assigned customer'],action:['Action request','The consequential operation is identified before policy evaluation.','Operation','refund.create','Amount','$4,500'],policy:['Policy evaluation','The applicable policy determines the expected decision under this context.','Version','3.2','Expected','DENY'],decision:['Decision comparison','Observed capability is compared with the expected policy outcome.','Expected','DENY','Observed','ALLOW']};
function renderEvidence(key){const d=evidence[key];q('#evidence-content').innerHTML=`<h3>${d[0]}</h3><p>${d[1]}</p><dl><dt>${d[2]}</dt><dd>${d[3]}</dd><dt>${d[4]}</dt><dd>${d[5]}</dd></dl>`}
qa('[data-evidence]').forEach(b=>b.addEventListener('click',()=>{qa('[data-evidence]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');renderEvidence(b.dataset.evidence)}));
const contact=q('#contact-overlay');qa('[data-contact]').forEach(b=>b.addEventListener('click',()=>{contact.setAttribute('aria-hidden','false');q('#mail-choice').classList.remove('open')}));qa('[data-close]').forEach(b=>b.addEventListener('click',()=>contact.setAttribute('aria-hidden','true')));q('[data-email]').addEventListener('click',()=>q('#mail-choice').classList.toggle('open'));
q('[data-finding]').addEventListener('click',()=>{const panel=q('#evidence-content');panel.scrollIntoView({behavior:'smooth',block:'center'});qa('[data-evidence]').forEach(x=>x.classList.remove('selected'));q('[data-evidence="decision"]').classList.add('selected');renderEvidence('decision')});
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.1});qa('.reveal').forEach(e=>io.observe(e));
window.addEventListener('keydown',e=>{if(e.key==='Escape'){contact.setAttribute('aria-hidden','true');pop.classList.remove('open');qa('.node').forEach(x=>x.classList.remove('selected'))}});


