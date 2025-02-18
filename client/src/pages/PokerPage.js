import React, { useState, useEffect } from 'react';
import { 
  Container, Paper, Typography, Button, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { toast } from 'react-toastify';
import axios from 'axios';
import { format } from 'date-fns';

function PokerPage() {
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, usersRes] = await Promise.all([
        axios.get('https://friends-wager-ledger.onrender.com/api/poker/sessions'),
        axios.get('https://friends-wager-ledger.onrender.com/api/users')
      ]);
      setSessions(sessionsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load poker sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      if (!newSessionName.trim()) {
        toast.error('Please enter a session name');
        return;
      }

      await axios.post('https://friends-wager-ledger.onrender.com/api/poker/sessions', { session_name: newSessionName.trim() });
      toast.success('Session created successfully');
      setCreateDialogOpen(false);
      setNewSessionName('');
      fetchData();
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    }
  };

  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <Typography>Loading poker sessions...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Typography variant="h4" component="h1">
          Poker Sessions
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => setCreateDialogOpen(true)}
        >
          New Session
        </Button>
      </div>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Session Name</TableCell>
              <TableCell align="right">Players</TableCell>
              <TableCell align="right">Total Buy-ins</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>{format(new Date(session.session_date), 'MMM d, yyyy')}</TableCell>
                <TableCell>{session.session_name}</TableCell>
                <TableCell align="right">{session.player_count}</TableCell>
                <TableCell align="right">${formatAmount(session.total_buyins)}</TableCell>
                <TableCell align="center">
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => window.location.href = `/poker/session/${session.id}`}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Session Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create New Poker Session</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Session Name"
            fullWidth
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateSession} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default PokerPage; 