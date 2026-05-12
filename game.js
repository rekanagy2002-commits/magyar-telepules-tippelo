// Játék állapot
let gameState = {
    roomId: null,
    playerId: null,
    playerName: null,
    currentRound: 0,
    totalRounds: 10,
    currentTown: null,
    hasGuessed: false,
    myGuess: null,
    myGuessResult: null,
    isSubmitting: false,
    map: null,
    guessMarker: null,
    otherMarkers: [],
    actualMarker: null,
    line: null,
    players: [],
    isGameFinished: false
};

// Színek a játékosokhoz
const playerColors = [
    '#CD212A', '#436F4D', '#2563EB', '#D97706', 
    '#7C3AED', '#DB2777', '#0891B2', '#059669'
];

// Inicializálás oldalbetöltéskor
document.addEventListener('DOMContentLoaded', async () => {
    // URL paraméterek kiolvasása
    const urlParams = new URLSearchParams(window.location.search);
    gameState.roomId = urlParams.get('room');
    
    if (!gameState.roomId) {
        alert('Nincs megadva szoba kód!');
        window.location.href = '/';
        return;
    }
    
    // Szoba kód megjelenítése
    document.getElementById('roomCode').textContent = gameState.roomId;
    
    // Ellenőrizzük, van-e mentett játékos adat
    gameState.playerId = localStorage.getItem('playerId');
    gameState.playerName = localStorage.getItem('playerName');
    
    if (!gameState.playerId) {
        // Új játékos - név bekérése
        document.getElementById('nameModal').classList.remove('hidden');
    } else {
        // Csatlakozás meglévő adatokkal
        await joinWithExistingPlayer();
    }
});

// Név beküldése
async function submitName() {
    const nameInput = document.getElementById('newPlayerName');
    const playerName = nameInput.value.trim();
    
    if (!playerName) {
        alert('Kérlek add meg a neved!');
        return;
    }
    
    try {
        const response = await fetch(`/api/rooms/${gameState.roomId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerName })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            gameState.playerId = data.playerId;
            gameState.playerName = data.playerName;
            
            localStorage.setItem('playerId', gameState.playerId);
            localStorage.setItem('playerName', gameState.playerName);
            
            document.getElementById('nameModal').classList.add('hidden');
            await initializeGame();
        } else {
            alert(data.error || 'Hiba történt a csatlakozáskor');
        }
    } catch (error) {
        console.error('Hiba:', error);
        alert('Hiba történt a csatlakozáskor');
    }
}

// Csatlakozás meglévő játékossal
async function joinWithExistingPlayer() {
    try {
        const response = await fetch(`/api/rooms/${gameState.roomId}`);
        const data = await response.json();
        
        if (response.ok) {
            // Ellenőrizzük, hogy a játékos benne van-e a szobában
            const playerExists = data.players.some(p => p.id === gameState.playerId);
            
            if (!playerExists) {
                // Ha nincs benne, újra kell csatlakozni
                localStorage.removeItem('playerId');
                localStorage.removeItem('playerName');
                document.getElementById('nameModal').classList.remove('hidden');
                return;
            }
            
            await initializeGame();
        } else {
            alert('A szoba nem található!');
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Hiba:', error);
        alert('Hiba történt a csatlakozáskor');
    }
}

// Játék inicializálása
async function initializeGame() {
    // Térkép inicializálása
    initMap();
    
    // Szoba adatok betöltése
    await loadRoomData();
    
    // Ha a játék még nem indult el, és van elég játékos, indíthatjuk
    const roomData = await fetch(`/api/rooms/${gameState.roomId}`).then(r => r.json());
    
    if (roomData.status === 'waiting') {
        // Várakozás a játék indítására
        showWaitingScreen();
    } else if (roomData.status === 'playing') {
        // Játék folyamatban
        await loadCurrentRound();
    } else if (roomData.status === 'finished') {
        // Játék vége
        showFinalResults();
    }
    
    // Rendszeres frissítés
    startPolling();
}

// Térkép inicializálása
function initMap() {
    // Magyarország középpontja
    gameState.map = L.map('map', {
        tap: false,
        touchZoom: true,
        scrollWheelZoom: true
    }).setView([47.1625, 19.5033], 7);
    
    // CartoDB Voyager színes térkép feliratok nélkül
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap, ©CartoDB',
        maxZoom: 19,
        subdomains: 'abcd'
    }).addTo(gameState.map);
    
    // Kattintás esemény
    gameState.map.on('click', onMapClick);
}

// Térkép kattintás kezelése - azonnal beküldi a tippet
function onMapClick(e) {
    if (gameState.hasGuessed || gameState.isGameFinished || gameState.isSubmitting) return;
    
    const { lat, lng } = e.latlng;
    
    // Korábbi marker törlése
    if (gameState.guessMarker) {
        gameState.map.removeLayer(gameState.guessMarker);
    }
    
    // Új marker létrehozása
    const markerHtml = `<div class="player-marker guess-marker pulse-animation" style="background: ${getPlayerColor(gameState.playerId)};">${gameState.playerName.charAt(0).toUpperCase()}</div>`;
    const icon = L.divIcon({
        html: markerHtml,
        className: 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
    
    gameState.guessMarker = L.marker([lat, lng], { icon }).addTo(gameState.map);
    gameState.myGuess = { lat, lng };
    
    // Azonnal beküldjük a tippet
    submitGuess(lat, lng);
}

// Tipp beküldése (automatikusan a térkép kattintás után)
async function submitGuess(lat, lng) {
    if (gameState.isSubmitting) return;
    gameState.isSubmitting = true;
    
    // Vizuális visszajelzés
    showToast('Tipp beküldve...');
    
    try {
        const response = await fetch(`/api/rooms/${gameState.roomId}/guess`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerId: gameState.playerId,
                lat: lat,
                lng: lng
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            gameState.hasGuessed = true;
            gameState.myGuessResult = data;
            document.getElementById('waitingMessage').style.display = 'block';
            
            // Valós hely megjelenítése a térképen
            showActualLocation(data.actualLocation);
            
            // Ha egyedül vagyunk, automatikusan mutassuk az eredményt
            if (gameState.players.length === 1) {
                document.getElementById('waitingText').textContent = 'Készen vagy!';
                setTimeout(() => {
                    showSoloResults(data);
                }, 1500);
            } else {
                document.getElementById('showResultsBtn').style.display = 'block';
                document.getElementById('waitingText').textContent = `Várakozás a többiekre (${gameState.players.length} játékos)`;
                showToast('Tipp rögzítve! Várakozás a többiekre...');
            }
        } else {
            showToast(data.error || 'Hiba történt', 'error');
            gameState.isSubmitting = false;
        }
    } catch (error) {
        console.error('Hiba:', error);
        showToast('Hiba történt a tipp beküldésekor', 'error');
        gameState.isSubmitting = false;
    }
}

// Játékos színének lekérdezése
function getPlayerColor(playerId) {
    const index = gameState.players.findIndex(p => p.id === playerId);
    return playerColors[index % playerColors.length];
}

// Tipp megerősítése
async function confirmGuess() {
    if (!gameState.myGuess || gameState.hasGuessed) return;
    
    const btn = document.getElementById('confirmBtn');
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.textContent = 'Küldés...';
    
    // Dupla kattintás elleni védelem
    if (gameState.isSubmitting) return;
    gameState.isSubmitting = true;
    
    try {
        const response = await fetch(`/api/rooms/${gameState.roomId}/guess`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerId: gameState.playerId,
                lat: gameState.myGuess.lat,
                lng: gameState.myGuess.lng
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            gameState.hasGuessed = true;
            gameState.myGuessResult = data; // Eltároljuk az eredményt
            document.getElementById('actionButtons').style.display = 'none';
            document.getElementById('waitingMessage').style.display = 'block';
            
            // Valós hely megjelenítése a térképen
            showActualLocation(data.actualLocation);
            
            // Ha egyedül vagyunk, vagy mindenki tippelt, mutassuk az eredményt
            if (gameState.players.length === 1) {
                document.getElementById('waitingText').textContent = 'Készen vagy! Nézd meg az eredményt!';
                setTimeout(() => {
                    showSoloResults(data);
                }, 1000);
            } else {
                document.getElementById('showResultsBtn').style.display = 'block';
                document.getElementById('waitingText').textContent = `Várakozás a többiekre... (${gameState.players.length} játékos)`;
            }
        } else {
            alert(data.error || 'Hiba történt a tipp beküldésekor');
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.textContent = 'Tipp megerősítése';
            gameState.isSubmitting = false;
        }
    } catch (error) {
        console.error('Hiba:', error);
        alert('Hiba történt a tipp beküldésekor');
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.textContent = 'Tipp megerősítése';
        gameState.isSubmitting = false;
    }
}

// Valós hely megjelenítése
function showActualLocation(location) {
    // Valós hely marker
    const markerHtml = '<div class="player-marker actual-marker">★</div>';
    const icon = L.divIcon({
        html: markerHtml,
        className: 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
    
    gameState.actualMarker = L.marker([location.lat, location.lng], { icon }).addTo(gameState.map);
    
    // Vonal a tipp és a valós hely között
    if (gameState.myGuess) {
        gameState.line = L.polyline(
            [[gameState.myGuess.lat, gameState.myGuess.lng], [location.lat, location.lng]],
            { color: '#CD212A', weight: 3, dashArray: '10, 10' }
        ).addTo(gameState.map);
        
        // Térkép újraméretezése mindkét pont láthatóságához
        const bounds = L.latLngBounds(
            [gameState.myGuess.lat, gameState.myGuess.lng],
            [location.lat, location.lng]
        );
        gameState.map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Tipp törlése
function resetGuess() {
    if (gameState.guessMarker) {
        gameState.map.removeLayer(gameState.guessMarker);
        gameState.guessMarker = null;
    }
    gameState.myGuess = null;
    document.getElementById('actionButtons').style.display = 'none';
}

// Szoba adatok betöltése
async function loadRoomData() {
    try {
        const response = await fetch(`/api/rooms/${gameState.roomId}`);
        const data = await response.json();
        
        if (response.ok) {
            gameState.players = data.players;
            updatePlayersList();
        }
    } catch (error) {
        console.error('Hiba a szoba adatok betöltésekor:', error);
    }
}

// Játékosok listájának frissítése
function updatePlayersList() {
    const container = document.getElementById('playersList');
    container.innerHTML = '';
    
    // Pontszám szerint rendezés
    const sortedPlayers = [...gameState.players].sort((a, b) => a.total_score - b.total_score);
    
    sortedPlayers.forEach((player, index) => {
        const isMe = player.id === gameState.playerId;
        const color = playerColors[gameState.players.findIndex(p => p.id === player.id) % playerColors.length];
        
        const playerDiv = document.createElement('div');
        playerDiv.className = `leaderboard-item flex items-center justify-between p-3 rounded-lg ${isMe ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50'}`;
        playerDiv.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style="background: ${color}">
                    ${index + 1}
                </div>
                <span class="font-medium ${isMe ? 'text-red-700' : 'text-gray-700'}">
                    ${player.name} ${isMe ? '(Te)' : ''}
                </span>
            </div>
            <span class="font-bold text-gray-800">${player.total_score} pont</span>
        `;
        
        container.appendChild(playerDiv);
    });
}

// Aktuális kör betöltése
async function loadCurrentRound() {
    try {
        const response = await fetch(`/api/rooms/${gameState.roomId}/round`);
        const data = await response.json();
        
        if (response.ok) {
            gameState.currentRound = data.round;
            gameState.totalRounds = data.totalRounds;
            gameState.currentTown = data.town;
            
            // UI frissítése
            document.getElementById('currentRound').textContent = gameState.currentRound;
            document.getElementById('townName').textContent = gameState.currentTown.name;
            
            // Térkép tisztítása
            clearMap();
            
            // Ha már tippeltünk ebben a körben
            const myGuess = data.guesses.find(g => g.player_id === gameState.playerId);
            if (myGuess) {
                gameState.hasGuessed = true;
                gameState.myGuess = { lat: myGuess.lat, lng: myGuess.lng };
                document.getElementById('waitingMessage').style.display = 'block';
                
                // Megjelenítjük a tippet és a valós helyet
                const markerHtml = `<div class="player-marker guess-marker" style="background: ${getPlayerColor(gameState.playerId)};">${gameState.playerName.charAt(0).toUpperCase()}</div>`;
                const icon = L.divIcon({
                    html: markerHtml,
                    className: 'custom-marker',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });
                gameState.guessMarker = L.marker([myGuess.lat, myGuess.lng], { icon }).addTo(gameState.map);
                
                // Mások tippjeinek megjelenítése
                showOtherGuesses(data.guesses);
            } else {
                gameState.hasGuessed = false;
                gameState.isSubmitting = false;
                document.getElementById('waitingMessage').style.display = 'none';
                document.getElementById('showResultsBtn').style.display = 'none';
                document.getElementById('tapInstruction').style.display = 'block';
            }
            
            // Ha mindenki tippelt, eredmény megjelenítése
            if (data.guesses.length === gameState.players.length) {
                showRoundResults(data.guesses);
            }
        }
    } catch (error) {
        console.error('Hiba a kör betöltésekor:', error);
    }
}

// Más játékosok tippjeinek megjelenítése
function showOtherGuesses(guesses) {
    // Korábbi marker-ek törlése
    gameState.otherMarkers.forEach(marker => gameState.map.removeLayer(marker));
    gameState.otherMarkers = [];
    
    guesses.forEach(guess => {
        if (guess.player_id === gameState.playerId) return;
        
        const player = gameState.players.find(p => p.id === guess.player_id);
        if (!player) return;
        
        const color = getPlayerColor(guess.player_id);
        const markerHtml = `<div class="player-marker other-marker" style="background: ${color};">${player.name.charAt(0).toUpperCase()}</div>`;
        const icon = L.divIcon({
            html: markerHtml,
            className: 'custom-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        const marker = L.marker([guess.lat, guess.lng], { icon }).addTo(gameState.map);
        marker.bindPopup(`<b>${player.name}</b><br>${Math.round(guess.distance * 10) / 10} km`);
        gameState.otherMarkers.push(marker);
    });
}

// Kör eredményeinek megjelenítése
function showRoundResults(guesses) {
    const myGuess = guesses.find(g => g.player_id === gameState.playerId);
    if (!myGuess) return;
    
    // Modal feltöltése
    document.getElementById('resultTownName').textContent = gameState.currentTown.name;
    document.getElementById('resultDistance').textContent = `${Math.round(myGuess.distance * 10) / 10} km`;
    document.getElementById('resultPoints').textContent = `${myGuess.points} pont`;
    
    // Összes tipp listázása
    const allGuessesDiv = document.getElementById('allGuesses');
    allGuessesDiv.innerHTML = '';
    
    const sortedGuesses = [...guesses].sort((a, b) => a.distance - b.distance);
    
    sortedGuesses.forEach((guess, index) => {
        const player = gameState.players.find(p => p.id === guess.player_id);
        const isMe = guess.player_id === gameState.playerId;
        const color = getPlayerColor(guess.player_id);
        
        const guessDiv = document.createElement('div');
        guessDiv.className = `flex items-center justify-between p-3 rounded-lg ${isMe ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`;
        guessDiv.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-lg font-bold ${index === 0 ? 'text-yellow-500' : 'text-gray-400'}">#${index + 1}</span>
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background: ${color}">
                    ${player.name.charAt(0).toUpperCase()}
                </div>
                <span class="font-medium ${isMe ? 'text-red-700' : 'text-gray-700'}">${player.name}</span>
            </div>
            <div class="text-right">
                <div class="text-sm font-bold text-gray-800">${Math.round(guess.distance * 10) / 10} km</div>
                <div class="text-xs text-gray-500">${guess.points} pont</div>
            </div>
        `;
        
        allGuessesDiv.appendChild(guessDiv);
    });
    
    // Modal megjelenítése
    document.getElementById('resultModal').classList.remove('hidden');
    
    // Valós hely megjelenítése - a gameState.currentTown-ból vesszük a koordinátákat
    if (gameState.currentTown && gameState.currentTown.lat && gameState.currentTown.lng) {
        showActualLocation({ lat: gameState.currentTown.lat, lng: gameState.currentTown.lng });
    } else if (global.roomTowns && global.roomTowns[gameState.roomId]) {
        // Ha a currentTown nem tartalmazza, a global.roomTowns-ból vesszük
        const towns = global.roomTowns[gameState.roomId];
        const currentTownData = towns[gameState.currentRound - 1];
        if (currentTownData) {
            showActualLocation({ lat: currentTownData.lat, lng: currentTownData.lng });
        }
    }
}

// Következő kör
async function nextRound() {
    document.getElementById('resultModal').classList.add('hidden');
    
    try {
        const response = await fetch(`/api/rooms/${gameState.roomId}/next-round`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.finished) {
                // Játék vége
                showFinalResults();
            } else {
                // Következő kör
                gameState.hasGuessed = false;
                gameState.myGuess = null;
                gameState.myGuessResult = null;
                gameState.isSubmitting = false;
                document.getElementById('showResultsBtn').style.display = 'none';
                await loadCurrentRound();
            }
        }
    } catch (error) {
        console.error('Hiba:', error);
    }
}

// Végeredmény megjelenítése
async function showFinalResults() {
    gameState.isGameFinished = true;
    
    try {
        const response = await fetch(`/api/rooms/${gameState.roomId}/results`);
        const data = await response.json();
        
        if (response.ok) {
            const finalScoresDiv = document.getElementById('finalScores');
            finalScoresDiv.innerHTML = '';
            
            data.players.forEach((player, index) => {
                const isMe = player.id === gameState.playerId;
                const color = getPlayerColor(player.id);
                
                const position = index + 1;
                let medal = '';
                if (position === 1) medal = '🥇';
                else if (position === 2) medal = '🥈';
                else if (position === 3) medal = '🥉';
                
                const playerDiv = document.createElement('div');
                playerDiv.className = `flex items-center justify-between p-4 rounded-xl ${isMe ? 'bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300' : 'bg-gray-50'}`;
                playerDiv.innerHTML = `
                    <div class="flex items-center gap-4">
                        <div class="text-2xl">${medal || `#${position}`}</div>
                        <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style="background: ${color}">
                            ${player.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="font-bold ${isMe ? 'text-red-700' : 'text-gray-800'}">${player.name} ${isMe ? '(Te)' : ''}</div>
                            <div class="text-sm text-gray-600">Átlag: ${Math.round(player.avg_distance * 10) / 10} km</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-gray-800">${player.total_score}</div>
                        <div class="text-sm text-gray-500">pont</div>
                    </div>
                `;
                
                finalScoresDiv.appendChild(playerDiv);
            });
            
            document.getElementById('gameOverModal').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Hiba az eredmények betöltésekor:', error);
    }
}

// Térkép tisztítása
function clearMap() {
    if (gameState.guessMarker) {
        gameState.map.removeLayer(gameState.guessMarker);
        gameState.guessMarker = null;
    }
    
    gameState.otherMarkers.forEach(marker => gameState.map.removeLayer(marker));
    gameState.otherMarkers = [];
    
    if (gameState.actualMarker) {
        gameState.map.removeLayer(gameState.actualMarker);
        gameState.actualMarker = null;
    }
    
    if (gameState.line) {
        gameState.map.removeLayer(gameState.line);
        gameState.line = null;
    }
    
    gameState.myGuess = null;
    gameState.hasGuessed = false;
    gameState.myGuessResult = null;
    gameState.isSubmitting = false;
    
    // UI elemek visszaállítása
    const tapInstruction = document.getElementById('tapInstruction');
    if (tapInstruction) tapInstruction.style.display = 'none';
}

// Várakozó képernyő
function showWaitingScreen() {
    document.getElementById('townName').textContent = 'Várakozás a játék indítására...';
    document.getElementById('currentRound').textContent = '0';
    document.getElementById('startGameSection').style.display = 'block';
}

// Játék frissítése
async function refreshGame() {
    await loadRoomData();
    const roomData = await fetch(`/api/rooms/${gameState.roomId}`).then(r => r.json());
    
    if (roomData.status === 'waiting') {
        showWaitingScreen();
    } else if (roomData.status === 'playing') {
        document.getElementById('startGameSection').style.display = 'none';
        await loadCurrentRound();
    } else if (roomData.status === 'finished') {
        showFinalResults();
    }
}

// Játék indítása
async function startGame() {
    try {
        const response = await fetch(`/api/rooms/${gameState.roomId}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('startGameSection').style.display = 'none';
            await loadCurrentRound();
        } else {
            alert(data.error || 'Hiba történt a játék indításakor');
        }
    } catch (error) {
        console.error('Hiba:', error);
        alert('Hiba történt a játék indításakor');
    }
}

// Rendszeres frissítés
function startPolling() {
    // 3 másodpercenként frissítjük az adatokat
    setInterval(async () => {
        if (gameState.isGameFinished) return;
        
        await loadRoomData();
        
        const roomData = await fetch(`/api/rooms/${gameState.roomId}`).then(r => r.json());
        
        if (roomData.status === 'playing' && !gameState.hasGuessed) {
            await loadCurrentRound();
        }
    }, 3000);
}

// Toast értesítés megjelenítése
function showToast(message, type = 'info') {
    // Korábbi toast eltávolítása
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Új toast létrehozása
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = `fixed bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-lg z-50 font-medium text-white transition-all duration-300 ${
        type === 'error' ? 'bg-red-500' : 'bg-green-500'
    }`;
    toast.textContent = message;
    toast.style.animation = 'fadeInUp 0.3s ease-out';
    
    document.body.appendChild(toast);
    
    // Automatikus eltűnés
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, 20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Egyjátékos mód eredmény megjelenítése
function showSoloResults(data) {
    document.getElementById('waitingMessage').style.display = 'none';
    document.getElementById('showResultsBtn').style.display = 'none';
    
    // Modal feltöltése
    document.getElementById('resultTownName').textContent = gameState.currentTown.name;
    document.getElementById('resultDistance').textContent = `${Math.round(data.distance * 10) / 10} km`;
    document.getElementById('resultPoints').textContent = `${data.points} pont`;
    
    // Csak a saját tipp megjelenítése
    const allGuessesDiv = document.getElementById('allGuesses');
    allGuessesDiv.innerHTML = '';
    
    const guessDiv = document.createElement('div');
    guessDiv.className = 'flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200';
    guessDiv.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="text-lg font-bold text-yellow-500">#1</span>
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background: ${getPlayerColor(gameState.playerId)}">
                ${gameState.playerName.charAt(0).toUpperCase()}
            </div>
            <span class="font-medium text-red-700">${gameState.playerName} (Te)</span>
        </div>
        <div class="text-right">
            <div class="text-sm font-bold text-gray-800">${Math.round(data.distance * 10) / 10} km</div>
            <div class="text-xs text-gray-500">${data.points} pont</div>
        </div>
    `;
    allGuessesDiv.appendChild(guessDiv);
    
    // Modal megjelenítése
    document.getElementById('resultModal').classList.remove('hidden');
}

// Kézi eredmény megjelenítés (többjátékos mód)
async function manualShowResults() {
    try {
        const response = await fetch(`/api/rooms/${gameState.roomId}/round`);
        const data = await response.json();
        
        if (response.ok && data.guesses && data.guesses.length > 0) {
            showRoundResults(data.guesses);
            document.getElementById('waitingMessage').style.display = 'none';
            document.getElementById('showResultsBtn').style.display = 'none';
        } else {
            // Ha még nincs elég tipp, de a felhasználó akarja, mutassuk a saját eredményt
            if (gameState.myGuessResult) {
                showSoloResults(gameState.myGuessResult);
            }
        }
    } catch (error) {
        console.error('Hiba:', error);
        if (gameState.myGuessResult) {
            showSoloResults(gameState.myGuessResult);
        }
    }
}

// Eredmény megosztása
function shareResults() {
    const text = `Magyar Település Tippelő játék! Szoba: ${gameState.roomId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Magyar Település Tippelő',
            text: text,
            url: window.location.href
        });
    } else {
        // Másolás vágólapra
        navigator.clipboard.writeText(`${text}\n${window.location.href}`);
        alert('Link másolva a vágólapra!');
    }
}
