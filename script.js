const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = themeToggle.querySelector('i');

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
updateIcon(savedTheme);

function updateIcon(theme) {
    themeIcon.className = theme === 'light' ? 'bx bx-sun' : 'bx bx-moon';
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateIcon(newTheme);
    
    if (graficoRosca) graficoRosca.update();
});

let graficoRosca = null;

document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    toggleValidade();
});

document.getElementById('categoria').addEventListener('change', toggleValidade);

function toggleValidade() {
    const categoria = document.getElementById('categoria').value;
    const validadeInput = document.getElementById('dataValidade');
    
    if (categoria === 'alimentos') {
        validadeInput.classList.remove('hidden');
        validadeInput.required = true;
    } else {
        validadeInput.classList.add('hidden');
        validadeInput.required = false;
        validadeInput.value = '';
    }
}

document.getElementById('formDoacao').addEventListener('submit', function(e) {
    e.preventDefault();

    const categoria = document.getElementById('categoria').value;
    const dataRecebimentoInput = document.getElementById('dataRecebimento');
    const dataValidadeInput = document.getElementById('dataValidade');

    const converterParaISO = (dataString) => {
        if (!dataString) return null;
        const [dia, mes, ano] = dataString.split('/');
        return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    };

    const validarFormatoData = (dataString) => {
        return /^\d{2}\/\d{2}\/\d{4}$/.test(dataString);
    };

    // Validação das entradas
    if (!validarFormatoData(dataRecebimentoInput.value)) {
        alert('Formato de data inválido! Use DD/MM/AAAA');
        return;
    }

    if (categoria === 'alimentos' && !validarFormatoData(dataValidadeInput.value)) {
        alert('Formato de validade inválido! Use DD/MM/AAAA');
        return;
    }

    const dataRecebimentoISO = converterParaISO(dataRecebimentoInput.value);
    const dataValidadeISO = converterParaISO(dataValidadeInput.value);

    // 4. Validação de datas reais
    const validarDataReal = (dataISO) => {
        const date = new Date(dataISO);
        return !isNaN(date.getTime());
    };

    if (!validarDataReal(dataRecebimentoISO)) {
        alert('Data de recebimento inválida!');
        return;
    }

    if (categoria === 'alimentos' && !validarDataReal(dataValidadeISO)) {
        alert('Data de validade inválida!');
        return;
    }

    const item = {
        id: Date.now(),
        nome: document.getElementById('nomeItem').value,
        doador: document.getElementById('doador').value,
        quantidade: document.getElementById('quantidade').value,
        dataRecebimento: dataRecebimentoISO,
        dataValidade: categoria === 'alimentos' ? dataValidadeISO : null,
        categoria: categoria
    };

    const itens = JSON.parse(localStorage.getItem('doacoes')) || [];
    itens.push(item);
    localStorage.setItem('doacoes', JSON.stringify(itens));

    atualizarTabela(itens);
    verificarAlertas(itens);
    atualizarDashboard(itens);
    this.reset();
    toggleValidade();
});

function carregarDados() {
    const itens = JSON.parse(localStorage.getItem('doacoes')) || [];
    atualizarTabela(itens);
    verificarAlertas(itens);
    atualizarDashboard(itens);
}

function atualizarTabela(itens) {
    const corpoTabela = document.getElementById('corpoTabela');
    corpoTabela.innerHTML = '';
    
    itens.forEach((item, index) => {
        const tr = document.createElement('tr');
        const diasRestantes = item.dataValidade ? calcularDiasRestantes(item.dataValidade) : null;
        
        tr.innerHTML = `
            <!-- ... (células existentes mantidas) -->
            <td>
                <button class="btn-excluir" onclick="excluirItem(${index})">
                    <i class='bx bx-trash'></i>
                </button>
            </td>
            <td>${item.nome}</td>
            <td>${item.doador || 'Não informado'}</td>
            <td>${item.quantidade}</td>
            <td>${formatarData(item.dataRecebimento)}</td>
            <td>${item.dataValidade ? formatarData(item.dataValidade) : 'N/A'}</td>
            <td>${item.categoria}</td>
            <td class="${item.categoria === 'alimentos' && (diasRestantes <= 7 || diasRestantes <= 0) ? 'status-alerta' : ''}">
    ${item.categoria === 'alimentos' 
        ? (diasRestantes <= 0 
            ? `Vencido há ${Math.abs(diasRestantes)} dias` 
            : `${diasRestantes} dias restantes`)
        : 'N/A'}
</td>
        `;
        corpoTabela.appendChild(tr);
    });
}

function atualizarDashboard(itens) {
    const categorias = {
        alimentos: 0,
        roupas: 0,
        brinquedos: 0,
        'Material Escolar': 0,
        outros: 0
    };

    let proximosVencer = 0;

    itens.forEach(item => {
        categorias[item.categoria]++;
        if(item.categoria === 'alimentos' && item.dataValidade) {
            const dias = calcularDiasRestantes(item.dataValidade);
            if(dias > 0 && dias <= 7) proximosVencer++;
        }
    });

    animarNumero('totalItens', itens.length);
    animarNumero('totalAlimentos', categorias.alimentos);
    animarNumero('totalRoupas', categorias.roupas);
    animarNumero('proximosVencer', proximosVencer);

    renderizarGrafico(itens);
}

function renderizarGrafico(itens) {
    if (graficoRosca) {
        graficoRosca.destroy();
    }

    const contagem = {
        alimentos: 0,
        roupas: 0,
        brinquedos: 0,
        'Material Escolar': 0,
        outros: 0
    };

    itens.forEach(item => contagem[item.categoria]++);

    const ctx = document.getElementById('graficoCategorias').getContext('2d');
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color');

    graficoRosca = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(contagem),
            datasets: [{
                label: 'Doações por Categoria',
                data: Object.values(contagem),
                backgroundColor: [
                    '#ec3535',
                    '#0984e3',
                    '#fdcb6e',
                    '#00b894',
                    '#6c5ce7'
                ],
                borderColor: 'transparent',
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        font: {
                            size: 12
                        },
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff'
                }
            },
            cutout: '60%',
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });

    const observer = new MutationObserver(() => {
        graficoRosca.options.plugins.legend.labels.color = 
            getComputedStyle(document.documentElement).getPropertyValue('--text-color');
        graficoRosca.update();
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });
}

function calcularDiasRestantes(dataValidade) {
    if (!dataValidade) return Infinity;
    const hoje = new Date();
    const validade = new Date(dataValidade);
    
    // Ajusta ambas as datas para meia-noite UTC
    const hojeUTC = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const validadeUTC = Date.UTC(validade.getFullYear(), validade.getMonth(), validade.getDate());
    
    const diff = validadeUTC - hojeUTC;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatarData(dataISO) {
    // Garante que a data seja tratada como UTC
    const data = new Date(dataISO + 'T00:00:00Z'); // Força UTC
    const dia = String(data.getUTCDate()).padStart(2, '0');
    const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
    const ano = data.getUTCFullYear();
    return `${dia}/${mes}/${ano}`;
}

function verificarAlertas(itens) {
    const alertas = itens.filter(item => {
        if (item.categoria !== 'alimentos') return false;
        const dias = calcularDiasRestantes(item.dataValidade);
        return dias <= 7;
    });

    const alertBox = document.getElementById('alertBox');
    const alertContent = document.getElementById('alertContent');
    
    if (alertas.length > 0) {
        alertBox.style.display = 'block';
        alertContent.innerHTML = alertas.map(item => {
            const dias = calcularDiasRestantes(item.dataValidade);
            return `<p>${item.nome} - ${dias > 0 ? `Vence em ${dias} dias` : `Vencido há ${Math.abs(dias)} dias`}</p>`;
        }).join('');
    } else {
        alertBox.style.display = 'none';
    }
}

function animarNumero(id, valorFinal) {
    const elemento = document.getElementById(id);
    let valorAtual = 0;
    const incremento = Math.ceil(valorFinal / 40);

    const contador = setInterval(() => {
        valorAtual += incremento;
        if (valorAtual >= valorFinal) {
            elemento.textContent = valorFinal;
            clearInterval(contador);
        } else {
            elemento.textContent = valorAtual;
        }
    }, 30);
}

function excluirItem(index) {
    if (confirm('Tem certeza que deseja excluir este item?')) {
        const itens = JSON.parse(localStorage.getItem('doacoes')) || [];
        itens.splice(index, 1); // Remove o item do array
        localStorage.setItem('doacoes', JSON.stringify(itens));
        
        // Atualiza todas as visualizações
        atualizarTabela(itens);
        verificarAlertas(itens);
        atualizarDashboard(itens);
    }
}