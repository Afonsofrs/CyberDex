

// 1. CONFIGURAÇÕES, INTERVALOS E DICIONÁRIO DE TIPOS
const API_BASE = 'https://pokeapi.co/api/v2';
const TOTAL_POKEMON = 1025;      
const POR_LOTE = 24;             

let todosPokemons = [];          
let pokemonsFiltrados = [];      
let posicaoAtual = 0;            
let aCarregar = false;           
let tipoSelecionado = '';        
let especieAtualModal = null;    
let modalBootstrap = null;       

// Cache em memória para não repetir pedidos já efetuados à rede
const cachePokemon = {};
const cacheTipos = {};

// Dicionário de Tipos em Objeto Literal (Chave, Nome em PT, Cor e Sinónimos de Busca)
const LISTA_TIPOS_POKEMON = [
  { chave: 'grass',    pt: 'Planta',   cor: '#39ff14', termos: ['planta', 'grass', 'relva', 'erva'] },
  { chave: 'fire',     pt: 'Fogo',     cor: '#ff3838', termos: ['fogo', 'fire'] },
  { chave: 'water',    pt: 'Água',     cor: '#00f0ff', termos: ['agua', 'água', 'water'] },
  { chave: 'electric', pt: 'Elétrico', cor: '#ffe600', termos: ['eletrico', 'elétrico', 'electric', 'raio'] },
  { chave: 'poison',   pt: 'Veneno',   cor: '#b026ff', termos: ['veneno', 'poison'] },
  { chave: 'bug',      pt: 'Inseto',   cor: '#a6e22e', termos: ['inseto', 'bug'] },
  { chave: 'normal',   pt: 'Normal',   cor: '#a0aab2', termos: ['normal'] },
  { chave: 'ground',   pt: 'Terra',    cor: '#e5b750', termos: ['terra', 'ground'] },
  { chave: 'fairy',    pt: 'Fada',     cor: '#ff66cc', termos: ['fada', 'fairy'] },
  { chave: 'fighting', pt: 'Lutador',  cor: '#ff5722', termos: ['lutador', 'fighting', 'luta'] },
  { chave: 'psychic',  pt: 'Psíquico', cor: '#ff007f', termos: ['psiquico', 'psíquico', 'psychic'] },
  { chave: 'rock',     pt: 'Pedra',    cor: '#a89276', termos: ['pedra', 'rock', 'rocha'] },
  { chave: 'ghost',    pt: 'Fantasma', cor: '#845ec2', termos: ['fantasma', 'ghost'] },
  { chave: 'ice',      pt: 'Gelo',     cor: '#70e0d0', termos: ['gelo', 'ice'] },
  { chave: 'dragon',   pt: 'Dragão',   cor: '#7928ca', termos: ['dragao', 'dragão', 'dragon'] },
  { chave: 'dark',     pt: 'Sombrio',  cor: '#5a5266', termos: ['sombrio', 'dark', 'escuro'] },
  { chave: 'steel',    pt: 'Aço',      cor: '#78909c', termos: ['aco', 'aço', 'steel', 'metal'] },
  { chave: 'flying',   pt: 'Voador',   cor: '#4dd0e1', termos: ['voador', 'flying', 'voo'] }
];

// Mapa rápido chave 
const MAPA_CORES = {};
LISTA_TIPOS_POKEMON.forEach(t => { MAPA_CORES[t.chave] = t.cor; });

// Intervalos de IDs das 9 Gerações Pokémon
const GERACOES = {
  '1': [1, 151], '2': [152, 251], '3': [252, 386],
  '4': [387, 493], '5': [494, 649], '6': [650, 721],
  '7': [722, 809], '8': [810, 905], '9': [906, 1025]
};


// 2. SELEÇÃO DE ELEMENTOS DO DOM 
const grelhaPokemon = document.getElementById('grelha-pokemons');
const loadingTerminal = document.getElementById('loadingTerminal');
const painelErro = document.getElementById('painelErro');
const areaPesquisa = document.getElementById('areaPesquisa');
const inputPesquisa = document.getElementById('inputPesquisa');
const btnLimparPesquisa = document.getElementById('btnLimparPesquisa');
const seletorGeracao = document.getElementById('seletorGeracao');
const statusRegistos = document.getElementById('statusRegistos');
const painelCarregarMais = document.getElementById('painelCarregarMais');
const btnCarregarMais = document.getElementById('btnCarregarMais');
const contadorLote = document.getElementById('contadorLote');
const modalCorpo = document.getElementById('modalCorpo');
const grelhaBotoesTipos = document.getElementById('grelhaBotoesTipos');
const painelSeletorTipos = document.getElementById('painelSeletorTipos');
const btnFecharPainelTipos = document.getElementById('btnFecharPainelTipos');
const badgesPesquisaContainer = document.getElementById('badgesPesquisaContainer');


// 3. FUNÇÕES UTILITÁRIAS
function obterCorDoTipo(tipo) {
  return MAPA_CORES[(tipo || '').toLowerCase()] || '#00ff66';
}

function obterObjetoTipo(chaveOuNome) {
  const busca = (chaveOuNome || '').toLowerCase().trim();
  return LISTA_TIPOS_POKEMON.find(t => t.chave === busca || t.termos.includes(busca));
}

function extrairId(url) {
  const partes = url.split('/').filter(Boolean);
  return parseInt(partes[partes.length - 1], 10);
}

// Atualiza a borda e o brilho do retângulo da barra de pesquisa com a cor do tipo
function atualizarCoresRetangulo(chaveTipo) {
  if (!areaPesquisa) return;
  const prefixo = areaPesquisa.querySelector('.cyber-prompt-prefix');

  if (chaveTipo) {
    const cor = obterCorDoTipo(chaveTipo);
    areaPesquisa.style.borderColor = cor;
    areaPesquisa.style.boxShadow = `0 0 16px ${cor}77, inset 0 0 6px ${cor}22`;
    if (prefixo) prefixo.style.color = cor;
  } else {
    areaPesquisa.style.borderColor = '';
    areaPesquisa.style.boxShadow = '';
    if (prefixo) prefixo.style.color = '';
  }
}



// 4. PRIMEIRO FETCH: CARREGAR A LISTA MESTRE DE 1025 POKÉMON
async function carregarListaInicial() {
  loadingTerminal?.classList.remove('d-none');
  painelErro?.classList.add('d-none');
  painelCarregarMais?.classList.add('d-none');

  try {
    const res = await fetch(`${API_BASE}/pokemon?limit=${TOTAL_POKEMON}`);
    if (!res.ok) throw new Error('Falha no pedido HTTP inicial');
    const dados = await res.json();

    todosPokemons = dados.results.map(item => ({
      nome: item.name,
      url: item.url,
      id: extrairId(item.url)
    }));

    pokemonsFiltrados = [...todosPokemons];
    if (statusRegistos) statusRegistos.textContent = `${todosPokemons.length} / ${TOTAL_POKEMON}`;

    desenharBotoesTipos();
    await renderizarProximoLote(true);

  } catch (erro) {
    console.error('Erro na PokéAPI:', erro);
    painelErro?.classList.remove('d-none');
    if (statusRegistos) statusRegistos.textContent = 'ERRO';
  } finally {
    loadingTerminal?.classList.add('d-none');
  }
}


// 5. SEGUNDO FETCH: DETALHES DE UM POKÉMON E FORMAS ESPECIAIS (MEGAS/G-MAX)
async function obterDetalhesPokemon(id) {
  if (cachePokemon[id]) return cachePokemon[id];

  try {
    // Promise.all executa os pedidos em paralelo, acelerando o carregamento
    const [resPoke, resEspecie] = await Promise.all([
      fetch(`${API_BASE}/pokemon/${id}`).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/pokemon-species/${id}`).then(r => r.ok ? r.json() : null).catch(() => null)
    ]);
    if (!resPoke) return null;

    let temMega = false, temGmax = false;
    resEspecie?.varieties?.forEach(v => {
      if (v.pokemon.name.includes('-mega')) temMega = true;
      if (v.pokemon.name.includes('-gmax')) temGmax = true;
    });

    const resultado = { pokemon: resPoke, especie: resEspecie, temMega, temGmax };
    cachePokemon[id] = resultado;
    return resultado;
  } catch (erro) {
    console.warn(`Aviso no espécime #${id}:`, erro);
    return null;
  }
}


// 6. GERAÇÃO DINÂMICA DA GRELHA COM FOREACH E TEMPLATE LITERALS OTIMIZADOS

async function renderizarProximoLote(reiniciar = false) {
  if (reiniciar) {
    grelhaPokemon.innerHTML = '';
    posicaoAtual = 0;
  }
  if (aCarregar) return;

  if (pokemonsFiltrados.length === 0) {
    grelhaPokemon.innerHTML = `
      <div class="col-12 text-center py-5 font-monospace text-secondary">
        <i class="bi bi-radioactive text-warning fs-3 mb-2 d-block"></i>
        [0x00] NENHUM ESPÉCIME LOCALIZADO NA BASE DE DADOS.
      </div>`;
    painelCarregarMais?.classList.add('d-none');
    return;
  }

  if (posicaoAtual >= pokemonsFiltrados.length) {
    painelCarregarMais?.classList.add('d-none');
    return;
  }

  aCarregar = true;
  if (btnCarregarMais) btnCarregarMais.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> A PROCESSAR...';

  const lote = pokemonsFiltrados.slice(posicaoAtual, posicaoAtual + POR_LOTE);
  const detalhesLote = await Promise.all(lote.map(item => obterDetalhesPokemon(item.id)));

  let htmlCards = '';

  // OTIMIZAÇÃO: Cartões com estrutura HTML compacta
  detalhesLote.forEach(dados => {
    if (!dados?.pokemon) return;

    const poke = dados.pokemon;
    const idFmt = '#' + String(poke.id).padStart(3, '0');
    const nomeFmt = poke.name.charAt(0).toUpperCase() + poke.name.slice(1);
    const tipoPrimario = poke.types[0]?.type?.name || 'normal';
    const corCard = obterCorDoTipo(tipoPrimario);

    // Tipos Duplos iterados com forEach
    let badgesTipos = '';
    poke.types.forEach(t => {
      const corT = obterCorDoTipo(t.type.name);
      badgesTipos += `<span class="badge cyber-type-badge" style="background-color:${corT}; color:#000;">${t.type.name.toUpperCase()}</span> `;
    });

    let badgesFormas = '';
    if (dados.temMega) badgesFormas += '<span class="badge badge-mega me-1">Ⓜ️ MEGA</span>';
    if (dados.temGmax) badgesFormas += '<span class="badge badge-gmax">🔴 G-MAX</span>';

    const imgUrl = poke.sprites?.other?.['official-artwork']?.front_default 
                || poke.sprites?.front_default 
                || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.id}.png`;

    // Template de cartão interativo
    htmlCards += `
      <div class="col">
        <div class="cyber-card h-100 p-2 d-flex flex-column justify-content-between" onclick="abrirModal(${poke.id})" 
             style="border-color:${corCard}; box-shadow:0 0 12px ${corCard}33;">
          <div class="d-flex justify-content-between align-items-center mb-1 font-monospace">
            <span class="cyber-tag">${idFmt}</span>
            <div class="d-flex gap-1 flex-wrap justify-content-end">${badgesTipos}</div>
          </div>
          ${badgesFormas ? `<div class="cyber-form-badges mb-2">${badgesFormas}</div>` : ''}
          <div class="card-img-chamber mb-2">
            <img src="${imgUrl}" alt="${nomeFmt}" class="img-fluid" loading="lazy">
          </div>
          <h3 class="h6 font-monospace text-center text-light fw-bold mb-0 text-truncate" title="${nomeFmt}">${nomeFmt}</h3>
        </div>
      </div>`;
  });

  grelhaPokemon.insertAdjacentHTML('beforeend', htmlCards);
  posicaoAtual += lote.length;
  aCarregar = false;

  if (contadorLote) contadorLote.textContent = `A EXIBIR ${Math.min(posicaoAtual, pokemonsFiltrados.length)} DE ${pokemonsFiltrados.length}`;
  if (btnCarregarMais) btnCarregarMais.innerHTML = '[ + CARREGAR MAIS ]';
  painelCarregarMais?.classList.toggle('d-none', posicaoAtual >= pokemonsFiltrados.length);
}



// 7. SISTEMA DE FILTRAGEM (PESQUISA POR ESCRITO E POR TIPO COM CORES)
async function filtrarPokemons() {
  const textoDigitado = (inputPesquisa?.value || '').toLowerCase().trim();
  const gen = seletorGeracao?.value || 'todas';

  //  Deteção se o utilizador escreveu um TIPO por escrito (ex: 'fogo', 'fire', 'água')
  let tipoParaFiltrar = tipoSelecionado;
  let termoPesquisaNomeOuId = textoDigitado;

  const tipoIdentificadoPorTexto = obterObjetoTipo(textoDigitado);
  if (tipoIdentificadoPorTexto) {
    tipoParaFiltrar = tipoIdentificadoPorTexto.chave;
    termoPesquisaNomeOuId = ''; // O termo foi consumido como filtro de tipo
  }

  // Atualiza dinamicamente as cores do retângulo de pesquisa, badges e botões
  atualizarCoresRetangulo(tipoParaFiltrar);
  atualizarBadgeTipo(tipoParaFiltrar);
  atualizarBotoesTiposAtivos(tipoParaFiltrar);

  // Filtragem por Geração através do mapa de intervalos
  let lista = todosPokemons;
  if (gen !== 'todas' && GERACOES[gen]) {
    const [inicio, fim] = GERACOES[gen];
    lista = lista.filter(p => p.id >= inicio && p.id <= fim);
  }

  // Filtragem por Tipo de Pokémon com Set para consulta rápida
  if (tipoParaFiltrar) {
    if (!cacheTipos[tipoParaFiltrar]) {
      try {
        const res = await fetch(`${API_BASE}/type/${tipoParaFiltrar}`);
        const data = await res.json();
        cacheTipos[tipoParaFiltrar] = new Set(data.pokemon.map(p => p.pokemon.name));
      } catch (e) {
        console.error('Erro ao ler dados do tipo:', e);
      }
    }
    const setTipo = cacheTipos[tipoParaFiltrar];
    if (setTipo) lista = lista.filter(p => setTipo.has(p.nome));
  }

  // Filtragem por Nome ou Número de ID
  if (termoPesquisaNomeOuId) {
    lista = lista.filter(p => 
      p.nome.toLowerCase().includes(termoPesquisaNomeOuId) || 
      String(p.id) === termoPesquisaNomeOuId ||
      ('#' + String(p.id).padStart(3, '0')).includes(termoPesquisaNomeOuId)
    );
  }

  pokemonsFiltrados = lista;
  if (statusRegistos) statusRegistos.textContent = `${pokemonsFiltrados.length} / ${TOTAL_POKEMON}`;
  await renderizarProximoLote(true);
}


// 8. INTERFACE DE SELEÇÃO DOS 18 TIPOS E BADGES
function desenharBotoesTipos() {
  if (!grelhaBotoesTipos) return;
  grelhaBotoesTipos.innerHTML = LISTA_TIPOS_POKEMON.map(tipo => `
    <button type="button" class="badge cyber-type-badge btn-tipo-filtro" 
            data-tipo="${tipo.chave}" onclick="alternarTipo('${tipo.chave}')" 
            style="background-color:${tipo.cor}; color:#000; padding:0.4rem 0.65rem; border:2px solid transparent;"
            title="Filtrar por ${tipo.pt}">
      ${tipo.pt.toUpperCase()}
    </button>
  `).join('');
}

function alternarTipo(chaveTipo) {
  tipoSelecionado = (tipoSelecionado === chaveTipo) ? '' : chaveTipo;
  if (inputPesquisa && obterObjetoTipo(inputPesquisa.value)) {
    inputPesquisa.value = '';
  }
  filtrarPokemons();
}

function atualizarBotoesTiposAtivos(tipoAtivo) {
  grelhaBotoesTipos?.querySelectorAll('.btn-tipo-filtro').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tipo === tipoAtivo);
  });
}

function atualizarBadgeTipo(tipoAtivo) {
  if (!badgesPesquisaContainer) return;
  if (!tipoAtivo) {
    badgesPesquisaContainer.innerHTML = '';
    return;
  }

  const objTipo = obterObjetoTipo(tipoAtivo);
  const cor = objTipo?.cor || obterCorDoTipo(tipoAtivo);
  const nomeExibicao = (objTipo?.pt || tipoAtivo).toUpperCase();

  badgesPesquisaContainer.innerHTML = `
    <span class="badge cyber-type-badge cyber-search-badge d-inline-flex align-items-center gap-1 shadow" 
          style="background-color:${cor}; color:#000; padding:0.35rem 0.75rem; cursor:pointer; font-size:0.75rem;" 
          onclick="alternarTipo('${tipoAtivo}')" title="Remover filtro">
      <span>TIPO: ${nomeExibicao}</span>
      <i class="bi bi-x-circle-fill ms-1"></i>
    </span>`;
}



// 9. MODAL DETAIL COM SHOWDOWN GIF E ALTERNADOR DE FORMAS
async function abrirModal(id) {
  modalCorpo.innerHTML = `
    <div class="text-center py-5 font-monospace text-neon-green">
      <div class="cyber-spinner mb-3"></div>
      &gt; A DESENCRIPTAR BIO-ANÁLISE #${id}...
    </div>`;
  modalBootstrap.show();

  const dados = await obterDetalhesPokemon(id);
  if (!dados) {
    modalCorpo.innerHTML = '<div class="alert alert-danger font-monospace">Erro ao carregar dados do espécime.</div>';
    return;
  }
  especieAtualModal = dados;
  desenharConteudoModal(dados.pokemon, dados.especie, dados.pokemon.name);
}

function desenharConteudoModal(pokemon, especie, formaAtiva) {
  // Showdown GIF animado com fallback para Artwork Oficial
  const gifUrl = pokemon.sprites?.other?.showdown?.front_default 
              || pokemon.sprites?.other?.['official-artwork']?.front_default 
              || pokemon.sprites?.front_default;

  const nomeEspecie = especie?.name || pokemon.name;
  const nomeFmt = nomeEspecie.charAt(0).toUpperCase() + nomeEspecie.slice(1);
  const idFmt = '#' + String(especie?.id || pokemon.id).padStart(3, '0');
  const cor = obterCorDoTipo(pokemon.types[0]?.type?.name || 'normal');

  // Badges dos tipos com forEach
  let htmlTipos = '';
  pokemon.types.forEach(t => {
    htmlTipos += `<span class="badge cyber-type-badge me-1" style="background-color:${obterCorDoTipo(t.type.name)}; color:#000; font-size:0.8rem;">${t.type.name.toUpperCase()}</span>`;
  });

  // Barras de estatísticas base geradas com forEach
  let htmlStats = '';
  pokemon.stats.forEach(s => {
    const pct = Math.min(Math.round((s.base_stat / 255) * 100), 100);
    htmlStats += `
      <div class="stat-cyber-row font-monospace small">
        <div class="d-flex justify-content-between text-secondary mb-1">
          <span>&gt; ${s.stat.name.toUpperCase()}</span>
          <span class="fw-bold" style="color:${cor};">${s.base_stat}</span>
        </div>
        <div class="progress">
          <div class="progress-bar" style="width:${pct}%; background-color:${cor}; box-shadow:0 0 8px ${cor};"></div>
        </div>
      </div>`;
  });

  // Botões de Formas Alternativas gerados dinamicamente com forEach
  let htmlFormas = '', rotuloAtual = '⚡ BASE';
  if (especie?.varieties?.length > 1) {
    let botoes = '';
    especie.varieties.forEach(v => {
      const ativa = (v.pokemon.name === formaAtiva) ? 'active' : '';
      let rotulo = '⚡ BASE';
      if (v.pokemon.name.includes('-mega-x')) rotulo = 'Ⓜ️ MEGA X';
      else if (v.pokemon.name.includes('-mega-y')) rotulo = 'Ⓜ️ MEGA Y';
      else if (v.pokemon.name.includes('-mega')) rotulo = 'Ⓜ️ MEGA';
      else if (v.pokemon.name.includes('-gmax')) rotulo = '🔴 G-MAX';
      else if (v.pokemon.name.includes('-alola')) rotulo = '🌴 ALOLA';
      else if (v.pokemon.name.includes('-galar')) rotulo = '⚔️ GALAR';
      else if (v.pokemon.name.includes('-hisui')) rotulo = '📜 HISUI';
      else if (v.pokemon.name.includes('-paldea')) rotulo = '🐂 PALDEA';
      else if (v.pokemon.name !== nomeEspecie) rotulo = '💠 ' + v.pokemon.name.replace(nomeEspecie + '-', '').replace(/-/g, ' ').toUpperCase();

      if (v.pokemon.name === formaAtiva) rotuloAtual = rotulo;
      botoes += `<button type="button" class="btn btn-sm btn-cyber-form font-monospace ${ativa}" onclick="trocarForma('${v.pokemon.url}', '${v.pokemon.name}')">${rotulo}</button> `;
    });

    htmlFormas = `
      <div class="cyber-form-selector p-2 mb-3">
        <div class="font-monospace text-secondary small mb-2">&gt; FORMAS BIOLÓGICAS ALTERNATIVAS:</div>
        <div class="d-flex flex-wrap gap-2">${botoes}</div>
      </div>`;
  }

  //Template para o corpo do modal
  modalCorpo.innerHTML = `
    ${htmlFormas}
    <div class="row g-4 align-items-center font-monospace">
      <div class="col-12 col-md-5 text-center">
        <div class="gif-containment-chamber mb-3" style="border-color:${cor}88;">
          <img src="${gifUrl}" alt="${nomeFmt}" class="pokemon-gif img-fluid">
        </div>
        <div class="d-flex justify-content-center flex-wrap gap-1 mb-2">${htmlTipos}</div>
      </div>
      <div class="col-12 col-md-7">
        <div class="d-flex justify-content-between align-items-baseline border-bottom border-secondary pb-2 mb-3">
          <div>
            <h3 class="h4 text-light fw-bold mb-0 text-uppercase">${nomeFmt}</h3>
            <div class="text-secondary small mt-1">FORMA: <span class="text-neon-cyan fw-bold">${rotuloAtual}</span></div>
          </div>
          <span class="fs-4 fw-bold" style="color:${cor};">${idFmt}</span>
        </div>
        <div class="row g-2 mb-3">
          <div class="col-6">
            <div class="spec-cyber-box">
              <div class="text-secondary small">&gt; ALTURA</div>
              <div class="text-neon-cyan fw-bold">${(pokemon.height / 10).toFixed(1)} M</div>
            </div>
          </div>
          <div class="col-6">
            <div class="spec-cyber-box">
              <div class="text-secondary small">&gt; PESO</div>
              <div class="text-neon-cyan fw-bold">${(pokemon.weight / 10).toFixed(1)} KG</div>
            </div>
          </div>
        </div>
        <h4 class="h6 text-light border-bottom border-secondary pb-1 mb-2">
          <i class="bi bi-activity text-neon-green me-1"></i> BIO ESTATÍSTICAS BASE:
        </h4>
        ${htmlStats}
      </div>
    </div>`;
}

// Alterna forma dentro do Modal SEM FECHAR
async function trocarForma(urlForma, nomeForma) {
  try {
    const res = await fetch(urlForma);
    if (!res.ok) throw new Error('Falha ao carregar forma');
    const dadosForma = await res.json();
    desenharConteudoModal(dadosForma, especieAtualModal.especie, nomeForma);
  } catch (erro) {
    console.error('Erro ao alternar forma:', erro);
  }
}


// ==============================================================================
// 10. EVENTOS E INICIALIZAÇÃO
// ==============================================================================
let timerPesquisa = null;

// Pesquisa por escrito em tempo real com debounce
inputPesquisa?.addEventListener('input', () => {
  clearTimeout(timerPesquisa);
  timerPesquisa = setTimeout(() => filtrarPokemons(), 150);
});

seletorGeracao?.addEventListener('change', () => filtrarPokemons());

// Botão 'x' limpa a pesquisa, o tipo ativo, restaura as cores e foca o campo
btnLimparPesquisa?.addEventListener('click', () => {
  if (inputPesquisa) inputPesquisa.value = '';
  if (seletorGeracao) seletorGeracao.value = 'todas';
  tipoSelecionado = '';
  atualizarCoresRetangulo('');
  atualizarBadgeTipo('');
  atualizarBotoesTiposAtivos('');
  painelSeletorTipos?.classList.add('d-none');
  filtrarPokemons();
  inputPesquisa?.focus();
});

btnCarregarMais?.addEventListener('click', () => renderizarProximoLote(false));

// Abrir e fechar a gaveta de tipos
inputPesquisa?.addEventListener('focus', () => painelSeletorTipos?.classList.remove('d-none'));

areaPesquisa?.addEventListener('click', (e) => {
  if (e.target && e.target.id !== 'btnLimparPesquisa') {
    painelSeletorTipos?.classList.remove('d-none');
  }
});

btnFecharPainelTipos?.addEventListener('click', (e) => {
  e.stopPropagation();
  painelSeletorTipos?.classList.add('d-none');
});

// Fechar a gaveta ao clicar fora
document.addEventListener('click', (e) => {
  if (!painelSeletorTipos || painelSeletorTipos.classList.contains('d-none')) return;
  const clicouNaArea = areaPesquisa && areaPesquisa.contains(e.target);
  const clicouNoPainel = painelSeletorTipos.contains(e.target);
  const clicouNasBadges = badgesPesquisaContainer && badgesPesquisaContainer.contains(e.target);

  if (!clicouNaArea && !clicouNoPainel && !clicouNasBadges) {
    painelSeletorTipos.classList.add('d-none');
  }
});

// Scroll suave automático
window.addEventListener('scroll', () => {
  if (aCarregar || posicaoAtual >= pokemonsFiltrados.length) return;
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  if (scrollTop + clientHeight >= scrollHeight - 300) {
    renderizarProximoLote(false);
  }
});

// Exposição global das funções para os handlers inline do HTML
window.abrirModal = abrirModal;
window.trocarForma = trocarForma;
window.alternarTipo = alternarTipo;

// Ponto de Entrada: Inicialização após o DOM estar pronto
document.addEventListener('DOMContentLoaded', () => {
  modalBootstrap = new bootstrap.Modal(document.getElementById('modalDetalhes'));
  carregarListaInicial();
});
