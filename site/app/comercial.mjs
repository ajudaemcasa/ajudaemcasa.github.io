export function commercialOffer(config = {}) {
  // Falha segura: cobrar só com mudança administrativa explícita e preço válido.
  const paid = config.commercialStage === 'paid' && Number.isFinite(config.proPriceMonthly) && config.proPriceMonthly > 0;
  return { launch:!paid, chargeNow:paid, trialMonths:Number.isInteger(config.proTrialMonths) && config.proTrialMonths > 0 ? config.proTrialMonths : 6, monthly:Number.isFinite(config.proPriceMonthly) && config.proPriceMonthly > 0 ? config.proPriceMonthly : 19.9, sponsorMonthly:Number.isFinite(config.sponsorPriceMonthly) && config.sponsorPriceMonthly > 0 ? config.sponsorPriceMonthly : 49.9 };
}
export function addCalendarMonths(date, months) {
  const result = new Date(date);
  if (!Number.isFinite(+result) || !Number.isInteger(months)) throw new RangeError('Informe uma data válida e um número inteiro de meses.');
  const day = result.getUTCDate();
  // Primeiro avança os meses; depois limita o dia ao último do mês de destino.
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(result);
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0);
  result.setUTCDate(Math.min(day, lastDay.getUTCDate()));
  if (!Number.isFinite(+result)) throw new RangeError('A data final está fora do intervalo suportado.');
  return result;
}
export function grantProTrial(profile, config, now = new Date()) {
  const offer = commercialOffer(config), start = +new Date(now);
  if (!offer.launch || profile.status !== 'approved' || profile.demo || profile.trialStartedAt || profile.proAccessSource === 'launch_trial' || !Number.isFinite(start)) throw new Error('Teste PRO exige perfil real aprovado, fase gratuita e benefício ainda não utilizado.');
  if (Date.parse(profile.proUntil) > start) throw new Error('O perfil já tem PRO ativo.');
  return {...profile, plan:'pro', trialStartedAt:new Date(start).toISOString(), proUntil:addCalendarMonths(start, offer.trialMonths).toISOString(), proAccessSource:'launch_trial'};
}
