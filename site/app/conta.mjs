// Preferências de apresentação e rascunhos nunca comprovam identidade ou acesso PRO.
import {accountObjectives} from './objetivos.mjs?v=d544c6e559df';
export const ACCOUNT_ROLES = Object.freeze([
  Object.freeze({ id: 'contractor', label: 'Contratante', title: 'Quero contratar', description: 'Encontre profissionais e divulgue oportunidades de trabalho.' }),
  Object.freeze({ id: 'worker', label: 'Profissional', title: 'Quero trabalhar', description: 'Ofereça serviços ou procure uma oportunidade de emprego.' }),
  Object.freeze({ id: 'agency', label: 'Agenciador', title: 'Quero agenciar', description: 'Conecte profissionais e contratantes com transparência.' })
]);

const CONSENT_VERSION = 'conta-v1';
const DRAFT_KEY = 'ajuda-codex:conta:rascunho:v1';
const PREFERENCES_PREFIX = 'ajuda-codex:conta:preferencias:v1:';
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key) ? value[key] : undefined;
const length = value => Array.from(value).length;

function invalid(message, code) {
  throw Object.assign(new Error(message), { code: `account/${code}` });
}

function preferences(raw) {
  if (!isRecord(raw)) invalid('Preferências da conta inválidas.', 'invalid-preferences');
  const role = own(raw, 'role');
  const workerGoal = own(raw, 'workerGoal') === undefined ? 'service' : own(raw, 'workerGoal');
  if (!ACCOUNT_ROLES.some(item => item.id === role)) invalid('Escolha um perfil de conta válido.', 'invalid-role');
  if (!['service', 'jobseeker'].includes(workerGoal)) invalid('Escolha oferecer serviços ou procurar emprego.', 'invalid-worker-goal');
  return { role, workerGoal, ...(own(raw,'roles')!==undefined?accountObjectives(raw):{}) };
}

/** Retorna apenas campos permitidos; erros de validação têm mensagem pública em português. */
export function validateAccountDraft(raw) {
  if (!isRecord(raw)) invalid('Dados da conta inválidos.', 'invalid-draft');
  const rawName = own(raw, 'name');
  const name = typeof rawName === 'string' ? rawName.normalize('NFC').trim().replace(/\s+/gu, ' ') : '';
  if (!name || length(name) > 100 || /[<>\p{Cc}\p{Cf}]/u.test(rawName) ||
      name.split(' ').filter(word => /\p{L}/u.test(word)).length < 2) {
    invalid('Informe seu nome completo, com nome e sobrenome (até 100 caracteres).', 'invalid-name');
  }
  const rawEmail = own(raw, 'email');
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  if (!email || length(email) > 180 || !/^[^\s@<>\p{Cc}\p{Cf}]+@[^\s@<>\p{Cc}\p{Cf}.]+(?:\.[^\s@<>\p{Cc}\p{Cf}.]+)+$/u.test(email)) {
    invalid('Informe um e-mail válido (até 180 caracteres).', 'invalid-email');
  }
  const selected = preferences(raw);
  if (own(raw, 'consent') !== true) invalid('Confirme o consentimento para criar sua conta.', 'consent-required');
  return { name, email, ...selected, consent: true, consentVersion: CONSENT_VERSION };
}

/** O caller fornece sessionStorage; não há acesso implícito a localStorage nem fallback de autenticação. */
export function createAccountStore(storage) {
  const memory = new Map();
  let persistent = storage;
  const remove = key => {
    memory.delete(key);
    try { persistent?.removeItem(key); } catch { persistent = undefined; }
  };
  const write = (key, value) => {
    const serialized = JSON.stringify(value);
    memory.set(key, serialized);
    try { persistent?.setItem(key, serialized); } catch { persistent = undefined; }
  };
  const read = (key, validate) => {
    let serialized;
    if (persistent) {
      try { serialized = persistent.getItem(key); } catch { persistent = undefined; }
    }
    if (!persistent) serialized = memory.get(key);
    if (serialized == null) {
      memory.delete(key);
      return null;
    }
    try {
      if (typeof serialized !== 'string' || serialized.length > 4096) throw new Error();
      const raw = JSON.parse(serialized);
      if (validate === validateAccountDraft && raw?.consentVersion !== CONSENT_VERSION) throw new Error();
      const clean = validate(raw);
      const canonical = JSON.stringify(clean);
      memory.set(key, canonical);
      // Remove também campos injetados em entradas antigas ou alteradas manualmente.
      if (serialized !== canonical) write(key, clean);
      return clean;
    } catch {
      remove(key);
      return null;
    }
  };
  const preferencesKey = uid => {
    if (typeof uid !== 'string' || !uid.trim() || length(uid) > 128 || /[\p{Cc}\p{Cf}]/u.test(uid)) {
      invalid('Identificador da conta inválido.', 'invalid-uid');
    }
    return PREFERENCES_PREFIX + encodeURIComponent(uid);
  };
  return Object.freeze({
    readDraft: () => read(DRAFT_KEY, validateAccountDraft),
    saveDraft(raw) {
      const draft = validateAccountDraft(raw);
      write(DRAFT_KEY, draft);
      return draft;
    },
    clearDraft: () => remove(DRAFT_KEY),
    readPreferences(uid) {
      try { return read(preferencesKey(uid), preferences); } catch { return null; }
    },
    savePreferences(uid, raw) {
      const key = preferencesKey(uid);
      const selected = preferences(raw);
      write(key, selected);
      return selected;
    },
    clearPreferences: uid => remove(preferencesKey(uid))
  });
}
