'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Adiciona a coluna na tabela Usuarios
    await queryInterface.addColumn('Usuarios', 'precisa_trocar_senha', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  async down (queryInterface, Sequelize) {
    // Se der rollback, ele remove a coluna
    await queryInterface.removeColumn('Usuarios', 'precisa_trocar_senha');
  }
};