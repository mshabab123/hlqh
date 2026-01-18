function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    if (!name) return;
    cookies[name] = decodeURIComponent(rest.join('='));
  });

  return cookies;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (req.headers.authorization) {
    return next();
  }

  const cookies = parseCookies(req.headers.cookie);
  if (!cookies.auth_token) {
    return next();
  }

  const csrfCookie = cookies.csrf_token;
  const csrfHeader = req.headers['x-csrf-token'];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  return next();
}

module.exports = csrfProtection;
