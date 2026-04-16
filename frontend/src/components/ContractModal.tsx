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
}

const ContractModal: React.FC<ContractModalProps> = ({ order, onClose, onSuccess }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [signing, setSigning] = useState(false);
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const backendUrl = import.meta.env.VITE_API_URL;
  
  const { token } = useAuth();

  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/config`);
        setStoreConfig(data);
      } catch (error) {
        console.error("Erro ao buscar config da loja:", error);
      }
    };
    fetchConfig();
  }, [backendUrl]);

  const handleSignContract = async () => {
    if (!token) {
        return alert("Erro: Sessão expirada. Atualize a página e tente novamente.");
    }

    if (sigCanvas.current?.isEmpty()) {
      return alert("Por favor, assine no quadro no final do documento antes de confirmar.");
    }

    setSigning(true);
    try {
      // Pega o desenho e transforma em texto
      const assinaturaDataUrl = sigCanvas.current?.getCanvas().toDataURL("image/png");

      await axios.put(
        `${backendUrl}/api/reservations/${order.id}/sign`,
        { assinatura_cliente: assinaturaDataUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Contrato assinado com sucesso! A retirada está liberada.");
      onSuccess(); 
    } catch (error) {
      console.error("Erro no servidor:", error);
      alert("Erro ao salvar assinatura. Verifique o console.");
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
          <h2 style={{ margin: 0, color: "#2c3e50", fontSize: "1.4rem" }}>Contrato de Locação</h2>
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
          
          {order.Pagamentos && order.Pagamentos.length > 0 && (
            <div style={{ marginTop: "10px", padding: "10px", border: "1px solid #eee", borderRadius: "8px", backgroundColor: "#fafafa" }}>
              <p style={{ margin: "0 0 10px 0" }}><strong>HISTÓRICO DE PAGAMENTOS:</strong></p>
              {order.Pagamentos.filter((p) => p.status_pagamento === 'aprovado').map((p) => {
                let metodo = p.metodo_detalhe ? p.metodo_detalhe.toUpperCase() : 'NÃO INFORMADO';
                
                // Normaliza o método para evitar duplicação 
                if (p.parcelas > 1) {
                  metodo = `CARTÃO DE CRÉDITO`;
                } else if (p.cartao_final || metodo.includes('CARD')) {
                  metodo = `CARTÃO (À VISTA)`;
                } else if (metodo.includes('PIX')) {
                  metodo = 'PIX';
                }

                const valorTotalPagoMP = Number(p.valor); // valor base do BD
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
                 <p style={{ margin: "5px 0" }}>
                   Total Pago: <strong>R$ {order.Pagamentos.filter(p => p.status_pagamento === 'aprovado').reduce((acc, p) => acc + Number(p.valor), 0).toFixed(2)}</strong>
                 </p>
                 {Number(order.valor_total) - order.Pagamentos.filter(p => p.status_pagamento === 'aprovado').reduce((acc, p) => acc + Number(p.valor), 0) > 0.01 && (
                   <p style={{ margin: "5px 0", color: "#d9534f" }}>
                     Restante a Pagar: <strong>R$ {(Number(order.valor_total) - order.Pagamentos.filter(p => p.status_pagamento === 'aprovado').reduce((acc, p) => acc + Number(p.valor), 0)).toFixed(2)}</strong>
                   </p>
                 )}
              </div>
            </div>
          )}
          
          {(!order.Pagamentos || order.Pagamentos.every((p) => p.status_pagamento !== 'aprovado')) && (
             <p><strong>FORMA DE PAGAMENTO:</strong> A COMBINAR / PENDENTE</p>
          )}

          <h4 style={{ backgroundColor: "#f0f0f0", padding: "8px", borderRadius: "4px", marginTop: "20px" }}>4. TERMOS E CONDIÇÕES</h4>
          <p>4.1. O Locatário se compromete a utilizar o equipamento de forma correta e segura.</p>
          <p>4.2. O equipamento deverá ser devolvido nas mesmas condições da Vistoria de Saída.</p>
          <p>4.3. Danos, perdas, furtos ou devolução com atraso acarretarão em multas e cobranças adicionais.</p>

          {/* ÁREA DE ASSINATURA */}
          <div style={{ marginTop: "40px", borderTop: "2px dashed #ccc", paddingTop: "30px" }}>
            <h3 style={{ textAlign: "center", color: "#007bff", marginBottom: "5px" }}>Assinatura Digital do Locatário</h3>
            <p style={{ textAlign: "center", color: "#666", fontSize: "0.9rem", marginBottom: "20px" }}>
              Utilize o mouse ou o dedo na tela para assinar no quadro abaixo.
            </p>

            <div style={{ border: "2px solid #ccc", borderRadius: "8px", backgroundColor: "#fcfcfc", height: "200px", position: "relative" }}>
              <SignatureCanvas 
                ref={sigCanvas}
                penColor="black"
                canvasProps={{ className: "sigCanvas", style: { width: "100%", height: "100%", cursor: "crosshair" } }}
              />
            </div>
            
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
              <button onClick={() => sigCanvas.current?.clear()} style={{ background: "none", border: "none", color: "#dc3545", fontWeight: "bold", cursor: "pointer" }}>
                🧹 Limpar Assinatura
              </button>
            </div>
          </div>
        </div>

        {/* RODAPÉ DO MODAL (BOTÃO CONFIRMAR) */}
        <div style={{ padding: "20px", borderTop: "1px solid #eee", backgroundColor: "#f8f9fa" }}>
          <button
            onClick={handleSignContract}
            disabled={signing}
            style={{
              width: "100%", padding: "15px", fontSize: "1.1rem", backgroundColor: "#28a745",
              color: "white", border: "none", borderRadius: "8px", cursor: "pointer",
              fontWeight: "bold", boxShadow: "0 4px 6px rgba(40,167,69,0.2)"
            }}
          >
            {signing ? "Salvando Documento..." : "✅ Confirmar Assinatura e Aceitar Termos"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ContractModal;