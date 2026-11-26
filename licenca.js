/*
licenca.js — AURA PAD — licenciamento (somente no app instalado). Mesmo fluxo do AURA Synth Bass. © 2026 Thiago R. Galvão. Todos os direitos reservados. ID: AURA-PD-TRG-2026
   Fluxo: teste grátis de 15 dias -> chave de ativação (limite de aparelhos no servidor) -> revalidação periódica com tolerância offline. */
(function(){
  const dbg=function(e){ try{ if(window.auraDbg) window.auraDbg(e); }catch(_){ /* só registro */ } };
  const D=window.auraDesktop; if(!D) return;           // app web: sem licenciamento
  const CFG=Object.assign({ api:'https://api.lemonsqueezy.com/v1/licenses', trialDays:15, graceDays:30, buyUrl:'https://ledixplugins.com.br/aurapad/', trialApi:'https://aura-trial.ledixplugins.workers.dev', trialPath:'/trial/aura-pad', productId:0 }, D.config||{});
  const DAY=86400000, $=id=>document.getElementById(id);
  let st={ t0:0, seen:0, key:'', inst:'', val:0, name:'', email:'', reused:false, owner:'', ownval:0 }, status='trial', info='', keyMode=false, ownerOpen=false, ownerMode=false;
  const css=document.createElement('style'); css.textContent=`
  .ldx{display:inline-block;aspect-ratio:200/103;background:url(data:image/png;base64,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) center/contain no-repeat}
  #licOv{position:fixed;inset:0;z-index:100000;background:rgba(6,6,7,.92);display:none;align-items:center;justify-content:center;font-family:"Avenir Next",Futura,"Helvetica Neue",Arial,sans-serif;color:#e2e5ea}
  #licOv.on{display:flex}
  #licOv .lb{width:min(520px,92vw);background:linear-gradient(180deg,#26282c,#17191c);border:1px solid #3a3d42;border-top:6px solid #7a4c2a;border-radius:14px;padding:26px 28px;box-shadow:0 24px 60px #000}
  #licOv .ldx{height:26px;display:block;margin:0 0 14px;opacity:.95} #licOv h2{margin:0 0 4px;font-size:15px;letter-spacing:.3em;color:#fff} #licOv .sb{font-size:11px;letter-spacing:.35em;color:#E8890C;margin-bottom:16px}
  #licOv p{font-size:13px;line-height:1.5;color:#b5bac2;margin:0 0 12px} #licOv b{color:#fff}
  #licOv input{width:100%;padding:12px 14px;background:#0e0f11;border:1px solid #454a52;border-radius:8px;color:#fff;font:15px "SF Mono",Menlo,Consolas,monospace;letter-spacing:.06em;margin:4px 0 12px}
  #licOv .bt{display:flex;gap:10px;flex-wrap:wrap} #licOv button{flex:1;min-width:130px;padding:12px;border-radius:8px;border:1px solid #555;background:#2a2d31;color:#fff;font-weight:700;letter-spacing:.12em;font-size:12px;cursor:pointer}
  #licOv button.pr{background:linear-gradient(#ffab2e,#E8890C);color:#1a0d00;border-color:#ffcf8a} #licOv .er{color:#ff6a3d;font-size:12px;min-height:16px;margin-bottom:6px}
  #licOv .fn{font-size:10.5px;color:#7d838c;margin-top:12px;line-height:1.4}
  #licChip{position:fixed;right:12px;bottom:10px;z-index:9000;font:700 10px/1 "Avenir Next",Arial,sans-serif;letter-spacing:.18em;color:#ffcf8a;background:rgba(20,12,4,.85);border:1px solid #7a4c2a;border-radius:20px;padding:6px 12px;cursor:pointer}
  #licChip{bottom:auto;top:calc(env(safe-area-inset-top,0px) + 62px);right:calc(var(--cheek,0px) + 14px)}`;
  document.head.appendChild(css);
  const ov=document.createElement('div'); ov.id='licOv'; ov.innerHTML=`<div class="lb"><i class="ldx" role="img" aria-label="Ledix Plugins"></i><h2>AURA</h2><div class="sb">PAD</div><div id="licMsg"></div>
   <input id="licMail" type="email" placeholder="SEU E-MAIL" autocomplete="email" spellcheck="false" hidden>
   <input id="licOwner" type="password" placeholder="CÓDIGO DE DESENVOLVEDOR" autocomplete="off" spellcheck="false" hidden>
   <input id="licKey" placeholder="CHAVE DE ATIVAÇÃO" autocomplete="off" spellcheck="false"><div class="er" id="licErr"></div>
   <div class="bt"><button class="pr" id="licGo">ATIVAR</button><button id="licBuy">COMPRAR</button><button id="licHave" hidden>JÁ TENHO UMA CHAVE</button><button id="licTry" hidden>CONTINUAR TESTE</button></div>
   <div class="fn" id="licFn"></div><div class="fn"><a id="licOwnerLnk" href="#" hidden style="color:#7d838c">acesso do desenvolvedor</a></div></div>`; document.body.appendChild(ov);
  const chip=document.createElement('div'); chip.id='licChip'; chip.hidden=true; document.body.appendChild(chip);

  async function load(){ try{ const s=await D.store.get('lic'); if(s) st=Object.assign(st,JSON.parse(s)); }catch(e){ dbg(e); }
    try{ const b=JSON.parse(localStorage.getItem('aura_lic_b')||'null'); if(b&&b.t0&&(!st.t0||b.t0<st.t0)) st.t0=b.t0; if(b&&b.seen>st.seen) st.seen=b.seen; }catch(e){ dbg(e); } }
  async function save(){ const j=JSON.stringify(st); try{ await D.store.set('lic',j); }catch(e){ dbg(e); } try{ localStorage.setItem('aura_lic_b',JSON.stringify({t0:st.t0,seen:st.seen})); }catch(e){ dbg(e); } }
  async function call(path,body){ if(D.http) return D.http(CFG.api+path,body); const r=await fetch(CFG.api+path,{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)}); let j={}; try{ j=await r.json(); }catch(e){ dbg(e); } j._http=r.status; return j; }
  const devName=()=> (D.deviceName||'Aparelho')+' · '+(D.deviceId||'').slice(0,8);

  function evalStatus(){
    const now=Date.now();
    if(st.seen && now < st.seen - DAY){ status='clock'; return; }       // relógio atrasado: trata como expirado
    if(st.owner){ status = (now-(st.ownval||0)) <= CFG.graceDays*DAY ? 'licensed' : 'recheck'; return; }     // acesso total do dono (revalidado no servidor)
    if(st.key && st.inst){ status = (now-st.val) <= CFG.graceDays*DAY ? 'licensed' : 'recheck'; return; }
    if(CFG.trialApi && (!st.t0 || !st.email)){ status='email'; return; }        // teste só começa depois de informar o e-mail
    const left=CFG.trialDays - Math.floor((now-st.t0)/DAY);
    status = left>0 ? 'trial' : 'expired'; info=left;
  }
  function paint(){
    chip.hidden = status!=='trial' && status!=='licensed'; 
    if(status==='trial'){ chip.textContent='TESTE GRÁTIS · '+info+(info===1?' DIA':' DIAS'); chip.onclick=()=>show(true); }
    else if(status==='licensed'){ chip.textContent=st.owner?'ACESSO TOTAL':'LICENCIADO'; chip.onclick=()=>show(true); }
    ok._s=status;
  }
  function ok(){ return status==='trial'||status==='licensed'; }
  function show(optional){
    const m=$('licMsg'), tryB=$('licTry'), mail=$('licMail'), have=$('licHave'); $('licErr').textContent='';
    tryB.hidden = !(optional && status==='trial'); mail.hidden=true; have.hidden=true; $('licOwner').hidden=true; $('licOwnerLnk').hidden=true;
    let h='';
    if(ownerMode && status!=='licensed'){ $('licKey').hidden=true; mail.hidden=false; $('licOwner').hidden=false; have.hidden=false; have.textContent='VOLTAR'; $('licGo').textContent='ENTRAR COMO DONO';
      h='<p><b>Acesso do desenvolvedor.</b> Informe o e-mail e o código secreto.</p>'; }
    else if(status==='email' && !keyMode){ $('licKey').hidden=true; mail.hidden=false; have.hidden=false; have.textContent='JÁ TENHO UMA CHAVE'; $('licGo').textContent='INICIAR TESTE GRÁTIS'; $('licOwnerLnk').hidden=false; $('licOwner').hidden=!ownerOpen;
      h='<p><b>Teste grátis de '+CFG.trialDays+' dias</b> com todos os recursos. Informe seu e-mail para começar.</p><p>Cada e-mail só pode usar o teste uma vez. É preciso estar conectado à internet neste primeiro passo.</p>'; }
    else if(status==='licensed' && st.owner){ h='<p><b>Acesso total</b> do desenvolvedor neste aparelho.</p>'; $('licKey').hidden=true; $('licGo').textContent='SAIR DO ACESSO TOTAL'; }
    else if(status==='licensed'){ h='<p><b>Licença ativa</b> neste aparelho ('+(st.name||devName())+').</p><p>Chave: <b>'+st.key.slice(0,8)+'••••••••</b></p>'; $('licKey').hidden=true; $('licGo').textContent='DESATIVAR ESTE APARELHO'; }
    else{ $('licKey').hidden=false; $('licGo').textContent='ATIVAR';
      if(status==='email'){ have.hidden=false; have.textContent='VOLTAR AO TESTE GRÁTIS'; }
      h = status==='email' ? '<p>Cole abaixo a chave de ativação que você recebeu na compra.</p>'
        : status==='trial' ? '<p><b>Teste grátis:</b> restam '+info+' dia(s) com todos os recursos.</p><p>Já comprou? Cole a chave abaixo.</p>'
        : status==='clock' ? '<p><b>O relógio do sistema parece ter sido alterado.</b> Corrija a data e hora, ou ative uma chave.</p>'
        : status==='recheck' ? '<p><b>Precisamos revalidar sua licença.</b> Conecte-se à internet e toque em ATIVAR.</p>'
        : (st.reused ? '<p><b>Este e-mail já usou o teste grátis.</b> Para usar o AURA Pad, insira sua chave de ativação.</p>'
          : '<p><b>Seu teste de '+CFG.trialDays+' dias terminou.</b> Para continuar usando o AURA Pad, insira sua chave de ativação.</p>'); }
    $('licOwnerLnk').hidden = status==='licensed' || ownerMode || (status==='email' && keyMode);
    m.innerHTML=h; $('licFn').textContent='Cada chave vale para até 3 aparelhos seus. Aparelho: '+devName()+' · v'+(D.version||'');
    ov.classList.add('on'); }
  function hide(){ ov.classList.remove('on'); }
  $('licOwnerLnk').onclick=e=>{ e.preventDefault(); if(status==='email'){ ownerOpen=!ownerOpen; $('licOwner').hidden=!ownerOpen; if(ownerOpen) $('licOwner').focus(); } else { ownerMode=true; show(); } };
  $('licHave').onclick=()=>{ if(ownerMode){ ownerMode=false; show(); return; } keyMode=!keyMode; show(); };
  async function postTrial(body){ if(D.http) return D.http(CFG.trialApi+CFG.trialPath,body); const r=await fetch(CFG.trialApi+CFG.trialPath,{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)}); let j={}; try{ j=await r.json(); }catch(e){ dbg(e); } j._http=r.status; return j; }
  async function startTrial(){ const er=$('licErr'), email=($('licMail').value||'').trim().toLowerCase();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)){ er.textContent='Digite um e-mail válido.'; return; }
    const body={email:email,device:D.deviceId||''}, oc=(ownerOpen||ownerMode)?($('licOwner').value||'').trim():''; if(oc) body.owner_code=oc; else if(ownerMode){ er.textContent='Digite o código do desenvolvedor.'; return; }
    let j; try{ j=await postTrial(body); }catch(e){ er.textContent='Sem conexão com o servidor. O primeiro acesso precisa de internet para registrar o teste.'; return; }
    if(!j||!j.ok||!j.started_at){ er.textContent=(j&&j.error)||'Não foi possível iniciar o teste agora. Tente de novo.'; return; }
    if(j.owner&&j.owner_token){ ownerMode=false; st.email=email; st.owner=j.owner_token; st.ownval=Date.now(); const n0=Date.now(); if(n0>st.seen) st.seen=n0; await save(); evalStatus(); paint(); hide(); try{ window.dispatchEvent(new Event('aura-licensed')); }catch(e){ dbg(e); } return; }
    st.email=email; st.t0=st.t0?Math.min(st.t0,j.started_at):j.started_at; st.reused=(j.new===false); const now=Date.now(); if(now>st.seen) st.seen=now; await save(); evalStatus(); paint(); if(ok()) hide(); else show(); }
  $('licTry').onclick=hide; ov.addEventListener('keydown',e=>{ if(e.key==='Enter') $('licGo').click(); if(e.key==='Escape'&&ok()) hide(); });
  $('licBuy').onclick=()=>D.openExternal?D.openExternal(CFG.buyUrl):window.open(CFG.buyUrl);
  $('licGo').onclick=async()=>{ const er=$('licErr'), b=$('licGo'); er.textContent=''; b.disabled=true;
    try{
      if(ownerMode && status!=='licensed'){ await startTrial(); return; }
      if(status==='email' && !keyMode){ await startTrial(); return; }
      if(status==='licensed' && st.owner){ st.owner=''; st.ownval=0; await save(); evalStatus(); paint(); show(); return; }
      if(status==='licensed'){ const j=await call('/deactivate',{license_key:st.key,instance_id:st.inst}); if(j.deactivated||j._http===404){ st.key=st.inst=''; st.val=0; await save(); evalStatus(); paint(); show(); } else er.textContent=j.error||'Não foi possível desativar agora.'; return; }
      const key=($('licKey').value||'').trim(); if(!key){ er.textContent='Cole a chave de ativação.'; return; }
      const j=await call('/activate',{license_key:key,instance_name:devName()});
      if(j.activated && CFG.productId && j.meta && +j.meta.product_id!==+CFG.productId){ try{ await call('/deactivate',{license_key:key,instance_id:j.instance&&j.instance.id}); }catch(e){ dbg(e); } er.textContent='Esta chave não é do AURA Pad.'; return; }
      if(j.activated){ st.key=key; st.inst=j.instance&&j.instance.id; st.name=devName(); st.val=Date.now(); await save(); evalStatus(); paint(); hide(); try{ window.dispatchEvent(new Event('aura-licensed')); }catch(e){ dbg(e); } }
      else if(/limit/i.test(j.error||'')) er.textContent='Esta chave já está ativa em 3 aparelhos. Desative um deles (no AURA Pad do outro aparelho, toque no selo LICENCIADO e em Desativar) ou fale com o suporte.';
      else er.textContent=(j.error||'Chave inválida.')+(j._http===0?'':''); }
    catch(e){ er.textContent='Sem conexão com o servidor de licenças. Verifique a internet e tente de novo.'; }
    finally{ b.disabled=false; } };
  async function revalidate(){
    if(st.owner){ try{ const j=await postTrial({email:st.email,device:D.deviceId||'',owner_token:st.owner});
        if(j&&j.owner){ st.ownval=Date.now(); await save(); } else if(j&&j._http===403){ st.owner=''; st.ownval=0; await save(); } }catch(e){ dbg(e); } evalStatus(); paint(); if(!ok()) show(); return; }
    if(!(st.key&&st.inst)) return; try{ const j=await call('/validate',{license_key:st.key,instance_id:st.inst});
      if(j.valid){ st.val=Date.now(); await save(); } else if(j._http && j._http<500 && j.valid===false){ st.key=st.inst=''; st.val=0; await save(); } }catch(e){ dbg(e); } evalStatus(); paint(); if(!ok()) show(); }

  const api={ ok, show:()=>{ if(!ov.classList.contains('on')) show(false); }, status:()=>status, _st:()=>st, _reload:async()=>{ await load(); evalStatus(); paint(); } };
  window.AuraLic=api;
  (async()=>{ await load(); const now=Date.now(); if(!st.t0 && !CFG.trialApi) st.t0=now; if(now>st.seen) st.seen=now; await save(); evalStatus(); paint(); if(!ok()) show(); else await revalidate(); window.__licReady=true; })();
  setInterval(()=>{ const now=Date.now(); if(now>st.seen){ st.seen=now; save(); } evalStatus(); paint(); if(!ok()){ show(); try{ if(window.AuraPad&&window.AuraPad.panic) window.AuraPad.panic(); }catch(e){ dbg(e); } } },60000);
})();
