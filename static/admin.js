const socket = io();

var game = angular.module('net-game', []);
game.controller('AdminController', function($scope, $http) {
	function wrap(i, k) {
		return (i + k) % k;
	}
	function getConnectedNeighbors(n, wrapped = false) {
		let i = n.y;
		let j = n.x;
		let neighbors = {};
		const y = $scope.game.y;
		const x = $scope.game.x;
		let node = $scope.game.grid[i][j];
		if (wrapped === true) {
			if (node.U && $scope.game.grid[wrap(i-1,y)][j].D) { neighbors.U = {x: j, y: wrap(i - 1, y)}; }
			if (node.R && $scope.game.grid[i][wrap(j+1,x)].L) { neighbors.R = {x: wrap(j + 1, x), y: i}; }
			if (node.D && $scope.game.grid[wrap(i+1,y)][j].U) { neighbors.D = {x: j, y: wrap(i + 1, y)}; }
			if (node.L && $scope.game.grid[i][wrap(j-1,x)].R) { neighbors.L = {x: wrap(j - 1, x), y: i}; }
			return neighbors;
		} else {
			if (i > 0 && node.U && $scope.game.grid[i-1][j].D) { neighbors.U = {x: j, y: i - 1}; }
			if (j < x - 1 && node.R && $scope.game.grid[i][j+1].L) { neighbors.R = {x: j+1, y: i}; }
			if (i < y - 1 && node.D && $scope.game.grid[i+1][j].U) { neighbors.D = {x: j, y: i + 1}; }
			if (j > 0 && node.L && $scope.game.grid[i][j-1].R) { neighbors.L = {x: j - 1, y: i}; }
			return neighbors;			
		}
	}
	function updateActive() {
		// start with server location
		const y = $scope.game.y;
		const x = $scope.game.x;
		const server = {x: Math.floor(x/2), y: Math.floor(y/2)};
		// disable all
		for (let i = y - 1; i >= 0; i--) {
			for (let j = x - 1; j >= 0; j--) {
				$scope.game.grid[i][j].active = false;
			}
		}
		$scope.game.grid[server.y][server.x].active = true;
		$scope.lit = 0;

		let visited = [...Array(y)].map(() => Array(x));
		let listToExplore = [ server ];

		visited[server.y][server.x] = true;

		while ( listToExplore.length > 0 ) {
			let current = listToExplore.pop();
			let neighbors = getConnectedNeighbors(current, $scope.game.wrapped);
			// for all connected neighbors
			Object.keys(neighbors).forEach( key => {
				let child = neighbors[key];
				if ( !visited[child.y][child.x] ) listToExplore.push(child);
				visited[child.y][child.x] = true;
				$scope.game.grid[child.y][child.x].active = true;
			} );
		}
		let summator = (a,c)=>a+c;
		
		$scope.lit = visited.map(x=>x.reduce(summator,0)).reduce(summator);
	}

	$scope.startNewGame = function() {
		if ($scope.newGameForm.$invalid) { return; }
		socket.emit('newGame', {
			key: 'somewhatsecret',
			x: $scope.newx,
			y: $scope.newy,
			wrapped: $scope.newWrapped
		});
	};
	$scope.requestShuffle = function() {
		socket.emit('shuffle', {
			key: 'somewhatsecret'
		});
	};
	$scope.loadGameStatistics = function() {
		$http.get('/game-statistics')
			.then(res => res.data)
			.then(res => $scope.gameStatistics = res);
	};

	socket.on('gameState', function(data) {
		$scope.$apply(() => $scope.game = data);
		$scope.$apply(() => updateActive());
	});	
	socket.on('disconnect', function() {
		alert('Socket is down.');
	});

	// defaults
	$scope.newx = 5;
	$scope.newy = 5;
	$scope.newWrapped = false;
	$scope.gameStatistics = [];
	$scope.loadGameStatistics();
});

game.directive('color', function() {
	return {
		restrict: 'E', // Element directive
		scope: { c: '=colorData' },
		template: '<div class="color-square" style="background:{{c.rgb}}"></div><span>{{c.count}}</span>'
	};
});
