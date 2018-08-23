class Guard {
  constructor (web3) {
    this.web3 = web3
    this.eventQueue = []
    this.confirmation = null
    this.subscriptions = []
    this.doneCallback = null
    this.bindID = null
    this.bindTxshes = []
    this.listeningTxHashes = []
    this.blockFilter = this.web3.eth.filter('latest')
    this.blockFilter.watch(async (err, blockHash) => {
      if (!err) {
        let block = await this.web3.eth.getBlock(blockHash)
        let blockHeight = parseInt(block.number)
        let targetBlockHeight = (blockHeight - this.confirmation) + 1
        // normal transfer
        let targetBlock = await this.web3.eth.getBlock(targetBlockHeight)
        let targetTxHashes = targetBlock.transactions
        for (let i = 0; i < targetTxHashes.length; i++) {
          let targetTxHash = targetTxHashes[i]
          let targetTx = await this.web3.eth.getTransaction(targetTxHash)

          this.subscriptions
          .filter(subscription => subscription.type === 'transfer_to')
          .forEach(subscription => {
            let toAddress = subscription.toAddress
            if (targetTx.to === toAddress) {
              subscription.cb(null, targetTxHash)
            }
          })

          this.subscriptions
          .filter(subscription => subscription.type === 'transfer_from')
          .forEach(subscription => {
            let fromAddress = subscription.fromAddress
            if (targetTx.from === fromAddress) {
              subscription.cb(null, targetTxHash)
            }
          })

          this.subscriptions
          .filter(subscription => subscription.type === 'transfer_between')
          .forEach(subscription => {
            let fromAddress = subscription.fromAddress
            let toAddress = subscription.toAddress
            if ((targetTx.from === fromAddress) &&
                targetTx.to === toAddress) {
              subscription.cb(null, targetTxHash)
            }
          })
        }

        // contract event
        this.eventQueue.forEach(event => {
          let contractAddress = event.address
          this.subscriptions
          .filter(subscription => subscription.type === 'contract_event')
          .forEach(async subscription => {
            let targetContractAddress = subscription.contractAddress
            if (targetContractAddress === contractAddress) {
              let tx = await this.web3.eth.getTransaction(event.transactionHash)
              let blockNumber = tx.blockNumber
              if (blockNumber) {
                blockNumber = parseInt(blockNumber)
                if (blockNumber === event.blockNumber) {
                  let confirmation = (blockHeight - blockNumber) + 1
                  if (confirmation === this.confirmation) {
                    // replay event
                    this.eventQueue.splice(this.eventQueue.indexOf(event), 1)
                    event.confirmed = true
                    subscription.cb(null, event)
                  }
                } else {
                  // transaction was re-enter a new block, delete old event from event queue
                  this.eventQueue.splice(this.eventQueue.indexOf(event), 1)
                }
              } else {
                // blockchain reorg, delete event from event queue
                this.eventQueue.splice(this.eventQueue.indexOf(event), 1)
              }
            }
          })
        })

        console.log('event queue length: ' + this.eventQueue.length)
        console.log('subscription length: ' + this.subscriptions.length)

        if (this.doneCallback && this.doneCallback.constructor.name === 'Function') {
          this.doneCallback(targetBlockHeight)
        }
      }
    })
  }

  confirm (confirmation) {
    this.confirmation = parseInt(confirmation)
    return this
  }

  on (topic, action) {
    if (topic.constructor.name === 'Contract' &&
        action.constructor.name === 'Filter') {
      // topic is contract instance, action is filter
      let subscription = {
        type: 'contract_event',
        contractAddress: topic.address,
        cb: action.callbacks[0]
      }
      this.subscriptions.push(subscription)
    } else if ((topic.hasOwnProperty('from') ||
                topic.hasOwnProperty('to')) &&
                action.constructor.name === 'Function') {
      // topic is addres option, action is directly callback
      topic = Object.assign({
        from: null,
        to: null
      }, topic)

      let subscription = {}

      if (topic.from && topic.to) {
        subscription.type = 'transfer_between'
        subscription.fromAddress = topic.from
        subscription.toAddress = topic.to
      } else if (topic.from) {
        subscription.type = 'transfer_from'
        subscription.fromAddress = topic.from
      } else if (topic.to) {
        subscription.type = 'transfer_to'
        subscription.toAddress = topic.to
      } else {
        throw new Error('Not supported subscription.')
      }

      subscription.cb = action
      this.subscriptions.push(subscription)
    } else {
      throw new Error('Not supported subscription.')
    }

    return this
  }

  wait (event) {
    let txHash = event.transactionHash
    if (this.bindID !== null) {
      if (this.listeningTxHashes.indexOf(txHash) >= 0) {
        this.eventQueue.push(event)
        this.listeningTxHashes.splice(this.listeningTxHashes.indexOf(txHash), 1)
      }
    } else {
      this.eventQueue.push(event)
    }
  }

  done (doneCallback) {
    this.doneCallback = doneCallback
  }

  listen (txHash) {
    if (this.listeningTxHashes.indexOf(txHash) < 0) {
      this.listeningTxHashes.push(txHash)
    }
  }

  bind (bindID) {
    this.bindID = bindID
    return this
  }

  destroy () {
    if (this.blockFilter) {
      this.blockFilter.stopWatching()
    }

    this.web3 = null
    this.eventQueue = []
    this.confirmation = null
    this.subscriptions = []
    this.doneCallback = null
    this.bindID = null
    this.bindTxshes = []
    this.listeningTxHashes = []
  }
}

module.exports = Guard
