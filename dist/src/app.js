const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];

const pop=q('#lattice-popover');
const lattice=q('#lattice');
const stage=q('#lattice-stage');

const nodeInfo={
  agent:[
    'Agent',
    'The AI system and workflow being assessed. Its intended role establishes the starting point for the authority relationship.'
  ],
  identity:[
    'Identity',
    'The principal, credential, or execution identity acting on behalf of the agent.'
  ],
  resource:[
    'Resource',
    'The data, system, API, file, account, or environment the agent can reach.'
  ],
  action:[
    'Action',
    'The consequential operation the agent is attempting to perform.'
  ],
  policy:[
    'Policy',
    'The rule that determines whether the requested action should be permitted.'
  ],
  context:[
    'Context',
    'Conditions such as amount, tenant, approval state, lifecycle, or operating environment that alter the decision.'
  ],
  decision:[
    'Decision',
    'The resulting authorization determination: ALLOW, DENY, CONSTRAIN, or ESCALATE.'
  ]
};

/*
  This is intentionally NOT a geometric solid.

  It is a spatial authority constellation:
  - AGENT establishes the system under assessment.
  - IDENTITY + ACTION establish who is acting and what is being attempted.
  - RESOURCE establishes what can be reached.
  - POLICY + CONTEXT determine the governing conditions.
  - DECISION is the resulting authorization state.

  Positions are deliberately asymmetric so the structure reads
  as one coherent system rather than a cube / hexagon / random graph.
*/
const positions={
  agent:[450,55,150],
  identity:[165,205,30],
  resource:[450,195,105],
  action:[735,205,25],
  policy:[255,405,75],
  context:[645,405,50],
  decision:[450,535,125]
};

const edges=[
  ['agent','identity'],
  ['agent','resource'],
  ['agent','action'],

  ['identity','resource'],
  ['resource','action'],

  ['identity','policy'],
  ['resource','policy'],
  ['resource','context'],
  ['action','context'],

  ['policy','context'],
  ['policy','decision'],
  ['context','decision'],
  ['action','decision']
];

function drawEdges(){
  const layer=q('#line-layer');
  layer.innerHTML='';

  for(const [a,b] of edges){
    const p1=positions[a];
    const p2=positions[b];

    const dx=p2[0]-p1[0];
    const dy=p2[1]-p1[1];
    const len=Math.hypot(dx,dy);

    const line=document.createElement('i');
    line.className='edge';
    line.dataset.edge=`${a}-${b}`;

    line.style.left=`${p1[0]}px`;
    line.style.top=`${p1[1]}px`;
    line.style.width=`${len}px`;
    line.style.transform=
      `translateZ(${(p1[2]+p2[2])/2}px) rotate(${Math.atan2(dy,dx)*180/Math.PI}deg)`;

    layer.appendChild(line);
  }
}

drawEdges();

const nodeEls=qa('.node');

function setNodeTransform(el,selected=false){
  const p=positions[el.dataset.node];

  el.style.transform=
    `translate3d(${p[0]}px,${p[1]}px,${p[2]+(selected?46:0)}px)`+
    `${selected?' scale(1.055)':''}`;

  el.style.marginLeft='-80px';
  el.style.marginTop='-36px';
}

nodeEls.forEach(n=>setNodeTransform(n));

function placePopover(btn){
  const r=btn.getBoundingClientRect();
  const sr=stage.getBoundingClientRect();

  let x=r.right-sr.left+20;
  let y=r.top-sr.top+r.height/2;

  if(x+245>sr.width){
    x=r.left-sr.left-265;
  }

  if(x<10){
    x=Math.min(sr.width-255,Math.max(10,r.left-sr.left));
  }

  y=Math.max(70,Math.min(sr.height-70,y));

  pop.style.left=`${x}px`;
  pop.style.top=`${y}px`;
}

function clearSelection(){
  nodeEls.forEach(n=>{
    n.classList.remove('selected');
    setNodeTransform(n,false);
  });

  pop.classList.remove('open');
  pop.setAttribute('aria-hidden','true');
}

function selectNode(n){
  nodeEls.forEach(x=>{
    x.classList.remove('selected');
    setNodeTransform(x,false);
  });

  n.classList.add('selected');
  setNodeTransform(n,true);

  const d=nodeInfo[n.dataset.node];

  q('#pop-kicker').textContent='AUTHORITY MODEL';
  q('#pop-title').textContent=d[0];
  q('#pop-copy').textContent=d[1];

  placePopover(n);

  pop.classList.add('open');
  pop.setAttribute('aria-hidden','false');
}

nodeEls.forEach(n=>{
  n.addEventListener('click',e=>{
    e.stopPropagation();
    selectNode(n);
  });
});

stage.addEventListener('click',e=>{
  if(!e.target.closest('.node')){
    clearSelection();
  }
});

/*
  Camera-facing labels:
  the constellation rotates, but the text layer counter-rotates.
  This keeps labels upright and readable.
*/
let rx=0;
let ry=0;
let drag=false;
let sx=0;
let sy=0;
let orx=0;
let ory=0;

function applyRotation(){
  lattice.style.transform=
    `translate3d(0,0,0) rotateX(${rx}deg) rotateY(${ry}deg)`;

  qa('.node-face').forEach(face=>{
    face.style.transform=
      `rotateY(${-ry}deg) rotateX(${-rx}deg)`;
  });
}

stage.addEventListener('pointerdown',e=>{
  if(e.target.closest('.node')) return;

  drag=true;
  sx=e.clientX;
  sy=e.clientY;
  orx=rx;
  ory=ry;

  lattice.classList.add('dragging');

  try{
    stage.setPointerCapture(e.pointerId);
  }catch{}
});

stage.addEventListener('pointermove',e=>{
  if(!drag) return;

  ry=ory+(e.clientX-sx)*0.24;
  rx=Math.max(
    -30,
    Math.min(30,orx-(e.clientY-sy)*0.16)
  );

  applyRotation();

  if(pop.classList.contains('open')){
    pop.classList.remove('open');
  }
});

function stopDrag(){
  drag=false;
  lattice.classList.remove('dragging');
}

stage.addEventListener('pointerup',stopDrag);
stage.addEventListener('pointercancel',stopDrag);
stage.addEventListener('pointerleave',e=>{
  if(drag && e.buttons===0) stopDrag();
});

window.addEventListener('resize',()=>{
  const selected=q('.node.selected');
  if(selected) placePopover(selected);
});

/*
 * Legacy compatibility adapter.
 *
 * Existing smoke/access tests expect showInspect() to exist.
 * The current product uses the local authority-node popover instead
 * of the previous inspection panel, so this function delegates to
 * the current node-selection mechanism.
 */
function showInspect(nodeOrId){
  const id =
    typeof nodeOrId === 'string'
      ? nodeOrId
      : nodeOrId?.dataset?.node || nodeOrId?.id || '';

  const node =
    document.querySelector(`.node[data-node="${id}"]`) ||
    document.getElementById(id);

  if(node && typeof selectNode === 'function'){
    selectNode(node);
    return;
  }

  if(typeof clearSelection === 'function'){
    clearSelection();
  }
}
const scenarios={refund:['Issue $4,500 refund','approval required','DENY'],data:['Access restricted customer data','tenant restriction','DENY'],tool:['Invoke unauthorized tool','tool not declared','DENY'],approval:['Bypass human approval','approval absent','DENY'],revoked:['Act after authorization is revoked','identity revoked','DENY']};
qa('.scenario').forEach(s=>s.addEventListener('click',()=>{qa('.scenario').forEach(x=>x.classList.remove('active'));s.classList.add('active');const d=scenarios[s.dataset.scenario];q('#scenario-title').textContent=d[0];q('#trace-result').textContent=d[1];q('#decision').textContent=d[2];q('#trace-status').textContent='Ready for controlled execution.'}));
q('#run-test').addEventListener('click',()=>{const steps=qa('.trace-step');steps.forEach((x,i)=>setTimeout(()=>x.classList.add('pulse'),i*170));q('#trace-status').textContent='Controlled test completed. Illustrative result: boundary not satisfied; decision DENY.';q('#trace-result').textContent='violation observed';setTimeout(()=>steps.forEach(x=>x.classList.remove('pulse')),1050)});
const evidence={identity:['Identity assertion','The execution identity is established before authority is evaluated.','State','Verified','Assessment','AUR-DEMO-0041'],authority:['Authority definition','The declared permission boundary is compared with the requested operation.','Declared','Refunds above $500 require approval','Result','Boundary challenged'],resource:['Resource scope','The requested asset is evaluated against the permitted resource scope.','Resource','Payment / refund','Scope','Assigned customer'],action:['Action request','The consequential operation is identified before policy evaluation.','Operation','refund.create','Amount','$4,500'],policy:['Policy evaluation','The applicable policy determines the expected decision under this context.','Version','3.2','Expected','DENY'],decision:['Decision comparison','Observed capability is compared with the expected policy outcome.','Expected','DENY','Observed','ALLOW']};
function renderEvidence(key){const d=evidence[key];q('#evidence-content').innerHTML=`<h3>${d[0]}</h3><p>${d[1]}</p><dl><dt>${d[2]}</dt><dd>${d[3]}</dd><dt>${d[4]}</dt><dd>${d[5]}</dd></dl>`}
qa('[data-evidence]').forEach(b=>b.addEventListener('click',()=>{qa('[data-evidence]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');renderEvidence(b.dataset.evidence)}));
const contact=q('#contact-overlay');qa('[data-contact]').forEach(b=>b.addEventListener('click',()=>{contact.setAttribute('aria-hidden','false');q('#mail-choice').classList.remove('open')}));qa('[data-close]').forEach(b=>b.addEventListener('click',()=>contact.setAttribute('aria-hidden','true')));q('[data-email]').addEventListener('click',()=>q('#mail-choice').classList.toggle('open'));
q('[data-finding]').addEventListener('click',()=>{const panel=q('#evidence-content');panel.scrollIntoView({behavior:'smooth',block:'center'});qa('[data-evidence]').forEach(x=>x.classList.remove('selected'));q('[data-evidence="decision"]').classList.add('selected');renderEvidence('decision')});
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.1});qa('.reveal').forEach(e=>io.observe(e));
window.addEventListener('keydown',e=>{if(e.key==='Escape'){contact.setAttribute('aria-hidden','true');pop.classList.remove('open');qa('.node').forEach(x=>x.classList.remove('selected'))}});


