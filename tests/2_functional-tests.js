const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

// return


chai.use(chaiHttp);
suite('Functional Tests', function() {
  this.timeout(5000);
  // #1 
  
  test('Viewing one stock: GET request to /api/stock-prices/', function(done) {
    chai
      .request(server)
      .keepOpen()
      .get('/api/stock-prices?stock=GOOG')
      .set('x-forwarded-for', '153.134.1.1')
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.hasOwnProperty('stockData'), true, 'Object returned do not have stockData');
        assert.equal(res.body.stockData.stock, 'GOOG', 'Object returned do not have stock name');
        assert.equal(res.body.stockData.hasOwnProperty('price'), true, 'Object returned do not have price');
        assert.equal(res.body.stockData.hasOwnProperty('likes'), true, 'Object returned do not have likes count');
        done();
      });
  });
  // #2
  test('Viewing one stock: GET request to /api/stock-prices/', function(done) {
    chai
      .request(server)
      .keepOpen()
      .get('/api/stock-prices?stock=GOOG&like=true')
      .set('x-forwarded-for', '153.134.1.1')
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.hasOwnProperty('stockData'), true, 'Object returned do not have stockData');
        assert.equal(res.body.stockData.stock, 'GOOG', 'Object returned do not have stock name');
        assert.equal(res.body.stockData.hasOwnProperty('price'), true, 'Object returned do not have price');
        assert.equal(res.body.stockData.likes, 1, 'Likes should be 1.');
        done();
      });
  });
  // #3
  test('Viewing the same stock and liking it again: GET request to /api/stock-prices/', function(done) {
    chai
      .request(server)
      .keepOpen()
      .get('/api/stock-prices?stock=GOOG&like=true')
      .set('x-forwarded-for', '153.134.1.1')
      .end(function(err, res) {
        assert.equal(res.body.stockData.likes, 1, 'Only 1 like per IP should be accepted.');
        done();
      });
  });
  // #4
  test('Viewing two stocks: GET request to /api/stock-prices/', function(done) {
    chai
      .request(server)
      .keepOpen()
      .get('/api/stock-prices?stock=GOOG&stock=MSFT')
      .set('x-forwarded-for', '153.134.1.1')
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.hasOwnProperty('stockData'), true, 'Object returned do not have stockData');
        assert.equal(res.body.stockData.length, 2, 'Should return array of 2 objects');
        assert.equal(res.body.stockData[0].stock, 'GOOG', 'Object returns wrong stock name');
        assert.equal(res.body.stockData[1].stock, 'MSFT', 'Object returns wrong stock name');
        assert.equal(res.body.stockData[0].hasOwnProperty('price'), true, 'Object returned do not have price');
        assert.equal(res.body.stockData[1].hasOwnProperty('price'), true, 'Object returned do not have price');
        assert.equal(res.body.stockData[0].hasOwnProperty('rel_likes'), true, 'Object returned do not have rel_likes');
        assert.equal(res.body.stockData[1].hasOwnProperty('rel_likes'), true, 'Object returned do not have rel_likes');
        done();
      });
  });
  // #5
  test('Viewing two stocks and liking them: GET request to /api/stock-prices/', function(done) {
    chai
      .request(server)
      .keepOpen()
      .get('/api/stock-prices?stock=JHKS&stock=MJHJ&like=true')
      .set('x-forwarded-for', '153.134.1.1')
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.stockData[0].rel_likes, 0, 'Object returns wrong rel_likes');
        assert.equal(res.body.stockData[1].rel_likes, 0, 'Object returns wrong rel_likes');
        done();
      });
  });

});
