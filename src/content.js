console.log("<!-- Starting to execute on YouTube... -->");

const LOCAL_STORAGE_KEY = 'pluginAds';

// Estado para rastrear o AD sendo editado
let editingAd = null;

// Função para gerar UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Função para formatar o tempo do vídeo
function getCurrentTime(video) {
  if (video) {
    const currentTime = video.currentTime;
    const hours = Math.floor(currentTime / 3600);
    const minutes = Math.floor((currentTime % 3600) / 60);
    const remainingSeconds = Math.floor(currentTime % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }
  return null;
}

// Função para converter HH:MM:SS para segundos
function toSeconds(time) {
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

// Função para converter segundos para HH:MM:SS
function secondsToTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Função para atualizar as listas de autocomplete
function updateAutocompleteLists() {
  const pluginAds = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
  const uniqueCustomers = [...new Set(pluginAds.map(ad => ad.customer).filter(c => c))];
  const uniqueProperties = [...new Set(pluginAds.map(ad => ad.property).filter(p => p))];

  const clientList = document.getElementById('cliente-list');
  const propertyList = document.getElementById('propriedade-list');

  // Limpar listas existentes
  clientList.innerHTML = '';
  propertyList.innerHTML = '';

  // Preencher lista de clientes
  uniqueCustomers.forEach(customer => {
    const option = document.createElement('option');
    option.value = customer;
    clientList.appendChild(option);
  });

  // Preencher lista de propriedades
  uniqueProperties.forEach(property => {
    const option = document.createElement('option');
    option.value = property;
    propertyList.appendChild(option);
  });
}

// Função para tornar um elemento redimensionável
function makeResizable(element, handle, options = {}) {
  const {
    resizeType = 'both', // 'both', 'horizontal', 'vertical'
    minWidth = 250,
    maxWidth = window.innerWidth * 0.8,
    minHeight = 300,
    maxHeight = window.innerHeight * 0.95,
    onResize = () => {}
  } = options;

  handle.addEventListener('mousedown', startResize);

  function startResize(e) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = parseInt(getComputedStyle(element).width, 10);
    const startHeight = parseInt(getComputedStyle(element).height, 10);

    function doResize(e) {
      if (resizeType === 'both' || resizeType === 'horizontal') {
        let newWidth = startWidth + (e.clientX - startX);
        newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
        element.style.width = `${newWidth}px`;
      }
      if (resizeType === 'both' || resizeType === 'vertical') {
        let newHeight = startHeight + (e.clientY - startY);
        newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
        element.style.height = `${newHeight}px`;
      }
      onResize();
    }

    function stopResize() {
      window.removeEventListener('mousemove', doResize);
      window.removeEventListener('mouseup', stopResize);
    }

    window.addEventListener('mousemove', doResize);
    window.addEventListener('mouseup', stopResize);
  }
}

// Função para criar e injetar a interface no DOM
function injectPluginUI() {
  // Verificar se a interface já existe para evitar duplicação
  if (document.getElementById('plugin-ui-container')) return;

  // Criar contêiner principal
  const container = document.createElement('div');
  container.id = 'plugin-ui-container';
  container.style.position = 'fixed';
  container.style.top = '10px';
  container.style.right = '10px';
  container.style.zIndex = '9999';
  container.style.background = '#fff';
  container.style.border = '1px solid #ccc';
  container.style.padding = '10px';
  container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  container.style.fontFamily = 'Arial, sans-serif';
  // Tamanhos iniciais definidos via JS
  container.style.width = '350px';
  container.style.height = 'auto';
  container.style.maxHeight = '90vh';
  container.style.overflowY = 'auto';

  // HTML da interface com handles de redimensionamento
  container.innerHTML = `
    <style>
      #plugin-ui-container {
        display: flex;
        flex-direction: column;
        min-width: 250px;
        min-height: 300px;
      }
      #plugin-ui-container input, #plugin-ui-container button {
        margin: 5px 0;
      }
      #plugin-ui-container input[type="number"] {
        width: 70px;
      }
      #plugin-ui-container input[type="date"] {
        width: 150px;
      }
      #plugin-ui-container h2, #plugin-ui-container h3 {
        font-size: 16px;
        margin: 10px 0 5px;
      }
      #plugin-ui-container ul {
        list-style: none;
        padding: 0;
        height: 150px; /* Altura inicial */
        overflow-y: auto;
        border: 1px solid #ddd;
        margin-bottom: 0;
      }
      #plugin-ui-container li {
        margin: 5px 0;
        font-size: 14px;
      }
      #plugin-ui-container button {
        padding: 5px;
        cursor: pointer;
      }
      #plugin-ui-content.hidden {
        display: none;
      }
      #toggle-ui-btn {
        padding: 5px 10px;
        font-size: 14px;
        cursor: pointer;
      }
      #delete-ad-btn, #edit-ad-btn {
        margin-left: 5px;
        color: white;
        border: none;
        border-radius: 3px;
        padding: 5px 8px;
      }
      #delete-ad-btn {
        background: #ff4d4d;
      }
      #edit-ad-btn {
        background: #4CAF50;
      }
      #cancel-edit-btn {
        background: #ccc;
        color: #333;
        margin-left: 5px;
      }
      #clear-all-btn {
        background: #b71c1c;
        color: white;
        border: none;
        border-radius: 3px;
        padding: 5px 10px;
        margin-left: 5px;
        cursor: pointer;
      }
      #split-duration-container {
        display: none;
      }
      .resize-handle {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 15px;
        height: 15px;
        background: #ccc;
        cursor: se-resize;
        clip-path: polygon(100% 0, 100% 100%, 0 100%);
      }
      .resize-handle-ads {
        width: 100%;
        height: 5px;
        background: #ccc;
        cursor: ns-resize;
        margin-top: 2px;
      }
      /* Media queries */
      @media screen and (max-width: 768px) {
        #plugin-ui-container {
          width: 90%;
          max-height: 85vh;
          top: 5px;
          right: 5px;
          padding: 8px;
        }
        #plugin-ui-container h2, #plugin-ui-container h3 {
          font-size: 14px;
        }
        #plugin-ui-container input, #plugin-ui-container button {
          font-size: 12px;
          margin: 3px 0;
        }
        #plugin-ui-container input[type="number"] {
          width: 60px;
        }
        #plugin-ui-container input[type="date"] {
          width: 120px;
        }
        #plugin-ui-container li {
          font-size: 12px;
        }
        #toggle-ui-btn, #delete-ad-btn, #edit-ad-btn, #cancel-edit-btn, #clear-all-btn {
          padding: 4px 6px;
        }
        #plugin-ui-container ul {
          height: 120px;
        }
      }
      @media screen and (max-width: 480px) {
        #plugin-ui-container {
          width: 95%;
          max-height: 80vh;
          padding: 5px;
        }
        #plugin-ui-container h2, #plugin-ui-container h3 {
          font-size: 12px;
        }
        #plugin-ui-container input, #plugin-ui-container button {
          font-size: 10px;
        }
        #plugin-ui-container input[type="number"] {
          width: 50px;
        }
        #plugin-ui-container input[type="date"] {
          width: 100px;
        }
        #plugin-ui-container li {
          font-size: 10px;
        }
        #toggle-ui-btn, #delete-ad-btn, #edit-ad-btn, #cancel-edit-btn, #clear-all-btn {
          padding: 3px 5px;
        }
        #plugin-ui-container ul {
          height: 100px;
        }
        .resize-handle, .resize-handle-ads {
          display: none; /* Desativa resize em telas muito pequenas */
        }
      }
    </style>
    <button id="toggle-ui-btn">Minimizar</button>
    <button id="exportar">Exportar Excel</button>
    <button id="clear-all-btn">Limpar Tudo</button>
    <div id="plugin-ui-content">
      <div id="config">
        <h3>Configuração de avanço/retorno vídeo</h3>
        <label>Ctrl + Alt + seta direita/esquerda</label>
        <input type="number" id="time-fast" value="5">
        <br />
        <label>Ctrl + seta direita/esquerda</label>
        <input type="number" id="time-slow" value="1">
      </div>
      <div id="Detalhes da partida">
        <h2>Detalhes da partida</h2>
        <input type="text" id="campeonato" placeholder="Campeonato">
        <input type="text" id="rodada" placeholder="Rodada">
        <input type="text" id="partida" placeholder="Partida">
        <input type="date" id="data-partida" placeholder="Data">
      </div>
      <div id="criarAds">
        <h2>Criar Ads</h2>
        <input type="text" id="cliente" placeholder="Cliente" list="cliente-list">
        <datalist id="cliente-list"></datalist>
        <input type="text" id="propriedade" placeholder="Propriedade" list="propriedade-list">
        <datalist id="propriedade-list"></datalist>
        <input type="text" id="start-time" placeholder="Início (HH:MM:SS)">
        <br/>
        <input type="number" id="end-time" placeholder="0" min="0">
        <span>Tempo de exposição (segundos)</span>
        <br/>
        <label><input type="checkbox" id="split-ad"> Dividir Ad</label>
        <div id="split-duration-container">
          <input type="number" id="split-duration" placeholder="0" min="1">
          <span>Duração por segmento (segundos)</span>
        </div>
        <br/>
        <label><input type="checkbox" id="failure-ad"> Falha</label>
        <br/>
        <button id="novoAd">Novo AD</button>
        <button id="cancel-edit-btn" style="display: none;">Cancelar</button>
      </div>
      <div id="adsContainer">
        <h2>Ads criados</h2>
        <ul id="ads"></ul>
        <div class="resize-handle-ads"></div>
      </div>
    </div>
    <div class="resize-handle"></div>
  `;

  // Adicionar ao DOM
  document.body.appendChild(container);

  // Inicializar redimensionamento
  const resizeHandle = container.querySelector('.resize-handle');
  makeResizable(container, resizeHandle, {
    resizeType: 'both',
    minWidth: 250,
    maxWidth: window.innerWidth * 0.8,
    minHeight: 300,
    maxHeight: window.innerHeight * 0.95
  });

  const adsList = container.querySelector('#ads');
  const resizeHandleAds = container.querySelector('.resize-handle-ads');
  makeResizable(adsList, resizeHandleAds, {
    resizeType: 'vertical',
    minHeight: 100,
    maxHeight: container.offsetHeight * 0.8,
    onResize: () => {
      // Atualizar maxHeight dinamicamente
      adsList.style.maxHeight = adsList.style.height;
    }
  });

  // Adicionar listeners aos botões
  document.getElementById('toggle-ui-btn').addEventListener('click', toggleUI);
  document.getElementById('novoAd').addEventListener('click', handleNewAd);
  document.getElementById('cancel-edit-btn').addEventListener('click', cancelEdit);
  document.getElementById('exportar').addEventListener('click', handleExportExcel);
  document.getElementById('clear-all-btn').addEventListener('click', handleClearAll);

  // Mostrar/esconder campo de duração do segmento
  document.getElementById('split-ad').addEventListener('change', function() {
    document.getElementById('split-duration-container').style.display = this.checked ? 'block' : 'none';
  });

  // Carregar dados existentes
  loadExistingAds();
  loadVideoMetadata();
  updateAutocompleteLists();
}

// Função para limpar todas as inserções
function handleClearAll() {
  if (confirm('Tem certeza que deseja excluir todas as inserções? Esta ação não pode ser desfeita.')) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    loadExistingAds();
    updateAutocompleteLists();
    alert('Todas as inserções foram excluídas.');
  }
}

// Função para minimizar/maximizar a interface
function toggleUI() {
  const content = document.getElementById('plugin-ui-content');
  const toggleBtn = document.getElementById('toggle-ui-btn');
  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    toggleBtn.textContent = 'Minimizar';
  } else {
    content.classList.add('hidden');
    toggleBtn.textContent = 'Maximizar';
  }
}

// Funções de manipulação de vídeo
function handlePause() {
  const video = document.querySelector('video');
  if (video) video.pause();
}

function handlePlay() {
  const video = document.querySelector('video');
  if (video) video.play();
}

function handleBack(seconds) {
  const video = document.querySelector('video');
  if (video) video.currentTime -= Number(seconds);
}

function handleFwd(seconds) {
  const video = document.querySelector('video');
  if (video) video.currentTime += Number(seconds);
}

// Função para validar formato de tempo (HH:MM:SS)
function validateTimeFormat(time) {
  const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
  return regex.test(time);
}

// Função para criar ou editar AD
function handleNewAd() {
  const customer = document.getElementById('cliente').value.trim();
  const property = document.getElementById('propriedade').value.trim();
  let startTime = document.getElementById('start-time').value.trim();
  const endTimeInput = document.getElementById('end-time').value.trim();
  const splitAd = document.getElementById('split-ad').checked;
  const splitDurationInput = document.getElementById('split-duration').value.trim();
  const failureAd = document.getElementById('failure-ad').checked;
  const campeonato = document.getElementById('campeonato').value.trim();
  const rodada = document.getElementById('rodada').value.trim();
  const partida = document.getElementById('partida').value.trim();
  const dataPartida = document.getElementById('data-partida').value;

  // Validar tempo de início
  if (!startTime) {
    const video = document.querySelector('video');
    startTime = getCurrentTime(video);
    if (!startTime) {
      alert('Não foi possível obter o tempo atual do vídeo.');
      return;
    }
  } else if (!validateTimeFormat(startTime)) {
    alert('Formato de tempo inválido. Use HH:MM:SS (ex.: 01:23:45).');
    return;
  }

  // Validar tempo de exposição
  let endElapsedTime = endTimeInput ? Number(endTimeInput) : null;
  if (endTimeInput && (isNaN(endElapsedTime) || endElapsedTime < 0)) {
    alert('Tempo de exposição deve ser um número positivo ou zero.');
    return;
  }

  // Validar divisão
  let splitDuration = splitAd && splitDurationInput ? Number(splitDurationInput) : null;
  if (splitAd) {
    if (!endElapsedTime) {
      alert('Tempo de exposição é obrigatório para ads divididos.');
      return;
    }
    if (!splitDurationInput || isNaN(splitDuration) || splitDuration <= 0) {
      alert('Duração por segmento deve ser um número positivo.');
      return;
    }
    if (splitDuration > endElapsedTime) {
      alert('Duração por segmento não pode ser maior que o tempo de exposição.');
      return;
    }
  }

  let pluginAds = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];

  if (editingAd) {
    // Modo de edição: atualizar AD(s) existente(s)
    const existingAd = pluginAds.find(ad => ad.id === editingAd.id);
    const splitGroupId = existingAd.splitGroupId;
    if (splitGroupId) {
      // Excluir todos os ads do mesmo grupo antes de atualizar
      pluginAds = pluginAds.filter(ad => ad.splitGroupId !== splitGroupId);
    } else {
      // Excluir apenas o ad individual
      pluginAds = pluginAds.filter(ad => ad.id !== editingAd.id);
    }

    if (splitAd) {
      // Criar múltiplos ads divididos
      const numParts = Math.ceil(endElapsedTime / splitDuration);
      const splitGroupId = generateUUID();
      const startSeconds = toSeconds(startTime);
      let remainingTime = endElapsedTime;
      for (let i = 0; i < numParts; i++) {
        const partStartSeconds = startSeconds + i * splitDuration;
        const partDuration = Math.min(remainingTime, splitDuration);
        const isFailure = partDuration < splitDuration ? true : failureAd;
        const newAdObj = {
          id: generateUUID(),
          customer,
          property,
          startTime: secondsToTime(partStartSeconds),
          endElapsedTime: partDuration,
          campeonato,
          rodada,
          partida,
          dataPartida,
          splitGroupId,
          splitPart: `${i + 1}/${numParts}`,
          isFailure
        };
        pluginAds.push(newAdObj);
        remainingTime -= partDuration;
      }
    } else {
      // Criar ad único
      const newAdObj = {
        id: generateUUID(),
        customer,
        property,
        startTime,
        endElapsedTime,
        campeonato,
        rodada,
        partida,
        dataPartida,
        isFailure: failureAd
      };
      pluginAds.push(newAdObj);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pluginAds));
    cancelEdit();
  } else {
    // Modo de criação: adicionar novo(s) AD(s)
    if (splitAd) {
      // Criar múltiplos ads divididos
      const numParts = Math.ceil(endElapsedTime / splitDuration);
      const splitGroupId = generateUUID();
      const startSeconds = toSeconds(startTime);
      let remainingTime = endElapsedTime;
      for (let i = 0; i < numParts; i++) {
        const partStartSeconds = startSeconds + i * splitDuration;
        const partDuration = Math.min(remainingTime, splitDuration);
        const isFailure = partDuration < splitDuration ? true : failureAd;
        const newAdObj = {
          id: generateUUID(),
          customer,
          property,
          startTime: secondsToTime(partStartSeconds),
          endElapsedTime: partDuration,
          campeonato,
          rodada,
          partida,
          dataPartida,
          splitGroupId,
          splitPart: `${i + 1}/${numParts}`,
          isFailure
        };
        pluginAds.push(newAdObj);
        remainingTime -= partDuration;
      }
    } else {
      // Criar ad único
      const newAdObj = {
        id: generateUUID(),
        customer,
        property,
        startTime,
        endElapsedTime,
        campeonato,
        rodada,
        partida,
        dataPartida,
        isFailure: failureAd
      };
      pluginAds.push(newAdObj);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pluginAds));
  }

  // Limpar campos após criação ou edição
  document.getElementById('cliente').value = '';
  document.getElementById('propriedade').value = '';
  document.getElementById('start-time').value = '';
  document.getElementById('end-time').value = '';
  document.getElementById('split-ad').checked = false;
  document.getElementById('split-duration').value = '';
  document.getElementById('split-duration-container').style.display = 'none';
  document.getElementById('failure-ad').checked = false;

  // Atualizar listas de autocomplete
  updateAutocompleteLists();

  // Recarregar lista para refletir alterações e rolar até o final
  loadExistingAds();
  const adsList = document.getElementById('ads');
  adsList.scrollTop = adsList.scrollHeight;
}

// Função para iniciar edição de um AD
function handleEditAd(id) {
  const pluginAds = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
  const ad = pluginAds.find(ad => ad.id === id);
  if (!ad) return;

  // Preencher campos com dados do AD
  document.getElementById('cliente').value = ad.customer;
  document.getElementById('propriedade').value = ad.property;
  document.getElementById('start-time').value = ad.startTime;
  document.getElementById('end-time').value = ad.endElapsedTime !== null ? ad.endElapsedTime : '';
  const isSplitAd = !!ad.splitGroupId;
  document.getElementById('split-ad').checked = isSplitAd;
  document.getElementById('split-duration-container').style.display = isSplitAd ? 'block' : 'none';
  if (isSplitAd) {
    // Estimar splitDuration com base no primeiro ad do grupo
    const groupAds = pluginAds.filter(gad => gad.splitGroupId === ad.splitGroupId);
    document.getElementById('split-duration').value = groupAds[0].endElapsedTime || '';
    // Verificar se todos os ads do grupo têm o mesmo isFailure
    const nonAutoFailedAds = groupAds.filter(gad => gad.endElapsedTime >= (Number(document.getElementById('split-duration').value) || 0));
    const failureStates = [...new Set(nonAutoFailedAds.map(gad => gad.isFailure))];
    if (failureStates.length > 1) {
      alert('Atenção: Os segmentos deste ad têm estados de falha diferentes. O estado do checkbox será baseado no primeiro segmento.');
    }
    document.getElementById('failure-ad').checked = groupAds[0].isFailure;
  } else {
    document.getElementById('failure-ad').checked = ad.isFailure;
  }

  // Entrar no modo de edição
  editingAd = { id };
  const novoAdBtn = document.getElementById('novoAd');
  novoAdBtn.textContent = 'Salvar';
  document.getElementById('cancel-edit-btn').style.display = 'inline-block';
}

// Função para cancelar edição
function cancelEdit() {
  editingAd = null;
  const novoAdBtn = document.getElementById('novoAd');
  novoAdBtn.textContent = 'Novo AD';
  document.getElementById('cancel-edit-btn').style.display = 'none';
  document.getElementById('cliente').value = '';
  document.getElementById('propriedade').value = '';
  document.getElementById('start-time').value = '';
  document.getElementById('end-time').value = '';
  document.getElementById('split-ad').checked = false;
  document.getElementById('split-duration').value = '';
  document.getElementById('split-duration-container').style.display = 'none';
  document.getElementById('failure-ad').checked = false;
}

// Função para excluir um AD
function handleDeleteAd(id, adElement) {
  // Remover do DOM
  adElement.remove();

  // Remover do localStorage
  let pluginAds = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
  const ad = pluginAds.find(ad => ad.id === id);
  if (ad.splitGroupId) {
    // Excluir todos os ads do mesmo grupo
    pluginAds = pluginAds.filter(gad => gad.splitGroupId !== ad.splitGroupId);
  } else {
    // Excluir apenas o ad individual
    pluginAds = pluginAds.filter(gad => ad.id !== id);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pluginAds));

  // Atualizar listas de autocomplete
  updateAutocompleteLists();

  // Recarregar lista para refletir alterações
  loadExistingAds();
}

// Função para finalizar AD
function handleEndAd(id, event) {
  const target = event.target;
  const parent = target.parentElement;
  const parentArray = parent.textContent.split('|').map(e => e.trim());
  const startTime = parentArray[2];
  const startSecond = toSeconds(startTime);

  const video = document.querySelector('video');
  const currentTime = getCurrentTime(video);
  if (!currentTime) return;

  const endSecond = toSeconds(currentTime);
  const elapsed = endSecond - startSecond;
  parent.firstChild.textContent = `${parentArray[0]} | ${parentArray[1]} | ${startTime} | ${elapsed} | `;
  parent.removeChild(target);

  let pluginAds = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
  pluginAds = pluginAds.map(ad => {
    if (ad.id === id) {
      return { ...ad, endElapsedTime: elapsed };
    }
    return ad;
  });
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pluginAds));
}

// Função para exportar Excel
function handleExportExcel() {
  const data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
  if (!data || data.length < 1) {
    alert('Nenhum dado disponível para exportar.');
    return;
  }

  const campeonato = document.getElementById('campeonato').value;
  const rodada = document.getElementById('rodada').value;
  const jogo = document.getElementById('partida').value;
  const dataPartida = document.getElementById('data-partida').value;
  const formattedDate = dataPartida ? dataPartida.replace(/-/g, '') : 'nodate';
  const filename = `${campeonato}-${rodada}-${jogo}-${formattedDate}.xlsx`;

  try {
    // Verificar se XLSX está disponível
    if (typeof XLSX === 'undefined' || !XLSX.writeFile) {
      throw new Error('Biblioteca SheetJS não carregada corretamente.');
    }

    // Ordenar dados por startTime
    const sortedData = data.sort((a, b) => {
      const timeA = toSeconds(a.startTime);
      const timeB = toSeconds(b.startTime);
      return timeA - timeB;
    });

    // Preparar dados para a planilha
    const headers = ['Data', 'Campeonato', 'Rodada', 'Partida', 'Minutagem', 'Tempo de Exposição', 'Tipo Propriedade', 'Propriedade', 'Cliente', 'Check Entrega OPEC'];
    const rows = sortedData.map(row => ({
      Data: row.dataPartida || '',
      Campeonato: row.campeonato || '',
      Rodada: row.rodada || '',
      Partida: row.partida || '',
      Minutagem: row.startTime || '',
      'Tempo de Exposição': row.endElapsedTime !== null ? row.endElapsedTime : '',
      'Tipo Propriedade': '',
      Propriedade: row.property || '',
      Cliente: row.customer || '',
      'Check Entrega OPEC': row.isFailure ? 'NÃO ENTREGUE' : 'SIM'
    }));

    // Criar planilha
    const worksheet = XLSX.utils.json_to_sheet([].concat(rows), { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ads');

    // Exportar arquivo
    XLSX.writeFile(workbook, filename);
  } catch (e) {
    console.error('Erro ao exportar Excel:', e);
    alert('Erro ao gerar o arquivo Excel: ' + e.message + '. Verifique o console para detalhes.');
  }
}

// Carregar anúncios existentes
function loadExistingAds() {
  const existingAds = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
  const adsList = document.getElementById('ads');
  adsList.innerHTML = '';
  existingAds.forEach(ad => {
    const newAd = document.createElement('li');
    if (ad.endElapsedTime !== null) {
      newAd.textContent = `${ad.customer} | ${ad.property} | ${ad.startTime} | ${ad.endElapsedTime}${ad.splitPart ? ` (Parte ${ad.splitPart}${ad.isFailure ? ', Falha' : ''})` : `${ad.isFailure ? ' (Falha)' : ''}`}`;
    } else {
      newAd.textContent = `${ad.customer} | ${ad.property} | ${ad.startTime} | ${ad.isFailure ? ' (Falha)' : ''}`;
      const endAd = document.createElement('button');
      endAd.textContent = 'fim';
      endAd.addEventListener('click', () => handleEndAd(ad.id, event));
      newAd.appendChild(endAd);
    }
    const editAd = document.createElement('button');
    editAd.id = 'edit-ad-btn';
    editAd.textContent = 'Editar';
    editAd.addEventListener('click', () => handleEditAd(ad.id));
    const deleteAd = document.createElement('button');
    deleteAd.id = 'delete-ad-btn';
    deleteAd.textContent = 'Excluir';
    deleteAd.addEventListener('click', () => handleDeleteAd(ad.id, newAd));
    newAd.appendChild(editAd);
    newAd.appendChild(deleteAd);
    adsList.appendChild(newAd);
  });
}

// Carregar metadados do vídeo
function loadVideoMetadata() {
  const titleElement = document.querySelector('h1.ytd-watch-metadata');
  if (titleElement) {
    const title = titleElement.textContent.split('|').map(e => e.trim());
    try {
      document.getElementById('campeonato').value = title[2] || '';
      document.getElementById('rodada').value = title[1] || '';
      document.getElementById('partida').value = title[0].split(':')[1]?.trim() || '';
    } catch (e) {
      console.error('Erro ao carregar metadados:', e);
    }
  }
}

// Monitorar mudanças no DOM para reinjetar a interface
const observer = new MutationObserver(() => {
  if (!document.getElementById('plugin-ui-container')) {
    injectPluginUI();
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// Atalhos de teclado
(function() {
  let playVideo = true;
  document.addEventListener('keydown', function(event) {
    // Ignorar eventos se o foco está em campos de entrada
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      return;
    } else if (event.ctrlKey && !event.altKey && event.key === 'Enter') {
      event.preventDefault();
      if (playVideo) {
        handlePlay();
      } else {
        handlePause();
      }
      playVideo = !playVideo;
      return;
    }
    // Ctrl + Alt
    else if (event.ctrlKey && event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      const time = document.getElementById('time-slow')?.value || 1;
      handleBack(time);
      return;
    } else if (event.ctrlKey && event.altKey && event.key === 'ArrowRight') {
      event.preventDefault();
      const time = document.getElementById('time-fast').value || 5;
      handleFwd(time);
      return;
    }
    // Ctrl
    else if (event.ctrlKey && !event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      const time = document.getElementById('time-slow').value || 1;
      handleBack(time);
      return;
    } else if (event.ctrlKey && !event.altKey && event.key === 'ArrowRight') {
      event.preventDefault();
      const time = document.getElementById('time-slow').value || 1;
      handleFwd(time);
      return;
    }
  });
})();

// Listener para receber mensagens do background
chrome.runtime.onMessage.addListener((message, sender, event) => {
  const video = document.querySelector('video');
  if (message.action === 'getCurrentTime') {
    sendResponse({ currentTime: getCurrentTime(video) || '' });
  } else if (message.action === 'playVideo') {
    handlePlay();
    sendResponse();
  } else if (message.action === 'pauseVideo') {
    handlePause();
    sendResponse();
  } else if (message.action === 'backVideo') {
    handleBack(message.params.time);
    sendResponse();
  } else if (message.action === 'fwdVideo') {
    handleFwd(message.params.time);
    sendResponse();
  } else if (message.action === 'getTitle') {
    sendResponse({ title: document.querySelector('h1.ytd-watch-metadata')?.textContent || '' });
  }
});

// Inicializar a interface
injectPluginUI();