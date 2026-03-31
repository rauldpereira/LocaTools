# LocaTools

Sistema de gestão de locação de equipamentos completo, com controle de estoque, vistorias, pagamentos e relatórios administrativos.

## 🚀 Tecnologias

Este projeto foi desenvolvido com as seguintes tecnologias:

### Backend
- **Node.js** com **Express**
- **Sequelize ORM** (Suporte a PostgreSQL e MySQL)
- **Stripe** para processamento de pagamentos
- **Socket.io** para notificações em tempo real
- **PDFKit** para geração de documentos
- **Node-cron** para automação de tarefas (lembretes e cancelamentos)
- **JWT** para autenticação segura

### Frontend
- **React** (Vite + TypeScript)
- **Recharts** para painéis e relatórios
- **Stripe React SDK**
- **Socket.io Client**
- **React Signature Canvas** para assinaturas digitais
- **jspdf** para geração de PDFs no cliente

## 📋 Funcionalidades

- **Gestão de Equipamentos:** Cadastro de categorias, equipamentos e unidades individuais (com controle de serial).
- **Sistema de Reservas:** Fluxo completo de ordem de serviço, desde a reserva até a devolução.
- **Vistorias e Avarias:** Registro detalhado de vistorias com fotos e controle de danos/prejuízos.
- **Pagamentos Online:** Integração nativa com Stripe para locações.
- **Configuração de Frete:** Sistema flexível para cálculo e configuração de logística.
- **Painel Administrativo:** Gráficos de desempenho, relatórios financeiros e gestão de usuários.
- **Segurança:** Autenticação RBAC (Controle de acesso baseado em funções) e política de troca obrigatória de senha.
- **Notificações:** Alertas automáticos via sistema e e-mail.

## 🛠️ Como Rodar o Projeto

### Pré-requisitos
- Node.js (v18 ou superior)
- Banco de dados (PostgreSQL ou MySQL)

### Configuração do Backend
1. Entre na pasta `backend`:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure o arquivo `.env` baseado no `config/config.js` (credenciais de DB, Stripe, JWT, etc).
4. Execute as migrations para criar o banco de dados:
   ```bash
   npx sequelize-cli db:migrate
   ```
5. Inicie o servidor:
   ```bash
   npm start
   ```

### Configuração do Frontend
1. Entre na pasta `frontend`:
   ```bash
   cd frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o ambiente de desenvolvimento:
   ```bash
   npm run dev
   ```

## 📄 Licença
Este projeto está sob a licença de uso interno. Veja o arquivo de termos para mais detalhes.
