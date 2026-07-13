import mongoose from 'mongoose';

export function getDatabaseHealth() {
  const state = mongoose.connection.readyState;
  return {
    status: state === 1 ? 'healthy' : 'unhealthy',
    readyState: state,
  };
}
