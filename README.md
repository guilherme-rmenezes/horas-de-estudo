# Horas de Estudo

Tracker de horas de estudo por matéria, com timer, registro manual, sistema de progressão gamificado e gráfico de evolução. Aplicação de página única, sem backend e sem dependências externas, com os dados persistidos em `localStorage`.

Acesse em: https://guilherme-rmenezes.github.io/horas-de-estudo/

## Sumário

- [Funcionalidades](#funcionalidades)
- [Sistema de progressão](#sistema-de-progressão)
- [Armazenamento de dados](#armazenamento-de-dados)
- [Arquitetura e organização do código](#arquitetura-e-organização-do-código)
- [Como rodar localmente](#como-rodar-localmente)
- [Acessibilidade](#acessibilidade)
- [Processo de desenvolvimento](#processo-de-desenvolvimento)
- [Deploy](#deploy)

## Funcionalidades

- Timer com precisão baseada em timestamp (`Date.now()`), não em contagem incremental por `setInterval`, o que evita atraso quando a aba fica em segundo plano
- Registro manual de sessões já estudadas, com data, horas e minutos
- Cadastro de matérias com nome e cor escolhidos pelo usuário
- Progressão gamificada, com nível geral e nível por matéria
- Gráfico de evolução das horas por matéria, com granularidade diária, semanal e mensal
- Histórico de sessões, com opção de exclusão
- Exportação e importação de backup por código, para sincronizar dados entre navegadores ou aparelhos diferentes

## Sistema de progressão

O nível é calculado a partir do total de segundos estudados, em blocos fixos de 10 horas. A nomenclatura segue o sistema de elos do League of Legends: Ferro, Bronze, Prata, Ouro, Platina, Esmeralda e Diamante, cada um com 4 divisões, seguidos por Mestre, Grão Mestre e Desafiante, este último sem limite superior, incrementando indefinidamente conforme as horas aumentam.

A função `tier(nivel)` traduz o índice do nível acumulado em nome e cor do elo correspondente, tanto para o total geral quanto para cada matéria isoladamente.

## Armazenamento de dados

Os dados ficam apenas no `localStorage` do navegador, sob uma única chave, sem qualquer comunicação com servidor. Uma função `normalize()` sanitiza o conteúdo lido a cada carregamento, descartando entradas malformadas e garantindo que a estrutura mínima (matérias, sessões, timer) sempre exista, mesmo diante de dado corrompido.

Como o `localStorage` é isolado por navegador e por aparelho, o backup entre dispositivos é feito por um código gerado a partir do próprio estado (matérias e sessões), codificado em Base64. O código pode ser mesclado (sessões novas por identificador, sem duplicar) ou usado para substituir todo o histórico local.

## Arquitetura e organização do código

Um único arquivo `index.html`, mais `style.css` e `script.js`, sem framework e sem etapa de build. O código-fonte é o que roda em produção.

```
index.html   marcação semântica das seções (registro, matérias, gráfico, histórico, backup)
style.css    design tokens, temas claro/escuro, componentes visuais
script.js    módulo único (IIFE) contendo:
               - modelo de dados (objeto de estado S: matérias, sessões, timer)
               - normalize() e validEntry() para sanitização
               - tier() e as funções de cálculo de progressão
               - funções de renderização (renderHero, renderSubjects, renderChart, renderHistory)
               - geração do gráfico como SVG via template string, sem biblioteca de charts
               - rotinas de backup (codificação/decodificação Base64)
```

Cada sessão de estudo é tratada como um registro imutável; os totais são sempre recalculados a partir da lista de sessões, nunca mantidos em um contador separado.

## Como rodar localmente

Baixe os três arquivos (`index.html`, `style.css`, `script.js`) mantendo a mesma pasta, e abra o `index.html` direto no navegador. Não há build, não há dependência de rede e não há necessidade de servidor HTTP.

## Acessibilidade

Navegação completa por teclado, com foco visível em todos os controles interativos. O gráfico em SVG expõe `role` e `aria-label` descritivos por barra, para leitores de tela. A interface segue automaticamente o tema claro ou escuro do sistema operacional e respeita a preferência `prefers-reduced-motion`, desativando animações quando solicitado. Ações destrutivas (excluir sessão, remover matéria, substituir backup) exigem confirmação em dois passos antes de serem executadas.

## Processo de desenvolvimento

Este projeto foi desenvolvido com apoio do Claude Code. Optei por deixar isso explícito aqui, junto com o que foi de fato o processo, para que qualquer pessoa avaliando o repositório saiba exatamente o que esperar: cada alteração foi revisada linha a linha antes de aceita, com ajustes pedidos sempre que o resultado não correspondia ao esperado (por exemplo, a correção do timer para não perder precisão em segundo plano, ou o ajuste de contraste dos botões de remoção de matéria, que inicialmente ficaram pouco visíveis).

Parte da forma como conduzi essas interações veio de conceitos de engenharia de prompt estudados para uma certificação de IA generativa da AWS, aplicados aqui de forma prática:

- Instruções diretas, sem exemplos, quando o pedido já era suficientemente específico
- Divisão de pedidos complexos em etapas de raciocínio, como na definição da lógica de níveis e divisões do sistema de progressão
- Fornecimento do trecho de código ou do contexto relevante do próprio arquivo antes de cada pedido de alteração, para que a resposta partisse do que já existia em vez de uma suposição

## Deploy

Publicado via GitHub Pages a partir da branch `main`.
