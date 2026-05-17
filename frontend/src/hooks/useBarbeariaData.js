import useSWR, { useSWRConfig } from 'swr';
import { useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// ─── Validação de data ────────────────────────────────────────────────────────

export function isValidDate(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  if (parseInt(s, 10) < 2000) return false;
  const d = new Date(s + 'T00:00:00');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// ─── Configuração global do SWR ───────────────────────────────────────────────

const SWR_OPTS = {
  refreshInterval:    3_000,   // polling a cada 3s
  revalidateOnFocus:  true,    // revalida ao voltar para a aba
  keepPreviousData:   true,    // nunca mostra tela em branco em caso de erro
  shouldRetryOnError: true,
  errorRetryInterval: 5_000,
  dedupingInterval:   2_000,   // evita fetches duplicados em menos de 2s
};

// Chaves de cache que representam dados do dashboard / vendas
const CACHE_KEYS = ['fluxo-caixa', 'dre', 'comissoes', 'vendas', 'combos'];

// ─── Hook principal ───────────────────────────────────────────────────────────

/**
 * useBarbeariaData — gerencia fluxo-caixa, DRE e comissões com SWR.
 * Retorna dados stale enquanto revalida (nunca tela em branco).
 * As datas do filtro entram na chave de cache, garantindo que a
 * atualização automática respeite sempre o período selecionado.
 */
export function useBarbeariaData(filtros) {
  const { isAdmin } = useAuth();

  const inicio        = filtros?.inicio          ?? '';
  const fim           = filtros?.fim             ?? '';
  const unidade       = filtros?.unidade         ?? '';
  const profissionalId = filtros?.profissional_id ?? '';

  const datesOk = isValidDate(inicio) && isValidDate(fim);
  const params  = datesOk
    ? {
        inicio, fim,
        ...(unidade        ? { unidade }                        : {}),
        ...(profissionalId ? { profissional_id: profissionalId } : {}),
      }
    : null;

  // null desativa o fetch enquanto as datas são inválidas
  const keyFluxo     = isAdmin && params ? ['fluxo-caixa', inicio, fim, unidade, profissionalId] : null;
  const keyDre       = isAdmin && params ? ['dre',          inicio, fim, unidade, profissionalId] : null;
  const keyComissoes =             params ? ['comissoes',    inicio, fim, unidade, profissionalId] : null;

  const { data: fluxo,     isLoading: l1, error: e1 } = useSWR(
    keyFluxo,
    () => api.fluxoCaixa(params),
    SWR_OPTS,
  );

  const { data: dre, isLoading: l2 } = useSWR(
    keyDre,
    () => api.dre(params),
    SWR_OPTS,
  );

  const { data: comissoes, isLoading: l3 } = useSWR(
    keyComissoes,
    () => api.comissoes(params),
    SWR_OPTS,
  );

  return {
    fluxo,
    dre,
    comissoes,
    loading: (l1 || l2 || l3) && !fluxo && !comissoes, // loading só na primeira carga
    erro:    e1?.message ?? null,
  };
}

// ─── Invalidação global (Optimistic UI) ──────────────────────────────────────

/**
 * useInvalidarDashboard — aciona revalidação imediata de todos os caches
 * do dashboard. Chame após salvar uma venda ou registrar uso de combo.
 */
export function useInvalidarDashboard() {
  const { mutate } = useSWRConfig();
  return useCallback(
    () => mutate(key => Array.isArray(key) && CACHE_KEYS.includes(key[0])),
    [mutate],
  );
}
