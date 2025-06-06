const LOCAL_STORAGE_KEY = 'plugin_ads';
const existingAdsStorage = localStorage.getItem(LOCAL_STORAGE_KEY);

let playVideo = true;

const sendEventToTab = (action, event, params = {}) => {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action, params }, event)
  });
}

const handleGetTime = () => {
  sendEventToTab('getCurrentTime', function(response) {
    if (chrome.runtime.lastError) {
      console.error('Error sending message: ', chrome.runtime.lastError);
      return;
    }

    if (response && response.currentTime !== null) {
      document.getElementById('currentTime').textContent = `Current Time: ${response.currentTime}`;
    } else {
      document.getElementById('currentTime').textContent = 'Unable to get current time.';
    }
  })
}

const handlePause = () => { 
  sendEventToTab('pauseVideo',function(response) {
    if (chrome.runtime.lastError) {
      console.error('Error sending message: ', chrome.runtime.lastError);
      return;
    }
    console.log('Paused video...');
  }); 
}

const handlePlay = () => {
  sendEventToTab('playVideo',function(response) {
    if (chrome.runtime.lastError) {
      console.error('Error sending message: ', chrome.runtime.lastError);
      return;
    }
    console.log('Played video...');
  }); 
}

const handleBack = (secondsToBack = 5) => {
  sendEventToTab('backVideo',function(response) {
    if (chrome.runtime.lastError) {
      console.error('Error sending message: ', chrome.runtime.lastError);
      return;
    }
    console.log('Backed video...');
  }, {time: secondsToBack}); 
}

const handleFwd = (secondsToFwd = 5) => {
  sendEventToTab('fwdVideo',function(response) {
    if (chrome.runtime.lastError) {
      console.error('Error sending message: ', chrome.runtime.lastError);
      return;
    }
    console.log('Fwd video...');
  }, {time: secondsToFwd}); 
}

const handleNewAd = () => {
  sendEventToTab('getCurrentTime', function(response) {
    if (chrome.runtime.lastError) {
      console.error('Error sending message: ', chrome.runtime.lastError);
      return;
    }

    if (response && response.currentTime !== null) {
      const adsList = document.getElementById('ads');
      const customer = document.getElementById('cliente')
      const property = document.getElementById('propriedade')

      const newAd = document.createElement('li')
      const endAd = document.createElement('button')
      
      endAd.class = 'endAd'
      endAd.textContent = 'fim'
      newAd.textContent = `${customer.value} | ${property.value} | ${response.currentTime} |`
      newAd.appendChild(endAd);
      endAd.addEventListener('click', handleEndAd);
      adsList.appendChild(newAd)

      const pluginAds = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));

      const newAdObj = {
        customer: customer.value,
        property: property.value,
        startTime: response.currentTime
      }

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...(!!pluginAds ? pluginAds : []), newAdObj]));
    } else {
      document.getElementById('currentTime').textContent = 'Unable to get current time.';
    }
  })
}

function toSeconds(time) {
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

const handleEndAd = (event) => {
  const target = event.target
  const parent = target.parentElement
  parent.removeChild(parent.lastElementChild)
  const parentArray = parent.textContent.split('|');
  const parentText = parent.textContent
  const startTime = parentArray[2].trim();
  const startSecond = toSeconds(startTime);
  sendEventToTab('getCurrentTime', function(response) {
    if (chrome.runtime.lastError) {
      console.error('Error sending message: ', chrome.runtime.lastError);
      return;
    }

    if (response && response.currentTime !== null) {
      const endSecond = toSeconds(response.currentTime);
      const elapsed = endSecond - startSecond
      parent.replaceChildren()
      parent.textContent = `${parentText} ${elapsed}`

      let pluginAds = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));

      if (!!pluginAds) {
        pluginAds = (!!pluginAds ? pluginAds : []).map(ad => {
          if ((startTime === ad.startTime )&& (parentArray[0].trim() === ad.customer)) {
            return {                
              ...ad,
              endElapsedTime: elapsed
            }
          }
          return ad
        })
      }

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...pluginAds]));
    } else {
      document.getElementById('currentTime').textContent = 'Unable to get current time.';
    }
  })
}

const handleExportCsv = (filename = 'output.csv') => {
  let data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY))
  if (!data || data.length < 1) return
  
  const campeonato = document.getElementById('campeonato').value
  const rodada = document.getElementById('rodada').value
  const jogo = document.getElementById('partida').value
  filename = `${campeonato}-${rodada}-${jogo}.csv`

  const csvRows = [];

   for (const row of data) {
    const values = Object.values(row).map(value => {
      const escaped = ('' + value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  // Junta todas as linhas
  const csvContent = csvRows.join('\n');

  // Cria o blob e link de download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

document.getElementById('pauseVideo').addEventListener('click', handlePause);
document.getElementById('playVideo').addEventListener('click', handlePlay);
document.getElementById('backVideo').addEventListener('click', handleBack);
document.getElementById('fwdVideo').addEventListener('click', handleFwd);
document.getElementById('novoAd').addEventListener('click', handleNewAd);
document.getElementById('exportar').addEventListener('click', handleExportCsv);

sendEventToTab('getTitle', (response) => {
  try {

    const title = response.title.split('|').map(e => e.trim())
    const championship =  title[2]
    const game = title[0].split(':')[1].trim()
    const round = title[1]

    document.getElementById('campeonato').value = championship
    document.getElementById('rodada').value = round
    document.getElementById('partida').value = game
  } catch(e) {
    console.log(e);
  }
})

if (!!existingAdsStorage) {
  const existingAds = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY))
  for (var adIdx in existingAds) {
    const ad = existingAds[adIdx]
    const adsList = document.getElementById('ads');
    const customer = ad.customer;
    const property = ad.property;
  
    const newAd = document.createElement('li')
    newAd.textContent = `${customer} | ${property} | ${ad.startTime} |`

    if (!!ad.endElapsedTime) {
      newAd.textContent = newAd.textContent + ' ' + ad.endElapsedTime
    } else {
      const endAd = document.createElement('button')
      endAd.class = 'endAd'
      endAd.textContent = 'fim'
      newAd.appendChild(endAd);
      endAd.addEventListener('click', handleEndAd);
    }

    adsList.appendChild(newAd)
  }
}

chrome.storage.onChanged.addListener(
  async function(){
      console.log("Storage changed")
      currentTime = await chrome.storage.local.get("currentTime");
      console.log({currentTime})
      document.getElementById('currentTime').textContent = `Current Time: ${currentTime.currentTime}`;
  },
)

// shortcuts
document.addEventListener('keydown', function(event) {
  // play pause video
  if (event.ctrlKey && event.key === ' ' ) {
    if (playVideo) {
      handlePlay();
    } else {
      handlePause();
    }
    playVideo = !playVideo
    return
  }

  // avanco retorno video
  if (event.ctrlKey && event.key === 'ArrowRight') {
    time = document.getElementById('time-slow').value
    handleFwd(time)
    return
  }

  if (event.ctrlKey && event.key === 'ArrowLeft') {
    time = document.getElementById('time-slow').value
    handleBack(time)
    return
  }

  if (event.key === 'ArrowRight') { 
    time = document.getElementById('time-fast').value
    handleFwd(time)
    return
  }

  if (event.key === 'ArrowLeft') { 
    time = document.getElementById('time-fast').value
    handleBack(time)
    return
  }
});