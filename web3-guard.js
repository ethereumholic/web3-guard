class Guard {
  constructor (web3) {
    this.web3 = web3
    let filter = web3.filter('latest')
    filter.watch(() => {
      
    })
  }

  confirm = (confirmation, filter) => {
    let cb = filter.callbacks[0]
    cb(null, {
      confirmed: true,
      msg: 'test'
    })
  }

  queue = (event) => {

  }
}

module.exports = Guard
