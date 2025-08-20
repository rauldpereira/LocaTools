'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Equipamento extends Model {
    static associate(models) {
      Equipamento.belongsTo(models.Categoria, {
        foreignKey: 'id_categoria',
        as: 'Categoria',
        targetKey: 'id'
      });

      Equipamento.hasMany(models.ItensEquipamento, {
        foreignKey: 'id_equipamento',
      });
      
      Equipamento.hasMany(models.Reserva, {
        foreignKey: 'id_equipamento',
      });
    }
  }
  Equipamento.init({
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descricao: DataTypes.TEXT,
    preco_diaria: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    id_categoria: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Categorias',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('disponivel', 'alugado', 'manutencao'),
      allowNull: false,
    },
    url_imagem: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Equipamento',
    tableName: 'Equipamentos',
  });
  return Equipamento;
};