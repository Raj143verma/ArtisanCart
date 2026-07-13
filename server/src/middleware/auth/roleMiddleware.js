import { RoleHierarchy } from '../../constants/roles.js';

export function roleMiddleware(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    const requiredIndex = RoleHierarchy.indexOf(requiredRole);
    const userIndex = RoleHierarchy.indexOf(req.user.role);
    if (requiredIndex === -1 || userIndex === -1 || userIndex < requiredIndex) {
      return res.status(403).json({ status: 'error', message: 'Insufficient role permissions' });
    }

    next();
  };
}
