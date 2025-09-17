'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Equipamentos', 'total_quantidade', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Equipamentos', 'total_quantidade');
  },
};