"use strict";

var RDBCentralServer = require('./../../central_server/server/rdb_central_server.js');

var UPDATE_RATE = 100;

function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i --) arr[length-1 - i] = createArray.apply(this, args);
    }
    return arr;
}

function SnakeServer(port) {
	this._server = new RDBCentralServer(port, { size: { width: 80, height: 80 }, 
											walls: { 0: { sx: 0, sy: 0, count: 80, dx: 1, dy: 0 }, 
													 1: { sx: 0, sy: 0, count: 80, dx: 0, dy: 1 },
													 2: { sx: 79, sy: 0, count: 80, dx: 0, dy: 1 },
													 3: { sx: 0, sy: 79, count: 80, dx: 1, dy: 0 }},
											'-1': { x: 4, y: 4 }});
	this._server.onrequest = function(data) { return this._handleOnRequest(data); }.bind(this);
	this._server.onupdate = function() { };
	this._server.onclose = function() { }
	this._server.verifyupdate = function(newdata, olddata) { 
		return Math.abs(newdata.dx) <= 1 && Math.abs(newdata.dy) <= 1 && //check invalid dx,dy
					!(newdata.dx != 0 && -newdata.dx == olddata.dx) && //check backtracking
					!(newdata.dy != 0 && -newdata.dy == olddata.dy);
	}.bind(this);

	this._createBoard();
	this._server.startServer();
	setInterval(function() { this._updateStates(); }.bind(this), UPDATE_RATE);
}

SnakeServer.prototype._createBoard = function() {
	var ss = this._server.states.server;	
	this._board = createArray(ss.size.width, ss.size.height);
	for (var x = 0;x < ss.size.width;x ++)
		for (var y = 0;y < ss.size.height;y ++)
			this._board[x][y] = 0;

	for (var wall_id in ss.walls) {
		var wall = ss.walls[wall_id];
		var x = wall.sx; var y = wall.sy;
		for (var count = 0;count < wall.count;count ++) {
			this._board[x][y] = 1;
			x += wall.dx; y += wall.dy;
		}
	}
	this._board[4][4] = -1;
}

SnakeServer.prototype._createCrumb = function(id) {
	var ss = this._server.states.server;
	var x = (Math.floor(Math.random() * (ss.size.width - 1 + 1)) + 1);
	var y = (Math.floor(Math.random() * (ss.size.height - 1 + 1)) + 1);
	this._board[x][y] = id;
	return {x: x, y: y};
}

SnakeServer.prototype._updateStates = function() {
	for (var key in this._server.states) {
        if (this._server.states.hasOwnProperty(key) && key !== 'server') {
        	var state = this._server.states[key];
        	var client_state = this._server.states[key].client_data;
        	var start_i = state['start'];
        	var end_i = state['end'];

        	var newx = state[start_i].x + client_state.dx;
        	var newy = state[start_i].y + client_state.dy;

        	if (state.killed == 0) {
        	//clear end of tail on server board
	        	this._board[state[end_i].x][state[end_i].y] = 0;
	        	if (this._board[newx][newy] < 0) { //HANDLE HIT CRUMB
	        		this._server.states[key].expanding = 3; //expand
	        		var update = { u: {} };
	        		update.u[this._board[newx][newy]] = this._createCrumb(this._board[newx][newy]);
	        		this._server.updateState('server', update ); //create new crumb and push update
	        	} else if (this._board[newx][newy] != 0) { //HANDLE HIT SOMETHING
	        		this._server.updateState(key, { 'u': { killed: -1, color: '#C8C8C8' } });
	        		continue;
	        	}

	        	this._board[newx][newy] = 1; //set new head
	        	var update = { 'u': { start: start_i + 1, end: end_i + 1 }, d: {} };
	        	if (this._server.states[key].expanding <= 0) { //if we are not expanding delete old tail
	        		update['d'][end_i] = true;
	        	} else {
	        		this._server.states[key].expanding --; //otherwise just let tail be
	        		update.u.end = end_i;
	        	}

	        	update['u'][start_i + 1] = { x: newx, y: newy };
	            this._server.updateState(key, update);
        	} else if (state.killed < 0) {
        		this._server.updateState(key, { 'u': { killed: state.killed - 1 } });
        		console.log(state.killed);
        		if (state.killed == -50) {
        			console.log('killing');
        			this._server.purgeState(key);
        		}
        	}
        }
    }
    this._server.pushUpdate();
}

SnakeServer.prototype._handleOnRequest = function(data) {
	var yval = (Math.floor(Math.random() * (50 - 2 + 1)) + 2);
	return { '1': {x: 7, y: yval }, '2': {x: 8, y: yval }, '3': {x: 9, y: yval }, '4': {x: 10, y: yval }, 
			expanding: 0, start: 4, end: 1, client_data: { dx: 1, dy: 0 }, color: '#C80000', killed: 0 };
};

var server = new SnakeServer(8080);