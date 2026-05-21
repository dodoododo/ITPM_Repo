/**
 * AUTH & JWT UTILITIES
 * Password hashing, JWT generation, token verification, and onboarding helpers.
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const getJwtSecret = () => process.env.JWT_SECRET || 'your_jwt_secret_key_here';

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const generateJWT = (userId, role, tokenVersion = 0) => {
  return jwt.sign(
    { userId, role, tokenVersion },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
};

const generateRefreshToken = (userId, tokenVersion = 0) => {
  return jwt.sign(
    { userId, tokenVersion },
    getJwtSecret(),
    { expiresIn: '30d' }
  );
};

const generatePasswordChangeToken = (userId) => {
  return jwt.sign(
    { userId, purpose: 'first_login_password_change' },
    getJwtSecret(),
    { expiresIn: '15m' }
  );
};

const verifyJWT = (token) => {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    return null;
  }
};

const generateInvitationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateSecureToken = () => crypto.randomBytes(32).toString('hex');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const calculateInvitationExpiry = (days = 7) => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  return expiryDate;
};

const pickRandom = (characters) => characters[crypto.randomInt(characters.length)];

const shuffle = (value) => {
  const characters = value.split('');
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }
  return characters.join('');
};

const generateTemporaryPassword = () => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';

  let password = '';
  for (let i = 0; i < 3; i++) password += pickRandom(uppercase);
  for (let i = 0; i < 3; i++) password += pickRandom(lowercase);
  for (let i = 0; i < 3; i++) password += pickRandom(numbers);
  for (let i = 0; i < 2; i++) password += pickRandom(special);

  return shuffle(password);
};

const validatePasswordStrength = (password) => {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password || '')) {
    errors.push('Password must contain at least 1 uppercase letter');
  }

  if (!/[0-9]/.test(password || '')) {
    errors.push('Password must contain at least 1 number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const markPasswordChanged = async (User, userId) => {
  await User.findByIdAndUpdate(
    userId,
    { hasChangedPassword: true },
    { new: true }
  );
};

module.exports = {
  hashPassword,
  comparePassword,
  generateJWT,
  generateRefreshToken,
  generatePasswordChangeToken,
  verifyJWT,
  generateInvitationToken,
  generateSecureToken,
  hashToken,
  calculateInvitationExpiry,
  generateTemporaryPassword,
  validatePasswordStrength,
  markPasswordChanged,
};
