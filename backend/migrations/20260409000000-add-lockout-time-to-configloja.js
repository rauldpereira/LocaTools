module.exports = { 
  up: async (queryInterface, Sequelize) => { 
    await queryInterface.addColumn('ConfigLoja', 'horario_limite_hoje', { 
      type: Sequelize.STRING, 
      defaultValue: '12:00', 
      allowNull: true 
    }); 
  }, 
  down: async (queryInterface, Sequelize) => { 
    await queryInterface.removeColumn('ConfigLoja', 'horario_limite_hoje'); 
  } 
};