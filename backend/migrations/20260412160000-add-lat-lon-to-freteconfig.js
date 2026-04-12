'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('frete_config', 'lat_origem', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('frete_config', 'lon_origem', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('frete_config', 'lat_origem');
    await queryInterface.removeColumn('frete_config', 'lon_origem');
  }
};
