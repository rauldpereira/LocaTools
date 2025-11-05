import React, { useState } from 'react';
import axios from 'axios';

interface IDiaStatus {
    data: string;
    status: 'ABERTO' | 'FECHADO';
    fonte: 'padrao' | 'excecao';
    descricao: string | null;
    tipo?: 'feriado' | 'parada' | 'extra' | 'outro';
}

interface ModalEditarDiaProps {
    diaInfo: IDiaStatus;
    onClose: () => void;
    onSave: () => void;
}

const formatarData = (dataString: string) => {
    const data = new Date(dataString + 'T00:00:00');
    return new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(data);
};

const ModalEditarDia: React.FC<ModalEditarDiaProps> = ({ diaInfo, onClose, onSave }) => {

    const [funcionamento, setFuncionamento] = useState<'padrao' | 0 | 1>(
        diaInfo.fonte === 'padrao' ? 'padrao' : (diaInfo.status === 'ABERTO' ? 1 : 0)
    );
    const [tipo, setTipo] = useState(diaInfo.fonte === 'excecao' ? diaInfo.tipo || 'outro' : 'outro');
    const [descricao, setDescricao] = useState(diaInfo.descricao || '');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSalvarExcecao = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            await axios.post('http://localhost:3001/api/calendario/excecao', {
                data: diaInfo.data,
                tipo: tipo,
                funcionamento: funcionamento,
                descricao: descricao
            });
            onSave();
            onClose();
        } catch (err) {
            console.error("Erro ao salvar exceção:", err);
            setError("Falha ao salvar. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVoltarAoPadrao = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            await axios.delete('http://localhost:3001/api/calendario/excecao', {
                data: { data: diaInfo.data }
            });
            onSave();
            onClose();
        } catch (err) {
            console.error("Erro ao deletar exceção:", err);
            setError("Falha ao reverter. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (funcionamento === 'padrao') {
            handleVoltarAoPadrao();
        } else {
            handleSalvarExcecao();
        }
    };

    const modalOverlayStyle: React.CSSProperties = {
        position: 'fixed', zIndex: 1000, top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
        justifyContent: 'center', alignItems: 'center'
    };

    const modalContentStyle: React.CSSProperties = {
        backgroundColor: 'var(--cor-fundo-modal)',
        color: 'var(--cor-texto-principal)',
        padding: '2rem',
        borderRadius: '8px',
        border: '1px solid var(--cor-borda)',
        width: '90%',
        maxWidth: '500px',
        position: 'relative'
    };

    const closeButtonStyle: React.CSSProperties = {
        position: 'absolute', top: '15px', right: '15px', cursor: 'pointer',
        background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--cor-texto-principal)'
    };

    return (
        <div style={modalOverlayStyle} onClick={onClose}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} style={closeButtonStyle}>&times;</button>

                <h3>Editar Dia: {formatarData(diaInfo.data)}</h3>
                <p>Status Padrão: <strong>{diaInfo.fonte === 'padrao' ? diaInfo.status : '(Sobrescrito)'}</strong></p>

                <form onSubmit={handleSubmit}>
                    <fieldset>
                        <legend>Definir Status para este dia:</legend>
                        <div>
                            <input
                                type="radio"
                                id="r_padrao"
                                name="status"
                                value="padrao"
                                checked={funcionamento === 'padrao'}
                                onChange={() => setFuncionamento('padrao')}
                            />
                            <label htmlFor="r_padrao">Voltar ao Padrão (Deixar sistema decidir)</label>
                        </div>
                        <div>
                            <input
                                type="radio"
                                id="r_fechado"
                                name="status"
                                value={0}
                                checked={funcionamento === 0}
                                onChange={() => setFuncionamento(0)}
                            />
                            <label htmlFor="r_fechado">Forçar Fechamento (Feriado, Parada)</label>
                        </div>
                        <div>
                            <input
                                type="radio"
                                id="r_aberto"
                                name="status"
                                value={1}
                                checked={funcionamento === 1}
                                onChange={() => setFuncionamento(1)}
                            />
                            <label htmlFor="r_aberto">Forçar Abertura (Dia Extra)</label>
                        </div>
                    </fieldset>
                    {funcionamento !== 'padrao' && (
                        <>
                            <div>
                                <label htmlFor="tipo">Tipo da Exceção:</label>
                                <select
                                    id="tipo"
                                    value={tipo}
                                    onChange={(e) => setTipo(e.target.value as 'feriado' | 'parada' | 'extra' | 'outro')}
                                >
                                    <option value="feriado">Feriado</option>
                                    <option value="parada">Parada Técnica</option>
                                    <option value="extra">Evento/Dia Extra</option>
                                    <option value="outro">Outro</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="descricao">Descrição (Opcional):</label>
                                <input
                                    type="text"
                                    id="descricao"
                                    value={descricao}
                                    onChange={(e) => setDescricao(e.target.value)}
                                    placeholder={tipo === 'feriado' ? 'Ex: Natal' : 'Ex: Manutenção'}
                                />
                            </div>
                        </>
                    )}

                    {error && <p style={{ color: 'red' }}>{error}</p>}

                    <button type="submit" disabled={isSubmitting} style={{ marginTop: '1rem' }}>
                        {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </form>

            </div>
        </div>
    );
};

export default ModalEditarDia;