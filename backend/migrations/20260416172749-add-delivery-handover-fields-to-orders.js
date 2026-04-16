'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('OrdensDeServico', 'nome_recebedor', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('OrdensDeServico', 'documento_recebedor', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('OrdensDeServico', 'assinatura_entregador', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('OrdensDeServico', 'nome_entregador', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('OrdensDeServico', 'nome_recebedor');
    await queryInterface.removeColumn('OrdensDeServico', 'documento_recebedor');
    await queryInterface.removeColumn('OrdensDeServico', 'assinatura_entregador');
    await queryInterface.removeColumn('OrdensDeServico', 'nome_entregador');
  }
};