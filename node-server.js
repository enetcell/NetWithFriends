const http = require('http');
const path = require('path');
const express = require('express');
const socketIO = require('socket.io'); 

const SECRET_KEY = 'somewhatsecret';
const SERVER_PORT = 5000;

let Cell = require('./static/cell').Cell;

function shuffleBoard() {
	for (let i = currentGame.y - 1; i >= 0; i--) {
		for (let j = currentGame.x - 1; j >= 0; j--) {
			let n = Math.floor(Math.random()*4)+1;
			for (var k = n - 1; k >= 0; k--) {
				currentGame.grid[i][j].rotate();
			}
		}
	}
}
function shuffle(a) {
	var j, x, i;
	for (i = a.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1));
		x = a[i];
		a[i] = a[j];
		a[j] = x;
	}
	return a;
}
function isSet(grid, i, j) {
	try {
		var node = grid[i][j];
	}
	catch (e) {
		return true;
	}
	if (node === undefined) { return true; }
	return node.U === true ||
		   node.R === true ||
		   node.D === true ||
		   node.L === true;
}
function expand(grid, i, j) {
	//console.log(JSON.stringify(grid));
	//console.log(i + " " + j);
	let node = grid[i][j];
	let possibilities = [];
	if (node.U === false && !isSet(grid,i-1,j)) {
		possibilities.push('U');
	}
	if (node.R === false && !isSet(grid,i,j+1)) {
		possibilities.push('R');
	}
	if (node.D === false && !isSet(grid,i+1,j)) {
		possibilities.push('D');
	}
	if (node.L === false && !isSet(grid,i,j-1)) {
		possibilities.push('L');
	}
	if (possibilities.length > 2) { 
		shuffle(possibilities);
		possibilities.pop(); 
	}

	//console.log(possibilities);
	let next = [];
	for (let p of possibilities) {
		node[p] = true;
		switch (p) {
		case 'U':
			grid[i-1][j].D = true;
			next.push([i-1, j]);
			break;
		case 'R':
			grid[i][j+1].L = true;
			next.push([i, j+1]);
			break;
		case 'D':
			grid[i+1][j].U = true;
			next.push([i+1, j]);
			break;
		case 'L':
			grid[i][j-1].R = true;
			next.push([i, j-1]);
			break;
		}
	}
	return next;
}

function wrap(i, k) {
	return (i + k) % k;
}

function expandWrapped(grid, i, j) {
	//console.log(JSON.stringify(grid));
	//console.log(i + " " + j);
	const y = grid.length;
	const x = grid[0].length;
	
	let node = grid[i][j];
	let possibilities = [];
	if (node.U === false && !isSet(grid,wrap(i-1,y),j)) {
		possibilities.push('U');
	}
	if (node.R === false && !isSet(grid,i,wrap(j+1,x))) {
		possibilities.push('R');
	}
	if (node.D === false && !isSet(grid,wrap(i+1,y),j)) {
		possibilities.push('D');
	}
	if (node.L === false && !isSet(grid,i,wrap(j-1,x))) {
		possibilities.push('L');
	}
	if (possibilities.length > 2) { 
		shuffle(possibilities);
		possibilities.pop(); 
	}

	//console.log(possibilities);
	let next = [];
	for (let p of possibilities) {
		node[p] = true;
		switch (p) {
		case 'U':
			grid[wrap(i-1,y)][j].D = true;
			next.push([wrap(i-1,y), j]);
			break;
		case 'R':
			grid[i][wrap(j+1,x)].L = true;
			next.push([i, wrap(j+1,x)]);
			break;
		case 'D':
			grid[wrap(i+1,y)][j].U = true;
			next.push([wrap(i+1,y), j]);
			break;
		case 'L':
			grid[i][wrap(j-1,x)].R = true;
			next.push([i, wrap(j-1,x)]);
			break;
		}
	}
	return next;
}

function constructGrid(x, y, wrapped = false) {
	let grid = [...Array(y)].map(() => Array(x).fill()
		.map(() => new Cell(false,false,false,false)));
	let mx = Math.floor(x/2);
	let my = Math.floor(y/2);
	
	
	if (wrapped === true) {
		let next = shuffle(expandWrapped(grid,my,mx));
		while (next.length > 0) {
			let node = next[0];
			next.shift();
			next = shuffle(next.concat(expandWrapped(grid,node[0],node[1])));
		  }
		return grid;
	} else {
		let next = shuffle(expand(grid,my,mx));
		while (next.length > 0) {
			let node = next[0];
			next.shift();
			next = shuffle(next.concat(expand(grid,node[0],node[1])));
		  }
		return grid;
	}
}

class Game {
	constructor(x, y, wrapped = false) {
		this.id = Math.random().toString(36).substr(2, 5);
		this.updateTimestamp();
		this.grid = constructGrid(x, y, wrapped);
		this.wrapped = wrapped;
		this.x = x;
		this.y = y;
		this.players = 0;
	}
	updateTimestamp() {
		this.timestamp = + new Date(); 
	}
}

var currentGame = null;
var previousGames = [];

function startGame(x, y, wrapped = false) {
	let players = 0;
	if (currentGame) players = currentGame.players || 0; 
	currentGame = new Game(x, y, wrapped);
	currentGame.players = players;
	shuffleBoard();
}

function applyChange(c) {
	if ((0 <= c.y && c.y <= currentGame.y) &&
		(0 <= c.x && c.x <= currentGame.x )) {
		   currentGame.grid[c.y][c.x] = c.cell;
		   Object.setPrototypeOf(currentGame.grid[c.y][c.x], Cell.prototype);
		   return true;
	} else {
		return false;
	}
}

function countColors() {
	let result = {};
	for (let i = 0; i < currentGame.grid.length; i++) {
		for (var j = 0; j < currentGame.grid[i].length; j++) {
			let color = currentGame.grid[i][j].color;
			if (result.hasOwnProperty(color)) {
				result[color]++;
			} else {
				result[color] = 1;
			}
		}
	}
	result = Object.keys(result).map(key => ({rgb: key, count: result[key]}));
	result = result.sort((a,b) => b.count - a.count);
	return result;
}

// default game
startGame(7,7, true);

const app = express();
const server = http.Server(app);
const io = socketIO(server);

app.set('port', SERVER_PORT);
app.use('/static', express.static(__dirname + '/static'));

app.route('/history').get(function (req, res) {
	res.send(previousGames);
});
app.route('/game-statistics').get(function (req, res) {
	res.send(countColors());
});

// Static pages
app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/control-center', function(request, response) {
	response.sendFile(path.join(__dirname, 'admin.html'));
});

// Starts the server.
server.listen(SERVER_PORT, function() {
	console.log('Starting socket server on port '+SERVER_PORT);
});

// Add the WebSocket handlers
io.on('connection', function(socket) {
	currentGame.players++;
	console.log('players: ' + currentGame.players);
	socket.emit('gameState', currentGame);

	socket.on('change', function(data) {
		if (applyChange(data) === true) {
			// broadcast to everyone except sender
			socket.broadcast.emit('changeBroadcast', data);
		}
	});
	socket.on('newGame', function(data) {
		if (data.key === SECRET_KEY) {
			startGame(data.x, data.y, data.wrapped);
			transmitGameField();
		}
	});
	socket.on('shuffle', function(data) {
		if (data.key === SECRET_KEY) {
			shuffleBoard();
			transmitGameField();
		}
	});
	socket.on('solved', function(data) {
		function timeDifference(diff) {
			let hours = Math.floor(diff / (1000 * 60 * 60));
			diff -= hours * (1000 * 60 * 60);

			let mins = Math.floor(diff / (1000 * 60));
			diff -= mins * (1000 * 60);

			let seconds = Math.floor(diff / (1000));
			diff -= seconds * (1000);

			return {h: hours, m: mins, s: seconds};
		}
		for (let g of previousGames) {
			if (g.id === data) return;
		}
		previousGames.push({
			id: currentGame.id,
			x: currentGame.x,
			y: currentGame.y,
			wrapped: currentGame.wrapped,
			solveTime: timeDifference(+ new Date() - currentGame.timestamp),
			colors: countColors()
		});
		setTimeout(() => startGame(currentGame.x, currentGame.y, currentGame.wrapped), 1000*10);
	});
	socket.on('reconnect', () => {
		currentGame.players++;
		console.log('players: ' + currentGame.players);
	});
	socket.on('disconnect', function() {
		currentGame.players--;
		if (currentGame.players < 0) { currentGame.players = 0; }
	});
});

function transmitGameField() {
	io.sockets.emit('gameState', currentGame);
}
setInterval(function() {
	transmitGameField();
}, 1000 * 5);