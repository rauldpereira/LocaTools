'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DetalhesVistoria extends Model {
    static associate(models) {
      DetalhesVistoria.belongsTo(models.Vistoria, {
        foreignKey: 'id_vistoria',
      });
      DetalhesVistoria.belongsTo(models.Unidade, {
        foreignKey: 'id_unidade',
      });
    }
  }
  DetalhesVistoria.init({
    id_vistoria: {
      type: DataTypes.INTEGER,
      references: { model: 'Vistorias', key: 'id' },
    },
    id_unidade: {
      type: DataTypes.INTEGER,
      field: 'id_item_equipamento', 
      references: {
        model: 'Unidades', 
        key: 'id',
      },
    },
    condicao: {
      type: DataTypes.ENUM('ok', 'danificado'),
      allowNull: false,
    },
    foto: DataTypes.STRING,
    comentarios: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'DetalhesVistoria',
    tableName: 'DetalhesVistoria'
  });
  return DetalhesVistoria;
};

