import {phoneDigits} from './telefone.mjs?v=77f496c8aac1';
export const validEmail=value=>typeof value==='string' && value.length<=180 && /^[^\s@<>/\\]+@[^\s@<>/\\]+\.[^\s@<>/\\]+$/.test(value) && !/[\p{Cc}\p{Cf}]/u.test(value);
export function contactChoices(raw,email) {
  if(!raw || typeof raw.email!=='boolean' || typeof raw.whatsapp!=='boolean')throw new Error('Escolha os canais de contato.');
  if(raw.email && !validEmail(email))throw new Error('Entre com Google para usar seu e-mail de contato.');
  return {email:raw.email,whatsapp:raw.whatsapp,site:true};
}
export function hasContact(profile) {
  return !!phoneDigits(profile.phone) || (profile.contactOptions?.email===true && validEmail(profile.email)) || (profile.contactOptions?.site===true && typeof profile.contactRef==='string' && !!profile.contactRef);
}
