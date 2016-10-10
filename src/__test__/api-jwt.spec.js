const keystone = require('keystone');
const Mongoose = require('mongoose').Mongoose;
const mockgoose = require('mockgoose');

function startKs(callback) {
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
    keystone.start({
      onStart: () => callback()
    });
  });
}

describe('Api exposed with JWT', () => {
  
  it('should work', (done) => {
    startKs(done);
  })
})