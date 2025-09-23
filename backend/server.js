const express = require('express');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes'); 
const reservationRoutes = require('./routes/reservationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const categoriesRoutes = require('./routes/categoriesRoutes');
const unitRoutes = require('./routes/unitRoutes');
const cors = require('cors');


dotenv.config({ path: '.env', quiet: true });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.json());

app.use('/api', userRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/reservations', reservationRoutes); 
app.use('/api/payments', paymentRoutes)
app.use('/api/categories', categoriesRoutes);
app.use('/api/units', unitRoutes);

app.get('/', (req, res) => {
  res.send('API do LocaTools está rodando!');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});