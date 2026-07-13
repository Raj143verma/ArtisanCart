import jwt from 'jsonwebtoken';
import { AuthConstants } from '../../constants/authConstants.js';
import { appConfig } from '../../config/index.js';

const JWT_ALGORITHM = 'HS256';

export function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: AuthConstants.accessTokenExpiry,
    issuer: appConfig.env,
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: AuthConstants.refreshTokenExpiry,
    issuer: appConfig.env,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    algorithms: [JWT_ALGORITHM],
    issuer: appConfig.env,
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    algorithms: [JWT_ALGORITHM],
    issuer: appConfig.env,
  });
}
