const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// ------------------------------------------------------------------
// 1. Database Connection
// ------------------------------------------------------------------
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/praider';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Database'))
  .catch(err => console.error('❌ Database Connection Error:', err));

// ------------------------------------------------------------------
// 2. Database Models
// ------------------------------------------------------------------

// User Schema
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0.00 },
  activeInvestment: { type: Number, default: 0.00 },
  totalProfit: { type: Number, default: 0.00 },
  is2FAEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Transaction Schema (Deposits & Withdrawals)
const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit', 'withdrawal'], required: true },
  amount: { type: Number, required: true },
  asset: { type: String, default: 'USDT (BEP20)' },
  walletAddress: { type: String },
  txHash: { type: String },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// ------------------------------------------------------------------
// 3. API Routes
// ------------------------------------------------------------------

// Health Check Endpoint
app.get('/', (req, res) => {
  res.send('PRAIDER Backend API is active and running!');
});

// A. REGISTER USER
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// B. LOGIN USER
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'praider_super_secret_key_12345',
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        balance: user.balance,
        activeInvestment: user.activeInvestment,
        totalProfit: user.totalProfit
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// C. SUBMIT DEPOSIT CONFIRMATION
app.post('/api/deposit/submit', async (req, res) => {
  try {
    const { userId, amount, txHash } = req.body;

    const depositTx = new Transaction({
      userId,
      type: 'deposit',
      amount,
      asset: 'USDT (BEP20)',
      txHash,
      walletAddress: '0xdf79EEB4508377404D48b5e476bBaFbD9c048Cd3',
      status: 'pending'
    });

    await depositTx.save();
    res.status(201).json({ message: 'Deposit request submitted for confirmation.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// D. SUBMIT WITHDRAWAL REQUEST
app.post('/api/withdraw/request', async (req, res) => {
  try {
    const { userId, amount, destinationAddress, asset } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance.' });
    }

    const withdrawalTx = new Transaction({
      userId,
      type: 'withdrawal',
      amount,
      asset: asset || 'USDT (BEP20)',
      walletAddress: destinationAddress,
      status: 'pending'
    });

    await withdrawalTx.save();
    res.status(201).json({ message: 'Withdrawal request submitted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ------------------------------------------------------------------
// 4. Start Server
// ------------------------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 PRAIDER Backend running on port ${PORT}`);
});