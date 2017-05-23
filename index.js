var IPCortex = require('ipcortex-pabx');
const config = require('node-config-env').create(__dirname + '/config', 'prod');

// Read config/pabx.js to get host and login credentials
console.log(pabx = config.get('pabx'));


IPCortex.PBX.Auth.setHost('https://' + pabx.host);

IPCortex.PBX.Auth.login({
  username: pabx.user,
  password: pabx.password
}).then(function() {
  console.log('Login successful');
  IPCortex.PBX.startFeed().then(function() {
    console.log('Live data feed started');
    // Once we are live, add a listener for all queues
    IPCortex.Types.Queue.addListener('update', cbQueue);
  }, function() {
    console.log('Live data feed failed');
  });
}, function() {
  console.log('Login failed');
});


// Queue listener, called whenever a queue changes

function cbQueue(queue) {
  /*
   * I run this on a test PBX with just one queue. In a real implementation you would restrict this
   * to queues that we are interested in
   */

  console.log('got Queue change:', queue.name, queue.depth);
  // Iterate of the calls in the queue and add a listener to any we don't already know about
  for (var c in queue.calls) {
    call = queue.calls[c];
    if (!callState[call.id]) {
      call.addListener('update', cbCall);
      // prime the pump on calls arriving by calling the update callback
      cbCall.apply(call);
    }

  }

}

/*
  These are hardwired PBX extensions of the format:
  Called as getdtmf#NN#XX#YY#ZZZZ - NN = msgno, XX = timeout, YY = maxdigits, ZZZZ = Return-ext
*/
// Play message 70, timeout 10 secs, maxdigits 8, back to queue
const INPUTDOB = 'getdtmf#70#10#8#777';
// Play message 71 (error message) timeout after 1 sec to queue
const DOBERROR = 'getdtmf#71#1#1#777'
var callState = {};


function cbCall(call) {
  if(!call)
    call = this;

  if (call != null && !call.id) {
    console.log('err this seems to be a call but has a null ID', call);
    return;
  }

  var age;

  console.log('cbCall:', call.id, 'input state', callState[call.id], call.number);


  if (!(state = callState[call.id]))
    callState[call.id] = 'discovered';



  switch (callState[call.id]) {
    // We just out put an error message and now we are back in the queue
    case 'errorMessage':
      if (!call.number.match('getdtmf'))
        callState[call.id] = 'discovered';
      else
        break;
      // Newly discovered call, send it to collect DOB DTMF
    case 'discovered':
      call.send(INPUTDOB, (e, txt) => console.log('send', e, txt));
      callState[call.id] = 'inputDOB';
      break;

    case 'inputDOB':
      if (call.number.match('getdtmf'))
        callState[call.id] = 'gettingDOB';
      break;

    case 'gettingDOB':
      // We were getting DOB and now we are back in the queue so that means
      // we have all the dTmf we are going to get
      if (!call.number.match('getdtmf')) {
        if (call.dtmfString && call.dtmfString.length) {
          console.log('dtmfString:', call.dtmfString);
          if ((age = processDOB(call.dtmfString)) > 65) {
            callState[call.id] = 'done';
            call.send('over65', (e, txt) => console.log('send', e, txt));
            break;
          } else if (age > 18) {
            callState[call.id] = 'done';
            console.log('sending to over18');
            call.send('over18', (e, txt) => console.log('send', e, txt));
            break;
          } else if (age > 0) {
            callState[call.id] = 'done';
            call.send('tooyoung', (e, txt) => console.log('send', e, txt));
            break;
          } else {
            callState[call.id] = 'inputError';
            call.send(DOBERROR, (e, txt) => console.log('send', e, txt));
            break;
          }
        } else {
          callState[call.id] = 'inputError';
          call.send(DOBERROR, (e, txt) => console.log('send', e, txt));
          break;
        }
      }
      break;

    case 'inputError':
      // We are outputting the error message
      if (call.number.match('getdtmf'))
        callState[call.id] = 'errorMessage';
      break;


    case 'done':
      // We have done everything we can with this call now
    default:
      break;
  }

  console.log('cbCall:', call.id, 'exit state', callState[call.id]);

}

function processDOB(str) {
  var dobar = str.match(/([0-9][0-9])([0-9][0-9])([0-9][0-9]*)/)
  if(!dobar || dobar.length != 4)
    return(-1)
  var dob = new Date(dobar[3], dobar[2], dobar[1]);
  var today = new Date();
  var age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() < dob.getMonth || (today.getMonth() == dob.getMonth() && today.getDate() < today.getDate()))
    age--;
  console.log('returning age:', age);
  return ((age > 1) ? age : -1);
}
