export function buildCloudinaryFolder(type) {
  switch (type) {
    case 'product':
      return 'products';
    case 'store':
      return 'stores';
    case 'user':
      return 'users';
    case 'review':
      return 'reviews';
    default:
      return 'misc';
  }
}

export function sanitizePublicId(originalName) {
  // use timestamp + sanitized filename to create predictable public IDs
  const base = originalName.replace(/[^a-zA-Z0-9-_\.]/g, '-').replace(/\.+$/, '');
  return `${Date.now()}-${base}`;
}
