import {vacancyPresentation} from './anuncios.mjs?v=d544c6e559df';
import {agencyFee} from './intermediacao.mjs?v=d544c6e559df';
import {promotionRank,agencyTrialDays,paidBoostDays} from './promocoes.mjs?v=d544c6e559df';
import {phoneDigits} from './telefone.mjs?v=d544c6e559df';
export function approximateLocation(value) {
  if (!value || typeof value.lat !== 'number' || typeof value.lng !== 'number' || !Number.isFinite(value.lat) || !Number.isFinite(value.lng) || Math.abs(value.lat)>85 || Math.abs(value.lng)>180) return null;
  // Grade de ~1,1 km de lado em Petrolina. Não é anonimização nem coordenada exata.
  return {lat:Math.round(value.lat*100)/100, lng:Math.round(value.lng*100)/100, precisionKm:1.2};
}
export function distanceKm(a,b) {
  const start=approximateLocation(a), end=approximateLocation(b);
  if (!start || !end) return null;
  const rad=v=>v*Math.PI/180, dLat=rad(end.lat-start.lat), dLng=rad(end.lng-start.lng);
  const h=Math.sin(dLat/2)**2+Math.cos(rad(start.lat))*Math.cos(rad(end.lat))*Math.sin(dLng/2)**2;
  return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));
}
export function compareDistance(a,b,origin) {
  const x=distanceKm(origin,a.location), y=distanceKm(origin,b.location);
  return (x ?? Infinity) === (y ?? Infinity) ? 0 : (x ?? Infinity) < (y ?? Infinity) ? -1 : 1;
}
export function distanceLabel(value) {
  if (value === null || !Number.isFinite(value)) return 'Distância não informada';
  return value < 1 ? 'Mesmo entorno · aproximado' : `Cerca de ${Math.round(value)} km · linha reta`;
}
function linkedVacancyAdvertiser(job,advertisers) {
  return advertisers.find(a=>a.id===job.advertiserId && a.kind===(job.publisherType||'employer') &&
    a.ownershipVerified===true && a.contactAuthorized===true && phoneDigits(job.phone) &&
    phoneDigits(job.phone)===phoneDigits(a.phone));
}
export function searchVacancies(jobs, filters={}, now=Date.now(), advertisers=[]) {
  const time=value=>typeof value==='number'?value:Date.parse(value);
  const clean=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  return jobs.filter(j=>j.status==='approved' && time(j.expiresAt)>+new Date(now))
    .filter(j=>!filters.publisherType || (j.publisherType||'employer')===filters.publisherType)
    .filter(j=>!filters.category || j.category===filters.category)
    .filter(j=>!filters.neighborhood || clean(j.neighborhood).includes(clean(filters.neighborhood)))
    .filter(j=>{
      const haystack=clean([j.title,j.category,j.description,j.neighborhood].join(' '));
      return clean(filters.query).split(' ').filter(Boolean).every(term=>haystack.includes(term));
    })
    .sort((a,b)=>{
      const advertiser=job=>linkedVacancyAdvertiser(job,advertisers);
      return (filters.sort==='recommended'?0:compareDistance(a,b,filters.origin)) ||
        (filters.sort==='recommended'?promotionRank(advertiser(b)||{},now)-promotionRank(advertiser(a)||{},now):0) ||
        time(b.createdAt)-time(a.createdAt);
    })
    .map(j=>{
      const account=linkedVacancyAdvertiser(j,advertisers);
      const ad=vacancyPresentation(j,advertisers,now);
      const linked=account?.kind===(j.publisherType||'employer') && account.ownershipVerified===true && account.contactAuthorized===true;
      return {id:j.id,title:j.title,publicName:j.publicName,phone:j.phone,email:j.email,contactOptions:j.contactOptions,contactRef:j.contactRef,category:j.category,description:j.description,neighborhood:j.neighborhood,schedule:j.schedule,distanceKm:distanceKm(filters.origin,j.location),ad,intermediation:agencyFee(j),
        promotion:linked?{agencyTrialDays:agencyTrialDays(account,now),paidBoostDays:paidBoostDays(account,now)}:{}};
    });
}
