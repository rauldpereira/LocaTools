'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('OrdensDeServico', 'taxa_atraso', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('OrdensDeServico', 'taxa_atraso');
  }
};