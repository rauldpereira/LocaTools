'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Reservas', 'quantidade', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1, 
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Reservas', 'quantidade');
  },
};