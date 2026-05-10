import { useState, useCallback } from 'react';
import { api } from '../lib/api';

// JWT é enviado automaticamente pelo api.js — não precisa de pin
export function useGestao() {
  const [feedbacks,     setFeedbacks]     = useState([]);
  const [pdcaLista,     setPdcaLista]     = useState([]);
  const [sugestoes,     setSugestoes]     = useState([]);
  const [timeline,      setTimeline]      = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [loading,       setLoading]       = useState({});
  const [erros,         setErros]         = useState({});

  function setL(k, v) { setLoading((p) => ({ ...p, [k]: v })); }
  function setE(k, v) { setErros((p)   => ({ ...p, [k]: v })); }

  const carregarProfissionais = useCallback(async () => {
    try {
      const data = await api.profissionais();
      setProfissionais(data.filter((p) => p.nome.toLowerCase() !== 'thieco leandro'));
    } catch (e) { setE('profissionais', e.message); }
  }, []);

  // ── Feedbacks ─────────────────────────────────────────────────────────────
  const carregarFeedbacks = useCallback(async (params = {}) => {
    setL('feedbacks', true); setE('feedbacks', null);
    try { setFeedbacks(await api.gestao.feedbacks(params)); }
    catch (e) { setE('feedbacks', e.message); }
    finally { setL('feedbacks', false); }
  }, []);

  const criarFeedback = useCallback(async (body) => {
    setL('feedbackSave', true);
    try {
      const novo = await api.gestao.criarFeedback(body);
      setFeedbacks((p) => [novo, ...p]);
      return true;
    } catch (e) { setE('feedbackSave', e.message); return false; }
    finally { setL('feedbackSave', false); }
  }, []);

  const deletarFeedback = useCallback(async (id) => {
    try {
      await api.gestao.deletarFeedback(id);
      setFeedbacks((p) => p.filter((f) => f.id !== id));
    } catch (e) { setE('feedbacks', e.message); }
  }, []);

  // ── PDCA ──────────────────────────────────────────────────────────────────
  const carregarPdca = useCallback(async (params = {}) => {
    setL('pdca', true); setE('pdca', null);
    try { setPdcaLista(await api.gestao.pdca(params)); }
    catch (e) { setE('pdca', e.message); }
    finally { setL('pdca', false); }
  }, []);

  const criarPdca = useCallback(async (body) => {
    setL('pdcaSave', true);
    try {
      const novo = await api.gestao.criarPdca(body);
      setPdcaLista((p) => [novo, ...p]);
      return true;
    } catch (e) { setE('pdcaSave', e.message); return false; }
    finally { setL('pdcaSave', false); }
  }, []);

  const atualizarPdca = useCallback(async (id, body) => {
    try {
      const atualizado = await api.gestao.atualizarPdca(id, body);
      setPdcaLista((p) => p.map((x) => (x.id === id ? atualizado : x)));
    } catch (e) { setE('pdca', e.message); }
  }, []);

  const deletarPdca = useCallback(async (id) => {
    try {
      await api.gestao.deletarPdca(id);
      setPdcaLista((p) => p.filter((x) => x.id !== id));
    } catch (e) { setE('pdca', e.message); }
  }, []);

  // ── Sugestões ─────────────────────────────────────────────────────────────
  const carregarSugestoes = useCallback(async (params = {}) => {
    setL('sugestoes', true); setE('sugestoes', null);
    try { setSugestoes(await api.gestao.sugestoes(params)); }
    catch (e) { setE('sugestoes', e.message); }
    finally { setL('sugestoes', false); }
  }, []);

  const criarSugestao = useCallback(async (body) => {
    setL('sugestaoSave', true);
    try {
      const nova = await api.gestao.criarSugestao(body);
      setSugestoes((p) => [nova, ...p]);
      return true;
    } catch (e) { setE('sugestaoSave', e.message); return false; }
    finally { setL('sugestaoSave', false); }
  }, []);

  const atualizarSugestao = useCallback(async (id, body) => {
    try {
      const atualizada = await api.gestao.atualizarSugestao(id, body);
      setSugestoes((p) => p.map((x) => (x.id === id ? atualizada : x)));
    } catch (e) { setE('sugestoes', e.message); }
  }, []);

  // ── Timeline ──────────────────────────────────────────────────────────────
  const carregarTimeline = useCallback(async (profissionalId) => {
    setL('timeline', true); setE('timeline', null);
    try { setTimeline(await api.gestao.timeline(profissionalId)); }
    catch (e) { setE('timeline', e.message); }
    finally { setL('timeline', false); }
  }, []);

  return {
    profissionais, carregarProfissionais,
    feedbacks,  carregarFeedbacks,  criarFeedback,  deletarFeedback,
    pdcaLista,  carregarPdca,       criarPdca,      atualizarPdca,  deletarPdca,
    sugestoes,  carregarSugestoes,  criarSugestao,  atualizarSugestao,
    timeline,   carregarTimeline,
    loading, erros,
  };
}
