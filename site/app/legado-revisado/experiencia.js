/* Shared demo behavior. No network, real account, message or payment. */
(() => {
  'use strict';
  const people = window.pessoas.map(p => ({...p, id:p.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}));
  const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const params = new URLSearchParams(location.search);
  const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const read = (key, fallback) => {try {return localStorage.getItem(key)||fallback;}catch{return fallback;}};
  const save = (key,val) => {try {localStorage.setItem(key,val);}catch{/* demo remains usable */}};
  const card = p => `<article class="person-card"><header><span class="avatar" aria-hidden="true">${p.initials}</span><div><h3>${p.name}</h3><p>${p.cats.join(' · ')}</p></div></header><span class="status">${p.confirmed}</span><ul><li>Localização · ${p.bairro}</li><li>Dias informados · ${p.dias}</li><li>Modalidade · ${p.formas}</li></ul><div class="rating">${p.rating.startsWith('Ainda')?'':'☆ '}${p.rating} <span class="micro">· exemplo</span></div><a class="btn secondary" href="Morador-Perfil.html?id=${p.id}" aria-label="Ver perfil de ${p.name}">Ver perfil de ${p.name} →</a></article>`;
  if(document.getElementById('results')){
    const cat = document.getElementById('categoria'), search=document.getElementById('busca');
    const categories=['Todos os serviços','Diarista','Empregada doméstica','Babá','Cozinheira','Passadeira','Cuidador(a) de idosos','Caseiro','Jardineiro','Piscineiro','Pintor','Pedreiro','Encanador','Eletricista','Técnico de bombas e piscinas',"Limpeza de caixa de gordura","Limpeza de caixa d’água"];
    cat.replaceChildren(...categories.map(c=>new Option(c,c)));
    if(categories.includes(params.get('categoria')))cat.value=params.get('categoria');
    const render=()=>{
      const q=normalize(search.value.trim());
      const results=people.filter(p=>(cat.selectedIndex===0||p.cats.includes(cat.value))&&normalize(p.name+' '+p.bairro).includes(q));
      document.getElementById('count').textContent=results.length+' '+(results.length===1?'profissional encontrado':'profissionais encontrados');
      document.getElementById('results').innerHTML=results.length?results.map(card).join(''):'<div class="empty"><h3>Nenhum perfil nesta busca</h3><p>Tente outro serviço ou limpe o nome e o bairro. Você também pode publicar uma vaga.</p></div>';
    };
    cat.addEventListener('change',render);search.addEventListener('input',render);document.getElementById('limpar').addEventListener('click',()=>{cat.selectedIndex=0;search.value='';render();search.focus();});render();
  }
  const profile=document.getElementById('profile');
  const person=people.find(p=>p.id===params.get('id'));
  if(profile){
    if(!person){profile.innerHTML='<div class="panel"><h1>Perfil não encontrado</h1><p>Escolha um profissional na lista para conhecer seu perfil.</p><a class="btn primary" href="Morador-Lista.html">Ver profissionais</a></div>';return;}
    const p=person;
    profile.innerHTML=`<div class="profile-title"><span class="avatar big">${p.initials}</span><div><span class="eyebrow">PERFIL DE DEMONSTRAÇÃO</span><h1>${p.name}</h1><p>${p.cats.join(' · ')}</p></div></div><div class="profile-layout"><div><section class="panel"><h2>Disponibilidade e serviços</h2><span class="pill">${p.confirmed}</span><dl><div><dt>BAIRRO</dt><dd>${p.bairro}</dd></div><div><dt>FORMA DE TRABALHO</dt><dd>${p.formas}</dd></div><div><dt>DIAS INFORMADOS</dt><dd>${p.dias}</dd></div><div><dt>VALOR DO SERVIÇO</dt><dd>A combinar</dd></div></dl><p class="micro">Confirme os dias e horários diretamente na conversa.</p></section><section class="panel"><h2>Experiência e apresentação</h2><p>A apresentação deste perfil de exemplo ainda não foi preenchida.</p><h2>Avaliações</h2><p>${p.rating} · números ilustrativos.</p><p class="micro">Na versão real, avaliações devem indicar o que foi confirmado: contato ou serviço realizado.</p></section></div><aside><div class="panel sticky-panel"><h2>Converse com ${p.name}</h2><p>Combine o serviço, o valor e o horário diretamente com o profissional.</p><label class="plan-label" for="plano">Simular plano <select id="plano"><option value="gratuito">Gratuito</option><option value="pago">Pago</option></select></label><p id="cost" class="notice" style="margin:18px 0"></p><a id="release" class="btn primary" href="Morador-Contato.html?id=${p.id}"></a><a id="buy" class="text-link" href="Morador-Pacotes.html">Ver pacotes de créditos</a><p class="micro" style="margin-top:18px">Demonstração: nenhum contato real é exibido, ninguém é avisado e nenhum crédito é debitado.</p></div></aside></div>`;
    const plan=document.getElementById('plano');plan.value=read('ajuda-em-casa:modo','gratuito')==='pago'?'pago':'gratuito';
    const update=()=>{const paid=plan.value==='pago';save('ajuda-em-casa:modo',plan.value);document.getElementById('cost').textContent=paid?'1 crédito dá acesso a este contato. O valor do serviço é pago separadamente, conforme combinado entre vocês.':'Neste cenário gratuito, você pode acessar o contato sem usar créditos.';document.getElementById('release').textContent=paid?'Simular liberação · 1 crédito':'Simular acesso ao contato grátis';document.getElementById('buy').hidden=!paid;};plan.addEventListener('change',update);update();
    document.getElementById('release').addEventListener('click',()=>save('ajuda-em-casa:ultimo-contato',p.id));
  }
  const contact=document.getElementById('contact');
  if(contact){
    const p=person||(!params.has('id')?people.find(p=>p.id===read('ajuda-em-casa:ultimo-contato','')):null);
    if(!p){contact.innerHTML='<div class="page-intro"><span class="eyebrow">SUAS CONVERSAS COMEÇAM AQUI</span><h1>Seus contatos</h1><p>Você ainda não simulou a liberação de um contato neste navegador.</p><a class="btn primary" href="Morador-Lista.html">Encontrar profissionais →</a></div>';return;}
    contact.innerHTML=`<a class="back" style="margin-left:0" href="Morador-Perfil.html?id=${p.id}">← Voltar ao perfil</a><div class="panel"><span class="pill">Simulação concluída</span><h1 style="font-size:32px;letter-spacing:-1px">Contato de ${p.name}</h1><p>${p.cats.join(' · ')} · ${p.bairro}</p><div class="notice" style="margin:20px 0">Este perfil é fictício. O WhatsApp será disponibilizado aqui na versão real, após a liberação do contato.</div><h2>O que combinar na conversa</h2><ul><li>Serviço e tarefas que você precisa.</li><li>Data, horário e duração.</li><li>Valor, materiais e forma de pagamento.</li></ul><a class="btn secondary" href="Morador-Lista.html">Ver outros profissionais</a></div>`;
  }
})();
