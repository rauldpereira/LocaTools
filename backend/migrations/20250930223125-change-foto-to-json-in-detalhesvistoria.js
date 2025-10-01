'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('DetalhesVistoria', 'foto', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('DetalhesVistoria', 'foto', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  }
};