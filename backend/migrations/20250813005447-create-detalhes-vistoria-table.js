'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('DetalhesVistoria', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_vistoria: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Vistorias',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      id_item_equipamento: {
        type: Sequelize.INTEGER,
        references: {
          model: 'ItensEquipamento',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      condicao: {
        type: Sequelize.ENUM('ok', 'danificado'),
        allowNull: false
      },
      foto: {
        type: Sequelize.STRING(255)
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

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('DetalhesVistoria');
  }
};