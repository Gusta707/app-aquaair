// O endereço IP do seu ESP32.
const esp32Ip = "192.168.1.100";

// Estado local para os controles (para atualização da UI)
let isSystemOn = false;
let isAtomizerOn = false;
let currentFanSpeed = 0; // 0-100%

const elements = {
    statusMessage: document.getElementById('statusMessage'),
    connectionHint: document.getElementById('connectionHint'),
    temperatura: document.getElementById('temperatura'),
    umidade: document.getElementById('umidade'),
    waterLevelIndicator: document.getElementById('waterLevelIndicator'),
    mainPowerButton: document.getElementById('mainPowerButton'),
    powerIcon: document.getElementById('powerIcon'),
    systemStatusDisplay: document.getElementById('systemStatusDisplay'),
    atomizerToggleButton: document.getElementById('atomizerToggleButton'),
    atomizerIcon: document.getElementById('atomizerIcon'),
    atomizerButtonText: document.getElementById('atomizerButtonText'),
    atomizerStatus: document.getElementById('atomizerStatus'),
    fanSpeedSlider: document.getElementById('fanSpeedSlider'),
    fanSpeedValue: document.getElementById('fanSpeedValue'),
};

/**
 * Função de utilidade para enviar comandos de controle para o ESP32.
 * @param {string} endpoint - O nome do endpoint (ex: control).
 * @param {string} param - O parâmetro de comando (ex: system=on, atomizer=off).
 */
async function sendControlCommand(endpoint, param) {
    const url = `http://${esp32Ip}/${endpoint}?${param}`;
    elements.statusMessage.textContent = `Enviando comando: ${param.split('=')[0]}...`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erro de servidor: ${response.status}`);
        }
        elements.statusMessage.textContent = `Comando (${param.split('=')[0]}) enviado com sucesso.`;
        return true;
    } catch (error) {
        console.error("Falha ao enviar comando de controle:", error);
        elements.statusMessage.textContent = "ERRO ao enviar comando. Verifique o IP e as rotas no ESP32.";
        return false;
    }
}

// --- LÓGICA DO BOTÃO PRINCIPAL (ICONE POWER) ---
elements.mainPowerButton.addEventListener('click', async () => {
    const newState = !isSystemOn;
    const command = newState ? 'on' : 'off';
    
    // Tenta enviar o comando
    if (await sendControlCommand('control', `system=${command}`)) {
        isSystemOn = newState;
        updateMainPowerButtonUI();
        
        // Se o sistema for desligado, desliga os outros componentes no UI
        if (!isSystemOn) {
            isAtomizerOn = false;
            currentFanSpeed = 0;
            elements.fanSpeedSlider.value = 0;
            updateAtomizerButtonUI();
            updateFanSpeedDisplay(0);
        }
    }
});

function updateMainPowerButtonUI() {
    elements.systemStatusDisplay.textContent = `Protótipo: ${isSystemOn ? 'Ligado' : 'Desligado'}`;

    if (isSystemOn) {
        elements.powerIcon.classList.remove('power-icon-off');
        elements.powerIcon.classList.add('power-icon-on');
        elements.systemStatusDisplay.classList.remove('text-red-300');
        elements.systemStatusDisplay.classList.add('text-green-300');
    } else {
        elements.powerIcon.classList.remove('power-icon-on');
        elements.powerIcon.classList.add('power-icon-off');
        elements.systemStatusDisplay.classList.remove('text-green-300');
        elements.systemStatusDisplay.classList.add('text-red-300');
    }
}

// --- LÓGICA DO BOTÃO DO ATOMIZADOR (ICONE FUMAÇA) ---
elements.atomizerToggleButton.addEventListener('click', async () => {
     if (!isSystemOn) {
        elements.statusMessage.textContent = "Erro: Ligue o Protótipo primeiro!";
        return;
    }
    const newState = !isAtomizerOn;
    const command = newState ? 'on' : 'off';
    
    if (await sendControlCommand('control', `atomizer=${command}`)) {
        isAtomizerOn = newState;
        updateAtomizerButtonUI();
    }
});

function updateAtomizerButtonUI() {
    elements.atomizerButtonText.textContent = isAtomizerOn ? 'Desligar Neblina' : 'Ligar Neblina';
    elements.atomizerStatus.textContent = `Status: ${isAtomizerOn ? 'Ligado' : 'Desligado'}`;

    if (isAtomizerOn) {
        // Estado Ligado: Cor mais vibrante e botão laranja/amarelo
        elements.atomizerToggleButton.classList.remove('bg-[var(--color-accent)]', 'hover:bg-[#2a688d]');
        elements.atomizerToggleButton.classList.add('bg-orange-500', 'hover:bg-orange-600');
        elements.atomizerIcon.classList.remove('text-white');
        elements.atomizerIcon.classList.add('text-yellow-300'); // Ícone mais claro
        elements.atomizerStatus.classList.remove('text-red-300');
        elements.atomizerStatus.classList.add('text-green-300');
    } else {
        // Estado Desligado: Cor padrão
        elements.atomizerToggleButton.classList.remove('bg-orange-500', 'hover:bg-orange-600');
        elements.atomizerToggleButton.classList.add('bg-[var(--color-accent)]', 'hover:bg-[#2a688d]');
        elements.atomizerIcon.classList.remove('text-yellow-300');
        elements.atomizerIcon.classList.add('text-white');
        elements.atomizerStatus.classList.remove('text-green-300');
        elements.atomizerStatus.classList.add('text-red-300');
    }
}

// --- LÓGICA DO SLIDER DA VENTOINHA ---
function updateFanSpeedDisplay(percent) {
    currentFanSpeed = parseInt(percent, 10);
    const pwmValue = Math.round((currentFanSpeed / 100) * 255);
    elements.fanSpeedValue.textContent = `${currentFanSpeed}% (PWM: ${pwmValue})`;
}

async function setFanSpeed(percent) {
     if (!isSystemOn) {
        elements.statusMessage.textContent = "Erro: Ligue o Protótipo primeiro!";
        elements.fanSpeedSlider.value = 0; // Reseta o slider se o sistema estiver desligado
        updateFanSpeedDisplay(0);
        return;
    }
    const pwmValue = Math.round((parseInt(percent, 10) / 100) * 255);
    await sendControlCommand('control', `fan_speed=${pwmValue}`);
}

// Listeners para o slider da ventoinha
elements.fanSpeedSlider.addEventListener('input', (event) => {
    updateFanSpeedDisplay(event.target.value);
});

elements.fanSpeedSlider.addEventListener('change', (event) => {
    setFanSpeed(event.target.value);
});


// --- FUNÇÃO PRINCIPAL DE LEITURA DE DADOS ---
async function fetchSensorData() {
    elements.connectionHint.classList.add('hidden');
    elements.statusMessage.textContent = 'Buscando dados...';

    try {
        const response = await fetch(`http://${esp32Ip}/data`);
        
        if (!response.ok) {
            throw new Error(`Erro na rede: ${response.status}`);
        }

        const data = await response.json();
        
        // 1. Atualiza Leituras
        elements.temperatura.textContent = `${data.temperatura.toFixed(1)}°C`;
        elements.umidade.textContent = `${data.umidade.toFixed(1)}%`;

        // 2. Atualiza Nível da Água
        updateWaterLevelIndicator(data.nivel_agua); 

        // 3. Atualiza status
        elements.connectionHint.classList.add('hidden');
        elements.statusMessage.textContent = 'Dados atualizados com sucesso!';

    } catch (error) {
        console.error("Falha ao buscar dados do ESP32:", error);
        
        elements.temperatura.textContent = "---";
        elements.umidade.textContent = "---";
        elements.statusMessage.textContent = "ERRO: Falha ao conectar. (Verifique o IP e CORS)";
        
        elements.connectionHint.classList.remove('hidden'); 
        
        // Limpa o indicador de nível em caso de erro
        elements.waterLevelIndicator.textContent = "ERRO";
        elements.waterLevelIndicator.className = "px-3 py-1 text-sm font-bold rounded-full text-white bg-red-600";
    }
}

function updateWaterLevelIndicator(level) {
    elements.waterLevelIndicator.textContent = level || "Desconhecido";
    
    // Limpa as classes de cor anteriores
    elements.waterLevelIndicator.className = "px-3 py-1 text-sm font-bold rounded-full text-white";

    if (level === 'Alto') {
        elements.waterLevelIndicator.classList.add('bg-green-600');
    } else if (level === 'Baixo') {
        elements.waterLevelIndicator.classList.add('bg-red-600');
    } else {
        elements.waterLevelIndicator.classList.add('bg-gray-500');
    }
}

// Configurações iniciais e loop de atualização
window.onload = function() {
    updateMainPowerButtonUI();
    updateAtomizerButtonUI();
    updateFanSpeedDisplay(elements.fanSpeedSlider.value);

    // Inicialmente busca os dados
    fetchSensorData();
    
    // Atualiza os dados a cada 5 segundos
    setInterval(fetchSensorData, 5000);
};