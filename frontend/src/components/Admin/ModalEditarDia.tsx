import React, { useState } from 'react';
import axios from 'axios';
import { 
  X, 
  Calendar,
  AlertTriangle, 
  Save, 
  RefreshCcw, 
  Loader2,
} from 'lucide-react';

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
    const data = new Date(dataString + 'T12:00:00');
    return new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long'
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
            await axios.post(`${import.meta.env.VITE_API_URL}/api/calendario/excecao`, {
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
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/calendario/excecao`, {
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

    return (
        <div style={modalOverlayStyle} onClick={onClose}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                {/* HEADER */}
                <div style={modalHeaderStyle}>
                    <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", color: "#1e293b" }}>
                        <Calendar size={22} color="#2563eb" /> Ajustar Dia
                    </h3>
                    <button onClick={onClose} style={closeBtnStyle}><X size={24} /></button>
                </div>

                <div style={{ padding: "30px" }}>
                    <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", fontWeight: 800, marginBottom: "4px" }}>Data Selecionada</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", textTransform: "capitalize" }}>{formatarData(diaInfo.data)}</div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: "25px" }}>
                            <label style={labelStyle}>Status de Funcionamento</label>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <label style={radioContainerStyle(funcionamento === 'padrao')}>
                                    <input type="radio" name="status" checked={funcionamento === 'padrao'} onChange={() => setFuncionamento('padrao')} style={{ marginRight: "10px" }} />
                                    <span>Padrão do Sistema <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>(Auto)</span></span>
                                </label>
                                <label style={radioContainerStyle(funcionamento === 0)}>
                                    <input type="radio" name="status" checked={funcionamento === 0} onChange={() => setFuncionamento(0)} style={{ marginRight: "10px" }} />
                                    <span style={{ color: "#ef4444", fontWeight: 700 }}>Forçar Fechado <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>(Feriado/Parada)</span></span>
                                </label>
                                <label style={radioContainerStyle(funcionamento === 1)}>
                                    <input type="radio" name="status" checked={funcionamento === 1} onChange={() => setFuncionamento(1)} style={{ marginRight: "10px" }} />
                                    <span style={{ color: "#10b981", fontWeight: 700 }}>Forçar Aberto <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>(Dia Extra)</span></span>
                                </label>
                            </div>
                        </div>

                        {funcionamento !== 'padrao' && (
                            <div style={{ animation: "fadeIn 0.2s ease" }}>
                                <div style={{ marginBottom: "20px" }}>
                                    <label style={labelStyle}>Motivo da Exceção</label>
                                    <select 
                                        value={tipo} 
                                        onChange={(e) => setTipo(e.target.value as any)} 
                                        style={inputStyle}
                                    >
                                        <option value="feriado">Feriado Nacional/Local</option>
                                        <option value="parada">Parada Técnica/Manutenção</option>
                                        <option value="extra">Evento ou Atendimento Extra</option>
                                        <option value="outro">Outro Motivo</option>
                                    </select>
                                </div>
                                <div style={{ marginBottom: "20px" }}>
                                    <label style={labelStyle}>Descrição (Opcional)</label>
                                    <input
                                        type="text"
                                        value={descricao}
                                        onChange={(e) => setDescricao(e.target.value)}
                                        placeholder={tipo === 'feriado' ? 'Ex: Carnaval' : 'Ex: Manutenção Elétrica'}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div style={{ padding: "10px", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "8px", fontSize: "0.9rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                                <AlertTriangle size={16} /> {error}
                            </div>
                        )}

                        <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                            <button type="button" onClick={onClose} style={btnSecondaryStyle}>Cancelar</button>
                            <button type="submit" disabled={isSubmitting} style={btnPrimaryStyle}>
                                {isSubmitting ? <Loader2 size={18} className="spin" /> : (funcionamento === 'padrao' ? <RefreshCcw size={18} /> : <Save size={18} />)}
                                {isSubmitting ? 'Salvando...' : (funcionamento === 'padrao' ? 'Voltar ao Padrão' : 'Salvar Ajuste')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- ESTILOS ---
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', zIndex: 2000, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', animation: "fadeIn 0.2s ease" };
const modalContentStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: "hidden" };
const modalHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 30px", borderBottom: "1px solid #f1f5f9" };
const closeBtnStyle: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "5px" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.8rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.05em" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 15px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem", color: "#334155", outline: "none" };
const btnPrimaryStyle: React.CSSProperties = { flex: 2, padding: "14px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" };
const btnSecondaryStyle: React.CSSProperties = { flex: 1, padding: "14px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" };

const radioContainerStyle = (active: boolean): React.CSSProperties => ({
    display: "flex", 
    alignItems: "center", 
    padding: "12px 15px", 
    borderRadius: "10px", 
    border: `2px solid ${active ? "#2563eb" : "#f1f5f9"}`, 
    backgroundColor: active ? "#eff6ff" : "#fff", 
    cursor: "pointer",
    transition: "all 0.2s"
});

export default ModalEditarDia;