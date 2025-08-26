// frontend/src/App.tsx
import './App.css';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<AuthPage />} />
          {/* Adicione outras rotas aqui conforme a necessidade */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;