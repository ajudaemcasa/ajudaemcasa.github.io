import {phoneDigits} from './telefone.mjs?v=a72bd4388845';

export function normalizeIdentity(kind,raw) {
  const text=String(raw??'').trim();
  if(kind==='phone') {
    const phone=phoneDigits(text);
    if(!phone)throw new Error('Informe um telefone brasileiro válido, com DDD.');
    return phone;
  }
  if(kind==='email') {
    const email=text.toLowerCase();
    if(email.length>180||!(/^[^\s@/\\]+@[^\s@/\\]+\.[^\s@/\\]+$/).test(email)||/[\p{Cc}\p{Cf}/\\]/u.test(email))throw new Error('Informe um e-mail válido.');
    return email;
  }
  throw new Error('Escolha e-mail ou telefone.');
}
export const identityKey=(kind,raw)=>kind+':'+normalizeIdentity(kind,raw);
