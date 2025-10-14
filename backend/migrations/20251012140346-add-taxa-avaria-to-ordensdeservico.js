'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('OrdensDeServico', 'taxa_avaria', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('OrdensDeServico', 'taxa_avaria');
  }
};