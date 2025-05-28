const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const sequelize = new Sequelize(
    'abefra_doacoes',
    'app_abefra', 
    'SuaSenhaSeguraAqui123@', 
    { host: 'localhost', dialect: 'mysql' }
);

const Doacao = sequelize.define('Doacao', {
    nome_item: {
        type: DataTypes.STRING,
        allowNull: false
    },
    doador: {
        type: DataTypes.STRING,
        allowNull: false
    },
    quantidade: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1
        }
    },
    data_recebimento: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    data_validade: DataTypes.DATEONLY,
    categoria: {
        type: DataTypes.ENUM('alimentos', 'roupas', 'brinquedos', 'material escolar', 'outros'),
        allowNull: false
    },
    tipo_documento: {
        type: DataTypes.ENUM('CPF', 'CNPJ'),
        allowNull: false
    },
    documento: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            is: /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/
        }
    }
}, {
    tableName: 'doacoes', 
    timestamps: false 
});

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

sequelize.sync().then(() => {
    app.listen(port, () => {
        console.log(`Servidor rodando em http://localhost:${port}`);
    });
});