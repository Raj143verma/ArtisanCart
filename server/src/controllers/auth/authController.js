import { createAccessToken, createRefreshToken, comparePassword, generateEmailVerificationToken, generatePasswordResetToken, hashPassword, createUser, findUserByEmail, findUserById, findUserByIdWithPassword, findUserByPasswordResetToken, invalidateRefreshToken, invalidateAllRefreshTokens, saveRefreshToken, setPasswordResetToken, resetUserPassword, updateUserPassword, hashToken } from '../../services/auth/authService.js';
import { createRefreshCookie, clearRefreshCookie } from '../../utils/auth/cookieUtils.js';
import { verifyRefreshToken } from '../../utils/auth/tokenUtils.js';
import { createSuccessResponse, createErrorResponse } from '../../helpers/responseHelper.js';

export async function register(req, res) {
  const { email, password, firstName, lastName } = req.body;

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return res.status(409).json(createErrorResponse('Email is already registered'));
  }

  const hashedPassword = await hashPassword(password);
  const verificationToken = await generateEmailVerificationToken();

  const user = await createUser({
    email,
    password: hashedPassword,
    firstName,
    lastName,
    emailVerificationToken: verificationToken,
  });

  return res.status(201).json(createSuccessResponse({ user }, 'Registration successful'));
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);

  if (!user || !(await comparePassword(password, user.password))) {
    return res.status(401).json(createErrorResponse('Invalid credentials'));
  }

  if (!user.isEmailVerified) {
    return res.status(403).json(createErrorResponse('Email address is not verified'));
  }

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  const refreshCookie = createRefreshCookie(refreshToken);
  await saveRefreshToken(user, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  res.cookie(refreshCookie.name, refreshCookie.value, refreshCookie.options);
  return res.json(createSuccessResponse({ accessToken, user }, 'Login successful'));
}

export async function logout(req, res) {
  const refreshToken = req.cookies?.artisan_refresh_token;
  if (refreshToken) {
    if (req.user) {
      await invalidateRefreshToken(req.user, refreshToken);
    } else {
      const user = await findUserByRefreshToken(refreshToken);
      if (user) {
        await invalidateRefreshToken(user, refreshToken);
      }
    }
  }

  const cookie = clearRefreshCookie();
  res.cookie(cookie.name, cookie.value, cookie.options);
  return res.json(createSuccessResponse(null, 'Logout successful'));
}

export async function refreshToken(req, res) {
  const refreshToken = req.cookies?.artisan_refresh_token;
  if (!refreshToken) {
    return res.status(401).json(createErrorResponse('Refresh token missing'));
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    return res.status(401).json(createErrorResponse('Invalid or expired refresh token'));
  }

  const user = await findUserById(payload.sub);
  if (!user) {
    return res.status(401).json(createErrorResponse('Invalid refresh token'));
  }

  const hashedToken = hashToken(refreshToken);
  const tokenEntry = user.refreshTokens.find((entry) => entry.token === hashedToken);
  if (!tokenEntry) {
    await invalidateAllRefreshTokens(user);
    return res.status(401).json(createErrorResponse('Refresh token not recognized'));
  }

  const newRefreshToken = createRefreshToken(user);
  const refreshCookie = createRefreshCookie(newRefreshToken);
  await invalidateRefreshToken(user, refreshToken);
  await saveRefreshToken(user, newRefreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  res.cookie(refreshCookie.name, refreshCookie.value, refreshCookie.options);
  return res.json(createSuccessResponse({ accessToken: createAccessToken(user) }, 'Token refreshed'));
}

export async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(200).json(createSuccessResponse(null, 'If the email exists, a reset link has been sent'));
  }

  const resetToken = await generatePasswordResetToken();
  const hashedResetToken = hashToken(resetToken);
  await setPasswordResetToken(user, hashedResetToken, new Date(Date.now() + 60 * 60 * 1000));

  // Placeholder: real email sending implementation will be added later
  return res.json(createSuccessResponse(null, 'Password reset instructions sent'));
}

export async function resetPassword(req, res) {
  const { token, password } = req.body;
  const hashedToken = hashToken(token);
  const user = await findUserByPasswordResetToken(hashedToken);

  if (!user) {
    return res.status(400).json(createErrorResponse('Invalid or expired reset token'));
  }

  await resetUserPassword(user, password);
  return res.json(createSuccessResponse(null, 'Password has been reset'));
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const user = await findUserByIdWithPassword(req.user._id);

  if (!user || !(await comparePassword(currentPassword, user.password))) {
    return res.status(401).json(createErrorResponse('Current password is incorrect'));
  }

  await updateUserPassword(user, newPassword);
  return res.json(createSuccessResponse(null, 'Password changed successfully'));
}

export async function getCurrentUser(req, res) {
  return res.json(createSuccessResponse(req.user, 'Current user retrieved'));
}
