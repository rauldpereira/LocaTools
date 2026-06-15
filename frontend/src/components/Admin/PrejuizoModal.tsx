import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import CustomDropdown from '../CustomDropdown';

interface ItemReserva {
    id: number;
    Unidade: {
        id: number;
        Equipamento: {
            nome: string;
        }
    }
}

interface PrejuizoModalProps {
    item: ItemReserva;
    onClose: () => void;
    onSuccess: () => void;
}

const PrejuizoModal: React.FC<PrejuizoModalProps> = ({ item, onClose, onSuccess }) => {
  const toast = useToast();
    const { token } = useAuth();

    const [tipo, setTipo] = useState('ROUBO');
    const [valor, setValor] = useState('');
    const [observacao, setObservacao] = useState('');
    const [loading, setLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!valor) return toast.error("Digite o valor do prejuízo.");
        setConfirmModal(true);
    };

    const confirmSubmit = async () => {
        setConfirmModal(false);
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await axios.post(`${import.meta.env.VITE_API_URL}/api/prejuizos`, {
                item_reserva_id: item.id,
                tipo,
                valor_prejuizo: parseFloat(valor),
                observacao
            }, config);

            toast.success("Prejuízo registrado com sucesso.");
            onSuccess();
        } catch (error: any) {
            console.error("Erro ao registrar:", error);
            toast.error("Erro: " + (error.response?.data?.error || "Falha desconhecida."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ backgroundColor: '#fef2f2', padding: '10px', borderRadius: '12px' }}>
                            <ShieldAlert size={28} color="#ef4444" />
                        </div>
                        <div>
                            <h2 style={{ color: '#1e293b', margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Registrar Ocorrência</h2>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>Avarias, Extravios e Inadimplências</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', borderRadius: '50%' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '5px' }}>Equipamento Afetado</span>
                    <strong style={{ fontSize: '1.1rem', color: '#334155' }}>{item.Unidade.Equipamento.nome} <span style={{ color: '#94a3b8' }}>(ID: {item.Unidade.id})</span></strong>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontWeight: '700', color: '#475569', marginBottom: '8px', fontSize: '0.9rem' }}>Tipo da Ocorrência:</label>
                        <CustomDropdown
                            className="prejuizo-dropdown-full"
                            value={tipo}
                            onChange={(val) => setTipo(val as string)}
                            options={[
                                { value: "ROUBO", label: "Não Devolvido / Extraviado (Baixa de Estoque)" },
                                { value: "AVARIA", label: "Perda Total / Dano Irreversível" },
                                { value: "CALOTE", label: "Inadimplência (Item Devolvido, mas não pago)" },
                                { value: "OUTRO", label: "Outro Motivo" }
                            ]}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontWeight: '700', color: '#475569', marginBottom: '8px', fontSize: '0.9rem' }}>Valor Estimado do Prejuízo (R$):</label>
                        <input
                            type="number"
                            step="0.01"
                            value={valor}
                            onChange={(e) => setValor(e.target.value)}
                            placeholder="Ex: 2500.00"
                            style={inputStyle}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontWeight: '700', color: '#475569', marginBottom: '8px', fontSize: '0.9rem' }}>Observação / Justificativa detalhada:</label>
                        <textarea
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                            placeholder="Descreva o que aconteceu com o equipamento..."
                            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '2rem' }}>
                        <button type="button" onClick={onClose} style={{ padding: '12px 20px', backgroundColor: '#fff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{ padding: '12px 24px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)', transition: '0.2s' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <ShieldAlert size={18} />
                            {loading ? 'Processando...' : 'Confirmar Prejuízo'}
                        </button>
                    </div>
                </form>
            </div>

            {confirmModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3100, animation: 'fadeIn 0.2s ease' }} onClick={() => setConfirmModal(false)}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '90%', maxWidth: '400px', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>
                            <AlertTriangle size={24} color="#dc3545" />
                            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Atenção!</h3>
                        </div>
                        <p style={{ margin: 0, color: '#475569', fontSize: '1rem', lineHeight: '1.5' }}>
                            Tem certeza? Isso pode baixar o estoque e finalizar o item.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                            <button onClick={() => setConfirmModal(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                                Cancelar
                            </button>
                            <button onClick={confirmSubmit} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#dc3545', color: '#fff', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .prejuizo-dropdown-full {
                    width: 100% !important;
                    max-width: 100% !important;
                }
            `}</style>
        </div>
    );
};

const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 1100,
    animation: 'fadeIn 0.2s ease'
};

const modalContentStyle: React.CSSProperties = {
    backgroundColor: 'white', padding: '30px', borderRadius: '16px',
    width: '90%', maxWidth: '500px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 15px', borderRadius: '10px',
    border: '1px solid #cbd5e1', fontSize: '1rem',
    outline: 'none', color: '#1e293b', backgroundColor: '#fff',
    boxSizing: 'border-box'
};

export default PrejuizoModal;