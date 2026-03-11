'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adiciona o valor 'PREJUIZO' no ENUM direto no banco (PostgreSQL)
    // Usamos query pura porque o Sequelize tem frescura com ENUM no Postgres
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_OrdensDeServico_status" ADD VALUE 'PREJUIZO';`
    );
  },

  down: async (queryInterface, Sequelize) => {
    // O PostgreSQL não deixa remover um valor de ENUM facilmente.
    // Então o 'down' fica vazio, porque essa ação é uma passagem só de ida!
    console.log("Remover valores de ENUM no PostgreSQL não é suportado de forma simples.");
  }
};