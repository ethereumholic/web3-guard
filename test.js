const Web3 = require('web3')
const Guard = require('./web3-guard')
const HotelCal = require('./abi/HotelCal.json')

const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))
const HotelCalABI = HotelCal.abi
const hotel = web3.eth.contract(HotelCalABI).at('0xdb7825891fc637380e2175dda5a2eb6308fd0806')

let guard = new Guard(web3)
let confirmations = 6

guard
.bind(1)
.confirm(confirmations)
.on(hotel, hotel.Transfer().watch((err, event) => {
  if (err) console.error(err)
  if (!event.confirmed) {
    guard.wait(event)
  } else {
    // SQL
    console.log(event)
  }
})).on({ to: '0x89c572bc336c18058f807b966540bc5de49837a2' }, (err, txHash) => {
  console.log('transfer event: ' + txHash)
}).done((doneBlockHeight) => {
  console.log('done block: ' + doneBlockHeight)
})
