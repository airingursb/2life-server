const request = require('supertest')('http://localhost:3002')

describe('#test server', () => {

  it('#test GET /', async (done) => {
    await request.get('/')
      .expect('Content-Type', /application\/json/)
      .then(done())
  })
})
