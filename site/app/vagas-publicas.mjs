// Republicações editoriais de boletins públicos. Não representa conta/parceria da agência.
export const PUBLIC_JOB_CATEGORY={id:'outras-oportunidades',name:'Outras oportunidades de trabalho'};
export const PETROLINA_AGENCY=Object.freeze({
  id:'sedepe-petrolina',name:'Agência do Trabalho de Petrolina',
  directoryUrl:'https://www.sedepe.pe.gov.br/unidade/petrolina/',
  phone:'558738666541',phoneLabel:'(87) 3866-6541',
  posterPhone:'558738666730',posterPhoneLabel:'(87) 3866-6730',
  whatsapp:'5587991804065',whatsappLabel:'(87) 99180-4065',
  email:'petrolina@sedepe.pe.gov.br',
  address:'Av. Monsenhor Ângelo Sampaio, 100 · River Shopping · Expresso Cidadão · Centro · Petrolina/PE',
  hours:'Segunda a sexta-feira, das 8h às 17h',
  bulletinUrl:'https://www.sedepe.pe.gov.br/wp-content/uploads/2024/12/QUADRO-DE-VAGAS-12.11.2026.pdf',
  posterUrl:'assets/vagas-agencia-petrolina-2026-11-12.jpg'
});
export function isPublicAgencyVacancy(job) {
  const s=job?.publicSource;
  return job?.publisherType==='agency' && s?.kind==='public-agency-republication' &&
    s.agencyId===PETROLINA_AGENCY.id && s.bulletinDate==='2026-11-12' &&
    (job.intermediationSource??job.intermediation)?.totalCents===0 && job.publicationFormat==='standard';
}
export function bulletinDateLabel(job) {
  return isPublicAgencyVacancy(job)?'12/11/2026':'';
}
