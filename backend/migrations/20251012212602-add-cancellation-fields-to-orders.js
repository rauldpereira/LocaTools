'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('OrdensDeServico', 'taxa_cancelamento', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
    await queryInterface.addColumn('OrdensDeServico', 'valor_reembolsado', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('OrdensDeServico', 'taxa_cancelamento');
    await queryInterface.removeColumn('OrdensDeServico', 'valor_reembolsado');
  }
};