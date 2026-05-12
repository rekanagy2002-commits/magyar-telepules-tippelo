# Deploy a Render.com-ra

Ez az útmutató segít online elérhetővé tenni a játékot a Render.com ingyenes szolgáltatásán keresztül.

## Előkészületek

1. **Regisztrálj a Render.com-on:**
   - Nyisd meg: https://render.com
   - Kattints "Get Started for Free"
   - Regisztrálj emaillel vagy GitHub-fiókkal

2. **Töltsd fel a kódot GitHub-ra (ajánlott):**
   - Hozz létre egy új repository-t GitHub-on
   - Töltsd fel a projekt fájljait
   - VAGY használhatod a Render.com GitHub integrációját

## Deploy lépések

### 1. Új Web Service létrehozása

1. Jelentkezz be a Render.com-ra
2. Kattints a **"New +"** gombra (fent jobbra)
3. Válaszd a **"Web Service"**-t

### 2. Csatlakoztasd a kódot

**Ha GitHub-ról dolgozol:**
- Kattints **"Build and deploy from a Git repository"**-re
- Válaszd ki a GitHub repository-dat
- Kattints **"Connect"**

**Ha manuálisan töltöd fel:**
- Kattints **"Upload your code"**-ra
- Töltsd fel a projekt ZIP fájlját

### 3. Beállítások

Töltsd ki az alábbi mezőket:

| Mező | Érték |
|------|-------|
| **Name** | `magyar-telepules-tippelo` (vagy amit szeretnél) |
| **Region** | `Frankfurt (EU Central)` (vagy ami közelebb van) |
| **Branch** | `main` (ha GitHub-ról) |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | `Free` |

### 4. Advanced beállítások

Görgess le a **"Advanced"** szekcióhoz és kattints rá:

1. **Disk (Opcionális de ajánlott):**
   - Ez szükséges az SQLite adatbázishoz
   - **Name:** `sqlite-data`
   - **Mount Path:** `/data`
   - **Size:** `1 GB` (ingyenes)

2. **Environment Variables:**
   Kattints **"Add Environment Variable"** és add hozzá:
   
   - **Key:** `RENDER`
   - **Value:** `true`

### 5. Deploy

1. Kattints a **"Create Web Service"** gombra
2. Várj 2-5 percet amíg felépül (Build log-ot látsz)
3. Ha kész, megjelenik egy URL: `https://magyar-telepules-tippelo.onrender.com`

### 6. Link megosztása

Másold ki a kapott URL-t és küldd el a barátaidnak:

```
https://magyar-telepules-tippelo-XXXX.onrender.com
```

## Fontos tudnivalók

### Ingyenes csomag korlátai:

- **Alvó mód:** 15 perc inaktivitás után "elalszik" a szerver
  - Első kattintásra felébred (30-60 másodperc várakozás)
  - Játék közben nem alszik el!
  
- **Havi limit:** 750 óra futásidő (kb. 31 nap folyamatos használat)

- **Sebesség:** Korlátozott CPU/memória, de a játékhoz bőven elég

### Ha újra akarod deploy-olni:

Ha módosítasz valamit a kódban:
1. GitHub-ra push-olod a változtatásokat
2. Render automatikusan újraépíti (ha GitHub integráció van)
3. VAGY manuálisan: Render Dashboard → Web Service → Manual Deploy → Deploy Latest Commit

## Hibaelhárítás

### "Build failed" hiba:
- Ellenőrizd a Build log-ot (Render Dashboard → Web Service → Logs)
- Gyakori ok: hiányzó függőség a package.json-ben

### "Application Error" oldal:
- Ellenőrizd a Runtime log-ot
- Lehet, hogy az SQLite nem tud írni a /data mappába

### A játék nem indul:
- Ellenőrizd, hogy létrejött-e az adatbázis
- Nézd meg a log-ot: Render Dashboard → Web Service → Logs

## Alternatívák

Ha a Render nem működik, próbáld ezeket:

- **Railway.app** - Hasonló, de gyorsabb indulás
- **Glitch.com** - Teljesen ingyenes, kevesebb funkció
- **Vercel** - Csak frontend-hez (SQLite nem működik)

## Sikeres deploy után

1. Nyisd meg a kapott URL-t böngészőben
2. Hozz létre egy új szobát
3. Másold ki a szoba kódot
4. Küldd el a barátaidnak:
   - Link: `https://magyar-telepules-tippelo-XXXX.onrender.com`
   - Szoba kód: `ABC123` (vagy ami generálódott)

Jó játékot! 🎮
