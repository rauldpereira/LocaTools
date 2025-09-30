'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Vistoria extends Model {
    static associate(models) {
      Vistoria.belongsTo(models.OrdemDeServico, {
        foreignKey: 'id_reserva',
      });
      Vistoria.hasMany(models.DetalhesVistoria, {
        foreignKey: 'id_vistoria',
        as: 'detalhes'
      });
    }
  }
  Vistoria.init({
    id_reserva: DataTypes.INTEGER,
    id_responsavel_vistoria: DataTypes.INTEGER,
    tipo_vistoria: DataTypes.ENUM('entrega', 'devolucao'),
    data: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Vistoria',
    tableName: 'Vistorias' 
  });
  return Vistoria;
};

