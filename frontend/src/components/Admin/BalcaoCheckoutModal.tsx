import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import UnitCalendar from "./UnitCalendar";

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
      const { data } = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
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
  const handleSelectDateRange = (start: Date, end: Date) => {
    if (!start || !end) {
        setDataInicio(null);
        setDataFim(null);
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const selectedStartStr = new Date(start.getTime() - (start.getTimezoneOffset() * 60000)).toISOString().substring(0, 10);

    // Validação da Trava de Horário
    if (selectedStartStr === todayStr && hojeBloqueadoPelaTrava && !desbloquearHojeManualmente) {
      alert(`Hoje está bloqueado para novas locações (Limite: ${horarioLimite}h). Marque "Ignorar trava" se deseja forçar.`);
      return;
    }

    // Valida se a data de início é anterior a hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startCheck = new Date(start);
    startCheck.setHours(0, 0, 0, 0);

    if (startCheck < today) {
      alert("A data de início não pode ser anterior a hoje!");
      return;
    }

    // Formata o ISO String considerando o timezone
    const sTime = new Date(start.getTime() - (start.getTimezoneOffset() * 60000)).toISOString().substring(0, 10);
    const eTime = new Date(end.getTime() - (end.getTimezoneOffset() * 60000)).toISOString().substring(0, 10);
    
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanDoc = cpfCnpj.replace(/\D/g, "");
    if (tipoPessoa === "pf" && cleanDoc.length !== 11) return alert("CPF inválido. Digite os 11 números.");
    if (tipoPessoa === "pj" && cleanDoc.length !== 14) return alert("CNPJ inválido. Digite os 14 números.");
    
    if (!dataInicio || !dataFim) {
      return alert("Você precisa desenhar o período de locação no calendário acima!");
    }

    if (tipoEntrega === "entrega" && baseFreight === 0) {
      return alert("Por favor, calcule o frete antes de finalizar.");
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
      alert("✅ Locação de Balcão registrada com sucesso!");
      onSuccess();
      navigate(`/my-reservations/${data.orderId}`); 

    } catch (error: any) {
      console.error("Erro ao registrar balcão:", error);
      alert(error.response?.data?.error || "Erro ao gerar o pedido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              Aluguel Rápido: {equipamentoNome}
            </h2>
            <span style={{ fontSize: "1rem", color: "#28a745", fontWeight: "bold", marginTop: "5px" }}>
              Valor da Diária: R$ {Number(precoDiaria).toFixed(2)}
            </span>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* CALENDÁRIO */}
          <div style={{ backgroundColor: "#343a40", padding: "15px", borderRadius: "8px", marginBottom: "25px", color: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h4 style={{ margin: 0, color: "#f8f9fa" }}>
                Escolha o Período no Mapa
              </h4>

              {hojeBloqueadoPelaTrava && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#dc3545", padding: "5px 10px", borderRadius: "5px", fontSize: "0.85rem" }}>
                  <span>Trava {horarioLimite}h:</span>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
                    <input type="checkbox" checked={desbloquearHojeManualmente} onChange={e => setDesbloquearHojeManualmente(e.target.checked)} />
                    Ignorar e liberar hoje
                  </label>
                </div>
              )}
            </div>

            {hojeBloqueadoPelaTrava && !desbloquearHojeManualmente && (
              <p style={{ backgroundColor: "rgba(255,255,255,0.1)", padding: "8px", borderRadius: "4px", fontSize: "0.85rem", color: "#ffc107", textAlign: "center", marginBottom: "10px" }}>
                Nota: O horário limite para locações de hoje ({horarioLimite}) já passou. O dia de hoje está travado.
              </p>
            )}
            
            <div style={{ padding: "10px", backgroundColor: "#fff", borderRadius: "8px" }}>
              <UnitCalendar
                unitId={unidadeId}
                token={token}
                reservations={reservations}
                onUpdate={() => {}} 
                isPicker={true} 
                onSelectRange={handleSelectDateRange} 
              />
            </div>
            
            <p style={{ margin: "10px 0 0 0", fontSize: "0.85rem", color: "#adb5bd", textAlign: "center" }}>
              * Clique para selecionar os dias do aluguel.
            </p>
          </div>

          {/* CLIENTE */}
          <h4 style={sectionTitleStyle}> Dados do Cliente</h4>
          <div style={{ display: "flex", gap: "20px", marginBottom: "15px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontWeight: "bold", color: "#444" }}>
              <input type="radio" name="tipoPessoa" checked={tipoPessoa === "pf"} onChange={() => setTipoPessoa("pf")} /> Pessoa Física (CPF)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontWeight: "bold", color: "#444" }}>
              <input type="radio" name="tipoPessoa" checked={tipoPessoa === "pj"} onChange={() => setTipoPessoa("pj")} /> Pessoa Jurídica (CNPJ)
            </label>
          </div>

          <div style={rowStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>{tipoPessoa === "pf" ? "CPF *" : "CNPJ *"}</label>
              <input required type="text" value={cpfCnpj} onChange={handleDocumentChange} style={inputStyle} placeholder={tipoPessoa === "pf" ? "000.000.000-00" : "00.000.000/0000-00"} />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>{tipoPessoa === "pf" ? "Nome Completo *" : "Razão Social *"}</label>
              <input required type="text" value={nome} onChange={e => setNome(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={rowStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>E-mail *</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="cliente@email.com" />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Telefone / WhatsApp *</label>
              <input required type="text" value={telefone} onChange={handlePhoneChange} style={inputStyle} placeholder="(00) 00000-0000" />
            </div>
          </div>

          {/* ENTREGA / RETIRADA */}
          <h4 style={sectionTitleStyle}> Logística</h4>
          <div style={{ display: "flex", gap: "20px", marginBottom: "15px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontWeight: "bold", color: "#444" }}>
              <input type="radio" name="tipoEntrega" checked={tipoEntrega === "retirada"} onChange={() => setTipoEntrega("retirada")} /> Retirada na Loja
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontWeight: "bold", color: "#444" }}>
              <input type="radio" name="tipoEntrega" checked={tipoEntrega === "entrega"} onChange={() => setTipoEntrega("entrega")} /> Entrega no Local
            </label>
          </div>

          {tipoEntrega === "entrega" && (
            <div style={{ backgroundColor: "#f1f3f5", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
              <div style={rowStyle}>
                <div style={{ ...inputGroupStyle, flex: "0 0 150px" }}>
                  <label style={labelStyle}>CEP *</label>
                  <input type="text" name="cep" value={address.cep} onChange={handleAddressChange} onBlur={handleCepBlur} style={inputStyle} placeholder="00000-000" />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Rua *</label>
                  <input type="text" name="rua" value={address.rua} onChange={handleAddressChange} style={inputStyle} />
                </div>
                <div style={{ ...inputGroupStyle, flex: "0 0 100px" }}>
                  <label style={labelStyle}>Nº *</label>
                  <input type="text" name="numero" value={address.numero} onChange={handleAddressChange} style={inputStyle} />
                </div>
              </div>
              <div style={rowStyle}>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Bairro *</label>
                  <input type="text" name="bairro" value={address.bairro} onChange={handleAddressChange} style={inputStyle} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Cidade *</label>
                  <input type="text" name="cidade" value={address.cidade} onChange={handleAddressChange} style={inputStyle} />
                </div>
                <div style={{ ...inputGroupStyle, flex: "0 0 80px" }}>
                  <label style={labelStyle}>UF *</label>
                  <input type="text" name="estado" value={address.estado} onChange={handleAddressChange} style={inputStyle} />
                </div>
              </div>
              <div style={rowStyle}>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Complemento / Ponto de Ref.</label>
                  <input type="text" name="complemento" value={address.complemento} onChange={handleAddressChange} style={inputStyle} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button 
                    type="button" 
                    onClick={calculateFreightCost} 
                    disabled={calculandoFrete}
                    style={{ ...btnSubmitStyle, backgroundColor: "#6c757d", width: "200px" }}
                  >
                    {calculandoFrete ? "Calculando..." : "Calcular Frete"}
                  </button>
                </div>
              </div>
              {erroFrete && <p style={{ color: "red", fontSize: "0.85rem", marginTop: "10px" }}>{erroFrete}</p>}
              {baseFreight > 0 && (
                <p style={{ color: "#28a745", fontWeight: "bold", marginTop: "10px" }}>
                  ✅ Frete calculado: R$ {baseFreight.toFixed(2)}
                </p>
              )}
            </div>
          )}

          {/* RESUMO E FINANCEIRO */}
          <h4 style={sectionTitleStyle}>Resumo da Locação</h4>
          <div style={{ padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid #ddd", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{color: "#555"}}>Equipamento:</span>
                  <strong style={{color: "#333"}}>{equipamentoNome} (# {unidadeId})</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{color: "#555"}}>Logística:</span>
                  <strong style={{color: "#333"}}>{tipoEntrega === "retirada" ? "Retirada na Loja" : "Entrega no Local"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{color: "#555"}}>Saída Prevista:</span>
                  <strong style={{color: "#333"}}>{dataInicio ? new Date(dataInicio + 'T12:00:00').toLocaleDateString() : 'Selecione no calendário ⬆️'}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{color: "#555"}}>Devolução Prevista:</span>
                  <strong style={{color: "#333"}}>{dataFim ? new Date(dataFim + 'T12:00:00').toLocaleDateString() : 'Selecione no calendário ⬆️'}</strong>
              </div>
              {baseFreight > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{color: "#555"}}>Custo de Frete:</span>
                  <strong style={{color: "#333"}}>R$ {baseFreight.toFixed(2)}</strong>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", borderTop: "1px dashed #ccc", paddingTop: "12px" }}>
                  <span style={{fontSize: "1.1rem", color: "#555"}}>Total Geral:</span>
                  <strong style={{fontSize: "1.4rem", color: "#28a745"}}>R$ {valorTotal.toFixed(2)}</strong>
              </div>
          </div>

          <div style={rowStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Sinal Pago Agora (R$) *</label>
              <input required type="number" step="0.01" min="0" value={valorSinal} onChange={e => setValorSinal(e.target.value)} style={inputStyle} />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Forma de Pagamento *</label>
              <select value={metodoPagamento} onChange={e => setMetodoPagamento(e.target.value)} style={inputStyle}>
                <option value="pix">PIX</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="cartao_debito">Cartão de Debitô</option>
                <option value="dinheiro">Dinheiro Espécie</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
            <button type="button" onClick={onClose} style={btnCancelStyle}>Cancelar</button>
            <button type="submit" disabled={loading || !dataInicio || (tipoEntrega === 'entrega' && baseFreight === 0)} style={{...btnSubmitStyle, opacity: (!dataInicio || loading || (tipoEntrega === 'entrega' && baseFreight === 0)) ? 0.6 : 1, cursor: (!dataInicio || loading || (tipoEntrega === 'entrega' && baseFreight === 0)) ? 'not-allowed' : 'pointer'}}>
              {loading ? "Gerando..." : "Confirmar e Liberar Máquina"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const overlayStyle: React.CSSProperties = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" };
const modalStyle: React.CSSProperties = { backgroundColor: "#fff", padding: "25px", borderRadius: "12px", width: "700px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #eee", paddingBottom: "10px", color: "#2c3e50" };
const closeBtnStyle: React.CSSProperties = { background: "none", border: "none", fontSize: "1.8rem", cursor: "pointer", color: "#888" };
const sectionTitleStyle: React.CSSProperties = { margin: "15px 0 10px 0", color: "#495057", fontSize: "1.1rem", borderBottom: "2px solid #f0f0f0", paddingBottom: "5px" };
const rowStyle: React.CSSProperties = { display: "flex", gap: "15px", flexWrap: "wrap", marginBottom: "10px" };
const inputGroupStyle: React.CSSProperties = { flex: 1, minWidth: "200px", display: "flex", flexDirection: "column" };
const labelStyle: React.CSSProperties = { fontSize: "0.9rem", fontWeight: "bold", color: "#555", marginBottom: "5px" };
const inputStyle: React.CSSProperties = { padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "1rem", outline: "none" };
const btnCancelStyle: React.CSSProperties = { padding: "10px 20px", border: "1px solid #ccc", backgroundColor: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", color: "#555" };
const btnSubmitStyle: React.CSSProperties = { padding: "10px 20px", border: "none", backgroundColor: "#007bff", color: "white", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", boxShadow: "0 4px 6px rgba(0,123,255,0.2)" };

export default BalcaoCheckoutModal;