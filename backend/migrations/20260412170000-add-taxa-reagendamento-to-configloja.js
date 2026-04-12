'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ConfigLoja', 'taxa_reagendamento', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ConfigLoja', 'taxa_reagendamento');
  }
};
