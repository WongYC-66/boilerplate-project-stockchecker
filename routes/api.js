'use strict';
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

module.exports = function (app) {
  // setup mongoDB connection and mongoose Model
  mongoose.connect(process.env.DB); 
  const stockSchema = new mongoose.Schema({
    name : {type: String, unique: true},
    likeCount : Number,
    ipAddress : [String]
  })
  const Stocks = mongoose.model('Stocks', stockSchema)
  //
  const saltRounds = 10;
  
  
  app.route('/api/stock-prices')
    .get(async function (req, res){
      // console.log(req.query)

      let like_checked = req.query.like
      let stockList = req.query.stock
      let ip = req.header('x-forwarded-for');
      // hash ip for security.
      const hash_ip = await bcrypt.hashSync(ip, saltRounds);

      // handle GET /api/stock-prices?stock=GOOG&stock=MSFT&like=true
      if (stockList.length === 2){
        let stock1 = stockList[0]
        let stock2 = stockList[1]

        let results = await Promise.all([
          fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock1}/quote`).then(resp => resp.json()),
          fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock2}/quote`).then(resp => resp.json()),
          Stocks.findOne({name : stock1}).exec(),
          Stocks.findOne({name : stock2}).exec()
        ])

        // response
        let stockPrice1 = results[0].latestPrice
        let stockPrice2 = results[1].latestPrice
        let dbResponse1 = results[2]
        let dbResponse2 = results[3]
        let isNewStock1 = false
        let isNewStock2 = false
        
        // WRITE NEW RECORD IF MONGODB NOT FOUND
        if( ! dbResponse1){
          isNewStock1 = true
          const newStock1 = new Stocks({
                name: stock1,  
                likeCount : 0, 
                ipAddress: [],
          })
          // if LIKE-CHECKBOX CHECKED
          if(like_checked === "true"){
            newStock1.ipAddress.push(hash_ip)
            newStock1.likeCount = 1
          }
          await newStock1.save() // SAVE into mongoDB
        }
        if( ! dbResponse2){
          isNewStock2 = true
          const newStock2 = new Stocks({
                name: stock2,  
                likeCount : 0, 
                ipAddress: [],
          })
          // if LIKE-CHECKBOX CHECKED
          if(like_checked === "true"){
            newStock2.ipAddress.push(hash_ip)
            newStock2.likeCount = 1
          }
          await newStock2.save()  // SAVE into mongoDB
        }
        // if either stock isNew
        if(isNewStock1 || isNewStock2){
          let stockData = [{
            'stock' : stock1,
            'price' : stockPrice1,
            'rel_likes' : 0
          },{
            'stock' : stock2,
            'price' : stockPrice2,
            'rel_likes' : 0
          }]
          // fine-tuning
          let likeCount1 = 0
          let likeCount2 = 0
          dbResponse1 ? likeCount1 = dbResponse1.likeCount : likeCount1 = 0
          dbResponse2 ? likeCount2 = dbResponse2.likeCount : likeCount2 = 0
          
          stockData[0].rel_likes = likeCount1 - likeCount2
          stockData[1].rel_likes = likeCount2 - likeCount1 

          return res.json({ "stockData" : stockData})
        }
        
        // FOUND RECORD.
        let likeCount1 = dbResponse1.likeCount
        let likeCount2 = dbResponse2.likeCount
        
        let stockData = [{
          'stock' : stock1,
          'price' : stockPrice1,
          'rel_likes' : likeCount1 - likeCount2
        },{
          'stock' : stock2,
          'price' : stockPrice2,
          'rel_likes' : likeCount2 - likeCount1
        }]

        // LIKE-CHECKBOX is CHECKED
        if(like_checked === "true"){
          // check if new IP
          let ipRegistered1 = false
          dbResponse1.ipAddress.forEach(async hash => {
            ipRegistered1 = bcrypt.compareSync(ip, hash)
            if(ipRegistered1 === true) return;
          }); 
          if( ! ipRegistered1){ // New IP
            likeCount1 += 1
            let newArr = [...dbResponse1.ipAddress, hash_ip]
            console.log(newArr)
            await Stocks.findOneAndUpdate({name:stock1},{likeCount: likeCount1, ipAddress: newArr})
          }
          // check if new IP
          let ipRegistered2 = false
          dbResponse2.ipAddress.forEach(async hash => {
            ipRegistered2 = bcrypt.compareSync(ip, hash)
            if(ipRegistered2 === true) return;
          }); 
          if( ! ipRegistered2){ // New IP
            likeCount2 += 1
            let newArr2 = [...dbResponse2.ipAddress, hash_ip]
            console.log(newArr2)
            
            await Stocks.findOneAndUpdate({name:stock2},{likeCount: likeCount2, ipAddress: newArr2})
          }
        }

        return res.json({ "stockData" : stockData })
        
      } else {
      // handle GET /api/stock-prices?stock=GOOG&like=true
        let stock = stockList
        let url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock}/quote`
        fetch(url)  // get the price of stock
          .then(data => data.json())
          .then(async (result) => {
            let stockPrice = result.latestPrice
            let response
            // Check if mongoDB has this stock. 
            response = await Stocks.findOne({name : stock}).exec();
            // NOT FOUND FROM mongoDB, INITIALIZE
            if ( ! response){ 
              // console.log("not found")
              let likeCount = 0
              const newStock = new Stocks({
                name: stock,  
                likeCount : 0, 
                ipAddress: [],
              });

              // if LIKE-CHECKBOX CHECKED
              if(like_checked === "true"){
                newStock.ipAddress.push(hash_ip)
                newStock.likeCount = 1
                likeCount += 1
              }
              
              response = await newStock.save(); // SAVE into mongoDB
              // console.log(response2)
              let stockData = {
                'stock' : stock,
                'price' : stockPrice,
                'likes' : likeCount
              }
              return res.json({ "stockData" : stockData })
            }
            
            // FOUND record from mongoDB. GET DATA
            // console.log(response)
            let likeCount = response.likeCount
            let ipArr = response.ipAddress
            let ipRegistered = false

            // LIKE-CHECKBOX is CHECKED
            if(like_checked === "true"){
              // check if IP has registered
              ipArr.forEach(async hash => {
                ipRegistered = bcrypt.compareSync(ip, hash)
                if(ipRegistered === true) return;
              }); 
              // IP is new. update mongoDB for likecount.  
              if( ! ipRegistered){
                likeCount += 1
                ipArr.push(hash_ip)
                response = await Stocks.findOneAndUpdate({name:stock},{likeCount: likeCount, ipAddress: ipArr})
              }
            }
            // NOT CHECKED
            let stockData = {
              'stock' : stock,
              'price' : stockPrice,
              'likes' : likeCount
            }
            return res.json({ "stockData" : stockData })
            
          }) 
        }
     
      // console.log("end")
      return

    });

  
  
};
