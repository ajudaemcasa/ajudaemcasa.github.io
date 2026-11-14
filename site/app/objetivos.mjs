// Objetivos são preferências privadas, nunca permissões administrativas ou PRO.
export const ROLE_IDS=Object.freeze(['contractor','worker','agency']);
export function accountObjectives(raw={}) {
  const roles=raw.roles===undefined?[raw.role]:raw.roles;
  if(!Array.isArray(roles)||roles.length<1||roles.length>3||new Set(roles).size!==roles.length||roles.some(id=>!ROLE_IDS.includes(id)))throw new Error('Selecione pelo menos um objetivo válido.');
  const role=roles.includes(raw.role)?raw.role:roles[0];
  const roleDetails={};
  for(const id of roles) {
    const value=raw.roleDetails?.[id]??'';
    if(typeof value!=='string'||Array.from(value).length>1000||/[<>\p{Cc}\p{Cf}]/u.test(value))throw new Error('Descreva cada objetivo em texto simples, até 1.000 caracteres.');
    roleDetails[id]=value.normalize('NFC').trim();
  }
  return {role,roles:[...roles],roleDetails};
}
