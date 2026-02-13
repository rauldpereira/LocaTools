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
    telefone: {
      type: DataTypes.STRING,
      allowNull: true
    },

    tipo_usuario: {
      type: DataTypes.ENUM('cliente', 'admin', 'motorista'),
      defaultValue: 'cliente'
    },
    tipo_pessoa: {
      type: DataTypes.ENUM('fisica', 'juridica'),
      defaultValue: 'fisica'
    },
    cpf: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    rg: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cnpj: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    razao_social: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Usuario',
  });

  return Usuario;
};