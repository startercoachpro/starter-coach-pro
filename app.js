(async function(){
  const $ = (s,el=document)=>el.querySelector(s); const $$=(s,el=document)=>Array.from(el.querySelectorAll(s));

  // Load config
  const cfg = await fetch('/config.json').then(r=>r.json()).catch(()=>({}));
  const ORIGINS = cfg.allowedOrigins || [];
  const OWNER_KEY = cfg.ownerKey || '';
  const STRIPE_STANDARD = cfg.stripeStandardLink || '#';
  const STRIPE_CELEB = cfg.stripeCelebLink || '#';
  const ADS_CLIENT = cfg.adsenseClient || '';
  const ADS_SLOT = cfg.adsenseSlot || '';
  const APP_KB = cfg.appSizeKB || 500;
  const FREE_GB = cfg.freeBandwidthGB || 100;
  const INSTALL_CAP = cfg.installCap || 100000;

  // Domain lock (soft)
  if (ORIGINS.length && !ORIGINS.includes(window.location.origin)) {
    document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center"><div class="card" style="max-width:420px"><div class="head">Access Restricted</div><div class="body">This app is not available on this domain.</div></div></div>';
    return;
  }

  // PWA
  if ("serviceWorker" in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});

  // State
  const LS = { PREMIUM:'scp_premium', CELEB:'scp_celeb', OWNER:'scp_owner', TASKS:'scp_tasks', INSTALLS_LOCAL:'scp_installs_local' };
  const owner = localStorage.getItem(LS.OWNER) === OWNER_KEY && !!OWNER_KEY;
  let premium = !!localStorage.getItem(LS.PREMIUM);
  let celeb = !!localStorage.getItem(LS.CELEB);

  // Success params from Stripe
  const url = new URL(location.href);
  if (url.searchParams.get('premium')==='1'){ localStorage.setItem(LS.PREMIUM,'1'); premium=true; }
  if (url.searchParams.get('cel')==='1'){ localStorage.setItem(LS.CELEB,'1'); localStorage.setItem(LS.PREMIUM,'1'); premium=true; celeb=true; }
  if (url.searchParams.get('admin')===OWNER_KEY && OWNER_KEY){ localStorage.setItem(LS.OWNER, OWNER_KEY); }
  ['premium','cel','admin'].forEach(k=>url.searchParams.delete(k)); history.replaceState({},'',url.toString());

  // Count (local estimate only). For automatic global counting, use the Vercel version later.
  if (!localStorage.getItem('scp_device')) {
    localStorage.setItem('scp_device', crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
    const cnt = parseInt(localStorage.getItem(LS.INSTALLS_LOCAL)||'0',10)+1;
    localStorage.setItem(LS.INSTALLS_LOCAL, String(cnt));
  }
  const installsLocal = parseInt(localStorage.getItem(LS.INSTALLS_LOCAL)||'1',10);
  const locked = installsLocal >= INSTALL_CAP && !owner;

  // UI
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="topbar">
      <div class="container flex" style="justify-content:space-between;padding:12px 16px">
        <div class="flex"><div style="width:8px;height:8px;background:var(--indigo);border-radius:999px;margin-right:8px"></div><b>Starter Coach Pro</b>${owner?'<span class="badge" style="margin-left:8px;background:#ecfdf5;border-color:#a7f3d0;color:#065f46">Owner</span>':''}</div>
        <div class="flex">
          ${premium?'<span class="badge">Premium</span>':'<span class="badge">Free</span>'}
          <button id="menuBtn" class="btn" style="margin-left:8px">Menu</button>
        </div>
      </div>
    </div>

    <div class="container grid grid-2" style="margin-top:16px">
      <div class="card">
        <div class="head">Today’s Nudges</div>
        <div class="body">
          <div id="nudges"></div>
          ${premium?'' : `
            <div class="card" style="border-style:dashed;margin-top:12px">
              <div class="body" style="display:flex;align-items:center;justify-content:space-between;gap:12px">
                <div>
                  <b>Unlock Full Power</b>
                  <div style="font-size:12px;color:#64748b">Unlimited streaks, 3 nudges/day & no ads — less than a coffee/month.</div>
                </div>
                <a class="btn primary" href="${STRIPE_STANDARD}" target="_blank" rel="noreferrer">Go Premium</a>
              </div>
            </div>`}
          <div style="margin-top:12px;font-size:12px;color:#64748b">Tiny steps build momentum.</div>
        </div>
      </div>

      <div class="card">
        <div class="head">5-Minute Get Unstuck</div>
        <div class="body">
          ${premium? '' : '<div class="ad">Voice guidance is premium. Timer works free.</div>'}
          <div class="flex" style="justify-content:space-between">
            <div id="timer" style="font-family:ui-monospace, SFMono-Regular; font-size:32px">05:00</div>
            <div class="flex">
              <button class="btn primary" id="startBtn">Start</button>
              <button class="btn" id="resetBtn">Reset</button>
            </div>
          </div>
          ${premium ? `
            <div style="margin-top:12px;display:grid;gap:8px;grid-template-columns:1fr 1fr">
              <button class="btn" data-voice="action">Action Star Mentor</button>
              <button class="btn" data-voice="rock">Rock Legend Motivator</button>
              <button class="btn" data-voice="coach">Champ Coach</button>
              ${celeb? '' : `<a class="btn" href="${STRIPE_CELEB}" target="_blank" rel="noreferrer">Add Celebrity Pack $2/mo</a>`}
            </div>` : ''}
        </div>
      </div>

      <div class="card">
        <div class="head">Task Garden</div>
        <div class="body">
          <div class="flex"><input id="taskInput" placeholder="Add a 2-minute tiny step…" class="btn" style="flex:1"/><button id="addTask" class="btn primary">Add</button></div>
          <div id="tasks" style="margin-top:12px"></div>
        </div>
      </div>

      <div class="card">
        <div class="head">Trust & Protection</div>
        <div class="body">
          ${locked? '<div class="lock">New installs locked for this month.</div>':''}
          <ul style="font-size:14px;color:#334155">
            <li>Domain-locked to approved origins.</li>
            <li>Owner key for free access & admin controls.</li>
            <li>Install estimates & bandwidth calculator.</li>
            <li>Optimized for fast, low-bandwidth loads.</li>
          </ul>
          ${(!premium && ADS_CLIENT && ADS_SLOT) ? '<div class="ad" style="margin-top:12px">Ad slot (enable AdSense on your domain)</div>' : ''}
        </div>
      </div>
    </div>

    <div class="container footer">
      © <span id="year"></span> Starter Coach Pro — Tiny steps, real momentum.
      <div>Privacy-friendly: data stays on your device.</div>
    </div>

    <dialog id="menuDlg">
      <div style="min-width:320px;padding:12px">
        <div class="flex" style="justify-content:space-between"><b>Menu</b><button class="btn" id="closeMenu">Close</button></div>
        <div style="margin-top:12px">
          <div><b>Benefits</b><div style="font-size:13px;color:#64748b">Stay motivated, track your goals, and focus better with tiny steps and real progress.</div></div>
          <hr style="margin:12px 0"/>
          <div><b>Admin (owner)</b></div>
          <div style="font-size:13px;color:#64748b">Enter owner key to unlock Admin tools.</div>
          <div class="flex" style="margin-top:8px"><input id="ownerKey" placeholder="Owner key" class="btn" style="flex:1"/><button id="ownerUnlock" class="btn primary">Unlock</button></div>
          <div id="adminTools" style="display:none;margin-top:12px">
            <div class="card"><div class="body">
              <div><b>Usage Estimator</b></div>
              <div style="font-size:13px;color:#64748b">App size: <b>${APP_KB} KB</b>, Free bandwidth: <b>${FREE_GB} GB</b></div>
              <div>Est. free installs/month: <b>${Math.floor((FREE_GB*1024)/APP_KB).toLocaleString()}</b></div>
              <div>Local installs (this device): <b>${installsLocal}</b></div>
              <div>Install cap (soft lock): <b>${INSTALL_CAP.toLocaleString()}</b></div>
              <div style="margin-top:8px;font-size:12px;color:#64748b">For automatic global counting + server lock, use the Vercel version later.</div>
            </div></div>
          </div>
        </div>
      </div>
    </dialog>
  `;

  // Year
  $('#year').textContent = new Date().getFullYear();

  // Menu dialog
  $('#menuBtn').addEventListener('click', ()=>$('#menuDlg').showModal());
  $('#closeMenu').addEventListener('click', ()=>$('#menuDlg').close());

  // Owner unlock
  $('#ownerUnlock').addEventListener('click', ()=>{
    const val = $('#ownerKey').value.trim();
    if (!val) return;
    if (val === OWNER_KEY) { localStorage.setItem(LS.OWNER, OWNER_KEY); $('#adminTools').style.display='block'; alert('Owner mode unlocked.'); }
    else alert('Wrong key');
  });
  if (owner) $('#adminTools').style.display='block';

  // Nudges
  const pool = [
    "Stand up, roll your shoulders, 5 deep breaths.",
    "Clear 1 item off your desk.",
    "Write a 2-minute brain dump. No editing.",
    "Set a 5-minute timer and do a single tiny step.",
    "Drink a glass of water.",
    "Send a 1-sentence update to someone who’s waiting.",
    "Open the thing you’re avoiding. Just open it.",
    "Make a 3-bullet plan for the next 30 minutes.",
    "Move for 60 seconds (stretch, squats, walk).",
    "Mark the next tiniest step as a 2-minute task."
  ];
  function pick3(){ const a=[...pool]; a.sort(()=>Math.random()-0.5); return a.slice(0,3); }
  const nudges = premium ? pick3() : pick3().slice(0,1);
  $('#nudges').innerHTML = nudges.map(t=>`<div class="flex" style="justify-content:space-between;margin-bottom:8px"><div>${t}</div><button class="btn">Done</button></div>`).join("");

  // Timer
  let secs = 300, running=false, id=null;
  function fmt(s){ const m=Math.floor(s/60), r=s%60; return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`; }
  function tick(){ $('#timer').textContent = fmt(secs); if (running && secs>0){ id=setTimeout(()=>{secs--; tick();},1000);} }
  $('#startBtn').addEventListener('click', ()=>{ if (running) { running=false; clearTimeout(id); $('#startBtn').textContent='Start'; } else { running=true; tick(); $('#startBtn').textContent='Stop'; } });
  $('#resetBtn').addEventListener('click', ()=>{ running=false; clearTimeout(id); secs=300; tick(); $('#startBtn').textContent='Start'; });
  tick();

  // Tasks
  function loadTasks(){ try { return JSON.parse(localStorage.getItem(LS.TASKS)||'[]'); } catch { return []; } }
  function saveTasks(ts){ localStorage.setItem(LS.TASKS, JSON.stringify(ts)); }
  function renderTasks(){
    const ts = loadTasks();
    const limitReached = !premium && ts.length >= 5;
    $('#tasks').innerHTML = ts.map(t=>`<div class="flex" style="justify-content:space-between;margin-bottom:8px"><div>${t}</div><button class="btn" data-del="${t}">Delete</button></div>`).join("") + (limitReached? '<div class="lock" style="font-size:12px">Task limit reached — upgrade for unlimited.</div>': '');
    $$('#tasks [data-del]').forEach(b=>b.addEventListener('click', ()=>{ const v=b.getAttribute('data-del'); const arr=loadTasks().filter(x=>x!==v); saveTasks(arr); renderTasks(); }));
  }
  renderTasks();
  $('#addTask').addEventListener('click', ()=>{ const v=$('#taskInput').value.trim(); if(!v) return; const ts=loadTasks(); if(!premium && ts.length>=5) { alert('Task limit reached — upgrade for unlimited.'); return; } ts.unshift(v); saveTasks(ts); $('#taskInput').value=''; renderTasks(); });
})();
