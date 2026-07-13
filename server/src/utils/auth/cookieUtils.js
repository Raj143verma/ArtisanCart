import { AuthConstants } from '../../constants/authConstants.js';

const refreshCookieSameSite = process.env.NODE_ENV === 'production' ? 'none' : 'lax';

export function createRefreshCookie(token) {
  return {
    name: AuthConstants.refreshTokenCookieName,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: refreshCookieSameSite,
      path: AuthConstants.cookiePath,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  };
}

export function clearRefreshCookie() {
  return {
    name: AuthConstants.refreshTokenCookieName,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: refreshCookieSameSite,
      path: AuthConstants.cookiePath,
      maxAge: 0,
    },
  };
}
