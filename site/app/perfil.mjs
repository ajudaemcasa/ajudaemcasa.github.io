const cleanPublicName=value=>String(value??'').normalize('NFC').trim().replace(/\s+/gu,' ');
export function publicPersonName(profile) {
  if(profile.entityType==='company')return cleanPublicName(profile.legalName || profile.name);
  const name=cleanPublicName(profile.name);
  if(name.toLocaleUpperCase('pt-BR')==='NOME A CONFIRMAR')return 'Nome a confirmar';
  const words=name.split(' ').filter(Boolean);
  // Abrevia só a exibição; nunca inventa sobrenome nem modifica a fonte original.
  return words.length>1?words[0]+' '+words.at(-1):name;
}
export function profileHeading(profile, service) {
  return `${cleanPublicName(service)} (${publicPersonName(profile)})`;
}
