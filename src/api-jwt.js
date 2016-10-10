const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = function enhanceRemoteApi(keystone, prefix = '/remote', privateKey='ksRemoteApi') {

  const originKsAuth = keystone.get('auth');
  keystone.set('auth', apiRemoteAuth(privateKey));

  const router = express.Router();
  const ksRouter = require('keystone/admin/server').createDynamicRouter(keystone);
  ksRouter.stack = ksRouter.stack.filter(layer => !layer.route || layer.route.path.indexOf('/:list') !== 0)
  
  router.all('/signin', signin(keystone, privateKey));
  router.use(ksRouter);
  
  keystone.set('routes', (app) => {
    app.use(prefix, router);
  })
  

  return keystone;
}

function signin(keystone, privateKey) {
  return (req, res, next) => {
    if (!req.body.email || !req.body.password) {
      return res.status(401).json({ error: 'email and password required' });
    }
    var User = keystone.list(keystone.get('user model'));
    var emailRegExp = new RegExp('^' + keystone.utils.escapeRegExp(req.body.email) + '$', 'i');
    User.model.findOne({ email: emailRegExp }).exec(function (err, user) {
      if (user) {
        token = jwt.sign({ email: user.get('email') }, privateKey)
        keystone.callHook(user, 'pre:signin', function (err) {
          if (err) return res.status(500).json({ error: 'pre:signin error', detail: err });
          user._.password.compare(req.body.password, function (err, isMatch) {
            if (isMatch) {
              keystone.callHook(user, 'post:signin', function (err) {
                if (err) return res.status(500).json({ error: 'post:signin error', detail: err });
                res.json({ success: true, token });
              });
            } else if (err) {
              return res.status(500).json({ error: 'bcrypt error', detail: err });
            } else {
              return res.status(401).json({ error: 'invalid details' });
            }
          });
        });
      } else if (err) {
        return res.status(500).json({ error: 'database error', detail: err });
      } else {
        return res.status(401).json({ error: 'invalid details' });
      }
    });
  }
}

function apiRemoteAuth(privateKey) {
  return (req, res, next) => {
    let token = null;
    let dToken = null;
    if (req.headers && req.headers.authorization) {
      var parts = req.headers.authorization.split(' ');
      if (parts.length == 2) {
        var scheme = parts[0];
        var credentials = parts[1];

        if (/^Bearer$/i.test(scheme)) {
          token = credentials;
        }
      }
    }
    if (!token) {
      res.status(403).json({ error: 'Authentication is required.' })
      return;
    }

    try {
      dToken = jwt.verify(token, privateKey);
    } catch(err){
      res.status(403).json({ error: 'Invalid or expired authorization token.' })
    }
    
    next();
  };
}
