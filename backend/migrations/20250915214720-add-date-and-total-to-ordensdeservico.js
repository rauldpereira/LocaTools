'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'OrdensDeServico',
      'valor_total', 
      {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        after: 'quantidade'
      }
    );
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.removeColumn('OrdensDeServico', 'valor_total');
  }
};