'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('MesesPublicados', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      ano: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      mes: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      publicado: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
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

    // Adiciona o índice único que definimos no Model
    await queryInterface.addIndex('MesesPublicados', ['ano', 'mes'], {
      unique: true,
      name: 'idx_ano_mes_unico'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('MesesPublicados');
  }
};