import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import axios from "axios";
import { useAuth } from "../context/AuthContext"; 

interface Pagamento {
  id: number;
  valor: string | number;
  status_pagamento: string;
  metodo_detalhe?: string;
  cartao_final?: string;
  parcelas: number;
}

interface ContractModalProps {
  order: {
    id: number;
    valor_total: string | number;
    data_inicio: string;
    data_fim: string;
    Usuario?: {
      nome: string;
      email: string;
    };
    ItemReservas: Array<{
      id: number;
      Unidade: {
        id: number;
        Equipamento: {
          nome: string;
        };
      };
    }>;
    Pagamentos?: Pagamento[];
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface StoreConfig {
  cnpj?: string;
  taxa_reagendamento?: string | number;
}

const ContractModal: React.FC<ContractModalProps> = ({ order, onClose, onSuccess }) => {
  const sigCanvasCliente = useRef<SignatureCanvas>(null);
  const sigCanvasEntregador = useRef<SignatureCanvas>(null);
  
  const [signing, setSigning] = useState(false);
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  
  const [nomeRecebedor, setNomeRecebedor] = useState("");
  const [docRecebedor, setDocRecebedor] = useState("");

  const backendUrl = import.meta.env.VITE_API_URL;
  const { token } = useAuth();

  const formatCPF = (value: string) => {
    let v = value.replace(/\D/g, "").substring(0, 11);
    return v
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setDocRecebedor(formatted);
  };

  React.useEffect(() => {
    // Tenta preencher nome do recebedor com o nome do cliente por padrão
    if (order.Usuario?.nome) setNomeRecebedor(order.Usuario.nome);
    
    const fetchConfig = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/config`);
        setStoreConfig(data);
      } catch (error) {
        console.error("Erro ao buscar config da loja:", error);
      }
    };
    fetchConfig();
  }, [backendUrl, order.Usuario?.nome]);

  const handleSignContract = async () => {
    if (!token) {
        return alert("Erro: Sessão expirada. Atualize a página e tente novamente.");
    }

    if (sigCanvasEntregador.current?.isEmpty()) {
      return alert("A assinatura do entregador é OBRIGATÓRIA.");
    }

    if (!nomeRecebedor.trim()) {
      return alert("Por favor, informe o nome de quem está recebendo o equipamento.");
    }

    if (sigCanvasCliente.current?.isEmpty()) {
      return alert("A assinatura do recebedor é OBRIGATÓRIA.");
    }

    setSigning(true);
    try {
      const assinaturaCliente = sigCanvasCliente.current?.getCanvas().toDataURL("image/png");
      const assinaturaEntregador = sigCanvasEntregador.current?.getCanvas().toDataURL("image/png");

      await axios.put(
        `${backendUrl}/api/reservations/${order.id}/sign`,
        { 
            assinatura_cliente: assinaturaCliente,
            assinatura_entregador: assinaturaEntregador,
            nome_recebedor: nomeRecebedor,
            documento_recebedor: docRecebedor
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Contrato assinado com sucesso! Entrega concluída.");
      onSuccess(); 
    } catch (error) {
      console.error("Erro no servidor:", error);
      alert("Erro ao salvar assinaturas. Verifique o console.");
    } finally {
      setSigning(false);
    }
  };

  const handleContentClick = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.75)", display: "flex",
      justifyContent: "center", alignItems: "center", zIndex: 9999, padding: "20px"
    }} onClick={onClose}>
      
      <div style={{
        backgroundColor: "#fff", borderRadius: "12px", width: "100%", maxWidth: "800px",
        maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)", position: "relative"
      }} onClick={handleContentClick}>
        
        {/* CABEÇALHO */}
        <div style={{ padding: "20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8f9fa" }}>
          <h2 style={{ margin: 0, color: "#2c3e50", fontSize: "1.4rem" }}>Protocolo de Entrega e Contrato</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.8rem", color: "#999", cursor: "pointer" }}>&times;</button>
        </div>

        {/* CORPO DO CONTRATO */}
        <div style={{ padding: "30px", overflowY: "auto", flex: 1, color: "#444", lineHeight: "1.6" }}>
          <h3 style={{ textAlign: "center", marginBottom: "20px" }}>Nº do Contrato/Pedido: {order.id}</h3>
          
          <h4 style={{ backgroundColor: "#f0f0f0", padding: "8px", borderRadius: "4px" }}>1. AS PARTES</h4>
          <p><strong>LOCADORA:</strong> LOCATOOLS LOCAÇÃO DE EQUIPAMENTOS LTDA, CNPJ {storeConfig?.cnpj || "00.000.000/0001-00"}.</p>
          <p><strong>LOCATÁRIO(A):</strong> {order.Usuario?.nome}, Email: {order.Usuario?.email}.</p>

          <h4 style={{ backgroundColor: "#f0f0f0", padding: "8px", borderRadius: "4px", marginTop: "20px" }}>2. OBJETO DO CONTRATO</h4>
          <p>O presente contrato tem como objeto a locação do(s) equipamento(s) listado(s) abaixo:</p>
          <ul style={{ paddingLeft: "20px" }}>
            {order.ItemReservas.map((item) => (
              <li key={item.id}><strong>{item.Unidade.Equipamento.nome}</strong> (Patrimônio #{item.Unidade.id})</li>
            ))}
          </ul>

          <h4 style={{ backgroundColor: "#f0f0f0", padding: "8px", borderRadius: "4px", marginTop: "20px" }}>3. VALORES E VIGÊNCIA</h4>
          <p>Valor da Locação: <strong>R$ {Number(order.valor_total).toFixed(2)}</strong>. A locação tem início em <strong>{new Date(order.data_inicio).toLocaleDateString()}</strong> e término em <strong>{new Date(order.data_fim).toLocaleDateString()}</strong>.</p>
          
          {/* HISTÓRICO DE PAGAMENTOS MANTIDO AQUI */}
          {order.Pagamentos && order.Pagamentos.length > 0 && (
            <div style={{ marginTop: "10px", padding: "10px", border: "1px solid #eee", borderRadius: "8px", backgroundColor: "#fafafa" }}>
              <p style={{ margin: "0 0 10px 0" }}><strong>HISTÓRICO DE PAGAMENTOS:</strong></p>
              {order.Pagamentos.filter((p) => p.status_pagamento === 'aprovado').map((p) => {
                let metodo = p.metodo_detalhe ? p.metodo_detalhe.toUpperCase() : 'NÃO INFORMADO';
                if (p.parcelas > 1) {
                  metodo = `CARTÃO DE CRÉDITO`;
                } else if (p.cartao_final || metodo.includes('CARD')) {
                  metodo = `CARTÃO (À VISTA)`;
                } else if (metodo.includes('PIX')) {
                  metodo = 'PIX';
                }
                const valorTotalPagoMP = Number(p.valor);
                const valorParcela = valorTotalPagoMP / (p.parcelas || 1);
                return (
                  <p key={p.id} style={{ margin: "5px 0", fontSize: "0.95rem" }}>
                    • {metodo} 
                    {p.parcelas > 1 ? (
                       <strong> {p.parcelas}x de R$ {valorParcela.toFixed(2)}</strong>
                    ) : (
                       <strong> R$ {valorTotalPagoMP.toFixed(2)}</strong>
                    )}
                  </p>
                );
              })}
              <div style={{ borderTop: "1px solid #ddd", marginTop: "10px", paddingTop: "10px" }}>
                 <p style={{ margin: "5px 0" }}>Total Pago: <strong>R$ {order.Pagamentos.filter(p => p.status_pagamento === 'aprovado').reduce((acc, p) => acc + Number(p.valor), 0).toFixed(2)}</strong></p>
                 {Number(order.valor_total) - order.Pagamentos.filter(p => p.status_pagamento === 'aprovado').reduce((acc, p) => acc + Number(p.valor), 0) > 0.01 && (
                   <p style={{ margin: "5px 0", color: "#d9534f" }}>Restante a Pagar: <strong>R$ {(Number(order.valor_total) - order.Pagamentos.filter(p => p.status_pagamento === 'aprovado').reduce((acc, p) => acc + Number(p.valor), 0)).toFixed(2)}</strong></p>
                 )}
              </div>
            </div>
          )}

          <h4 style={{ backgroundColor: "#f0f0f0", padding: "8px", borderRadius: "4px", marginTop: "20px" }}>4. REAGENDAMENTO E ALTERAÇÕES</h4>
          <p>
            O LOCATÁRIO poderá solicitar o reagendamento das datas de locação, sujeito à disponibilidade dos equipamentos. 
            Esta solicitação deve ser realizada <strong>única e exclusivamente através do sistema da LocaTools</strong>.
            {storeConfig?.taxa_reagendamento && Number(storeConfig.taxa_reagendamento) > 0 ? (
              <> Será cobrada uma taxa administrativa de <strong>R$ {Number(storeConfig.taxa_reagendamento).toFixed(2)}</strong> por cada alteração solicitada após a confirmação deste contrato.</>
            ) : (
              <> O reagendamento está sujeito a análise e possíveis taxas administrativas vigentes no momento da solicitação.</>
            )}
          </p>

          <h4 style={{ backgroundColor: "#f0f0f0", padding: "8px", borderRadius: "4px", marginTop: "20px" }}>5. TERMOS E CONDIÇÕES</h4>
          <p>5.1. O Locatário se compromete a utilizar o equipamento de forma correta e segura.</p>
          <p>5.2. O equipamento deverá ser devolvido nas mesmas condições da Vistoria de Saída.</p>
          <p>5.3. Danos, perdas, furtos ou devolução com atraso acarretarão em multas e cobranças adicionais.</p>

          <h4 style={{ backgroundColor: "#eef2f7", padding: "12px", borderRadius: "4px", marginTop: "30px", borderLeft: "4px solid #007bff" }}>6. PROTOCOLO DE RECEBIMENTO</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "30px" }}>
              <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: "bold", display: "block", marginBottom: "5px" }}>Nome de quem recebeu (Obrigatório):</label>
                  <input 
                    type="text" 
                    value={nomeRecebedor} 
                    onChange={(e) => setNomeRecebedor(e.target.value)}
                    maxLength={100}
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "2px solid #ddd", fontSize: "1rem" }}
                    placeholder="Nome completo do recebedor"
                  />
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "15px" }}>
                  <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: "bold", display: "block", marginBottom: "5px" }}>CPF do Recebedor:</label>
                      <input 
                        type="text" 
                        value={docRecebedor} 
                        onChange={handleDocChange}
                        style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "2px solid #ddd", fontSize: "1rem" }}
                        placeholder="000.000.000-00"
                      />
                  </div>
              </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
              {/* ASSINATURA RECEBEDOR */}
              <div style={{ border: "2px solid #eee", padding: "20px", borderRadius: "12px", backgroundColor: "#fafafa" }}>
                <p style={{ fontWeight: "bold", fontSize: "1rem", marginBottom: "15px", color: "#333", borderBottom: "1px solid #ddd", paddingBottom: "10px" }}>
                   🖋️ Assinatura do Recebedor (Obrigatória):
                </p>
                <div style={{ border: "2px solid #ccc", borderRadius: "8px", backgroundColor: "#fff", height: "250px", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)" }}>
                  <SignatureCanvas 
                    ref={sigCanvasCliente}
                    penColor="black"
                    canvasProps={{ style: { width: "100%", height: "100%", cursor: "crosshair" } }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                    <button onClick={() => sigCanvasCliente.current?.clear()} style={{ background: "none", border: "none", color: "#dc3545", fontWeight: "bold", cursor: "pointer", fontSize: "0.9rem" }}>
                    🧹 Limpar Assinatura
                    </button>
                </div>
              </div>

              {/* ASSINATURA ENTREGADOR */}
              <div style={{ border: "2px solid #e3f2fd", padding: "20px", borderRadius: "12px", backgroundColor: "#f0f7ff" }}>
                <p style={{ fontWeight: "bold", fontSize: "1rem", marginBottom: "15px", color: "#0056b3", borderBottom: "1px solid #b3d7ff", paddingBottom: "10px" }}>
                   🚛 Assinatura do Entregador (Obrigatória):
                </p>
                <div style={{ border: "2px solid #007bff", borderRadius: "8px", backgroundColor: "#fff", height: "250px", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)" }}>
                  <SignatureCanvas 
                    ref={sigCanvasEntregador}
                    penColor="black"
                    canvasProps={{ style: { width: "100%", height: "100%", cursor: "crosshair" } }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                    <button onClick={() => sigCanvasEntregador.current?.clear()} style={{ background: "none", border: "none", color: "#dc3545", fontWeight: "bold", cursor: "pointer", fontSize: "0.9rem" }}>
                    🧹 Limpar Assinatura
                    </button>
                </div>
              </div>
          </div>
        </div>

        {/* RODAPÉ DO MODAL (BOTÃO CONFIRMAR) */}
        <div style={{ padding: "20px", borderTop: "1px solid #eee", backgroundColor: "#f8f9fa" }}>
          <button
            onClick={handleSignContract}
            disabled={signing}
            style={{
              width: "100%", padding: "18px", fontSize: "1.2rem", backgroundColor: "#28a745",
              color: "white", border: "none", borderRadius: "10px", cursor: "pointer",
              fontWeight: "bold", boxShadow: "0 6px 12px rgba(40,167,69,0.2)",
              transition: "transform 0.1s active"
            }}
          >
            {signing ? "Salvando Protocolo..." : "✅ Confirmar Entrega e Assinar Contrato"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ContractModal;