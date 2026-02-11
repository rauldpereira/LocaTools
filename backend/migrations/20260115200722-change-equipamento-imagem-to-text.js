'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Altera a coluna url_imagem de STRING (255 chars) para TEXT (ilimitado)
    await queryInterface.changeColumn('Equipamentos', 'url_imagem', {
      type: Sequelize.TEXT,
      allowNull: true // ou false, dependendo da sua regra
    });
  },

  async down (queryInterface, Sequelize) {
    // Se precisar desfazer, volta para STRING
    await queryInterface.changeColumn('Equipamentos', 'url_imagem', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};