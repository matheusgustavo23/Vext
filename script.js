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
    document.querySelector('#formDoacao button').style.gridColumn = categoria === 'alimentos' ? '' : '1 / -1'; //forca a linha do cadastrar doacao descer
}

document.getElementById('formDoacao').addEventListener('submit', async function(e) {
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
    nome_item: document.getElementById('nomeItem').value,
    doador: document.getElementById('doador').value,
    quantidade: parseInt(document.getElementById('quantidade').value),
    data_recebimento: dataRecebimentoISO,
    data_validade: categoria === 'alimentos' ? dataValidadeISO : null,
    categoria: categoria.toLowerCase(), // garante lowercase (IA)
    tipo_documento: document.getElementById('tipoDocumento').value,
    documento: document.getElementById('documento').value
};

    try {
        await fetch('http://localhost:3001/doacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        carregarDados();
        this.reset();
        toggleValidade();
    } catch (error) {
        console.error('Erro ao salvar:', error);
    }
});

async function carregarDados() {
    try {
        const response = await fetch('http://localhost:3001/doacoes');
        const itens = await response.json();
        atualizarTabela(itens);
        verificarAlertas(itens);
        atualizarDashboard(itens);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

function atualizarTabela(itens) {
    const corpoTabela = document.getElementById('corpoTabela');
    corpoTabela.innerHTML = '';

    itens.forEach((item) => {
        const tr = document.createElement('tr');
        const diasRestantes = item.data_validade ? calcularDiasRestantes(item.data_validade) : Infinity;

        tr.innerHTML = `
    <td>
        <button class="btn-excluir" onclick="excluirItem(${item.id})">
            <i class='bx bx-trash'></i>
        </button>
    </td>
    <td>${item.nome_item}</td>
    <td>${item.doador}</td>
    <td>${item.quantidade}</td>
    <td>${formatarData(item.data_recebimento)}</td>
    <td>${item.data_validade ? formatarData(item.data_validade) : 'N/A'}</td>
    <td>${item.categoria}</td>
    <td>${item.tipo_documento}</td>
    <td class="documento">${item.documento}</td>
    <td class="${item.categoria === 'alimentos' && diasRestantes !== null && (diasRestantes <= 7 || diasRestantes < 0) ? 'status-alerta' : ''}">
    ${item.categoria === 'alimentos' 
        ? (diasRestantes === null 
            ? 'N/A' 
            : (diasRestantes < 0 
                ? `Vencido há ${Math.abs(diasRestantes)} dia${Math.abs(diasRestantes) !== 1 ? 's' : ''}` 
                : (diasRestantes === 0 
                    ? 'Vence hoje!' 
                    : `${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}`)))
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
        'material escolar': 0,
        outros: 0
    };

    let proximosVencer = 0;

    itens.forEach(item => {
        // converte a categoria para lowercase para garantir consistência
        const categoria = item.categoria.toLowerCase();
        
        // verifica se a categoria existe no objeto, caso contrário conta como "outros"
        if (categorias.hasOwnProperty(categoria)) {
            categorias[categoria]++;
        } else {
            categorias.outros++;
        }

        if(categoria === 'alimentos' && item.data_validade) {
            const dias = calcularDiasRestantes(item.data_validade);
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
    if (graficoRosca) graficoRosca.destroy();

    const contagem = {
        alimentos: 0,
        roupas: 0,
        brinquedos: 0,
        'material escolar': 0,
        outros: 0
    };

    itens.forEach(item => {
    const categoria = item.categoria.toLowerCase().trim(); // normaliza a categoria
    
    if (contagem.hasOwnProperty(categoria)) {
        contagem[categoria]++;
    } else {
        contagem.outros++;
    }
});

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
                    '#2ecc71',
                    '#3498db',
                    '#f1c40f',
                    '#9b59b6',
                    '#95a5a6'
                ],
                borderColor: 'transparent',
                hoverOffset: 3
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
    if (!dataValidade) return null;
    
    // recebe a data atual em UTC (timezone 00:00)
    const hojeUTC = new Date();
    hojeUTC.setUTCHours(0, 0, 0, 0);
    
    // converte a data de validade para objeto date em UTC
    const validadeUTC = new Date(dataValidade + 'T00:00:00Z');
    
    if (isNaN(validadeUTC.getTime())) return null;
    
    // calcula a diferença em milissegundos entre as datas UTC
    const diff = validadeUTC - hojeUTC;
    console.log(dataValidade, validadeUTC, hojeUTC);

    // converte ms para dias
    const dias = diff / 86400000;
    
    // agora retornar inteiros
    if (dias === 0) return 0;       // vence hoje
    if (dias > 0) return Math.ceil(dias);  // dias futuros (1, 2, ...)
    return Math.floor(dias);        // dias passados (-1, -2, ...)
}

function formatarData(dataISO) {

    const data = new Date(dataISO + 'T00:00:00Z');
    const dia = String(data.getUTCDate()).padStart(2, '0');
    const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
    const ano = data.getUTCFullYear();
    return `${dia}/${mes}/${ano}`;
}

function verificarAlertas(itens) {
    const alertBox = document.getElementById('alertBox');
    const alertContent = document.getElementById('alertContent');
    
    // limpa alertas anteriores
    alertContent.innerHTML = '';
    
    // filtra e classifica os alertas
    const alertas = itens
        .filter(item => item.categoria === 'alimentos' && item.data_validade)
        .map(item => ({
            ...item,
            dias: calcularDiasRestantes(item.data_validade)
        }))
        .filter(item => item.dias !== null && item.dias <= 7)
        .sort((a, b) => a.dias - b.dias); // ordena por dias restantes
    
    if (alertas.length > 0) {
        alertas.forEach(item => {
            const alertItem = document.createElement('div');
            let statusInfo, classe, icon;
            
            if (item.dias < 0) {
                statusInfo = `Vencido há ${Math.abs(item.dias)} dia${Math.abs(item.dias) !== 1 ? 's' : ''}`;
                classe = 'alert-item vencido';
                icon = 'bx-error';
            } else if (item.dias === 0) {
                statusInfo = 'Vence hoje!';
                classe = 'alert-item hoje';
                icon = 'bx-calendar-exclamation'; // Ícone mais apropriado
            } else {
                statusInfo = `Vence em ${item.dias} dia${item.dias !== 1 ? 's' : ''}`;
                classe = 'alert-item proximo';
                icon = 'bx-time';
            }
            
            alertItem.className = classe;
            alertItem.innerHTML = `
                <i class='bx ${icon}'></i>
                <span>${item.nome_item} - <strong>${statusInfo}</strong></span>
            `;
            alertContent.appendChild(alertItem);
        });
        
        alertBox.classList.add('show');
    } else {
        alertBox.classList.remove('show');
    }
}

function atualizarEstiloAlerta() {
    const alertBox = document.getElementById('alertBox');
    if (!alertBox) return;
    
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    
    alertBox.style.backgroundColor = isDarkMode 
        ? 'rgba(46, 204, 113, 0.08)'  // tema escuro
        : 'rgba(46, 204, 113, 0.05)'; // tema claro
}

function setupAlertHandlers() {
  const alertBox = document.getElementById('alertBox');
  const themeToggle = document.querySelector('.theme-toggle');
  
  if (!alertBox || !themeToggle) return;

  // atualiza o estilo do alerta conforme o tema
  const updateAlertStyle = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    alertBox.style.backgroundColor = isDark 
      ? 'rgb(70, 70, 70)' 
      : 'rgba(231, 248, 241, 0.16)';
  };

  // configura os listeners
  themeToggle.addEventListener('click', updateAlertStyle);
  document.addEventListener('DOMContentLoaded', updateAlertStyle);
}

// chama a função quando o dom estiver pronto
if (document.readyState === 'complete') {
  setupAlertHandlers();
} else {
  document.addEventListener('DOMContentLoaded', setupAlertHandlers);
}

function animarNumero(id, valorFinal) {
    const elemento = document.getElementById(id);
    let valorAtual = 0;
    const incremento = Math.ceil(valorFinal / 10);

    const contador = setInterval(() => {
        valorAtual += incremento;
        if (valorAtual >= valorFinal) {
            elemento.textContent = valorFinal;
            clearInterval(contador);
        } else {
            elemento.textContent = valorAtual;
        }
    }, 50);
}

async function excluirItem(id) {
    if (confirm('Tem certeza que deseja excluir este item?')) {
        try {
            await fetch(`http://localhost:3001/doacoes/${id}`, { method: 'DELETE' });
            carregarDados();
        } catch (error) {
            console.error('Erro ao excluir:', error);
        }
    }
}

document.getElementById('pesquisa').addEventListener('input', function(e) {
    const termo = e.target.value.toLowerCase();
    filtrarItens(termo);
});

function filtrarItens(termo) {
    const linhas = document.querySelectorAll('#corpoTabela tr');
    
    linhas.forEach(linha => {
        const textoLinha = linha.textContent.toLowerCase();
        linha.style.display = textoLinha.includes(termo) ? '' : 'none';
    });
}

document.getElementById('btnGerarPDF').addEventListener('click', async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    const margem = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const formatarStatusComCor = (item) => {
        if (item.categoria !== 'alimentos' || !item.data_validade)
            return { texto: 'N/A', cor: [127, 140, 141] };

        const dias = calcularDiasRestantes(item.data_validade);

        if (dias < 0)
            return { texto: `Vencido há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? 's' : ''}`, cor: [231, 76, 60] };
        if (dias === 0)
            return { texto: 'Vence hoje!', cor: [243, 156, 18] };
        if (dias <= 7)
            return { texto: `Vence em ${dias} dia${dias !== 1 ? 's' : ''}`, cor: [241, 196, 15] };

        return { texto: `${dias} dias restantes`, cor: [39, 174, 96] };
    };

    try {
        const response = await fetch('http://localhost:3001/doacoes');
        const dados = await response.json();

        const dataHora = new Date();
        const dataFormatada = dataHora.toLocaleDateString();
        const horaFormatada = dataHora.toLocaleTimeString();

        // Cabeçalho principal
        doc.setFillColor(46, 204, 113);
        doc.rect(0, 0, pageWidth, 35, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text("Associação ABEFRA", pageWidth / 2, 15, { align: 'center' });

        doc.setFontSize(11);
        doc.text("Sistema de Gerenciamento de Doações", pageWidth / 2, 25, { align: 'center' });

        doc.setFontSize(9);
        doc.text(`Gerado em: ${dataFormatada} às ${horaFormatada}`, pageWidth - margem, 30, { align: 'right' });

        // Sumário
        doc.setTextColor(33, 33, 33);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text("Resumo Geral", margem, 45);

        const totalItens = dados.length;
        const alimentos = dados.filter(d => d.categoria.toLowerCase() === 'alimentos').length;
        const vencidos = dados.filter(d => {
            if (d.categoria.toLowerCase() !== 'alimentos' || !d.data_validade) return false;
            return calcularDiasRestantes(d.data_validade) < 0;
        }).length;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`• Total de itens: ${totalItens}`, margem, 53);
        doc.text(`• Alimentos: ${alimentos}`, margem, 59);
        doc.text(`• Itens vencidos: ${vencidos}`, margem, 65);

        const rows = dados.map((item, index) => {
            const status = formatarStatusComCor(item);
            return [
                index + 1,
                item.nome_item,
                item.doador,
                item.quantidade,
                formatarData(item.data_recebimento),
                item.data_validade ? formatarData(item.data_validade) : 'N/A',
                item.categoria,
                item.tipo_documento,
                item.documento,
                status.texto
            ];
        });

        const tableConfig = {
            startY: 75,
            head: [[
                "#", "Item", "Doador", "Qtd", "Recebimento", "Validade", "Categoria",
                "Tipo Doc", "Documento", "Status"
            ]],
            body: rows,
            theme: 'grid',
            headStyles: {
                fillColor: [34, 153, 84],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'center',
                valign: 'middle',
                font: 'helvetica'
            },
            bodyStyles: {
                fontSize: 9,
                font: 'helvetica',
                textColor: [33, 33, 33],
                valign: 'middle',
                cellPadding: 3
            },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { cellWidth: 40 },
                2: { cellWidth: 40 },
                3: { halign: 'center', cellWidth: 15 },
                4: { halign: 'center', cellWidth: 25 },
                5: { halign: 'center', cellWidth: 25 },
                6: { cellWidth: 30 },
                7: { halign: 'center', cellWidth: 20 },
                8: { cellWidth: 35 },
                9: { cellWidth: 40 }
            },
            didDrawCell: function(data) {
                if (data.column.index === 9) {
                    const item = dados[data.row.index];
                    const status = formatarStatusComCor(item);
                    const [r, g, b] = status.cor;

                    doc.setFillColor(r, g, b);
                    doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.text(data.cell.raw, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 2, {
                        align: 'center',
                        baseline: 'middle'
                    });
                }
            },
            didDrawPage: function () {
                const pageCount = doc.internal.getNumberOfPages();
                const currentPage = doc.internal.getCurrentPageInfo().pageNumber;

                doc.setDrawColor(200);
                doc.setLineWidth(0.5);
                doc.line(margem, pageHeight - 15, pageWidth - margem, pageHeight - 15);

                doc.setFontSize(8);
                doc.setTextColor(120);
                doc.setFont('helvetica', 'normal');
                doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                doc.text("Associação Beneficente ABEFRA - Sistema de Doações", pageWidth / 2, pageHeight - 5, { align: 'center' });
            }
        };

        doc.autoTable(tableConfig);

        doc.save(`relatorio_doacoes_${dataFormatada.replace(/\//g, '-')}.pdf`);
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar o PDF. Veja o console.');
    }
});
