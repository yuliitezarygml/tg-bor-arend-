const { verifyToken } = require('../config/auth');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен не найден' });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Неверный токен' });
  }

  req.user = {
    id: decoded.userId,
    userId: decoded.userId,
  };
  req.userId = decoded.userId;
  next();
};

module.exports = authMiddleware;
