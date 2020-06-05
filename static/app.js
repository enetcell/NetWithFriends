const socket = io();

var solved = false;

var game = angular.module('net-game', []);
game.controller('GameBoardController', function($scope, $rootScope)
{
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
		if (!solved && $scope.lit === $scope.game.x * $scope.game.y) {
			solved = true;
			socket.emit('solved', $scope.game.id);
			$rootScope.$broadcast('solved');
		}
	}

	function pushRotation(i, j) {
		let c = {
			x: j,
			y: i,
			cell: $scope.game.grid[i][j]
		};
		socket.emit('change', c);
	}
	$scope.rotate = function($event, i, j) {
		//let element = angular.element($event.currentTarget);
		let cell = $scope.game.grid[i][j];
		cell.color = $scope.userColor;
		cell.rotate();
		pushRotation(i,j);
		//addChange(i,j);
		updateActive();
	};
	$scope.rerollColor = function() {
		$scope.userColor = randomColor();
	};
	$scope.game = {};
	$scope.lit = 0;
	$scope.cellSize = 30;
	$scope.userColor = randomColor();
	$scope.borderStyle = '1px dotted';

	socket.on('changeBroadcast', function(data) {
		let cell = data.cell;
		Object.setPrototypeOf(cell, Cell.prototype);
		$scope.$apply(() => {
			$scope.game.grid[data.y][data.x] = cell;
			updateActive();
		});
	});

	socket.on('gameState', function(data) {
		if (data.id !== $scope.game.id) { solved = false; }
		for (let i = data.y - 1; i >= 0; i--) {
			for (let j = data.x - 1; j >= 0; j--) {
				//let x = data.grid[i][j];
				//data.grid[i][j] = new Cell(x.U, x.R, x.D, x.L, x.active);
				Object.setPrototypeOf(data.grid[i][j], Cell.prototype);
			}
		}

		$scope.$apply(() => {
			$scope.game = data;
			updateActive();
		});
	});
});

game.controller('ScoreController', function($scope, $http) {
	function loadScore() {
		$http.get('/history')
			.then(res => res.data)
			.then(res => $scope.previousGames = res);
	}
	$scope.$on('solved', function(event, args) {
		setTimeout(()=>loadScore(),1000);
	});
	$scope.previousGames = [];
	loadScore();
});

game.directive('color', function() {
	return {
		restrict: 'E', // Element directive
		scope: { c: '=colorData' },
		template: '<div class="color-square" style="background:{{c.rgb}}"></div><span>{{c.count}}</span>'
	};
});

game.directive('game', function() {
	return {
		restrict: 'E', // Element directive
		scope: { g: '=gameData' },
		template: `<span>{{g.id}}: {{g.x}} x {{g.y}} {{g.wrapped?'wrapped':'nonwrapped'}}, {{g.solveTime.h}} hours, {{g.solveTime.m}} minutes, {{g.solveTime.s}} seconds</span>` +
		          `<div class="color-panel"><color ng-repeat="c in g.colors" color-data="c"></color></div>`
	};
});
////
