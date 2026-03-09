'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Adiciona a coluna de permissões como um Array (JSON)
    await queryInterface.addColumn('Usuarios', 'permissoes', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: [] // Todo usuário nasce sem nenhuma permissão especial
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Usuarios', 'permissoes');
  }
};