const cron = require("node-cron");
const { OrdemDeServico, HorarioFuncionamento } = require("../models");
const { Op } = require("sequelize");
const {
  notificarUsuario,
  notificarPorPermissao, // 👈 Importamos o "Sniper" aqui
} = require("../utils/notificacaoHelper");

const iniciarRoboDeLembretes = () => {
  // Roda todo dia às 06:00 da manhã
  cron.schedule("0 6 * * *", async () => {
    console.log("🤖 [CRON] Iniciando varredura diária de lembretes...");

    try {
      // Configura as Datas (Hoje e Amanhã)
      const hojeInicio = new Date();
      hojeInicio.setHours(0, 0, 0, 0);
      const hojeFim = new Date(hojeInicio);
      hojeFim.setHours(23, 59, 59, 999);

      const amanhaInicio = new Date(hojeInicio);
      amanhaInicio.setDate(amanhaInicio.getDate() + 1);
      const amanhaFim = new Date(amanhaInicio);
      amanhaFim.setHours(23, 59, 59, 999);

      // BUSCA OS HORÁRIOS DO BANCO DE DADOS
      let horarioHojeStr = "em horário comercial";
      let horarioAmanhaStr = "em horário comercial";

      try {
        // Puxa todos os horários cadastrados
        const todosHorarios = await HorarioFuncionamento.findAll();

        const diasSemanaDb = [
          "domingo",
          "segunda",
          "terca",
          "quarta",
          "quinta",
          "sexta",
          "sabado",
        ];
        const nomeHoje = diasSemanaDb[hojeInicio.getDay()];
        const nomeAmanha = diasSemanaDb[amanhaInicio.getDay()];

        // Função auxiliar pra montar o texto do horário (Tirando os segundos)
        const montarTextoHorario = (diaNome) => {
          const h = todosHorarios.find((item) => item.dia_semana === diaNome);

          if (!h) return "em horário comercial";
          if (h.fechado) return "(Atenção: Loja Fechada)";

          if (h.horario_abertura && h.horario_fechamento) {
            const abre = h.horario_abertura.substring(0, 5);
            const fecha = h.horario_fechamento.substring(0, 5);
            return `das ${abre} às ${fecha}`;
          }
          return "em horário comercial";
        };

        horarioHojeStr = montarTextoHorario(nomeHoje);
        horarioAmanhaStr = montarTextoHorario(nomeAmanha);
      } catch (e) {
        console.log(
          "⚠️ [CRON] Erro ao buscar tabela de horários. Usando fallback.",
          e.message,
        );
      }


      // ==========================================
      // DISPAROS DE RETIRADA / ENTREGA (SAÍDAS)
      // ==========================================
      const saidasAmanha = await OrdemDeServico.findAll({
        where: {
          status: "aprovada",
          data_inicio: { [Op.gte]: amanhaInicio, [Op.lte]: amanhaFim },
        },
      });
      for (const os of saidasAmanha) {
        const verboAmanha = os.tipo_entrega === "entrega" ? "receberá" : "retirará";
        const tituloAmanha = os.tipo_entrega === "entrega" ? "🚚 Entrega P/ Amanhã" : "📦 Retirada P/ Amanhã";

        const acaoClienteAmanha = os.tipo_entrega === "entrega"
            ? `Aguarde a entrega no seu endereço ${horarioAmanhaStr}.`
            : `Venha retirar na loja ${horarioAmanhaStr}.`;

        await notificarUsuario(
          os.id_usuario,
          "🚚 Prepare-se! Sua locação é amanhã",
          `Sua reserva #${os.id} está agendada para amanhã. ${acaoClienteAmanha}`,
          `/my-reservations/${os.id}`,
        );

        // 🎯 Tiro Certeiro: O cara de reservas separa a máquina hoje para amanhã
        await notificarPorPermissao(
          "gerenciar_reservas",
          tituloAmanha,
          `O cliente da reserva #${os.id} ${verboAmanha} os equipamentos amanhã. Verifique o estoque e deixe separado.`,
          `/admin`,
        );
      }

      const saidasHoje = await OrdemDeServico.findAll({
        where: {
          status: "aprovada",
          data_inicio: { [Op.gte]: hojeInicio, [Op.lte]: hojeFim },
        },
      });
      for (const os of saidasHoje) {
        const verboHoje = os.tipo_entrega === "entrega" ? "recebe" : "retira";
        const tituloHoje = os.tipo_entrega === "entrega" ? "🚚 Entrega de Hoje" : "📦 Retirada de Hoje";

        const acaoClienteHoje = os.tipo_entrega === "entrega"
            ? `Aguarde a entrega no seu endereço ${horarioHojeStr}.`
            : `Venha retirar na loja ${horarioHojeStr}.`;

        await notificarUsuario(
          os.id_usuario,
          "⏳ Chegou o dia da sua locação!",
          `Sua reserva #${os.id} começa hoje. ${acaoClienteHoje}`,
          `/my-reservations/${os.id}`,
        );

        // Motorista avisa se for entregar, Balcão avisa se for buscar na loja
        const permissaoAlvo = os.tipo_entrega === "entrega" ? "fazer_vistoria" : "gerenciar_reservas";
        await notificarPorPermissao(
          permissaoAlvo,
          tituloHoje,
          `O cliente da reserva #${os.id} ${verboHoje} os equipamentos hoje.`,
          `/admin`,
        );
      }

      // ==========================================
      // DISPAROS DE DEVOLUÇÃO / RETORNO
      // ==========================================
      const devolucoesAmanha = await OrdemDeServico.findAll({
        where: {
          status: "em_andamento",
          data_fim: { [Op.gte]: amanhaInicio, [Op.lte]: amanhaFim },
        },
      });
      for (const os of devolucoesAmanha) {
        const verboDevolucaoAmanha = os.tipo_entrega === "entrega" ? "ser buscada" : "ser devolvida";

        const acaoDevAmanha = os.tipo_entrega === "entrega"
            ? `Aguarde nossa equipe buscar os equipamentos ${horarioAmanhaStr}.`
            : `Traga os equipamentos de volta na loja ${horarioAmanhaStr}.`;

        await notificarUsuario(
          os.id_usuario,
          "🔄 Devolução se aproximando",
          `Sua locação #${os.id} termina amanhã. ${acaoDevAmanha}`,
          `/my-reservations/${os.id}`,
        );

        // 🎯 Tiro Certeiro
        const permissaoAlvoDevAmanha = os.tipo_entrega === "entrega" ? "fazer_vistoria" : "gerenciar_reservas";
        await notificarPorPermissao(
          permissaoAlvoDevAmanha,
          "🔄 Retorno P/ Amanhã",
          `A reserva #${os.id} deve ${verboDevolucaoAmanha} amanhã. Prepare-se para a vistoria.`,
          `/admin`,
        );
      }

      const devolucoesHoje = await OrdemDeServico.findAll({
        where: {
          status: "em_andamento",
          data_fim: { [Op.gte]: hojeInicio, [Op.lte]: hojeFim },
        },
      });
      for (const os of devolucoesHoje) {
        const verboDevolucaoHoje = os.tipo_entrega === "entrega" ? "buscada" : "devolvida";

        const acaoDevHoje = os.tipo_entrega === "entrega"
            ? `Nossa equipe passará para buscar os equipamentos ${horarioHojeStr}.`
            : `Aguardamos a devolução na loja ${horarioHojeStr}.`;

        await notificarUsuario(
          os.id_usuario,
          "🚨 Hoje é o dia da devolução!",
          `Sua reserva #${os.id} encerra hoje. ${acaoDevHoje}`,
          `/my-reservations/${os.id}`,
        );

        // 🎯 Tiro Certeiro
        const permissaoAlvoDevHoje = os.tipo_entrega === "entrega" ? "fazer_vistoria" : "gerenciar_reservas";
        await notificarPorPermissao(
          permissaoAlvoDevHoje,
          "🚨 Recebimento Hoje",
          `A reserva #${os.id} vence hoje e deve ser ${verboDevolucaoHoje}. Fique atento.`,
          `/admin`,
        );
      }

      console.log(
        "✅ [CRON] Varredura finalizada. Lembretes enviados com horários dinâmicos e permissões alvo.",
      );
    } catch (error) {
      console.error("❌ [CRON] Erro ao rodar os lembretes:", error);
    }
  });
};

module.exports = { iniciarRoboDeLembretes };