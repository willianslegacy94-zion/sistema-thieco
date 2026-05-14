import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

function inicioMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function fimMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}
function isValidDate(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  if (parseInt(s, 10) < 2000) return false;
  const d = new Date(s + 'T00:00:00');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function gerarProjecao(vendasPorDia, inicio, fim) {
  const start = new Date(inicio + 'T00:00:00');
  const end   = new Date(fim   + 'T00:00:00');
  const hoje  = new Date(); hoje.setHours(0, 0, 0, 0);

  const totalDias    = Math.round((end - start) / 86400000) + 1;
  const diasPassados = Math.min(Math.round((hoje - start) / 86400000) + 1, totalDias);

  const mapaReal = {};
  for (const e of vendasPorDia) mapaReal[e.data] = parseFloat(e.total ?? 0);

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
    dias[diasPassados - 1].projecao = somaReal;
  }

  return dias;
}

export function useInteligencia() {
  const [filtros, setFiltros] = useState({
    inicio:  inicioMes(),
    fim:     fimMes(),
    unidade: '',
  });

  const [dados,   setDados]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro,    setErro]    = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const inicio = isValidDate(filtros.inicio) ? filtros.inicio : inicioMes();
      const fim    = isValidDate(filtros.fim)    ? filtros.fim    : fimMes();
      const params = { inicio, fim };
      if (filtros.unidade) params.unidade = filtros.unidade;

      const [intel, fluxo] = await Promise.all([
        api.inteligencia(params),
        api.fluxoCaixa(params),
      ]);
      const projecao = gerarProjecao(intel.vendas_por_dia ?? [], inicio, fim);
      setDados({ ...intel, projecao, entradas_por_dia: fluxo.entradas_por_dia, saidas_por_dia: fluxo.saidas_por_dia });
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    if (isValidDate(filtros.inicio) && isValidDate(filtros.fim)) carregar();
  }, [carregar]); // eslint-disable-line react-hooks/exhaustive-deps

  return { dados, loading, erro, filtros, setFiltros, recarregar: carregar };
}
