const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper function to calculate settlement recommendations
const calculateSettlements = (players) => {
  // Calculate net amounts (positive = owed money, negative = owes money)
  const netAmounts = players.map(player => ({
    ...player,
    net: parseFloat(player.final_chips || 0) - parseFloat(player.buy_in_amount)
  }));

  // Separate into those who owe and those who are owed
  const debtors = netAmounts.filter(p => p.net < 0).sort((a, b) => a.net - b.net);
  const creditors = netAmounts.filter(p => p.net > 0).sort((a, b) => b.net - a.net);

  const settlements = [];

  // Match debtors with creditors
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];
    
    const amount = Math.min(Math.abs(debtor.net), creditor.net);
    
    settlements.push({
      from_user_id: debtor.user_id,
      from_name: debtor.user_name,
      to_user_id: creditor.user_id,
      to_name: creditor.user_name,
      amount: parseFloat(amount.toFixed(2))
    });

    debtor.net += amount;
    creditor.net -= amount;

    if (Math.abs(debtor.net) < 0.01) debtors.shift();
    if (Math.abs(creditor.net) < 0.01) creditors.shift();
  }

  return settlements;
};

// Create a new poker session
router.post('/sessions', async (req, res) => {
  const { session_name } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO poker_sessions (session_name) VALUES ($1) RETURNING *',
      [session_name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating poker session:', error);
    res.status(500).json({ error: 'Failed to create poker session' });
  }
});

// Get all poker sessions
router.get('/sessions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ps.*,
        COUNT(pp.id) as player_count,
        COALESCE(SUM(pp.buy_in_amount), 0) as total_buyins
      FROM poker_sessions ps
      LEFT JOIN poker_players pp ON ps.id = pp.session_id
      GROUP BY ps.id
      ORDER BY ps.session_date DESC, ps.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching poker sessions:', error);
    res.status(500).json({ error: 'Failed to fetch poker sessions' });
  }
});

// Add player to session
router.post('/sessions/:sessionId/players', async (req, res) => {
  const { sessionId } = req.params;
  const { user_id, buy_in_amount } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO poker_players (session_id, user_id, buy_in_amount)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [sessionId, user_id, buy_in_amount]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding player to session:', error);
    res.status(500).json({ error: 'Failed to add player to session' });
  }
});

// Update player's final chips
router.put('/sessions/:sessionId/players/:playerId', async (req, res) => {
  const { sessionId, playerId } = req.params;
  const { final_chips } = req.body;

  try {
    const result = await pool.query(
      `UPDATE poker_players 
       SET final_chips = $1
       WHERE session_id = $2 AND id = $3
       RETURNING *`,
      [final_chips, sessionId, playerId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found in session' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating player chips:', error);
    res.status(500).json({ error: 'Failed to update player chips' });
  }
});

// Get session details with players
router.get('/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await pool.query(
      'SELECT * FROM poker_sessions WHERE id = $1',
      [sessionId]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const players = await pool.query(`
      SELECT 
        pp.*,
        u.name as user_name
      FROM poker_players pp
      JOIN users u ON pp.user_id = u.id
      WHERE pp.session_id = $1
      ORDER BY pp.created_at
    `, [sessionId]);

    res.json({
      ...session.rows[0],
      players: players.rows
    });
  } catch (error) {
    console.error('Error fetching session details:', error);
    res.status(500).json({ error: 'Failed to fetch session details' });
  }
});

// Get settlement recommendations
router.get('/sessions/:sessionId/recommendations', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const players = await pool.query(`
      SELECT 
        pp.*,
        u.name as user_name
      FROM poker_players pp
      JOIN users u ON pp.user_id = u.id
      WHERE pp.session_id = $1 AND pp.final_chips IS NOT NULL
    `, [sessionId]);

    if (players.rows.length === 0) {
      return res.status(400).json({ error: 'No players with final chips found' });
    }

    const settlements = calculateSettlements(players.rows);
    res.json(settlements);
  } catch (error) {
    console.error('Error calculating settlements:', error);
    res.status(500).json({ error: 'Failed to calculate settlements' });
  }
});

module.exports = router; 