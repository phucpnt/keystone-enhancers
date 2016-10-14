let keystone = require('keystone');
const Mongoose = require('mongoose').Mongoose;
const mockgoose = require('mockgoose');
const enhanceKs = require ('../api-jwt.js');
const request = require('supertest');

function startKs(beforeStartKs = ks => ks, callback = () => {}) {
  const mongoose = new Mongoose();
  mockgoose(mongoose).then(() => {
    keystone.init({
      'name': 'Unittest',
      'favicon': false,
      'less': 'public',
      'static': ['public'],
      'views': 'templates/views',
      'view engine': 'jade',
      'auto update': false,
      'mongoose': mongoose,
      'session': true,
      'auth': true,
      'user model': 'User',
      'cookie secret': '(your secret here)'
    });

    var Types = keystone.Field.Types;

    var User = new keystone.List('User', {
      // nodelete prevents people deleting the demo admin user
      nodelete: true,
    });

    User.add({
      name: { type: Types.Name, required: true, index: true },
      email: { type: Types.Email, initial: true, required: true, index: true, unique: true },
      phone: { type: String, width: 'short' },
      password: { type: Types.Password, initial: true, required: false },
    }, 'Permissions', {
        isProtected: { type: Boolean, noedit: true, hidden: true },
      });
    User.register();
    
    new User.model({
      name: {
        first: 'Unit',
        last: 'Test'
      },
      email: 'email@unittest.com',
      password: 'test',
      isAdmin: true,
      isProtected: true,
    }).save();
        
    keystone = beforeStartKs(keystone);
    keystone.start({
      onStart: () => callback()
    });
  });
}

describe('Api exposed with JWT', () => {
  
  before(done => {
    startKs(ks => {
      return enhanceKs(ks);
    }, done );
  });
  
  after(done => {
    keystone.httpServer.close(() => done());
  })
  
  let signedToken = null;
  
  it('should not allow query without JWT', (done) => {
    request(keystone.app).get('/remote/api/users')
      .expect(403)
      .end((err, res) => {
        console.log(res.body);
        expect(res.body.error).to.be.defined;
        done(err);
      });
  });
  
  it('should support sign in with email / password', done => {
    request(keystone.app).post('/remote/signin')
    .send({email: 'email@unittest.com', password: 'test'})
    .expect(200)
    .end((err, res) => {
      expect(res.body.token).to.be.defined;
      signedToken = res.body.token;
      done(err);
    });
  });
  
  it('should support query with signed token', done => {
    request(keystone.app).get('/remote/api/users')
      .set({Authorization: `Bearer ${signedToken}`})
      .expect(200)
      .end((err, res) => {
        console.log(res.body);
        expect(res.body.results).to.exist;
        expect(res.body.results).to.have.length.above(0);
        done(err);
      });
  });
  // todo: testing token expired?
})