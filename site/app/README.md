# Ajuda em Casa — CODEX V2

Saída estática para GitHub Pages, gerada a partir de marketplace/.
Não editar prototipo-web diretamente. A referência do ZIP revisado fica em legado-revisado/.

Cartões uniformes e nomes (03/11): faixa horizontal com altura igual ao maior conteúdo carregado; títulos reservam a maior altura e não são cortados. Regra de exibição atual: Serviço (primeiro nome e último sobrenome), ou Serviço (razão social integral) para empresa explícita. Nome completo da fonte é preservado; não inventar sobrenome. Formulários básico/PRO têm tipo de cadastro e prévia. n8n CODEX atualizado/publicado para receber tipo, razão social e título recalculado; fonte de automação permanece fora do site. Documentação na raiz: documentos/CARTOES-UNIFORMES-E-NOMES-2026-11-03.md.

Google em destaque (03/11): acesso no cabeçalho e opção principal antes dos campos de e-mail. Sem Firebase configurado, clique exibe o motivo e não cria conta; o proprietário fornecerá a configuração depois. Com SDK preparado, popup começa dentro do clique, e objetivo/aceite são confirmados após o Google. Marca SVG local incluída no cache offline. Documentação na raiz: documentos/GOOGLE-VISIVEL-E-CLICAVEL-2026-11-03.md.

Correção adicional de 03/11/2026: Cartões é sempre uma faixa horizontal, inclusive desktop/tablet e após Mostrar mais 4; somente Lista organiza um contato abaixo do outro. Filtros abrem no fluxo sem cobrir contatos e fecham por Escape/clique fora. Perfis abrem pelo título/corpo do cartão. Atualizações sem mudança preservam o DOM dos cards. Políticas durante o cadastro abrem uma janela secundária e não substituem o formulário. Botões de fechar, galeria e mapa têm alvos mínimos de 44 px. Diagnóstico e testes na raiz: documentos/REVISAO-INTERACOES-E-RESPONSIVIDADE-2026-11-03.md.

Revisão de interface em 03/11/2026: abertura reduzida a busca e contatos, quatro por lote. Filtros recolhidos; ações e conta no menu. Publicar vaga grátis está no fluxo Contrate um serviço. Sem banners promocionais repetidos na abertura. Bootstrap, CSS e imports recebem versão no build; atualização do cache PWA testada com migração de worker antigo e uso offline. Nenhuma alteração remota do n8n ou ativação de cobrança nesta revisão. Documentação técnica na raiz: documentos/HOME-SIMPLES-E-CACHE-2026-11-03.md.

Atualização de 02/11/2026: vitrine local com 405 cadastros não verificados, 397 com telefone e oito sem telefone após revisão documental. Contém contatos reais; as nove demonstrações continuam ocultas. Não declara consentimento, titularidade, WhatsApp ativo ou disponibilidade. O site não foi publicado externamente. O workflow n8n CODEX foi atualizado/publicado e conectado ao app, com entrega real no Telegram testada; cadastros não são publicados automaticamente.

Interface mobile/PWA, 84 categorias, bairros/condomínios e proximidade aproximada.
O catálogo de demonstração fica oculto por padrão. Vagas somente após aprovação.
Cadastro básico gratuito, novos testes PRO de lançamento por seis meses de calendário após aprovação;
nenhuma cobrança automática.

Página inicial: quatro cards por vez, com Mostrar mais 4; deslize no celular ou opção Lista. Menu esquerdo/recolhível com os três objetivos, PRO e Meu perfil. Cadastro/login e objetivo precedem as vantagens no perfil. Firebase Auth Google/e-mail preparado, sem configuração de projeto: pré-cadastro local não cria conta online nem concede benefícios. Veja `documentos/MENU-CONTA-E-GOOGLE.md`. Destaques/PRO primeiro, distância quando escolhida. Contrate um serviço abre o pedido de orçamento. Destaque avulso: R$ 99,90/72h; agenciador com destaque inicial de seis meses. Taxa de intermediação paga pelo contratante, padrão R$ 200; candidato gratuito; divisão de 25%/75% do líquido após tarifas Asaas. Conta Asaas ainda não criada pelo proprietário; nenhum pagamento real ativo.

Em “Ver os modelos”: Agenciador PRO amarelo-claro, PRO Talento vermelho-claro, PRO Contratante azul-claro e PRO Serviços verde-claro. Básico neutro. Formulários mostram prévia. Assinaturas e testes são conferidos administrativamente; ao expirar, os extras deixam de aparecer. Cadastro de anunciantes em anunciantes.json, inicialmente vazio.

Notas iniciais administrativas são identificadas e não contam como avaliações de clientes.
Pedidos de titularidade/retirada e avaliações exigem conferência do administrador.
A duplicidade é telefone + profissão; o mesmo telefone pode oferecer outro serviço.

config.json contém apenas configuração pública; nunca colocar segredos administrativos neste diretório.
O webhook de produção CODEX está conectado e confirma a entrega antes do sucesso no formulário.
Google/e-mail dependem da configuração pública Web do Firebase e dos providers/domínios do projeto.
Não há OTP de telefone, gerenciamento administrativo autenticado ou publicação automática.

Nunca colocar arquivos VCF, TXT de agenda, registros privados, códigos de verificação
ou histórico de avaliações com contatos nesta pasta. Eles ficam fora da saída pública.
