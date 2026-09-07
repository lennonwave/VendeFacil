/**
 * VendeFácil - Script Principal
 * Gerencia estado, renderização, eventos e persistência no localStorage
 */

// ============================================================
//  CONSTANTES E ESTADO
// ============================================================

const STORAGE_KEY = 'vendeFacil';

// Estado global (carregado do localStorage)
let dados = {
    produtos: [],      // { id, nome, emoji, preco, produzidosHoje, vendidosHoje }
    dataAtual: null,   // 'YYYY-MM-DD'
    historico: []      // { data, faturamento, totalVendidos, totalRestantes, detalhes: [...] }
};

// ID do produto que está sendo editado (para o modal)
let produtoEditandoId = null;

// ID do produto que está recebendo estoque
let produtoEstoqueId = null;

// ============================================================
//  PERSISTÊNCIA
// ============================================================

/** Carrega os dados do localStorage ou inicializa vazio */
function carregarDados() {
    const armazenado = localStorage.getItem(STORAGE_KEY);
    if (armazenado) {
        try {
            dados = JSON.parse(armazenado);
            return;
        } catch (e) {
            console.warn('Erro ao parsear dados, reiniciando.');
        }
    }
    dados = { produtos: [], dataAtual: null, historico: [] };
    salvarDados();
}

/** Salva os dados atuais no localStorage */
function salvarDados() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
}

// ============================================================
//  UTILITÁRIOS DE DATA
// ============================================================

/** Retorna a data atual no formato YYYY-MM-DD */
function obterDataAtual() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

/** Formata uma data YYYY-MM-DD para DD/MM/YYYY */
function formatarDataBr(data) {
    const partes = data.split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// ============================================================
//  GERADOR DE IDs
// ============================================================

function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

// ============================================================
//  CÁLCULOS
// ============================================================

/** Calcula o faturamento total do dia */
function calcularFaturamento() {
    let total = 0;
    for (const p of dados.produtos) {
        total += p.vendidosHoje * p.preco;
    }
    return total;
}

/** Calcula o total de vendidos do dia */
function calcularTotalVendidos() {
    return dados.produtos.reduce((acc, p) => acc + p.vendidosHoje, 0);
}

/** Calcula o total de restantes do dia */
function calcularTotalRestantes() {
    return dados.produtos.reduce((acc, p) => acc + (p.produzidosHoje - p.vendidosHoje), 0);
}

// ============================================================
//  RENDERIZAÇÃO - TELA HOJE
// ============================================================

function renderizarHoje() {
    // Atualiza cabeçalho
    const dataFormatada = dados.dataAtual ? formatarDataBr(dados.dataAtual) : '--/--/----';
    document.getElementById('header-data').textContent = `Hoje, ${dataFormatada}`;

    // Indicadores
    const faturamento = calcularFaturamento();
    const vendidos = calcularTotalVendidos();
    const restantes = calcularTotalRestantes();

    document.getElementById('faturamento-total').textContent = `R$ ${faturamento.toFixed(2)}`;
    document.getElementById('total-vendidos').textContent = vendidos;
    document.getElementById('total-restantes').textContent = restantes;

    // Lista de produtos
    const container = document.getElementById('lista-produtos-hoje');
    if (dados.produtos.length === 0) {
        container.innerHTML = `<p class="texto-centralizado">Nenhum produto cadastrado.<br>Toque em <strong>+</strong> para adicionar.</p>`;
        return;
    }

    let html = '';
    for (const p of dados.produtos) {
        const restante = p.produzidosHoje - p.vendidosHoje;
        html += `
            <div class="card-produto" data-id="${p.id}">
                <div class="cabecalho">
                    <span class="nome"><span class="emoji">${p.emoji || '🍽️'}</span> ${p.nome}</span>
                    <span class="preco">R$ ${p.preco.toFixed(2)}</span>
                </div>
                <div class="detalhes">
                    <span><span class="num">${p.produzidosHoje}</span><span class="rot">Produzidos</span></span>
                    <span><span class="num">${p.vendidosHoje}</span><span class="rot">Vendidos</span></span>
                    <span><span class="num">${restante}</span><span class="rot">Restantes</span></span>
                </div>
                <div class="acoes">
                    <button class="btn-venda" data-id="${p.id}">+1 VENDA</button>
                    <button class="btn-desfazer" data-id="${p.id}">↩ Desfazer</button>
                    <button class="btn-estoque" data-id="${p.id}">+ Estoque</button>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

// ============================================================
//  RENDERIZAÇÃO - HISTÓRICO
// ============================================================

function renderizarHistorico() {
    const lista = document.getElementById('lista-historico');
    const detalhe = document.getElementById('detalhe-historico');

    // Esconde detalhe
    detalhe.style.display = 'none';

    if (dados.historico.length === 0) {
        lista.innerHTML = `<p class="texto-centralizado">Nenhum dia finalizado ainda.</p>`;
        return;
    }

    // Ordena do mais recente para o mais antigo
    const historicoOrdenado = [...dados.historico].sort((a, b) => b.data.localeCompare(a.data));

    let html = '';
    for (const item of historicoOrdenado) {
        html += `
            <div class="item-historico" data-data="${item.data}">
                <div class="data">📅 ${formatarDataBr(item.data)}</div>
                <div class="info">
                    <span>💰 R$ ${item.faturamento.toFixed(2)}</span>
                    <span>📦 ${item.totalVendidos} vendidos</span>
                </div>
            </div>
        `;
    }
    lista.innerHTML = html;

    // Adiciona evento de clique para ver detalhes
    document.querySelectorAll('.item-historico').forEach(el => {
        el.addEventListener('click', function () {
            const data = this.dataset.data;
            mostrarDetalheHistorico(data);
        });
    });
}

function mostrarDetalheHistorico(data) {
    const item = dados.historico.find(h => h.data === data);
    if (!item) return;

    const lista = document.getElementById('lista-historico');
    const detalhe = document.getElementById('detalhe-historico');
    const conteudo = document.getElementById('conteudo-detalhe');

    lista.style.display = 'none';
    detalhe.style.display = 'block';

    let html = `
        <div style="background:#fff; border-radius:16px; padding:14px; margin-bottom:12px;">
            <strong>📅 ${formatarDataBr(item.data)}</strong>
            <div style="display:flex; justify-content:space-between; margin-top:6px;">
                <span>💰 R$ ${item.faturamento.toFixed(2)}</span>
                <span>📦 ${item.totalVendidos} vendidos</span>
                <span>📦 ${item.totalRestantes} restantes</span>
            </div>
        </div>
        <h3 style="margin:12px 0 8px;">Produtos</h3>
    `;

    for (const det of item.detalhes) {
        html += `
            <div class="detalhe-item">
                <div class="linha"><span>${det.emoji || '🍽️'} ${det.nome}</span><span>R$ ${det.faturamento.toFixed(2)}</span></div>
                <div class="linha"><span>Produzidos</span><span>${det.produzidos}</span></div>
                <div class="linha"><span>Vendidos</span><span>${det.vendidos}</span></div>
                <div class="linha"><span>Restantes</span><span>${det.restantes}</span></div>
            </div>
        `;
    }

    conteudo.innerHTML = html;

    // Botão voltar
    document.getElementById('btn-voltar-historico').onclick = function () {
        lista.style.display = 'block';
        detalhe.style.display = 'none';
    };
}

// ============================================================
//  RENDERIZAÇÃO - PRODUTOS CADASTRADOS
// ============================================================

function renderizarProdutosCadastrados() {
    const container = document.getElementById('lista-produtos-cadastrados');
    if (dados.produtos.length === 0) {
        container.innerHTML = `<p class="texto-centralizado">Nenhum produto cadastrado.</p>`;
        return;
    }

    let html = '';
    for (const p of dados.produtos) {
        html += `
            <div class="item-produto-cadastro" data-id="${p.id}">
                <div class="info">
                    <span style="font-size:1.6rem;">${p.emoji || '🍽️'}</span>
                    <span class="nome">${p.nome}</span>
                    <span class="preco">R$ ${p.preco.toFixed(2)}</span>
                </div>
                <div class="acoes">
                    <button class="editar-produto" data-id="${p.id}">✏️</button>
                    <button class="excluir-produto" data-id="${p.id}">🗑️</button>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;

    // Eventos para editar e excluir
    document.querySelectorAll('.editar-produto').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = this.dataset.id;
            abrirModalEditarProduto(id);
        });
    });

    document.querySelectorAll('.excluir-produto').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = this.dataset.id;
            if (confirm('Tem certeza que deseja excluir este produto?')) {
                excluirProduto(id);
            }
        });
    });
}

// ============================================================
//  MODAIS - PRODUTO (NOVO / EDITAR)
// ============================================================

function abrirModalNovoProduto() {
    produtoEditandoId = null;
    document.getElementById('modal-produto-titulo').textContent = 'Novo Produto';
    document.getElementById('form-produto').reset();
    document.getElementById('modal-produto').style.display = 'flex';
    document.getElementById('produto-nome').focus();
}

function abrirModalEditarProduto(id) {
    const produto = dados.produtos.find(p => p.id === id);
    if (!produto) return;

    produtoEditandoId = id;
    document.getElementById('modal-produto-titulo').textContent = 'Editar Produto';
    document.getElementById('produto-nome').value = produto.nome;
    document.getElementById('produto-emoji').value = produto.emoji || '';
    document.getElementById('produto-quantidade').value = produto.produzidosHoje;
    document.getElementById('produto-preco').value = produto.preco;
    document.getElementById('modal-produto').style.display = 'flex';
    document.getElementById('produto-nome').focus();
}

function fecharModalProduto() {
    document.getElementById('modal-produto').style.display = 'none';
    produtoEditandoId = null;
}

// Submit do formulário de produto
document.getElementById('form-produto').addEventListener('submit', function (e) {
    e.preventDefault();

    const nome = document.getElementById('produto-nome').value.trim();
    const emoji = document.getElementById('produto-emoji').value.trim() || '🍽️';
    const quantidade = parseInt(document.getElementById('produto-quantidade').value) || 0;
    const preco = parseFloat(document.getElementById('produto-preco').value) || 0;

    if (!nome) {
        alert('Informe o nome do produto.');
        return;
    }
    if (quantidade < 0) {
        alert('A quantidade não pode ser negativa.');
        return;
    }
    if (preco <= 0) {
        alert('O preço deve ser maior que zero.');
        return;
    }

    if (produtoEditandoId) {
        // Editar
        const produto = dados.produtos.find(p => p.id === produtoEditandoId);
        if (produto) {
            // Mantém vendidosHoje, mas atualiza produzidosHoje se for alterado
            const diff = quantidade - produto.produzidosHoje;
            produto.nome = nome;
            produto.emoji = emoji;
            produto.preco = preco;
            produto.produzidosHoje = quantidade;
            // Se a quantidade produzida diminuiu, ajusta vendidos para não ultrapassar
            if (produto.vendidosHoje > produto.produzidosHoje) {
                produto.vendidosHoje = produto.produzidosHoje;
            }
        }
    } else {
        // Novo produto
        const novo = {
            id: gerarId(),
            nome,
            emoji,
            preco,
            produzidosHoje: quantidade,
            vendidosHoje: 0
        };
        dados.produtos.push(novo);
    }

    salvarDados();
    fecharModalProduto();
    renderizarTudo();
});

// Cancelar modal produto
document.querySelector('#modal-produto .btn-cancelar').addEventListener('click', fecharModalProduto);
document.querySelector('#modal-produto').addEventListener('click', function (e) {
    if (e.target === this) fecharModalProduto();
});

// ============================================================
//  MODAL - ADICIONAR ESTOQUE
// ============================================================

function abrirModalEstoque(id) {
    const produto = dados.produtos.find(p => p.id === id);
    if (!produto) return;

    produtoEstoqueId = id;
    document.getElementById('estoque-produto-nome').textContent = `${produto.emoji || '🍽️'} ${produto.nome}`;
    document.getElementById('estoque-quantidade').value = '';
    document.getElementById('modal-estoque').style.display = 'flex';
    document.getElementById('estoque-quantidade').focus();
}

function fecharModalEstoque() {
    document.getElementById('modal-estoque').style.display = 'none';
    produtoEstoqueId = null;
}

document.getElementById('form-estoque').addEventListener('submit', function (e) {
    e.preventDefault();

    const quantidade = parseInt(document.getElementById('estoque-quantidade').value);
    if (!quantidade || quantidade <= 0) {
        alert('Informe uma quantidade válida.');
        return;
    }

    const produto = dados.produtos.find(p => p.id === produtoEstoqueId);
    if (!produto) {
        alert('Produto não encontrado.');
        fecharModalEstoque();
        return;
    }

    produto.produzidosHoje += quantidade;
    salvarDados();
    fecharModalEstoque();
    renderizarTudo();
});

document.querySelector('#modal-estoque .btn-cancelar').addEventListener('click', fecharModalEstoque);
document.querySelector('#modal-estoque').addEventListener('click', function (e) {
    if (e.target === this) fecharModalEstoque();
});

// ============================================================
//  AÇÕES: VENDA, DESFAZER, ESTOQUE (via delegação de eventos)
// ============================================================

document.getElementById('lista-produtos-hoje').addEventListener('click', function (e) {
    const btnVenda = e.target.closest('.btn-venda');
    if (btnVenda) {
        const id = btnVenda.dataset.id;
        registrarVenda(id);
        return;
    }

    const btnDesfazer = e.target.closest('.btn-desfazer');
    if (btnDesfazer) {
        const id = btnDesfazer.dataset.id;
        desfazerVenda(id);
        return;
    }

    const btnEstoque = e.target.closest('.btn-estoque');
    if (btnEstoque) {
        const id = btnEstoque.dataset.id;
        abrirModalEstoque(id);
        return;
    }
});

/** Registra uma venda para o produto */
function registrarVenda(id) {
    const produto = dados.produtos.find(p => p.id === id);
    if (!produto) return;

    if (produto.vendidosHoje >= produto.produzidosHoje) {
        alert('Estoque insuficiente! Não há mais unidades deste produto.');
        return;
    }

    produto.vendidosHoje += 1;
    salvarDados();
    renderizarHoje(); // atualiza apenas a tela Hoje (mais rápido)
}

/** Desfaz a última venda do produto */
function desfazerVenda(id) {
    const produto = dados.produtos.find(p => p.id === id);
    if (!produto) return;

    if (produto.vendidosHoje <= 0) {
        alert('Não há vendas para desfazer.');
        return;
    }

    produto.vendidosHoje -= 1;
    salvarDados();
    renderizarHoje();
}

// ============================================================
//  EXCLUIR PRODUTO
// ============================================================

function excluirProduto(id) {
    dados.produtos = dados.produtos.filter(p => p.id !== id);
    salvarDados();
    renderizarTudo();
}

// ============================================================
//  FECHAMENTO DO DIA
// ============================================================

function abrirFechamento() {
    if (dados.produtos.length === 0) {
        alert('Nenhum produto cadastrado para fechar o dia.');
        return;
    }

    const totalVendidos = calcularTotalVendidos();
    if (totalVendidos === 0) {
        alert('Nenhuma venda registrada hoje. O fechamento só pode ser feito após pelo menos uma venda.');
        return;
    }

    const faturamento = calcularFaturamento();
    const restantes = calcularTotalRestantes();

    let html = `
        <div class="linha"><span>💰 Faturamento</span><span>R$ ${faturamento.toFixed(2)}</span></div>
        <div class="linha"><span>📦 Produtos vendidos</span><span>${totalVendidos}</span></div>
        <div class="linha"><span>📦 Produtos restantes</span><span>${restantes}</span></div>
        <hr style="margin:12px 0; border-color:#e2e8f0;">
    `;

    for (const p of dados.produtos) {
        const vendidos = p.vendidosHoje;
        const produzidos = p.produzidosHoje;
        const rest = produzidos - vendidos;
        const fat = vendidos * p.preco;
        html += `
            <div class="linha"><span>${p.emoji || '🍽️'} ${p.nome}</span><span>R$ ${fat.toFixed(2)}</span></div>
            <div style="font-size:0.8rem; color:#4a5568; padding-left:20px; display:flex; justify-content:space-between;">
                <span>Prod: ${produzidos}</span>
                <span>Vend: ${vendidos}</span>
                <span>Rest: ${rest}</span>
            </div>
        `;
    }

    document.getElementById('resumo-fechamento').innerHTML = html;
    document.getElementById('modal-fechamento').style.display = 'flex';
}

function fecharModalFechamento() {
    document.getElementById('modal-fechamento').style.display = 'none';
}

// Encerrar dia
document.getElementById('fechamento-encerrar').addEventListener('click', function () {
    encerrarDia();
});

document.getElementById('fechamento-cancelar').addEventListener('click', fecharModalFechamento);
document.getElementById('modal-fechamento').addEventListener('click', function (e) {
    if (e.target === this) fecharModalFechamento();
});

function encerrarDia() {
    if (dados.produtos.length === 0) return;

    const totalVendidos = calcularTotalVendidos();
    const faturamento = calcularFaturamento();
    const restantes = calcularTotalRestantes();

    // Monta detalhes
    const detalhes = dados.produtos.map(p => ({
        nome: p.nome,
        emoji: p.emoji || '🍽️',
        produzidos: p.produzidosHoje,
        vendidos: p.vendidosHoje,
        restantes: p.produzidosHoje - p.vendidosHoje,
        faturamento: p.vendidosHoje * p.preco
    }));

    // Salva no histórico
    const registro = {
        data: dados.dataAtual || obterDataAtual(),
        faturamento: faturamento,
        totalVendidos: totalVendidos,
        totalRestantes: restantes,
        detalhes: detalhes
    };
    dados.historico.push(registro);

    // Zera o dia
    for (const p of dados.produtos) {
        p.produzidosHoje = 0;
        p.vendidosHoje = 0;
    }
    dados.dataAtual = obterDataAtual();

    salvarDados();
    fecharModalFechamento();
    renderizarTudo();

    alert('✅ Dia encerrado com sucesso!\nHistórico atualizado.');
}

// ============================================================
//  MUDANÇA DE DIA (detecção automática)
// ============================================================

function verificarMudancaDia() {
    const hoje = obterDataAtual();

    if (!dados.dataAtual) {
        dados.dataAtual = hoje;
        salvarDados();
        renderizarTudo();
        return;
    }

    if (dados.dataAtual < hoje) {
        // Existe um dia anterior não encerrado
        mostrarModalMudancaDia();
    } else if (dados.dataAtual > hoje) {
        // Corrige data (não deveria acontecer)
        dados.dataAtual = hoje;
        salvarDados();
        renderizarTudo();
    } else {
        // Data correta
        renderizarTudo();
    }
}

function mostrarModalMudancaDia() {
    // Prepara resumo do dia anterior
    const totalVendidos = calcularTotalVendidos();
    const faturamento = calcularFaturamento();
    const restantes = calcularTotalRestantes();

    let html = `
        <div class="linha"><span>📅 ${formatarDataBr(dados.dataAtual)}</span></div>
        <div class="linha"><span>💰 Faturamento</span><span>R$ ${faturamento.toFixed(2)}</span></div>
        <div class="linha"><span>📦 Vendidos</span><span>${totalVendidos}</span></div>
        <div class="linha"><span>📦 Restantes</span><span>${restantes}</span></div>
    `;

    if (dados.produtos.length > 0) {
        html += `<hr style="margin:10px 0; border-color:#e2e8f0;">`;
        for (const p of dados.produtos) {
            const vendidos = p.vendidosHoje;
            const produzidos = p.produzidosHoje;
            const rest = produzidos - vendidos;
            const fat = vendidos * p.preco;
            html += `
                <div class="linha"><span>${p.emoji || '🍽️'} ${p.nome}</span><span>R$ ${fat.toFixed(2)}</span></div>
                <div style="font-size:0.75rem; color:#4a5568; padding-left:20px; display:flex; justify-content:space-between;">
                    <span>Prod: ${produzidos}</span>
                    <span>Vend: ${vendidos}</span>
                    <span>Rest: ${rest}</span>
                </div>
            `;
        }
    } else {
        html += `<p style="text-align:center; color:#8e9aaf;">Nenhum produto cadastrado.</p>`;
    }

    document.getElementById('resumo-dia-anterior').innerHTML = html;
    document.getElementById('modal-mudanca-dia').style.display = 'flex';
}

// Ações do modal de mudança de dia
document.getElementById('mudanca-ver-fechamento').addEventListener('click', function () {
    // Abre o modal de fechamento com os dados atuais (do dia anterior)
    abrirFechamento();
    // Fecha este modal
    document.getElementById('modal-mudanca-dia').style.display = 'none';
});

document.getElementById('mudanca-encerrar').addEventListener('click', function () {
    // Encerra o dia anterior e começa novo
    encerrarDia();
    document.getElementById('modal-mudanca-dia').style.display = 'none';
    // Após encerrar, os dados já foram resetados, renderiza tudo
    renderizarTudo();
});

// ============================================================
//  EXPORTAÇÃO PARA EXCEL (CSV)
// ============================================================

/** Exporta um dia específico (do histórico) como CSV */
function exportarCSV(data, dadosDia) {
    // dadosDia: objeto com { data, faturamento, totalVendidos, totalRestantes, detalhes: [...] }
    const linhas = [];
    // Cabeçalho
    linhas.push('Data;Produto;Produzidos;Vendidos;Restantes;Faturamento');

    // Linhas de produtos
    for (const det of dadosDia.detalhes) {
        linhas.push(
            `${formatarDataBr(dadosDia.data)};${det.nome};${det.produzidos};${det.vendidos};${det.restantes};${det.faturamento.toFixed(2)}`
        );
    }

    // Linha de totais
    linhas.push(
        `TOTAIS;;;${dadosDia.totalVendidos};${dadosDia.totalRestantes};${dadosDia.faturamento.toFixed(2)}`
    );

    const conteudo = linhas.join('\n');
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `vendas_${data}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/** Exporta o dia atual (Hoje) */
function exportarHoje() {
    if (dados.produtos.length === 0) {
        alert('Nenhum produto cadastrado hoje.');
        return;
    }
    const totalVendidos = calcularTotalVendidos();
    if (totalVendidos === 0) {
        alert('Nenhuma venda registrada hoje.');
        return;
    }

    const faturamento = calcularFaturamento();
    const restantes = calcularTotalRestantes();
    const detalhes = dados.produtos.map(p => ({
        nome: p.nome,
        emoji: p.emoji,
        produzidos: p.produzidosHoje,
        vendidos: p.vendidosHoje,
        restantes: p.produzidosHoje - p.vendidosHoje,
        faturamento: p.vendidosHoje * p.preco
    }));

    const dadosDia = {
        data: dados.dataAtual || obterDataAtual(),
        faturamento,
        totalVendidos,
        totalRestantes: restantes,
        detalhes
    };
    exportarCSV(dados.dataAtual || obterDataAtual(), dadosDia);
}

// ============================================================
//  NAVEGAÇÃO ENTRE ABAS
// ============================================================

function navegarPara(secao) {
    // Esconde todas as seções
    document.querySelectorAll('.secao').forEach(s => s.classList.remove('ativa'));
    // Mostra a seção alvo
    const alvo = document.getElementById(`secao-${secao}`);
    if (alvo) alvo.classList.add('ativa');

    // Atualiza navegação inferior
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('ativo', item.dataset.secao === secao);
    });

    // Renderiza conteúdo específico
    if (secao === 'historico') renderizarHistorico();
    if (secao === 'produtos') renderizarProdutosCadastrados();
    if (secao === 'configuracoes') {
        // nada especial
    }
    if (secao === 'hoje') renderizarHoje();
}

// Eventos dos botões de navegação
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function () {
        const secao = this.dataset.secao;
        navegarPara(secao);
    });
});

// ============================================================
//  BOTÃO FLUTUANTE: ADICIONAR PRODUTO
// ============================================================

document.getElementById('btn-adicionar-produto').addEventListener('click', abrirModalNovoProduto);
document.getElementById('btn-novo-produto').addEventListener('click', abrirModalNovoProduto);

// ============================================================
//  BOTÕES DE EXPORTAÇÃO
// ============================================================

document.getElementById('btn-exportar-hoje').addEventListener('click', exportarHoje);

// Abrir modal de seleção de data no histórico
document.getElementById('btn-exportar-historico').addEventListener('click', function () {
    const seletor = document.getElementById('seletor-data-historico');
    seletor.innerHTML = '';
    if (dados.historico.length === 0) {
        alert('Nenhum dia encerrado para exportar.');
        return;
    }
    // Ordena do mais recente para o mais antigo
    const datas = [...dados.historico].sort((a, b) => b.data.localeCompare(a.data));
    for (const item of datas) {
        const option = document.createElement('option');
        option.value = item.data;
        option.textContent = `${formatarDataBr(item.data)} - R$ ${item.faturamento.toFixed(2)}`;
        seletor.appendChild(option);
    }
    document.getElementById('modal-selecionar-data').style.display = 'flex';
});

// Cancelar exportação
document.getElementById('cancelar-exportar').addEventListener('click', function () {
    document.getElementById('modal-selecionar-data').style.display = 'none';
});

// Confirmar exportação
document.getElementById('confirmar-exportar').addEventListener('click', function () {
    const data = document.getElementById('seletor-data-historico').value;
    if (!data) {
        alert('Selecione uma data.');
        return;
    }
    const registro = dados.historico.find(h => h.data === data);
    if (!registro) {
        alert('Dados não encontrados.');
        return;
    }
    exportarCSV(data, registro);
    document.getElementById('modal-selecionar-data').style.display = 'none';
});

// Fechar modal clicando fora
document.getElementById('modal-selecionar-data').addEventListener('click', function (e) {
    if (e.target === this) {
        this.style.display = 'none';
    }
});

// ============================================================
//  CONFIGURAÇÕES
// ============================================================

document.getElementById('btn-limpar-dados').addEventListener('click', function () {
    if (confirm('Tem certeza que deseja apagar TODOS os dados?\nEsta ação é irreversível.')) {
        if (confirm('Última confirmação: todos os dados serão perdidos.')) {
            localStorage.removeItem(STORAGE_KEY);
            carregarDados();
            renderizarTudo();
            alert('Dados removidos com sucesso.');
        }
    }
});

// ============================================================
//  RENDERIZAÇÃO GERAL
// ============================================================

function renderizarTudo() {
    // Verifica qual aba está ativa e renderiza
    const ativa = document.querySelector('.nav-item.ativo');
    if (ativa) {
        const secao = ativa.dataset.secao;
        if (secao === 'hoje') renderizarHoje();
        else if (secao === 'historico') renderizarHistorico();
        else if (secao === 'produtos') renderizarProdutosCadastrados();
    } else {
        // Fallback: renderiza Hoje
        renderizarHoje();
    }
}

// ============================================================
//  INICIALIZAÇÃO
// ============================================================

// Carrega os dados
carregarDados();

// Verifica mudança de dia (pode mostrar modal)
verificarMudancaDia();

// Se não houver modal de mudança de dia, a renderização já foi chamada lá dentro.
// Mas se houver modal, a renderização será chamada após as ações.
// Para garantir, se não houver modal aberto, renderiza tudo.
// Mas o modal de mudança de dia é aberto de forma assíncrona; vamos verificar depois.

setTimeout(() => {
    const modalMudanca = document.getElementById('modal-mudanca-dia');
    if (modalMudanca.style.display === 'none') {
        renderizarTudo();
    }
}, 50);

console.log('🚀 VendeFácil iniciado!');