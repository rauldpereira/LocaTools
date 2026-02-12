module.exports = (sequelize, DataTypes) => {
    const FreteConfig = sequelize.define('FreteConfig', {
        preco_km: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 3.00 // Preço padrão por KM
        },
        taxa_fixa: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 20.00 // Taxa mínima de saída
        },
        endereco_origem: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'Av. Nossa Senhora do Bom Sucesso, 1000, Pindamonhangaba - SP'
        },
        raio_maximo_km: {
            type: DataTypes.INTEGER,
            defaultValue: 50 
        }
    }, {
        tableName: 'frete_config'
    });

    return FreteConfig;
};