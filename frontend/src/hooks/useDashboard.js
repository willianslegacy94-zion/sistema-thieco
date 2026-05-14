import { useState, useMemo, useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { useAuth } from '../contexts/AuthContext';
import { useBarbeariaData, isValidDate } from './useBarbeariaData';

// ─── Helpers de data ──────────────────────────────────────────────────────────

function inicioMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function fimMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

// ─── Projeção de faturamento ──────────────────────────────────────────────────

function gerarProjecao(entradasPorDia, inicio, fim) {
  const start = new Date(inicio + 'T00:00:00');
  const end   = new Date(fim   + 'T00:00:00');
  const hoje  = new Date(); hoje.setHours(0, 0, 0, 0);

  const totalDias    = Math.round((end - start) / 86400000) + 1;
  const diasPassados = Math.min(Math.round((hoje - start) / 86400000) + 1, totalDias);

  const mapaReal = {};
  for (const e of entradasPorDia) mapaReal[e.data] = parseFloat(e.total_bruto ?? 0);

  const dias = [];
  let somaReal = 0;

  for (let i = 0; i < totalDias; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const iso   = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    if (d <= hoje) {
      somaReal += mapaReal[iso] ?? 0;
      dias.push({ label, real: somaReal, projecao: null });
    } else {
      dias.push({ label, real: null, projecao: null });
    }
  }

  if (diasPassados > 0 && somaReal > 0) {
    const media = somaReal / diasPassados;
    let proj = somaReal;
    for (let i = diasPassados; i < totalDias; i++) {
      proj += media;
      dias[i].projecao = parseFloat(proj.toFixed(2));
    }
    if (diasPassados > 0) dias[diasPassados - 1].projecao = somaReal;
  }

  return dias;
}

// ─── Hook público (interface idêntica à versão anterior) ──────────────────────

export function useDashboard() {
  const { isAdmin, profissionalId } = useAuth();
  const { mutate } = useSWRConfig();

  const [filtros, setFiltros] = useState({
    inicio:  inicioMes(),
    fim:     fimMes(),
    unidade: '',
  });

  // Busca dados via SWR (polling 3s + revalidateOnFocus + keepPreviousData)
  const { fluxo, dre, comissoes, loading, erro } = useBarbeariaData(filtros);

  // Monta o objeto `dados` com a mesma forma que o Dashboard.jsx espera
  const dados = useMemo(() => {
    if (!comissoes) return null;

    if (isAdmin) {
      const projecao = fluxo
        ? gerarProjecao(fluxo.entradas_por_dia, filtros.inicio, filtros.fim)
        : [];
      return { fluxo, dre, comissoes, projecao };
    }

    const myData = comissoes.comissoes?.find(
      (c) => parseInt(c.id) === profissionalId,
    ) ?? null;
    return { comissoes, myData, fluxo: null, dre: null, projecao: [] };
  }, [fluxo, dre, comissoes, isAdmin, profissionalId, filtros.inicio, filtros.fim]);

  // Botão "Atualizar" da FilterBar aciona revalidação imediata
  const recarregar = useCallback(() => {
    mutate(key => Array.isArray(key) && ['fluxo-caixa', 'dre', 'comissoes'].includes(key[0]));
  }, [mutate]);

  return { dados, loading, erro, filtros, setFiltros, recarregar };
}
