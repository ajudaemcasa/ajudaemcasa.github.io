import {hasPremiumAccess} from './anuncios.mjs?v=e71086cfe89e';
export const PAID_BOOST_PRICE_CENTS=9990;
export function paidBoostDays(entity,now=Date.now()) {
  const start=Date.parse(entity.paidBoostFrom),end=Date.parse(entity.paidBoostUntil),time=+new Date(now);
  if(entity.status!=='approved' || entity.paidBoostConfirmed!==true ||
    !/^[a-zA-Z0-9_-]{5,100}$/.test(entity.paidBoostPaymentId||'') ||
    !Number.isFinite(start) || !Number.isFinite(end) || end-start!==72*3600000 || start>time || end<=time) return 0;
  return Math.ceil((end-time)/86400000);
}
export function agencyTrialDays(entity,now=Date.now()) {
  if(entity?.kind!=='agency' || entity.proAccessSource!=='launch_trial' || !hasPremiumAccess(entity,now)) return 0;
  return Math.ceil((Date.parse(entity.proUntil)-+new Date(now))/86400000);
}
export function promotionRank(entity,now=Date.now()) {
  if(paidBoostDays(entity,now)) return 3;
  if(agencyTrialDays(entity,now)) return 2;
  return hasPremiumAccess(entity,now)?1:0;
}
export function activatePaidBoost(entity,paymentId,now=new Date()) {
  if(entity.status!=='approved' || entity.demo || !/^[a-zA-Z0-9_-]{5,100}$/.test(paymentId||'') || !Number.isFinite(+new Date(now)))
    throw new Error('Destaque avulso exige cadastro aprovado e ID de pagamento confirmado.');
  if(paidBoostDays(entity,now)) throw new Error('Já existe destaque avulso ativo.');
  if(entity.paidBoostPaymentId===paymentId || (entity.paidBoostPaymentIds||[]).includes(paymentId)) throw new Error('Pagamento já utilizado para destaque.');
  return {...entity,paidBoostConfirmed:true,paidBoostPaymentId:paymentId,
    paidBoostFrom:new Date(now).toISOString(),paidBoostUntil:new Date(+new Date(now)+72*3600000).toISOString(),
    paidBoostPaymentIds:[...new Set([...(entity.paidBoostPaymentIds||[]),entity.paidBoostPaymentId,paymentId].filter(Boolean))]};
}
