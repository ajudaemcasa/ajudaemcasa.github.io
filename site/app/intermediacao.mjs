// Valores em centavos. A taxa é do contratante; candidatura e contato do trabalhador são gratuitos.
export const DEFAULT_INTERMEDIATION_CENTS=20000;
export const PLATFORM_SHARE_PERCENT=30;
export function intermediationSplit(totalCents=DEFAULT_INTERMEDIATION_CENTS) {
  if(!Number.isSafeInteger(totalCents) || totalCents<0 || totalCents>100000000)
    throw new Error('Informe uma taxa válida entre R$ 0,00 e R$ 1.000.000,00, em centavos.');
  const platformCents=Math.round(totalCents*PLATFORM_SHARE_PERCENT/100);
  return {totalCents,platformCents,agencyCents:totalCents-platformCents,
    platformPercent:PLATFORM_SHARE_PERCENT,agencyPercent:100-PLATFORM_SHARE_PERCENT,payer:'employer',currency:'BRL',basis:'before_processing_fees'};
}
export function settleIntermediation(totalCents,netCents) {
  intermediationSplit(totalCents);
  if(!Number.isSafeInteger(netCents) || netCents<0 || netCents>totalCents) throw new Error('Valor líquido inválido.');
  const result=intermediationSplit(netCents);
  return {...result,totalCents,netCents,processingFeesCents:totalCents-netCents,basis:'net'};
}
export function sanitizeIntermediation(raw) {
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) throw new Error('Informe os dados da taxa de intermediação.');
  if(raw.payer!==undefined && raw.payer!=='employer') throw new Error('A taxa de intermediação é paga pelo contratante, nunca pelo candidato.');
  return {totalCents:intermediationSplit(raw.totalCents).totalCents,payer:'employer'};
}
export function agencyFee(job) {
  if(job.publisherType!=='agency') return null;
  if(job.intermediation===undefined) return {...intermediationSplit(),source:'default'};
  return {...intermediationSplit(sanitizeIntermediation(job.intermediation).totalCents),source:'agency'};
}
export function parseMoneyCents(value) {
  const text=String(value??'').trim();
  if(!/^\d{1,7}(?:[.,]\d{1,2})?$/.test(text)) throw new Error('Informe o preço com até duas casas decimais, por exemplo 200,00.');
  const [integer,decimal='']=text.replace(',','.').split('.');
  return intermediationSplit(Number(integer)*100+Number(decimal.padEnd(2,'0'))).totalCents;
}
