// ─────────────────────────────────────────────
// VirtualShop API — Cookie de refresh token
//
// O refresh token é um segredo opaco. O painel web usa-o
// exclusivamente através de um cookie HttpOnly, para que o
// JavaScript da aplicação nunca tenha acesso ao valor.
// ─────────────────────────────────────────────
const env = require('../config/env');

const REFRESH_COOKIE_NAME = env.authCookie.name;

function parseCookieHeader(header) {
  if (!header) return {};

  return header.split(';').reduce((cookies, part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return cookies;

    const name = part.slice(0, separator).trim();
    if (!name) return cookies;

    const rawValue = part.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch {
      cookies[name] = rawValue;
    }
    return cookies;
  }, {});
}

function getRefreshTokenFromRequest(req) {
  return parseCookieHeader(req.headers.cookie)[REFRESH_COOKIE_NAME] || null;
}

function refreshCookieOptions() {
  const maxAge = env.jwt.refreshExpiresDays * 24 * 60 * 60 * 1000;
  const options = {
    httpOnly: true,
    secure: env.authCookie.secure,
    sameSite: env.authCookie.sameSite,
    path: env.authCookie.path,
    maxAge,
  };

  if (env.authCookie.domain) options.domain = env.authCookie.domain;
  return options;
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  const options = {
    httpOnly: true,
    secure: env.authCookie.secure,
    sameSite: env.authCookie.sameSite,
    path: env.authCookie.path,
  };

  if (env.authCookie.domain) options.domain = env.authCookie.domain;
  res.clearCookie(REFRESH_COOKIE_NAME, options);
}

module.exports = {
  REFRESH_COOKIE_NAME,
  getRefreshTokenFromRequest,
  setRefreshCookie,
  clearRefreshCookie,
};
