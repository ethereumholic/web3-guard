const Web3 = require('web3')
let confirmed = require('./web3-guard')

let filter = web3.eth.filter('latest')

confirmed(4, filter.watch((err, result) => {
  if (err) console.error(err)
  if (result.confirmed) {
    console.log(result)
  }
}))