import { useToast } from '../context/ToastContext';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { 
  Settings,
  Heart,
  Truck,
  ShieldAlert,
  CreditCard,
  FileText,
  Save,
  Loader2,
  CheckCircle,
  HelpCircle,
  X,
  MapPin,
  Phone,
  Mail,
  Hash,
  Clock,
  Info
} from 'lucide-react';

const ENDERECO_PADRAO = 'Av. Nossa Senhora do Bom Sucesso, 1000, Pindamonhangaba - SP';

const AdminStoreConfig: React.FC = () => {
  const toast = useToast();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showManual, setShowManual] = useState(false);

  const [config, setConfig] = useState({
    fidelidade_num_pedidos: 10,
    fidelidade_desconto_pct: 10.00,
    fidelidade_ativo: true,
    horario_limite_hoje: '12:00',
    cnpj: '00.000.000/0001-00',
    taxa_reagendamento: 0.00,
    sinal_porcentagem: 50.00,
    telefone_contato: '12 98837-6000',
    email_contato: 'exemplo@exemplo.com',
    frete: {
      preco_km: 0,
      taxa_fixa: 0,
      endereco_origem: '',
      raio_maximo_km: 50
    }
  });

  const [address, setAddress] = useState({
    cep: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: ''
  });

  const backendUrl = `${import.meta.env.VITE_API_URL}/api/config`;

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await axios.get(backendUrl);
        if (data) {
          setConfig({
            fidelidade_num_pedidos: data.fidelidade_num_pedidos ?? 10,
            fidelidade_desconto_pct: parseFloat(data.fidelidade_desconto_pct || 0),
            fidelidade_ativo: data.fidelidade_ativo ?? true,
            horario_limite_hoje: data.horario_limite_hoje || '12:00',
            cnpj: data.cnpj || '00.000.000/0001-00',
            taxa_reagendamento: Number(data.taxa_reagendamento || 0),
            sinal_porcentagem: Number(data.sinal_porcentagem ?? 50.00),
            telefone_contato: data.telefone_contato || '12 98837-6000',
            email_contato: data.email_contato || 'exemplo@exemplo.com',
            frete: {
              preco_km: Number(data.frete?.preco_km || 0),
              taxa_fixa: Number(data.frete?.taxa_fixa || 0),
              endereco_origem: data.frete?.endereco_origem || '',
              raio_maximo_km: Number(data.frete?.raio_maximo_km || 50)
            }
          });

          if (data.frete?.endereco_origem && data.frete?.endereco_origem !== ENDERECO_PADRAO) {
            tentaPreencherCampos(data.frete.endereco_origem);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar configurações:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [backendUrl]);

  const tentaPreencherCampos = (enderecoCompleto: string) => {
    try {
      if (!enderecoCompleto) return;
      const partes = enderecoCompleto.split(',').map(p => p.trim());
      const rua = partes[0] || '';
      const numero = partes[1] || '';
      const bairro = partes[2] || '';
      let cidade = '';
      let uf = '';
      const parteCidadeUf = partes.find(p => p.includes(' - '));
      if (parteCidadeUf) {
        const divisao = parteCidadeUf.split(' - ');
        cidade = divisao[0].trim();
        uf = divisao[1].trim();
      }
      let cep = '';
      const ultimaParte = partes[partes.length - 1];
      const numerosCep = ultimaParte.replace(/\D/g, '');
      if (numerosCep.length === 8) {
        cep = numerosCep.replace(/^(\d{5})(\d{3})/, "$1-$2");
      }
      setAddress({ rua, numero, bairro, cidade, uf, cep });
    } catch (error) {
      console.error('Erro ao preencher campos do endereço:', error);
    }
  };

  const buscarCepNoApi = async (cepParaBuscar: string) => {
    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cepParaBuscar}/json/`);
      if (response.data.erro) return;
      setAddress(prev => ({
        ...prev,
        rua: response.data.logradouro,
        bairro: response.data.bairro,
        cidade: response.data.localidade,
        uf: response.data.uf,
        cep: cepParaBuscar
      }));
    } catch (error) {
      console.error('Erro ViaCEP:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      let enderecoFinal = config.frete.endereco_origem;
      if (address.rua && address.numero) {
        enderecoFinal = `${address.rua}, ${address.numero}, ${address.bairro}, ${address.cidade} - ${address.uf}`;
        if (address.cep) enderecoFinal += `, ${address.cep}`;
      }

      const payload = {
        ...config,
        frete: {
          ...config.frete,
          endereco_origem: enderecoFinal || ENDERECO_PADRAO
        }
      };

      const authConfig = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(backendUrl, payload, authConfig);

      setSuccessMsg("Configurações atualizadas com sucesso!");
      setTimeout(() => setSuccessMsg(''), 4000);

      if (enderecoFinal && enderecoFinal !== ENDERECO_PADRAO) {
        setConfig(prev => ({ ...prev, frete: { ...prev.frete, endereco_origem: enderecoFinal } }));
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar as configurações.");
    } finally {
      setSaving(false);
    }
  };

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18);
  };

  if (loading) return <div style={{ textAlign: "center", padding: "100px", color: "#64748b" }}>Carregando configurações...</div>;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", animation: "fadeIn 0.3s ease", paddingBottom: "50px" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <div>
          <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.8rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "12px" }}>
            <Settings size={32} color="#2563eb" /> Configurações do Sistema
          </h2>
          <p style={{ color: "#64748b", marginTop: "5px" }}>Gerencie regras de negócio, logística e dados institucionais.</p>
        </div>

        <button
          onClick={() => setShowManual(true)}
          title="Ajuda"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "45px", height: "45px", borderRadius: "50%", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#64748b", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.color = "#2563eb"; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.color = "#64748b"; }}
        >
          <HelpCircle size={24} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px" }}>

        {/* PROGRAMA DE FIDELIDADE */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <Heart size={20} color="#2563eb" />
            <h3 style={cardTitleStyle}>Fidelidade</h3>
          </div>
          <p style={cardDescStyle}>Regras de desconto para clientes recorrentes.</p>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px', padding: "12px 15px", borderRadius: "10px", backgroundColor: config.fidelidade_ativo ? "#eff6ff" : "#f8fafc", border: `1px solid ${config.fidelidade_ativo ? "#bfdbfe" : "#e2e8f0"}`, transition: "0.2s" }}>
              <input
                type="checkbox"
                checked={config.fidelidade_ativo}
                onChange={(e) => setConfig({ ...config, fidelidade_ativo: e.target.checked })}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <span style={{ fontWeight: "700", color: config.fidelidade_ativo ? "#1e40af" : "#64748b" }}>Programa Ativo</span>
            </label>
          </div>

          <div style={{ opacity: config.fidelidade_ativo ? 1 : 0.5, pointerEvents: config.fidelidade_ativo ? "auto" : "none" }}>
            <div style={{ marginBottom: "15px" }}>
              <label style={labelStyle}>Pedidos p/ Desconto</label>
              <input
                type="number"
                value={config.fidelidade_num_pedidos}
                onChange={(e) => setConfig({ ...config, fidelidade_num_pedidos: parseInt(e.target.value) || 0 })}
                style={inputStyle}
                min="1"
              />
            </div>
            <div>
              <label style={labelStyle}>Valor do Desconto (%)</label>
              <input
                type="number"
                step="0.1"
                value={config.fidelidade_desconto_pct}
                onChange={(e) => setConfig({ ...config, fidelidade_desconto_pct: parseFloat(e.target.value) || 0 })}
                style={inputStyle}
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>

        {/* REGRAS DE NEGÓCIO */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <ShieldAlert size={20} color="#2563eb" />
            <h3 style={cardTitleStyle}>Travas e Prazos</h3>
          </div>
          <p style={cardDescStyle}>Limites operacionais para evitar erros.</p>

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Horário Limite (Locação Hoje)</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Clock size={18} color="#64748b" />
              <input
                type="time"
                value={config.horario_limite_hoje}
                onChange={(e) => setConfig({ ...config, horario_limite_hoje: e.target.value })}
                style={inputStyle}
              />
            </div>
            <small style={helpTextStyle}>Após esse horário, o site bloqueia locações para o mesmo dia.</small>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={labelStyle}>Sinal Mínimo (%)</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <CreditCard size={18} color="#64748b" />
              <input
                type="number"
                value={config.sinal_porcentagem}
                onChange={(e) => setConfig({ ...config, sinal_porcentagem: parseFloat(e.target.value) || 0 })}
                style={inputStyle}
                min="0"
                max="100"
              />
            </div>
            <small style={helpTextStyle}>Valor obrigatório para confirmar a reserva.</small>
          </div>

          <div>
            <label style={labelStyle}>Taxa de Reagendamento (R$)</label>
            <input
              type="number"
              step="0.01"
              value={config.taxa_reagendamento}
              onChange={(e) => setConfig({ ...config, taxa_reagendamento: parseFloat(e.target.value) || 0 })}
              style={inputStyle}
              min="0"
            />
          </div>
        </div>

        {/* LOGÍSTICA E FRETE */}
        <div style={{ ...cardStyle, gridColumn: "span 2" }}>
          <div style={cardHeaderStyle}>
            <Truck size={20} color="#2563eb" />
            <h3 style={cardTitleStyle}>Logística e Frete</h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
            <div>
              <h4 style={subTitleStyle}><MapPin size={16} /> Endereço de Saída</h4>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "10px", marginBottom: "10px" }}>
                <input type="text" placeholder="CEP" maxLength={9} value={address.cep} onChange={e => setAddress({ ...address, cep: e.target.value })} onBlur={e => { const l = e.target.value.replace(/\D/g, ''); if (l.length === 8) buscarCepNoApi(l); }} style={inputStyle} />
                <input type="text" placeholder="Rua" value={address.rua} onChange={e => setAddress({ ...address, rua: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px", gap: "10px", marginBottom: "10px" }}>
                <input type="text" placeholder="Nº" value={address.numero} onChange={e => setAddress({ ...address, numero: e.target.value })} style={inputStyle} />
                <input type="text" placeholder="Bairro" value={address.bairro} onChange={e => setAddress({ ...address, bairro: e.target.value })} style={inputStyle} />
                <input type="text" placeholder="UF" maxLength={2} value={address.uf} onChange={e => setAddress({ ...address, uf: e.target.value })} style={inputStyle} />
              </div>
              <input type="text" placeholder="Cidade" value={address.cidade} onChange={e => setAddress({ ...address, cidade: e.target.value })} style={{ ...inputStyle, marginBottom: "10px" }} />
            </div>

            <div>
              <h4 style={subTitleStyle}><Hash size={16} /> Taxas de Entrega</h4>
              <div style={{ marginBottom: "15px" }}>
                <label style={labelStyle}>Preço por KM (R$)</label>
                <input type="number" step="0.01" value={config.frete.preco_km} onChange={e => setConfig({ ...config, frete: { ...config.frete, preco_km: parseFloat(e.target.value) || 0 } })} style={inputStyle} />
              </div>
              <div style={{ marginBottom: "15px" }}>
                <label style={labelStyle}>Taxa Fixa de Saída (R$)</label>
                <input type="number" step="0.01" value={config.frete.taxa_fixa} onChange={e => setConfig({ ...config, frete: { ...config.frete, taxa_fixa: parseFloat(e.target.value) || 0 } })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Raio Máximo (KM)</label>
                <input type="number" value={config.frete.raio_maximo_km} onChange={e => setConfig({ ...config, frete: { ...config.frete, raio_maximo_km: parseInt(e.target.value) || 0 } })} style={inputStyle} />
              </div>
            </div>
          </div>
        </div>

        {/* DADOS INSTITUCIONAIS */}
        <div style={{ ...cardStyle, gridColumn: "span 2" }}>
          <div style={cardHeaderStyle}>
            <FileText size={20} color="#2563eb" />
            <h3 style={cardTitleStyle}>Dados Institucionais (PDFs e Contratos)</h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
            <div>
              <label style={labelStyle}>CNPJ</label>
              <input type="text" value={config.cnpj} onChange={e => setConfig({ ...config, cnpj: formatCNPJ(e.target.value) })} style={inputStyle} placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <label style={labelStyle}>Telefone</label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Phone size={16} color="#64748b" />
                <input type="text" value={config.telefone_contato} onChange={e => setConfig({ ...config, telefone_contato: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>E-mail</label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Mail size={16} color="#64748b" />
                <input type="email" value={config.email_contato} onChange={e => setConfig({ ...config, email_contato: e.target.value })} style={inputStyle} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER SALVAR */}
      <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        {successMsg ? (
          <div style={{ color: "#10b981", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", animation: "fadeIn 0.3s ease" }}>
            <CheckCircle size={18} /> {successMsg}
          </div>
        ) : (
          <div style={{ color: "#64748b", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <Info size={16} /> Lembre-se de salvar para aplicar as mudanças.
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "flex", alignItems: "center", gap: "10px", padding: "12px 30px",
            backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "10px",
            fontWeight: "800", cursor: saving ? "not-allowed" : "pointer", fontSize: "1rem",
            boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.3)", transition: "0.2s"
          }}
          onMouseOver={e => !saving && (e.currentTarget.style.backgroundColor = "#1d4ed8")}
          onMouseOut={e => !saving && (e.currentTarget.style.backgroundColor = "#2563eb")}
        >
          {saving ? <Loader2 size={20} className="spin" /> : <Save size={20} />}
          {saving ? "Salvando..." : "Salvar Configurações"}
        </button>
      </div>

      {/* MODAL MANUAL */}
      {showManual && (
        <div style={manualOverlayStyle} onClick={() => setShowManual(false)}>
          <div style={{ ...manualContentStyle, maxWidth: '650px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={manualHeaderStyle}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", color: "#1e293b" }}>
                <HelpCircle size={22} color="#2563eb" /> Manual do Usuário: Configurações do Sistema
              </h3>
              <button onClick={() => setShowManual(false)} style={manualCloseBtnStyle}><X size={22} /></button>
            </div>

            <div style={{ padding: "30px", overflowY: "auto", flexGrow: 1, maxHeight: "70vh" }}>
              <div style={{ color: "#475569", lineHeight: "1.6" }}>
                <p style={{ marginBottom: "25px", fontSize: "1rem" }}>Gerencie as regras de negócio, logística e dados institucionais da loja.</p>
                
                <div style={manualStepStyle}>
                  <div style={stepNumStyle}>1</div>
                  <div>
                    <strong>Programa de Fidelidade:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Ative para premiar clientes recorrentes. Defina quantos pedidos finalizados são necessários para liberar o desconto automático na próxima locação.</p>
                  </div>
                </div>

                <div style={manualStepStyle}>
                  <div style={stepNumStyle}>2</div>
                  <div>
                    <strong>Travas e Prazos:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>O <strong>Horário Limite</strong> impede reservas de última hora para o mesmo dia. O <strong>Sinal Mínimo</strong> define o valor obrigatório para que a reserva seja confirmada pelo sistema.</p>
                  </div>
                </div>

                <div style={manualStepStyle}>
                  <div style={stepNumStyle}>3</div>
                  <div>
                    <strong>Logística e Frete:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>O frete é calculado por KM a partir do endereço cadastrado. A <strong>Taxa Fixa</strong> é somada ao valor da distância, e o <strong>Raio Máximo</strong> limita a área de atendimento no site.</p>
                  </div>
                </div>

                <div style={manualStepStyle}>
                  <div style={stepNumStyle}>4</div>
                  <div>
                    <strong>Dados Institucionais:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Mantenha o CNPJ e contatos sempre atualizados. Essas informações são inseridas automaticamente em todos os contratos e termos gerados em PDF.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

// --- ESTILOS ---
const cardStyle: React.CSSProperties = { backgroundColor: "#fff", padding: "25px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" };
const cardHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" };
const cardTitleStyle: React.CSSProperties = { margin: 0, color: "#1e293b", fontSize: "1.1rem", fontWeight: "800" };
const cardDescStyle: React.CSSProperties = { color: "#64748b", fontSize: "0.85rem", marginBottom: "20px" };
const subTitleStyle: React.CSSProperties = { fontSize: "0.9rem", fontWeight: "800", color: "#475569", textTransform: "uppercase", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.8rem", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.02em" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem", color: "#334155", outline: "none", transition: "0.2s" };
const helpTextStyle: React.CSSProperties = { display: "block", marginTop: "5px", color: "#94a3b8", fontSize: "0.75rem", lineHeight: "1.3" };

const manualOverlayStyle: React.CSSProperties = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, animation: "fadeIn 0.2s ease" };
const manualContentStyle: React.CSSProperties = { backgroundColor: "#fff", borderRadius: "16px", width: "90%", maxWidth: "600px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden", display: "flex", flexDirection: "column" };
const manualHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 30px", borderBottom: "1px solid #f1f5f9" };
const manualCloseBtnStyle: React.CSSProperties = { background: "#f1f5f9", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" };
const manualStepStyle: React.CSSProperties = { display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9", color: "#475569", fontSize: "0.9rem" };
const stepNumStyle: React.CSSProperties = { width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 };

export default AdminStoreConfig;