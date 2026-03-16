'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('OrdensDeServico', 'assinatura_cliente', {
      type: Sequelize.TEXT, 
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('OrdensDeServico', 'assinatura_cliente');
  }
};