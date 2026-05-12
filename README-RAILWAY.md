# Magyar Település Tippelő - Egyszerűsített Verzió

Ez a verzió **nem használ adatbázist** - minden adat memóriában tárolódik. Ez azt jelenti:

✅ **Nincs SQLite konfiguráció**  
✅ **Nincs Disk beállítás**  
✅ **Azonnal működik Railway-n**  
⚠️ **Az adatok törlődnek, ha a szerver újraindul** (de egy játék alatt nem indul újra!)

---

## Deploy Railway.app-ra (1 perces verzió)

### 1. Regisztrálj:
https://railway.app → Login with GitHub

### 2. Új projekt:
- New Project → Deploy from GitHub repo
- Válaszd: magyar-telepules-tippelo

### 3. Kész! 🎉

**Ennyi az egész!** A Railway automatikusan:
- Felismeri a Node.js projektet
- Telepíti a függőségeket
- Elindítja a szervert
- Generál egy URL-t

**Nincs szükség:**
- ❌ Disk beállításra
- ❌ Environment változókra  
- ❌ Extra konfigurációra

---

## Fontos tudnivaló

Mivel memóriában tároljuk az adatokat:
- Ha a szerver újraindul (pl. újra deploy), a játékok törlődnek
- **De egy játék közben nem indul újra**, szóval végig tudjátok játszani!
- Ingyenes csomagban a szerver néha alszik 5 perc inaktivitás után, de felébred kattintásra

---

## Helyi futtatás

```bash
npm install
npm start
```

Nyisd meg: http://localhost:3000

---

**Jó játékot!** 🎮🇭🇺
