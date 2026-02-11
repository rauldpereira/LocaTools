'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('OrdensDeServico', 'status');

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_OrdensDeServico_status";');

    await queryInterface.addColumn('OrdensDeServico', 'status', {
      type: Sequelize.ENUM(
        'pendente',
        'aprovada',
        'cancelada',
        'entregue',
        'devolvida',
        'finalizada',
        // Novos 
        'aguardando_assinatura',
        'aguardando_pagamento_final',
        'em_andamento'
      ),
      allowNull: false,
      defaultValue: 'pendente'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('OrdensDeServico', 'status');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_OrdensDeServico_status";');

    await queryInterface.addColumn('OrdensDeServico', 'status', {
      type: Sequelize.ENUM(
        'pendente',
        'aprovada',
        'cancelada',
        'entregue',
        'devolvida',
        'finalizada'
      ),
      allowNull: false,
      defaultValue: 'pendente'
    });
  }
};