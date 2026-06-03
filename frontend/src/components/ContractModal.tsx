import { useToast } from '../context/ToastContext';
import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import axios from "axios";
import { useAuth } from "../context/AuthContext"; 
import { 
  CheckCircle, 
  X,
  Download,
  FileCheck
} from 'lucide-react';

interface ItemReserva {
  id: number;
  valor_unitario?: string | number;
  Unidade: {
    id: number;
    Equipamento: {
      nome: string;
    };
  };
}

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
    valor_sinal?: string | number;
    data_inicio: string;
    data_fim: string;
    status: string;
    Usuario?: {
      id: number;
      nome: string;
      email: string;
      cpf?: string;
      cnpj?: string;
      telefone?: string;
    };
    ItemReservas: ItemReserva[];
    Pagamentos?: Pagamento[];
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface StoreConfig {
  cnpj?: string;
  taxa_reagendamento?: string | number;
  telefone_contato?: string;
  email_contato?: string;
}

const ContractModal: React.FC<ContractModalProps> = ({ order, onClose, onSuccess }) => {
  const toast = useToast();
  const sigCanvasCliente = useRef<SignatureCanvas>(null);
  const sigCanvasEntregador = useRef<SignatureCanvas>(null);
  
  const [signing, setSigning] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  
  const [nomeRecebedor, setNomeRecebedor] = useState("");
  const [docRecebedor, setDocRecebedor] = useState("");

  const backendUrl = import.meta.env.VITE_API_URL;
  const { token } = useAuth();

  const formatarTelefone = (tel?: string) => {
    if (!tel) return "Não informado";
    const num = tel.replace(/\D/g, "");
    if (num.length === 11) {
      return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7)}`;
    } else if (num.length === 10) {
      return `(${num.slice(0, 2)}) ${num.slice(2, 6)}-${num.slice(6)}`;
    }
    return tel;
  };

  const formatCPF = (value: string) => {
    const v = value.replace(/\D/g, "").substring(0, 11);
    if (v.length <= 11) {
      return v
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return v;
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setDocRecebedor(formatted);
  };

  React.useEffect(() => {
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
        return toast.error("Erro: Sessão expirada. Atualize a página e tente novamente.");
    }

    if (sigCanvasEntregador.current?.isEmpty()) {
      return toast.error("A assinatura do entregador é OBRIGATÓRIA.");
    }

    if (!nomeRecebedor.trim()) {
      return toast.error("Por favor, informe o nome de quem está recebendo o equipamento.");
    }

    if (sigCanvasCliente.current?.isEmpty()) {
      return toast.error("A assinatura do recebedor é OBRIGATÓRIA.");
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

      setIsSigned(true);
      // Avisa o pai que deu certo (pode atualizar a página por trás), 
      // mas não fechamos o modal ainda para mostrar o botão de download
      onSuccess(); 
    } catch (error) {
      console.error("Erro no servidor:", error);
      toast.error("Erro ao salvar assinaturas. Verifique o console.");
    } finally {
      setSigning(false);
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
        `${backendUrl}/api/reservations/contract/${order.id}`,
        config
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `contrato_locacao_${order.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar contrato:", error);
      toast.error("Erro ao gerar PDF do contrato.");
    } finally {
      setDownloading(false);
    }
  };

  const handleContentClick = (e: React.MouseEvent) => e.stopPropagation();

  const totalPago = order.Pagamentos?.filter(p => p.status_pagamento === 'aprovado').reduce((acc, p) => acc + Number(p.valor), 0) || 0;
  const restanteAPagar = Math.max(0, Number(order.valor_total) - totalPago);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.85)", display: "flex",
      justifyContent: "center", alignItems: "flex-start", zIndex: 9999, 
      padding: "40px 20px", overflowY: "auto"
    }} onClick={onClose}>
      
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
        .header-top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 25px;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
        }
        .company-header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: bold;
        }
        .company-header p {
          margin: 3px 0;
          font-size: 14px;
        }
        .order-id {
          font-size: 20px;
          font-weight: bold;
          text-align: right;
        }
        .section-box {
          border: 1px solid #000;
          margin-bottom: 20px;
        }
        .section-title {
          border-bottom: 1px solid #000;
          background: #f2f2f2;
          padding: 8px 12px;
          font-weight: bold;
          font-size: 16px;
          text-transform: uppercase;
        }
        .section-content {
          padding: 12px;
          font-size: 15px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .table-custom {
          width: 100%;
          border-collapse: collapse;
          font-size: 15px;
        }
        .table-custom th, .table-custom td {
          border: 1px solid #000;
          padding: 8px 12px;
          text-align: left;
        }
        .table-custom th {
          background: #f2f2f2;
          text-transform: uppercase;
          font-weight: bold;
        }
        .summary-banner {
          border: 1.5px solid #000;
          padding: 15px;
          text-align: center;
          font-weight: bold;
          font-size: 18px;
          margin-bottom: 25px;
          background: #fdfdfd;
        }
        .observations-text {
          font-size: 14px;
          line-height: 1.6;
          text-align: justify;
        }
        .observations-text p {
          margin: 8px 0;
        }
        .signature-area {
          margin-top: 50px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
        }
        .sig-container {
          text-align: center;
        }
        .sig-pad {
          border-bottom: 1.5px solid #000;
          height: 140px;
          margin-bottom: 8px;
          position: relative;
          background: #fdfdfd;
        }
        .sig-text {
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

        <div className="header-top">
          <div className="company-header">
            <h1>LOCATOOLS - Locação de Equipamentos</h1>
            <p>CNPJ: {storeConfig?.cnpj || "12.345.678/9000-01"}</p>
            <p>Rua Engenheiro Orlando Drumond Murgel, 154, Parque São Domingos, Pindamonhangaba - SP, 12410-310</p>
            <p>Fone: {storeConfig?.telefone_contato || "(12) 99232-8953"} | {storeConfig?.email_contato || "locatools@comercial.com.br"}</p>
          </div>
          <div className="order-id">Locação número {order.id}</div>
        </div>

        <div className="section-box">
          <div className="section-title">DADOS DA LOCAÇÃO / CLIENTE</div>
          <div className="section-content">
            <div>
              <p><strong>Cliente:</strong> {order.Usuario?.nome}</p>
              <p><strong>CPF/CNPJ:</strong> {order.Usuario?.cpf || order.Usuario?.cnpj || "Não informado"}</p>
              <p><strong>Telefone:</strong> {formatarTelefone(order.Usuario?.telefone)}</p>
              <p><strong>E-mail:</strong> {order.Usuario?.email}</p>
            </div>
            <div>
              <p><strong>Data:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
              <p><strong>Retirada em:</strong> Loja física (Rua Engenheiro Orlando Drumond Murgel, 154, Parque São Domingos, Pindamonhangaba - SP, 12410-310)</p>
            </div>
          </div>
        </div>

        <div className="section-box">
          <div className="section-title">ITENS DA LOCAÇÃO</div>
          <table className="table-custom">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Preço unit.</th>
                <th>Quant.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.ItemReservas.map((item) => (
                <tr key={item.id}>
                  <td>{item.Unidade.Equipamento.nome} (Patrimônio #{item.Unidade.id})</td>
                  <td>R$ {Number(item.valor_unitario || 0).toFixed(2)}</td>
                  <td>1</td>
                  <td>R$ {Number(item.valor_unitario || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "8px 12px", fontSize: "14px" }}>
            <strong>Período:</strong> {new Date(order.data_inicio).toLocaleDateString('pt-BR')} até {new Date(order.data_fim).toLocaleDateString('pt-BR')}
          </div>
          <div style={{ borderTop: "1px solid #000", padding: "8px 12px", textAlign: "right", fontWeight: "bold", fontSize: "16px" }}>
            TOTAL PRODUTOS: {order.ItemReservas.length} | R$ {order.ItemReservas.reduce((acc, i) => acc + Number(i.valor_unitario || 0), 0).toFixed(2)}
          </div>
        </div>

        <div className="section-box">
          <div className="section-title">PAGAMENTO</div>
          <table className="table-custom">
            <thead>
              <tr>
                <th>Valor Total</th>
                <th>Sinal Pago</th>
                <th>Forma de pagamento</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>R$ {Number(order.valor_total).toFixed(2)}</td>
                <td>R$ {Number(order.valor_sinal || 0).toFixed(2)}</td>
                <td>{order.Pagamentos?.[0]?.metodo_detalhe || "Não informado"} R$ {totalPago.toFixed(2)}</td>
                <td>{totalPago >= Number(order.valor_total) ? "Pago Integral" : totalPago > 0 ? "Sinal Pago" : "Pendente"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="summary-banner">
          Valor da Locação: R$ {Number(order.valor_total).toFixed(2)} | Total Pago: R$ {totalPago.toFixed(2)} | Restante a Pagar: R$ {restanteAPagar.toFixed(2)}
        </div>

        <div className="observations-text">
          <p><strong>Observações gerais</strong></p>
          <p><strong>OBSERVAÇÃO GERAL:</strong></p>
          <p><strong>1- DECLARAÇÃO:</strong></p>
          <p>O LOCATÁRIO recebe nesse ato, ou na entrega, por si mesmo ou seu preposto, o(s) bem(ns) móvel(is) referido(s) no presente instrumento e declara:</p>
          <p>a) Tê-lo(s) testado e aprovado(s) e afirma que conhece sua correta utilização e funcionamento, assim se obrigando a devolvê-los em idênticas condições de funcionamento, limpeza e segurança, no final desta locação ou na hipótese de rescisão do presente contrato, ou será aplicada a cobrança do valor/garantia do equipamento/ferramenta;</p>
          <p>b) Que recebeu o(s) manual(is) de instruções de uso e segurança e se compromete a repassá-las a quem for utilizar o(s) mesmo(s);</p>
          <p>c) Que somente permitirá o uso do(s) equipamento(s) por profissional(is) qualificado(s) e capacitado(s) a operá-los;</p>
          <p>d) Que fará uso de todos os equipamentos de segurança (EPI'S) necessários na utilização do(s) bem(ns) móvel(is) alugado(s), bem como seguirá as normas de segurança pertinentes;</p>
          <p>e) O LOCATÁRIO poderá solicitar o reagendamento das datas de locação, sujeito à disponibilidade. Esta solicitação deve ser realizada ÚNICA E EXCLUSIVAMENTE através do sistema da LocaTools. Será cobrada uma taxa administrativa de R$ {Number(storeConfig?.taxa_reagendamento || 0).toFixed(2)} por cada alteração solicitada após a confirmação deste contrato.</p>
          <p>f) A prorrogação deste contrato deve ser realizada EXCLUSIVAMENTE através do site/plataforma. Caso o equipamento não seja devolvido na data prevista e não haja renovação formalizada, será cobrada multa por atraso conforme política vigente;</p>
          <p>g) O equipamento deverá ser devolvido na loja física ou, caso deseje retirada pela equipe, a solicitação deve ser feita obrigatoriamente através do site para geração de protocolo e agendamento;</p>
          <p>h) Ter ciência do tratamento dos dados pessoais fornecidos para realização do presente CONTRATO, nos termos da LGPD;</p>
          <p>i) Devolver o bem nas condições estabelecidas, no fim do contrato — caso o locatário provocar danos ao equipamento ou não devolver em condições favoráveis, será cobrada uma multa;</p>
          <p><strong>RETIRADA EM:</strong> Loja física (Rua Engenheiro Orlando Drumond Murgel, 154, Parque São Domingos, Pindamonhangaba - SP, 12410-310)</p>
          <p><strong>2- FORMA DE PAGAMENTO:</strong></p>
          <p>O pagamento poderá ser efetuado por meio da plataforma online da empresa ou presencialmente na loja física. Na plataforma, são aceitos pagamentos via cartão (crédito ou débito) ou PIX. Na loja física, o pagamento poderá ser realizado por meio de cartão (débito ou crédito) via maquininha, PIX ou dinheiro em espécie.</p>
          <p><strong>3- HORÁRIO DE FUNCIONAMENTO:</strong> Segunda: 07:30 às 18:00 | Terça a Sábado: 08:00 às 18:00 | Domingo: Fechado</p>
        </div>

        <div className="section-box" style={{ marginTop: "25px", border: "none" }}>
            <div className="section-content" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px", padding: '0' }}>
                <div>
                    <label style={{ fontSize: "14px", fontWeight: "bold" }}>NOME DO RECEBEDOR:</label>
                    <input 
                        type="text" 
                        value={nomeRecebedor} 
                        onChange={(e) => setNomeRecebedor(e.target.value)}
                        style={{ width: "100%", border: "none", borderBottom: "1.5px solid #000", fontSize: "16px", outline: "none", padding: "5px 0", fontWeight: 'bold' }}
                    />
                </div>
                <div>
                    <label style={{ fontSize: "14px", fontWeight: "bold" }}>CPF DO RECEBEDOR:</label>
                    <input 
                        type="text" 
                        value={docRecebedor} 
                        onChange={handleDocChange}
                        style={{ width: "100%", border: "none", borderBottom: "1.5px solid #000", fontSize: "16px", outline: "none", padding: "5px 0", fontWeight: 'bold' }}
                    />
                </div>
            </div>
        </div>

        <div className="signature-area">
          <div className="sig-container">
            <div className="sig-pad">
              <SignatureCanvas 
                ref={sigCanvasCliente}
                penColor="black"
                canvasProps={{ style: { width: "100%", height: "100%", cursor: "crosshair" } }}
              />
              <button onClick={() => sigCanvasCliente.current?.clear()} className="no-print" style={{ position: "absolute", right: 0, bottom: -20, background: "none", border: "none", color: "#f00", fontSize: "10px", cursor: "pointer" }}>LIMPAR</button>
            </div>
            <div className="sig-text">ASSINATURA DO RECEBEDOR:</div>
          </div>
          <div className="sig-container">
            <div className="sig-pad">
              <SignatureCanvas 
                ref={sigCanvasEntregador}
                penColor="black"
                canvasProps={{ style: { width: "100%", height: "100%", cursor: "crosshair" } }}
              />
              <button onClick={() => sigCanvasEntregador.current?.clear()} className="no-print" style={{ position: "absolute", right: 0, bottom: -20, background: "none", border: "none", color: "#f00", fontSize: "10px", cursor: "pointer" }}>LIMPAR</button>
            </div>
            <div className="sig-text">ASSINATURA DO ENTREGADOR:</div>
          </div>
        </div>

        {/* ÁREA DE AÇÃO FINAL */}
        <div className="action-footer no-print">
          <div className="digital-badge">
             <h3><FileCheck size={28} /> Contrato de Locação Digital</h3>
             <p>Documento assinado e válido juridicamente.</p>
          </div>

          {!isSigned ? (
             <button
                onClick={handleSignContract}
                disabled={signing}
                className="btn-action btn-sign"
             >
                {signing ? "PROCESSANDO..." : <><CheckCircle size={24} /> FINALIZAR E ASSINAR AGORA</>}
             </button>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="btn-action btn-download"
                >
                    {downloading ? "GERANDO PDF..." : <><Download size={24} /> BAIXAR CONTRATO ASSINADO (PDF)</>}
                </button>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontWeight: 'bold' }}>
                    Fechar e continuar no sistema
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractModal;