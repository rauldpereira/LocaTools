const express = require('express');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

const userRoutes = require('./routes/userRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes'); 
const reservationRoutes = require('./routes/reservationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const categoriesRoutes = require('./routes/categoriesRoutes');
const unitRoutes = require('./routes/unitRoutes');
const cors = require('cors');
const vistoriaRoutes = require('./routes/vistoriaRoutes');
const horariosRoutes = require('./routes/horariosRoutes');
const tipoAvariaRoutes = require('./routes/tipoAvariaRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const calendarioRoutes = require('./routes/calendarioRoutes');
const prejuizoRoutes = require('./routes/prejuizoRoutes');
const freteRoutes = require('./routes/freteRoutes');
const configRoutes = require('./routes/configRoutes');
const iniciarCronJobs = require('./services/canceladorPedidos');
const notificacaoRoutes = require('./routes/notificacaoRoutes');
const { iniciarRoboDeLembretes } = require('./services/lembretesCron');

dotenv.config({ path: '.env', quiet: true });

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

//  Cria o servidor de WebSockets por cima do HTTP
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Mapeamento de quem está online
global.io = io; 
global.usuariosOnline = new Map(); 

io.on('connection', (socket) => {
  // Quando o React conectar, ele vai mandar o ID do usuário logado
  const userId = socket.handshake.query.userId;
  
  if (userId) {
    global.usuariosOnline.set(String(userId), socket.id);
    console.log(`Usuário ${userId} conectou no rádio (Socket: ${socket.id})`);
  }

  socket.on('disconnect', () => {
    global.usuariosOnline.delete(String(userId));
    console.log(`Usuário ${userId} desconectou.`);
  });
});

app.use(cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

iniciarCronJobs();

app.use('/uploads', express.static('public/uploads'));

app.use('/api', userRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/reservations', reservationRoutes); 
app.use('/api/payments', paymentRoutes)
app.use('/api/categories', categoriesRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/vistorias', vistoriaRoutes);
app.use('/api/horarios', horariosRoutes);
app.use('/api/tipos-avaria', tipoAvariaRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api', calendarioRoutes);
app.use('/api/prejuizos', prejuizoRoutes);
app.use('/api/frete', freteRoutes);
app.use('/api/config', configRoutes);
app.use('/api/notificacoes', notificacaoRoutes);

app.get('/', (req, res) => {
  res.send('API do LocaTools está rodando!');
});

iniciarRoboDeLembretes();
console.log('⏱️ Serviço de CRON (Lembretes Automáticos) ativado.');

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT} com WebSocket ativado!`);
});