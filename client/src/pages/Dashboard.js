import React, { useState, useEffect } from 'react';
import { 
  Container, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Typography, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { dashboardStyles as styles } from './styles.js';

function Dashboard() {
  const [bets, setBets] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingBet, setDeletingBet] = useState(null);
  const [stats, setStats] = useState({
    totalBets: 0,
    totalAmount: 0,
    pokerSessions: 0,
    betTypes: []
  });
  const [monthlySettlement, setMonthlySettlement] = useState(null);
  const [settlementDate, setSettlementDate] = useState(new Date());
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [betsResponse, balancesResponse] = await Promise.all([
          axios.get('/api/bets'),
          axios.get('/api/users/balances')
        ]);
        setBets(betsResponse.data);
        setBalances(balancesResponse.data);

        // Calculate statistics
        const betsData = betsResponse.data;
        const betTypeMap = new Map();
        let totalAmount = 0;
        let pokerSessionCount = 0;

        betsData.forEach(bet => {
          totalAmount += parseFloat(bet.amount);
          if (bet.wager_type.startsWith('Poker Session:')) {
            pokerSessionCount++;
          }
          betTypeMap.set(bet.wager_type, (betTypeMap.get(bet.wager_type) || 0) + 1);
        });

        const betTypes = Array.from(betTypeMap).map(([type, count]) => ({
          name: type,
          count
        }));

        setStats({
          totalBets: betsData.length,
          totalAmount,
          pokerSessions: pokerSessionCount,
          betTypes
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        const errorMessage = error.response?.data?.error || 'Failed to load dashboard data';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatBalance = (balance) => {
    const numBalance = parseFloat(balance);
    return isNaN(numBalance) ? '0.00' : numBalance.toFixed(2);
  };

  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const handleDeleteClick = (bet) => {
    setDeletingBet(bet);
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`/api/bets/${deletingBet.id}`);
      toast.success('Bet deleted successfully');
      
      // Refresh the data
      const [betsResponse, balancesResponse] = await Promise.all([
        axios.get('/api/bets'),
        axios.get('/api/users/balances')
      ]);
      setBets(betsResponse.data);
      setBalances(balancesResponse.data);
    } catch (error) {
      console.error('Error deleting bet:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete bet';
      toast.error(errorMessage);
    } finally {
      setDeletingBet(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingBet(null);
  };

  const handleCalculateMonthlySettlement = async () => {
    try {
      const month = settlementDate.getMonth() + 1;
      const year = settlementDate.getFullYear();
      
      const response = await axios.get(`/api/settlements/monthly?month=${month}&year=${year}`);
      setMonthlySettlement(response.data);
      setSettlementDialogOpen(true);
    } catch (error) {
      console.error('Error calculating monthly settlement:', error);
      toast.error('Failed to calculate monthly settlement');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <Typography>Loading dashboard data...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          component={RouterLink} 
          to="/add-bet"
        >
          Add New Bet
        </Button>
      </div>

      {/* Stats Overview */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
        <Paper sx={styles.statsCard}>
          <Typography sx={styles.statsLabel}>Total Bets</Typography>
          <Typography sx={styles.statsValue}>{stats.totalBets}</Typography>
        </Paper>
        <Paper sx={styles.statsCard}>
          <Typography sx={styles.statsLabel}>Total Amount</Typography>
          <Typography sx={styles.statsValue}>${formatAmount(stats.totalAmount)}</Typography>
        </Paper>
        <Paper sx={styles.statsCard}>
          <Typography sx={styles.statsLabel}>Poker Sessions</Typography>
          <Typography sx={styles.statsValue}>{stats.pokerSessions}</Typography>
        </Paper>
      </Box>

      {/* Monthly Settlement Button */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, alignItems: 'center' }}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            views={['year', 'month']}
            label="Settlement Month"
            minDate={new Date(2024, 0)}
            maxDate={new Date()}
            value={settlementDate}
            onChange={(newValue) => setSettlementDate(newValue)}
            slotProps={{ textField: { size: 'small' } }}
          />
        </LocalizationProvider>
        <Button 
          variant="contained" 
          onClick={handleCalculateMonthlySettlement}
        >
          Calculate Monthly Settlement
        </Button>
      </Box>

      {/* Balances Section */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Current Balances
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell align="right">Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {balances.map((balance) => (
                <TableRow key={balance.id}>
                  <TableCell>{balance.name}</TableCell>
                  <TableCell align="right" 
                    sx={{ 
                      color: parseFloat(balance.balance) > 0 ? 'success.main' : 
                             parseFloat(balance.balance) < 0 ? 'error.main' : 'text.primary'
                    }}
                  >
                    ${formatBalance(balance.balance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Bets Section */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Recent Bets
        </Typography>
        <TableContainer sx={styles.tableContainer}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Bettor</TableCell>
                <TableCell>Opponent</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bets.map((bet) => (
                <TableRow key={bet.id}>
                  <TableCell>{format(new Date(bet.bet_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{bet.user_name}</TableCell>
                  <TableCell>{bet.opponent_name}</TableCell>
                  <TableCell>{bet.wager_type}</TableCell>
                  <TableCell align="right">${formatAmount(bet.amount)}</TableCell>
                  <TableCell sx={{ 
                    color: bet.outcome === 'won' ? 'success.main' : 
                           bet.outcome === 'lost' ? 'error.main' : 'warning.main'
                  }}>
                    {bet.outcome.charAt(0).toUpperCase() + bet.outcome.slice(1)}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton 
                      onClick={() => handleDeleteClick(bet)}
                      color="error"
                      size="small"
                      title="Delete bet"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Monthly Settlement Dialog */}
      <Dialog
        open={settlementDialogOpen}
        onClose={() => setSettlementDialogOpen(false)}
        maxWidth="md"
        fullWidth
        sx={styles.settlementDialog}
      >
        <DialogTitle>
          Monthly Settlement - {format(settlementDate, 'MMMM yyyy')}
        </DialogTitle>
        <DialogContent>
          {monthlySettlement && (
            <>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Monthly Balances
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell align="right">Net Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {monthlySettlement.balances.map((balance) => (
                      <TableRow key={balance.user_id}>
                        <TableCell>{balance.user_name}</TableCell>
                        <TableCell 
                          align="right"
                          sx={{ 
                            color: balance.net_amount > 0 ? 'success.main' : 
                                   balance.net_amount < 0 ? 'error.main' : 'text.primary'
                          }}
                        >
                          ${formatAmount(balance.net_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography variant="h6" gutterBottom>
                Recommended Settlements
              </Typography>
              {monthlySettlement.settlements.length > 0 ? (
                monthlySettlement.settlements.map((settlement, index) => (
                  <Typography key={index} sx={{ mb: 1 }}>
                    {settlement.from_name} pays {settlement.to_name} ${formatAmount(settlement.amount)}
                  </Typography>
                ))
              ) : (
                <Typography>No settlements needed for this month.</Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettlementDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingBet}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Bet</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this bet?
            {deletingBet && (
              <div style={{ marginTop: '1rem' }}>
                <strong>Details:</strong><br />
                Date: {deletingBet.bet_date && format(new Date(deletingBet.bet_date), 'MMM d, yyyy')}<br />
                Bettor: {deletingBet.user_name}<br />
                Opponent: {deletingBet.opponent_name}<br />
                Amount: ${formatAmount(deletingBet.amount)}<br />
                Status: {deletingBet.outcome}
              </div>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Dashboard; 