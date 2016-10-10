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
    keystone = beforeStartKs(keystone);
    keystone.start({
      onStart: () => callback()
    });
  });
}

describe('Api exposed with JWT', () => {
  
  beforeEach(done => {
    startKs(ks => {
      return enhanceKs(ks);
    }, done );
  });
  
  afterEach(done => {
    keystone.httpServer.close(() => done());
  })
  
  
  it('should work', (done) => {
    request(keystone.app).get('/keystone/api/users').expect(200, done);
  })
})