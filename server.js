const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const app = express();
const port = 3001;

// Configuração do CORS
app.use(cors());
app.use(express.json());

// Conexão com o MySQL
const sequelize = new Sequelize(
    'abefra_doacoes',
    'app_abefra', // Usuário correto
    'SuaSenhaSeguraAqui123@', // Senha definida
    { host: 'localhost', dialect: 'mysql' }
);

// Modelo da tabela
const Doacao = sequelize.define('Doacao', {
    nome_item: DataTypes.STRING,
    doador: DataTypes.STRING,
    quantidade: DataTypes.INTEGER,
    data_recebimento: DataTypes.DATEONLY,
    data_validade: DataTypes.DATEONLY,
    categoria: DataTypes.ENUM('alimentos', 'roupas', 'brinquedos', 'Material Escolar', 'outros')
}, {
    tableName: 'doacoes', // Nome exato da tabela no MySQL
    timestamps: false // Remove campos automáticos 'createdAt' e 'updatedAt'
});

// Rotas da API
app.get('/doacoes', async (req, res) => {
    try {
        const doacoes = await Doacao.findAll();
        res.json(doacoes);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.post('/doacoes', async (req, res) => {
    try {
        const novaDoacao = await Doacao.create(req.body);
        res.status(201).json(novaDoacao);
    } catch (error) {
        res.status(400).send(error.message);
    }
});

app.delete('/doacoes/:id', async (req, res) => {
    try {
        await Doacao.destroy({ where: { id: req.params.id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Iniciar servidor
sequelize.sync().then(() => {
    app.listen(port, () => {
        console.log(`Servidor rodando em http://localhost:${port}`);
    });
});