'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ConfigLoja', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      fidelidade_num_pedidos: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      fidelidade_desconto_pct: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 10.00
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

    // Inserir um registro inicial padrão
    await queryInterface.bulkInsert('ConfigLoja', [{
      fidelidade_num_pedidos: 10,
      fidelidade_desconto_pct: 10.00,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ConfigLoja');
  }
};