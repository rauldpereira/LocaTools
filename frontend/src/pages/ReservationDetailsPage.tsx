import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios, { type AxiosRequestConfig } from "axios";
import { useAuth } from "../context/AuthContext";
import RescheduleModal from "../components/RescheduleModal";
import HorarioFuncionamento from "../components/HorarioFuncionamentoDisplay";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ContractModal from "../components/ContractModal";
import ReturnContractModal from "../components/ReturnContractModal";
import { ArrowLeft, Download, FileText, FileCode2, Info, CheckCircle, Package, Truck, AlertTriangle, AlertCircle, RefreshCw, XCircle, MapPin, DollarSign, Clock, Check, FileSignature, HelpCircle, CreditCard, ShieldAlert, Store, X, ClipboardCheck } from "lucide-react";
import { useToast } from '../context/ToastContext';

interface TipoAvaria {
  id: number;
  descricao: string;
  preco: string;
}
interface Equipamento {
  nome: string;
  url_imagem: string;
  TipoAvarias: TipoAvaria[];
}
interface Unidade {
  id: number;
  Equipamento: Equipamento;
}
interface AvariaEncontrada {
  id: number;
  id_tipo_avaria: number;
  TipoAvaria: TipoAvaria;
}
interface DetalheVistoria {
  id: number;
  id_item_equipamento: number;
  condicao: string;
  comentarios: string;
  foto: string[] | null;
}
interface DetalheVistoriaFeita {
  id: number;
  condicao: string;
  comentarios: string;
  foto: string[] | null;
  id_item_equipamento: number;
  avariasEncontradas: AvariaEncontrada[];
}
interface Vistoria {
  id: number;
  tipo_vistoria: "entrega" | "devolucao";
  data: string;
  detalhes: DetalheVistoria[];
}

interface ItemReserva {
  id: number;
  status?: string;
  Unidade: Unidade;
  prejuizo?: {
    id: number;
    tipo: string;
    valor_prejuizo: string | number;
    observacao: string;
    resolvido: boolean;
    data_resolucao?: string;
    forma_recuperacao?: string;
    createdAt: string;
  } | null;
}

interface OrderDetails {
  id: number;
  id_usuario: number;
  Usuario?: {
    id: number;
    nome: string;
    email: string;
    cpf?: string;
    cnpj?: string;
    telefone?: string;
  };
  status: string;
  data_inicio: string;
  data_fim: string;
  valor_total: string;
  valor_sinal: string;
  tipo_entrega: string;
  endereco_entrega?: string;
  custo_frete: string;
  taxa_avaria: string;
  taxa_atraso?: string;
  taxa_cancelamento?: string;
  valor_reembolsado?: string;
  taxa_remarcacao?: string;
  ItemReservas: ItemReserva[];
  Vistorias: Vistoria[];
  Pagamentos?: any[];
  createdAt?: string;
  assinatura_devolucao?: string;
  data_assinatura_devolucao?: string;
  solicitou_devolucao?: boolean;
  coleta_confirmada?: boolean;
  motivo_cancelamento?: string;
}

const parseDateStringAsLocal = (dateString: string) => {
  if (!dateString) return new Date();

  const dateOnly = String(dateString).substring(0, 10);

  const [year, month, day] = dateOnly.split("-").map(Number);
  const finalDate = new Date(year, month - 1, day);

  return finalDate;
};

const ReservationDetailsPage: React.FC = () => {
  const toast = useToast();
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { token, user, hasPermission } = useAuth();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [contractLoading, setContractLoading] = useState(false);
  const backendUrl = import.meta.env.VITE_API_URL;
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [lojaConfig, setLojaConfig] = useState<any>(null);

  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [recoverMethod, setRecoverMethod] = useState("pix");
  const [isRecovering, setIsRecovering] = useState(false);
  const [customDebtAmount, setCustomDebtAmount] = useState<number | string>(0);

  const [showConfirmReturnModal, setShowConfirmReturnModal] = useState(false);
  const [isRequestingReturn, setIsRequestingReturn] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchOrderDetails = async () => {
    if (!token || !orderId) return;
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(
        `${backendUrl}/api/reservations/${orderId}`,
        config,
      );
      setOrder(data);
    } catch (error) {
      console.error("Erro ao buscar detalhes do pedido:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLojaConfig = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/config`);
      setLojaConfig(data);
    } catch (error) {
      console.error("Erro ao buscar configurações da loja:", error);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
    fetchLojaConfig();
  }, [orderId, token]);

  const subtotal = order ? Number(order.valor_total) - Number(order.custo_frete) : 0;
  const valorTotalAjustado = order
    ? Number(order.valor_total) + Number(order.taxa_avaria || 0) + Number(order.taxa_remarcacao || 0) + Number(order.taxa_atraso || 0)
    : 0;


  //  DOCUMENTO FISCAL DE LOCAÇÃO DE BENS MÓVEIS (DFE Pós-Reforma)
  const handleDownloadDFE = () => {
    if (!order) return;
    const doc = new jsPDF();
    const m = 10;
    let y = 10;

    const numDfe = String(order.id).padStart(6, "0");
    const dataEmissao = new Date().toLocaleDateString("pt-BR");
    const uuidDocumento = crypto.randomUUID().toUpperCase();
    const ambiente = "HOMOLOGAÇÃO (SIMULAÇÃO)";

    const dInicio = parseDateStringAsLocal(order.data_inicio);
    const dFim = parseDateStringAsLocal(order.data_fim);
    const diffTime = Math.abs(dFim.getTime() - dInicio.getTime());
    const totalDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const labelDias = totalDias === 1 ? "dia" : "dias";

    // CABEÇALHO
    doc.rect(m, y, 190, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Documento Fiscal de Locação de Bens Móveis", m + 50, y + 8);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`ID ÚNICO (UUID): ${uuidDocumento}`, m + 50, y + 14);
    doc.text(`AMBIENTE: ${ambiente}   |   TIPO: LOCACAO`, m + 50, y + 20);
    doc.setFont("helvetica", "bold");
    doc.text(`Nº: ${numDfe}   |   SÉRIE: A1   |   EMISSÃO: ${dataEmissao}`, m + 50, y + 26);

    y += 35;
    // EMITENTE
    doc.rect(m, y, 190, 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("EMITENTE (LOCADOR)", m + 2, y + 5);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Razão Social: LOCATOOLS EQUIPAMENTOS LTDA`, m + 2, y + 11);
    doc.text(`CNPJ: 12.345.678/0001-99   |   Município: Pindamonhangaba - SP`, m + 2, y + 17);

    y += 25;
    // TOMADOR
    doc.rect(m, y, 190, 22);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE (LOCATÁRIO)", m + 2, y + 5);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const identificacaoTomador = order.Usuario?.cpf || order.Usuario?.cnpj || "Não informado";
    doc.text(`Nome/Razão Social: ${order.Usuario?.nome || "Cliente Padrão"}`, m + 2, y + 11);
    doc.text(`CPF/CNPJ: ${identificacaoTomador}   |   E-mail: ${order.Usuario?.email || "N/A"}`, m + 2, y + 17);

    y += 25;
    // ITENS
    const dataInicioStr = dInicio.toLocaleDateString("pt-BR");
    const dataFimStr = dFim.toLocaleDateString("pt-BR");

    const tableData = order.ItemReservas.map((item, idx) => [
      (idx + 1).toString(),
      `${item.Unidade.Equipamento.nome} (Patrimônio #${item.Unidade.id})\nPeríodo: ${dataInicioStr} a ${dataFimStr} (${totalDias} ${labelDias})`,
      "1",
      `R$ ${(Number(order.valor_total) / order.ItemReservas.length).toFixed(2)}`,
      `R$ ${(Number(order.valor_total) / order.ItemReservas.length).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Item", "Descrição", "Qtde", "V. Unit", "Total"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2.5 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 103 },
        2: { cellWidth: 15, halign: "center" },
        3: { cellWidth: 30, halign: "center" },
        4: { cellWidth: 30, halign: "center" }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // VALORES E CLASSIFICAÇÃO
    doc.rect(m, y, 90, 35);
    doc.setFont("helvetica", "bold");
    doc.text("VALORES", m + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(`Valor Bruto: R$ ${valorTotalAjustado.toFixed(2)}`, m + 2, y + 12);
    doc.text(`Desconto: R$ 0,00`, m + 2, y + 18);
    doc.setFont("helvetica", "bold");
    doc.text(`VALOR LÍQUIDO: R$ ${valorTotalAjustado.toFixed(2)}`, m + 2, y + 28);

    doc.rect(m + 100, y, 90, 35);
    doc.setFont("helvetica", "bold");
    doc.text("CLASSIFICAÇÃO FISCAL", m + 102, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(`Natureza: Locação de Bens Móveis`, m + 102, y + 12);
    doc.text(`CTN: 99.01.01`, m + 102, y + 18);
    doc.text(`NBS: 111`, m + 102, y + 24);

    y += 40;
    // TRIBUTOS
    doc.rect(m, y, 190, 25);
    doc.setFont("helvetica", "bold");
    doc.text("TRIBUTOS", m + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(`ISS: Não Incidente`, m + 2, y + 10);
    doc.text(`IBS: Não incidente (fase atual)`, m + 2, y + 15);
    doc.text(`CBS: Não incidente (fase atual)`, m + 2, y + 20);

    y += 30;
    // OBSERVAÇÕES
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVAÇÕES", m, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const obsText = "Documento emitido em ambiente de homologação (simulação). Operação de locação de bens móveis, sem prestação de serviço, conforme legislação vigente e em conformidade com a fase de transição da reforma tributária (LC 214/2025).";
    doc.text(obsText, m, y + 5, { maxWidth: 190 });

    doc.save(`DFE_Locacao_${numDfe}.pdf`);
  };

  //  GERADOR DO XML DFE (Seguindo o padrão JSON solicitado)
  const handleDownloadXmlDFE = () => {
    if (!order) return;
    const numDfe = String(order.id).padStart(6, "0");
    const dataEmissao = new Date().toISOString();
    const uuidDocumento = crypto.randomUUID().toUpperCase();

    const dInicio = parseDateStringAsLocal(order.data_inicio);
    const dFim = parseDateStringAsLocal(order.data_fim);
    const diffTime = Math.abs(dFim.getTime() - dInicio.getTime());
    const totalDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const labelDias = totalDias === 1 ? "dia" : "dias";
    
    const dfeData = {
      documentoFiscal: {
        uuid: uuidDocumento,
        numero: numDfe,
        serie: "A1",
        dataEmissao: dataEmissao,
        tipoDocumento: "LOCACAO",
        ambiente: "HOMOLOGACAO",
        status: "EMITIDO"
      },
      emitente: {
        razaoSocial: "LocaTools Equipamentos LTDA",
        cnpj: "12345678000199",
        inscricaoMunicipal: "12345",
        endereco: {
          logradouro: "Rua dos Ipes",
          numero: "123",
          bairro: "Centro",
          municipio: "Pindamonhangaba",
          uf: "SP",
          cep: "12400000"
        }
      },
      tomador: {
        nome: order.Usuario?.nome || "Cliente (Locatário)",
        cpfCnpj: order.Usuario?.cpf || order.Usuario?.cnpj || "00000000000",
        tipo: order.Usuario?.cnpj ? "PJ" : "PF"
      },
      itens: order.ItemReservas.map(item => ({
        descricao: `${item.Unidade.Equipamento.nome} (Patrimônio #${item.Unidade.id})`,
        periodo: {
          inicio: dInicio.toISOString().split('T')[0],
          fim: dFim.toISOString().split('T')[0],
          quantidadeDias: totalDias,
          unidade: labelDias
        },
        quantidade: 1,
        valorUnitario: (Number(order.valor_total) / order.ItemReservas.length).toFixed(2),
        valorTotal: (Number(order.valor_total) / order.ItemReservas.length).toFixed(2)
      })),
      valores: {
        valorBruto: valorTotalAjustado.toFixed(2),
        desconto: "0.00",
        valorLiquido: valorTotalAjustado.toFixed(2)
      },
      classificacaoFiscal: {
        naturezaOperacao: "Locação de bens móveis",
        ctn: "99.01.01",
        nbs: "111"
      },
      tributos: {
        iss: "Não incidente",
        ibs: "Não incidente (fase atual)",
        cbs: "Não incidente (fase atual)"
      },
      observacoes: "Documento emitido em ambiente de homologação (simulação). Locação de bens móveis sem prestação de serviço, conforme LC 214/2025.",
      controle: {
        dataGeracao: dataEmissao
      }
    };

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<DFE>
  <DocumentoFiscal>
    <UUID>${dfeData.documentoFiscal.uuid}</UUID>
    <TipoDocumento>${dfeData.documentoFiscal.tipoDocumento}</TipoDocumento>
    <Ambiente>${dfeData.documentoFiscal.ambiente}</Ambiente>
    <Numero>${dfeData.documentoFiscal.numero}</Numero>
    <Serie>${dfeData.documentoFiscal.serie}</Serie>
    <DataEmissao>${dfeData.documentoFiscal.dataEmissao}</DataEmissao>
    <Status>${dfeData.documentoFiscal.status}</Status>
  </DocumentoFiscal>
  <Emitente>
    <RazaoSocial>${dfeData.emitente.razaoSocial}</RazaoSocial>
    <Cnpj>${dfeData.emitente.cnpj}</Cnpj>
    <Endereco>
      <Municipio>${dfeData.emitente.endereco.municipio}</Municipio>
      <UF>${dfeData.emitente.endereco.uf}</UF>
    </Endereco>
  </Emitente>
  <Tomador>
    <Nome>${dfeData.tomador.nome}</Nome>
    <CpfCnpj>${dfeData.tomador.cpfCnpj}</CpfCnpj>
  </Tomador>
  <Itens>
    ${dfeData.itens.map(i => `
    <Item>
      <Descricao>${i.descricao}</Descricao>
      <PeriodoLocacao>
        <InicioISO>${i.periodo.inicio}</InicioISO>
        <FimISO>${i.periodo.fim}</FimISO>
        <Quantidade>${i.periodo.quantidadeDias}</Quantidade>
        <Unidade>${i.periodo.unidade}</Unidade>
      </PeriodoLocacao>
      <ValorTotal>${i.valorTotal}</ValorTotal>
    </Item>`).join('')}
  </Itens>
  <Tributacao>
    <ISS>${dfeData.tributos.iss}</ISS>
    <IBS>${dfeData.tributos.ibs}</IBS>
    <CBS>${dfeData.tributos.cbs}</CBS>
  </Tributacao>
  <Observacoes>${dfeData.observacoes}</Observacoes>
  <Controle>
    <DataGeracao>${dfeData.controle.dataGeracao}</DataGeracao>
  </Controle>
</DFE>`;

    const blob = new Blob([xmlContent], { type: "application/xml" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `DFE_XML_${numDfe}.xml`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadContract = async () => {
    setContractLoading(true);
    try {
      const config: AxiosRequestConfig = {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      };
      const response = await axios.get(
        `${backendUrl}/api/reservations/contract/${orderId}`,
        config,
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `contrato_reserva_${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Erro ao baixar contrato.");
    } finally {
      setContractLoading(false);
    }
  };

  const handleDownloadReturnContract = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob" as "json", // Blob porque é arquivo PDF
      };
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/reservations/return-contract/${orderId}`,
        config,
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `termo_devolucao_${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Erro ao baixar termo de devolução:", error);
      toast.error("Erro ao baixar o termo de devolução.");
    }
  };

  const confirmRequestReturn = async () => {
    setIsRequestingReturn(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(
        `${backendUrl}/api/reservations/${orderId}/request-return`,
        {},
        config,
      );

      setOrder((prev) => prev ? { ...prev, solicitou_devolucao: true } : prev);

      // Fecha o modal de confirmação
      setShowConfirmReturnModal(false);
    } catch (error) {
      console.error("Erro ao solicitar recolhimento:", error);
      toast.error("Erro de conexão ao tentar solicitar. Tente novamente.");
    } finally {
      setIsRequestingReturn(false);
    }
  };

  const getNomeTipoPrejuizo = (tipo: string) => {
    const map: any = {
      ROUBO: "Não Devolvido / Extraviado",
      AVARIA: "Perda Total",
      CALOTE: "Inadimplência",
      EXTRAVIO: "Extraviado",
    };
    return map[tipo] || tipo;
  };

  const formatarPagamento = (forma: string | undefined) => {
    if (!forma) return "Manual";
    const map: any = {
      manual_balcao: "Pagamento Manual",
      pix: "Pix",
      cartao: "Cartão de Crédito/Débito",
      dinheiro: "Dinheiro",
    };
    return map[forma] || forma;
  };

  const VistoriaDetailDisplay = ({
    title,
    detail,
  }: {
    title: string;
    detail: DetalheVistoria | DetalheVistoriaFeita | undefined;
  }) => {
    if (!detail) return null;
    const avarias = (detail as DetalheVistoriaFeita).avariasEncontradas;
    return (
      <div
        style={{
          marginTop: "15px",
          backgroundColor: "#f8fafc",
          padding: "20px",
          borderRadius: "10px",
          borderLeft: "4px solid #3b82f6",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "15px" }}>
          <FileText size={18} color="#3b82f6" />
          <h4
            style={{
              margin: 0,
              color: "#1e293b",
              fontSize: "1.05rem"
            }}
          >
            {title}
          </h4>
        </div>
        
        <div style={{ marginBottom: "15px" }}>
          {detail.condicao === "ok" ? (
            <span style={{ color: "#10b981", fontWeight: "800", backgroundColor: "#ecfdf5", padding: "6px 12px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle size={16} /> OK / Bom Estado
            </span>
          ) : (
            <span style={{ color: "#ef4444", fontWeight: "800", backgroundColor: "#fef2f2", padding: "6px 12px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <AlertTriangle size={16} /> Com Avarias
            </span>
          )}
        </div>
        
        {detail.comentarios && (
          <div style={{ color: "#475569", fontSize: "0.95rem", fontStyle: "italic", backgroundColor: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", gap: "10px", marginBottom: "15px" }}>
            <Info size={18} color="#94a3b8" style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>"{detail.comentarios}"</span>
          </div>
        )}

        {avarias && avarias.length > 0 && (
          <div style={{ margin: "15px 0", backgroundColor: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <strong style={{ color: "#ef4444", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <AlertTriangle size={16} /> Avarias Identificadas:
            </strong>
            <ul
              style={{ margin: 0, paddingLeft: "25px", color: "#475569", fontWeight: "600", fontSize: "0.9rem" }}
            >
              {avarias.map((avaria) => (
                <li key={avaria.id} style={{ marginBottom: "4px" }}>
                  {avaria.TipoAvaria.descricao}
                  {Number(avaria.TipoAvaria.preco) > 0 &&
                    ` (R$ ${Number(avaria.TipoAvaria.preco).toFixed(2)})`}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {detail.foto && detail.foto.length > 0 && (
          <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px dashed #cbd5e1" }}>
            <strong style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "15px", fontSize: "0.9rem", color: "#64748b" }}>
              <FileText size={18} /> Fotos Registradas:
            </strong>
            <div
              style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "12px"
              }}
            >
              {detail.foto.map((url, index) => (
                <a
                  key={index}
                  href={`${backendUrl}${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "block", aspectRatio: "1/1" }}
                >
                  <img
                    src={`${backendUrl}${url}`}
                    alt="Foto"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "2px solid #e2e8f0",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                      cursor: "zoom-in",
                      transition: "all 0.2s ease"
                    }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.transform = "scale(1.05)"; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.transform = "scale(1)"; }}
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", marginTop: "100px", color: "#333" }}>
        Carregando...
      </div>
    );
  if (!order)
    return (
      <div style={{ textAlign: "center", marginTop: "100px", color: "#333" }}>
        Pedido não encontrado.
      </div>
    );

  const vistoriaDeSaida = order?.Vistorias.find(
    (v) => v.tipo_vistoria === "entrega",
  );
  const vistoriaDeDevolucao = order?.Vistorias.find(
    (v) => v.tipo_vistoria === "devolucao",
  );

  const canReschedule = order
    ? ["aprovada", "aguardando_assinatura"].includes(order.status)
    : false;

  const itensComPrejuizo = order
    ? order.ItemReservas.filter((i) => i.prejuizo)
    : [];
  const totalPrejuizoOriginal = itensComPrejuizo.reduce(
    (acc, item) =>
      acc + (item.prejuizo ? Number(item.prejuizo.valor_prejuizo) : 0),
    0,
  );
  const totalRecuperado = itensComPrejuizo.reduce(
    (acc, item) =>
      acc +
      (item.prejuizo && item.prejuizo.resolvido
        ? Number(item.prejuizo.valor_prejuizo)
        : 0),
    0,
  );

  const totalDividaAtiva = totalPrejuizoOriginal - totalRecuperado;

  const saldoAluguel = order
    ? Number(order.valor_total) - Number(order.valor_sinal)
    : 0;

  const totalPendenteGeral =
    totalDividaAtiva + (order?.status === "PREJUIZO" ? saldoAluguel : 0);

  const executeRecoverDebt = async () => {
    setIsRecovering(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(
        `${backendUrl}/api/reservations/${orderId}/recover-debt`,
        {
          valor_recebido: Number(customDebtAmount),
          forma_pagamento: recoverMethod,
        },
        config,
      );

      setSuccessMessage("Pagamento da pendência registrado com sucesso!");
      setTimeout(() => setSuccessMessage(""), 4000);
      setShowRecoverModal(false);
      fetchOrderDetails();
    } catch (error) {
      toast.error("Erro ao processar o pagamento.");
    } finally {
      setIsRecovering(false);
    }
  };

  let horaLimiteFormatada = "";
  if (order.createdAt) {
    const dataCriacao = new Date(order.createdAt);
    const tempoLimite = new Date(dataCriacao.getTime() + 60 * 60 * 1000);
    horaLimiteFormatada = tempoLimite.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const isAdmin = user?.tipo_usuario === "admin";
  const isOwner = user?.id === order?.id_usuario;
  const isFuncionario = user?.tipo_usuario === "funcionario";

  const podeVerFinanceiro =
    isAdmin || isOwner || hasPermission("ver_financeiro");

  const podeColetarAssinatura =
    isAdmin ||
    hasPermission("gerenciar_reservas") ||
    hasPermission("fazer_vistoria");

  const statusesComAcao = [
    "aguardando_assinatura",
    "aguardando_assinatura_devolucao",
    "aprovada",
    "em_andamento",
    "aguardando_pagamento_final",
    "PREJUIZO",
  ];

  const temAcaoPendente = order ? statusesComAcao.includes(order.status) : false;

  const podeVerPainelAcoes = (isAdmin || isFuncionario || podeColetarAssinatura) && temAcaoPendente;

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: "1100px",
        margin: "90px auto 50px auto",
        color: "#1e293b",
        animation: "fadeIn 0.3s ease"
      }}
    >
      {successMessage && (
        <div style={{
          backgroundColor: "#ecfdf5",
          color: "#047857",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
          border: "1px solid #a7f3d0",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontWeight: "bold",
          animation: "slideDown 0.3s ease"
        }}>
          <CheckCircle size={20} />
          {successMessage}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <div>
          {isAdmin || isFuncionario ? (
            <button onClick={() => navigate("/admin")} style={{ ...btnBackStyle, display: "flex", alignItems: "center", gap: "8px" }}>
              <ArrowLeft size={18} /> Painel
            </button>
          ) : (
            <button
              onClick={() => navigate("/my-reservations")}
              style={{ ...btnBackStyle, display: "flex", alignItems: "center", gap: "8px" }}
            >
              <ArrowLeft size={18} /> Voltar
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          {/* BOTÃO DE AJUDA */}
          <button
            onClick={() => setShowManual(true)}
            title="Manual do Usuário"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "45px", height: "45px", borderRadius: "50%", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#64748b", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.color = "#2563eb"; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.color = "#64748b"; }}
          >
            <HelpCircle size={24} />
          </button>

          {/* BOTÕES DE EMISSÃO */}
          {order.status !== "pendente" && order.status !== "cancelada" && (
            <div style={{ display: "flex", gap: "8px", padding: "6px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <button onClick={handleDownloadDFE} style={btnDocStyleGov} title="Baixar Documento Fiscal Eletrônico">
                <FileText size={16} /> DFE (PDF)
              </button>
              <button onClick={handleDownloadXmlDFE} style={btnDocStyleGov} title="Baixar Arquivo XML">
                <FileCode2 size={16} /> XML
              </button>
            </div>
          )}

          {/* MAQUIAGEM VISUAL DA TAG DE STATUS */}
          {(() => {
            let badgeText = order.status.replace(/_/g, " ").toUpperCase();
            let badgeColor = "#64748b";
            let badgeBg = "#f1f5f9";
            let badgeBorder = "#e2e8f0";
            let IconComponent = Info;

            if (order.status === "pendente") {
              badgeColor = "#b45309";
              badgeBg = "#fffbeb";
              badgeBorder = "#fde68a";
              IconComponent = AlertCircle;
            } else if (order.status === "PREJUIZO") {
              badgeColor = "#b91c1c";
              badgeBg = "#fef2f2";
              badgeBorder = "#fecaca";
              badgeText = "OCORRÊNCIA REGISTRADA";
              IconComponent = AlertTriangle;
            } else if (order.status === "aprovada") {
              badgeColor = "#b45309";
              badgeBg = "#fffbeb";
              badgeBorder = "#fde68a";
              IconComponent = Clock;
              badgeText =
                order.tipo_entrega === "entrega"
                  ? "AGENDADA PARA ENTREGA"
                  : "AGENDADA PARA RETIRADA";
            } else if (order.status === "saiu_para_entrega") {
              if (order.tipo_entrega === "entrega") {
                badgeColor = "#1d4ed8";
                badgeBg = "#eff6ff";
                badgeBorder = "#bfdbfe";
                IconComponent = Truck;
                badgeText = "EM TRÂNSITO (A CAMINHO)";
              } else {
                badgeColor = "#047857";
                badgeBg = "#ecfdf5";
                badgeBorder = "#a7f3d0";
                IconComponent = Package;
                badgeText = "PRONTO PARA RETIRADA NA LOJA";
              }
            } else if (order.status === "em_andamento") {
              badgeColor = "#047857";
              badgeBg = "#ecfdf5";
              badgeBorder = "#a7f3d0";
              IconComponent = CheckCircle;
              badgeText = "EM LOCAÇÃO ATIVA";
            } else if (order.status === "finalizada") {
              badgeColor = "#0f766e";
              badgeBg = "#ecfdf5";
              badgeBorder = "#a7f3d0";
              IconComponent = CheckCircle;
              badgeText = "FINALIZADA";
            } else if (order.status === "cancelada") {
               badgeColor = "#be123c";
               badgeBg = "#fff1f2";
               badgeBorder = "#fecdd3";
               IconComponent = XCircle;
               badgeText = "CANCELADA";
            }

            return (
              <span
                style={{
                  padding: "8px 14px",
                  borderRadius: "12px",
                  fontWeight: "800",
                  fontSize: "0.85rem",
                  backgroundColor: badgeBg,
                  color: badgeColor,
                  border: `1px solid ${badgeBorder}`,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <IconComponent size={16} />
                {badgeText}
              </span>
            );
          })()}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "25px" }}>
         <div style={{ backgroundColor: "#eff6ff", padding: "12px", borderRadius: "12px" }}>
            <FileText size={28} color="#2563eb" />
         </div>
         <h1 style={{ margin: 0, color: "#1e293b", fontSize: "1.8rem", fontWeight: 800 }}>Detalhes do Pedido #{order.id}</h1>
      </div>

      {order.status === "cancelada" && (
        <div style={{
          backgroundColor: "#fff5f5",
          border: "1px solid #feb2b2",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px",
          color: "#c53030"
        }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Reserva Cancelada</h3>
          <p style={{ margin: 0 }}>
            <strong>Motivo:</strong> {order.motivo_cancelamento || "Não informado"}
          </p>
          {Number(order.taxa_cancelamento) > 0 && (
            <p style={{ margin: "10px 0 0 0" }}>
              <strong>Taxa aplicada:</strong> R$ {Number(order.taxa_cancelamento).toFixed(2)}
            </p>
          )}
          {Number(order.valor_reembolsado) > 0 && (
            <p style={{ margin: "5px 0 0 0", color: "#2f855a" }}>
              <strong>Valor Reembolsado:</strong> R$ {Number(order.valor_reembolsado).toFixed(2)}
            </p>
          )}
        </div>
      )}

      {/* LINHA DO TEMPO (TIMELINE) */}
      {order.status !== "cancelada" && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "30px 0 40px 0",
          padding: "0 10px",
          position: "relative"
        }}>
          {/* Linha de fundo */}
          <div style={{
            position: "absolute",
            top: "15px",
            left: "40px",
            right: "40px",
            height: "2px",
            backgroundColor: "#e0e0e0",
            zIndex: 0
          }} />

          {[
            { label: "Reserva", icon: <FileText size={16} /> },
            { label: "Confirmado", icon: <Clock size={16} /> },
            { label: "Entrega/Retirada", icon: <Truck size={16} /> },
            { label: "Em Uso", icon: <Package size={16} /> },
            { label: "Devolução", icon: <RefreshCw size={16} /> },
            { label: "Finalizado", icon: <CheckCircle size={16} /> }
          ].map((step, index, array) => {
            let currentIndex = 0;
            if (order.status === "aprovada") currentIndex = 1;
            if (order.status === "saiu_para_entrega" || order.status === "aguardando_assinatura") currentIndex = 2;
            if (order.status === "em_andamento" || order.status === "PREJUIZO") currentIndex = 3;
            if (order.solicitou_devolucao || order.status === "aguardando_assinatura_devolucao" || order.status === "aguardando_pagamento_final") currentIndex = 4;
            if (order.status === "finalizada") currentIndex = 5;

            // Lógica de atraso
            const today = new Date();
            today.setHours(0,0,0,0);
            const dInicio = parseDateStringAsLocal(order.data_inicio);
            const dFim = parseDateStringAsLocal(order.data_fim);
            
            let isLate = false;
            // Atraso na Entrega (Index 2): Hoje > Início e ainda não saiu
            if (index === 2 && today > dInicio && currentIndex < 2) isLate = true;
            // Atraso na Devolução (Index 4): Hoje > Fim e ainda está "Em Uso"
            if (index === 4 && today > dFim && currentIndex < 4) isLate = true;

            const isCompleted = index < currentIndex;
            const isActive = index === currentIndex;
            
            let color = isCompleted || isActive ? "#007bff" : "#adb5bd";
            if (isLate) color = "#dc3545"; 

            return (
              <div key={step.label} style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
                zIndex: 1,
                position: "relative"
              }}>
                {/* Círculo do Step */}
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: isLate ? "#dc3545" : (isCompleted ? "#007bff" : "white"),
                  border: `2px solid ${color}`,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: "0.8rem",
                  color: (isCompleted || isLate) ? "white" : color,
                  marginBottom: "8px",
                  transition: "all 0.3s ease",
                  boxShadow: isActive ? "0 0 0 4px rgba(0,123,255,0.2)" : (isLate ? "0 0 0 4px rgba(220,53,69,0.2)" : "none")
                }}>
                  {isLate ? <AlertTriangle size={16} /> : (isCompleted ? <Check size={18} /> : step.icon)}
                </div>
                
                {/* Nome do Step */}
                <span style={{
                  fontSize: "0.7rem",
                  fontWeight: (isActive || isLate) ? "bold" : "500",
                  color: color,
                  textAlign: "center",
                  lineHeight: "1.1",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  {isLate ? <><AlertTriangle size={12} /> ATRASO NA DEVOLUÇÃO</> : step.label}
                </span>

                {/* Linha de progresso ativa */}
                {index < array.length - 1 && index < currentIndex && (
                  <div style={{
                    position: "absolute",
                    top: "15px",
                    left: "calc(50% + 15px)",
                    width: "calc(100% - 30px)",
                    height: "2px",
                    backgroundColor: "#007bff",
                    zIndex: -1
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {order.status === "pendente" && (
        <div
          style={{
            backgroundColor: "#fff3cd",
            color: "#856404",
            padding: "20px",
            borderRadius: "8px",
            margin: "1.5rem 0",
            border: "1px solid #ffeeba",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "15px",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 5px 0" }}>Pagamento Pendente!</h3>
            <p style={{ margin: 0 }}>
              Sua reserva ainda não está garantida. Finalize o pagamento do
              sinal de{" "}
              <strong>R$ {Number(order.valor_sinal).toFixed(2)}</strong>.
            </p>
            {horaLimiteFormatada && (
              <p
                style={{
                  margin: "8px 0 0 0",
                  color: "#d32f2f",
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                }}
              >
                Realize o pagamento até as {horaLimiteFormatada} ou o pedido
                será cancelado.
              </p>
            )}
          </div>
          <button
            onClick={() => navigate(`/payment/${order.id}`)}
            style={{
              padding: "12px 25px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "1.1rem",
              boxShadow: "0 4px 6px rgba(40,167,69,0.2)",
            }}
          >
            Pagar Agora
          </button>
        </div>
      )}

      {/* PAINEL DE AÇÕES DA EQUIPE */}
      {podeVerPainelAcoes && (
        <div
          style={{
            border: "1px solid #bfdbfe",
            padding: "25px",
            margin: "2rem 0",
            borderRadius: "16px",
            backgroundColor: "#eff6ff",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              borderBottom: "1px solid #bfdbfe",
              paddingBottom: "15px",
              marginBottom: "20px"
            }}
          >
            <ShieldAlert size={22} color="#1d4ed8" />
            <h3 style={{ margin: 0, color: "#1e40af", fontSize: "1.2rem", fontWeight: 800 }}>
              Painel de Ações Internas
            </h3>
          </div>
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {order.status === "aguardando_assinatura" &&
              podeColetarAssinatura && (
                <button
                  onClick={() => setIsContractModalOpen(true)}
                  style={{ ...btnActionStyle, backgroundColor: "#0284c7" }}
                >
                  <FileSignature size={18} /> Coletar Assinatura Do Cliente
                </button>
              )}

            {order.status === "aguardando_assinatura_devolucao" &&
              podeColetarAssinatura && (
                <button
                  onClick={() => setIsReturnModalOpen(true)}
                  style={{ ...btnActionStyle, backgroundColor: "#059669" }}
                >
                  <FileSignature size={18} /> Coletar Assinatura de Devolução
                </button>
              )}

            {(isAdmin ||
              hasPermission("fazer_vistoria") ||
              hasPermission("gerenciar_reservas")) &&
              order.status === "aprovada" && (
                <Link to={`/admin/vistoria/${order.id}`} style={{ textDecoration: 'none' }}>
                  <button style={btnActionStyle}>
                    <ClipboardCheck size={18} /> Realizar Vistoria de Saída
                  </button>
                </Link>
              )}

            {(isAdmin ||
              hasPermission("fazer_vistoria") ||
              hasPermission("gerenciar_reservas")) &&
              order.status === "em_andamento" && (
                <Link to={`/admin/vistoria/${order.id}?tipo=devolucao`} style={{ textDecoration: 'none' }}>
                  <button style={btnActionStyle}>
                    <ClipboardCheck size={18} /> Registrar Devolução / Vistoria
                  </button>
                </Link>
              )}

            {(isAdmin ||
              hasPermission("gerenciar_reservas") ||
              hasPermission("ver_financeiro")) &&
              order.status === "aguardando_pagamento_final" && (
                <Link to={`/admin/finalize-payment/${order.id}`} style={{ textDecoration: 'none' }}>
                  <button style={{ ...btnActionStyle, backgroundColor: "#059669" }}>
                    <DollarSign size={18} /> Finalizar e Cobrar
                  </button>
                </Link>
              )}

            {podeVerFinanceiro && order.status === "PREJUIZO" && (
              <button
                onClick={() => {
                  setCustomDebtAmount(totalPendenteGeral.toFixed(2));
                  setShowRecoverModal(true);
                }}
                style={{
                  ...btnActionStyle,
                  backgroundColor: "#059669"
                }}
              >
                <DollarSign size={18} /> Registrar Pagamento da Dívida (R$ {totalPendenteGeral.toFixed(2)})
              </button>
            )}
          </div>
        </div>
      )}

      {/* BOTÃO DE SOLICITAR RECOLHIMENTO */}
      {!isAdmin &&
        !isFuncionario &&
        order.status === "em_andamento" &&
        order.tipo_entrega === "entrega" && (
          <div
            style={{
              marginTop: "2rem",
              padding: "20px",
              backgroundColor: "#f8f9fa",
              border: "1px solid #ddd",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", color: "#2c3e50" }}>
              Terminou de usar?
            </h3>
            <p style={{ color: "#555", marginBottom: "15px" }}>
              Avise nossa equipe para agilizarmos a coleta na obra.
            </p>

            <button
              onClick={() => setShowConfirmReturnModal(true)}
              disabled={order.solicitou_devolucao || order.coleta_confirmada}
              style={{
                padding: "12px 25px",
                backgroundColor: order.coleta_confirmada
                  ? "#17a2b8"
                  : order.solicitou_devolucao
                    ? "#28a745"
                    : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontWeight: "bold",
                fontSize: "1.1rem",
                cursor: (order.solicitou_devolucao || order.coleta_confirmada) ? "not-allowed" : "pointer",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                transition: "all 0.3s ease"
              }}
            >
              {order.coleta_confirmada ? (
                <span style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}><Truck size={18} /> Caminhão a Caminho!</span>
              ) : order.solicitou_devolucao ? (
                <span style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}><CheckCircle size={18} /> Coleta Solicitada com Sucesso</span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}><Truck size={18} /> Solicitar Recolhimento da Máquina</span>
              )}
            </button>
          </div>
        )}

      {/* MODAL DE CONFIRMAÇÃO */}
      {showConfirmReturnModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)",
          display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 1000, padding: "20px"
        }}>
          <div style={{
            background: "white", padding: "2rem", borderRadius: "12px",
            width: "450px", maxWidth: "100%", boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            animation: "fadeIn 0.2s ease-out"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#007bff", marginBottom: "15px" }}>
              <Truck size={32} color="#007bff" />
              <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Confirmar Coleta</h2>
            </div>

            <p style={{ color: "#444", fontSize: "1.05rem", lineHeight: "1.5", marginBottom: "10px" }}>
              Você já terminou de utilizar os equipamentos desta reserva?
            </p>

            <p style={{ color: "#666", fontSize: "0.95rem", marginBottom: "25px" }}>
              Ao confirmar, nossa equipe de logística será notificada imediatamente para agendar o recolhimento no endereço da sua obra.
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowConfirmReturnModal(false)}
                disabled={isRequestingReturn}
                style={{
                  padding: "10px 20px", border: "1px solid #ccc", background: "white",
                  borderRadius: "6px", cursor: "pointer", fontWeight: "bold", color: "#555"
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmRequestReturn}
                disabled={isRequestingReturn}
                style={{
                  padding: "10px 20px", border: "none", background: "#007bff", color: "white",
                  borderRadius: "6px", cursor: isRequestingReturn ? "wait" : "pointer", fontWeight: "bold",
                  display: "flex", alignItems: "center", gap: "8px"
                }}
              >
                {isRequestingReturn ? "Enviando..." : "Sim, solicitar coleta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BLOCO DE DÍVIDAS / PREJUÍZO */}
      {podeVerFinanceiro && itensComPrejuizo.length > 0 && (
        <div
          style={{
            border: "2px solid #dc3545",
            borderRadius: "8px",
            overflow: "hidden",
            marginBottom: "2rem",
            backgroundColor: "#fff",
          }}
        >
          <div
            style={{
              backgroundColor: "#dc3545",
              color: "white",
              padding: "15px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
              Relatório de Ocorrências (Sinistro / Inadimplência)
            </h3>
          </div>
          <div style={{ padding: "1.5rem" }}>
            {itensComPrejuizo.map((item) => {
              const prej = item.prejuizo!;
              return (
                <div
                  key={item.id}
                  style={{
                    borderBottom: "1px solid #eee",
                    paddingBottom: "1.5rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "1.1rem",
                      alignItems: "center",
                    }}
                  >
                    <strong style={{ color: "#333" }}>
                      {item.Unidade.Equipamento.nome}{" "}
                      <span style={{ fontSize: "0.9rem", color: "#888" }}>
                        (#{item.Unidade.id})
                      </span>
                    </strong>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          color: "#dc3545",
                          fontWeight: "bold",
                          fontSize: "1.3rem",
                        }}
                      >
                        R$ {Number(prej.valor_prejuizo).toFixed(2)}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#666" }}>
                        Valor do Prejuízo
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "20px",
                      marginTop: "15px",
                    }}
                  >
                    <div>
                      <p style={{ margin: "5px 0" }}>
                        <strong>Motivo:</strong>{" "}
                        <span style={{ color: "#c62828" }}>
                          {getNomeTipoPrejuizo(prej.tipo)}
                        </span>
                      </p>
                      <p style={{ margin: "5px 0" }}>
                        <strong>Data do Registro:</strong>{" "}
                        {new Date(prej.createdAt).toLocaleDateString()}
                      </p>
                      <p style={{ margin: "5px 0" }}>
                        <strong>Justificativa:</strong>{" "}
                        <span style={{ fontStyle: "italic" }}>
                          "{prej.observacao}"
                        </span>
                      </p>
                    </div>
                    <div
                      style={{
                        backgroundColor: prej.resolvido ? "#e8f5e9" : "#ffebee",
                        padding: "15px",
                        borderRadius: "8px",
                        border: `1px solid ${prej.resolvido ? "#c8e6c9" : "#ffcdd2"}`,
                      }}
                    >
                      <h4
                        style={{
                          margin: "0 0 10px 0",
                          color: prej.resolvido ? "#2e7d32" : "#c62828",
                        }}
                      >
                        Status Financeiro
                      </h4>
                      {prej.resolvido ? (
                        <>
                          <div
                            style={{
                              fontSize: "1.1rem",
                              fontWeight: "bold",
                              color: "#2e7d32",
                              marginBottom: "5px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px"
                            }}
                          >
                            <CheckCircle size={18} /> PAGO / RECUPERADO
                          </div>
                          <p style={{ margin: 0, fontSize: "0.9rem" }}>
                            Data:{" "}
                            {parseDateStringAsLocal(
                              prej.data_resolucao!,
                            ).toLocaleDateString()}
                          </p>
                          <p style={{ margin: 0, fontSize: "0.9rem" }}>
                            Forma: {formatarPagamento(prej.forma_recuperacao)}
                          </p>
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              fontSize: "1.1rem",
                              fontWeight: "bold",
                              color: "#c62828",
                              marginBottom: "5px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px"
                            }}
                          >
                            <XCircle size={18} /> PENDENTE (Dívida Ativa)
                          </div>
                          <p style={{ margin: 0, fontSize: "0.9rem" }}>
                            O valor consta como débito para o cliente.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div
              style={{
                borderTop: "2px solid #eee",
                paddingTop: "15px",
                marginTop: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "2rem",
                  fontSize: "1rem",
                  color: "#555",
                }}
              >
                <div>
                  Total Registrado (Ocorrências):{" "}
                  <strong>R$ {totalPrejuizoOriginal.toFixed(2)}</strong>
                </div>
                <div style={{ color: "green" }}>
                  Recuperado / Pago:{" "}
                  <strong>R$ {totalRecuperado.toFixed(2)}</strong>
                </div>
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontSize: "1.4rem",
                  fontWeight: "bold",
                  color: totalDividaAtiva > 0 ? "#c62828" : "#2e7d32",
                  marginTop: "10px",
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {totalDividaAtiva > 0
                  ? `Restante Pendente: R$ ${totalDividaAtiva.toFixed(2)}`
                  : <><CheckCircle size={22} /> Todas as pendências foram quitadas.</>}
              </div>
            </div>
          </div>
        </div>
      )}

      {(vistoriaDeSaida || order.assinatura_devolucao) && (
        <div
          style={{
            margin: "2rem 0",
            padding: "25px",
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: "2px solid #f1f5f9", paddingBottom: "15px", marginBottom: "20px" }}>
            <FileText size={22} color="#475569" />
            <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.2rem", fontWeight: 800 }}>
              Documentos e Contratos
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {vistoriaDeSaida && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", flexWrap: "wrap", gap: "15px" }}>
                <div>
                  <h4 style={{ margin: "0 0 5px 0", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                    <CheckCircle size={18} color="#10b981" /> Contrato de Locação Digital
                  </h4>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>Documento de entrega assinado e válido juridicamente.</p>
                </div>
                <button
                  onClick={handleDownloadContract}
                  disabled={contractLoading}
                  style={{
                    padding: "10px 20px", border: "2px solid #2c3e50", backgroundColor: "white", color: "#2c3e50", borderRadius: "6px", cursor: "pointer", fontWeight: "bold",
                    display: "flex", alignItems: "center", gap: "8px"
                  }}
                >
                  <Download size={16} /> {contractLoading ? "Gerando PDF..." : "Baixar Contrato"}
                </button>
              </div>
            )}

            {order.assinatura_devolucao && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", flexWrap: "wrap", gap: "15px" }}>
                <div>
                  <h4 style={{ margin: "0 0 5px 0", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                    <CheckCircle size={18} color="#10b981" /> Termo de Devolução (Quitação)
                  </h4>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
                    Assinado em {order.data_assinatura_devolucao ? new Date(order.data_assinatura_devolucao).toLocaleDateString("pt-BR") : "data não registrada"}.
                  </p>
                </div>
                <button
                  onClick={handleDownloadReturnContract}
                  style={{
                    padding: "10px 20px", border: "none", backgroundColor: "#0284c7", color: "white", borderRadius: "6px", cursor: "pointer", fontWeight: "bold",
                    display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 2px 4px rgba(2,132,199,0.3)"
                  }}
                >
                  <Download size={16} /> Baixar Termo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {user?.tipo_usuario !== "admin" && canReschedule && (
        <button
          onClick={() => setIsRescheduleModalOpen(true)}
          style={{
            backgroundColor: "#ff9800",
            color: "white",
            padding: "12px 20px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            marginBottom: "1rem",
            fontWeight: "bold",
            fontSize: "1rem",
            width: "100%",
          }}
        >
          Solicitar Remarcação de Datas
        </button>
      )}

      {/* AVISO PARA O CLIENTE NA ENTREGA/RETIRADA */}
      {!isAdmin &&
        !isFuncionario &&
        order.status === "aguardando_assinatura" && (
          <div
            style={{
              padding: "15px",
              backgroundColor: "#e3f2fd",
              color: "#0d47a1",
              borderRadius: "6px",
              border: "1px solid #b6d4fe",
            }}
          >
            <strong>Aguardando Assinatura:</strong> A vistoria de saída foi
            concluída.
            {order.tipo_entrega === "entrega"
              ? " O motorista coletará sua assinatura agora no momento da entrega."
              : " Nossa equipe na loja coletará sua assinatura agora."}
          </div>
        )}

      {/* AVISO PARA O CLIENTE NA DEVOLUÇÃO */}
      {!isAdmin &&
        !isFuncionario &&
        order.status === "aguardando_assinatura_devolucao" && (
          <div
            style={{
              padding: "15px",
              backgroundColor: "#e8f5e9",
              color: "#2e7d32",
              borderRadius: "6px",
              marginBottom: "2rem",
              border: "1px solid #c8e6c9",
            }}
          >
            <strong>Aguardando Assinatura Final:</strong> A vistoria de
            devolução foi registrada.
            {order.tipo_entrega === "entrega"
              ? " O motorista coletará sua assinatura para encerrar o contrato no recolhimento."
              : " Assine na loja para encerrar o contrato."}
          </div>
        )}

      {isReturnModalOpen && (
        <ReturnContractModal
          order={order}
          onClose={() => setIsReturnModalOpen(false)}
          onSuccess={() => {
            setIsReturnModalOpen(false);
            fetchOrderDetails();
          }}
        />
      )}

      {podeVerFinanceiro && (
        <div
          style={{
            display: "flex",
            gap: "2rem",
            flexWrap: "wrap",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              flex: 1,
              border: "1px solid #ddd",
              padding: "1.5rem",
              borderRadius: "8px",
              backgroundColor: "#fff",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color: "#2c3e50",
                borderBottom: "2px solid #f0f0f0",
                paddingBottom: "10px",
              }}
            >
              Resumo Financeiro
            </h3>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span>Subtotal Aluguel:</span>
              <strong>R$ {subtotal.toFixed(2)}</strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span>Frete:</span>
              <strong>R$ {Number(order.custo_frete).toFixed(2)}</strong>
            </div>
            {Number(order.taxa_remarcacao) > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  color: "#e65100",
                }}
              >
                <span>Taxa de Remarcação:</span>
                <strong>+ R$ {Number(order.taxa_remarcacao).toFixed(2)}</strong>
              </div>
            )}
            {Number(order.taxa_avaria) > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  color: "#c62828",
                }}
              >
                <span>Taxa de Avarias:</span>
                <strong>+ R$ {Number(order.taxa_avaria).toFixed(2)}</strong>
              </div>
            )}
            {Number(order.taxa_atraso) > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  color: "#d35400",
                }}
              >
                <span>Multa por Atraso:</span>
                <strong>+ R$ {Number(order.taxa_atraso).toFixed(2)}</strong>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "15px",
                paddingTop: "15px",
                borderTop: "1px solid #eee",
                fontSize: "1.2rem",
                color: "#2c3e50",
              }}
            >
              <span>Total do Contrato:</span>
              <strong>R$ {valorTotalAjustado.toFixed(2)}</strong>
            </div>

            {/* Só mostra detalhamento de sinal se NÃO for pagamento integral (100%) */}
            {Math.abs(valorTotalAjustado - Number(order.valor_sinal)) > 0.01 ? (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "5px",
                    color: order.status === "pendente" ? "#e65100" : "#2e7d32",
                  }}
                >
                  <span>
                    {order.status === "pendente"
                      ? "Sinal a Pagar (Pendente):"
                      : "Sinal Pago (Reserva):"}
                  </span>
                  <strong>- R$ {Number(order.valor_sinal).toFixed(2)}</strong>
                </div>

                {order.status === "finalizada" && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "10px",
                      padding: "10px",
                      backgroundColor: "#e8f5e9",
                      borderRadius: "6px",
                      color: "#1b5e20",
                      fontWeight: "bold",
                    }}
                  >
                    <span>Restante Quitado:</span>
                    <span>
                      R${" "}
                      {(valorTotalAjustado - Number(order.valor_sinal)).toFixed(2)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              // Se for INTEGRAL, apenas confirma que está tudo pago
              (order.status !== "pendente" && order.status !== "cancelada") && (
                <div style={{
                  marginTop: "10px",
                  padding: "8px",
                  backgroundColor: "#e8f5e9",
                  borderRadius: "6px",
                  color: "#1b5e20",
                  textAlign: "center",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}>
                  <CheckCircle size={16} /> Pagamento Integral Recebido. Reserva Confirmada!
                </div>
              )
            )}

            {/* HISTÓRICO DE PAGAMENTOS */}
            {order.Pagamentos && order.Pagamentos.length > 0 && (
              <div style={{ marginTop: "20px", borderTop: "1px solid #eee", paddingTop: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#2c3e50", fontSize: "1rem" }}>Histórico de Pagamentos</h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {order.Pagamentos.map((p: any) => (
                    <li key={p.id} style={{ 
                      marginBottom: "8px", padding: "10px", backgroundColor: "#f8fafc", 
                      borderRadius: "8px", border: "1px solid #edf2f7", fontSize: "0.9rem" 
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                        <span>R$ {Number(p.valor).toFixed(2)}</span>
                        <span style={{ color: p.status_pagamento === 'aprovado' ? "#28a745" : "#f59e0b" }}>
                          {p.status_pagamento.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ color: "#666", marginTop: "3px", fontSize: "0.8rem" }}>
                        {p.metodo_detalhe ? (
                          <>
                            <span style={{ textTransform: "uppercase" }}>{p.metodo_detalhe}</span>
                            {p.cartao_final && <span> • final {p.cartao_final}</span>}
                            {p.parcelas > 1 && <span> • {p.parcelas}x</span>}
                          </>
                        ) : (
                          <span>{p.id_transacao_externa?.startsWith('manual_') ? 'Pagamento Manual' : 'Pagamento Online'}</span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#999" }}>
                        {new Date(p.data_pagamento || p.createdAt).toLocaleString("pt-BR")}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "2rem",
          flexWrap: "wrap",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            flex: 1,
            border: "1px solid #e2e8f0",
            padding: "25px",
            borderRadius: "16px",
            backgroundColor: "#fff",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: "2px solid #f1f5f9", paddingBottom: "15px", marginBottom: "20px" }}>
            <MapPin size={22} color="#475569" />
            <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.2rem", fontWeight: 800 }}>
              Dados Logísticos
            </h3>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", color: "#475569" }}>
              <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <strong style={{ color: "#1e293b" }}>Tipo de Entrega:</strong>{" "}
                <span style={{ backgroundColor: "#f8fafc", padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "600", color: "#1d4ed8" }}>
                  {order.tipo_entrega === "entrega" ? <><Truck size={16} /> Entrega na Obra</> : <><Store size={16} /> Retirada na Loja</>}
                </span>
              </p>
              {order.tipo_entrega === "entrega" ? (
                <p style={{ margin: 0 }}>
                  <strong style={{ color: "#1e293b" }}>Endereço de Entrega:</strong> {order.endereco_entrega}
                </p>
              ) : (
                lojaConfig && (
                  <div style={{
                    marginTop: "5px",
                    padding: "15px",
                    backgroundColor: "#eff6ff",
                    borderRadius: "8px",
                    borderLeft: "4px solid #3b82f6"
                  }}>
                    <p style={{ margin: 0, color: "#1d4ed8", fontWeight: "bold", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={16} /> ENDEREÇO PARA RETIRADA:
                    </p>
                    <p style={{ margin: "8px 0 0 0", color: "#1e293b", fontSize: "0.95rem" }}>
                      {lojaConfig.frete?.endereco_origem || "Endereço não configurado."}
                    </p>
                  </div>
                )
              )}
            </div>

            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-start" }}>
              {/* DATAS DA LOCAÇÃO */}
              <div style={{ display: "flex", gap: "30px", padding: "20px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1", flex: 1, minWidth: "250px" }}>
                <div>
                  <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Data de Saída</span>
                  <strong style={{ color: "#1e293b", fontSize: "1.1rem" }}>{parseDateStringAsLocal(order.data_inicio).toLocaleDateString()}</strong>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Data de Devolução</span>
                  <strong style={{ color: "#1e293b", fontSize: "1.1rem" }}>{parseDateStringAsLocal(order.data_fim).toLocaleDateString()}</strong>
                </div>
              </div>

              {/* HORÁRIOS DA LOJA (DENTRO DOS DADOS LOGÍSTICOS E LADO A LADO) */}
              <div style={{ flex: 1, minWidth: "300px" }}>
                <HorarioFuncionamento />
              </div>
            </div>
          </div>
        </div>
      </div>

      <hr style={{ margin: "3rem 0", borderColor: "#f1f5f9" }} />

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <Package size={24} color="#1e293b" />
        <h2 style={{ color: "#1e293b", margin: 0, fontWeight: 800 }}>Itens do Pedido e Vistorias</h2>
      </div>
      
      {order.ItemReservas.map((item) => {
        const detalheSaida = vistoriaDeSaida?.detalhes.find(
          (d: any) => d.id_unidade === item.Unidade.id,
        );
        const detalheDevolucao = vistoriaDeDevolucao?.detalhes.find(
          (d: any) => d.id_unidade === item.Unidade.id,
        );

        return (
          <div
            key={item.id}
            style={{
              border: item.prejuizo ? "2px solid #fecaca" : "1px solid #e2e8f0",
              padding: "25px",
              marginBottom: "2rem",
              borderRadius: "16px",
              backgroundColor: item.prejuizo ? "#fef2f2" : "#fff",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "15px"
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.4rem", color: "#1e293b", fontWeight: 800 }}>
                {item.Unidade.Equipamento.nome}
                <span
                  style={{
                    backgroundColor: "#f1f5f9",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                    color: "#475569",
                    marginLeft: "15px",
                  }}
                >
                  Unidade #{item.Unidade.id}
                </span>
              </h3>

              {item.status === "FINALIZADO_COM_PREJUIZO" && (
                <span
                  style={{
                    backgroundColor: "#ef4444",
                    color: "white",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <ShieldAlert size={16} /> NÃO DEVOLVIDO / OCORRÊNCIA
                </span>
              )}
            </div>

            {vistoriaDeSaida ? (
              <VistoriaDetailDisplay
                title="Vistoria de Saída (Entrega)"
                detail={detalheSaida}
              />
            ) : order.status === "pendente" ? (
              <div
                style={{
                  padding: "15px",
                  backgroundColor: "#f8fafc",
                  color: "#64748b",
                  borderRadius: "10px",
                  border: "1px dashed #cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}
              >
                <Clock size={20} color="#94a3b8" />
                <span>Aguardando confirmação do pagamento para liberar vistoria...</span>
              </div>
            ) : (
              order.status !== "cancelada" && (
                <div
                  style={{
                    padding: "15px",
                    backgroundColor: "#fffbeb",
                    color: "#b45309",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    border: "1px solid #fde68a"
                  }}
                >
                  <Clock size={20} color="#d97706" />
                  <span style={{ fontWeight: "600" }}>Aguardando vistoria de saída...</span>
                </div>
              )
            )}

            {/* AVISO DE DÍVIDA PARA O CLIENTE */}
            {user?.tipo_usuario !== "admin" && order.status === "PREJUIZO" && (
              <div
                style={{
                  backgroundColor: "#ffebee",
                  color: "#c62828",
                  padding: "20px",
                  borderRadius: "8px",
                  margin: "1.5rem 0",
                  border: "1px solid #ffcdd2",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "15px",
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 5px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertCircle size={22} /> Pendência Financeira (Ocorrência)
                  </h3>
                  <p style={{ margin: 0 }}>
                    Existem valores em aberto referentes a avarias, perdas ou
                    multas neste pedido.
                  </p>
                  <p style={{ margin: "5px 0 0 0", fontWeight: "bold" }}>
                    Valor Total Devido: R$ {totalPendenteGeral.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/payment/${order.id}`)}
                  style={{
                    padding: "12px 25px",
                    backgroundColor: "#c62828",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "1.1rem",
                    boxShadow: "0 4px 6px rgba(198,40,40,0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <CreditCard size={18} /> Pagar Dívida Agora
                </button>
              </div>
            )}

            <div style={{ marginTop: "20px" }}>
              {vistoriaDeDevolucao ? (
                <VistoriaDetailDisplay
                  title="Vistoria de Devolução (Retorno)"
                  detail={detalheDevolucao}
                />
              ) : item.prejuizo ? (
                <div
                  style={{
                    padding: "15px",
                    backgroundColor: "#ffebee",
                    border: "1px solid #ef9a9a",
                    borderRadius: "6px",
                    color: "#c62828",
                  }}
                >
                  <strong>Ocorrência Registrada:</strong> Este item não passou
                  pela vistoria de retorno padrão devido ao registro de sinistro
                  (veja detalhes no topo).
                </div>
              ) : (
                order.status === "em_andamento" && (
                  <div
                    style={{
                      padding: "15px",
                      backgroundColor: "#e3f2fd",
                      color: "#0d47a1",
                      borderRadius: "6px",
                    }}
                  >
                    Equipamento em locação. Aguardando retorno.
                  </div>
                )
              )}
            </div>
          </div>
        );
      })}

      {isRescheduleModalOpen && (
        <RescheduleModal
          order={order}
          onClose={() => setIsRescheduleModalOpen(false)}
          onSuccess={() => {
            setIsRescheduleModalOpen(false);
            fetchOrderDetails();
          }}
        />
      )}

      {isContractModalOpen && (
        <ContractModal
          order={order}
          onClose={() => setIsContractModalOpen(false)}
          onSuccess={() => {
            setIsContractModalOpen(false);
            fetchOrderDetails();
          }}
        />
      )}

      {/* MODAL DE RECUPERAÇÃO DE DÍVIDA */}
      {showRecoverModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "2rem",
              borderRadius: "12px",
              width: "450px",
              maxWidth: "90%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                color: "#c62828",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <DollarSign size={28} /> Quitar Inadimplência
            </h2>

            <div
              style={{
                backgroundColor: "#f8f9fa",
                padding: "15px",
                borderRadius: "8px",
                border: "1px dashed #ccc",
                marginBottom: "20px",
              }}
            >
              <span
                style={{ display: "block", color: "#666", fontSize: "0.9rem" }}
              >
                Dívida Total Original:
              </span>
              <strong style={{ fontSize: "1.4rem", color: "#c62828" }}>
                R$ {totalPendenteGeral.toFixed(2)}
              </strong>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#555",
                }}
              >
                Valor Negociado / Recebido (R$):
              </label>
              <input
                type="number"
                step="0.01"
                value={customDebtAmount}
                onChange={(e) => setCustomDebtAmount(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "2px solid #ccc",
                  fontSize: "1.2rem",
                  outline: "none",
                  fontWeight: "bold",
                  color: "#28a745",
                }}
              />
            </div>

            <div style={{ marginBottom: "25px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#555",
                }}
              >
                Forma de Pagamento Recebida:
              </label>
              <select
                value={recoverMethod}
                onChange={(e) => setRecoverMethod(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "2px solid #ccc",
                  fontSize: "1.1rem",
                  outline: "none",
                }}
              >
                <option value="pix">PIX</option>
                <option value="cartao">Cartão de Crédito / Débito</option>
                <option value="dinheiro">Dinheiro Espécie</option>
                <option value="manual_balcao">Outro (Manual)</option>
              </select>
            </div>

            <div
              style={{
                display: "flex",
                gap: "15px",
                justifyContent: "flex-end",
                borderTop: "1px solid #eee",
                paddingTop: "15px",
              }}
            >
              <button
                onClick={() => setShowRecoverModal(false)}
                disabled={isRecovering}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #ccc",
                  background: "#f8f9fa",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  color: "#555",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={executeRecoverDebt}
                disabled={isRecovering || Number(customDebtAmount) <= 0}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  background: "#28a745",
                  color: "white",
                  borderRadius: "6px",
                  cursor:
                    isRecovering || Number(customDebtAmount) <= 0
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "bold",
                  boxShadow: "0 4px 6px rgba(40,167,69,0.2)",
                }}
              >
                {isRecovering ? "Processando..." : "Confirmar Recebimento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MANUAL */}
      {showManual && (
        <div style={manualOverlayStyle} onClick={() => setShowManual(false)}>
          <div style={{ ...manualContentStyle, maxWidth: '650px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={manualHeaderStyle}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", color: "#1e293b" }}>
                <HelpCircle size={22} color="#2563eb" /> Manual: {isAdmin || isFuncionario ? 'Gestão do Pedido (Equipe)' : 'Acompanhamento do Pedido'}
              </h3>
              <button onClick={() => setShowManual(false)} style={manualCloseBtnStyle}><X size={22} /></button>
            </div>

            <div style={{ padding: "30px", overflowY: "auto", flexGrow: 1, maxHeight: "70vh" }}>
              <div style={{ color: "#475569", lineHeight: "1.6" }}>
                <p style={{ marginBottom: "25px", fontSize: "1rem" }}>
                  {isAdmin || isFuncionario 
                    ? 'Painel administrativo para controle total da locação, desde a saída até a baixa final do patrimônio.' 
                    : 'Acompanhe em tempo real o status da sua locação e acesse seus documentos e contratos.'}
                </p>

                <div style={manualStepStyle}>
                  <div style={stepNumStyle}>1</div>
                  <div>
                    <strong>Linha do Tempo (Timeline):</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Mostra em qual estágio a locação se encontra. {isAdmin || isFuncionario ? 'Acompanhe para garantir o cumprimento dos prazos de entrega e coleta.' : 'Veja se seu pedido já foi confirmado ou se já saiu para entrega.'}</p>
                  </div>
                </div>

                <div style={manualStepStyle}>
                  <div style={stepNumStyle}>2</div>
                  <div>
                    <strong>Dados Logísticos e Horários:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Verifique se o pedido é para entrega ou retirada. Os horários da loja ajudam no planejamento {isAdmin || isFuncionario ? 'das rotas de entrega.' : 'da sua vinda para retirar ou devolver.'}</p>
                  </div>
                </div>

                { (isAdmin || isFuncionario) && (
                  <div style={manualStepStyle}>
                    <div style={stepNumStyle}>3</div>
                    <div>
                      <strong>Painel de Ações (Exclusivo Equipe):</strong>
                      <p style={{ margin: "5px 0 0 0" }}>Use os botões para realizar vistorias, coletar assinaturas no tablet/celular e registrar recebimentos manuais de sinal ou saldo final.</p>
                    </div>
                  </div>
                )}

                <div style={manualStepStyle}>
                  <div style={stepNumStyle}>{isAdmin || isFuncionario ? '4' : '3'}</div>
                  <div>
                    <strong>Vistorias e Fotos:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Consulte as fotos tiradas no momento da entrega para evitar discussões sobre avarias. {isAdmin || isFuncionario ? 'Registrar fotos nítidas é obrigatório para a segurança jurídica da empresa.' : 'As fotos garantem que você recebeu o equipamento em perfeito estado.'}</p>
                  </div>
                </div>

                <div style={manualStepStyle}>
                  <div style={stepNumStyle}>{isAdmin || isFuncionario ? '5' : '4'}</div>
                  <div>
                    <strong>Documentos e Contratos:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>{isAdmin || isFuncionario ? 'O sistema gera o DFE (Documento Fiscal Eletrônico) e o XML automaticamente após o faturamento.' : 'Baixe seu contrato assinado e o documento fiscal de locação (DFE) a qualquer momento.'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

const btnBackStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #ccc",
  padding: "8px 15px",
  borderRadius: "6px",
  cursor: "pointer",
  color: "#555",
  fontWeight: "bold",
};
const btnActionStyle: React.CSSProperties = {
  backgroundColor: "#007bff",
  color: "white",
  border: "none",
  padding: "12px 20px",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "0.95rem",
  boxShadow: "0 2px 5px rgba(0,123,255,0.3)",
  display: "flex",
  alignItems: "center",
  gap: "8px"
};

const btnDocStyle: React.CSSProperties = { padding: "6px 12px", border: "1px solid #ccc", backgroundColor: "white", color: "#333", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "5px" };
const btnDocStyleGov: React.CSSProperties = { ...btnDocStyle, backgroundColor: "#e9ecef", borderColor: "#ced4da", color: "#495057" };

const manualOverlayStyle: React.CSSProperties = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, animation: "fadeIn 0.2s ease" };
const manualContentStyle: React.CSSProperties = { backgroundColor: "#fff", borderRadius: "16px", width: "90%", maxWidth: "600px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden", display: "flex", flexDirection: "column" };
const manualHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 30px", borderBottom: "1px solid #f1f5f9" };
const manualCloseBtnStyle: React.CSSProperties = { background: "#f1f5f9", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" };
const manualStepStyle: React.CSSProperties = { display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9", color: "#475569", fontSize: "0.9rem" };
const stepNumStyle: React.CSSProperties = { width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 };

export default ReservationDetailsPage;
