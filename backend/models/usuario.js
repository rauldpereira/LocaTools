'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Usuario extends Model {
    static associate(models) {
      Usuario.hasMany(models.Endereco, {
        foreignKey: 'id_usuario'
      });

      Usuario.hasMany(models.OrdemDeServico, {
        foreignKey: 'id_usuario'
      });

      Usuario.hasMany(models.Entrega, {
        foreignKey: 'id_motorista'
      });

      Usuario.hasMany(models.Vistoria, {
        foreignKey: 'id_responsavel_vistoria'
      });
    }
  }
  Usuario.init({
    nome: DataTypes.STRING,
    email: DataTypes.STRING,
    senha_hash: DataTypes.STRING,
    tipo_usuario: {
      type: DataTypes.ENUM('cliente', 'admin', 'motorista')
    },
    telefone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cpf: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    rg: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Usuario',
  });
  return Usuario;
};