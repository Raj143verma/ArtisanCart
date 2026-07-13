import { verifyAccessToken } from '../../utils/auth/tokenUtils.js';
import { findUserById } from '../../services/auth/authService.js';

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    const user = await findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid token' });
    }

    if (!user.isActive) {
      return res.status(403).json({ status: 'error', message: 'Account is disabled' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ status: 'error', message: 'Email address is not verified' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ status: 'error', message: 'Authentication failed' });
  }
}
