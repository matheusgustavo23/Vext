// config/passport.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const jwt = require('jsonwebtoken');

// Estratégia Local (Email/Senha)
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return done(null, false, { message: 'Email não registrado' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return done(null, false, { message: 'Senha incorreta' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Estratégia Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    proxy: true // Para funcionar em produção com HTTPS
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const [user] = await User.findOrCreate({
        where: { googleId: profile.id },
        defaults: {
          email: profile.emails[0].value,
          nome: profile.displayName,
          role: 'visualizador'
        }
      });
      done(null, user);
    } catch (error) {
      done(error);
    }
  }
));

// Estratégia Facebook
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: '/auth/facebook/callback',
    profileFields: ['id', 'emails', 'name']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const [user] = await User.findOrCreate({
        where: { facebookId: profile.id },
        defaults: {
          email: profile.emails[0].value,
          nome: `${profile.name.givenName} ${profile.name.familyName}`,
          role: 'visualizador'
        }
      });
      done(null, user);
    } catch (error) {
      done(error);
    }
  }
));

// Serialização do usuário para sessão
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Desserialização do usuário
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Middleware JWT para autenticação via token
const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Acesso não autorizado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware de autorização por cargo
const authorizeRole = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso proibido' });
    }
    next();
  };
};

module.exports = {
  passport,
  authenticateJWT,
  authorizeRole
};