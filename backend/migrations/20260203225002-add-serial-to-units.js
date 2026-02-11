'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Adiciona a coluna 'codigo_serial' na tabela 'Unidades'
    await queryInterface.addColumn('Unidades', 'codigo_serial', {
      type: Sequelize.STRING,
      allowNull: true, // Permite NULL pq as unidades antigas não têm serial ainda
      unique: true,    // Garante que não tenha serial repetido
    });
  },

  async down (queryInterface, Sequelize) {
    // Se precisar desfazer (rollback), remove a coluna
    await queryInterface.removeColumn('Unidades', 'codigo_serial');
  }
};