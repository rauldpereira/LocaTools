'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    return queryInterface.changeColumn('OrdensDeServico', 'status', {
      type: Sequelize.ENUM(
        'pendente',
        'aprovada',
        'cancelada',
        'entregue',
        'devolvida',
        'finalizada',
        // novos
        'aguardando_assinatura',
        'aguardando_pagamento_final',
        'em_andamento' 
      ),
      allowNull: false,
      defaultValue: 'pendente'
    });
  },

  async down(queryInterface, Sequelize) {
  
    return queryInterface.changeColumn('OrdensDeServico', 'status', {
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