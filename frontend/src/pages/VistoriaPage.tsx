import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { ClipboardCheck, Camera, AlertTriangle, CheckCircle, Package, ArrowLeft, ShieldAlert, FileText, UploadCloud, MessageSquare, AlertCircle, HelpCircle, X } from "lucide-react";
import { useToast } from '../context/ToastContext';

interface TipoAvaria {
  id: number;
  descricao: string;
  preco: string;
}

interface Equipamento {
  nome: string;
  TipoAvarias: TipoAvaria[];
}

interface Unit {
  id: number;
  Equipamento: Equipamento;
  avarias_atuais: number[] | null;
}

interface ReservedItem {
  id: number;
  Unidade: Unit;
}

interface AvariaEncontrada {
  id: number;
  id_detalhe_vistoria: number;
  id_tipo_avaria: number;
}

interface DetalheVistoriaFeita {
  id: number;
  condicao: string;
  comentarios: string;
  foto: string[] | null;
  id_unidade: number;
  avariasEncontradas?: AvariaEncontrada[];
}

interface VistoriaFeita {
  detalhes: DetalheVistoriaFeita[];
  tipo_vistoria: string;
}

interface OrderDetails {
  id: number;
  ItemReservas: ReservedItem[];
  Vistorias: VistoriaFeita[];
}

interface VistoriaDetailState {
  statusItem: "devolvido" | "prejuizo";
  condicao: "ok" | "danificado";
  comentarios: string;
  fotos: File[];
  checkedAvarias: { [key: number]: boolean };
  tipoPrejuizo: string;
  valorPrejuizo: string;
}

const VistoriaPage: React.FC = () => {
  const toast = useToast();
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [vistoriaDetails, setVistoriaDetails] = useState<{
    [key: number]: Partial<VistoriaDetailState>;
  }>({});
  const [loading, setLoading] = useState(false);
  const params = new URLSearchParams(location.search);
  const tipoVistoria =
    params.get("tipo") === "devolucao" ? "devolucao" : "entrega";
  const backendUrl = import.meta.env.VITE_API_URL;
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!token || !orderId) return;
      setLoading(true);
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/reservations/${orderId}`,
          config,
        );
        setOrder(data);

        const vistoriaDeSaida = data.Vistorias?.find(
          (v: any) => v.tipo_vistoria === "entrega",
        );
        const initialDetails: { [key: number]: Partial<VistoriaDetailState> } = {};

        data.ItemReservas.forEach((item: ReservedItem) => {
          const unitId = item.Unidade.id;
          let condicao: "ok" | "danificado" = "ok";
          let comentarios = "";
          const checkedAvarias: { [key: number]: boolean } = {};

          const avariasAtuaisDaMaquina = item.Unidade.avarias_atuais || [];
          avariasAtuaisDaMaquina.forEach((id: number) => {
            checkedAvarias[id] = true;
          });

          if (avariasAtuaisDaMaquina.length > 0) condicao = "danificado";

          const avariaOutros = item.Unidade.Equipamento.TipoAvarias.find(
            (a) => a.descricao.toLowerCase() === "outros"
          );
          if (avariaOutros && checkedAvarias[avariaOutros.id]) {
            comentarios = "Avaria pré-existente (Outros) registrada em locação anterior.";
          }

          if (tipoVistoria === "devolucao" && vistoriaDeSaida) {
            const detalheSaida = vistoriaDeSaida.detalhes.find(
              (d: any) => d.id_unidade === unitId,
            );

            if (detalheSaida) {
              if (
                detalheSaida.condicao === "danificado" ||
                avariasAtuaisDaMaquina.length > 0
              ) {
                condicao = "danificado";
              }
              if (detalheSaida.comentarios) {
                comentarios = detalheSaida.comentarios;
              }
            }
          }

          initialDetails[unitId] = {
            statusItem: "devolvido",
            condicao,
            comentarios,
            fotos: [],
            checkedAvarias,
            tipoPrejuizo: "ROUBO",
            valorPrejuizo: "",
          };
        });
        setVistoriaDetails(initialDetails);
      } catch (error) {
        console.error("Erro ao buscar ordem para vistoria:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, token, tipoVistoria]);

  const handleDetailChange = (
    unitId: number,
    field: keyof VistoriaDetailState,
    value: any,
  ) => {
    setVistoriaDetails((prev) => ({
      ...prev,
      [unitId]: { ...prev[unitId], [field]: value },
    }));
  };

  const handleFileChange = (unitId: number, files: FileList | null) => {
    if (!files) return;
    setVistoriaDetails((prev) => ({
      ...prev,
      [unitId]: { ...prev[unitId], fotos: Array.from(files) },
    }));
  };

  const handleAvariaCheck = (unitId: number, avariaId: number) => {
    setVistoriaDetails((prev) => {
      const currentChecks = prev[unitId]?.checkedAvarias || {};
      return {
        ...prev,
        [unitId]: {
          ...prev[unitId],
          checkedAvarias: {
            ...currentChecks,
            [avariaId]: !currentChecks[avariaId],
          },
        },
      };
    });
  };

  const handleSubmit = async () => {
    if (!order) return;
    setLoading(true);

    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      const itensPrejuizo = order.ItemReservas.filter(
        (item) => vistoriaDetails[item.Unidade.id]?.statusItem === "prejuizo",
      );
      const itensVistoria = order.ItemReservas.filter(
        (item) => vistoriaDetails[item.Unidade.id]?.statusItem === "devolvido",
      );

      for (const item of itensPrejuizo) {
        const details = vistoriaDetails[item.Unidade.id];
        if (!details?.valorPrejuizo) {
          toast.error(
            `Erro: Informe o valor do prejuízo para o item ${item.Unidade.Equipamento.nome}`,
          );
          setLoading(false);
          return;
        }

        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/prejuizos`,
          {
            item_reserva_id: item.id,
            tipo: details.tipoPrejuizo,
            valor_prejuizo: parseFloat(details.valorPrejuizo),
            observacao: `Registrado na tela de vistoria: ${details.comentarios || "Sem obs"}`,
          },
          config,
        );
      }

      if (itensVistoria.length > 0) {
        const formData = new FormData();
        formData.append("id_ordem_servico", order.id.toString());
        formData.append("tipo_vistoria", tipoVistoria);

        let isSubmitValid = true;

        const detalhesPayload = itensVistoria.map((item) => {
          const unitDetails = vistoriaDetails[item.Unidade.id];
          const avariasEncontradas = Object.keys(
            unitDetails?.checkedAvarias || {},
          )
            .filter((id) => unitDetails?.checkedAvarias?.[parseInt(id)])
            .map((id) => parseInt(id));

          let condicao = unitDetails?.condicao || "ok";
          if (avariasEncontradas.length > 0) {
            condicao = "danificado";
          }

          const avariaOutros = item.Unidade.Equipamento.TipoAvarias.find(
            (a) => a.descricao.toLowerCase() === "outros",
          );

          if (
            avariaOutros &&
            unitDetails?.checkedAvarias?.[avariaOutros.id] &&
            !unitDetails.comentarios
          ) {
            isSubmitValid = false;
            toast.error(
              `Erro na Unidade #${item.Unidade.id}: Você marcou "Outros" mas não preencheu os comentários.`,
            );
          }

          return {
            id_unidade: item.Unidade.id,
            condicao: condicao,
            comentarios: unitDetails?.comentarios || "",
            avariasEncontradas: avariasEncontradas,
          };
        });

        if (!isSubmitValid) {
          setLoading(false);
          return;
        }

        formData.append("detalhes", JSON.stringify(detalhesPayload));

        itensVistoria.forEach((item) => {
          const fotosDaUnidade = vistoriaDetails[item.Unidade.id]?.fotos;
          if (fotosDaUnidade) {
            fotosDaUnidade.forEach((file) => {
              formData.append(`fotos[${item.Unidade.id}]`, file);
            });
          }
        });

        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/vistorias`,
          formData,
          config,
        );
      }

      navigate(`/my-reservations/${order.id}`);
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(
        "Erro ao processar: " +
        (error.response?.data?.error || "Tente novamente."),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!order) return (
    <div style={{ textAlign: "center", padding: "60px", color: "#64748b", marginTop: "100px" }}>
        <p style={{ fontWeight: "bold" }}>Carregando dados da ordem...</p>
    </div>
  );

  const vistoriaDeSaida = order?.Vistorias.find(
    (v) => v.tipo_vistoria === "entrega",
  );

  return (
    <div style={{ maxWidth: "950px", margin: "100px auto 50px auto", padding: "0 20px", animation: "fadeIn 0.3s ease" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "30px" }}>
        <button onClick={() => navigate(-1)} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "50%", padding: "10px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <ArrowLeft size={24} />
        </button>
        <div style={{ backgroundColor: "#eff6ff", padding: "15px", borderRadius: "14px" }}>
          <ClipboardCheck size={32} color="#2563eb" />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, color: "#1e293b", fontSize: "1.8rem", fontWeight: 800 }}>
            {tipoVistoria === "entrega" ? "Vistoria de Saída" : "Vistoria de Devolução"}
          </h1>
          <p style={{ margin: "5px 0 0 0", color: "#64748b", fontWeight: "600", fontSize: "1rem" }}>
            Pedido #{order.id}
          </p>
        </div>
        <button
            onClick={() => setShowManual(true)}
            title="Manual da Vistoria"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "45px", height: "45px", borderRadius: "50%", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#64748b", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.color = "#2563eb"; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.color = "#64748b"; }}
          >
            <HelpCircle size={24} />
        </button>
      </div>

      {order.ItemReservas.map((item) => {
        const unitId = item.Unidade.id;
        const equipamento = item.Unidade.Equipamento;
        const details = vistoriaDetails[unitId];
        const isPrejuizo = details?.statusItem === "prejuizo";

        const detalheVistoriaSaida = vistoriaDeSaida?.detalhes.find(
          (d: any) => d.id_unidade === item.Unidade.id,
        );

        const avariasAtuaisDaMaquina = item.Unidade.avarias_atuais || [];
        const tinhaAvariaNaSaida = avariasAtuaisDaMaquina.length > 0;
        const condicaoRealSaida =
          detalheVistoriaSaida?.condicao === "danificado" || tinhaAvariaNaSaida
            ? "danificado"
            : "ok";

        const avariasHistorico = equipamento.TipoAvarias.filter(a => avariasAtuaisDaMaquina.includes(a.id));

        const avariaOutros = equipamento.TipoAvarias.find(
          (a) => a.descricao.toLowerCase() === "outros",
        );
        const avariasNormais = equipamento.TipoAvarias.filter(
          (a) => a.descricao.toLowerCase() !== "outros",
        );

        return (
          <div
            key={item.id}
            style={{
              border: isPrejuizo ? "2px solid #fecaca" : "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "25px",
              marginBottom: "30px",
              backgroundColor: isPrejuizo ? "#fef2f2" : "#fff",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
            }}
          >
            {/* Header do Equipamento */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "15px" }}>
                 <Package size={22} color={isPrejuizo ? "#ef4444" : "#64748b"} />
                 <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.3rem", fontWeight: 800 }}>
                   {equipamento.nome} 
                 </h3>
                 <span style={{ backgroundColor: "#f1f5f9", padding: "6px 12px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "bold", color: "#475569" }}>
                   Unidade #{unitId}
                 </span>
            </div>

            {tipoVistoria === "devolucao" && (
              <div style={{ display: "flex", gap: "15px", marginBottom: "25px" }}>
                <button 
                  onClick={() => handleDetailChange(unitId, "statusItem", "devolvido")}
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `2px solid ${!isPrejuizo ? "#10b981" : "#e2e8f0"}`, backgroundColor: !isPrejuizo ? "#f0fdf4" : "#f8fafc", color: !isPrejuizo ? "#047857" : "#64748b", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "0.2s" }}
                >
                  <CheckCircle size={18} /> Item Devolvido (Vistoriar)
                </button>
                <button 
                  onClick={() => handleDetailChange(unitId, "statusItem", "prejuizo")}
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `2px solid ${isPrejuizo ? "#ef4444" : "#e2e8f0"}`, backgroundColor: isPrejuizo ? "#fef2f2" : "#f8fafc", color: isPrejuizo ? "#b91c1c" : "#64748b", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "0.2s" }}
                >
                  <ShieldAlert size={18} /> Não Devolvido / Ocorrência
                </button>
              </div>
            )}

            {!isPrejuizo && (
              <>
                {tipoVistoria === "devolucao" && detalheVistoriaSaida && (
                  <div style={{ backgroundColor: "#f8fafc", padding: "20px", borderLeft: "4px solid #3b82f6", borderRadius: "10px", marginBottom: "25px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                      <FileText size={18} color="#3b82f6" />
                      <strong style={{ fontSize: "1rem", color: "#1e293b" }}>Histórico da Vistoria de Saída:</strong>
                    </div>

                    <div style={{ marginBottom: "10px" }}>
                      {condicaoRealSaida === "ok" ? (
                        <span style={{ color: "#10b981", fontWeight: "800", backgroundColor: "#ecfdf5", padding: "6px 12px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <CheckCircle size={16} /> Entregue em Bom Estado
                        </span>
                      ) : (
                        <span style={{ color: "#ef4444", fontWeight: "800", backgroundColor: "#fef2f2", padding: "6px 12px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <AlertTriangle size={16} /> Avariado na Entrega
                        </span>
                      )}
                    </div>

                    {tinhaAvariaNaSaida && (
                        <div style={{ margin: "15px 0 10px 0", backgroundColor: "#fff", padding: "15px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                          <strong style={{ color: "#ef4444", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                            <AlertTriangle size={16} /> Avarias Pré-existentes:
                          </strong>
                          <ul style={{ margin: 0, paddingLeft: "25px", color: "#475569", fontWeight: "600", fontSize: "0.9rem" }}>
                            {avariasHistorico.map((a: any) => (
                              <li key={a.id} style={{ marginBottom: "4px" }}>{a.descricao}</li>
                            ))}
                          </ul>
                        </div>
                    )}

                    {detalheVistoriaSaida?.comentarios && (
                      <div style={{ marginTop: "15px", color: "#475569", fontSize: "0.95rem", fontStyle: "italic", backgroundColor: "#fff", padding: "15px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", gap: "10px" }}>
                        <MessageSquare size={18} color="#94a3b8" style={{ flexShrink: 0, marginTop: "2px" }} />
                        <span>"{detalheVistoriaSaida.comentarios}"</span>
                      </div>
                    )}

                    {detalheVistoriaSaida.foto && detalheVistoriaSaida.foto.length > 0 && (
                        <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px dashed #cbd5e1" }}>
                          <strong style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "15px", fontSize: "0.9rem", color: "#64748b" }}>
                            <Camera size={18} /> Fotos da Saída:
                          </strong>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "12px" }}>
                            {detalheVistoriaSaida.foto.map((url: string, idx: number) => (
                                <a key={idx} href={`${backendUrl}${url}`} target="_blank" rel="noopener noreferrer" style={{ display: "block", aspectRatio: "1/1" }}>
                                  <img
                                    src={`${backendUrl}${url}`}
                                    alt={`Foto Saída ${idx + 1}`}
                                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "10px", border: "2px solid #e2e8f0", cursor: "zoom-in", transition: "all 0.2s ease", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
                                    onMouseOver={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 4px 8px rgba(59, 130, 246, 0.2)"; }}
                                    onMouseOut={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)"; }}
                                  />
                                </a>
                            ))}
                          </div>
                        </div>
                    )}
                  </div>
                )}

                <div style={{ marginBottom: "25px" }}>
                  <label style={{ display: "block", fontWeight: "800", color: "#475569", marginBottom: "8px", fontSize: "0.9rem", textTransform: "uppercase" }}>
                    Condição Geral do Equipamento
                  </label>
                  <select
                    value={details?.condicao || "ok"}
                    onChange={(e) => handleDetailChange(unitId, "condicao", e.target.value)}
                    style={{ width: "100%", padding: "12px 15px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "1rem", outline: "none", color: "#1e293b", backgroundColor: "#fff" }}
                  >
                    <option value="ok">OK / Bom Estado</option>
                    <option value="danificado">Danificado / Avariado</option>
                  </select>
                </div>

                <div style={{ marginBottom: "25px" }}>
                  <label style={{ fontWeight: "800", color: "#475569", marginBottom: "12px", fontSize: "0.9rem", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertTriangle size={16} /> Checklist de Avarias
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
                    {avariasNormais.map((avaria) => (
                      <label key={avaria.id} style={{ display: "flex", alignItems: "center", gap: "10px", background: details?.checkedAvarias?.[avaria.id] ? '#fef2f2' : '#f8fafc', padding: '10px 15px', borderRadius: '8px', border: `1px solid ${details?.checkedAvarias?.[avaria.id] ? '#fecaca' : '#e2e8f0'}`, cursor: 'pointer', transition: "0.2s" }}>
                        <input
                          type="checkbox"
                          checked={details?.checkedAvarias?.[avaria.id] || false}
                          onChange={() => handleAvariaCheck(unitId, avaria.id)}
                          style={{ width: "18px", height: "18px", accentColor: "#ef4444" }}
                        /> 
                        <span style={{ fontSize: "0.95rem", fontWeight: "600", color: details?.checkedAvarias?.[avaria.id] ? "#ef4444" : "#475569" }}>{avaria.descricao}</span>
                      </label>
                    ))}
                  </div>

                  {avariaOutros && (
                    <div style={{ marginTop: "10px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "10px", background: details?.checkedAvarias?.[avariaOutros.id] ? '#fef2f2' : '#f8fafc', padding: '10px 15px', borderRadius: '8px', border: `1px solid ${details?.checkedAvarias?.[avariaOutros.id] ? '#fecaca' : '#e2e8f0'}`, cursor: 'pointer', transition: "0.2s" }}>
                        <input
                          type="checkbox"
                          checked={details?.checkedAvarias?.[avariaOutros.id] || false}
                          onChange={() => handleAvariaCheck(unitId, avariaOutros.id)}
                          style={{ width: "18px", height: "18px", accentColor: "#ef4444" }}
                        /> 
                        <span style={{ fontSize: "0.95rem", fontWeight: "600", color: details?.checkedAvarias?.[avariaOutros.id] ? "#ef4444" : "#475569" }}>Outros (Descrever nas observações)</span>
                      </label>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: "25px" }}>
                  <label style={{ fontWeight: "800", color: "#475569", marginBottom: "8px", fontSize: "0.9rem", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Camera size={16} /> Anexar Fotos
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", padding: "20px", border: "2px dashed #cbd5e1", borderRadius: "12px", backgroundColor: "#f8fafc", cursor: "pointer", transition: "0.2s" }}>
                      <UploadCloud size={32} color="#94a3b8" style={{ marginBottom: "10px" }} />
                      <span style={{ color: "#475569", fontWeight: "600", fontSize: "0.95rem" }}>Clique para selecionar imagens</span>
                      <span style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "5px" }}>{details?.fotos && details.fotos.length > 0 ? `${details.fotos.length} arquivo(s) selecionado(s)` : 'Nenhuma imagem selecionada'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => handleFileChange(unitId, e.target.files)}
                      />
                  </label>
                </div>
              </>
            )}

            {isPrejuizo && (
              <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #fecaca", marginBottom: "25px" }}>
                <div style={{ display: "flex", gap: "10px", backgroundColor: "#fef2f2", padding: "12px", borderRadius: "8px", marginBottom: "20px" }}>
                    <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0, color: "#991b1b", fontSize: "0.9rem", fontWeight: "600" }}>
                      {details?.tipoPrejuizo === "CALOTE" 
                        ? "Atenção: Ao confirmar, o contrato deste item será encerrado como Inadimplência. A máquina constará como devolvida no estoque, mas a dívida será gerada e cobrada no pedido."
                        : "Atenção: Ao confirmar, esta unidade será automaticamente baixada do estoque (Perda/Roubo) e o contrato deste item será encerrado como Ocorrência."}
                    </p>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontWeight: "800", color: "#475569", marginBottom: "8px", fontSize: "0.85rem", textTransform: "uppercase" }}>
                    Motivo da Ocorrência
                  </label>
                  <select
                    value={details?.tipoPrejuizo || "EXTRAVIO"}
                    onChange={(e) => handleDetailChange(unitId, "tipoPrejuizo", e.target.value)}
                    style={{ width: "100%", padding: "12px 15px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "1rem", outline: "none", color: "#1e293b", backgroundColor: "#fff" }}
                  >
                    <option value="EXTRAVIO">Não Devolvido / Roubo (Baixa de Estoque)</option>
                    <option value="AVARIA">Avaria Total / Perda Total (Baixa de Estoque)</option>
                    <option value="CALOTE">Inadimplência (Devolveu, mas não pagou)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: "800", color: "#475569", marginBottom: "8px", fontSize: "0.85rem", textTransform: "uppercase" }}>
                    Valor Estimado do Prejuízo (R$) *
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 2500.00"
                    value={details?.valorPrejuizo || ""}
                    onChange={(e) => handleDetailChange(unitId, "valorPrejuizo", e.target.value)}
                    style={{ width: "100%", padding: "12px 15px", borderRadius: "10px", border: "1px solid #ef4444", fontSize: "1rem", outline: "none", color: "#1e293b", backgroundColor: "#fff", boxSizing: "border-box" }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ fontWeight: "800", color: "#475569", marginBottom: "8px", fontSize: "0.9rem", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
                <MessageSquare size={16} /> {isPrejuizo ? "Justificativa da Ocorrência *" : "Observações da Vistoria"}
              </label>
              <textarea
                style={{ width: "100%", minHeight: "100px", padding: "15px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "0.95rem", color: "#334155", outline: "none", boxSizing: "border-box", resize: "vertical" }}
                value={details?.comentarios || ""}
                onChange={(e) => handleDetailChange(unitId, "comentarios", e.target.value)}
                placeholder={isPrejuizo ? "Descreva os detalhes do ocorrido (obrigatório)..." : "Observações gerais sobre as condições do equipamento..."}
              />
            </div>
          </div>
        );
      })}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: "100%",
          padding: "18px",
          fontSize: "1.2rem",
          fontWeight: "800",
          backgroundColor: "#10b981",
          color: "white",
          border: "none",
          borderRadius: "14px",
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          boxShadow: "0 10px 15px -3px rgba(16, 185, 129, 0.3)",
          transition: "transform 0.2s",
          opacity: loading ? 0.7 : 1
        }}
        onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
        onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
      >
        {loading ? "Processando e Salvando Vistoria..." : "Confirmar e Finalizar Vistoria"}
      </button>

      {/* MODAL MANUAL */}
      {showManual && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, animation: "fadeIn 0.2s ease" }} onClick={() => setShowManual(false)}>
          <div style={{ backgroundColor: "#fff", borderRadius: "16px", width: "90%", maxWidth: "600px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 30px", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", color: "#1e293b" }}>
                <HelpCircle size={22} color="#2563eb" /> Manual do Usuário: Vistoria de {tipoVistoria === "entrega" ? "Saída" : "Devolução"}
              </h3>
              <button onClick={() => setShowManual(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" }}><X size={22} /></button>
            </div>

            <div style={{ padding: "30px", overflowY: "auto", flexGrow: 1 }}>
              <div style={{ color: "#475569", lineHeight: "1.6" }}>
                <p style={{ marginBottom: "25px", fontSize: "1rem" }}>
                  A vistoria é um passo obrigatório para garantir a integridade dos equipamentos e a segurança jurídica da locação.
                </p>

                {tipoVistoria === "entrega" ? (
                  <>
                    <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}>1</div>
                      <div>
                        <strong>Condição do Equipamento:</strong>
                        <p style={{ margin: "5px 0 0 0" }}>Marque como "OK" se o equipamento estiver limpo, funcionando e sem avarias. Se houver alguma avaria, marque "danificado" e selecione o tipo de avaria na lista. Caso não encontre o tipo de avaria desejado, utilize a opção "Outro" e descreva a avaria.</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}>2</div>
                      <div>
                        <strong>Fotos (Obrigatório):</strong>
                        <p style={{ margin: "5px 0 0 0" }}>Tire fotos nítidas do equipamento antes de entregá-lo. Registre todos os ângulos e, principalmente, qualquer avaria pré-existente.</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}>3</div>
                      <div>
                        <strong>Assinatura do Cliente:</strong>
                        <p style={{ margin: "5px 0 0 0" }}>Após finalizar esta vistoria de saída, o sistema liberará a coleta de assinatura do cliente no Protocolo de Entrega.</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}>1</div>
                      <div>
                        <strong>Comparação com a Saída:</strong>
                        <p style={{ margin: "5px 0 0 0" }}>Observe as fotos e comentários registrados na Vistoria de Saída (mostrados na tela) para comparar se o equipamento sofreu novos danos.</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#fef2f2", borderRadius: "12px", border: "1px solid #fecaca" }}>
                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#ef4444", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}>2</div>
                      <div>
                        <strong>Registrar Ocorrência:</strong>
                        <p style={{ margin: "5px 0 0 0" }}>Se o cliente não devolver o item, ou se houver "Perda Total", clique em "Não Devolvido / Ocorrência". Você precisará informar o valor estimado do prejuízo. O item será baixado do estoque e a dívida será cobrada no pedido.</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}>3</div>
                      <div>
                        <strong>Checklist de Avarias:</strong>
                        <p style={{ margin: "5px 0 0 0" }}>Marque qualquer nova avaria encontrada. Isso ficará salvo no histórico da máquina para a próxima locação.</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default VistoriaPage;