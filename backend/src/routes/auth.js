const express = require('express');
const Admin = require('../models/Admin');
const RefreshToken = require('../models/RefreshToken');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../config/auth');
const authMiddleware = require('../middleware/auth');
const { validateLogin } = require('../middleware/validators');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Логин админа
router.post('/login', loginLimiter, validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username, isActive: true });

    if (!admin) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    // Обновляем время последнего входа
    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin._id);
    const refreshTokenValue = generateRefreshToken();

    // Сохраняем refresh token
    const refreshToken = new RefreshToken({
      adminId: admin._id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    await refreshToken.save();

    res.json({
      token,
      refreshToken: refreshTokenValue,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    console.error('Ошибка при логине:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить токен
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token не найден' });
    }

    const storedRefreshToken = await verifyRefreshToken(refreshToken);

    if (!storedRefreshToken) {
      return res.status(401).json({ error: 'Неверный refresh token' });
    }

    const admin = await Admin.findById(storedRefreshToken.adminId);

    if (!admin) {
      return res.status(404).json({ error: 'Админ не найден' });
    }

    const newToken = generateToken(admin._id);

    res.json({
      token: newToken,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    console.error('Ошибка при обновлении токена:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Логаут (отозвать refresh token)
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await RefreshToken.updateOne(
        { token: refreshToken },
        { isRevoked: true }
      );
    }

    res.json({ message: 'Логаут выполнен' });
  } catch (error) {
    console.error('Ошибка при логауте:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Проверка токена
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);

    if (!admin) {
      return res.status(404).json({ error: 'Админ не найден' });
    }

    res.json({
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
    });
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
