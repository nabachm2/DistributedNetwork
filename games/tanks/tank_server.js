"use strict";

var RDBCentralServer = require('./../../central_server/server/rdb_central_server.js');

var UPDATE_RATE = 50;
var POSSIBLE_COLORS = {0: '#C80000', 1: '#FF9933', 2: '#003399', 3: '#218C8D', 4: '#6C2D58', 5: '#408020'};

function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i --) arr[length-1 - i] = createArray.apply(this, args);
    }
    return arr;
}

function TankServer(port) {
	this._server = new RDBCentralServer(port, { size: { width: 2000, height: 2000 } };
						
	this._server.onrequest = function(data) { return this._handleOnRequest(data); }.bind(this);
	this._server.onupdate = function(id, message.data) { 
		if (typeof newdata.loc !== 'undefined')
			this._server.updateState(key, { u: { loc: { x: newdata.loc.x, y: newdata.loc.y } } });
	}.bind(this);
	this._server.onclose = function() { }
	this._server.verifyupdate = function(newdata, olddata, id) { 
		return true;
	}.bind(this);

	this._server.startServer();
	setInterval(function() { this._updateStates(); }.bind(this), UPDATE_RATE);
}

TankServer.prototype._updateStates = function() {
    this._server.pushUpdate();
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

TankServer.prototype._handleOnRequest = function(data) {
	var p = this._findSpot();
	return { loc: { x: p.x, y: p.y };
}

TankServer.prototype._findSpot = function(size) {
	var ss = this._server.states.server;
	while (true) {
		var x = getRandomInt(0, ss.size.width);
		var y = getRandomInt(0, ss.size.height);
		var bad = false;
		for (var i = 0;i < size + 4;i ++)
			if (x + i > ss.width || this._board[x + i][y] != 0)
				bad = true;

		if (!bad) { return { x: x, y: y }; }
	}
};

var server = new TankServer(8080);