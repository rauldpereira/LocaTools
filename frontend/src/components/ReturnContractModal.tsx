import { useToast } from '../context/ToastContext';
import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { 
  X, 
  CheckCircle, 
  AlertTriangle,
  Download,
  FileCheck
} from 'lucide-react';

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
  const toast = useToast();
  const { token } = useAuth();
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const temPrejuizo = order.ItemReservas.some((item: any) => item.prejuizo);

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSaveSignature = async () => {
    if (sigCanvas.current?.isEmpty()) {
      toast.error("Por favor, assine antes de confirmar.");
      return;
    }

    setIsSubmitting(true);
    const signatureBase64 = sigCanvas.current
      ?.getCanvas()
      .toDataURL("image/png");
      
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/reservations/${order.id}/return-signature`,
        { assinatura: signatureBase64 },
        config
      );

      setIsSigned(true);
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar assinatura:", error);
      toast.error("Erro ao salvar a assinatura. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob" as "json",
      };
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/reservations/return-contract/${order.id}`,
        config
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `termo_devolucao_${order.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar termo de devolução:", error);
      toast.error("Erro ao gerar PDF do termo.");
    } finally {
      setDownloading(false);
    }
  };

  const handleContentClick = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div style={overlayStyle} onClick={onClose}>
      <style>{`
        .a4-page {
          background: white;
          width: 100%;
          max-width: 900px;
          min-height: 1100px;
          margin: 0 auto;
          box-shadow: 0 0 40px rgba(0,0,0,0.6);
          padding: 60px 80px;
          font-family: Arial, sans-serif;
          color: #000;
          position: relative;
          letter-spacing: normal;
          word-spacing: normal;
          line-height: 1.4;
          border-radius: 4px;
        }
        @media (max-width: 768px) {
          .a4-page {
            padding: 30px 40px;
          }
        }
        .contract-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .contract-title {
          font-size: 24px;
          font-weight: bold;
          text-transform: uppercase;
          margin: 5px 0;
        }
        .contract-section-title {
          font-size: 16px;
          font-weight: bold;
          margin-top: 30px;
          margin-bottom: 12px;
          border-bottom: 1px solid #000;
          padding: 8px 12px;
          text-transform: uppercase;
          background: #f2f2f2;
        }
        .contract-text {
          font-size: 15px;
          line-height: 1.6;
          text-align: left;
        }
        .status-box {
          border: 1px solid #000;
          padding: 20px;
          background: #f9f9f9;
          margin-top: 15px;
        }
        .signature-field {
          margin-top: 60px;
          max-width: 450px;
          margin-left: auto;
          margin-right: auto;
          text-align: center;
        }
        .sig-canvas-container {
          border-bottom: 1.5px solid #000;
          margin-bottom: 8px;
          height: 160px;
          position: relative;
          background: #fdfdfd;
        }
        .sig-label {
          font-size: 13px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .action-footer {
          margin-top: 60px;
          border-top: 2px solid #000;
          padding-top: 30px;
          text-align: center;
        }
        .digital-badge {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 25px;
        }
        .digital-badge h3 {
          margin: 0;
          font-size: 22px;
          color: #10b981;
          font-weight: 800;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .digital-badge p {
          margin: 5px 0 0 0;
          font-size: 15px;
          color: #4b5563;
          font-weight: 600;
        }
        .btn-action {
          width: 100%;
          max-width: 500px;
          padding: 20px;
          font-size: 20px;
          font-weight: 900;
          text-transform: uppercase;
          cursor: pointer;
          border: none;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.2s;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .btn-sign {
          background: #10b981;
          color: white;
        }
        .btn-sign:hover {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .btn-download {
          background: #3b82f6;
          color: white;
        }
        .btn-download:hover {
          background: #2563eb;
          transform: translateY(-2px);
        }
        .btn-action:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
        }
        .btn-close-top {
          position: absolute;
          top: 20px;
          right: 20px;
          background: #f3f4f6;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #4b5563;
          transition: all 0.2s;
        }
        .btn-close-top:hover {
          background: #e5e7eb;
          color: #111827;
        }
        .no-print {
          @media print {
            display: none;
          }
        }
      `}</style>

      <div className="a4-page" onClick={handleContentClick}>
        <button onClick={onClose} className="btn-close-top no-print">
          <X size={24} />
        </button>

        <div className="contract-header">
          <div style={{ fontSize: "16px", fontWeight: "bold" }}>LOCATOOLS - LOCAÇÃO DE EQUIPAMENTOS</div>
          <div className="contract-title">Termo de Devolução e Quitação</div>
          <div style={{ fontSize: "15px", fontWeight: "bold" }}>REFERENTE AO PEDIDO Nº: {order.id} | DATA: {new Date().toLocaleDateString('pt-BR')}</div>
        </div>

        <div className="contract-text">
          <p>
            Pelo presente instrumento, o <strong>LOCATÁRIO</strong> declara ter realizado a devolução dos equipamentos objeto do contrato de locação supracitado, nas condições abaixo descritas:
          </p>

          <div className="contract-section-title">1. STATUS DA DEVOLUÇÃO</div>
          
          {temPrejuizo ? (
            <div className="status-box">
              <h4 style={{ margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: "10px", color: "#000", fontSize: "16px" }}>
                <AlertTriangle size={22} /> OCORRÊNCIA REGISTRADA
              </h4>
              <p style={{ margin: 0 }}>
                Declaro que acompanhei a vistoria de devolução e estou ciente de que foram registradas <strong>AVARIAS, PERDAS ou DANOS</strong> nos equipamentos. 
                Reconheço a responsabilidade pelo ressarcimento dos prejuízos causados, cujo valor será apurado e cobrado conforme as normas vigentes da LOCADORA.
              </p>
            </div>
          ) : (
            <div className="status-box">
              <h4 style={{ margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: "10px", color: "#000", fontSize: "16px" }}>
                <CheckCircle size={22} /> DEVOLUÇÃO INTEGRAL SEM PENDÊNCIAS
              </h4>
              <p style={{ margin: 0 }}>
                Declaro que os equipamentos foram devolvidos em perfeitas condições de uso, limpeza e conservação, não havendo qualquer pendência física ou avaria constatada no ato da conferência.
              </p>
            </div>
          )}

          <div className="contract-section-title">2. DECLARAÇÃO FINAL</div>
          <p>
            O LOCATÁRIO dá plena quitação quanto à posse física dos bens devolvidos, permanecendo responsável por eventuais débitos financeiros remanescentes ou danos ocultos não detectados na vistoria preliminar.
          </p>

          <div className="signature-field">
            <div className="sig-canvas-container">
              <SignatureCanvas
                ref={sigCanvas}
                penColor="black"
                canvasProps={{
                  width: 500,
                  height: 160,
                  className: "sigCanvas",
                  style: { width: "100%", height: "100%", cursor: "crosshair" },
                }}
              />
              <button onClick={clearSignature} className="no-print" style={{ position: "absolute", right: 10, bottom: 10, background: "#fff", border: "1px solid #ccc", color: "#f00", fontSize: "11px", cursor: "pointer", padding: "2px 8px" }}>LIMPAR</button>
            </div>
            <div className="sig-label">ASSINATURA DO LOCATÁRIO / CLIENTE</div>
          </div>

          {/* ÁREA DE AÇÃO FINAL */}
          <div className="action-footer no-print">
            <div className="digital-badge">
               <h3><FileCheck size={28} /> Quitação de Devolução Digital</h3>
               <p>Documento assinado e válido juridicamente.</p>
            </div>

            {!isSigned ? (
               <button
                  onClick={handleSaveSignature}
                  disabled={isSubmitting}
                  className="btn-action btn-sign"
               >
                  {isSubmitting ? "PROCESSANDO..." : <><CheckCircle size={24} /> CONFIRMAR E ASSINAR DEVOLUÇÃO</>}
               </button>
            ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                  <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="btn-action btn-download"
                  >
                      {downloading ? "GERANDO PDF..." : <><Download size={24} /> BAIXAR TERMO ASSINADO (PDF)</>}
                  </button>
                  <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontWeight: 'bold' }}>
                      Fechar e encerrar processo
                  </button>
               </div>
            )}
          </div>

          <div style={{ marginTop: "50px", textAlign: "center", fontSize: "12px", color: "#666", borderTop: "1px dashed #ccc", paddingTop: "15px" }}>
            Este termo de devolução é um registro digital gerado pelo sistema LocaTools em {new Date().toLocaleString('pt-BR')}.
          </div>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: "rgba(0,0,0,0.85)", display: "flex",
  justifyContent: "center", alignItems: "flex-start", zIndex: 9999, 
  padding: "40px 20px", overflowY: "auto"
};

export default ReturnContractModal;