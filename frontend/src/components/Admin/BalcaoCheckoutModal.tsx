import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import UnitCalendar from "./UnitCalendar";
import { 
  X, 
  User, 
  Truck, 
  CreditCard, 
  Calendar, 
  Info,
  Phone, 
  Mail, 
  Zap,
  Store,
  DollarSign,
  Calculator,
  ShieldCheck,
  Package,
  AlertCircle
} from "lucide-react";

interface BalcaoCheckoutModalProps {
  unidadeId: number;
  equipamentoNome: string;
  precoDiaria: number | string;
  reservations: any[]; 
  onClose: () => void;
  onSuccess: () => void;
}

const BalcaoCheckoutModal: React.FC<BalcaoCheckoutModalProps> = ({
  unidadeId,
  equipamentoNome,
  precoDiaria,
  reservations,
  onClose,
  onSuccess,
}) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Controle de Tipo de Pessoa
  const [tipoPessoa, setTipoPessoa] = useState<"pf" | "pj">("pf");

  // Dados do Cliente
  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  // DADOS DA LOCAÇÃO
  const [dataInicio, setDataInicio] = useState<string | null>(null);
  const [dataFim, setDataFim] = useState<string | null>(null);

  // Dados Financeiros
  const [valorSinal, setValorSinal] = useState<number | string>("");
  const [metodoPagamento, setMetodoPagamento] = useState("pix");
  const [valorTotal, setValorTotal] = useState(0);

  // --- TRAVA DE HORÁRIO ---
  const [horarioLimite, setHorarioLimite] = useState("12:00");
  const [hojeBloqueadoPelaTrava, setHojeBloqueadoPelaTrava] = useState(false);
  const [desbloquearHojeManualmente, setDesbloquearHojeManualmente] = useState(false);

  useEffect(() => {
    const fetchStoreConfig = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/config`);
        if (data && data.horario_limite_hoje) {
          setHorarioLimite(data.horario_limite_hoje);
          
          const [horaLimite, minutoLimite] = data.horario_limite_hoje.split(":").map(Number);
          const agora = new Date();
          const limite = new Date();
          limite.setHours(horaLimite, minutoLimite, 0, 0);

          if (agora > limite) {
            setHojeBloqueadoPelaTrava(true);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar trava de horário:", err);
      }
    };
    fetchStoreConfig();
  }, []);

  // --- CONTROLE DE ENTREGA / FRETE ---
  const [tipoEntrega, setTipoEntrega] = useState<"retirada" | "entrega">("retirada");
  const [address, setAddress] = useState({
    cep: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    complemento: ""
  });
  const [baseFreight, setBaseFreight] = useState(0);
  const [calculandoFrete, setCalculandoFrete] = useState(false);
  const [erroFrete, setErroFrete] = useState<string | null>(null);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleCepBlur = async () => {
    const cepLimpo = address.cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setAddress(prev => ({
          ...prev,
          rua: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          estado: data.uf
        }));
        // Envio automático pro campo de número
        document.getElementById("input-numero")?.focus();
      }
    } catch (error) {
      console.error("Erro ViaCEP", error);
    }
  };

  // Reset do frete se o CEP mudar
  useEffect(() => {
    setBaseFreight(0);
    setErroFrete(null);
  }, [address.cep]);

  const calculateFreightCost = async () => {
    if (!address.rua || !address.numero || !address.cep) {
      setErroFrete("Preencha Rua, Número e CEP.");
      return;
    }

    setCalculandoFrete(true);
    setErroFrete(null);

    try {
      const fullAddress = `${address.rua}, ${address.numero} - ${address.bairro}, ${address.cidade}/${address.estado}, ${address.cep}`;
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/frete/calcular`, {
        endereco_destino: fullAddress
      });
      setBaseFreight(Number(response.data.valor_total_frete));
    } catch (err: any) {
      console.error("Erro Frete:", err);
      setErroFrete(err.response?.data?.error || "Erro ao calcular frete.");
      setBaseFreight(0);
    } finally {
      setCalculandoFrete(false);
    }
  };

  useEffect(() => {
    if (tipoEntrega === "retirada") {
      setBaseFreight(0);
      setErroFrete(null);
    }
  }, [tipoEntrega]);

  // MÁSCARAS DE INPUT 
  const applyCpfMask = (value: string) => {
    return value.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").replace(/(-\d{2})\d+?$/, "$1");
  };

  const applyCnpjMask = (value: string) => {
    return value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})/, "$1-$2").replace(/(-\d{2})\d+?$/, "$1");
  };

  const applyPhoneMask = (value: string) => {
    return value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4,5})(\d{4}).*/, "$1-$2");
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setCpfCnpj(tipoPessoa === "pf" ? applyCpfMask(rawValue) : applyCnpjMask(rawValue));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(applyPhoneMask(e.target.value));
  };

  useEffect(() => { setCpfCnpj(""); }, [tipoPessoa]);

  // FUNÇÃO QUE LÊ AS DATAS DO CALENDÁRIO
  const handleSelectDateRange = async (start: Date, end: Date) => {
    setErrorMessage(null);
    if (!start || !end) {
        setDataInicio(null);
        setDataFim(null);
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const selectedStartStr = new Date(start.getTime() - (start.getTimezoneOffset() * 60000)).toISOString().substring(0, 10);

    // Validação da Trava de Horário
    if (selectedStartStr === todayStr && hojeBloqueadoPelaTrava && !desbloquearHojeManualmente) {
      setErrorMessage(`Hoje está bloqueado para locações (Limite: ${horarioLimite}h). Marque "Ignorar trava" se desejar forçar.`);
      return;
    }

    // Valida se a data de início é anterior a hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startCheck = new Date(start);
    startCheck.setHours(0, 0, 0, 0);

    if (startCheck < today) {
      setErrorMessage("A data de início não pode ser anterior a hoje!");
      return;
    }

    // Formata o ISO String considerando o timezone
    const sTime = new Date(start.getTime() - (start.getTimezoneOffset() * 60000)).toISOString().substring(0, 10);
    const eTime = new Date(end.getTime() - (end.getTimezoneOffset() * 60000)).toISOString().substring(0, 10);

    // Validação de LOJA FECHADA
    try {
      const yearStart = start.getFullYear();
      const monthStart = start.getMonth() + 1;
      const { data: statusStart } = await axios.get(`${import.meta.env.VITE_API_URL}/api/calendario/status-mensal?ano=${yearStart}&mes=${monthStart}`);
      
      const dayStartStatus = statusStart.find((d: any) => d.data === sTime);
      if (dayStartStatus && dayStartStatus.status === 'FECHADO') {
         setErrorMessage(`A loja estará fechada na data de início (${start.toLocaleDateString()}). Por favor, escolha outra data.`);
         setDataInicio(null); setDataFim(null);
         return;
      }

      if (sTime !== eTime) {
        const yearEnd = end.getFullYear();
        const monthEnd = end.getMonth() + 1;
        let statusEnd = statusStart;

        if (yearEnd !== yearStart || monthEnd !== monthStart) {
          const resEnd = await axios.get(`${import.meta.env.VITE_API_URL}/api/calendario/status-mensal?ano=${yearEnd}&mes=${monthEnd}`);
          statusEnd = resEnd.data;
        }
        
        const dayEndStatus = statusEnd.find((d: any) => d.data === eTime);
        if (dayEndStatus && dayEndStatus.status === 'FECHADO') {
           setErrorMessage(`A loja estará fechada na data de término (${end.toLocaleDateString()}). Por favor, escolha outra data.`);
           setDataInicio(null); setDataFim(null);
           return;
        }
      }
    } catch (err) {
      console.error("Erro ao validar loja fechada:", err);
    }
    
    setDataInicio(sTime);
    setDataFim(eTime);
  };

  // Cálculo da diária 
  useEffect(() => {
    if (dataInicio && dataFim) {
      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      if (fim >= inicio) {
        const diffTime = Math.abs(fim.getTime() - inicio.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        const total = (diffDays * Number(precoDiaria)) + baseFreight;
        setValorTotal(total);
        // Define o sinal como 50% do total por padrão
        setValorSinal((total * 0.5).toFixed(2));
      } else {
        setValorTotal(0);
        setValorSinal("");
      }
    } else {
        setValorTotal(0);
        setValorSinal("");
    }
  }, [dataInicio, dataFim, precoDiaria, baseFreight]);

  const validarCPF = (cpf: string) => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf === '') return false;
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let add = 0;
    for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;
    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    const cleanDoc = cpfCnpj.replace(/\D/g, "");
    if (tipoPessoa === "pf") {
        if (cleanDoc.length !== 11) return setErrorMessage("CPF inválido. Digite os 11 números.");
        if (!validarCPF(cleanDoc)) return setErrorMessage("CPF inválido. Verifique o número digitado.");
    }
    if (tipoPessoa === "pj" && cleanDoc.length !== 14) return setErrorMessage("CNPJ inválido. Digite os 14 números.");
    
    if (!dataInicio || !dataFim) {
      return setErrorMessage("Selecione o período de locação no calendário.");
    }

    if (tipoEntrega === "entrega" && baseFreight === 0) {
      return setErrorMessage("Calcule o frete antes de finalizar.");
    }

    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const fullAddress = tipoEntrega === "entrega" 
        ? `${address.rua}, ${address.numero}${address.complemento ? " - " + address.complemento : ""} - ${address.bairro}, ${address.cidade}/${address.estado} - CEP: ${address.cep}`
        : null;

      const payload = {
        unidade_id: unidadeId,
        data_inicio: dataInicio,
        data_fim: dataFim,
        cliente: { nome, cpf_cnpj: cleanDoc, telefone, email },
        pagamento: { valor_sinal: Number(valorSinal), metodo_sinal: metodoPagamento },
        tipo_entrega: tipoEntrega,
        custo_frete: baseFreight,
        endereco_entrega: fullAddress,
        ignoreLockout: true
      };

      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/reservations/balcao`, payload, config);
      onSuccess();
      navigate(`/my-reservations/${data.orderId}`); 

    } catch (error: any) {
      console.error("Erro ao registrar balcão:", error);
      setErrorMessage(error.response?.data?.error || "Erro ao gerar o pedido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div style={{ ...modalStyle, border: "1px solid #e2e8f0" }} onClick={(e) => e.stopPropagation()}>
        
        {/* CABEÇALHO */}
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <div style={{ backgroundColor: "#ecfdf5", padding: "12px", borderRadius: "12px" }}>
                <Store size={28} color="#10b981" />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
                <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.4rem", fontWeight: 800 }}>Nova Locação (Balcão)</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Package size={14} color="#64748b" />
                    <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: "600" }}>{equipamentoNome} (Unidade #{unidadeId})</span>
                </div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={closeBtnStyle}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "25px", padding: "25px" }}>
          
          {/* SEÇÃO 1: PERÍODO (CALENDÁRIO) */}
          <div style={{ background: "#f8fafc", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
             <div style={{ backgroundColor: "#1e293b", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "white" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Calendar size={18} />
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700" }}>Selecione o Período</h4>
                </div>
                {hojeBloqueadoPelaTrava && (
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.8rem", background: "#334155", padding: "5px 10px", borderRadius: "6px" }}>
                        <input type="checkbox" checked={desbloquearHojeManualmente} onChange={e => {
                          setDesbloquearHojeManualmente(e.target.checked);
                          if (e.target.checked) setErrorMessage(null);
                        }} />
                        Ignorar Trava {horarioLimite}h
                    </label>
                )}
             </div>
             
             <div style={{ padding: "15px" }}>
                {hojeBloqueadoPelaTrava && !desbloquearHojeManualmente && (
                    <div style={{ marginBottom: "15px", backgroundColor: "#fffbeb", padding: "10px", borderRadius: "8px", border: "1px solid #fef3c7", display: "flex", alignItems: "center", gap: "10px", color: "#92400e", fontSize: "0.85rem" }}>
                        <Info size={16} />
                        <span>O dia de hoje está bloqueado devido ao horário limite ({horarioLimite}h).</span>
                    </div>
                )}
                <div style={{ backgroundColor: "#fff", borderRadius: "10px", padding: "10px", border: "1px solid #f1f5f9" }}>
                    <UnitCalendar
                        unitId={unidadeId}
                        token={token}
                        reservations={reservations}
                        onUpdate={() => {}} 
                        isPicker={true} 
                        onSelectRange={handleSelectDateRange} 
                    />
                </div>
                <p style={{ margin: "10px 0 0 0", fontSize: "0.8rem", color: "#94a3b8", textAlign: "center", fontWeight: "600" }}>
                    * Clique na data de início e depois na data de fim no calendário.
                </p>
             </div>
          </div>

          {/* SEÇÃO 2: DADOS DO CLIENTE */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", color: "#1e293b" }}>
                <User size={20} />
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: "800" }}>Identificação do Cliente</h4>
            </div>

            <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
                <button type="button" onClick={() => setTipoPessoa("pf")} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: `2px solid ${tipoPessoa === "pf" ? "#2563eb" : "#f1f5f9"}`, backgroundColor: tipoPessoa === "pf" ? "#eff6ff" : "#f8fafc", color: tipoPessoa === "pf" ? "#2563eb" : "#64748b", fontWeight: "bold", cursor: "pointer", transition: "0.2s" }}>Pessoa Física</button>
                <button type="button" onClick={() => setTipoPessoa("pj")} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: `2px solid ${tipoPessoa === "pj" ? "#2563eb" : "#f1f5f9"}`, backgroundColor: tipoPessoa === "pj" ? "#eff6ff" : "#f8fafc", color: tipoPessoa === "pj" ? "#2563eb" : "#64748b", fontWeight: "bold", cursor: "pointer", transition: "0.2s" }}>Pessoa Jurídica</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>{tipoPessoa === "pf" ? "CPF *" : "CNPJ *"}</label>
                    <div style={{ position: "relative" }}>
                        <ShieldCheck size={16} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                        <input required value={cpfCnpj} onChange={handleDocumentChange} style={{ ...inputStyle, paddingLeft: "38px" }} placeholder={tipoPessoa === "pf" ? "000.000.000-00" : "00.000.000/0000-00"} />
                    </div>
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>{tipoPessoa === "pf" ? "Nome Completo *" : "Razão Social *"}</label>
                    <div style={{ position: "relative" }}>
                        <User size={16} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                        <input required value={nome} onChange={e => setNome(e.target.value)} style={{ ...inputStyle, paddingLeft: "38px" }} placeholder={tipoPessoa === "pf" ? "Ex: João da Silva" : "Ex: Construtora Silva LTDA"} />
                    </div>
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>WhatsApp / Celular *</label>
                    <div style={{ position: "relative" }}>
                        <Phone size={16} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                        <input required value={telefone} onChange={handlePhoneChange} style={{ ...inputStyle, paddingLeft: "38px" }} placeholder="(00) 00000-0000" />
                    </div>
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>E-mail (Opcional)</label>
                    <div style={{ position: "relative" }}>
                        <Mail size={16} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ ...inputStyle, paddingLeft: "38px" }} placeholder="cliente@email.com" />
                    </div>
                </div>
            </div>
          </div>

          {/* SEÇÃO 3: LOGÍSTICA */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", color: "#1e293b" }}>
                <Truck size={20} />
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: "800" }}>Logística e Entrega</h4>
            </div>

            <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
                <button type="button" onClick={() => setTipoEntrega("retirada")} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `2px solid ${tipoEntrega === "retirada" ? "#10b981" : "#f1f5f9"}`, backgroundColor: tipoEntrega === "retirada" ? "#f0fdf4" : "#f8fafc", color: tipoEntrega === "retirada" ? "#10b981" : "#64748b", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><Package size={18} /> Retirada Loja</button>
                <button type="button" onClick={() => setTipoEntrega("entrega")} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `2px solid ${tipoEntrega === "entrega" ? "#10b981" : "#f1f5f9"}`, backgroundColor: tipoEntrega === "entrega" ? "#f0fdf4" : "#f8fafc", color: tipoEntrega === "entrega" ? "#10b981" : "#64748b", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><Truck size={18} /> Entrega Local</button>
            </div>

            {tipoEntrega === "entrega" && (
                <div style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", animation: "fadeIn 0.2s ease" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 100px", gap: "15px", marginBottom: "15px" }}>
                        <div style={inputGroupStyle}><label style={labelStyle}>CEP</label><input name="cep" value={address.cep} onChange={handleAddressChange} onBlur={handleCepBlur} style={inputStyle} placeholder="00000-000" /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Rua</label><input name="rua" value={address.rua} onChange={handleAddressChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Nº</label><input id="input-numero" name="numero" value={address.numero} onChange={handleAddressChange} style={inputStyle} /></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: "15px", marginBottom: "15px" }}>
                        <div style={inputGroupStyle}><label style={labelStyle}>Bairro</label><input name="bairro" value={address.bairro} onChange={handleAddressChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Cidade</label><input name="cidade" value={address.cidade} onChange={handleAddressChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>UF</label><input name="estado" value={address.estado} onChange={handleAddressChange} style={inputStyle} /></div>
                    </div>
                    <div style={{ display: "flex", gap: "15px", alignItems: "flex-end" }}>
                        <div style={{ ...inputGroupStyle, flex: 1 }}><label style={labelStyle}>Complemento</label><input name="complemento" value={address.complemento} onChange={handleAddressChange} style={inputStyle} /></div>
                        <button type="button" onClick={calculateFreightCost} disabled={calculandoFrete} style={{ height: "42px", padding: "0 20px", backgroundColor: "#334155", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                            {calculandoFrete ? "..." : <Calculator size={18} />} {calculandoFrete ? "Calculando..." : "Calcular Frete"}
                        </button>
                    </div>
                    {erroFrete && <p style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: "10px", fontWeight: "bold" }}>{erroFrete}</p>}
                    {baseFreight > 0 && <p style={{ color: "#10b981", fontSize: "0.9rem", marginTop: "10px", fontWeight: "800", display: "flex", alignItems: "center", gap: "5px" }}><ShieldCheck size={16} /> Frete: R$ {baseFreight.toFixed(2)}</p>}
                </div>
            )}
          </div>

          {/* SEÇÃO 4: FINANCEIRO */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px", background: "#f8fafc" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", color: "#1e293b" }}>
                <CreditCard size={20} />
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: "800" }}>Pagamento e Resumo</h4>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "25px" }}>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>Forma de Pagamento (Sinal)</label>
                    <select value={metodoPagamento} onChange={e => setMetodoPagamento(e.target.value)} style={inputStyle}>
                        <option value="pix">PIX</option>
                        <option value="cartao_credito">Cartão de Crédito</option>
                        <option value="cartao_debito">Cartão de Débito</option>
                        <option value="dinheiro">Dinheiro Espécie</option>
                    </select>
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>Valor Recebido Agora (Sinal) *</label>
                    <div style={{ position: "relative" }}>
                        <DollarSign size={16} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                        <input required type="number" step="0.01" value={valorSinal} onChange={e => setValorSinal(e.target.value)} style={{ ...inputStyle, paddingLeft: "38px" }} />
                    </div>
                </div>
            </div>

            <div style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "0.95rem" }}>
                    <span style={{ color: "#64748b", fontWeight: "600" }}>Período:</span>
                    <strong style={{ color: "#1e293b" }}>{dataInicio ? new Date(dataInicio + 'T12:00:00').toLocaleDateString() : 'Selecione...'} até {dataFim ? new Date(dataFim + 'T12:00:00').toLocaleDateString() : 'Selecione...'}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "0.95rem" }}>
                    <span style={{ color: "#64748b", fontWeight: "600" }}>Valor Diárias:</span>
                    <strong style={{ color: "#1e293b" }}>R$ {(valorTotal - baseFreight).toFixed(2)}</strong>
                </div>
                {baseFreight > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "0.95rem" }}>
                        <span style={{ color: "#64748b", fontWeight: "600" }}>Frete Logística:</span>
                        <strong style={{ color: "#1e293b" }}>R$ {baseFreight.toFixed(2)}</strong>
                    </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15px", paddingTop: "15px", borderTop: "2px dashed #f1f5f9" }}>
                    <span style={{ fontSize: "1.1rem", color: "#1e293b", fontWeight: "800" }}>TOTAL GERAL:</span>
                    <strong style={{ fontSize: "1.5rem", color: "#10b981", fontWeight: "900" }}>R$ {valorTotal.toFixed(2)}</strong>
                </div>
            </div>
          </div>

          {errorMessage && (
            <div style={{ margin: "5px 0", backgroundColor: "#fef2f2", padding: "12px 20px", borderRadius: "12px", border: "1px solid #fecaca", display: "flex", alignItems: "center", gap: "12px", animation: "slideDown 0.3s ease" }}>
              <AlertCircle size={20} color="#ef4444" />
              <span style={{ color: "#991b1b", fontWeight: "bold", fontSize: "0.9rem" }}>{errorMessage}</span>
              <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setErrorMessage(null); }} type="button" style={{ marginLeft: "auto", background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}><X size={18} /></button>
            </div>
          )}

          {/* BOTÕES DE AÇÃO */}
          <div style={{ display: "flex", gap: "15px", marginTop: "10px" }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", backgroundColor: "white", color: "#64748b", fontWeight: "bold", cursor: "pointer" }}>Cancelar</button>
            <button 
                type="submit" 
                disabled={loading || !dataInicio || (tipoEntrega === 'entrega' && baseFreight === 0)} 
                style={{ 
                    flex: 2, 
                    padding: "14px", 
                    borderRadius: "12px", 
                    border: "none", 
                    backgroundColor: "#2563eb", 
                    color: "white", 
                    fontWeight: "800", 
                    cursor: (loading || !dataInicio) ? "not-allowed" : "pointer",
                    fontSize: "1.1rem",
                    boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    opacity: (loading || !dataInicio) ? 0.7 : 1
                }}
            >
              {loading ? "Processando..." : <Zap size={20} />}
              {loading ? "Gerando Locação..." : "Confirmar Locação e Liberar"}
            </button>
          </div>

        </form>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};


const overlayStyle: React.CSSProperties = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px", animation: "fadeIn 0.2s ease" };
const modalStyle: React.CSSProperties = { backgroundColor: "#fff", borderRadius: "24px", width: "800px", maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "25px", borderBottom: "1px solid #f1f5f9" };
const closeBtnStyle: React.CSSProperties = { background: "#f1f5f9", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" };
const inputGroupStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "8px" };
const labelStyle: React.CSSProperties = { fontSize: "0.85rem", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.025em" };
const inputStyle: React.CSSProperties = { padding: "12px 15px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "1rem", outline: "none", color: "#1e293b", transition: "0.2s", width: "100%", boxSizing: "border-box" };

export default BalcaoCheckoutModal;