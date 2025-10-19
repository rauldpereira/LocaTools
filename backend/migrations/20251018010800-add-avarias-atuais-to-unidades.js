'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Unidades', 'avarias_atuais', {
      type: Sequelize.JSON,
      allowNull: true, // Permite que seja nulo se a unidade estiver 'ok'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Unidades', 'avarias_atuais');
  }
};