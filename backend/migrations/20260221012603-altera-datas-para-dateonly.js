'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Mudando na tabela de Ordens de Serviço
    await queryInterface.changeColumn('OrdemDeServicos', 'data_inicio', {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });
    
    await queryInterface.changeColumn('OrdemDeServicos', 'data_fim', {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });

    // 2. Mudando na tabela de Itens da Reserva
    await queryInterface.changeColumn('ItemReservas', 'data_inicio', {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });
    
    await queryInterface.changeColumn('ItemReservas', 'data_fim', {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Se precisar reverter, volta para o DATE padrão (com hora)
    await queryInterface.changeColumn('OrdemDeServicos', 'data_inicio', {
      type: Sequelize.DATE,
      allowNull: false,
    });
    
    await queryInterface.changeColumn('OrdemDeServicos', 'data_fim', {
      type: Sequelize.DATE,
      allowNull: false,
    });

    await queryInterface.changeColumn('ItemReservas', 'data_inicio', {
      type: Sequelize.DATE,
      allowNull: false,
    });
    
    await queryInterface.changeColumn('ItemReservas', 'data_fim', {
      type: Sequelize.DATE,
      allowNull: false,
    });
  }
};