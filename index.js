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

function cbQueue(queue) {
  console.log('got Queue', queue.name, queue.depth, queue.calls);

  for (var c in queue.calls) {
    call = queue.calls[c];
    console.log('got Call', call.id, call.state, call.name);
    call.addListener('update', cbCall)

  }

}

// Called as getdtmf#NN#XX#YY#ZZZZ - NN = msgno, XX = timeout, YY = maxdigits, ZZZZ = Return-ext
// Play message 70, timeout 10 secs, maxdigits 8, back to queue
const INPUTDOB = 'getdtmf#70#10#8#227';
const DOBERROR = 'getdtmf#71#1#1#227'
var callState = {};
var age;
function cbCall(call) {
  console.log(call);
  if(!(state = callState[call.ID]))
    callState[call.ID] = 'discovered';


  switch (callState[call.ID]){
    case 'discovered':
      console.log('got update in inputDOB');
      call.sendto(INPUTDOB);
      callState[call.ID] = 'inputDOB';
      break;

    case 'inputDOB':
      console.log('got update in inputDOB');

      if (call.DTMF != ''){
        if((age = processDOB(call.DTMF)) > 65){
          callState[call.ID] = 'done';
          call.sento('over65');
          break;
        }
        else if (age > 18){
          callState[call.ID] = 'done';
          call.sento('over18');
          break;
        }
        else if (age > 0){
          callState[call.ID] = 'done';
          call.sento('tooyoung');
          break;
        }
        else {
          callState[call.ID] = 'inputError';
          call.sento('DOBERROR');
          break;
        }
      }
      break;

      case 'inputError':
        console.log('got update in inputError');
        break;

      case 'done':
        console.log('got update in inputError');
      default:
        console.log('fallthrough', callState[call.ID])
        break;
      }

    }

    function processDOB(str){
      return(-1);
    }
