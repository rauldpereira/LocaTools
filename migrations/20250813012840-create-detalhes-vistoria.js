'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DetalhesVistoria', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_vistoria: {
        type: Sequelize.INTEGER
      },
      id_item_equipamento: {
        type: Sequelize.INTEGER
      },
      condicao: {
        type: Sequelize.STRING
      },
      foto: {
        type: Sequelize.STRING
      },
      comentarios: {
        type: Sequelize.TEXT
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('DetalhesVistoria');
  }
};