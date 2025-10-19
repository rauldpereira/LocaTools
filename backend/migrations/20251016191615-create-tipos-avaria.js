'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TiposAvaria', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      descricao: {
        type: Sequelize.STRING,
        allowNull: false
      },

      preco: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      id_equipamento: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Equipamentos', key: 'id' },
        onDelete: 'CASCADE'
      },
      is_default: { 
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
    await queryInterface.dropTable('TiposAvaria');
  }
};