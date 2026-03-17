import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

interface ReturnContractModalProps {
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}

const ReturnContractModal: React.FC<ReturnContractModalProps> = ({
  order,
  onClose,
  onSuccess,
}) => {
  const { token } = useAuth();
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verifica se rolou algum prejuízo/avaria nessa locação
  const temPrejuizo = order.ItemReservas.some((item: any) => item.prejuizo);

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSaveSignature = async () => {
    if (sigCanvas.current?.isEmpty()) {
      alert("Por favor, assine antes de confirmar.");
      return;
    }

    setIsSubmitting(true);
    const signatureBase64 = sigCanvas.current
      ?.getCanvas()
      .toDataURL("image/png");
      
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(
        `http://localhost:3001/api/reservations/${order.id}/return-signature`,
        { assinatura: signatureBase64 },
        config
      );

      alert("Termo de devolução assinado com sucesso!");
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar assinatura:", error);
      alert("Erro ao salvar a assinatura. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ marginTop: 0, color: "#2c3e50" }}>Termo de Devolução</h2>
        
        <div style={{ backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "8px", marginBottom: "20px", fontSize: "0.95rem" }}>
          <p><strong>Pedido:</strong> #{order.id}</p>
          <p><strong>Data da Devolução:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
          
          <hr style={{ margin: "15px 0", borderColor: "#ddd" }} />
          
          {temPrejuizo ? (
            <div style={{ color: "#c62828" }}>
              <h4 style={{ margin: "0 0 10px 0" }}>⚠️ AVISO DE AVARIA / OCORRÊNCIA</h4>
              <p style={{ margin: 0 }}>
                Declaro que acompanhei a vistoria de devolução dos equipamentos referentes a este contrato e <strong>ESTOU CIENTE das avarias, perdas ou faltas de peças registradas</strong>. 
                Reconheço que os valores de reparo ou reposição serão apurados e cobrados conforme as regras de locação.
              </p>
            </div>
          ) : (
            <div style={{ color: "#28a745" }}>
              <h4 style={{ margin: "0 0 10px 0" }}>✅ DEVOLUÇÃO SEM PENDÊNCIAS</h4>
              <p style={{ margin: 0 }}>
                Declaro que devolvi os equipamentos referentes a este contrato em <strong>perfeitas condições de funcionamento e limpeza</strong>, não havendo avarias, perdas ou pendências físicas.
              </p>
            </div>
          )}
        </div>

        <div style={{ border: "2px dashed #ccc", borderRadius: "8px", backgroundColor: "#fff" }}>
          <SignatureCanvas
            ref={sigCanvas}
            penColor="black"
            canvasProps={{
              width: 500,
              height: 200,
              className: "sigCanvas",
              style: { width: "100%", height: "200px", cursor: "crosshair" },
            }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15px" }}>
          <button onClick={clearSignature} style={btnLimparStyle}>
            Limpar Assinatura
          </button>
          
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={onClose} style={btnCancelarStyle}>
              Cancelar
            </button>
            <button onClick={handleSaveSignature} disabled={isSubmitting} style={btnSalvarStyle}>
              {isSubmitting ? "Salvando..." : "Confirmar e Assinar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- ESTILOS ---
const overlayStyle: React.CSSProperties = {
  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: "rgba(0,0,0,0.7)", display: "flex",
  justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px"
};
const modalStyle: React.CSSProperties = {
  backgroundColor: "white", padding: "2rem", borderRadius: "12px",
  width: "100%", maxWidth: "600px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
};
const btnLimparStyle: React.CSSProperties = {
  padding: "8px 15px", backgroundColor: "#f8f9fa", border: "1px solid #ccc",
  borderRadius: "6px", cursor: "pointer", fontWeight: "bold", color: "#555"
};
const btnCancelarStyle: React.CSSProperties = {
  padding: "10px 20px", backgroundColor: "#6c757d", color: "white",
  border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold"
};
const btnSalvarStyle: React.CSSProperties = {
  padding: "10px 20px", backgroundColor: "#007bff", color: "white",
  border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold"
};

export default ReturnContractModal;