// Nota inicial administrativa não é uma avaliação de cliente.
export function ratingSummary(profile) {
  const initial = profile.initialRating === 3 ? 3 : 5;
  const count = Number.isSafeInteger(profile.reviewCount) && profile.reviewCount > 0 ? profile.reviewCount : 0;
  const sum = Number(profile.reviewSum);
  if (!count || !Number.isFinite(sum) || sum < count || sum > count * 5) {
    return {score:initial,count:0,kind:'initial',label:'Nota inicial administrativa · ainda sem avaliações de clientes'};
  }
  // A nota inicial deixa de participar quando existem avaliações reais aprovadas.
  return {score:Math.round(sum / count * 10) / 10,count,kind:'customers',label:`${count} avaliação(ões) de clientes`};
}
