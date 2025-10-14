#!/bin/bash

echo "🚀 Installation complète : MiniJantes-v2 + Neon + GitHub + Vercel"

ZIP_FILE="MiniJantes-v2.zip"
EXTRACT_DIR="MiniJantes-v2"

# === Étape 1 : Décompression ===
if [ -f "$ZIP_FILE" ]; then
  echo "📦 Décompression de $ZIP_FILE ..."
  unzip -o "$ZIP_FILE" -d "$EXTRACT_DIR" > /dev/null
  echo "✅ Décompression terminée."
else
  echo "❌ Fichier $ZIP_FILE introuvable. Place-le dans ton espace Replit avant de relancer ce script."
  exit 1
fi

cd "$EXTRACT_DIR" || exit

# === Étape 2 : Création base Neon.tech ===
echo "🧠 Création automatique d'une base PostgreSQL Neon..."
read -p "➡️  Entre ta clé API Neon.tech : " NEON_API_KEY
read -p "➡️  Nom du projet Neon (ex: minijantes-db) : " PROJECT_NAME

CREATE_RESPONSE=$(curl -s -X POST "https://console.neon.tech/api/v2/projects" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$PROJECT_NAME\"}")

DB_URL=$(echo $CREATE_RESPONSE | grep -o '"connection_uri":"[^"]*' | cut -d'"' -f4)

if [ -z "$DB_URL" ]; then
  echo "❌ Échec de création du projet Neon."
  echo "Réponse brute : $CREATE_RESPONSE"
  exit 1
fi

echo "✅ Base PostgreSQL créée sur Neon.tech"
echo "🔗 URL : $DB_URL"

# === Étape 3 : Création du fichier .env ===
echo "🧩 Création du fichier .env ..."
cat <<EOF > .env
DATABASE_URL=$DB_URL
DRIZZLE_DATABASE_URL=\${DATABASE_URL}
VITE_API_BASE_URL=https://mini-jantes-backend.vercel.app
VITE_APP_NAME=MiniJantes
VITE_ENV=production
EOF

echo "✅ .env créé."

# === Étape 4 : Initialisation Git + GitHub ===
echo "🔧 Initialisation Git..."
git init -q
git branch -M main
git add .
git commit -m "Initial commit MiniJantes-v2"

read -p "➡️  Ton nom d'utilisateur GitHub : " GH_USER
read -p "➡️  Nom du repo GitHub (ex: mini-jantes-v2) : " GH_REPO

curl -u "$GH_USER" https://api.github.com/user/repos -d "{\"name\":\"$GH_REPO\"}" > /dev/null 2>&1

git remote add origin https://github.com/$GH_USER/$GH_REPO.git
git push -u origin main

echo "✅ Projet envoyé sur GitHub : https://github.com/$GH_USER/$GH_REPO"

# === Étape 5 : Création + déploiement sur Vercel ===
echo "🌍 Création automatique du projet Vercel..."
read -p "➡️  Entre ton token API Vercel : " VERCEL_TOKEN
read -p "➡️  Nom du projet Vercel (ex: mini-jantes) : " VERCEL_PROJECT

VERCEL_RESPONSE=$(curl -s -X POST "https://api.vercel.com/v13/projects" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$VERCEL_PROJECT\", \"framework\": \"vite\"}")

VERCEL_ID=$(echo $VERCEL_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$VERCEL_ID" ]; then
  echo "❌ Erreur lors de la création du projet Vercel."
  echo "Réponse : $VERCEL_RESPONSE"
  exit 1
fi

echo "✅ Projet créé sur Vercel : $VERCEL_PROJECT"

# Lier la base Neon comme variable d’environnement sur Vercel
curl -s -X POST "https://api.vercel.com/v9/projects/$VERCEL_PROJECT/env" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"key\":\"DATABASE_URL\",\"value\":\"$DB_URL\",\"type\":\"encrypted\"}" > /dev/null

echo "🔗 DATABASE_URL ajoutée aux variables d’environnement Vercel."

# Lancer le déploiement via API
DEPLOY_RESPONSE=$(curl -s -X POST "https://api.vercel.com/v13/deployments" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$VERCEL_PROJECT\", \"gitSource\": {\"type\": \"github\", \"repoId\": \"$GH_USER/$GH_REPO\"}}")

VERCEL_URL=$(echo $DEPLOY_RESPONSE | grep -o '"url":"[^"]*' | cut -d'"' -f4)

echo "✅ Déploiement lancé sur Vercel !"
echo "🌐 URL (en attente de build) : https://$VERCEL_URL"

echo ""
echo "🎯 Tout est prêt :"
echo "   - Base PostgreSQL Neon : OK"
echo "   - Dépôt GitHub : https://github.com/$GH_USER/$GH_REPO"
echo "   - Déploiement Vercel : https://$VERCEL_URL"
echo ""
echo "🚀 Tu peux suivre le build sur ton dashboard Vercel."