import { createWriteStream, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const logDirectory = join(process.cwd(), 'src', 'logs');
if (!existsSync(logDirectory)) {
  mkdirSync(logDirectory, { recursive: true });
}

const errorStream = createWriteStream(join(logDirectory, 'error.log'), { flags: 'a' });
const requestStream = createWriteStream(join(logDirectory, 'request.log'), { flags: 'a' });

function formatMessage(level, message, meta = null) {
  const timestamp = new Date().toISOString();
  const payload = meta ? `${message} ${JSON.stringify(meta)}` : message;
  return `[${timestamp}] [${level.toUpperCase()}] ${payload}\n`;
}

export const logger = {
  info(message, meta = null) {
    process.stdout.write(formatMessage('info', message, meta));
  },
  warn(message, meta = null) {
    process.stderr.write(formatMessage('warn', message, meta));
  },
  error(message, meta = null) {
    process.stderr.write(formatMessage('error', message, meta));
    errorStream.write(formatMessage('error', message, meta));
  },
  request(message, meta = null) {
    requestStream.write(formatMessage('info', message, meta));
  },
};
