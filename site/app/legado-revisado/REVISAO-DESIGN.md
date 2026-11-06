# Ajuda em Casa — revisão de design e clareza

## Proposta e diagnóstico

O aplicativo conecta pessoas que precisam de serviços domésticos e reparos em Petrolina a profissionais locais. A conversa e a negociação ocorrem diretamente pelo WhatsApp. Há uma operação adicional para agências, com indicação e acompanhamento de garantias.

A entrada anterior exigia percorrer oito cartões antes de chegar ao login. Não explicava de imediato a proposta, os cartões não eram clicáveis e o fluxo não priorizava uma ação. O limite de 430px mantinha uma estreita coluna de celular no computador. Havia ainda um erro funcional: todos os perfis da busca levavam à Joana.

## O que foi implementado

- Página inicial com explicação do serviço, duas ações principais e categorias clicáveis.
- Visual claro: fundo neutro, terracota para ações, verde para disponibilidade, bordas discretas e espaçamentos consistentes.
- Layout responsivo; busca em duas colunas no desktop e uma no celular.
- Busca por nome ou bairro, inclusive sem acentos; filtro por serviço; contagem e estado vazio.
- Dados de exemplo compartilhados entre resultados, perfil e contato: Rafael abre Rafael, Cida abre Cida etc.
- Perfil com dias informados, modalidade, bairro e preço a combinar.
- Explicação da diferença entre comprar acesso ao contato e pagar pelo serviço.
- Plano gratuito/pago testável no perfil, claramente identificado como simulação.
- Contatos com estado inicial vazio e continuidade do último contato simulado neste navegador.
- Login em uma tela própria, com aviso para não informar senhas reais.
- Cadastro preserva o perfil escolhido pelo link da página inicial.
- Administração removida da conta comum; continua acessível no mapa do protótipo. Isso é organização visual, não controle de acesso.
- Demais telas preservadas com ajustes compartilhados de apresentação e foco de teclado visível.

## Decisões recomendadas para colocar em prática

1. Começar pelo ciclo profissional → busca → conversa. Manter a agência como entrada secundária e operação separada.
2. Para um piloto, escolher e comunicar um único modelo comercial. O seletor de plano é ferramenta de demonstração, não configuração do cliente.
3. Pedir bairro antes de endereço detalhado. O cadastro do profissional ainda é longo: dividir dados básicos, serviços/disponibilidade e conferência documental numa próxima etapa.
4. Definir o que os selos realmente comprovam. Conferência documental não é garantia da qualidade do serviço. A nova busca não repete selos não demonstrados nem inventa relatos de clientes.
5. Diferenciar interesse, contato liberado e contratação. Liberar contato não comprova serviço executado.
6. Validar em um piloto com contratantes e profissionais: conseguem encontrar uma categoria, explicar a cobrança e chegar ao contato sem orientação?

## Como publicar esta revisão

1. Faça uma cópia da versão atual ou crie uma branch no repositório.
2. Extraia o ZIP e substitua os arquivos na raiz do repositório `ajuda-em-casa-prototipo`, mantendo os nomes e as pastas.
3. Publique pela configuração atual do GitHub Pages.
4. Abra `index.html` para testar a experiência e `telas.html` para o mapa completo.

Não há etapa de build nem bibliotecas novas. A revisão usa HTML, CSS e JavaScript estáticos. O link público original não foi alterado nesta entrega.

## Limites para uso real

Esta entrega é um protótipo navegável, não um sistema operacional. Os cadastros, documentos, disponibilidade, avaliações e pagamentos são exemplos. Não há autenticação, banco de dados, autorização administrativa, cobrança ou envio de mensagens. As páginas antigas mantêm suas simulações originais. As únicas persistências adicionadas são preferências e o último contato de demonstração no navegador.

Para receber usuários reais, implementar os serviços de autenticação, persistência, permissões e integrações, além de validar as regras de negócio e os textos institucionais aplicáveis. Não coletar documentos pessoais por esta versão estática.

## Manutenção

O README original indica geração pelo Claude Design. O gerador e o projeto-fonte não estão neste repositório. As alterações foram aplicadas ao HTML exportado. É necessário incorporá-las ao projeto-fonte antes de uma nova exportação para não perdê-las.

## Verificação executada

- JavaScript validado quanto à sintaxe.
- Busca por nome, perfil correto, modo pago, continuidade do contato, estado vazio e limpeza de filtros exercitados em Chromium.
- Todas as páginas HTML verificadas nas larguras de 320, 390, 768 e 1360 pixels, sem erros JavaScript ou transbordamento horizontal da página após as correções. Tabelas administrativas conservam sua rolagem interna.
- Página inicial inspecionada visualmente em desktop e celular.
- Destinos locais dos links e recursos estáticos conferidos: nenhum arquivo ausente.
- Não foram testadas integrações reais, pois não existem neste protótipo.
