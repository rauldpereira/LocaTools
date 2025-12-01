'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ItensReserva', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'ATIVO' 
    });
    

    await queryInterface.addColumn('ItensReserva', 'data_devolucao_real', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('ItensReserva', 'status');
    await queryInterface.removeColumn('ItensReserva', 'data_devolucao_real');
  }
};