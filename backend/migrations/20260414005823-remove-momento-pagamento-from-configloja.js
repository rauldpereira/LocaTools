'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('ConfigLoja', 'momento_pagamento');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('ConfigLoja', 'momento_pagamento', {
      type: Sequelize.ENUM('reserva', 'entrega'),
      allowNull: false,
      defaultValue: 'reserva'
    });
  }
};
