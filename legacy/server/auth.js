const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "..", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const sessions = new Map();

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]", "utf8");

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(expectedHash, "hex")
  );
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    userId,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7
  });
  return token;
}

function getSessionToken(req) {
  return req.headers.cookie?.match(/(?:^|;\s*)genvity_session=([^;]+)/)?.[1];
}

function currentUser(req) {
  const token = getSessionToken(req);
  if (!token) return null;

  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    if (session) sessions.delete(token);
    return null;
  }

  return readUsers().find(user => user.id === session.userId) || null;
}

function publicUser(user) {
  return user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    : null;
}

function registerRoutes(app) {
  app.post("/api/auth/register", (req, res) => {
    try {
      const { name, email, password } = req.body || {};
      const cleanName = String(name || "").trim();
      const cleanEmail = String(email || "").trim().toLowerCase();

      if (cleanName.length < 2) {
        return res.status(400).json({ error: "Digite seu nome completo." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ error: "Digite um e-mail válido." });
      }
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ error: "A senha precisa ter pelo menos 8 caracteres." });
      }

      const users = readUsers();
      if (users.some(user => user.email === cleanEmail)) {
        return res.status(409).json({ error: "Já existe uma conta com este e-mail." });
      }

      const { salt, hash } = hashPassword(password);
      const user = {
        id: crypto.randomUUID(),
        name: cleanName,
        email: cleanEmail,
        salt,
        passwordHash: hash,
        createdAt: new Date().toISOString()
      };

      users.push(user);
      writeUsers(users);

      const token = createSession(user.id);
      res.setHeader(
        "Set-Cookie",
        `genvity_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`
      );
      res.status(201).json({ user: publicUser(user) });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Não foi possível criar a conta." });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body || {};
      const cleanEmail = String(email || "").trim().toLowerCase();
      const user = readUsers().find(item => item.email === cleanEmail);

      if (
        !user ||
        typeof password !== "string" ||
        !verifyPassword(password, user.salt, user.passwordHash)
      ) {
        return res.status(401).json({ error: "E-mail ou senha incorretos." });
      }

      const token = createSession(user.id);
      res.setHeader(
        "Set-Cookie",
        `genvity_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`
      );
      res.json({ user: publicUser(user) });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Não foi possível entrar na conta." });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    res.json({ user: publicUser(currentUser(req)) });
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = getSessionToken(req);
    if (token) sessions.delete(token);

    res.setHeader(
      "Set-Cookie",
      "genvity_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
    );
    res.json({ ok: true });
  });
}

module.exports = {
  currentUser,
  publicUser,
  registerRoutes
};
