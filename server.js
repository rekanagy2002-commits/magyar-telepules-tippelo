const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SQLite adatbázis inicializálása
// Render.com-on a /data mappa persistens, helyben pedig a gyökérben van
const dbPath = process.env.RENDER ? '/data/database.sqlite' : './database.sqlite';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Adatbázis hiba:', err);
  } else {
    console.log('SQLite adatbázis csatlakoztatva');
    initializeDatabase();
  }
});

// Adatbázis táblák létrehozása
function initializeDatabase() {
  db.serialize(() => {
    // Szobák tábla
    db.run(`CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'waiting',
      current_round INTEGER DEFAULT 0,
      max_rounds INTEGER DEFAULT 10,
      current_town_id INTEGER
    )`);

    // Játékosok tábla
    db.run(`CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      room_id TEXT,
      name TEXT,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_score INTEGER DEFAULT 0,
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    )`);

    // Települések tábla
    db.run(`CREATE TABLE IF NOT EXISTS towns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      county TEXT
    )`);

    // Tippék tábla
    db.run(`CREATE TABLE IF NOT EXISTS guesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT,
      player_id TEXT,
      town_id INTEGER,
      round_number INTEGER,
      lat REAL,
      lng REAL,
      distance REAL,
      points INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (town_id) REFERENCES towns(id)
    )`);

    console.log('Adatbázis táblák inicializálva');
    
    // Települések betöltése ha még nincsenek
    loadTownsIfEmpty();
  });
}

// Települések betöltése JSON fájlból
function loadTownsIfEmpty() {
  db.get('SELECT COUNT(*) as count FROM towns', (err, row) => {
    if (err) {
      console.error('Hiba a települések lekérdezésekor:', err);
      return;
    }
    
    if (row.count === 0) {
      const towns = require('./data/telepulesek.json');
      const stmt = db.prepare('INSERT INTO towns (name, lat, lng, county) VALUES (?, ?, ?, ?)');
      
      towns.forEach(town => {
        stmt.run(town.name, town.lat, town.lng, town.county);
      });
      
      stmt.finalize();
      console.log(`${towns.length} település betöltve az adatbázisba`);
    } else {
      console.log(`${row.count} település már az adatbázisban van`);
    }
  });
}

// Véletlenszerű települések lekérdezése
function getRandomTowns(count, callback) {
  db.all('SELECT * FROM towns ORDER BY RANDOM() LIMIT ?', [count], (err, rows) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, rows);
    }
  });
}

// API végpontok

// Új szoba létrehozása
app.post('/api/rooms', (req, res) => {
  const roomId = uuidv4().substring(0, 8).toUpperCase();
  
  db.run('INSERT INTO rooms (id) VALUES (?)', [roomId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Nem sikerült létrehozni a szobát' });
    }
    
    res.json({ roomId, message: 'Szoba létrehozva' });
  });
});

// Csatlakozás szobához
app.post('/api/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const { playerName } = req.body;
  
  if (!playerName || playerName.trim().length === 0) {
    return res.status(400).json({ error: 'Név megadása kötelező' });
  }
  
  db.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err, room) => {
    if (err || !room) {
      return res.status(404).json({ error: 'Szoba nem található' });
    }
    
    const playerId = uuidv4();
    
    db.run('INSERT INTO players (id, room_id, name) VALUES (?, ?, ?)', 
      [playerId, roomId, playerName.trim()], 
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Nem sikerült csatlakozni' });
        }
        
        res.json({ playerId, playerName: playerName.trim(), message: 'Sikeres csatlakozás' });
      }
    );
  });
});

// Szoba állapotának lekérdezése
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  db.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err, room) => {
    if (err || !room) {
      return res.status(404).json({ error: 'Szoba nem található' });
    }
    
    // Játékosok lekérdezése
    db.all('SELECT id, name, total_score FROM players WHERE room_id = ?', [roomId], (err, players) => {
      if (err) {
        return res.status(500).json({ error: 'Hiba a játékosok lekérdezésekor' });
      }
      
      res.json({ ...room, players });
    });
  });
});

// Játék indítása
app.post('/api/rooms/:roomId/start', (req, res) => {
  const { roomId } = req.params;
  
  getRandomTowns(10, (err, towns) => {
    if (err) {
      return res.status(500).json({ error: 'Nem sikerült településeket betölteni' });
    }
    
    // Szoba frissítése
    db.run('UPDATE rooms SET status = ?, current_round = 1, current_town_id = ? WHERE id = ?',
      ['playing', towns[0].id, roomId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Nem sikerült elindítani a játékot' });
        }
        
        // Települések tárolása a szobához (egyszerűsített megoldás)
        global.roomTowns = global.roomTowns || {};
        global.roomTowns[roomId] = towns;
        
        res.json({ 
          message: 'Játék elindítva', 
          currentRound: 1,
          totalRounds: 10,
          currentTown: { id: towns[0].id, name: towns[0].name }
        });
      }
    );
  });
});

// Aktuális kör adatainak lekérdezése
app.get('/api/rooms/:roomId/round', (req, res) => {
  const { roomId } = req.params;
  
  db.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err, room) => {
    if (err || !room) {
      return res.status(404).json({ error: 'Szoba nem található' });
    }
    
    if (room.status !== 'playing') {
      return res.status(400).json({ error: 'A játék még nem indult el' });
    }
    
    const towns = global.roomTowns?.[roomId];
    if (!towns || room.current_round > towns.length) {
      return res.status(400).json({ error: 'Játék vége' });
    }
    
    const currentTown = towns[room.current_round - 1];
    
    // Korábbi tippék lekérdezése
    db.all(`
      SELECT g.*, p.name as player_name 
      FROM guesses g 
      JOIN players p ON g.player_id = p.id 
      WHERE g.room_id = ? AND g.round_number = ?
    `, [roomId, room.current_round], (err, guesses) => {
      if (err) {
        return res.status(500).json({ error: 'Hiba a tippék lekérdezésekor' });
      }
      
      res.json({
        round: room.current_round,
        totalRounds: room.max_rounds,
        town: { id: currentTown.id, name: currentTown.name },
        guesses: guesses
      });
    });
  });
});

// Tipp beküldése
app.post('/api/rooms/:roomId/guess', (req, res) => {
  const { roomId } = req.params;
  const { playerId, lat, lng } = req.body;
  
  db.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err, room) => {
    if (err || !room) {
      return res.status(404).json({ error: 'Szoba nem található' });
    }
    
    const towns = global.roomTowns?.[roomId];
    if (!towns) {
      return res.status(400).json({ error: 'Játék nem található' });
    }
    
    const currentTown = towns[room.current_round - 1];
    
    // Távolság számítás (Haversine formula)
    const R = 6371; // Föld sugara km-ben
    const dLat = (lat - currentTown.lat) * Math.PI / 180;
    const dLng = (lng - currentTown.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(currentTown.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Pontszámítás (minél közelebb, annál kevesebb pont)
    const points = Math.min(Math.round(distance), 1000);
    
    // Tipp mentése
    db.run(`
      INSERT INTO guesses (room_id, player_id, town_id, round_number, lat, lng, distance, points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [roomId, playerId, currentTown.id, room.current_round, lat, lng, distance, points], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Nem sikerült menteni a tippet' });
      }
      
      // Játékos pontszámának frissítése
      db.run('UPDATE players SET total_score = total_score + ? WHERE id = ?', [points, playerId]);
      
      res.json({
        distance: Math.round(distance * 10) / 10,
        points: points,
        actualLocation: { lat: currentTown.lat, lng: currentTown.lng }
      });
    });
  });
});

// Következő kör
app.post('/api/rooms/:roomId/next-round', (req, res) => {
  const { roomId } = req.params;
  
  db.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err, room) => {
    if (err || !room) {
      return res.status(404).json({ error: 'Szoba nem található' });
    }
    
    const nextRound = room.current_round + 1;
    const towns = global.roomTowns?.[roomId];
    
    if (nextRound > towns.length) {
      // Játék vége
      db.run('UPDATE rooms SET status = ? WHERE id = ?', ['finished', roomId]);
      
      // Végeredmény lekérdezése
      db.all('SELECT id, name, total_score FROM players WHERE room_id = ? ORDER BY total_score ASC', [roomId], (err, players) => {
        res.json({ 
          finished: true, 
          finalScores: players,
          message: 'Játék vége!'
        });
      });
    } else {
      // Következő kör
      db.run('UPDATE rooms SET current_round = ?, current_town_id = ? WHERE id = ?',
        [nextRound, towns[nextRound - 1].id, roomId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Nem sikerült következő körre lépni' });
          }
          
          res.json({
            round: nextRound,
            totalRounds: room.max_rounds,
            town: { id: towns[nextRound - 1].id, name: towns[nextRound - 1].name }
          });
        }
      );
    }
  });
});

// Végeredmény lekérdezése
app.get('/api/rooms/:roomId/results', (req, res) => {
  const { roomId } = req.params;
  
  db.all(`
    SELECT p.id, p.name, p.total_score,
           COUNT(g.id) as rounds_played,
           AVG(g.distance) as avg_distance
    FROM players p
    LEFT JOIN guesses g ON p.id = g.player_id
    WHERE p.room_id = ?
    GROUP BY p.id
    ORDER BY p.total_score ASC
  `, [roomId], (err, players) => {
    if (err) {
      return res.status(500).json({ error: 'Hiba az eredmények lekérdezésekor' });
    }
    
    // Összes tipp részletesen
    db.all(`
      SELECT g.*, p.name as player_name, t.name as town_name, t.lat as actual_lat, t.lng as actual_lng
      FROM guesses g
      JOIN players p ON g.player_id = p.id
      JOIN towns t ON g.town_id = t.id
      WHERE g.room_id = ?
      ORDER BY g.round_number, g.points ASC
    `, [roomId], (err, guesses) => {
      if (err) {
        return res.status(500).json({ error: 'Hiba a tippék lekérdezésekor' });
      }
      
      res.json({ players, guesses });
    });
  });
});

// Szerver indítása - minden hálózati interfészen hallgat
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Szerver fut a ${PORT} porton`);
  console.log(`Helyi elérés: http://localhost:${PORT}`);
  console.log(`Hálózati elérés: http://10.39.5.12:${PORT}`);
  console.log(`\nA barátaidnak ezt a linket küldd:`);
  console.log(`http://10.39.5.12:${PORT}`);
});

// Adatbázis kapcsolat bezárása kilépéskor
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Adatbázis kapcsolat lezárva');
    process.exit(0);
  });
});
