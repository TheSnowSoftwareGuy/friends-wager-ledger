import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Paper, Typography, TextField, Button,
  MenuItem, FormControl, InputLabel, Select
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { toast } from 'react-toastify';
import axios from 'axios';

function AddBet() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    opponent_id: '',
    wager_type: '',
    amount: '',
    bet_date: new Date(),
    outcome: 'pending'
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/users');
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
        const errorMessage = error.response?.data?.error || 'Failed to load users';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const validateForm = () => {
    if (!formData.user_id || !formData.opponent_id) {
      toast.error('Please select both bettor and opponent');
      return false;
    }
    if (formData.user_id === formData.opponent_id) {
      toast.error("Bettor and opponent can't be the same person");
      return false;
    }
    if (!formData.wager_type.trim()) {
      toast.error('Please enter a wager type');
      return false;
    }
    if (!formData.amount || formData.amount <= 0) {
      toast.error('Please enter a valid amount');
      return false;
    }
    if (!formData.bet_date) {
      toast.error('Please select a date');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      await axios.post('/api/bets', {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      toast.success('Bet added successfully');
      navigate('/');
    } catch (error) {
      console.error('Error adding bet:', error);
      const errorMessage = error.response?.data?.error || 'Failed to add bet';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <Typography>Loading users...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Add New Bet
      </Typography>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Bettor</InputLabel>
            <Select
              name="user_id"
              value={formData.user_id}
              onChange={handleChange}
              label="Bettor"
              required
            >
              {users.map(user => (
                <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Opponent</InputLabel>
            <Select
              name="opponent_id"
              value={formData.opponent_id}
              onChange={handleChange}
              label="Opponent"
              required
            >
              {users.map(user => (
                <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Wager Type"
            name="wager_type"
            value={formData.wager_type}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Amount"
            name="amount"
            type="number"
            value={formData.amount}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Bet Date"
              value={formData.bet_date}
              onChange={(newValue) => {
                setFormData(prev => ({ ...prev, bet_date: newValue }));
              }}
              renderInput={(params) => <TextField {...params} fullWidth sx={{ mb: 2 }} />}
            />
          </LocalizationProvider>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Outcome</InputLabel>
            <Select
              name="outcome"
              value={formData.outcome}
              onChange={handleChange}
              label="Outcome"
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="won">Won</MenuItem>
              <MenuItem value="lost">Lost</MenuItem>
            </Select>
          </FormControl>

          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            fullWidth
            size="large"
            disabled={submitting}
          >
            {submitting ? 'Adding Bet...' : 'Add Bet'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}

export default AddBet; 