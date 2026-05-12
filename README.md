# Magyar Település Tippelő

Egy webalapú földrajzi kvíz játék, ahol baráti társaságok versenyezhetnek, hogy ki tudja pontosabban megtippelni a magyar települések elhelyezkedését.

## Funkciók

- **2-8 játékos** egy szobában
- **10 település** játékonként (véletlenszerűen kiválasztva)
- **Valós idejű versengés** - lásd a többiek tippjeit élőben
- **Interaktív térkép** OpenStreetMap alapokon (Leaflet.js)
- **Aszinkron játék** - mindenki a saját tempójában játszhat
- **Automatikus pontszámítás** távolság alapján
- **Ranglista** a játék végén

## Technológiák

- **Backend**: Node.js + Express + SQLite
- **Frontend**: HTML5 + JavaScript + Tailwind CSS
- **Térkép**: Leaflet.js + OpenStreetMap
- **Design**: Magyar nemzeti színek (piros-fehér-zöld)

## Deploy Online (Ingyenes)

A játékot ingyenesen deploy-olhatod a Render.com-ra:

1. **Regisztrálj**: https://render.com
2. **Hozz létre egy Web Service-t**
3. **Töltsd fel a kódot** (GitHub-ról vagy ZIP-ként)
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`

**Részletes útmutató**: Lásd [DEPLOY.md](DEPLOY.md) fájlt

### Miután deploy-oltad:
- Megkapod az URL-t: `https://magyar-telepules-tippelo-XXXX.onrender.com`
- Ezt a linket küldd el a barátaidnak
- Csak azok tudják elérni, akiknek megadod a linket

---

## Helyi futtatás (saját gépen)

### Előfeltételek

- Node.js (14.x vagy újabb)
- npm vagy yarn

### Lépések

1. **Klónozd a projektet** vagy másold a fájlokat egy mappába

2. **Telepítsd a függőségeket**:
   ```bash
   npm install
   ```

3. **Indítsd el a szervert**:
   ```bash
   npm start
   ```
   
   Fejlesztői módban (automatikus újraindítással):
   ```bash
   npm run dev
   ```

4. **Nyisd meg a böngészőben**:
   ```
   http://localhost:3000
   ```

## Használat

### Új játék létrehozása

1. Nyisd meg a főoldalt
2. Kattints az "Új játék létrehozása" gombra
3. Add meg a neved
4. Oszd meg a szoba kódot a barátaiddal

### Csatlakozás meglévő játékhoz

1. Nyisd meg a főoldalt
2. Add meg a szoba kódot (amit a szoba létrehozója küldött)
3. Add meg a neved
4. Kattints a "Csatlakozás" gombra

### Játékmenet

1. Minden körben egy település neve jelenik meg
2. Érintsd meg a térképen ahol szerinted van a település
3. Kattints a "Tipp megerősítése" gombra
4. Várd meg amíg a többiek is tippelnek
5. Nézd meg az eredményt és a ranglistát
6. Folytasd a következő településsel

## Adatbázis

A játék SQLite adatbázist használ (`database.sqlite`), amely automatikusan létrejön az első indításkor. Tartalmaz:

- **Szobák** tábla: játék szobák adatai
- **Játékosok** tábla: játékosok nevei és pontszámai
- **Települések** tábla: magyar települések nevei és koordinátái (a `data/telepulesek.json` fájlból töltődik be)
- **Tippék** tábla: minden tipp részletes adatai

## Testreszabás

### Új települések hozzáadása

Szerkeszd a `data/telepulesek.json` fájlt és add hozzá az új településeket a következő formátumban:

```json
{
  "name": "Település neve",
  "lat": 47.1234,
  "lng": 19.5678,
  "county": "Megye neve"
}
```

A változtatások életbe lépéséhez töröld az adatbázis fájlt (`database.sqlite`), és indítsd újra a szervert.

### Színek módosítása

A magyar nemzeti színek a következő helyeken találhatók:
- **CSS**: `public/index.html` és `public/game.html`
- **Backend**: `server.js` (statikus fájlok kiszolgálása)

## Fejlesztési lehetőségek

- [ ] Nehézségi szintek (csak megyeszékhelyek, csak kis falvak, stb.)
- [ ] Időlimit körönként
- [ ] Chat funkció a játékosok között
- [ ] Történeti statisztikák
- [ ] Különböző régiók (csak Dunántúl, csak Alföld, stb.)
- [ ] Egyjátékos mód

## Licenc

MIT License - Szabadon használható és módosítható.

## Készítő

Készült szeretettel baráti társaságoknak.

---

**Jó játékot!** 🎮🇭🇺
