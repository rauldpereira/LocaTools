const { Prejuizo, ItemReserva, Unidade, OrdemDeServico, sequelize } = require('../models');
const { Op } = require('sequelize');

const prejuizoController = {

  registrar: async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      const { item_reserva_id, tipo, valor_prejuizo, observacao } = req.body;

      const item = await ItemReserva.findByPk(item_reserva_id, {
        include: [{ model: Unidade, as: 'Unidade' }]
      });

      if (!item) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Item da reserva não encontrado.' });
      }

      // Cria o registro do Prejuízo/B.O. para ser cobrado
      const novoPrejuizo = await Prejuizo.create({
        item_reserva_id,
        tipo,
        valor_prejuizo,
        observacao,
        resolvido: false
      }, { transaction });
      
      // Trata o destino da máquina no Estoque
      if (['ROUBO', 'EXTRAVIO', 'AVARIA'].includes(tipo)) {
        if (item.Unidade) {
          await item.Unidade.update({ 
            status: 'inativo',
            observacao: `Baixa por ${tipo} na OS #${item.id_ordem_servico} dia ${new Date().toLocaleDateString('pt-BR')}`
          }, { transaction });

          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);

          // Procura se tem alguem que ia alugar essa máquina no futuro
          const alugueisFuturos = await ItemReserva.findAll({
            where: {
                id_unidade: item.Unidade.id,
                id: { [Op.ne]: item.id },
                data_inicio: { [Op.gte]: hoje }
            },
            include: [{
                model: OrdemDeServico,
                where: { status: ['pendente', 'aprovada', 'aguardando_assinatura', 'em_andamento'] }
            }],
            transaction
          });

          // Se tiver alguém que ia usar essa máquina
          for (const futuro of alugueisFuturos) {
              // Procura outras máquinas do mesmo modelo que estejam funcionais
              const substitutas = await Unidade.findAll({
                  where: {
                      id_equipamento: item.Unidade.id_equipamento,
                      id: { [Op.ne]: item.Unidade.id },
                      status: { [Op.ne]: 'inativo' }
                  },
                  transaction
              });

              let maquinaSalvadoraId = null;

              for (const sub of substitutas) {
                  const conflitos = await ItemReserva.count({
                      where: {
                          id_unidade: sub.id,
                          [Op.or]: [
                              {
                                  data_inicio: { [Op.lte]: futuro.data_fim },
                                  data_fim: { [Op.gte]: futuro.data_inicio }
                              }
                          ]
                      },
                      transaction
                  });

                  if (conflitos === 0) {
                      maquinaSalvadoraId = sub.id; // uma livre!
                      break;
                  }
              }

              if (maquinaSalvadoraId) {
                  // Troca a máquina no contrato do cara 
                  await futuro.update({
                      id_unidade: maquinaSalvadoraId,
                      observacao: (futuro.observacao || '') + `\n[Transplante Automático: A unidade original #${item.Unidade.id} sofreu um sinistro].`
                  }, { transaction });
              } else {
                  // Não tem máquina pra repor!
                  await futuro.update({
                      observacao: `🚨 ALERTA CRÍTICO: A máquina #${item.Unidade.id} sofreu perda total e NÃO HÁ SUBSTITUTAS. Cancele este item com o cliente!`
                  }, { transaction });
              }
          }

        }
      } else if (tipo === 'CALOTE') {
        if (item.Unidade) {
          // O cara deu calote do dinheiro, mas devolveu a máquina inteira
          await item.Unidade.update({ 
            status: 'disponivel'
          }, { transaction });
        }
      }

      await item.update({
        status: 'finalizado_com_prejuizo',
        data_devolucao_real: new Date()
      }, { transaction });

      const itensPendentes = await ItemReserva.count({
        where: {
          id_ordem_servico: item.id_ordem_servico,
          status: 'ativo'
        },
        transaction
      });

      if (itensPendentes === 0) {
        await OrdemDeServico.update({
          status: 'PREJUIZO'
        }, { 
          where: { id: item.id_ordem_servico },
          transaction 
        });
      }

      await transaction.commit();
      return res.status(201).json({ message: 'Prejuízo registrado com sucesso e estoque atualizado.', prejuizo: novoPrejuizo });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao registrar prejuízo:', error);
      return res.status(500).json({ error: error.message });
    }
  },
  
  listar: async (req, res) => {
    try {
      const prejuizos = await Prejuizo.findAll({
        include: [
          { 
            model: ItemReserva, 
            as: 'itemReserva',
            include: [{ model: Unidade, as: 'Unidade' }]
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      return res.json(prejuizos);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

};

module.exports = prejuizoController;