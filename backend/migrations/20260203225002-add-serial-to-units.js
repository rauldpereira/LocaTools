'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Puxa a planta da tabela pra ver o que já tem lá dentro
    const tableInfo = await queryInterface.describeTable('Unidades');
    
    // Se a coluna NÃO existir, ele cria. Se existir, ele pula em silêncio!
    if (!tableInfo.codigo_serial) {
      await queryInterface.addColumn('Unidades', 'codigo_serial', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      });
      console.log('✅ Coluna "codigo_serial" criada com sucesso!');
    } else {
      console.log('⚠️ A coluna "codigo_serial" já existia. Pulando etapa...');
    }
  },

  async down (queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Unidades');
    if (tableInfo.codigo_serial) {
      await queryInterface.removeColumn('Unidades', 'codigo_serial');
    }
  }
};