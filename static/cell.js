(function(exports){

	// your code goes here

	exports.Cell = class Cell {
		constructor(sideU, sideR, sideD, sideL, color = "#000000", active = false) {
			this.U = sideU;
			this.R = sideR;
			this.D = sideD;
			this.L = sideL;
			this.active = active;
			this.color = color;
		}
		rotate() {
			[this.U, this.R, this.D, this.L] = [this.L, this.U, this.R, this.D];
		}
		getClasses() {
			let className = "";
			if (this.U === true) {
				className += " u";
			}

			if (this.R === true) {
				className += " r";
			}

			if (this.D === true) {
				className += " d";
			}

			if (this.L === true) {
				className += " l";
			}

			if (this.active === true) {
				className += " a";
			}
			return className;
		}
	}

})(typeof exports === 'undefined'? window: exports);
