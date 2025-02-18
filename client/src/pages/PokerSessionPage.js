import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container, Paper, Typography, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Box
} from '@mui/material';
import { toast } from 'react-toastify';
import axios from 'axios';

function PokerSessionPage() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addPlayerDialogOpen, setAddPlayerDialogOpen] = useState(false);
  const [settlements, setSettlements] = useState([]);
  const [finalChips, setFinalChips] = useState({});
  const [showNetValues, setShowNetValues] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    user_id: '',
    buy_in_amount: ''
  });
  const [savingToDashboard, setSavingToDashboard] = useState(false);
  const [settlementsProcessed, setSettlementsProcessed] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionRes, usersRes] = await Promise.all([
        axios.get(`/api/poker/sessions/${sessionId}`),
        axios.get('/api/users')
      ]);
      setSession(sessionRes.data);
      // Initialize finalChips state with existing values
      const chipsState = {};
      sessionRes.data.players.forEach(player => {
        chipsState[player.id] = player.final_chips || '';
      });
      setFinalChips(chipsState);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching session data:', error);
      toast.error('Failed to load session details');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddPlayer = async () => {
    try {
      if (!newPlayer.user_id || !newPlayer.buy_in_amount) {
        toast.error('Please fill in all fields');
        return;
      }

      await axios.post(`/api/poker/sessions/${sessionId}/players`, newPlayer);
      toast.success('Player added successfully');
      setAddPlayerDialogOpen(false);
      setNewPlayer({ user_id: '', buy_in_amount: '' });
      fetchData();
    } catch (error) {
      console.error('Error adding player:', error);
      toast.error('Failed to add player');
    }
  };

  const handleChipValueChange = (playerId, value) => {
    setFinalChips(prev => ({
      ...prev,
      [playerId]: value
    }));
  };

  const saveAllChipValues = async () => {
    try {
      // Save all chip values
      await Promise.all(
        Object.entries(finalChips).map(([playerId, chips]) =>
          axios.put(`/api/poker/sessions/${sessionId}/players/${playerId}`, {
            final_chips: chips
          })
        )
      );

      // Calculate settlements
      const response = await axios.get(`/api/poker/sessions/${sessionId}/recommendations`);
      setSettlements(response.data);
      setShowNetValues(true);
      setSettlementsProcessed(true);
      toast.success('Settlements calculated successfully');
    } catch (error) {
      console.error('Error calculating settlements:', error);
      toast.error('Failed to calculate settlements');
    }
  };

  const saveToDashboard = async () => {
    try {
      setSavingToDashboard(true);
      
      // Create bets for each settlement
      await Promise.all(settlements.map(settlement => 
        axios.post('/api/bets', {
          user_id: settlement.from_user_id,
          opponent_id: settlement.to_user_id,
          wager_type: `Poker Session: ${session.session_name}`,
          amount: settlement.amount,
          bet_date: session.session_date,
          outcome: 'lost' // Since this is a settlement, the person paying has lost
        })
      ));

      toast.success('Poker settlements added to dashboard');
      // Redirect to dashboard
      window.location.href = '/';
    } catch (error) {
      console.error('Error saving to dashboard:', error);
      toast.error('Failed to save settlements to dashboard');
    } finally {
      setSavingToDashboard(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <Typography>Loading session details...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {session?.session_name}
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Typography variant="h6">Players</Typography>
          <Button 
            variant="contained" 
            onClick={() => setAddPlayerDialogOpen(true)}
          >
            Add Player
          </Button>
        </div>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                <TableCell align="right">Buy-in</TableCell>
                <TableCell align="right">Final Chips</TableCell>
                <TableCell align="right">Net</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {session?.players.map((player) => (
                <TableRow key={player.id}>
                  <TableCell>{player.user_name}</TableCell>
                  <TableCell align="right">${player.buy_in_amount}</TableCell>
                  <TableCell align="right">
                    <TextField
                      type="number"
                      size="small"
                      value={finalChips[player.id]}
                      onChange={(e) => handleChipValueChange(player.id, e.target.value)}
                      placeholder="Enter chips"
                    />
                  </TableCell>
                  <TableCell align="right" sx={{
                    color: showNetValues && finalChips[player.id]
                      ? (finalChips[player.id] - player.buy_in_amount > 0 
                          ? 'success.main' 
                          : finalChips[player.id] - player.buy_in_amount < 0 
                            ? 'error.main' 
                            : 'text.primary')
                      : 'text.primary'
                  }}>
                    {showNetValues && finalChips[player.id]
                      ? `$${(finalChips[player.id] - player.buy_in_amount).toFixed(2)}`
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={saveAllChipValues}
            disabled={!session?.players.every(p => finalChips[p.id])}
          >
            Calculate Settlements
          </Button>
        </Box>
      </Paper>

      {settlements.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Settlement Recommendations
          </Typography>
          {settlements.map((settlement, index) => (
            <Typography key={index}>
              {settlement.from_name} pays {settlement.to_name} ${settlement.amount}
            </Typography>
          ))}
          {settlementsProcessed && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={saveToDashboard}
                disabled={savingToDashboard}
              >
                {savingToDashboard ? 'Saving...' : 'Save to Dashboard'}
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* Add Player Dialog */}
      <Dialog open={addPlayerDialogOpen} onClose={() => setAddPlayerDialogOpen(false)}>
        <DialogTitle>Add Player to Session</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Player</InputLabel>
            <Select
              value={newPlayer.user_id}
              onChange={(e) => setNewPlayer(prev => ({ ...prev, user_id: e.target.value }))}
              label="Player"
            >
              {users.map(user => (
                <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Buy-in Amount"
            type="number"
            fullWidth
            value={newPlayer.buy_in_amount}
            onChange={(e) => setNewPlayer(prev => ({ ...prev, buy_in_amount: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddPlayerDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddPlayer} variant="contained" color="primary">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default PokerSessionPage; 