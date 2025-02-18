require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const pokerRoutes = require('./routes/poker');

const app = express();
const port = process.env.PORT || 3001;

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${err.stack}`);
  next(err);
};

// Error response middleware
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
};

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => {
    console.error('Database connection error:', err.stack);
    process.exit(1);
  });

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Input validation middleware
const validateUser = (req, res, next) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Valid name is required' });
  }
  next();
};

const validateBet = (req, res, next) => {
  const { user_id, opponent_id, wager_type, amount, bet_date, outcome } = req.body;
  
  if (!user_id || !opponent_id || !wager_type || !amount || !bet_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (user_id === opponent_id) {
    return res.status(400).json({ error: 'Bettor and opponent cannot be the same person' });
  }

  if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  if (outcome && !['won', 'lost', 'pending'].includes(outcome)) {
    return res.status(400).json({ error: 'Invalid outcome status' });
  }

  next();
};

// Routes

// Get all users
app.get('/api/users', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Create new user
app.post('/api/users', validateUser, async (req, res, next) => {
  const { name } = req.body;
  try {
    const existingUser = await pool.query('SELECT * FROM users WHERE name = $1', [name.trim()]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this name already exists' });
    }

    const result = await pool.query(
      'INSERT INTO users (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Get all bets with user details
app.get('/api/bets', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.*,
        u1.name as user_name,
        u2.name as opponent_name
      FROM bets b
      JOIN users u1 ON b.user_id = u1.id
      JOIN users u2 ON b.opponent_id = u2.id
      ORDER BY b.bet_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Create new bet
app.post('/api/bets', validateBet, async (req, res, next) => {
  const { user_id, opponent_id, wager_type, amount, bet_date, outcome } = req.body;

  try {
    // Verify users exist
    const usersExist = await pool.query(
      'SELECT COUNT(*) FROM users WHERE id IN ($1, $2)',
      [user_id, opponent_id]
    );
    
    if (usersExist.rows[0].count < 2) {
      return res.status(404).json({ error: 'One or both users not found' });
    }

    const result = await pool.query(
      `INSERT INTO bets 
       (user_id, opponent_id, wager_type, amount, bet_date, outcome) 
       VALUES ($1, $2, $3, $4::numeric, $5, $6) 
       RETURNING *`,
      [user_id, opponent_id, wager_type.trim(), amount, bet_date, outcome || 'pending']
    );
    
    // Get the complete bet data with user names
    const betWithNames = await pool.query(`
      SELECT 
        b.*,
        u1.name as user_name,
        u2.name as opponent_name
      FROM bets b
      JOIN users u1 ON b.user_id = u1.id
      JOIN users u2 ON b.opponent_id = u2.id
      WHERE b.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(betWithNames.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Get total amounts owed per user
app.get('/api/users/balances', async (req, res, next) => {
  try {
    const result = await pool.query(`
      WITH bet_outcomes AS (
        -- When user is the bettor
        SELECT 
          user_id,
          CASE 
            WHEN outcome = 'won' THEN amount::numeric
            WHEN outcome = 'lost' THEN -amount::numeric
            ELSE 0
          END as net_amount
        FROM bets
        WHERE outcome != 'pending'
        UNION ALL
        -- When user is the opponent
        SELECT 
          opponent_id as user_id,
          CASE 
            WHEN outcome = 'won' THEN -amount::numeric
            WHEN outcome = 'lost' THEN amount::numeric
            ELSE 0
          END as net_amount
        FROM bets
        WHERE outcome != 'pending'
      )
      SELECT 
        u.id,
        u.name,
        COALESCE(SUM(bo.net_amount)::numeric, 0) as balance
      FROM users u
      LEFT JOIN bet_outcomes bo ON u.id = bo.user_id
      GROUP BY u.id, u.name
      ORDER BY u.name
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Delete a bet
app.delete('/api/bets/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    // First check if bet exists
    const betExists = await pool.query(
      'SELECT * FROM bets WHERE id = $1',
      [id]
    );

    if (betExists.rows.length === 0) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    // Delete the bet
    await pool.query('DELETE FROM bets WHERE id = $1', [id]);
    
    res.status(200).json({ message: 'Bet deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Add poker routes
app.use('/api/poker', pokerRoutes);

// Add this new endpoint
app.get('/api/users/balance-history', async (req, res, next) => {
  try {
    const result = await pool.query(`
      WITH RECURSIVE dates AS (
        SELECT MIN(bet_date) as date FROM bets
        UNION ALL
        SELECT date + 1
        FROM dates
        WHERE date < (SELECT MAX(bet_date) FROM bets)
      ),
      user_daily_changes AS (
        SELECT 
          u.id as user_id,
          u.name as user_name,
          d.date,
          COALESCE(SUM(
            CASE 
              WHEN b.user_id = u.id AND b.outcome = 'won' THEN b.amount
              WHEN b.user_id = u.id AND b.outcome = 'lost' THEN -b.amount
              WHEN b.opponent_id = u.id AND b.outcome = 'won' THEN -b.amount
              WHEN b.opponent_id = u.id AND b.outcome = 'lost' THEN b.amount
              ELSE 0
            END
          ), 0) as daily_change
        FROM users u
        CROSS JOIN dates d
        LEFT JOIN bets b ON b.bet_date = d.date 
          AND (b.user_id = u.id OR b.opponent_id = u.id)
        GROUP BY u.id, u.name, d.date
      )
      SELECT 
        user_id,
        user_name,
        date,
        SUM(daily_change) OVER (
          PARTITION BY user_id 
          ORDER BY date
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) as balance
      FROM user_daily_changes
      ORDER BY date, user_id;
    `);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Add this new endpoint
app.get('/api/settlements/monthly', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const result = await pool.query(`
      WITH monthly_changes AS (
        SELECT 
          u.id as user_id,
          u.name as user_name,
          COALESCE(SUM(
            CASE 
              WHEN b.user_id = u.id AND b.outcome = 'won' THEN b.amount
              WHEN b.user_id = u.id AND b.outcome = 'lost' THEN -b.amount
              WHEN b.opponent_id = u.id AND b.outcome = 'won' THEN -b.amount
              WHEN b.opponent_id = u.id AND b.outcome = 'lost' THEN b.amount
              ELSE 0
            END
          ), 0) as net_amount
        FROM users u
        LEFT JOIN bets b ON (b.user_id = u.id OR b.opponent_id = u.id)
          AND EXTRACT(MONTH FROM b.bet_date) = $1
          AND EXTRACT(YEAR FROM b.bet_date) = $2
          AND b.outcome != 'pending'
        GROUP BY u.id, u.name
      )
      SELECT * FROM monthly_changes
      WHERE net_amount != 0
      ORDER BY net_amount DESC
    `, [month, year]);

    // Calculate optimal settlements
    const users = result.rows;
    const settlements = [];
    
    while (users.length > 1) {
      const maxCreditor = users.find(u => u.net_amount > 0);
      const maxDebtor = users.find(u => u.net_amount < 0);
      
      if (!maxCreditor || !maxDebtor) break;
      
      const amount = Math.min(maxCreditor.net_amount, -maxDebtor.net_amount);
      
      settlements.push({
        from_user_id: maxDebtor.user_id,
        from_name: maxDebtor.user_name,
        to_user_id: maxCreditor.user_id,
        to_name: maxCreditor.user_name,
        amount: parseFloat(amount.toFixed(2))
      });

      maxCreditor.net_amount -= amount;
      maxDebtor.net_amount += amount;

      // Remove users with settled balances
      const activeUsers = users.filter(u => Math.abs(u.net_amount) > 0.01);
      users.length = 0;
      users.push(...activeUsers);
    }

    res.json({
      balances: result.rows,
      settlements: settlements
    });
  } catch (err) {
    next(err);
  }
});

// Error handling middleware (must be last)
app.use(errorLogger);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing HTTP server and database connection...');
  pool.end(() => {
    console.log('Database connection closed.');
    process.exit(0);
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
