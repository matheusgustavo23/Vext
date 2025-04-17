// Theme Toggle
const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = themeToggle.querySelector('i');

// Verificar tema salvo
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
updateIcon(savedTheme);

function updateIcon(theme) {
    themeIcon.className = theme === 'light' ? 'bx bx-sun' : 'bx bx-moon';
}

// Alternar tema
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateIcon(newTheme);
});

// Sistema de Doações
document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    toggleValidade(); // Inicializa o estado do campo validade
});

// Controle do campo de validade
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
    
    const item = {
        nome: document.getElementById('nomeItem').value,
        doador: document.getElementById('doador').value,
        quantidade: document.getElementById('quantidade').value,
        dataRecebimento: document.getElementById('dataRecebimento').value,
        dataValidade: categoria === 'alimentos' ? document.getElementById('dataValidade').value : null,
        categoria: categoria
    };

    const itens = JSON.parse(localStorage.getItem('doacoes')) || [];
    itens.push(item);
    localStorage.setItem('doacoes', JSON.stringify(itens));

    atualizarTabela(itens);
    verificarAlertas(itens);
    this.reset();
    toggleValidade(); // Restaura estado após submit
});

function atualizarTabela(itens) {
    const corpoTabela = document.getElementById('corpoTabela');
    corpoTabela.innerHTML = '';
    
    itens.forEach((item) => {
        const tr = document.createElement('tr');
        const diasRestantes = item.dataValidade ? calcularDiasRestantes(item.dataValidade) : null;
        
        tr.innerHTML = `
            <td>${item.nome}</td>
            <td>${item.doador || 'Não informado'}</td>
            <td>${item.quantidade}</td>
            <td>${formatarData(item.dataRecebimento)}</td>
            <td>${item.dataValidade ? formatarData(item.dataValidade) : 'N/A'}</td>
            <td>${item.categoria}</td>
            <td class="${item.categoria === 'alimentos' && diasRestantes <= 7 ? 'status-alerta' : ''}">
                ${item.categoria === 'alimentos' 
                    ? (diasRestantes <= 0 ? 'VENCIDO' : `${diasRestantes} dias restantes`)
                    : 'N/A'}
            </td>
        `;
        corpoTabela.appendChild(tr);
    });
}

function calcularDiasRestantes(dataValidade) {
    if (!dataValidade) return Infinity;
    const hoje = new Date();
    const validade = new Date(dataValidade);
    const diff = validade - hoje;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR');
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
        alertContent.innerHTML = alertas.map(item => `
            <p>${item.nome} - Vence em ${calcularDiasRestantes(item.dataValidade)} dias</p>
        `).join('');
    } else {
        alertBox.style.display = 'none';
    }

}