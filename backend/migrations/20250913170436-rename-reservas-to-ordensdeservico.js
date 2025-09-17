'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Renomeia a tabela 'Reservas' para 'OrdensDeServico'
    await queryInterface.renameTable('Reservas', 'OrdensDeServico');

    // A tabela 'Entregas' tem uma chave estrangeira para 'Reservas'.
    // Precisamos renomear a chave estrangeira na tabela 'Entregas'.
    await queryInterface.renameColumn('Entregas', 'id_reserva', 'id_ordem_servico');

    // A tabela 'Pagamentos' também tem uma chave estrangeira para 'Reservas'.
    await queryInterface.renameColumn('Pagamentos', 'id_reserva', 'id_ordem_servico');

  },

  down: async (queryInterface, Sequelize) => {
    // Desfaz as alterações
    await queryInterface.renameTable('OrdensDeServico', 'Reservas');
    await queryInterface.renameColumn('Entregas', 'id_ordem_servico', 'id_reserva');
    await queryInterface.renameColumn('Pagamentos', 'id_ordem_servico', 'id_reserva');
  }
};