const { Prejuizo, ItemReserva, Unidade, OrdemDeServico, sequelize } = require('../models');

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

      const novoPrejuizo = await Prejuizo.create({
        item_reserva_id,
        tipo,
        valor_prejuizo,
        observacao,
        resolvido: false
      }, { transaction });
      
      if (['ROUBO', 'EXTRAVIO', 'AVARIA'].includes(tipo)) {
        if (item.Unidade) {
          await item.Unidade.update({ 
            status: 'manutencao',
            observacao: `Baixa por ${tipo} na OS #${item.id_ordem_servico}`
          }, { transaction });
        }
      } else if (tipo === 'CALOTE') {
        if (item.Unidade) {
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
          status: 'finalizada'
        }, { 
          where: { id: item.id_ordem_servico },
          transaction 
        });
      }

      await transaction.commit();
      return res.status(201).json({ message: 'Prejuízo registrado com sucesso.', prejuizo: novoPrejuizo });

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