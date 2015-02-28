"use strict";

var PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;

var isChrome = !!navigator.webkitGetUserMedia;
var STUN = {
    url: isChrome 
       ? 'stun:stun.l.google.com:19302' 
       : 'stun:23.21.150.121'
};

var iceServers = {
   iceServers: [STUN]
};

function RTCConnection(signal_client) {
	this._signalClient = signal_client;
    this._peerState = 'uninit_server';
}

function RTCConnection(nodeobj, requested_id) {
	this._nodeObj = nodeobj;
	this._requestedId = requested_id;
	this._peerState = 'uninit_client';
}

RTCConnection.prototype._createChannelCallbacks = function() {
	this._dataChannel.onmessage = function (event) {
        console.log('received a message:' + event.data);
    }.bind(this);
    this._dataChannel.onopen = function () {
    	this._peerState = 'connected';
    	this._dataChannel.send('channel opened message');
    	console.log('channel created');
    }.bind(this);
    this._dataChannel.onclose = function (e) {
        console.error(e);
    }.bind(this);
    this._dataChannel.onerror = function (e) {
        console.error(e);
    }.bind(this);
};

RTCConnection.prototype._createOffer = function(send_funct, accept_callback) {
	if (this._peerState === 'uninit') {
		this._peerState = 'connecting';

		this._signalClient.addServerAcceptCallback(function(data) { 
			this._peerState = 'awaiting channel open'; //still need send postaccept
			if (!data.first) {
				this._peerConnection.addIceCandidate(new IceCandidate({
		            'sdpMLineIndex': data.candidate.sdpMLineIndex,
		            'candidate' : data.candidate.candidate
    			}));
				this._peerConnection.setRemoteDescription(new SessionDescription(data.answer));
			}

			accept_callback('accept', data);
		}.bind(this));

		this._peerConnection = new PeerConnection(iceServers);
		this._dataChannel = this._peerConnection.createDataChannel('RTCDataChannel', {});
		this._createChannelCallbacks();

		this._peerConnection.createOffer(function (sessionDescription) {
			this._peerState = 'awaiting accept';
		    this._peerConnection.setLocalDescription(sessionDescription);
		    this._peerConnection.onicecandidate = function(e) {
			    if(e.candidate !== null) {
			        send_funct({ 'message_type': 'request', 'request_type' : 'rtc', 
		    			'offer': this._peerConnection.localDescription, 'candidate': e.candidate } );
			    }
			    this._peerConnection.onicecandidate = null;
			}.bind(this);
		}.bind(this), function(error) {
		    alert(error);
		}, {
    		optional: [], mandatory: { OfferToReceiveAudio: false,  OfferToReceiveVideo: false }
		});
	}
}

RTCConnection.prototype._createOffer = function(send_funct) {
	var node_id = offer_data.node_id;
	this._peerState = 'creating answer';
	this._peerConnection = new PeerConnection(iceServers);
	this._peerConnection.ondatachannel = function (e) {
		this._dataChannel = e.channel;
    	this._createChannelCallbacks();
	}.bind(this);

	this._peerConnection.setRemoteDescription(new SessionDescription(offer_data.offer));
	this._peerConnection.addIceCandidate(new IceCandidate({
            'sdpMLineIndex': offer_data.candidate.sdpMLineIndex,
            'candidate' : offer_data.candidate.candidate
    }));

	this._peerConnection.createAnswer(function (sessionDescription) {
		this._peerState = 'awaiting postaccept';
		this._peerConnection.setLocalDescription(sessionDescription);
		this._peerConnection.onicecandidate = function(e) {
			if(e.candidate !== null) {	
				send_funct({'message_type': 'accept', 'requesting_node' : node_id, 
								 'answer': this._peerConnection.localDescription, 'candidate' : e.candidate});
			}
			this._peerConnection.onicecandidate = null;
		}.bind(this);
	}.bind(this), function(error) {
		alert(error);
	}, {
    	
};

RTCConnection.prototype.acceptRequestFromServer = function(offer_data) {
	var node_id = offer_data.node_id;
	this._peerState = 'creating answer';
	this._peerConnection = new PeerConnection(iceServers);
	this._peerConnection.ondatachannel = function (e) {
		this._dataChannel = e.channel;
    	this._createChannelCallbacks();
	}.bind(this);

	this._peerConnection.setRemoteDescription(new SessionDescription(offer_data.offer));
	this._peerConnection.addIceCandidate(new IceCandidate({
            'sdpMLineIndex': offer_data.candidate.sdpMLineIndex,
            'candidate' : offer_data.candidate.candidate
    }));

	this._peerConnection.createAnswer(function (sessionDescription) {
		this._peerState = 'awaiting postaccept';
		this._peerConnection.setLocalDescription(sessionDescription);
		this._peerConnection.onicecandidate = function(e) {
			if(e.candidate !== null) {	
				this._signalClient.sendServerData({'message_type': 'accept', 'requesting_node' : node_id, 
								 'answer': this._peerConnection.localDescription, 'candidate' : e.candidate});
			}
			this._peerConnection.onicecandidate = null;
		}.bind(this);
	}.bind(this), function(error) {
		alert(error);
	}, {
    	optional: [], mandatory: { OfferToReceiveAudio: false,  OfferToReceiveVideo: false }
	});
}

RTCConnection.prototype.requestConnectionFromServer = function(accept_callback) {
	if (this._peerState === 'uninit') {
		this._peerState = 'connecting';

		this._signalClient.addServerAcceptCallback(function(data) { 
			this._peerState = 'awaiting channel open'; //still need send postaccept
			if (!data.first) {
				this._peerConnection.addIceCandidate(new IceCandidate({
		            'sdpMLineIndex': data.candidate.sdpMLineIndex,
		            'candidate' : data.candidate.candidate
    			}));
				this._peerConnection.setRemoteDescription(new SessionDescription(data.answer));
			}

			accept_callback('accept', data);
		}.bind(this));

		this._peerConnection = new PeerConnection(iceServers);
		this._dataChannel = this._peerConnection.createDataChannel('RTCDataChannel', {});
		this._createChannelCallbacks();

		this._peerConnection.createOffer(function (sessionDescription) {
			this._peerState = 'awaiting accept';
		    this._peerConnection.setLocalDescription(sessionDescription);
		    this._peerConnection.onicecandidate = function(e) {
			    if(e.candidate !== null) {
			        this._signalClient.sendServerData({ 'message_type': 'request', 'request_type' : 'rtc', 
		    			'offer': this._peerConnection.localDescription, 'candidate': e.candidate } );
			    }
			    this._peerConnection.onicecandidate = null;
			}.bind(this);
		}.bind(this), function(error) {
		    alert(error);
		}, {
    		optional: [], mandatory: { OfferToReceiveAudio: false,  OfferToReceiveVideo: false }
		});
	}
};

RTCConnection.prototype.sendMessage = function(msg) {
	if (this._peerState === 'connected') {
		this._dataChannel.send(msg);
	}
};