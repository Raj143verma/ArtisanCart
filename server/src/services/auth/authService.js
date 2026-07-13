import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { User } from '../../models/user.model.js';
import { signAccessToken, signRefreshToken } from '../../utils/auth/tokenUtils.js';

const SALT_ROUNDS = 12;

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createAccessToken(user) {
  return signAccessToken({ sub: user._id.toString(), role: user.role });
}

export function createRefreshToken(user) {
  return signRefreshToken({ sub: user._id.toString(), role: user.role });
}

export async function generateEmailVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function generatePasswordResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function createUser({ email, password, firstName, lastName, emailVerificationToken }) {
  return User.create({ email, password, firstName, lastName, emailVerificationToken });
}

export async function findUserByEmail(email) {
  return User.findOne({ email }).select('+password +refreshTokens');
}

export async function findUserById(userId) {
  return User.findById(userId).select('+refreshTokens');
}

export async function findUserByIdWithPassword(userId) {
  return User.findById(userId).select('+password +refreshTokens');
}

export async function findUserByRefreshToken(token) {
  const hashedToken = hashToken(token);
  return User.findOne({ 'refreshTokens.token': hashedToken }).select('+refreshTokens');
}

export async function findUserByPasswordResetToken(hashedToken) {
  return User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } });
}

export async function cleanupExpiredRefreshTokens(user) {
  const now = new Date();
  const activeTokens = user.refreshTokens.filter((entry) => entry.expiresAt > now);
  if (activeTokens.length !== user.refreshTokens.length) {
    user.refreshTokens = activeTokens;
    await user.save();
  }
}

export async function saveRefreshToken(user, token, expiresAt) {
  await cleanupExpiredRefreshTokens(user);
  const hashedToken = hashToken(token);
  user.refreshTokens = user.refreshTokens.concat({ token: hashedToken, createdAt: new Date(), expiresAt });
  await user.save();
}

export async function invalidateRefreshToken(user, token) {
  const hashedToken = hashToken(token);
  user.refreshTokens = user.refreshTokens.filter((entry) => entry.token !== hashedToken);
  await user.save();
}

export async function invalidateAllRefreshTokens(user) {
  user.refreshTokens = [];
  await user.save();
}

export async function setPasswordResetToken(user, hashedToken, expiresAt) {
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = expiresAt;
  await user.save();
}

export async function resetUserPassword(user, newPassword) {
  user.password = await hashPassword(newPassword);
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();
}

export async function updateUserPassword(user, newPassword) {
  user.password = await hashPassword(newPassword);
  await invalidateAllRefreshTokens(user);
  await user.save();
}
