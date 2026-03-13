'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Adiciona a coluna 'observacao' na tabela 'Unidades'
    await queryInterface.addColumn('Unidades', 'observacao', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove a coluna caso você precise desfazer (rollback) a migration
    await queryInterface.removeColumn('Unidades', 'observacao');
  }
};