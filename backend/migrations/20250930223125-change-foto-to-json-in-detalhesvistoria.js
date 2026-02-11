'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeColumn('DetalhesVistoria', 'foto');

    await queryInterface.addColumn('DetalhesVistoria', 'foto', {
      type: Sequelize.JSONB, 
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('DetalhesVistoria', 'foto');
    await queryInterface.addColumn('DetalhesVistoria', 'foto', {
      type: Sequelize.STRING
    });
  }
};