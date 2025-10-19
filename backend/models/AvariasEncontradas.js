'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AvariasEncontradas extends Model {
    static associate(models) {
      AvariasEncontradas.belongsTo(models.DetalhesVistoria, {
        foreignKey: 'id_detalhe_vistoria',
      });
      AvariasEncontradas.belongsTo(models.TipoAvaria, {
        foreignKey: 'id_tipo_avaria',
      });
    }
  }
  AvariasEncontradas.init({
    id_detalhe_vistoria: DataTypes.INTEGER,
    id_tipo_avaria: DataTypes.INTEGER,
    observacao: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'AvariasEncontradas',
    tableName: 'AvariasEncontradas' 
  });
  return AvariasEncontradas;
};