# Railway.app Deploy Útmutató

A Railway.app egy egyszerűbb és gyorsabb alternatíva a Render.com-hoz képest. Nincs "alvó mód", és automatikusan kezeli az SQLite adatbázist!

## Előnyök a Renderhez képest:

✅ **Nincs alvó mód** - mindig fut  
✅ **Nincs szükség Disk-re** - SQLite automatikusan működik  
✅ **Gyorsabb deploy** - 1-2 perc  
✅ **Ingyenes kredit** - havonta $5 értékben  
✅ **Egyszerűbb felület** - kevesebb beállítás  

---

## Lépésről lépésre deploy

### 1. Regisztrálj Railway.app-ra

1. Menj ide: **https://railway.app**
2. Kattints: **"Get Started"** vagy **"Start a New Project"**
3. Regisztrálj:
   - **GitHub fiókkal** (ajánlott) - kattints a GitHub ikonra
   - Vagy emaillel
4. Erősítsd meg az email címedet (ha emaillel regisztráltál)

### 2. Új projekt létrehozása

1. Bejelentkezés után kattints: **"New Project"**
2. Válaszd: **"Deploy from GitHub repo"**
3. Kattints: **"Configure GitHub App"**
4. Engedélyezd a Railwaynek a GitHub hozzáférést
5. Válaszd ki a repository-dat: **magyar-telepules-tippelo**

### 3. Deploy beállítások

A Railway automatikusan felismeri a Node.js projektet és beállítja!

Ellenőrizd, hogy ezek így legyenek:

| Beállítás | Érték |
|-----------|-------|
| **Root Directory** | `/` (gyökér) |
| **Start Command** | `npm start` |
| **Healthcheck Path** | (hagyd üresen) |

Ha nem látod ezeket, kattints a **"Settings"** fülre.

### 4. Environment Variables (környezeti változók)

1. Kattints a **"Variables"** fülre
2. Kattints: **"New Variable"**
3. Add hozzá:
   - **Name**: `NODE_ENV`
   - **Value**: `production`

### 5. Deploy!

1. Kattints: **"Deploy"** gomb (jobb felső sarok)
2. Várj 1-2 percet
3. A log-okban látni fogod:
   ```
   > magyar-telepules-tippelo@1.0.0 start
   > node server.js
   Szerver fut a 3000 porton
   SQLite adatbázis csatlakoztatva
   ```

### 6. Domain beállítása (URL)

1. Amikor kész (zöld pipa), kattints a **"Settings"** fülre
2. Görgess le a **"Environment"** szekcióhoz
3. **"Generate Domain"** gombra kattints
4. Ez megad egy URL-t: `https://magyar-telepules-tippelo-production.up.railway.app`

### 7. Kész! 🎉

Másold ki az URL-t és küldd el a barátaidnak!

---

## Fontos tudnivalók

### Ingyenes csomag korlátai:

- **Havi kredit**: $5 (kb. 500 óra futásidő)
- **Alvó mód**: NINCS! Mindig fut
- **Sebesség**: Korlátozott, de a játékhoz bőven elég
- **Egy projekt**: Ingyenesen 1 projektet tudsz futtatni

### Ha lemerül a kredit:
- A szerver leáll
- Regisztrálhatsz új emaillel (ha muszáj)
- Vagy vársz a következő hónapig

### Hogyan működik az SQLite?
- Railway automatikusan tárolja a fájlokat
- Nem kell külön Disk-t beállítani
- Az adatok megmaradnak deploy közben is

---

## Hibaelhárítás

### "Build failed" hiba:
1. Nézd meg a Deploy log-ot
2. Ellenőrizd, hogy a `package.json` megvan-e
3. Ha hiányzik: töltsd fel GitHub-ra

### "Application failed to start":
1. Ellenőrizd a Start Command-ot: `npm start`
2. Nézd meg a log-ot: van-e piros hibaüzenet?

### Nem tudsz belépni a Railway-re:
- Használj GitHub bejelentkezést
- Vagy próbáld a Glitch.com-ot (még egyszerűbb)

### Ha elakadsz:
- Railway Discord: https://discord.gg/railway
- Vagy írj nekem! 😊

---

## Alternatíva: Glitch.com (ha a Railway nem megy)

Ha a Railway bonyolult, a Glitch még egyszerűbb:
1. https://glitch.com
2. "New Project" → "Import from GitHub"
3. Kész!

De a Railway sokkal jobb, érdemes vele próbálkozni! 🚀

---

## Kész vagy?

Ha sikerült, küldd el az URL-t a barátaidnak:
```
https://magyar-telepules-tippelo-XXXX.up.railway.app
```

**Jó játékot!** 🎮🇭🇺
