"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PendingButton } from "@/components/ui/PendingButton";
import {
  LegalLossReasonDialog,
  type LegalLossReason,
} from "@/components/legal/legal-loss-reason-dialog";
import type { FieldSpec } from "@/lib/people/professions";
import type { Deal, DealStage } from "@/lib/supabase/types";
import {
  dealValueOrZero,
  formatCommission,
  formatDealValue,
  getCommissionPercent,
} from "@/lib/crm/deals";
import { isLostPipelineList, stageFromPipelineList } from "@/lib/crm/pipeline-stage";
import { formatBRL } from "@/lib/utils/format";
import { pipelineMetaFromList } from "./pipeline-meta";
import {
  acceptDealHandoff,
  adminReassignDeal,
  claimDeal,
  createPipelineList,
  declineDealHandoff,
  deleteDeal,
  moveDealToList,
  requestDealHandoff,
  updateDealOptions,
  uploadDealPhoto,
} from "../actions";
import { IconCheck, IconChevronRight, IconGrip, IconPlus, IconTrash } from "../icons";

type Member = { user_id: string; name: string | null };

type PendingLegalLoss = {
  dealId: string;
  targetList: string;
  previousStage: DealStage;
  previousDetails: Record<string, string>;
} | null;

function firstDetail(details: Record<string, string> | undefined, fields: FieldSpec[]) {
  if (!details) return null;
  for (const field of fields) {
    const value = details[field.key];
    if (value) return `${field.label}: ${value}`;
  }
  return null;
}

export default function Board({
  initialDeals,
  contactNames,
  dealFields = [],
  pipelineLists,
  members = [],
  currentUserId,
  isAdmin = false,
  isSeller = false,
  isRealEstate = false,
  isLegal = false,
  flat = false,
}: {
  initialDeals: Deal[];
  contactNames: Record<string, string>;
  stages?: Record<DealStage, { label: string; empty: string }>;
  dealFields?: FieldSpec[];
  pipelineLists: string[];
  members?: Member[];
  currentUserId?: string;
  isAdmin?: boolean;
  isSeller?: boolean;
  isRealEstate?: boolean;
  isLegal?: boolean;
  flat?: boolean;
}) {
  const [deals, setDeals] = useState(initialDeals);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overList, setOverList] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [handoffId, setHandoffId] = useState<string | null>(null);
  const [pendingLegalLoss, setPendingLegalLoss] = useState<PendingLegalLoss>(null);
  const [legalLossReturnFocus, setLegalLossReturnFocus] = useState<HTMLElement | null>(null);
  const nameById = new Map(members.map((m) => [m.user_id, m.name]));
  const [canDrag, setCanDrag] = useState(true);
  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState("");
  const [listFilter, setListFilter] = useState("");
  const [hideEmpty, setHideEmpty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const boardRef = useRef<HTMLDivElement>(null);
  const boardBusy = isPending || savingId !== null;
  const visibleDeals = deals.filter((deal) => !isPlaceholder(deal));
  const allColumns = uniqueLists([
    ...pipelineLists,
    ...deals.map((deal) => listName(deal)).filter(Boolean),
  ]);
  const allLabels = useMemo(() => {
    return uniqueLists(visibleDeals.flatMap((deal) => dealLabels(deal)));
  }, [visibleDeals]);
  const filteredDeals = useMemo(() => {
    const needle = normalizeText(search);
    return visibleDeals.filter((deal) => {
      const labels = dealLabels(deal);
      const haystack = normalizeText(
        [
          deal.title,
          contactNames[deal.contact_id ?? ""],
          formatDealValue(deal),
          listName(deal),
          labels.join(" "),
          ...Object.values(deal.details ?? {}),
        ].join(" ")
      );
      return (
        (!needle || haystack.includes(needle)) &&
        (!labelFilter || labels.includes(labelFilter)) &&
        (!listFilter || listName(deal) === listFilter)
      );
    });
  }, [contactNames, labelFilter, listFilter, search, visibleDeals]);
  const columns = allColumns.filter((column) => {
    if (listFilter && column !== listFilter) return false;
    if (!hideEmpty) return true;
    return filteredDeals.some((deal) => listName(deal) === column);
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const frame = window.requestAnimationFrame(() => {
      const isTouchOnly =
        window.matchMedia("(pointer: coarse)").matches &&
        !window.matchMedia("(pointer: fine)").matches;
      if (isTouchOnly) setCanDrag(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  function commitMove(id: string, targetList: string, lossReason?: LegalLossReason) {
    if (boardBusy) return;
    const deal = deals.find((item) => item.id === id);
    if (!deal) return;
    const previousDetails = deal.details ?? {};
    const previousStage = deal.stage;
    const previousList = listName(deal);
    if (previousList === targetList) return;

    // No workspace de produtos, "Ganho" não é só uma coluna: precisa virar
    // pedido com itens, estoque e garantias. A confirmação é transacional e
    // só ela fecha a negociação de fato.
    if (isSeller && stageFromPipelineList(targetList) === "ganho") {
      router.push(`/painel/vendas/${id}/confirmar`);
      return;
    }

    if (isLegal && isLostPipelineList(targetList) && !lossReason) {
      const activeElement = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      setLegalLossReturnFocus(activeElement?.closest<HTMLElement>("[data-deal-card]") ?? activeElement);
      setPendingLegalLoss({
        dealId: id,
        targetList,
        previousStage,
        previousDetails,
      });
      return;
    }

    setDeals((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              stage: stageFromPipelineList(targetList),
              details: { ...(item.details ?? {}), pipeline_list: targetList },
            }
          : item
      )
    );
    setSavingId(id);

    startTransition(() => {
      void moveDealToList(id, targetList, lossReason)
        .catch(() => {
          setDeals((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, stage: previousStage, details: previousDetails } : item
            )
          );
        })
        .finally(() => {
          setSavingId(null);
          router.refresh();
        });
    });
  }

  function confirmLegalLoss(pending: NonNullable<PendingLegalLoss>, lossReason: LegalLossReason) {
    setPendingLegalLoss(null);
    commitMove(pending.dealId, pending.targetList, lossReason);
  }

  function onDrop(targetList: string) {
    setOverList(null);
    if (!dragId || boardBusy) return;
    const id = dragId;
    setDragId(null);
    commitMove(id, targetList);
  }

  function scrollBoard(direction: "previous" | "next") {
    const board = boardRef.current;
    if (!board) return;
    const distance = board.clientWidth * (direction === "next" ? 1 : -1);
    board.scrollBy({ left: distance, behavior: "smooth" });
  }

  return (
    <div className={flat ? "space-y-5" : "space-y-4"}>
      {pendingLegalLoss ? (
        <LegalLossReasonDialog
          dealTitle={deals.find((deal) => deal.id === pendingLegalLoss.dealId)?.title ?? "Atendimento"}
          onCancel={() => setPendingLegalLoss(null)}
          onConfirm={(lossReason) => confirmLegalLoss(pendingLegalLoss, lossReason)}
          returnFocusTo={legalLossReturnFocus}
        />
      ) : null}
      <form action={createPipelineList} className={flat ? "flex flex-col gap-3 border-y border-white/[0.08] py-4 sm:flex-row sm:items-end" : "panel flex flex-col gap-3 p-4 sm:flex-row sm:items-end"}>
        <input type="hidden" name="return_to" value="/painel/funil" />
        <div className="min-w-0 flex-1">
          <label className="label" htmlFor="pipeline-list-name">
            Nova lista
          </label>
          <input
            id="pipeline-list-name"
            name="name"
            required
            maxLength={160}
            placeholder="Ex: Documentos pendentes"
            className="field mt-1.5"
          />
        </div>
        <PendingButton className="btn h-[42px]" pendingLabel="Criando">
          <IconPlus className="h-4 w-4" />
          Criar lista
        </PendingButton>
      </form>

      <section className={flat ? "grid gap-3 border-y border-white/[0.08] py-4 md:grid-cols-[minmax(14rem,1fr)_minmax(10rem,14rem)_minmax(10rem,14rem)_auto] md:items-end" : "panel grid gap-3 p-4 md:grid-cols-[minmax(14rem,1fr)_minmax(10rem,14rem)_minmax(10rem,14rem)_auto] md:items-end"}>
        <label className="block min-w-0">
          <span className="label">Buscar no quadro</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, lista, etiqueta..."
            className="field mt-1.5"
          />
        </label>
        <label className="block min-w-0">
          <span className="label">Etiqueta</span>
          <select
            value={labelFilter}
            onChange={(event) => setLabelFilter(event.target.value)}
            className="field mt-1.5"
          >
            <option value="">Todas</option>
            {allLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0">
          <span className="label">Lista</span>
          <select
            value={listFilter}
            onChange={(event) => setListFilter(event.target.value)}
            className="field mt-1.5"
          >
            <option value="">Todas</option>
            {allColumns.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
        </label>
        <label className={flat ? "flex min-h-[42px] items-center gap-2 px-1 text-sm font-semibold text-white/60" : "flex min-h-[42px] items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-bold text-ink-soft"}>
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={(event) => setHideEmpty(event.target.checked)}
            className="h-4 w-4 rounded border-line accent-brand-700"
          />
          Ocultar vazias
        </label>
      </section>

      {columns.length > 1 && (
        <div className={flat ? "sticky top-[calc(4.75rem+env(safe-area-inset-top))] z-20 -mx-1 flex items-center justify-between gap-2 border-y border-od-border bg-od-bg py-2 sm:hidden" : "sticky top-[calc(4.75rem+env(safe-area-inset-top))] z-20 -mx-1 flex items-center justify-between gap-2 rounded-inner border border-od-border bg-od-surface p-1.5 sm:hidden"}>
          <button
            type="button"
            onClick={() => scrollBoard("previous")}
            className="nav-item flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-surface-2 px-3 text-xs font-black text-ink-soft hover:text-brand-700"
          >
            <IconChevronRight className="h-4 w-4 rotate-180" />
            Anterior
          </button>
          <span className="shrink-0 rounded-md bg-brand-50 px-2.5 py-1 text-xs font-black text-brand-700">
            {columns.length} listas
          </span>
          <button
            type="button"
            onClick={() => scrollBoard("next")}
            className="nav-item flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-700 px-3 text-xs font-black text-white"
          >
            Próxima
            <IconChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        ref={boardRef}
        aria-busy={boardBusy}
        className={flat ? "pipeline-board -mx-4 flex snap-x snap-mandatory gap-0 overflow-x-auto border-y border-white/[0.08] px-4 sm:mx-0 sm:px-0" : "pipeline-board -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-4 sm:px-0"}
      >
        {columns.map((column) => {
          const meta = trelloMeta(column);
          const columnDeals = filteredDeals
            .filter((deal) => listName(deal) === column)
            .sort(compareDeals);
          const total = columnDeals.reduce((sum, deal) => sum + dealValueOrZero(deal), 0);
          const isOver = overList === column;

          return (
            <section
              key={column}
              onDragOver={(event) => {
                event.preventDefault();
                if (overList !== column) setOverList(column);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setOverList((current) => (current === column ? null : current));
                }
              }}
              onDrop={() => onDrop(column)}
              className={
                (flat
                  ? "flex min-w-[calc(100vw-2rem)] shrink-0 snap-start flex-col overflow-hidden border-r border-white/[0.08] bg-transparent transition-colors duration-200 sm:min-w-[18rem] "
                  : "panel flex min-w-[calc(100vw-2rem)] shrink-0 snap-start flex-col overflow-hidden transition-colors duration-200 sm:min-w-[18rem] ") +
                (isOver ? (flat ? "bg-od-accent/[0.06]" : "border-brand-300 bg-brand-50") : "")
              }
            >
              <header className={flat ? "border-b border-white/[0.08] bg-transparent px-4 py-4" : "border-b border-line bg-white px-4 py-4"}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                    <h2 className="clip-2 text-safe text-sm font-black text-ink">{column}</h2>
                  </div>
                  <span className={`rounded-md px-2.5 py-1 text-xs font-black ${meta.chip}`}>
                    {String(columnDeals.length).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-2 text-sm font-black tabular-nums text-ink">
                  {formatBRL(total)}
                </p>
              </header>

              <div className={flat ? "flex min-h-[22rem] flex-1 flex-col gap-3 bg-transparent p-3" : "enter flex min-h-[22rem] flex-1 flex-col gap-3 bg-[#f8fbff] p-3"}>
                {columnDeals.length === 0 ? (
                  <div className={flat ? "flex flex-1 flex-col items-center justify-center px-4 py-8 text-center" : "flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-white px-4 py-8 text-center"}>
                    <p className="text-sm font-black text-ink">
                      {isOver ? "Solte aqui" : isSeller ? "Sem vendas" : isRealEstate ? "Sem atendimentos" : "Vazio"}
                    </p>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-ink-muted">
                      {isSeller ? "Nenhuma venda nesta etapa." : isRealEstate ? "Nenhum atendimento nesta etapa." : meta.empty}
                    </p>
                  </div>
                ) : (
                  columnDeals.map((deal) => {
                    const menuOpen = menuId === deal.id;
                    const otherLists = columns.filter((list) => list !== column);

                    return (
                      <article
                        key={deal.id}
                        data-deal-card
                        tabIndex={0}
                        draggable={canDrag && !boardBusy}
                        onDragStart={() => setDragId(deal.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverList(null);
                        }}
                        className={
                          (flat ? "row-link group rounded-md border border-white/[0.09] bg-white/[0.025] p-3 hover:border-od-accent/30 " : "row-link group rounded-lg border border-line bg-white p-3 shadow-[0_14px_34px_-28px_rgba(21,19,46,0.72)] hover:border-brand-200 ") +
                          (boardBusy ? "cursor-wait opacity-70" : canDrag ? "cursor-grab active:cursor-grabbing" : "") +
                          " " +
                          (dragId === deal.id ? "scale-[0.985] opacity-45 ring-2 ring-brand-300" : "")
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-2">
                            <IconGrip className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted/45 transition-colors duration-150 group-hover:text-brand-700" />
                            <div className="min-w-0">
                              <p className="clip-2 text-safe text-sm font-black leading-snug text-ink">
                                {deal.title}
                              </p>
                              {deal.contact_id && contactNames[deal.contact_id] && (
                                <p className="mt-1 truncate text-xs font-bold text-ink-muted">
                                  {contactNames[deal.contact_id]}
                                </p>
                              )}
                              {firstDetail(deal.details, dealFields) && (
                                <p className="mt-1 truncate text-xs font-medium text-ink-muted">
                                  {firstDetail(deal.details, dealFields)}
                                </p>
                              )}
                              {dealLinks(deal).length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {dealLinks(deal).map((link) => (
                                    <a
                                      key={`${link.label}-${link.href}`}
                                      href={link.href}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex text-xs font-black text-brand-700 hover:text-brand-900"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      {link.label}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setMenuId((current) => (current === deal.id ? null : deal.id))
                              }
                              disabled={boardBusy}
                              aria-expanded={menuOpen}
                              aria-label={`Mover ${deal.title} para outra lista`}
                              className={
                                "icon-button grid h-11 w-11 place-items-center rounded-md text-ink-muted/50 hover:bg-brand-50 hover:text-brand-700 " +
                                (menuOpen ? "bg-brand-50 text-brand-700" : "")
                              }
                            >
                              <IconChevronRight
                                className={
                                  "h-4 w-4 transition-transform duration-150 " +
                                  (menuOpen ? "rotate-90" : "")
                                }
                              />
                            </button>
                            <form action={deleteDeal} className="shrink-0">
                              <input type="hidden" name="id" value={deal.id} />
                              <input type="hidden" name="return_to" value="/painel/funil" />
                              <PendingButton
                                className="icon-button grid h-11 w-11 place-items-center rounded-md text-ink-muted/50 opacity-100 hover:bg-danger-50 hover:text-danger-600 sm:opacity-0 sm:group-hover:opacity-100"
                                title="Excluir"
                                aria-label={`Excluir ${deal.title}`}
                                iconOnly
                                pendingLabel="Excluindo"
                              >
                                <IconTrash className="h-4 w-4" />
                              </PendingButton>
                            </form>
                          </div>
                        </div>

                        {menuOpen && (
                          <div className="mt-3 space-y-3 border-t border-line pt-3">
                            {isSeller && deal.details?.seller_order_id ? (
                              <Link
                                href={`/painel/pedidos/${deal.details.seller_order_id}`}
                                className="flex min-h-11 items-center justify-center border border-od-accent/25 bg-od-accent/[0.06] px-3 text-xs font-semibold text-od-text hover:bg-white/[0.04]"
                              >
                                Abrir pedido confirmado
                              </Link>
                            ) : isSeller && deal.stage !== "perdido" ? (
                              <Link
                                href={`/painel/vendas/${deal.id}/confirmar`}
                                className="flex min-h-11 items-center justify-center border border-od-accent/25 bg-od-accent/[0.06] px-3 text-xs font-semibold text-od-text hover:bg-white/[0.04]"
                              >
                                Confirmar venda e criar pedido
                              </Link>
                            ) : null}
                            <div className="flex flex-wrap gap-1.5">
                              {otherLists.map((list) => (
                                <button
                                  key={list}
                                  type="button"
                                  onClick={() => {
                                    commitMove(deal.id, list);
                                    setMenuId(null);
                                  }}
                                  className="min-h-11 rounded-md border border-line bg-white px-3 py-2 text-xs font-bold text-ink-soft hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                                >
                                  {list}
                                </button>
                              ))}
                            </div>

                            <form action={updateDealOptions} className={flat ? "space-y-2 border-t border-white/[0.08] pt-3" : "space-y-2 rounded-lg border border-line bg-[#f8fbff] p-3"}>
                              <input type="hidden" name="id" value={deal.id} />
                              <input type="hidden" name="return_to" value="/painel/funil" />
                              <label className="block">
                                <span className="text-xs font-black text-ink-soft">Etiquetas</span>
                                <input
                                  name="labels"
                                  defaultValue={deal.details?.labels ?? ""}
                                  placeholder="Ex: quente, urgente"
                                  maxLength={240}
                                  className="field mt-1 h-9 text-xs"
                                />
                              </label>
                              <label className="block">
                                <span className="text-xs font-black text-ink-soft">Link externo</span>
                                <input
                                  name="external_url"
                                  defaultValue={deal.details?.external_url ?? ""}
                                  placeholder="https://..."
                                  maxLength={300}
                                  className="field mt-1 h-9 text-xs"
                                />
                              </label>
                              <label className="block">
                                <span className="text-xs font-black text-ink-soft">Comissão (%)</span>
                                <input
                                  name="commission_percent"
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  inputMode="decimal"
                                  defaultValue={deal.details?.commission_percent ?? ""}
                                  placeholder="Ex: 6"
                                  className="field mt-1 h-9 text-xs"
                                />
                              </label>
                              {deal.stage === "perdido" ? (
                                <label className="block">
                                  <span className="text-xs font-black text-ink-soft">Motivo da perda</span>
                                  <input
                                    name="loss_reason"
                                    defaultValue={deal.details?.loss_reason ?? ""}
                                    placeholder="Ex: preço, prazo, concorrente"
                                    maxLength={120}
                                    className="field mt-1 h-9 text-xs"
                                  />
                                </label>
                              ) : null}
                              <PendingButton
                                className="min-h-9 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-black text-white hover:bg-brand-800"
                                pendingLabel="Salvando"
                              >
                                Salvar opções
                              </PendingButton>
                            </form>

                            <form action={uploadDealPhoto} className={flat ? "space-y-2 border-t border-white/[0.08] pt-3" : "space-y-2 rounded-lg border border-line bg-white p-3"}>
                              <input type="hidden" name="id" value={deal.id} />
                              <input type="hidden" name="return_to" value="/painel/funil" />
                              <label className="block">
                                <span className="text-xs font-black text-ink-soft">Foto</span>
                                <input
                                  name="photo"
                                  type="file"
                                  accept="image/*"
                                  className="mt-1 block w-full text-xs font-bold text-ink-soft file:mr-3 file:min-h-9 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:text-xs file:font-black file:text-ink-soft hover:file:bg-brand-50 hover:file:text-brand-700"
                                />
                              </label>
                              <PendingButton
                                className="min-h-9 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-black text-ink-soft hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                                pendingLabel="Anexando"
                              >
                                Anexar foto
                              </PendingButton>
                            </form>
                          </div>
                        )}

                        {dealPhotos(deal).length > 0 && (
                          <div className="mt-3 grid grid-cols-3 gap-1.5">
                            {dealPhotos(deal).slice(0, 3).map((url, index) => (
                              <a
                                key={`${url}-${index}`}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="relative block aspect-[4/3] overflow-hidden rounded-md border border-line bg-surface-2"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <span
                                  aria-label={`Foto ${index + 1} de ${deal.title}`}
                                  className="block h-full w-full bg-cover bg-center"
                                  style={{ backgroundImage: `url(${url})` }}
                                />
                                {index === 2 && dealPhotos(deal).length > 3 && (
                                  <span className="absolute inset-0 grid place-items-center bg-ink/55 text-xs font-black text-white">
                                    +{dealPhotos(deal).length - 3}
                                  </span>
                                )}
                              </a>
                            ))}
                          </div>
                        )}

                        {dealLabels(deal).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {dealLabels(deal).map((label) => (
                              <span
                                key={label}
                                className={`min-h-5 max-w-full truncate rounded px-2 py-0.5 text-xs font-black ${labelClass(label)}`}
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        )}

                        {members.length > 1 && currentUserId && (
                          <DealAssignee
                            deal={deal}
                            members={members}
                            nameById={nameById}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                            open={handoffId === deal.id}
                            onToggle={() =>
                              setHandoffId((current) => (current === deal.id ? null : deal.id))
                            }
                          />
                        )}

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div>
                            <p
                              className={
                                "text-sm font-black tabular-nums " +
                                (deal.stage === "perdido"
                                  ? "text-ink-muted line-through"
                                  : deal.stage === "ganho"
                                  ? "text-success-700"
                                  : "text-brand-700")
                              }
                            >
                              {formatDealValue(deal)}
                            </p>
                            {formatCommission(deal) && (
                              <p className="mt-0.5 text-xs font-bold text-ink-muted">
                                Comissão {formatPercent(getCommissionPercent(deal))}:{" "}
                                <span className="tabular-nums text-ink">{formatCommission(deal)}</span>
                              </p>
                            )}
                          </div>
                          {deal.stage === "ganho" && (
                            <IconCheck className="h-4 w-4 text-success-700" />
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
        {columns.length === 0 && (
          <div className={flat ? "flex min-h-48 min-w-full items-center justify-center border-y border-white/[0.08] p-8 text-center" : "panel flex min-h-48 min-w-full items-center justify-center p-8 text-center"}>
            <p className="text-sm font-bold text-ink-muted">{isSeller ? "Nenhuma venda bate com os filtros." : isRealEstate ? "Nenhum atendimento bate com os filtros." : "Nenhum card bate com os filtros."}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DealAssignee({
  deal,
  members,
  nameById,
  currentUserId,
  isAdmin,
  open,
  onToggle,
}: {
  deal: Deal;
  members: Member[];
  nameById: Map<string, string | null>;
  currentUserId: string;
  isAdmin: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const assigneeName = deal.assignee_id
    ? (nameById.get(deal.assignee_id) ?? "Alguém da equipe")
    : null;
  const pendingTargetName = deal.pending_assignee_id
    ? (nameById.get(deal.pending_assignee_id) ?? "alguém")
    : null;
  const canManage =
    isAdmin || deal.assignee_id === currentUserId || deal.owner_id === currentUserId;
  const iAmPendingTarget = deal.pending_assignee_id === currentUserId;
  const otherMembers = members.filter((m) => m.user_id !== deal.assignee_id);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-ink-muted">
      {assigneeName && <span className="tag bg-surface-2 text-ink-muted">Com {assigneeName}</span>}

      {!deal.assignee_id && (
        <span className="flex items-center gap-1.5">
          <span className="tag bg-warning-50 text-warning-700">Em aberto</span>
          <form action={claimDeal}>
            <input type="hidden" name="deal_id" value={deal.id} />
            <input type="hidden" name="return_to" value="/painel/funil" />
            <PendingButton
              className="rounded-md bg-brand-700 px-2 py-1 text-xs font-black text-white hover:bg-brand-800"
              pendingLabel="Pegando"
            >
              Pegar
            </PendingButton>
          </form>
        </span>
      )}

      {deal.pending_assignee_id &&
        (iAmPendingTarget ? (
          <span className="flex items-center gap-1.5">
            <span className="tag bg-warning-50 text-warning-700">Pediram para você pegar</span>
            <form action={acceptDealHandoff}>
              <input type="hidden" name="deal_id" value={deal.id} />
              <input type="hidden" name="return_to" value="/painel/funil" />
              <PendingButton
                className="rounded-md bg-brand-700 px-2 py-1 text-xs font-black text-white hover:bg-brand-800"
                pendingLabel="Aceitando"
              >
                Aceitar
              </PendingButton>
            </form>
            <form action={declineDealHandoff}>
              <input type="hidden" name="deal_id" value={deal.id} />
              <input type="hidden" name="return_to" value="/painel/funil" />
              <PendingButton
                className="rounded-md border border-line bg-white px-2 py-1 text-xs font-black text-ink-soft hover:bg-surface-2"
                pendingLabel="Recusando"
              >
                Recusar
              </PendingButton>
            </form>
          </span>
        ) : (
          <span className="tag bg-warning-50 text-warning-700">
            Transferência pendente{pendingTargetName ? ` para ${pendingTargetName}` : ""}
          </span>
        ))}

      {canManage && !deal.pending_assignee_id && otherMembers.length > 0 && (
        <button
          type="button"
          onClick={onToggle}
          className="nav-item text-xs font-black text-brand-700 hover:text-brand-900"
        >
          {isAdmin ? "Reatribuir" : "Passar para..."}
        </button>
      )}

      {open && (
        <form
          action={isAdmin ? adminReassignDeal : requestDealHandoff}
          className="mt-1 flex w-full flex-wrap items-center gap-2"
        >
          <input type="hidden" name="deal_id" value={deal.id} />
          <input type="hidden" name="return_to" value="/painel/funil" />
          <select
            name={isAdmin ? "assignee_id" : "target_user_id"}
            required
            className="field h-9 py-0 text-xs"
            defaultValue=""
          >
            <option value="" disabled>
              Escolha o colega
            </option>
            {otherMembers.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.name ?? "Sem nome"}
              </option>
            ))}
          </select>
          <PendingButton
            className="rounded-md bg-brand-700 px-2.5 py-1.5 text-xs font-black text-white hover:bg-brand-800"
            pendingLabel="Enviando"
          >
            {isAdmin ? "Confirmar" : "Solicitar"}
          </PendingButton>
        </form>
      )}
    </div>
  );
}

function listName(deal: Deal) {
  return deal.details?.pipeline_list || deal.details?.trello_list || fallbackList(deal.stage);
}

function fallbackList(stage: DealStage) {
  const labels: Record<DealStage, string> = {
    novo: "Novo",
    em_contato: "Em contato",
    negociacao: "Proposta",
    ganho: "Ganho",
    perdido: "Perdido",
  };
  return labels[stage];
}

function isPlaceholder(deal: Deal) {
  return deal.details?.pipeline_list_placeholder === "true";
}

function uniqueLists(lists: string[]) {
  return lists.filter((list, index) => Boolean(list) && lists.indexOf(list) === index);
}

function dealLabels(deal: Deal) {
  return uniqueLists([deal.details?.trello_labels, deal.details?.labels].flatMap((raw) =>
    (raw ?? "")
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean)
  ));
}

function dealLinks(deal: Deal) {
  const links: { label: string; href: string }[] = [];
  if (deal.details?.trello_url) links.push({ label: "Trello", href: deal.details.trello_url });
  if (deal.details?.external_url) links.push({ label: "Link", href: deal.details.external_url });
  return links;
}

function dealPhotos(deal: Deal) {
  return parseStringArray(deal.details?.photo_urls);
}

function parseStringArray(value: string | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
    }
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function compareDeals(a: Deal, b: Deal) {
  const posA = Number.isFinite(a.position) ? a.position : Number.MAX_SAFE_INTEGER;
  const posB = Number.isFinite(b.position) ? b.position : Number.MAX_SAFE_INTEGER;
  if (posA !== posB) return posA - posB;
  return a.title.localeCompare(b.title, "pt-BR");
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function labelClass(label: string) {
  const classes = [
    "bg-success-50 text-success-700 dark:bg-[#062d1c] dark:text-[#9ff0c5]",
    "bg-warning-50 text-warning-700",
    "bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-200",
    "bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-200",
    "bg-danger-50 text-danger-700 dark:bg-[#3a0b08] dark:text-[#ffb4ac]",
    "bg-surface-2 text-ink-soft",
  ];
  let hash = 0;
  for (const char of label) hash = (hash + char.charCodeAt(0)) % classes.length;
  return classes[hash];
}

function formatPercent(value: number | null) {
  if (value === null) return "";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function trelloMeta(list: string) {
  return pipelineMetaFromList(list);
}
