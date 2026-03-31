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
    nome: string;
    email: string;
    cpf?: string;
    cnpj?: string;
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
  taxa_cancelamento?: string;
  valor_reembolsado?: string;
  taxa_remarcacao?: string;
  ItemReservas: ItemReserva[];
  Vistorias: Vistoria[];
  createdAt?: string;
  assinatura_devolucao?: string;
  data_assinatura_devolucao?: string;
  solicitou_devolucao?: boolean;
  coleta_confirmada?: boolean;
}

const parseDateStringAsLocal = (dateString: string) => {
  if (!dateString) return new Date();

  const dateOnly = String(dateString).substring(0, 10);

  const [year, month, day] = dateOnly.split("-").map(Number);
  const finalDate = new Date(year, month - 1, day);

  return finalDate;
};

const ReservationDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { token, user, hasPermission } = useAuth();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [contractLoading, setContractLoading] = useState(false);
  const backendUrl = "http://localhost:3001";
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
      const { data } = await axios.get(`${backendUrl}/api/frete/config`);
      setLojaConfig(data);
    } catch (error) {
      console.error("Erro ao buscar dados do frete:", error);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
    fetchLojaConfig();
  }, [orderId, token]);

  const subtotal = order ? Number(order.valor_total) - Number(order.custo_frete) : 0;
  const valorTotalAjustado = order
    ? Number(order.valor_total) + Number(order.taxa_avaria || 0) + Number(order.taxa_remarcacao || 0)
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
      alert("Erro ao baixar contrato.");
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
        `http://localhost:3001/api/reservations/return-contract/${orderId}`,
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
      alert("Erro ao baixar o termo de devolução.");
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
      alert("Erro de conexão ao tentar solicitar. Tente novamente.");
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
          marginTop: "10px",
          backgroundColor: "#f1f1f1",
          padding: "15px",
          borderRadius: "8px",
          border: "1px solid #e0e0e0",
        }}
      >
        <h4
          style={{
            margin: "0 0 8px 0",
            color: "#333",
            borderBottom: "1px solid #ddd",
            paddingBottom: "5px",
          }}
        >
          {title}
        </h4>
        <p style={{ margin: "4px 0", color: "#333" }}>
          <strong>Condição:</strong>{" "}
          {detail.condicao === "ok" ? "✅ OK / Bom Estado" : "⚠️ Com Avarias"}
        </p>
        <p style={{ margin: "4px 0", color: "#333" }}>
          <strong>Obs:</strong> {detail.comentarios || "Sem observações."}
        </p>

        {avarias && avarias.length > 0 && (
          <div style={{ marginTop: "8px" }}>
            <strong>Avarias Identificadas:</strong>
            <ul
              style={{ margin: "5px 0 0 20px", padding: 0, color: "#d32f2f" }}
            >
              {avarias.map((avaria) => (
                <li key={avaria.id}>
                  {avaria.TipoAvaria.descricao}
                  {Number(avaria.TipoAvaria.preco) > 0 &&
                    ` (R$ ${Number(avaria.TipoAvaria.preco).toFixed(2)})`}
                </li>
              ))}
            </ul>
          </div>
        )}
        {detail.foto && detail.foto.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "10px",
              flexWrap: "wrap",
            }}
          >
            {detail.foto.map((url, index) => (
              <a
                key={index}
                href={`${backendUrl}${url}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={`${backendUrl}${url}`}
                  alt="Foto"
                  style={{
                    height: "80px",
                    width: "80px",
                    objectFit: "cover",
                    borderRadius: "4px",
                    border: "2px solid #fff",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                />
              </a>
            ))}
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

      alert("Dívida recuperada com sucesso!");
      setShowRecoverModal(false);
      fetchOrderDetails();
    } catch (error) {
      alert("Erro ao processar o pagamento.");
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

  const podeVerPainelAcoes = isAdmin || isFuncionario || podeColetarAssinatura;

  return (
    <div
      style={{
        padding: "2rem",
        marginTop: "60px",
        maxWidth: "1000px",
        margin: "80px auto",
        color: "#333",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          {isAdmin || isFuncionario ? (
            <button onClick={() => navigate("/admin")} style={btnBackStyle}>
              &larr; Painel
            </button>
          ) : (
            <button
              onClick={() => navigate("/my-reservations")}
              style={btnBackStyle}
            >
              &larr; Voltar
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          {/* BOTÕES DE EMISSÃO */}
          {order.status !== "pendente" && order.status !== "cancelada" && (
            <div style={{ display: "flex", gap: "8px", padding: "5px", backgroundColor: "#f1f3f5", borderRadius: "8px", border: "1px solid #dee2e6" }}>
              <button onClick={handleDownloadDFE} style={btnDocStyleGov} title="Baixar Documento Fiscal Eletrônico">
                🏛️ DFE (PDF)
              </button>
              <button onClick={handleDownloadXmlDFE} style={btnDocStyleGov} title="Baixar Arquivo XML">
                📄 XML
              </button>
            </div>
          )}

          {/* MAQUIAGEM VISUAL DA TAG DE STATUS */}
          {(() => {
            let badgeText = order.status.replace(/_/g, " ").toUpperCase();
            let badgeColor = "#495057";
            let badgeBg = "#e9ecef";
            let badgeBorder = "#dee2e6";

            if (order.status === "pendente") {
              badgeColor = "#856404";
              badgeBg = "#fff3cd";
              badgeBorder = "#ffeeba";
            } else if (order.status === "PREJUIZO") {
              badgeColor = "#c62828";
              badgeBg = "#ffebee";
              badgeBorder = "#ffcdd2";
              badgeText = "🚨 " + badgeText;
            } else if (order.status === "aprovada") {
              badgeColor = "#d97706";
              badgeBg = "#fef3c7";
              badgeBorder = "#fde68a";
              badgeText =
                order.tipo_entrega === "entrega"
                  ? "⏳ AGENDADA PARA ENTREGA"
                  : "🏪 AGENDADA PARA RETIRADA";
            } else if (order.status === "saiu_para_entrega") {
              if (order.tipo_entrega === "entrega") {
                badgeColor = "#007bff";
                badgeBg = "#e7f1ff";
                badgeBorder = "#b6d4fe";
                badgeText = "🚚 EM TRÂNSITO (A CAMINHO)";
              } else {
                badgeColor = "#28a745";
                badgeBg = "#e8f5e9";
                badgeBorder = "#c8e6c9";
                badgeText = "✅ PRONTO PARA RETIRADA NA LOJA";
              }
            } else if (order.status === "em_andamento") {
              badgeColor = "#2e7d32";
              badgeBg = "#e8f5e9";
              badgeBorder = "#c8e6c9";
              badgeText = "✅ EM LOCAÇÃO ATIVA";
            }

            return (
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontWeight: "bold",
                  fontSize: "0.9rem",
                  backgroundColor: badgeBg,
                  color: badgeColor,
                  border: `1px solid ${badgeBorder}`,
                }}
              >
                {badgeText}
              </span>
            );
          })()}
        </div>
      </div>

      <h1 style={{ marginTop: 0, color: "#2c3e50" }}>Pedido #{order.id}</h1>
      <HorarioFuncionamento />

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
            { label: "Reserva", icon: "📝" },
            { label: "Confirmado", icon: "📅" },
            { label: "Entrega/Retirada", icon: "🚚" },
            { label: "Em Uso", icon: "🏗️" },
            { label: "Devolução", icon: "🔄" },
            { label: "Finalizado", icon: "✅" }
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
                  width: "30px",
                  height: "30px",
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
                  {isLate ? "!" : (isCompleted ? "✓" : step.icon)}
                </div>
                
                {/* Nome do Step */}
                <span style={{
                  fontSize: "0.7rem",
                  fontWeight: (isActive || isLate) ? "bold" : "500",
                  color: color,
                  textAlign: "center",
                  lineHeight: "1.1"
                }}>
                  {isLate ? `⚠️ ATRASO NA DEVOLUÇÃO` : step.label}
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
            border: "1px solid #007bff",
            padding: "1.5rem",
            margin: "2rem 0",
            borderRadius: "8px",
            backgroundColor: "#f0f7ff",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#0056b3",
              borderBottom: "1px solid #cce5ff",
              paddingBottom: "10px",
            }}
          >
            Painel de Ações Internas
          </h3>
          <div
            style={{
              display: "flex",
              gap: "15px",
              flexWrap: "wrap",
              marginTop: "15px",
            }}
          >
            {/* Botão de Assinatura liberado para admin ou permissão correta */}
            {order.status === "aguardando_assinatura" &&
              podeColetarAssinatura && (
                <button
                  onClick={() => setIsContractModalOpen(true)}
                  style={{
                    ...btnActionStyle,
                    backgroundColor: "#17a2b8",
                    boxShadow: "0 2px 5px rgba(23, 162, 184, 0.3)",
                  }}
                >
                  🖊️ Coletar Assinatura Do Cliente
                </button>
              )}

            {/* Botão para os funcionarios coletarem a assinatura de DEVOLUÇÃO  */}
            {order.status === "aguardando_assinatura_devolucao" &&
              podeColetarAssinatura && (
                <button
                  onClick={() => setIsReturnModalOpen(true)}
                  style={{
                    ...btnActionStyle,
                    backgroundColor: "#28a745",
                    boxShadow: "0 2px 5px rgba(40, 167, 69, 0.3)",
                  }}
                >
                  🖊️ Coletar Assinatura de Devolução
                </button>
              )}

            {(isAdmin ||
              hasPermission("fazer_vistoria") ||
              hasPermission("gerenciar_reservas")) &&
              order.status === "aprovada" && (
                <Link to={`/admin/vistoria/${order.id}`}>
                  <button style={btnActionStyle}>
                    📋 Realizar Vistoria de Saída
                  </button>
                </Link>
              )}

            {(isAdmin ||
              hasPermission("fazer_vistoria") ||
              hasPermission("gerenciar_reservas")) &&
              order.status === "em_andamento" && (
                <Link to={`/admin/vistoria/${order.id}?tipo=devolucao`}>
                  <button style={btnActionStyle}>
                    📋 Registrar Devolução / Vistoria
                  </button>
                </Link>
              )}

            {(isAdmin ||
              hasPermission("gerenciar_reservas") ||
              hasPermission("ver_financeiro")) &&
              order.status === "aguardando_pagamento_final" && (
                <Link to={`/admin/finalize-payment/${order.id}`}>
                  <button style={btnActionStyle}>💲 Finalizar e Cobrar</button>
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
                  backgroundColor: "#28a745",
                  borderColor: "#28a745",
                }}
              >
                💰 Registrar Pagamento da Dívida (R${" "}
                {totalPendenteGeral.toFixed(2)})
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
              {order.coleta_confirmada
                ? "🚚 Caminhão a Caminho!"
                : order.solicitou_devolucao
                  ? "✅ Coleta Solicitada com Sucesso"
                  : "🚚 Solicitar Recolhimento da Máquina"}
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
              <span style={{ fontSize: "2rem" }}>🚚</span>
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
                            }}
                          >
                            ✅ PAGO / RECUPERADO
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
                            }}
                          >
                            ❌ PENDENTE (Dívida Ativa)
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
                  Total Registrado (B.O.):{" "}
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
                }}
              >
                {totalDividaAtiva > 0
                  ? `Restante Pendente: R$ ${totalDividaAtiva.toFixed(2)}`
                  : "✅ Todas as pendências foram quitadas."}
              </div>
            </div>
          </div>
        </div>
      )}

      {vistoriaDeSaida && (
        <div
          style={{
            margin: "2rem 0",
            padding: "1.5rem",
            backgroundColor: "#fff",
            border: "1px solid #ddd",
            borderRadius: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
          }}
        >
          <div>
            <h3 style={{ marginTop: 0, color: "#2c3e50" }}>
              Contrato de Locação Digital
            </h3>
            <p style={{ margin: 0, color: "#666" }}>
              Documento assinado e válido juridicamente.
            </p>
          </div>
          <button
            onClick={handleDownloadContract}
            disabled={contractLoading}
            style={btnSecondaryStyle}
          >
            {contractLoading ? "Gerando PDF..." : "Baixar Contrato (PDF)"}
          </button>
        </div>
      )}

      {order.assinatura_devolucao && (
        <div
          style={{
            marginTop: "20px",
            padding: "20px",
            backgroundColor: "#f8f9fa",
            border: "1px solid #ddd",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h3
            style={{
              color: "#2c3e50",
              marginTop: 0,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            ✅ Equipamentos Devolvidos
          </h3>
          <p style={{ color: "#555", marginBottom: "20px" }}>
            O termo de devolução foi assinado pelo cliente em{" "}
            {order.data_assinatura_devolucao
              ? new Date(order.data_assinatura_devolucao).toLocaleDateString(
                "pt-BR",
              )
              : "data não registrada"}
            .
          </p>

          <button
            onClick={handleDownloadReturnContract}
            style={{
              padding: "10px 20px",
              backgroundColor: "#17a2b8",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 4px rgba(23,162,184,0.3)",
            }}
          >
            📄 Baixar Termo de Devolução (PDF)
          </button>
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
            Dados Logísticos
          </h3>
          <p>
            <strong>Tipo de Entrega:</strong>{" "}
            {order.tipo_entrega === "entrega"
              ? "Entrega na Obra"
              : "Retirada na Loja"}
          </p>
          {order.tipo_entrega === "entrega" && (
            <p>
              <strong>Endereço:</strong> {order.endereco_entrega}
            </p>
          )}
          <div style={{ marginTop: "20px" }}>
            <p>
              <strong>Data de Saída:</strong>{" "}
              {parseDateStringAsLocal(order.data_inicio).toLocaleDateString()}
            </p>
            <p>
              <strong>Data de Devolução:</strong>{" "}
              {parseDateStringAsLocal(order.data_fim).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <hr style={{ margin: "3rem 0", borderColor: "#eee" }} />

      <h2 style={{ color: "#2c3e50" }}>Itens do Pedido e Vistorias</h2>
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
              border: "1px solid #ddd",
              padding: "2rem",
              marginBottom: "2rem",
              borderRadius: "12px",
              backgroundColor: item.prejuizo ? "#fff5f5" : "white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.4rem", color: "#2c3e50" }}>
                {item.Unidade.Equipamento.nome}
                <span
                  style={{
                    color: "#888",
                    fontSize: "0.9rem",
                    fontWeight: "normal",
                    marginLeft: "10px",
                  }}
                >
                  {" "}
                  (Patrimônio #{item.Unidade.id})
                </span>
              </h3>

              {item.status === "FINALIZADO_COM_PREJUIZO" && (
                <span
                  style={{
                    backgroundColor: "#c62828",
                    color: "white",
                    padding: "5px 10px",
                    borderRadius: "20px",
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                  }}
                >
                  NÃO DEVOLVIDO / B.O.
                </span>
              )}
            </div>

            {vistoriaDeSaida ? (
              <VistoriaDetailDisplay
                title="📋 Vistoria de Saída (Entrega)"
                detail={detalheSaida}
              />
            ) : order.status === "pendente" ? (
              <div
                style={{
                  padding: "15px",
                  backgroundColor: "#f8f9fa",
                  color: "#6c757d",
                  borderRadius: "6px",
                  border: "1px dashed #ccc",
                }}
              >
                Aguardando confirmação do pagamento para liberar vistoria...
              </div>
            ) : (
              order.status !== "cancelada" && (
                <div
                  style={{
                    padding: "15px",
                    backgroundColor: "#fff3cd",
                    color: "#856404",
                    borderRadius: "6px",
                  }}
                >
                  Aguardando vistoria de saída...
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
                  <h3 style={{ margin: "0 0 5px 0" }}>
                    🚨 Pendência Financeira (B.O.)
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
                  }}
                >
                  💳 Pagar Dívida Agora
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
              💰 Quitar Inadimplência
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
};

const btnSecondaryStyle: React.CSSProperties = {
  padding: "10px 20px",
  border: "2px solid #2c3e50",
  backgroundColor: "white",
  color: "#2c3e50",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold",
};

const btnDocStyle: React.CSSProperties = { padding: "6px 12px", border: "1px solid #ccc", backgroundColor: "white", color: "#333", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "5px" };
const btnDocStyleGov: React.CSSProperties = { ...btnDocStyle, backgroundColor: "#e9ecef", borderColor: "#ced4da", color: "#495057" };

export default ReservationDetailsPage;
