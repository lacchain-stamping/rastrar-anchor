# 1. Agregar todos los archivos
git add .

# 2. Ver qué se agregó
git status

# 3. Verificar que NO se agregó .env (solo .env.example)
git status | grep "new file.*\.env"

# 4. Hacer el commit
git commit -m "Initial commit - Rastrar Anchor Sistema de Anclaje Blockchain"

# 5. Conectar con GitHub
git remote add origin https://github.com/lacchain-stamping/rastrar-anchor.git

# 6. Cambiar rama a main
git branch -M main

# 7. Subir a GitHub
git push -u origin main
