# MOLTY v6.2 — Business Intelligence Platform

## Deploy na Vercel

### Opcija 1: Vercel CLI (najbrže)
```bash
# 1. Raspakovati ZIP
unzip MOLTY_v6.2_Vercel.zip
cd molty-platform

# 2. Instalirati dependencies
npm install

# 3. Testirati lokalno
npm run dev

# 4. Deploy na Vercel
npx vercel
# Pratiti uputstva, izabrati defaults

# 5. Production deploy
npx vercel --prod
```

### Opcija 2: GitHub + Vercel (automatski deploy)
```bash
# 1. Napraviti GitHub repo
git init
git add .
git commit -m "MOLTY v6.2"
git remote add origin https://github.com/TVOJ-USERNAME/molty-platform.git
git push -u origin main

# 2. Na vercel.com → New Project → Import GitHub repo → Deploy
```

### Opcija 3: Drag & Drop
1. `npm install && npm run build`
2. Na vercel.com → New Project → Upload `dist` folder
