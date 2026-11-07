import {intermediationSplit,parseMoneyCents} from './intermediacao.mjs?v=e71086cfe89e';
const feeMoney=cents=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function intermediationMarkup(fee) {
  if(!fee) return '';
  return `<section class="intermediation-fee" aria-label="Preço da intermediação"><h4>Taxa de intermediação</h4><strong class="fee-total">${feeMoney(fee.totalCents)}</strong><p>${fee.source==='default'?'Valor padrão; confirme o orçamento com o agenciador.':'Valor informado pelo agenciador.'}</p><p class="fee-payer"><strong>Quem paga: o contratante que procura empregado.</strong><br>Para o candidato, a candidatura e o contato são gratuitos.</p><dl class="fee-split"><div><dt>App · 25% do líquido</dt><dd>Até ${feeMoney(fee.platformCents)}</dd></div><div><dt>Agenciador · 75% do líquido</dt><dd>Até ${feeMoney(fee.agencyCents)}</dd></div></dl><p class="micro">O Asaas desconta as tarifas antes de repartir o valor líquido. As referências acima são anteriores às tarifas. A taxa de intermediação é separada do salário e da mensalidade PRO. Converse com o agenciador sobre o serviço e as condições.</p></section>`;
}
export function agencyFeeEditor() {
  return '<fieldset class="full" data-agency-fee hidden><legend>Preço da intermediação · informado pelo agenciador</legend><div class="field"><label for="intermediation-price">Valor total cobrado do contratante (R$)</label><input id="intermediation-price" name="intermediation-price" inputmode="decimal" maxlength="12" value="200,00"><small>Após as tarifas Asaas: 25% do líquido para o app e 75% para o agenciador. O candidato não paga para se candidatar ou conversar. O preço aparece antes do contato.</small></div></fieldset>';
}
export function readIntermediation(fields) {
  return {totalCents:parseMoneyCents(fields.get('intermediation-price')??'200,00'),payer:'employer'};
}
export function previewIntermediation(fields) {
  return {...intermediationSplit(readIntermediation(fields).totalCents),source:'agency'};
}
