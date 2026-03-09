'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    // Remove a coluna inútil
    // ATENÇÃO: Confirme se o nome da sua tabela no banco é 'OrdensDeServicos', 'OrdensDeServico' ou 'OrdemDeServicos'
    await queryInterface.removeColumn('OrdensDeServico', 'id_unidade'); 
  },

  async down (queryInterface, Sequelize) {
    // Se der merda e precisarmos voltar atrás (Rollback), recriamos a coluna
    await queryInterface.addColumn('OrdensDeServico', 'id_unidade', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Unidades', // Confirme se o nome da tabela de unidades é esse mesmo
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  }
};