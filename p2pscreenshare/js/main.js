/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';
const REQUEST_TEACHER = 102;
const RESPONSE_FROMTEACHER = 103;
const REQUEST_CONNECT = 104;
const RESPONSE_ACCEPTCONN = 105;
const ANNOUNCE_TEACHER = 106;

const WEBRTC_OFFER_MSG_ID = 10001;
const WEBRTC_ANSWER_MSG_ID = 10002;
const WEBRTC_ICE_MSG_ID = 10003;
let SHARESCREEN = false;

const APPID = '7e8aae0b5999430e9b8823553dab699d';
const accountName = 'student_' + Date.now();
const channelName = 'uhd_test2';
let agoraClient;
let remotePeerId;

const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const shareScreenButton = document.getElementById('shareScreenButton');
callButton.disabled = true;
startButton.addEventListener('click', start);
callButton.addEventListener('click', call);
shareScreenButton.addEventListener('click', setShareScreen);

let startTime;
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

document.addEventListener("WeixinJSBridgeReady", function () {  
	localVideo.play();
  remoteVideo.play();
}, false);

localVideo.addEventListener('loadedmetadata', function() {
  console.log(`Local video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

remoteVideo.addEventListener('loadedmetadata', function() {
  remoteVideo.play();
  console.log(`Remote video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

remoteVideo.addEventListener('resize', () => {
  console.log(`Remote video size changed to ${remoteVideo.videoWidth}x${remoteVideo.videoHeight} - Time since pageload ${performance.now().toFixed(0)}ms`);
  // We'll use the first onsize callback as an indication that video has started
  // playing out.
  if (startTime) {
    const elapsedTime = window.performance.now() - startTime;
    console.log('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
    startTime = null;
  }
});

let localStream;
let pc1;
const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

function getName(pc) {
  return 'pc1';
}

async function start() {
  console.log('Requesting local stream');
  agoraClient = AgoraRTM.createInstance(APPID, { enableLogUpload: false }); // Pass your App ID here.

  await login(accountName);
  await joinChannel(channelName);
  subscribeClientEvents();
  subscribeChannelEvents();

  startButton.disabled = true;
  try {
    let stream;
    if (!SHARESCREEN) {
      stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
    }
    else {
      stream = await navigator.mediaDevices.getDisplayMedia({video: true});
    }

    console.log('Received local stream');
    localVideo.srcObject = stream;
    localStream = stream;
    
    callButton.disabled = false;

    if (pc1) {
      localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));
      console.log('Added local stream to pc1 22222');
      localVideo.play();
    }
  } catch (e) {
    alert(`getUserMedia() error: ${e.name}`);
  }
}

async function call() {
  callButton.disabled = true;
  console.log('Starting call');
  sendChannelMessage(REQUEST_TEACHER + '##', null);
}

async function createOfferAndSend() {
  try {
    console.log('pc1 createOffer start');
    const offer = await pc1.createOffer(offerOptions);

    await onCreateOfferSuccess(offer);
    sendPeerMessage(WEBRTC_OFFER_MSG_ID + '##' + JSON.stringify(offer), remotePeerId);

  } catch (e) {
    onCreateSessionDescriptionError(e);
  }
}

function onCreateSessionDescriptionError(error) {
  console.log(`Failed to create session description: ${error.toString()}`);
}

async function onCreateOfferSuccess(desc) {
  console.log(`Offer from pc1\n${desc.sdp}`);
  console.log('pc1 setLocalDescription start');
  try {
    await pc1.setLocalDescription(desc);
    onSetLocalSuccess(pc1);
  } catch (e) {
    onSetSessionDescriptionError();
  }
}

function onSetLocalSuccess(pc) {
  console.log(`${getName(pc)} setLocalDescription complete`);
}

async function onSetRemoteSuccess(pc, msgJson) {
  await pc1.setRemoteDescription(msgJson);
  console.log(`${getName(pc)} setRemoteDescription complete`);
}

function onSetSessionDescriptionError(error) {
  console.log(`Failed to set session description: ${error.toString()}`);
}

function gotRemoteStream(e) {
  if (remoteVideo.srcObject !== e.streams[0]) {
    remoteVideo.srcObject = e.streams[0];
    console.log(' received remote stream');
    remoteVideo.play();
  }
}

function onIceCandidate(pc, event) {
  try {
    //send to peerId
    console.log(event);
    let iceinfo = {};
    iceinfo.candidate = event.candidate;
    iceinfo.sdpMid = '';
    iceinfo.sdpMLineIndex  = '';
    sendPeerMessage(WEBRTC_ICE_MSG_ID + '##' +  JSON.stringify(event.candidate), remotePeerId);
  } catch (e) {
  }
}

function onAddIceCandidateSuccess(pc) {
  console.log(`${getName(pc)} addIceCandidate success`);
}

function onAddIceCandidateError(pc, error) {
  console.log(`${getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
}

function onIceStateChange(pc, event) {
  if (pc) {
    console.log(`${getName(pc)} ICE state: ${pc.iceConnectionState}`);
    console.log('ICE state change event: ', event);
  }
}

function setShareScreen() {
  SHARESCREEN = true;
  shareScreenButton.disabled = true;
}


async function login (accountName, token) {
  return agoraClient.login({ uid: accountName, token })
}

async function logout () {
  return agoraClient.logout()
}

async function joinChannel (name) {
  console.log('joinChannel', name)
  agoraClient.agoraChannel = agoraClient.createChannel(name)
  return agoraClient.agoraChannel.join()
}

async function leaveChannel () {
  return agoraClient.agoraChannel.leave()
}

async function sendChannelMessage (text) {
  return  agoraClient.agoraChannel.sendMessage({ text })
}

async function sendPeerMessage (text, peerId) {
  console.log('sendPeerMessage', text, peerId)
  return agoraClient.sendMessageToPeer({ text }, peerId.toString())
}

// subscribe client events
function subscribeClientEvents () {
  const clientEvents = [
    'ConnectionStateChanged',
    'MessageFromPeer'
  ]
  clientEvents.forEach((eventName) => {
    agoraClient.on(eventName, (...args) => {
      console.log('emit ', eventName, ...args)
      if (eventName === 'MessageFromPeer') {
        const msg = args[0];
        console.log('new message=' + msg.text);
        const msgIdAndcont = msg.text.split('##');
        const msgId = msgIdAndcont[0];
        const msgCont = msgIdAndcont[1];

        console.log(msgId);
        console.log(msgCont);
        const peerId = args[1];
        console.log(peerId);
        if (msgId === RESPONSE_FROMTEACHER + '') {
          console.log('RESPONSE_FROMTEACHER');
          sendPeerMessage(REQUEST_CONNECT + '##', peerId);
        }
        else if ( msgId === RESPONSE_ACCEPTCONN + '') {
          console.log('RESPONSE_ACCEPTCONN');
          remotePeerId = peerId;
          const configuration = {};
          console.log('RTCPeerConnection configuration:', configuration);
          pc1 = new RTCPeerConnection(configuration);
          console.log('Created local peer connection object pc1');
          pc1.addEventListener('icecandidate', e => onIceCandidate(pc1, e));
          pc1.addEventListener('iceconnectionstatechange', e => onIceStateChange(pc1, e));
          pc1.addEventListener('track', gotRemoteStream);


          if (localStream) {
            localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));
            console.log('Added local stream to pc1 1111111');
            localVideo.play();
          }
        
          createOfferAndSend();
        }
        else if ( msgId === WEBRTC_OFFER_MSG_ID + '') {
          console.log('WEBRTC_ANSWER_MSG_ID');
          const msgJson = JSON.parse(msgCont);

          try {
            onSetRemoteSuccess(pc1, msgJson);
          } catch (e) {
            onSetSessionDescriptionError(e);
          }
        }
        else if ( msgId === WEBRTC_ICE_MSG_ID + '') {
          const msgJson = JSON.parse(msgCont);

          console.log('WEBRTC_ICE_MSG_ID');
          pc1.addIceCandidate(msgJson);
        }
      }
    })
  })
}

// subscribe channel events
function subscribeChannelEvents () {
  const channelEvents = [
    'ChannelMessage',
    'MemberJoined',
    'MemberLeft'
  ]
  channelEvents.forEach((eventName) => {
    agoraClient.agoraChannel.on(eventName, (...args) => {
      console.log('emit ', eventName, args)
    })
  })
}