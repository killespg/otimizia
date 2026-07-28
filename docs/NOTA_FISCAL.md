# Emissão de nota fiscal da assinatura

SaaS é serviço: a nota é **NFS-e**, municipal, emitida pela prefeitura do
município da empresa — não é NF-e nem sai do Stripe. O Stripe emite *invoice*
(recibo de cobrança), que não substitui nota fiscal no Brasil.

## O que o código já resolve

`app/api/billing/checkout/route.ts` coleta no checkout, antes de cobrar:

- `tax_id_collection` — CPF (`br_cpf`) ou CNPJ (`br_cnpj`) do cliente;
- `billing_address_collection: "required"` — endereço completo;
- `customer_update` — os dois sobem para o objeto Customer no Stripe, então
  ficam disponíveis em toda renovação, não só na primeira compra.

Sem isso não havia como emitir nota nenhuma: faltava o tomador.

## O que falta decidir (operacional, fora do repo)

1. **Habilitar a emissão de NFS-e** no portal da prefeitura da sede (certificado
   digital e-CNPJ A1 costuma ser exigido para emissão via API).
2. **Escolher o código de serviço** na lista da LC 116/2003. Para SaaS por
   assinatura o usual é **1.05** (licenciamento/cessão de direito de uso de
   programas de computação). Confirme com o contador: a alíquota de ISS muda por
   município (2% a 5%).
3. **Escolher como emitir:**
   - *Manual*, pelo portal da prefeitura — viável só no começo, com poucos
     clientes; não escala e some quando o volume cresce.
   - *Via API de terceiro* (NFE.io, Focus NFe, eNotas, Omie) — todos têm
     integração pronta com Stripe ou webhook próprio. É a opção recomendada a
     partir de ~20 assinantes.
4. **Definir o gatilho.** O ponto certo é o webhook
   `invoice.payment_succeeded` (dinheiro compensado), não `checkout.session.completed`
   (cobrança iniciada). Emitir na intenção de pagamento gera nota de venda que
   pode não se concretizar, e cancelar NFS-e depois do prazo é dor de cabeça.
5. **Entregar a nota ao cliente** — o e-mail do PDF pelo próprio emissor resolve;
   opcionalmente linkar em Configurações → Financeiro.

Quando o item 3 for decidido, o trabalho no repo é um handler novo em
`app/api/webhooks/stripe` chamando o emissor com os dados que já estão no
Customer.
