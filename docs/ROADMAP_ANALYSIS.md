# Análise do Roadmap CRM Imobiliário (v6)

Este documento é uma revisão crítica do roadmap definitivo do vertical
imobiliário do OtimizIA ("CRM imobiliário que trabalha com o corretor",
Roadmap final v6). Não é o roadmap em si — é uma segunda opinião sobre ele,
para apoiar decisão antes de começar a execução.

## Resumo

O roadmap estrutura 6 fases (Fundação → Núcleo → Comunicação/Captura →
Automação → Inteligência → Escala), com portões de decisão, critérios de
saída e categorização de escopo (compromisso original / evolução do
compromisso / aposta nova) por item. É um documento de planejamento maduro:
a maioria dos itens tem problema, entrega, dependência e critério de saída
explícitos, e a ordem das fases está amarrada por dependências técnicas
reais, não por preferência estética.

## Pontos fortes

- **Sequenciamento por dependência real, não por desejo.** A separação
  entre Central Hoje básica (1.3a, sem depender do funil) e avançada (1.3b,
  dependente de 1.1) desacopla ganho de hábito rápido de trabalho
  estrutural — ganho de produto sem esperar a migração de schema.
- **Portões antes de codar (seção 4):** desejabilidade, viabilidade, dados,
  segurança, mensuração. Evita construir feature sem validação de demanda.
- **Rastreabilidade de decisões antigas.** O item 0.5 (mapa de clientes vs.
  planejador de rota) resgata explicitamente uma decisão que tinha sido
  "esquecida" silenciosamente em versões anteriores do roadmap — disciplina
  de processo pouco comum em documentos desse tipo.
- **Categorização de escopo em 3 níveis** (compromisso original / evolução
  do compromisso / aposta nova). Deixa explícito o que já foi prometido
  versus o que é expansão que ainda precisa de aprovação — útil para
  negociar prioridade com quem financia o roadmap.
- **Ligado ao código real do repositório**, não é genérico: cita
  `professions.ts`, `Board.tsx`, `lib/real-estate-match.ts`,
  `lib/ai/whatsapp-reply.ts`, `lib/dashboard-preferences.ts`.
- **Definition of Done exigente.** Instrumentação, testes de autorização e
  migração, rollback, piloto com critérios declarados e comparação com
  linha de base — "publicar código" explicitamente não é critério de fase
  concluída.

## Riscos e lacunas

1. **Decisões de negócio críticas seguem em aberto (seção 9)** — segmento-
   alvo, empacotamento comercial (venda/locação/captação juntos ou
   separados), linha de base atual de ativação/retenção/conversão — sem
   dono nomeado nem prazo para resposta. Sem isso, mesmo a Fase 0 (que
   depende de "confirmar segmento inicial") não tem gatilho de início
   claro.
2. **Esforço "G" aparece em 11 itens** (1.1, 2.2, 3.1, 3.2, 3.4, 4.3, 4.4,
   4.5, 5.1, 5.2, 5.3) sem um segundo eixo de comparação entre eles. Quando
   a capacidade da equipe for menor — o próprio documento prevê isso —,
   fica difícil decidir qual "G" cortar primeiro dentro da mesma fase.
3. **RBAC (3.4) só chega na Fase 3.** Até lá, os cargos ficam amplos
   (owner/broker/agent/assistant/staff) com apenas dois portões: ver e
   gerenciar. Se o segmento inicial da seção 9 incluir equipes (e não só
   corretor autônomo), a ausência de permissão granular pode virar
   bloqueador comercial bem antes da Fase 3.
4. **Cadeia de dependência longa para a Fase 4.** Os itens 4.1
   (matching), 4.3 (lead scoring) e 4.5 (tendências) dependem de 2.3
   (dedupe/qualidade de dados), que está marcado como "aposta nova" — ou
   seja, sujeito a discovery e aprovação própria antes de começar. Se 2.3
   atrasar, toda a Fase 4 trava. Vale tratar 2.3 como quase-crítico para o
   roadmap, não como aposta opcional, dado quantos itens dependem dele.
5. **Sem métrica de custo recorrente por fase.** O portão de "viabilidade"
   (seção 4) cobre isso na entrada de cada item, mas não há uma métrica de
   acompanhamento contínuo — relevante sobretudo na Fase 5 (integrações,
   multiunidade, marketplace) e nos itens de IA com custo de modelo por
   chamada (4.1, 4.3, 4.4).
6. **WhatsApp já está em produção** (`lib/ai/whatsapp-reply.ts`) mas os
   critérios de consentimento/opt-out (seção 2.1) só são definidos
   formalmente para o e-mail. Vale aplicar retroativamente ao canal que já
   está ativo, antes de somar volume de disparo.
7. **Rituais de governança (seção 7) não nomeiam um decisor.** "Revisão de
   fase" decide continuar/ajustar/pausar/matar aposta, mas sem um
   responsável explícito por bater o martelo, o ritual pode virar reunião
   sem poder de decisão.

## Perguntas para destravar a execução

- Quem responde as 6 perguntas da seção 9, e até quando? A Fase 0 depende
  disso.
- A dependência de 2.3 sobre toda a Fase 4 foi dimensionada como risco de
  cronograma, ou só como dependência lógica no papel?
- Já existe orçamento/aprovação para os itens "aposta nova" da Fase 0
  (0.4, 0.5) e Fase 1 (1.3a), ou eles também aguardam a decisão de mandato
  da seção 9 antes de começar?

## Conclusão

O roadmap é estruturalmente sólido — a arquitetura suporta o produto
ambicioso e a ordem das fases está corretamente amarrada por dependência
técnica. O maior risco não é técnico, é de governança: as perguntas de
negócio em aberto na seção 9 (segmento, empacotamento, orçamento para
apostas novas) podem travar a Fase 0 mesmo com a arquitetura já pronta no
papel. Recomenda-se nomear um dono para essas respostas antes de iniciar a
Etapa A da seção 8.
