const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MEMÓRIA ALAPÚ ADATTÁROLÁS - nincs szükség SQLite-ra!
const db = {
  rooms: new Map(),
  players: new Map(),
  towns: [],
  guesses: new Map()
};

// Települések betöltése
const townsData = require('./data/telepulesek.json');
db.towns = townsData;
console.log(`${db.towns.length} település betöltve`);

// API végpontok

// Új szoba létrehozása
app.post('/api/rooms', (req, res) => {
  const roomId = uuidv4().substring(0, 8).toUpperCase();
  
  db.rooms.set(roomId, {
    id: roomId,
    created_at: new Date(),
    status: 'waiting',
    current_round: 0,
    max_rounds: 10,
    current_town_id: null,
    towns: [],
    players: []
  });
  
  res.json({ roomId, message: 'Szoba létrehozva' });
});

// Csatlakozás szobához
app.post('/api/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const { playerName } = req.body;
  
  if (!playerName || playerName.trim().length === 0) {
    return res.status(400).json({ error: 'Név megadása kötelező' });
  }
  
  const room = db.rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Szoba nem található' });
  }
  
  const playerId = uuidv4();
  const player = {
    id: playerId,
    room_id: roomId,
    name: playerName.trim(),
    joined_at: new Date(),
    total_score: 0
  };
  
  db.players.set(playerId, player);
  room.players.push(player);
  
  res.json({ playerId, playerName: playerName.trim(), message: 'Sikeres csatlakozás' });
});

// Szoba állapotának lekérdezése
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = db.rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Szoba nem található' });
  }
  
  res.json({
    ...room,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      total_score: p.total_score
    }))
  });
});

// Véletlenszerű települések
function getRandomTowns(count) {
  const shuffled = [...db.towns].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Játék indítása
app.post('/api/rooms/:roomId/start', (req, res) => {
  const { roomId } = req.params;
  const room = db.rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Szoba nem található' });
  }
  
  const towns = getRandomTowns(10);
  room.towns = towns;
  room.status = 'playing';
  room.current_round = 1;
  room.current_town_id = towns[0].id;
  room.guesses = new Map();
  
  res.json({
    message: 'Játék elindítva',
    currentRound: 1,
    totalRounds: 10,
    currentTown: { id: towns[0].id, name: towns[0].name }
  });
});

// Aktuális kör adatainak lekérdezése
app.get('/api/rooms/:roomId/round', (req, res) => {
  const { roomId } = req.params;
  const room = db.rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Szoba nem található' });
  }
  
  if (room.status !== 'playing') {
    return res.status(400).json({ error: 'A játék még nem indult el' });
  }
  
  const currentTown = room.towns[room.current_round - 1];
  if (!currentTown) {
    return res.status(400).json({ error: 'Játék vége' });
  }
  
  // Tippék lekérdezése ehhez a körhöz
  const roundGuesses = [];
  for (const [playerId, playerGuesses] of room.guesses) {
    const guess = playerGuesses.find(g => g.round_number === room.current_round);
    if (guess) {
      const player = db.players.get(playerId);
      roundGuesses.push({
        ...guess,
        player_id: playerId,
        player_name: player ? player.name : 'Ismeretlen'
      });
    }
  }
  
  res.json({
    round: room.current_round,
    totalRounds: room.max_rounds,
    town: { id: currentTown.id, name: currentTown.name },
    guesses: roundGuesses
  });
});

// Tipp beküldése
app.post('/api/rooms/:roomId/guess', (req, res) => {
  const { roomId } = req.params;
  const { playerId, lat, lng } = req.body;
  
  const room = db.rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Szoba nem található' });
  }
  
  const currentTown = room.towns[room.current_round - 1];
  if (!currentTown) {
    return res.status(400).json({ error: 'Játék nem található' });
  }
  
  // Távolság számítás (Haversine formula)
  const R = 6371;
  const dLat = (lat - currentTown.lat) * Math.PI / 180;
  const dLng = (lng - currentTown.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(currentTown.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  // Pontszámítás
  const points = Math.min(Math.round(distance), 1000);
  
  // Tipp mentése
  const guess = {
    room_id: roomId,
    player_id: playerId,
    town_id: currentTown.id,
    round_number: room.current_round,
    lat: lat,
    lng: lng,
    distance: distance,
    points: points,
    actual_lat: currentTown.lat,
    actual_lng: currentTown.lng,
    created_at: new Date()
  };
  
  if (!room.guesses.has(playerId)) {
    room.guesses.set(playerId, []);
  }
  room.guesses.get(playerId).push(guess);
  
  // Játékos pontszámának frissítése
  const player = db.players.get(playerId);
  if (player) {
    player.total_score += points;
  }
  
  res.json({
    distance: Math.round(distance * 10) / 10,
    points: points,
    actualLocation: { lat: currentTown.lat, lng: currentTown.lng }
  });
});

// Következő kör
app.post('/api/rooms/:roomId/next-round', (req, res) => {
  const { roomId } = req.params;
  const room = db.rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Szoba nem található' });
  }
  
  const nextRound = room.current_round + 1;
  
  if (nextRound > room.towns.length) {
    // Játék vége
    room.status = 'finished';
    
    const sortedPlayers = [...room.players].sort((a, b) => a.total_score - b.total_score);
    
    res.json({
      finished: true,
      finalScores: sortedPlayers.map(p => ({
        id: p.id,
        name: p.name,
        total_score: p.total_score
      })),
      message: 'Játék vége!'
    });
  } else {
    // Következő kör
    room.current_round = nextRound;
    room.current_town_id = room.towns[nextRound - 1].id;
    
    res.json({
      round: nextRound,
      totalRounds: room.max_rounds,
      town: { 
        id: room.towns[nextRound - 1].id, 
        name: room.towns[nextRound - 1].name 
      }
    });
  }
});

// Végeredmény lekérdezése
app.get('/api/rooms/:roomId/results', (req, res) => {
  const { roomId } = req.params;
  const room = db.rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Szoba nem található' });
  }
  
  const sortedPlayers = [...room.players].sort((a, b) => a.total_score - b.total_score);
  
  // Összes tipp
  const allGuesses = [];
  for (const [playerId, playerGuesses] of room.guesses) {
    const player = db.players.get(playerId);
    playerGuesses.forEach(guess => {
      const town = room.towns.find(t => t.id === guess.town_id);
      allGuesses.push({
        ...guess,
        player_name: player ? player.name : 'Ismeretlen',
        town_name: town ? town.name : 'Ismeretlen'
      });
    });
  }
  
  res.json({
    players: sortedPlayers.map(p => ({
      id: p.id,
      name: p.name,
      total_score: p.total_score,
      rounds_played: room.guesses.get(p.id)?.length || 0
    })),
    guesses: allGuesses.sort((a, b) => a.round_number - b.round_number)
  });
});

// Szerver indítása
app.listen(PORT, () => {
  console.log(`Szerver fut a ${PORT} porton`);
  console.log(`Környezet: ${process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 'Helyi'}`);
});
