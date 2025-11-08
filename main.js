const esp32Ip = "192.168.1.100";

let isSystemOn = false;
let isAtomizerOn = false;

const elements = {
    statusMessage: document.getElementById('statusMessage'),
    connectionHint: document.getElementById('connectionHint'),
    temperatura: document.getElementById('temperatura'),
    umidade: document.getElementById('umidade'),
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

async function sendControlCommand(command, value) {
    try {
        await fetch(`http://${esp32Ip}/control`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `${command}=${value}`
        });
    } catch (error) {
        console.error("Falha ao enviar comando:", error);
        elements.statusMessage.textContent = "ERRO: Falha ao enviar comando.";
    }
}

function updateMainPowerButtonUI() {
    if (isSystemOn) {
        elements.powerIcon.classList.remove('power-icon-off');
        elements.powerIcon.classList.add('power-icon-on');
        elements.systemStatusDisplay.textContent = 'Desligar Sistema';
    } else {
        elements.powerIcon.classList.remove('power-icon-on');
        elements.powerIcon.classList.add('power-icon-off');
        elements.systemStatusDisplay.textContent = 'Ligar Sistema';
    }
}

function updateAtomizerButtonUI() {
    if (isAtomizerOn) {
        elements.atomizerIcon.classList.add('active');
        elements.atomizerButtonText.textContent = 'Desligar Umidificador';
        elements.atomizerStatus.textContent = 'Ligado';
    } else {
        elements.atomizerIcon.classList.remove('active');
        elements.atomizerButtonText.textContent = 'Ligar Umidificador';
        elements.atomizerStatus.textContent = 'Desligado';
    }
}

function updateFanSpeedDisplay(speed) {
    elements.fanSpeedValue.textContent = speed;
}

async function fetchSensorData() {
    elements.connectionHint.classList.add('hidden');
    elements.statusMessage.textContent = 'Buscando dados...';

    try {
        const response = await fetch(`http://${esp32Ip}/data`);
        if (!response.ok) throw new Error(`Erro na rede: ${response.status}`);
        const data = await response.json();

        elements.temperatura.textContent = `${data.temperatura.toFixed(1)}°C`;
        elements.umidade.textContent = `${data.umidade.toFixed(1)}%`;

        isSystemOn = data.estado_global_ligado;
        updateMainPowerButtonUI();

        isAtomizerOn = data.atomizador_ligado;
        updateAtomizerButtonUI();

        const fanSpeedPercent = Math.round((data.velocidade_ventoinha_pwm / 255) * 100);
        elements.fanSpeedSlider.value = fanSpeedPercent;
        updateFanSpeedDisplay(fanSpeedPercent);

        const controlMode = data.controle_manual_ativo ? 'Manual (App)' : 'Automático (DHT)';
        elements.statusMessage.textContent = `Dados e Status sincronizados. Modo: ${controlMode}`;

    } catch (error) {
        console.error("Falha ao buscar dados do ESP32:", error);
        elements.temperatura.textContent = "---";
        elements.umidade.textContent = "---";
        elements.statusMessage.textContent = "ERRO: Falha ao conectar. (Verifique o IP e CORS)";
        elements.connectionHint.classList.remove('hidden');
    }
}

elements.mainPowerButton.addEventListener('click', () => {
    isSystemOn = !isSystemOn;
    sendControlCommand('power', isSystemOn ? 'on' : 'off');
    updateMainPowerButtonUI();
});

elements.atomizerToggleButton.addEventListener('click', () => {
    isAtomizerOn = !isAtomizerOn;
    sendControlCommand('atomizer', isAtomizerOn ? 'on' : 'off');
    updateAtomizerButtonUI();
});

elements.fanSpeedSlider.addEventListener('input', (event) => {
    const speed = event.target.value;
    updateFanSpeedDisplay(speed);
});

elements.fanSpeedSlider.addEventListener('change', (event) => {
    const speed = event.target.value;
    const pwmValue = Math.round((speed / 100) * 255);
    sendControlCommand('fan', pwmValue);
});

window.onload = function() {
    updateMainPowerButtonUI();
    updateAtomizerButtonUI();
    updateFanSpeedDisplay(elements.fanSpeedSlider.value);

    fetchSensorData();
    setInterval(fetchSensorData, 5000);
};