/* AURA Pad — aviso de nova versão (só existe no app instalado). © 2026 Thiago R. Galvão. Todos os direitos reservados. ID: AURA-PD-TRG-2026
   O app procura atualização UMA vez ao abrir. Se houver, aparece o selo "NOVA VERSÃO" no cabeçalho;
   ao clicar, o usuário vê o que mudou e decide. Nada é baixado nem aplicado sem o clique. */
(function(){
  const D=window.auraDesktop; if(!D||!D.update) return;
  const st=document.createElement('style'); st.textContent=
   '#updBtn{display:none;flex:none;align-items:center;gap:7px;height:30px;font:800 10px/1 inherit;font-family:inherit;letter-spacing:.14em;color:#1a1208;background:#ffab2e;border:0;border-radius:15px;padding:0 12px 0 9px;cursor:pointer;box-shadow:0 0 12px #ffab2e66;white-space:nowrap}'+
   '#updBtn.on{display:inline-flex}#updBtn:focus-visible{outline:2px solid #fff;outline-offset:2px}#updBtn svg{width:14px;height:14px}#updBtn i{width:7px;height:7px;border-radius:50%;background:#fff;animation:updp 1.6s ease-in-out infinite}@keyframes updp{50%{opacity:.25}}'+
   '@media (prefers-reduced-motion:reduce){#updBtn i{animation:none}}'+
   '#updOv{position:fixed;inset:0;z-index:100002;background:rgba(6,6,7,.82);display:none;align-items:center;justify-content:center;padding:16px;font-family:inherit}#updOv.on{display:flex}'+
   '#updOv .bx{width:min(520px,100%);max-height:88vh;overflow:auto;background:#16140f;color:#f1e9dc;border:1px solid #7a4c2a;border-radius:14px;padding:22px 24px;box-shadow:0 20px 60px #000c}'+
   '#updOv h2{margin:0 0 2px;font-size:20px;color:#ffab2e;letter-spacing:.02em}#updOv .sub{margin:0 0 14px;font-size:12px;color:#a89c88}#updOv h3{margin:14px 0 4px;font-size:13px;color:#ffcf8a}#updOv h3 small{font-weight:500;color:#a89c88;margin-left:6px}'+
   '#updOv ul{margin:4px 0 0;padding-left:18px;font-size:13px;line-height:1.45}#updOv li{margin:3px 0}#updOv .ok{margin:16px 0 0;font-size:12px;color:#a89c88}#updOv .er{margin:10px 0 0;font-size:12px;color:#ff9a8a}'+
   '#updOv .bt{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}#updOv button{font:800 12px/1 inherit;font-family:inherit;letter-spacing:.08em;border:0;border-radius:10px;padding:12px 16px;min-height:44px;cursor:pointer;background:#ffab2e;color:#1a1208}#updOv button.sec{background:#2a2620;color:#cfc6b6}#updOv button[disabled]{opacity:.55;cursor:default}#updOv button:focus-visible{outline:2px solid #fff;outline-offset:2px}';
  document.head.appendChild(st);
  const btn=document.createElement('button'); btn.id='updBtn'; btn.type='button'; btn.title='Nova versão disponível'; btn.setAttribute('aria-label','Nova versão disponível. Clique para ver o que mudou.');
  btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>NOVA VERSÃO<i></i>';
  const ov=document.createElement('div'); ov.id='updOv'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-labelledby','updT');
  const hr=document.querySelector('.hdr-right');
  if(hr) hr.insertBefore(btn,hr.firstChild); else { btn.style.cssText='position:fixed;top:8px;right:8px;z-index:100001'; document.body.appendChild(btn); }
  document.body.appendChild(ov);
  // Com a tela de licença aberta (teste vencido, por exemplo) o selo sai do cabeçalho e fica por cima dela:
  // a atualização é justamente o caminho para corrigir qualquer problema ali.
  function pos(){
    const l=document.getElementById('licOv'), preso=l&&l.classList.contains('on');
    if(preso){ btn.style.cssText='position:fixed;top:12px;right:12px;z-index:100001'; if(btn.parentNode!==document.body) document.body.appendChild(btn); }
    else { btn.style.cssText=''; if(hr&&btn.parentNode!==hr) hr.insertBefore(btn,hr.firstChild); }
  }
  function vigia(){ const l=document.getElementById('licOv'); if(!l) return false; new MutationObserver(pos).observe(l,{attributes:true,attributeFilter:['class']}); pos(); return true; }
  if(!vigia()){ let n=0; const t=setInterval(()=>{ if(vigia()||++n>40) clearInterval(t); },250); }
  let atual={}, status=null;
  const el=(t,txt,cls)=>{ const e=document.createElement(t); if(txt!=null) e.textContent=txt; if(cls) e.className=cls; return e; };
  function fechar(){ ov.classList.remove('on'); btn.focus(); }
  function abrir(){
    const r=status; if(!r) return; const prog=r.estado==='programa';
    ov.innerHTML=''; const bx=el('div',null,'bx'); ov.appendChild(bx);
    const t=el('h2','Nova versão'+(r.version?' '+r.version:'')); t.id='updT'; bx.appendChild(t);
    bx.appendChild(el('p','Você está na versão '+(atual.version||'atual')+'. Veja o que muda e decida se quer atualizar.','sub'));
    (r.notas||[]).forEach(n=>{
      const h=el('h3','Versão '+n.version+(n.titulo?' · '+n.titulo:'')); if(n.date) h.appendChild(el('small',n.date.split('-').reverse().join('/'))); bx.appendChild(h);
      const ul=el('ul'); (n.itens||[]).forEach(x=>ul.appendChild(el('li',x))); bx.appendChild(ul);
    });
    bx.appendChild(el('p',prog?'Esta atualização precisa de uma instalação nova do programa (uma única vez). Seus dados e sua licença são mantidos.':'Seus setlists, kits, ajustes, mapeamentos MIDI e sua licença continuam exatamente como estão. O AURA Pad reinicia para aplicar. Não atualize no meio de um culto.','ok'));
    const er=el('p','','er'); er.setAttribute('role','alert'); bx.appendChild(er);
    const bt=el('div',null,'bt'); bx.appendChild(bt);
    const go=el('button',prog?'BAIXAR O INSTALADOR':'ATUALIZAR AGORA'); const no=el('button','AGORA NÃO','sec'); bt.appendChild(go); bt.appendChild(no);
    no.onclick=fechar;
    const falhou=()=>{ er.textContent='Não foi possível atualizar agora. Tente de novo mais tarde.'; go.disabled=false; no.disabled=false; go.textContent='ATUALIZAR AGORA'; };
    go.onclick=async()=>{
      if(prog){ D.openExternal((r.shell&&r.shell.url)||'https://github.com/ledixplugins/pad/releases/latest'); return; }
      go.disabled=true; no.disabled=true; go.textContent='ATUALIZANDO…'; er.textContent='';
      try{ const ok=await D.update.apply(); if(!ok) falhou(); } catch(e){ falhou(); }
    };
    ov.classList.add('on'); go.focus();
  }
  btn.onclick=abrir;
  ov.addEventListener('click',e=>{ if(e.target===ov) fechar(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape' && ov.classList.contains('on')) fechar(); });
  const mostra=r=>{ if(r && (r.estado==='disponivel'||r.estado==='programa')){ status=r; btn.classList.add('on'); } };
  D.update.onStatus(mostra);
  D.update.ready().then(i=>{ atual=i||{}; window.AuraBuild=atual; mostra(atual.status); }).catch(e=>console.warn('atualização',e));
})();
