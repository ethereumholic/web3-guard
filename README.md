# Web3 Guard

**Web3 Guard** maintains a built-in confirmation checker for every Ethereum transactions, smart contract events and value transfers that may interest you. **Web3 Guard** provides a bunch of workflow utilities so you don't need to add confirmation checking to your dapps.

## Installation

```javascript
// The package is designed to work with web3js version 0.20.x
npm install web3@0.20
npm install web3-guard
```

## Add confirmation checking for your dapps

```javascript
let Web3 = require('web3')
let Guard = require('web3-guard')
// your contract ABI
const HotelCal = require('./abi/HotelCal.json')

const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))
const HotelCalABI = HotelCal.abi

// It can work with any smart contract on Ethereum network
const hotel = web3.eth.contract(HotelCalABI).at('contract_address')

let guard = new Guard(web3)
// set confirmation to 12 blocks
let confirmations = 12

// listen every `Transfer` events that hotel smart contract broadcasts
// replay it until it reaches the confirmation
guard
.confirm(confirmations)
.on(hotel, hotel.Transfer().watch(async (err, event) => {
  if (err) {
    console.error(err)
  } else {
    if (!event.confirmed) {
      console.log('Unconfirmed ticket transfer: ' + event.transactionHash)
      guard.wait(event)
    } else {
      // the smart contract event has been finalized by Ethereum network(12 confirmations)
      // update your databases since dapp servers or exchanges often maintain several centrailzed datbases for better performance and user expeirence

      // you can stop listening events by doing this
      guard.destroy()
    }
  }
))
```

## Bind transactions

Some dapps often work with databases for keeping better user experience and high availabilities. A workflow could be like is: A cronjob query a result set from a centralized database. For every row of the result set, it should send several on-chain transactions to complete synchronization process. But a web3js filter can't directly distinguish which event is coming from which row of the result set so that it can't update the status of the row and brings it to the next status easily.

```javascript
// result set from a RDBMS
let rows = await getRecentTickets()
for (let index = 0; index < rows.length; index++) {
  let row = rows[index]
  let { user_address, token_id, ticket_price } = row

  // create a guard for each row
  let guard = new Guard(web3)

  // set confirmations
  let confirmations = 12
  guard = guard.confirm(confirmations)

  // bind every Guard instances based on separate indexes for different row
  guard = guard.bind(index)

  // transfer ERC721 to user_address
  let txHash = await hotel.safeTransferFrom(
    web3.eth.coinbase,
    user_address,
    token_id,
    {
      from: web3.eth.coinbase,
      to: hotel.address,
      gas: 470000
    }
  )

  // bind transaction with a specific gaurd instance
  guard.listen(txHash)

  guard
  .on(hotel, hotel.Transfer().watch(async (err, event) => {
    if (err) {
      console.error(err)
    } else {
      if (!event.confirmed) {
        console.log('Unconfirmed ticket transfer: ' + event.transactionHash)
        guard.wait(event)
      } else {
        // stage 1
        console.log('Confirmed ticket transfer: ' + event.transactionHash)

        // do second job of a row
        let txHash = await point.burn(
          web3.eth.coinbase,
          ...
        )
        console.log('burn token: ' + txHash)

        // bind another transaction with the same guard
        guard.listen(txHash)
      }
    }
  })).on(point, point.Burn().watch(async (err, event) => {
    if (err) {
      console.error(err)
    } else {
      if (!event.confirmed) {
        guard.wait(event)
      } else {
        // mission complete
        // update row status
        await updateTicketToOnChain(token_id)

        // destroy guard
        guard.destroy()
      }
    }
  }))
}
```

## Transfer detection

You could also listen any normal ETH transfers with the `on` method

```javascript
let guard = new Guard(web3)
// set confirmation to 12 blocks
let confirmations = 12

// listen ETH transfer from some address
let opt = { from: 'some_address' }

// listen ETH transfer to your address
let opt = { to: 'your_address' }

// listen ETH transfer from some address to your address
let opt = { from: 'some_address', to: 'your_address' }

guard
.confirm(confirmations)
.on(opt, (err, txHash) => {
  if (err) {
    console.error(err)
  } else {
    // 12 confirmations here, you can safely update your database now
  }
))
```

## Processed block

You may wanna log the block height of a Guard instance has processed for initialization. Web3 Guard provides a `done` callback for you.

```javascript
let guard = new Guard(web3)
// set confirmation to 12 blocks
let confirmations = 12

guard
.confirm(confirmations)
.on(opt, (err, txHash) => {
  if (err) {
    console.error(err)
  } else {
    // 12 confirmations here, you can safely update your database now
  }
))
.on(/* smart contract event */)
.on(/* another smart contract event */)
.done((processedBlockHeight) => {
  // update block height to your database so that you won't miss out any confirmed event or ETH transfer of your dapp
})
```