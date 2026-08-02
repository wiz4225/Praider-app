const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.send('PRAIDER Backend API is running');
});

// A. REGISTER USER
router.post('/auth/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    
    // TODO: Add your registration / database logic here
    
    res.status(200).json({ message: 'User registered successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// B. LOGIN USER
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // TODO: Add your login logic here
    
    res.status(200).json({ message: 'Login successful!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;