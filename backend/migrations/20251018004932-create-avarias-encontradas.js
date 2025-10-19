'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AvariasEncontradas', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_detalhe_vistoria: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'DetalhesVistoria', key: 'id' },
        onDelete: 'CASCADE'
      },
      id_tipo_avaria: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'TiposAvaria', key: 'id' },
        onDelete: 'CASCADE'
      },
      observacao: {
        type: Sequelize.TEXT,
        allowNull: true
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
    await queryInterface.dropTable('AvariasEncontradas');
  }
};