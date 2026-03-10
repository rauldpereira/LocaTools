import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios, { type AxiosRequestConfig } from "axios";
import { useAuth } from "../context/AuthContext";
import RescheduleModal from "../components/RescheduleModal";
import HorarioFuncionamento from "../components/HorarioFuncionamentoDisplay";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const { token, user } = useAuth();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChecked, setIsChecked] = useState(false);
  const [signing, setSigning] = useState(false);
  const [contractLoading, setContractLoading] = useState(false);
  const backendUrl = "http://localhost:3001";
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [lojaConfig, setLojaConfig] = useState<any>(null);

  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [recoverMethod, setRecoverMethod] = useState("pix");
  const [isRecovering, setIsRecovering] = useState(false);

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

  const handleDownloadFatura = () => {
    if (!order) return;

    const configLoja = {
      razaoSocial: "LOCATOOLS LOCAÇÃO DE EQUIPAMENTOS LTDA",
      cnpj: "00.000.000/0001-00",
      endereco: lojaConfig?.endereco_origem || "Endereço não cadastrado",
      horarios: {
        segunda: "07:00 às 18:00",
        tercaASabado: "08:00 às 18:00",
        domingo: "Fechado",
      },
    };

    const dataRetirada = parseDateStringAsLocal(order.data_inicio);
    const diasDaSemana = [
      "Domingo",
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
    ];
    const diaSemanaIndex = dataRetirada.getDay();
    const nomeDia = diasDaSemana[diaSemanaIndex];

    let horarioRetiradaDia = configLoja.horarios.tercaASabado;
    if (diaSemanaIndex === 1) horarioRetiradaDia = configLoja.horarios.segunda;
    if (diaSemanaIndex === 0) horarioRetiradaDia = configLoja.horarios.domingo;

    const doc = new jsPDF();
    const marginX = 10;
    let startY = 10;

    // --- CABEÇALHO
    doc.rect(marginX, startY, 190, 25);
    doc.line(marginX + 60, startY, marginX + 60, startY + 25);
    doc.line(marginX + 140, startY, marginX + 140, startY + 25);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("LOCATOOLS", marginX + 10, startY + 14);

    doc.setFontSize(14);
    doc.text("FATURA DE LOCAÇÃO", marginX + 70, startY + 8);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Data de emissão: ${new Date().toLocaleDateString("pt-BR")}`,
      marginX + 65,
      startY + 16,
    );
    doc.text(
      `Vencimento: ${parseDateStringAsLocal(order.data_inicio).toLocaleDateString("pt-BR")}`,
      marginX + 65,
      startY + 22,
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`NÚMERO: ${order.id}`, marginX + 145, startY + 14);

    startY += 28;

    // --- DADOS DA LOCADORA
    doc.rect(marginX, startY, 190, 25);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("LOCADORA", marginX + 85, startY + 4);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Razão Social: ${configLoja.razaoSocial}`,
      marginX + 2,
      startY + 10,
    );
    doc.text(`CNPJ: ${configLoja.cnpj}`, marginX + 145, startY + 10);
    doc.text(`Endereço: ${configLoja.endereco}`, marginX + 2, startY + 16);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    const textoHorario = `Horário de Retirada e Devolução (${nomeDia}): ${horarioRetiradaDia}`;
    doc.text(textoHorario, marginX + 50, startY + 22);

    startY += 28;

    // --- DADOS DO LOCATÁRIO
    doc.rect(marginX, startY, 190, 30);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("LOCATÁRIO", marginX + 85, startY + 4);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const nomeCliente = (order as any).Usuario?.nome || "Cliente Padrão";
    doc.text(`Nome/Razão Social: ${nomeCliente}`, marginX + 2, startY + 10);

    const enderecoTexto = `Endereço/Entrega: ${order.tipo_entrega === "entrega" ? order.endereco_entrega : "Retirada na Loja - Locatário assume transporte"}`;
    doc.text(enderecoTexto, marginX + 2, startY + 16, { maxWidth: 185 });

    doc.text(
      `Período de Locação: ${parseDateStringAsLocal(order.data_inicio).toLocaleDateString("pt-BR")} até ${parseDateStringAsLocal(order.data_fim).toLocaleDateString("pt-BR")}`,
      marginX + 2,
      startY + 26,
    );

    startY += 33;

    // --- TABELA DE ITENS
    const tableData = order.ItemReservas.map((item) => [
      "1",
      `${item.Unidade.Equipamento.nome} (S/N #${item.Unidade.id})`,
      `${parseDateStringAsLocal(order.data_inicio).toLocaleDateString("pt-BR")} a ${parseDateStringAsLocal(order.data_fim).toLocaleDateString("pt-BR")}`,
    ]);

    autoTable(doc, {
      startY: startY,
      head: [["QTD", "DESCRIÇÃO DO EQUIPAMENTO", "PERÍODO"]],
      body: tableData,
      theme: "grid",
      margin: { left: marginX },
      tableWidth: 190,
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontSize: 8,
        fontStyle: "bold",
        halign: "center",
        lineWidth: 0.1,
        lineColor: 0,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [0, 0, 0],
        lineWidth: 0.1,
        lineColor: 0,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 15 },
        1: {},
        2: { halign: "center", cellWidth: 50 },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // --- TOTAIS
    doc.rect(marginX, finalY, 190, 15);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");

    const subtotalAluguel =
      Number(order.valor_total) - Number(order.custo_frete || 0);
    const valorTotalAjustado =
      Number(order.valor_total) +
      Number(order.taxa_avaria || 0) +
      Number(order.taxa_remarcacao || 0);

    doc.text(
      `SUBTOTAL: R$ ${subtotalAluguel.toFixed(2)}`,
      marginX + 2,
      finalY + 6,
    );
    doc.text(
      `FRETE: R$ ${Number(order.custo_frete || 0).toFixed(2)}`,
      marginX + 60,
      finalY + 6,
    );
    doc.text(
      `SINAL PAGO: R$ ${Number(order.valor_sinal || 0).toFixed(2)}`,
      marginX + 110,
      finalY + 6,
    );

    doc.setFontSize(11);
    doc.text(
      `TOTAL GERAL: R$ ${valorTotalAjustado.toFixed(2)}`,
      marginX + 2,
      finalY + 12,
    );

    // --- DADOS ADICIONAIS / INFORMAÇÕES LEGAIS
    const termoY = finalY + 18;
    doc.rect(marginX, termoY, 190, 38);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(
      "DADOS ADICIONAIS / INFORMAÇÕES FISCAIS:",
      marginX + 2,
      termoY + 6,
    );

    doc.setFont("helvetica", "normal");
    doc.text(
      "Natureza da Operação: Locação de Bens Móveis",
      marginX + 2,
      termoY + 12,
    );
    doc.text(
      "Locação de bens móveis sem fornecimento de mão de obra.",
      marginX + 2,
      termoY + 17,
    );
    doc.text(
      "Dispensado da emissão de nota fiscal de serviços conforme Lei Complementar nº 116 de 31/07/2003",
      marginX + 2,
      termoY + 22,
    );
    doc.text(
      "e Súmula Vinculante 31 do Supremo Tribunal Federal (STF).",
      marginX + 2,
      termoY + 27,
    );

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(
      "NÃO É VÁLIDO COMO RECIBO FISCAL. VÁLIDO COMO DOCUMENTO DE TRANSPORTE/COBRANÇA.",
      marginX + 2,
      termoY + 34,
    );

    doc.save(`Fatura_Locacao_Pedido_${order.id}.pdf`);
  };

  const handleSignContract = async () => {
    if (!isChecked) return alert("Você precisa concordar com os termos.");
    setSigning(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(
        `${backendUrl}/api/reservations/${orderId}/sign`,
        {},
        config,
      );
      alert("Contrato assinado!");
      fetchOrderDetails();
    } catch (error) {
      alert("Erro ao assinar.");
    } finally {
      setSigning(false);
      setIsChecked(false);
    }
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
      manual_balcao: "Pagamento em Balcão (Manual)",
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
  const subtotal = order
    ? Number(order.valor_total) - Number(order.custo_frete)
    : 0;
  const valorTotalAjustado = order
    ? Number(order.valor_total) +
      Number(order.taxa_avaria || 0) +
      Number(order.taxa_remarcacao || 0)
    : 0;
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
          valor_recebido: totalPendenteGeral,
          forma_pagamento: recoverMethod,
        },
        config,
      );

      alert("✅ Dívida recuperada com sucesso! O nome do cliente está limpo.");
      setShowRecoverModal(false);
      fetchOrderDetails(); // Recarrega a página pra atualizar os status
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
          {user?.tipo_usuario === "admin" ? (
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
          {order.status !== "pendente" && order.status !== "cancelada" && (
            <button
              onClick={handleDownloadFatura}
              style={{
                padding: "8px 16px",
                backgroundColor: "#2c3e50",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              🖨️ Fatura (PDF)
            </button>
          )}

          <span
            style={{
              padding: "6px 12px",
              borderRadius: "20px",
              fontWeight: "bold",
              fontSize: "0.9rem",
              backgroundColor:
                order.status === "PREJUIZO"
                  ? "#ffebee"
                  : order.status === "pendente"
                    ? "#fff3cd"
                    : "#e8f5e9",
              color:
                order.status === "PREJUIZO"
                  ? "#c62828"
                  : order.status === "pendente"
                    ? "#856404"
                    : "#2e7d32",
              border: `1px solid ${order.status === "PREJUIZO" ? "#c62828" : order.status === "pendente" ? "#ffeeba" : "#2e7d32"}`,
            }}
          >
            {order.status.replace(/_/g, " ").toUpperCase()}
          </span>
        </div>
      </div>

      <h1 style={{ marginTop: 0, color: "#2c3e50" }}>Pedido #{order.id}</h1>
      <HorarioFuncionamento />

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
            <h3 style={{ margin: "0 0 5px 0" }}>⚠️ Pagamento Pendente!</h3>
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

      {user?.tipo_usuario === "admin" && (
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
            Painel de Ações
          </h3>
          <div
            style={{
              display: "flex",
              gap: "15px",
              flexWrap: "wrap",
              marginTop: "15px",
            }}
          >
            {order.status === "aprovada" && (
              <Link to={`/admin/vistoria/${order.id}`}>
                <button style={btnActionStyle}>
                  📋 Realizar Vistoria de Saída
                </button>
              </Link>
            )}
            {order.status === "em_andamento" && (
              <Link to={`/admin/vistoria/${order.id}?tipo=devolucao`}>
                <button style={btnActionStyle}>
                  📋 Registrar Devolução / Vistoria
                </button>
              </Link>
            )}
            {order.status === "aguardando_pagamento_final" && (
              <Link to={`/admin/finalize-payment/${order.id}`}>
                <button style={btnActionStyle}>💲 Finalizar e Cobrar</button>
              </Link>
            )}

            {order.status === "PREJUIZO" && (
              <button
                onClick={() => setShowRecoverModal(true)}
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

      {itensComPrejuizo.length > 0 && (
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

      {user?.tipo_usuario !== "admin" &&
        order.status === "aguardando_assinatura" && (
          <div
            style={{
              border: "2px solid #007bff",
              padding: "1.5rem",
              marginBottom: "2rem",
              borderRadius: "8px",
              backgroundColor: "#f8f9fa",
            }}
          >
            <h3 style={{ marginTop: 0, color: "#007bff" }}>
              Assinatura Pendente
            </h3>
            <p>
              Por favor, leia o contrato (botão acima) e confirme o aceite dos
              termos para liberar a retirada do equipamento.
            </p>
            <div
              style={{
                margin: "1.5rem 0",
                padding: "10px",
                backgroundColor: "#fff",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <input
                type="checkbox"
                id="terms"
                checked={isChecked}
                onChange={() => setIsChecked(!isChecked)}
                style={{ transform: "scale(1.5)", marginRight: "10px" }}
              />
              <label
                htmlFor="terms"
                style={{ fontSize: "1.1rem", cursor: "pointer" }}
              >
                Li, compreendi e concordo com os termos do contrato.
              </label>
            </div>
            <button
              onClick={handleSignContract}
              disabled={!isChecked || signing}
              style={btnPrimaryStyle}
            >
              {signing ? "Processando..." : "Assinar Digitalmente e Confirmar"}
            </button>
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
                R$ {(valorTotalAjustado - Number(order.valor_sinal)).toFixed(2)}
              </span>
            </div>
          )}
        </div>

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
          (d) => d.id_item_equipamento === item.Unidade.id,
        );
        const detalheDevolucao = vistoriaDeDevolucao?.detalhes.find(
          (d) => d.id_item_equipamento === item.Unidade.id,
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
            <p style={{ fontSize: "1.1rem", color: "#333" }}>
              O cliente está pagando o valor total de{" "}
              <strong style={{ color: "#c62828", fontSize: "1.3rem" }}>
                R$ {totalPendenteGeral.toFixed(2)}
              </strong>{" "}
              referente às pendências deste pedido?
            </p>

            <div style={{ marginTop: "20px", marginBottom: "25px" }}>
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
                disabled={isRecovering}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  background: "#28a745",
                  color: "white",
                  borderRadius: "6px",
                  cursor: isRecovering ? "not-allowed" : "pointer",
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
const btnPrimaryStyle: React.CSSProperties = {
  width: "100%",
  padding: "1rem",
  fontSize: "1.2rem",
  backgroundColor: "#28a745",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
  boxShadow: "0 4px 6px rgba(40,167,69,0.2)",
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

export default ReservationDetailsPage;
