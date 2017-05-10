var IPCortex = require('ipcortex-pabx');
const config = require('node-config-env').create(__dirname + '/config', 'prod');


console.log(pabx = config.get('pabx'));
IPCortex.PBX.Auth.setHost('https://' + pabx.host);
IPCortex.PBX.Auth.login({
  username: pabx.user,
  password: pabx.password
}).then(function() {
  console.log('Login successful');
  IPCortex.PBX.startFeed().then(function() {
    console.log('Live data feed started');
    IPCortex.Types.Queue.addListener('update', callbackCall);
    // Do stuff here
  }, function() {
    console.log('Live data feed failed');
  });
}, function() {
  console.log('Login failed');
});

function callbackCall(queue) {
  console.log('got Queue', queue.name, queue.depth, queue.calls);

  for (var c in queue.calls) {
    call = queue.calls[c];
    console.log('got Call', call.id, call.state, call.name);
    call.addListener
    if (call.state === 'up' && !id)
      call.xfer('201', e => {
        console.log(e)
      });
  }

}
