import React, { useState, useEffect } from 'react';
import {
  Container, Paper, Typography, TextField, Button,
  List, ListItem, ListItemText, Divider
} from '@mui/material';
import { toast } from 'react-toastify';
import axios from 'axios';

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('https://friends-wager-ledger.onrender.com/api/users'); // Changed to use the deployed backend
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      const errorMessage = error.response?.data?.error || 'Failed to load users';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post('https://friends-wager-ledger.onrender.com/api/users', { name: newUserName.trim() });
      toast.success('User added successfully');
      setNewUserName('');
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      const errorMessage = error.response?.data?.error || 'Failed to add user';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
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
        Manage Users
      </Typography>

      {/* Add User Form */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Add New User
        </Typography>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '16px' }}>
          <TextField
            label="Name"
            variant="outlined"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            fullWidth
            disabled={submitting}
            error={!!error}
            helperText={error}
          />
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            sx={{ minWidth: '120px' }}
            disabled={submitting}
          >
            {submitting ? 'Adding...' : 'Add User'}
          </Button>
        </form>
      </Paper>

      {/* Users List */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Current Users
        </Typography>
        <List>
          {users.map((user, index) => (
            <React.Fragment key={user.id}>
              <ListItem>
                <ListItemText 
                  primary={user.name}
                  secondary={`Added: ${new Date(user.created_at).toLocaleDateString()}`}
                />
              </ListItem>
              {index < users.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Container>
  );
}

export default ManageUsers; 