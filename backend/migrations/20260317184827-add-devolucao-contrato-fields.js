'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Cria a coluna pra guardar a imagem da assinatura da devolução
    await queryInterface.addColumn('OrdensDeServico', 'assinatura_devolucao', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // 2. Cria a coluna pra guardar a data e hora dessa assinatura
    await queryInterface.addColumn('OrdensDeServico', 'data_assinatura_devolucao', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // 3. Atualiza a lista de status permitidos (ENUM) para incluir o novo status
    await queryInterface.changeColumn('OrdensDeServico', 'status', {
      type: Sequelize.ENUM(
        "pendente",
        "aprovada",
        "cancelada",
        "aguardando_assinatura",
        "em_andamento",
        "entregue",
        "aguardando_assinatura_devolucao", // 👈 O Novato entrou aqui!
        "devolvida",
        "finalizada",
        "aguardando_pagamento_final",
        "PREJUIZO"
      ),
      allowNull: false,
      defaultValue: "pendente",
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Caso dê ruim e você precise reverter a migration (db:migrate:undo)
    await queryInterface.removeColumn('OrdensDeServico', 'assinatura_devolucao');
    await queryInterface.removeColumn('OrdensDeServico', 'data_assinatura_devolucao');

    // Volta o ENUM pro formato antigo
    await queryInterface.changeColumn('OrdensDeServico', 'status', {
      type: Sequelize.ENUM(
        "pendente",
        "aprovada",
        "cancelada",
        "aguardando_assinatura",
        "em_andamento",
        "entregue",
        "devolvida",
        "finalizada",
        "aguardando_pagamento_final",
        "PREJUIZO"
      ),
      allowNull: false,
      defaultValue: "pendente",
    });
  }
};