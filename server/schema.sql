CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    opponent_id INTEGER REFERENCES users(id),
    wager_type VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    bet_date DATE NOT NULL,
    outcome VARCHAR(50) CHECK (outcome IN ('won', 'lost', 'pending')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add some indexes for better query performance
CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_opponent_id ON bets(opponent_id);
CREATE INDEX idx_bets_bet_date ON bets(bet_date);

-- Poker Sessions table
CREATE TABLE poker_sessions (
    id SERIAL PRIMARY KEY,
    session_name VARCHAR(100),
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Poker Players table
CREATE TABLE poker_players (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES poker_sessions(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id),
    buy_in_amount DECIMAL(10, 2) NOT NULL,
    final_chips DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, user_id)
);
