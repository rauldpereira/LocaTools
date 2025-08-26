import React from 'react';
import Navbar from '../components/Navbar';


const Home: React.FC = () => {
  return (
    <div>
      <Navbar />
      <div style={{ padding: '2rem' }}>
        <h1>Bem-vindo ao LocaTools</h1>
        <p>Sua plataforma de aluguel de equipamentos.</p>
      </div>
    </div>
  );
};

export default Home;