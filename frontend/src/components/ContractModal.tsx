import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import axios from "axios";
import { useAuth } from "../context/AuthContext"; 

interface ContractModalProps {
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}

const ContractModal: React.FC<ContractModalProps> = ({ order, onClose, onSuccess }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [signing, setSigning] = useState(false);
  const [storeConfig, setStoreConfig] = useState<any>(null);
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
    } catch (error: any) {
      console.error("Erro no servidor:", error.response || error);
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
            {order.ItemReservas.map((item: any) => (
              <li key={item.id}><strong>{item.Unidade.Equipamento.nome}</strong> (Patrimônio #{item.Unidade.id})</li>
            ))}
          </ul>

          <h4 style={{ backgroundColor: "#f0f0f0", padding: "8px", borderRadius: "4px", marginTop: "20px" }}>3. VALORES E VIGÊNCIA</h4>
          <p>O valor total deste contrato é de <strong>R$ {Number(order.valor_total).toFixed(2)}</strong>. A locação tem início em <strong>{new Date(order.data_inicio).toLocaleDateString()}</strong> e término em <strong>{new Date(order.data_fim).toLocaleDateString()}</strong>.</p>

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