// Regras compartilhadas entre site, catálogo administrativo, testes e n8n.
import { NEIGHBORHOODS, CONDOMINIUMS } from './localidades.mjs?v=db21b3690644';
import { approximateLocation, distanceKm, compareDistance } from './localizacao.mjs?v=db21b3690644';
import { phoneDigits, formatPhone } from './telefone.mjs?v=db21b3690644';
import {contactChoices,hasContact} from './canais.mjs?v=db21b3690644';
export { NEIGHBORHOODS, CONDOMINIUMS, phoneDigits, formatPhone };
import { ratingSummary } from './avaliacoes.mjs?v=db21b3690644';
import { publicPersonName, profileHeading } from './perfil.mjs?v=db21b3690644';
import { EXTRA_CATEGORIES } from './servicos-extra.mjs?v=db21b3690644';
import {hasPremiumAccess,adPresentation,sanitizeAdDetails} from './anuncios.mjs?v=db21b3690644';
import {sanitizeIntermediation,DEFAULT_INTERMEDIATION_CENTS} from './intermediacao.mjs?v=db21b3690644';
import {paidBoostDays} from './promocoes.mjs?v=db21b3690644';
export const CATEGORIES = [
  { id: 'ar-condicionado', name: 'Ar-condicionado e refrigeração', short: 'Ar-condicionado', icon: 'snow' },
  { id: 'energia-solar', name: 'Energia solar · limpeza de placas', short: 'Energia solar', icon: 'sun' },
  { id: 'piscineiro', name: 'Piscineiro', short: 'Piscinas', icon: 'water' },
  { id: 'eletricista', name: 'Eletricista', short: 'Eletricista', icon: 'bolt' },
  { id: 'encanador', name: 'Encanador', short: 'Encanador', icon: 'drop' },
  { id: 'diarista', name: 'Diarista', short: 'Diarista', icon: 'spark' },
  { id: 'pedreiro', name: 'Pedreiro', short: 'Pedreiro', icon: 'bricks' },
  { id: 'marido-de-aluguel', name: 'Marido de aluguel', short: 'Pequenos reparos', icon: 'tool' },
  { id: 'empregada-domestica', name: 'Empregada doméstica', short: 'Trabalho doméstico', icon: 'home' },
  { id: 'baba', name: 'Babá', short: 'Babá', icon: 'heart' },
  { id: 'cozinheira', name: 'Cozinheira', short: 'Cozinheira', icon: 'home' },
  { id: 'passadeira', name: 'Passadeira', short: 'Passadeira', icon: 'home' },
  { id: 'cuidador-idosos', name: 'Cuidador(a) de idosos', short: 'Cuidados', icon: 'heart' },
  { id: 'caseiro', name: 'Caseiro', short: 'Caseiro', icon: 'home' },
  { id: 'jardineiro', name: 'Jardineiro', short: 'Jardineiro', icon: 'leaf' },
  { id: 'pintor', name: 'Pintor', short: 'Pintor', icon: 'tool' },
  { id: 'tecnico-bombas-piscinas', name: 'Técnico de bombas e piscinas', short: 'Bombas e piscinas', icon: 'water' },
  { id: 'limpeza-caixa-gordura', name: 'Limpeza de caixa de gordura', short: 'Caixa de gordura', icon: 'drop' },
  { id: 'especialista-churrasqueiras', name: 'Especialista em churrasqueiras', short: 'Churrasqueiras', icon: 'tool' },
  { id: 'transporte-van', name: 'Transporte em van', short: 'Van', icon: 'home' },
  { id: 'motorista-aplicativo-taxi', name: 'Motorista de aplicativo / táxi', short: 'Motorista / táxi', icon: 'home' },
  { id: 'projetista', name: 'Projetista', short: 'Projetista', icon: 'bricks' },
  { id: 'manutencao-energia-solar', name: 'Manutenção de energia solar', short: 'Manutenção solar', icon: 'sun' },
  { id: 'buffet-em-casa', name: 'Buffet em casa', short: 'Buffet em casa', icon: 'home' },
  { id: 'apicultor', name: 'Apicultor', short: 'Apicultor', icon: 'leaf' },
  { id: 'churrasqueiro', name: 'Churrasqueiro', short: 'Churrasqueiro', icon: 'home' },
  { id: 'limpeza-caixa-dagua', name: "Limpeza de caixa d’água", short: "Caixa d’água", icon: 'drop' }
  ,...EXTRA_CATEGORIES
];
export const EVENTS = ['novo_cadastro_gratuito', 'solicitacao_upgrade_pro', 'ativacao_destaque_3dias', 'novo_orcamento_cliente', 'interesse_patrocinio_loja', 'nova_vaga_empregador', 'solicitacao_titularidade', 'nova_avaliacao'];
export const MEDIA_LABELS = { antes: 'ANTES', depois: 'DEPOIS', cartao: 'CARTÃO PROFISSIONAL', certificado: 'CERTIFICADO', fachada: 'FACHADA' };
export const DAY = 86400000;
// A busca trata acentos, hífens, barras e pontuação como separadores equivalentes.
// Assim, "ar condicionado", "ar-condicionado" e "AR / CONDICIONADO" encontram
// o mesmo serviço sem alterar os identificadores usados pelo catálogo.
export const fold = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');
export const shortText = value => Array.from(String(value ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()).slice(0, 140).join('');
export const categoryName = id => CATEGORIES.find(c => c.id === id)?.name || id;

export function monthKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date(now));
  return parts.find(p => p.type === 'year').value + '-' + parts.find(p => p.type === 'month').value;
}
export function isPro(profile, now = Date.now()) {
  return hasPremiumAccess(profile,now);
}
export function featuredDays(profile, now = Date.now()) {
  const paid=paidBoostDays(profile,now);
  if (!isPro(profile, now)) return paid;
  const start = Date.parse(profile.featuredFrom), end = Date.parse(profile.featuredUntil), time = +new Date(now);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > time || end <= time || end - start > 3 * DAY || end <= start) return paid;
  return Math.max(paid,Math.ceil((Math.min(end, Date.parse(profile.proUntil)) - time) / DAY));
}
export function activateFeature(profile, now = new Date()) {
  const time = new Date(now), month = monthKey(time);
  if (!isPro(profile, time)) throw new Error('O perfil precisa ter acesso PRO ativo e aprovação.');
  if (featuredDays(profile, time)) throw new Error('Este perfil já está em destaque.');
  if ((profile.featuredMonths || []).includes(month) || profile.featuredMonth === month) throw new Error('Os 3 dias deste mês já foram utilizados.');
  if (Date.parse(profile.proUntil) < +time + 3 * DAY) throw new Error('Renove o PRO para cobrir os 3 dias completos de destaque.');
  return { ...profile, featuredFrom: time.toISOString(), featuredUntil: new Date(+time + 3 * DAY).toISOString(), featuredMonth: month, featuredMonths: [...new Set([...(profile.featuredMonths || []), profile.featuredMonth, month].filter(Boolean))] };
}
export function visibleProfile(profile, now = Date.now()) {
  const basic = { id: profile.id, name: publicPersonName(profile), heading: profileHeading(profile, categoryName(profile.category)), rating: ratingSummary(profile), phone: formatPhone(profile.phone) || (profile.demo ? profile.phone : ''), category: profile.category, note: shortText(profile.note), plan: 'free', demo: !!profile.demo };
  if(profile.contactOptions)Object.assign(basic,{contactOptions:profile.contactOptions,contactRef:profile.contactRef,email:profile.contactOptions.email?profile.email:''});
  if(profile.registrationSource==='self' && !profile.ownershipVerified)basic.unverified=true;
  if(profile.status==='unverified') Object.assign(basic,{unverified:true,sourceUrl:safeMediaUrl(profile.sourceUrl)?profile.sourceUrl:'',contactUnavailable:!phoneDigits(profile.phone)});
  if(profile.adType) basic.adType=profile.adType;
  if(paidBoostDays(profile,now)) Object.assign(basic,{featuredDays:paidBoostDays(profile,now),paidBoost:true});
  if (!isPro(profile, now)) return basic;
  return { ...basic, plan: 'pro', ad:adPresentation(profile,profile.adType||'service',now), description: profile.description || '', neighborhoods: profile.neighborhoods || [], emergency: !!profile.emergency, verified: profile.verified === true, media: (profile.media || []).filter(m => MEDIA_LABELS[m.type] && safeMediaUrl(m.url)), featuredDays: featuredDays(profile, now) };
}
export function searchProfiles(profiles, filters = {}, now = Date.now()) {
  return profiles.filter(p => ['approved','unverified'].includes(p.status))
    .filter(p=>p.demo || hasContact(p))
    .filter(p=>!filters.adType || (p.adType||'service')===filters.adType)
    .filter(p => !filters.category || p.category === filters.category)
    .filter(p => !filters.neighborhood || (p.neighborhoods || []).some(n=>fold(n).includes(fold(filters.neighborhood))) || fold(p.neighborhood).includes(fold(filters.neighborhood)))
    .filter(p => !filters.emergency || p.emergency === true)
    .filter(p => {
      const v = visibleProfile(p, now);
      const haystack=fold([v.name,p.name,p.legalName,v.category,categoryName(v.category),v.note,v.description,...(p.neighborhoods||[])].join(' '));
      const terms=fold(filters.query||'').split(' ').filter(Boolean);
      return terms.every(term=>haystack.includes(term));
    })
    .sort((a, b) => (filters.sort==='distance' ? compareDistance(a,b,filters.origin) : 0) || Number(featuredDays(b, now) > 0) - Number(featuredDays(a, now) > 0) || Number(isPro(b,now) && b.proAccessSource==='paid')-Number(isPro(a,now) && a.proAccessSource==='paid') || Number(isPro(b, now)) - Number(isPro(a, now)) || a.name.localeCompare(b.name, 'pt-BR'))
    .map(p => ({...visibleProfile(p, now), ...(filters.sort==='distance' ? {distanceKm:distanceKm(filters.origin,p.location)} : {})}));
}
export function safeMediaUrl(value) {
  if (typeof value !== 'string') return false;
  if (/^assets\/[\w./-]+\.(svg|png|jpe?g|webp)$/.test(value) && !value.includes('..')) return true;
  // Sem dependência de URL/require: também funciona no sandbox Code do n8n.
  if (/[\s\\<>"'\u0000-\u001f]/.test(value)) return false;
  const parts = /^https:\/\/([^/?#]+)(?:[/?#].*)?$/i.exec(value);
  if (!parts || parts[1].includes('@')) return false;
  return /^(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|\[[0-9a-f:]+\])(?::[0-9]{1,5})?$/i.test(parts[1]);
}
export function whatsappUrl(profile) {
  const phone = phoneDigits(profile.phone);
  if (!phone || profile.demo) return null;
  const message = `Olá, ${profile.name}! Encontrei seu cadastro no Ajuda em Casa (https://ajudaemcasa.github.io/app/) e gostaria de um orçamento para ${categoryName(profile.category)}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
export function validateEvent(event) {
  const fail = message => { throw new Error(message); };
  if (!event || !EVENTS.includes(event.type)) fail('Evento desconhecido.');
  if (!/^[\w-]{16,80}$/.test(event.eventId || '')) fail('Protocolo inválido.');
  if (event.schemaVersion !== 1 || !Number.isFinite(Date.parse(event.createdAt))) fail('Formato de evento inválido.');
  if (!event.data || typeof event.data !== 'object' || Array.isArray(event.data)) fail('Dados inválidos.');
  const raw = event.data, data = {};
  if (raw.website) fail('Não foi possível validar este envio.');
  // Clique de interesse: evento sem dados pessoais; o formulário posterior coleta contato.
  if (event.type === 'interesse_patrocinio_loja' && raw.action === 'banner_click') {
    return { schemaVersion: 1, eventId: event.eventId, type: event.type, createdAt: event.createdAt, source: 'ajuda-em-casa-petrolina-codex', data: { action: 'banner_click', placement: 'banner-comercio-local' } };
  }
  if (raw.consent !== true) fail('Confirme a autorização de envio dos dados.');
  const field = (key, label, max, required = true) => {
    const v = typeof raw[key] === 'string' ? raw[key].trim() : '';
    if ((required && !v) || Array.from(v).length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) fail(`${label}: preencha corretamente (até ${max} caracteres).`);
    data[key] = v;
    return v;
  };
  field('name', 'Nome', 100);
  data.phone = phoneDigits(raw.phone);
  const optionalChannels=['novo_cadastro_gratuito','solicitacao_upgrade_pro','nova_vaga_empregador'].includes(event.type) && raw.contactOptions!==undefined;
  if(optionalChannels) {
    data.contactOptions=contactChoices(raw.contactOptions,raw.email);
    data.email=data.contactOptions.email?String(raw.email).trim():'';
    if(!data.contactOptions.whatsapp)data.phone='';
    if(data.contactOptions.whatsapp&&!data.phone)fail('Informe um telefone brasileiro válido com DDD para receber pelo WhatsApp.');
    if(raw.publishContact!==true)fail('Autorize a publicação do anúncio e dos canais de contato selecionados.');
    data.publishContact=true;
  } else if (!data.phone) fail('Informe um telefone brasileiro válido com DDD.');
  if (['novo_cadastro_gratuito', 'solicitacao_upgrade_pro', 'novo_orcamento_cliente', 'nova_vaga_empregador'].includes(event.type)) {
    field('category', 'Serviço', 40);
    if (!CATEGORIES.some(c => c.id === data.category)) fail('Selecione uma categoria válida.');
  }
  if (['novo_cadastro_gratuito','solicitacao_upgrade_pro'].includes(event.type)) {
    if (data.name.trim().split(/\s+/).length<2) fail('Informe seu nome e sobrenome para solicitar seu próprio cadastro.');
    if(/[<>\p{Cc}\p{Cf}]/u.test(data.name))fail('Informe o nome completo em texto simples.');
    data.name=data.name.normalize('NFC').replace(/\s+/gu,' ');
    if(raw.entityType!==undefined && !['person','company'].includes(raw.entityType))fail('Escolha Pessoa física ou Empresa.');
    data.entityType=raw.entityType || 'person';
    if(data.entityType==='company') {
      field('legalName','Razão social',160);
      if(/[<>\p{Cc}\p{Cf}]/u.test(data.legalName))fail('Informe a razão social em texto simples.');
      data.legalName=data.legalName.normalize('NFC').replace(/\s+/gu,' ');
    }
    data.displayHeading=profileHeading(data,categoryName(data.category));
    data.registrationSource='self_request';
    if(raw.adType!==undefined && !['service','jobseeker'].includes(raw.adType)) fail('Escolha Ofereço serviços ou Procuro emprego.');
    data.adType=raw.adType || 'service';
  }
  if (['solicitacao_titularidade','nova_avaliacao'].includes(event.type)) {
    field('category','Serviço',40);
    if (!CATEGORIES.some(c=>c.id===data.category)) fail('Selecione uma categoria válida.');
    field('profileId','Código do perfil',80,false);
    if(data.profileId && !/^[a-z0-9-]+$/.test(data.profileId)) fail('Código do perfil inválido.');
  }
  if(event.type==='solicitacao_titularidade') {
    if(!['assumir','atualizar','remover'].includes(raw.action)) fail('Selecione o que deseja fazer com seu cadastro.');
    data.action=raw.action;field('message','Detalhes do pedido',1000,false);
    data.ownershipStatus='pending_manual_verification';
  }
  if(event.type==='nova_avaliacao') {
    data.professionalPhone=phoneDigits(raw.professionalPhone);
    if(!data.profileId || !data.professionalPhone) fail('Informe o perfil que deseja avaliar.');
    if(data.professionalPhone===data.phone) fail('Não é permitido avaliar o próprio número.');
    if(!Number.isInteger(raw.score) || raw.score<1 || raw.score>5) fail('Informe uma nota inteira de 1 a 5.');
    data.score=raw.score;field('comment','Avaliação',1000);
    data.reviewStatus='pending_moderation';
  }
  if (event.type === 'novo_cadastro_gratuito') {
    field('note', 'Observação', 140, false);
    if (/[<>]/.test(data.note)) fail('A observação deve conter apenas texto simples.');
  }
  if (event.type === 'solicitacao_upgrade_pro') {
    data.adDetails=sanitizeAdDetails(raw.adDetails||{});
    field('description', 'Descrição', 6000);
    data.neighborhoods = Array.isArray(raw.neighborhoods) ? [...new Set(raw.neighborhoods)] : [];
    if (!data.neighborhoods.length || data.neighborhoods.length>80 || data.neighborhoods.some(n => typeof n!=='string' || !n.trim() || n.length>100 || /[<>]/.test(n))) fail('Informe pelo menos uma região de atendimento válida.');
    data.emergency = raw.emergency === true;
    data.media = Array.isArray(raw.media) ? raw.media : [];
    if (data.media.length > 5) fail('Envie até 5 links de mídia.');
    data.media = data.media.map(m => {
      if (!MEDIA_LABELS[m.type] || typeof m.url !== 'string' || m.url.length > 600 || !m.url.startsWith('https://') || !safeMediaUrl(m.url)) fail('Use links HTTPS válidos para as imagens.');
      return { type: m.type, url: m.url };
    });
    data.files = Array.isArray(raw.files) ? raw.files : [];
    if (data.files.length > 3) fail('Envie até 3 arquivos.');
    data.files = data.files.map(f => {
      if (!MEDIA_LABELS[f.type] || !['image/jpeg', 'image/png', 'image/webp'].includes(f.mime) || typeof f.base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(f.base64) || f.base64.length % 4 || f.base64.length > 699052) fail('Cada foto deve ser JPG, PNG ou WebP de até 512 KB.');
      const bytes = f.base64.length * 3 / 4 - (f.base64.endsWith('==') ? 2 : f.base64.endsWith('=') ? 1 : 0);
      if (bytes > 524288 || bytes < 12) fail('Tamanho de imagem inválido.');
      const signatures = { 'image/jpeg': '/9j/', 'image/png': 'iVBORw0KGgo', 'image/webp': 'UklGR' };
      if (!f.base64.startsWith(signatures[f.mime])) fail('O conteúdo do arquivo não corresponde à imagem.');
      return { type: f.type, mime: f.mime, name: String(f.name || 'foto').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 80), base64: f.base64 };
    });
  }
  if (event.type === 'ativacao_destaque_3dias') {
    if(raw.purchaseMode!==undefined && !['pro_monthly','one_off'].includes(raw.purchaseMode)) fail('Tipo de destaque inválido.');
    data.purchaseMode=raw.purchaseMode || 'pro_monthly';
    if(data.purchaseMode==='one_off') data.priceCents=9990;
    field('profileId', 'Código do perfil', 80);
    if (!/^[a-z0-9-]+$/.test(data.profileId)) fail('Código do perfil inválido.');
    data.requestedMonth = monthKey(new Date(event.createdAt));
  }
  if (event.type === 'novo_orcamento_cliente') {
    field('neighborhood', 'Bairro', 100);
    if (/[<>]/.test(data.neighborhood)) fail('Informe um bairro válido.');
    field('urgency', 'Urgência', 30);
    if (!['Emergência · agora', 'Hoje', 'Nesta semana', 'Sem pressa'].includes(data.urgency)) fail('Selecione a urgência.');
  }
  if (event.type === 'interesse_patrocinio_loja') {
    field('store', 'Loja', 120);
    field('message', 'Mensagem', 500, false);
  }
  if (event.type === 'nova_vaga_empregador') {
    field('title', 'Título da vaga', 100); field('description', 'Descrição da vaga', 1500); field('schedule', 'Dias e horários', 200);
    field('neighborhood', 'Bairro', 100);
    if(raw.publishContact!==true) fail('Autorize a divulgação do contato para publicar uma vaga.');
    data.publishContact=true;
    if(raw.publisherType!==undefined && !['employer','agency'].includes(raw.publisherType)) fail('Tipo de anunciante inválido.');
    data.publisherType=raw.publisherType || 'employer';
    if(data.publisherType==='agency') {
      field('agencyName','Nome da agência / agenciador',100);
      data.intermediation=sanitizeIntermediation(raw.intermediation||{totalCents:DEFAULT_INTERMEDIATION_CENTS});
    }
    if(raw.requestedFormat!==undefined && !['standard','pro'].includes(raw.requestedFormat)) fail('Modelo inválido.');
    data.requestedFormat=raw.requestedFormat || 'standard';
    field('advertiserId','Código do anunciante',80,false);
    if(data.advertiserId && !/^[a-z0-9-]+$/.test(data.advertiserId)) fail('Código do anunciante inválido.');
    data.adDetails=sanitizeAdDetails(raw.adDetails||{});
    // plan, proUntil, paid, verified e trialStartedAt enviados pelo navegador são descartados.
  }
  if (['novo_cadastro_gratuito','solicitacao_upgrade_pro','novo_orcamento_cliente','nova_vaga_empregador'].includes(event.type)) {
    if(raw.neighborhood && !data.neighborhood) field('neighborhood','Bairro',100);
    if(raw.condominiumId) {
      const condo=CONDOMINIUMS.find(c=>c.id===raw.condominiumId);
      if(!condo) fail('Condomínio não encontrado na lista.');
      data.condominiumId=condo.id;
    }
    if(raw.location) {
      if(raw.locationConsent!==true) fail('Autorize o uso da região aproximada.');
      data.location=approximateLocation(raw.location);
      if(!data.location) fail('Localização inválida.');
      data.locationConsent=true;
    }
  }
  return { schemaVersion: 1, eventId: event.eventId, type: event.type, createdAt: event.createdAt, source: 'ajuda-em-casa-petrolina-codex', data: { ...data, consent: true } };
}
