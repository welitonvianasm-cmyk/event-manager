# Como iniciar o EventManager

## Primeira vez (setup inicial)

### 1. Reinicie o computador
O Docker Desktop requer reinicialização após a instalação.

### 2. Abra o Docker Desktop
Procure "Docker Desktop" no menu Iniciar e abra. Aguarde o ícone da baleia aparecer na barra de tarefas.

### 3. Abra um terminal (PowerShell) na pasta do projeto

```powershell
cd C:\Users\welit\event-manager
```

### 4. Suba o banco de dados PostgreSQL

```powershell
docker-compose up -d
```

### 5. Instale as dependências e rode as migrações do banco

```powershell
cd backend
npm install
npx prisma migrate dev --name init
cd ..
```

### 6. Inicie os servidores

**Terminal 1 — Backend:**
```powershell
cd C:\Users\welit\event-manager\backend
npm run dev
```

**Terminal 2 — Frontend:**
```powershell
cd C:\Users\welit\event-manager\frontend
npm run dev
```

### 7. Acesse no navegador

```
http://localhost:5173
```

---

## Nas próximas vezes

1. Abra o Docker Desktop (se não estiver rodando)
2. Suba o banco: `docker-compose up -d` (na pasta event-manager)
3. Inicie backend e frontend nos dois terminais

---

## Dados de acesso ao banco (desenvolvimento)

- Host: localhost:5432
- Banco: eventmanager
- Usuário: eventuser
- Senha: eventpass
