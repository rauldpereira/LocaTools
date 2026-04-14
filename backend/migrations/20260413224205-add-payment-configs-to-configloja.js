'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ConfigLoja', 'sinal_porcentagem', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 50.00
    });
    await queryInterface.addColumn('ConfigLoja', 'momento_pagamento', {
      type: Sequelize.ENUM('reserva', 'entrega'),
      allowNull: false,
      defaultValue: 'reserva'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('ConfigLoja', 'sinal_porcentagem');
    await queryInterface.removeColumn('ConfigLoja', 'momento_pagamento');
    // Obs: Remover ENUMs no Postgres exige comandos específicos se necessário, 
    // mas para esse fluxo de desenvolvimento o removeColumn costuma ser suficiente.
  }
};
