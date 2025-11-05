const express = require('express');
const dotenv = require('dotenv');
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


dotenv.config({ path: '.env', quiet: true });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.json());

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

app.get('/', (req, res) => {
  res.send('API do LocaTools está rodando!');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});