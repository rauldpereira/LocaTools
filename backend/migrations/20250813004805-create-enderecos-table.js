'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Enderecos', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_usuario: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      rua: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      numero: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      complemento: {
        type: Sequelize.STRING(255)
      },
      bairro: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      cidade: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      estado: {
        type: Sequelize.STRING(2),
        allowNull: false
      },
      cep: {
        type: Sequelize.STRING(10),
        allowNull: false
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
    await queryInterface.dropTable('Enderecos');
  }
};