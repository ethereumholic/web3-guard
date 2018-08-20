let confirmed = (confirmation, filter) => {
  let cb = filter.callbacks[0]
  cb(null, {
    confirmed: true,
    msg: 'test'
  })
}

module.exports = confirmed
