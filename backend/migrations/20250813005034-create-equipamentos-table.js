'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Equipamentos', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nome: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      descricao: {
        type: Sequelize.TEXT
      },
      preco_diaria: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      id_categoria: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Categorias',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.ENUM('disponivel', 'alugado', 'manutencao'),
        allowNull: false
      },
      url_imagem: {
        type: Sequelize.STRING(255)
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

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Equipamentos');
  }
};