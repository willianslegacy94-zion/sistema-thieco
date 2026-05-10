import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

function hoje() { return new Date().toISOString().slice(0, 10); }
function inicioMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function fimMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function gerarProjecao(entradasPorDia, inicio, fim) {
  const start = new Date(inicio + 'T00:00:00');
  const end   = new Date(fim   + 'T00:00:00');
  const hoje  = new Date(); hoje.setHours(0,0,0,0);

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
    const isPassado = d <= hoje;

    if (isPassado) {
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

export function useDashboard() {
  const { isAdmin, profissionalId } = useAuth();

  const [filtros, setFiltros] = useState({
    inicio: inicioMes(),
    fim:    fimMes(),
    unidade: '',
  });

  const [dados,   setDados]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro,    setErro]    = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const params = { inicio: filtros.inicio, fim: filtros.fim };
      if (filtros.unidade) params.unidade = filtros.unidade;

      if (isAdmin) {
        // Admin: dados completos
        const [fluxo, dre, comissoes] = await Promise.all([
          api.fluxoCaixa(params),
          api.dre(params),
          api.comissoes(params),
        ]);
        const projecao = gerarProjecao(fluxo.entradas_por_dia, filtros.inicio, filtros.fim);
        setDados({ fluxo, dre, comissoes, projecao });
      } else {
        // Barbeiro: apenas comissões (backend retorna ranking + seus dados)
        const comissoes = await api.comissoes(params);
        const myData = comissoes.comissoes?.find(
          (c) => parseInt(c.id) === profissionalId
        ) ?? null;
        setDados({ comissoes, myData, fluxo: null, dre: null, projecao: [] });
      }
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }, [filtros, isAdmin, profissionalId]);

  useEffect(() => { carregar(); }, [carregar]);

  return { dados, loading, erro, filtros, setFiltros, recarregar: carregar };
}
