import { useState, useRef } from 'react';
import { Upload, FileJson, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';
import { api } from '../lib/api';

const ESTADO_INICIAL = { fase: 'idle', mensagem: '', detalhe: '' };

export default function ImportButton({ onSucesso }) {
  const [estado, setEstado] = useState(ESTADO_INICIAL);
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef(null);

  async function processar(arquivo) {
    if (!arquivo) return;
    if (!arquivo.name.endsWith('.json')) {
      setEstado({ fase: 'erro', mensagem: 'Arquivo inválido.', detalhe: 'Exporte como JSON via Excel/Planilha.' });
      return;
    }

    setEstado({ fase: 'lendo', mensagem: 'Lendo arquivo...', detalhe: '' });

    try {
      const texto = await arquivo.text();
      const payload = JSON.parse(texto);

      setEstado({ fase: 'enviando', mensagem: 'Importando dados...', detalhe: '' });
      const resultado = await api.importar(payload);

      setEstado({
        fase: 'sucesso',
        mensagem: 'Importação concluída!',
        detalhe: `${resultado.resumo.vendas_importadas} vendas e ${resultado.resumo.gastos_importados} gastos importados.`,
      });

      onSucesso?.();

      // Reset após 4s
      setTimeout(() => setEstado(ESTADO_INICIAL), 4000);
    } catch (err) {
      setEstado({
        fase: 'erro',
        mensagem: 'Falha na importação.',
        detalhe: err.message,
      });
    }
  }

  function onArquivoSelecionado(e) {
    processar(e.target.files[0]);
    e.target.value = '';
  }

  function onDrop(e) {
    e.preventDefault();
    setArrastando(false);
    processar(e.dataTransfer.files[0]);
  }

  const ocupado = estado.fase === 'lendo' || estado.fase === 'enviando';

  return (
    <div className="card-premium p-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Upload size={15} className="text-gold" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gold-muted">
          Importar Histórico
        </h2>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-gold-dark/30 to-transparent mb-5" />

      {/* Área de drop */}
      <div
        className={`
          relative rounded-xl border-2 border-dashed p-8 text-center
          transition-all duration-300 cursor-pointer
          ${arrastando
            ? 'border-gold bg-gold/10 shadow-gold'
            : 'border-surface-border hover:border-gold-muted hover:bg-surface-hover'
          }
          ${ocupado ? 'pointer-events-none opacity-60' : ''}
        `}
        onClick={() => !ocupado && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={onArquivoSelecionado}
        />

        {/* Ícone de estado */}
        <div className="flex justify-center mb-3">
          {estado.fase === 'idle' && (
            <FileJson size={36} className="text-gold-muted" strokeWidth={1} />
          )}
          {(estado.fase === 'lendo' || estado.fase === 'enviando') && (
            <Loader2 size={36} className="text-gold animate-spin" strokeWidth={1.5} />
          )}
          {estado.fase === 'sucesso' && (
            <CheckCircle size={36} className="text-emerald-400" strokeWidth={1.5} />
          )}
          {estado.fase === 'erro' && (
            <XCircle size={36} className="text-red-400" strokeWidth={1.5} />
          )}
        </div>

        {/* Texto */}
        {estado.fase === 'idle' ? (
          <>
            <p className="text-gold-light/80 text-sm font-medium mb-1">
              Arraste o arquivo JSON ou clique para selecionar
            </p>
            <p className="text-gold-muted text-xs">
              Formato: JSON exportado do Excel via script
            </p>
          </>
        ) : (
          <>
            <p className={`text-sm font-semibold mb-1 ${
              estado.fase === 'sucesso' ? 'text-emerald-400' :
              estado.fase === 'erro'   ? 'text-red-400' : 'text-gold'
            }`}>
              {estado.mensagem}
            </p>
            {estado.detalhe && (
              <p className="text-xs text-gold-light/50">{estado.detalhe}</p>
            )}
          </>
        )}
      </div>

      {/* Dica formato */}
      <div className="mt-4 flex gap-2 p-3 rounded-lg bg-surface-hover border border-surface-border">
        <Info size={13} className="text-gold-muted shrink-0 mt-0.5" />
        <div className="text-xs text-gold-light/50 space-y-0.5">
          <p>O JSON deve conter as chaves <code className="text-gold-muted">vendas</code> e <code className="text-gold-muted">gastos</code>.</p>
          <p>Datas aceitas em <code className="text-gold-muted">DD/MM/AAAA</code> ou <code className="text-gold-muted">AAAA-MM-DD</code>.</p>
          <p>Unidades: <code className="text-gold-muted">tambore</code> ou <code className="text-gold-muted">mutinga</code>.</p>
        </div>
      </div>

      {/* Botão alternativo */}
      <button
        className="btn-gold w-full mt-4 justify-center"
        onClick={() => !ocupado && inputRef.current?.click()}
        disabled={ocupado}
      >
        {ocupado ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {ocupado ? 'Aguarde...' : 'Selecionar Arquivo JSON'}
      </button>
    </div>
  );
}
