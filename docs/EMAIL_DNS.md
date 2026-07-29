# Entregabilidade de e-mail: SPF, DKIM e DMARC

Nada aqui é código — é configuração no painel do Resend e no DNS de
`useotimizia.com`. Sem isso, o e-mail transacional (convite de equipe,
boas-vindas, resumo diário) cai em spam no Gmail e é rejeitado no Outlook.

O envio sai de `lib/email.ts` por dois remetentes, e os dois precisam do
domínio verificado:

| Variável | Endereço | Usado em |
|---|---|---|
| `RESEND_FROM_EMAIL` | `avisos@` | convite de equipe, boas-vindas — a pessoa pode responder |
| `RESEND_NOREPLY_EMAIL` | `noreply@` | resumo diário, alerta de venda parada |

## 1. Verificar o domínio no Resend

Em <https://resend.com/domains>, adicione `useotimizia.com`. O Resend gera os
registros; publique todos no DNS antes de clicar em "Verify".

- **DKIM** — um CNAME `resend._domainkey` (ou TXT, conforme o painel mostrar).
  É o que assina cada mensagem. Copie o valor exatamente como aparece.
- **SPF** — um TXT no `send.useotimizia.com` (subdomínio de envio) com
  `v=spf1 include:amazonses.com ~all`.

  Se você já tiver SPF no domínio raiz, **não crie um segundo**: um domínio com
  dois registros SPF é tratado como `permerror` e falha em tudo. Junte os
  `include:` num registro só.

## 2. DMARC (o Resend não cria — é manual)

Registro TXT em `_dmarc.useotimizia.com`. Comece em modo observação, para não
bloquear e-mail legítimo enquanto a configuração assenta:

```
v=DMARC1; p=none; rua=mailto:dmarc@useotimizia.com; fo=1; adkim=s; aspf=r
```

Depois de 2–4 semanas lendo os relatórios e confirmando que 100% do tráfego
legítimo passa em SPF **e** DKIM, aperte:

```
v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@useotimizia.com; adkim=s; aspf=r
```

E, quando estiver estável, `p=reject`. Desde 2024 Gmail e Yahoo exigem DMARC
publicado para quem envia volume — `p=none` já cumpre o requisito mínimo, mas
não protege contra falsificação do domínio.

## 3. Criar o alias `noreply@`

`noreply@` precisa **existir** como endereço, mesmo sem caixa de entrada legível.
Configure como alias que descarta ou encaminha para o suporte. Nunca aponte um
`From:` para um endereço inexistente: bounce em resposta a mensagem automática
derruba reputação de envio.

## 4. Conferir antes de mandar o primeiro lote

- Envie para <https://www.mail-tester.com/> a partir dos dois remetentes; alvo é 9/10 ou mais.
- No Gmail, abra a mensagem recebida em "Exibir original" e confirme
  `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.
