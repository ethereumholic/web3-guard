const Web3 = require('web3')
const Guard = require('./web3-guard')
const HotelCal = require('./abi/HotelCal.json')

const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))
const HotelCalABI = HotelCal.abi
const hotel = web3.eth.contract(HotelCalABI).at('0xdb7825891fc637380e2175dda5a2eb6308fd0806')

const event = hotel.Transfer();

let guard = new Guard(web3)

guard.confirm(4, event.watch((err, result) => {
  if (err) console.error(err)
  if (!result.confirmed) {
    guard.queue(result)
  } else {
    console.log(result)
  }
}))