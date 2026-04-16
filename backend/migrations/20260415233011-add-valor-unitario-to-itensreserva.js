'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ItensReserva', 'valor_unitario', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true, // Permitimos null inicialmente para não quebrar registros antigos
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('ItensReserva', 'valor_unitario');
  }
};