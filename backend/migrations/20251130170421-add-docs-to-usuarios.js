'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Usuarios', 'telefone', {
      type: Sequelize.STRING,
      allowNull: true // Permite nulo pq os usuarios antigos nao tem
    });
    await queryInterface.addColumn('Usuarios', 'cpf', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true // CPF tem que ser único
    });
    await queryInterface.addColumn('Usuarios', 'rg', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Usuarios', 'telefone');
    await queryInterface.removeColumn('Usuarios', 'cpf');
    await queryInterface.removeColumn('Usuarios', 'rg');
  }
};