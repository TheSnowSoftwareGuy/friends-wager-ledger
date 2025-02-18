import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ManageUsers from './pages/ManageUsers';
import AddBet from './pages/AddBet';
import PokerPage from './pages/PokerPage';
import PokerSessionPage from './pages/PokerSessionPage';
import { theme } from './theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Router>
          <div className="App">
            <Navbar />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<ManageUsers />} />
              <Route path="/add-bet" element={<AddBet />} />
              <Route path="/poker" element={<PokerPage />} />
              <Route path="/poker/session/:sessionId" element={<PokerSessionPage />} />
            </Routes>
            <ToastContainer position="bottom-right" />
          </div>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
