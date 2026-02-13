'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Adiciona campo para saber se é PF ou PJ
    await queryInterface.addColumn('Usuarios', 'tipo_pessoa', {
      type: Sequelize.ENUM('fisica', 'juridica'),
      defaultValue: 'fisica',
      allowNull: false
    });

    // Adiciona CNPJ
    await queryInterface.addColumn('Usuarios', 'cnpj', {
      type: Sequelize.STRING,
      allowNull: true, // É null pq se for PF, não tem CNPJ
      unique: true
    });

    // Adiciona Razão Social 
    await queryInterface.addColumn('Usuarios', 'razao_social', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Usuarios', 'tipo_pessoa');
    await queryInterface.removeColumn('Usuarios', 'cnpj');
    await queryInterface.removeColumn('Usuarios', 'razao_social');
  }
};