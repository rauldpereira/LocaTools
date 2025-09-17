'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Reservas', 'id_equipamento');

    await queryInterface.addColumn('Reservas', 'id_unidade', {
      type: Sequelize.INTEGER,
      references: {
        model: 'Unidades',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Reservas', 'id_unidade');
    await queryInterface.addColumn('Reservas', 'id_equipamento', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  }
};