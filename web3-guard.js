class Guard {
  constructor (web3) {
    this.web3 = web3
    this.queue = []
    this.confirmation = null
    this.cb = null
    this.blockHeight = null

    let filter = web3.eth.filter('latest')
    filter.watch(async (err, blockHash) => {
      if (!err) {
        let block = await web3.eth.getBlock(blockHash)
        this.blockHeight = parseInt(block.number)

        this.queue.forEach(async (event) => {
          let txHash = event.transactionHash
          let receipt = await web3.eth.getTransactionReceipt(txHash)
          let txBlockNumber = receipt.blockNumber
          if (txBlockNumber) {
            txBlockNumber = parseInt(txBlockNumber)
            let confirmation = (this.blockHeight - txBlockNumber) + 1
            if (confirmation >= this.confirmation) {
              event.confirmed = true
              this.queue.splice(this.queue.indexOf(event), 1)
              this.cb(null, event)
            }
          }
        })
      }
    })
  }

  confirm (confirmation, filter) {
    this.confirmation = confirmation
    this.cb = filter.callbacks[0]
  }

  enqueue (event) {
    this.queue.push(event)
  }
}

module.exports = Guard
