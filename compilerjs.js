const Compiler = new function() {
	const outhead = [
		// '//# sourceURL=output.js',
		'"use strict";',
		'const puti = (i) => console.log(i);'
	];
	const outtail = [
		'return main();'
	];
	const out = [];
	let outtab = 0;
	let error = '';
	this.prog = '';
	// define checking
	const CHECK_DEF = true;
	let ast = {};
	let defines = [];


	// entry points
	this.run = () => {
		try {
			const fn = Function(this.prog);
			const res = fn();
			console.log(`prog ran. output: ${res}`);
			return res;
		} catch (e) {
			console.error(e);
			return e.message;
			// return`${e.lineNumber}: ${e.message}`;
		}
	};
	this.crun = (prog) => {
		compile(prog);
		return run();
	};
	this.error = () => error;


	// output helpers
	const outp = (line) => out.push(`${'\t'.repeat(outtab)}${line}`);
	const outi = () => outtab++;
	const outj = () => outtab = Math.max(outtab-1, 0);
	

	// main compile
	this.compile = (prog) => {
		out.splice(0), outtab = 0, error = '', ast = prog, defines = [];
		// top level lines
		prog.some(ln => {
			if      (!Array.isArray(ln)) ;
			else if (ln[0] === 'define') return ci_line(ln), error;
			else if (ln[0] === 'defun' ) return ci_func(ln), error;
			return error = `Compiler: expected define or defun`;
		});
		if (error) 
			return this.prog = out.join('\n'), 
				console.error(`Compiler: ${error}`), false;
		// OK
		this.prog = [].concat(outhead, out, outtail).join('\n');
		return true;
	};


	// compiler functions
	const ci_func = (ln) => {
		const name = ln[1].substr(1);
		const args = ln[2].map(a => a[1]);
		outp(`const ${name} = (${args.join(', ')}) => {`);
		outi();
			// function lines
			ln[3].some(l => ( ci_line(l), error ));
			if (error) return true;
			// end function
			if (!/^\s*return/.test(out[out.length-1]))
				outp(`return 0;`);
		outj();
		outp(`}`);
	};

	const ci_line = (ln) => {
		let v;
		switch (ln[0]) {
		case 'define':
			// defines.push(ln[1]);
			v = ln[2] ? c_expr(ln[2]) : 0;
			return outp(`let ${ln[1]} = ${v};`);
		case 'set':
			return outp(`${ln[1]} = ${c_expr(ln[2])};`);
		case 'call':
			return outp(c_call(ln));
		case 'return':
			return outp(`return ${c_expr(ln[1])};`);
		case 'if':
		case 'while':
			v = c_expr(ln[1]);
			if (!v || error) return
			outp(`${ln[0]} (${v}) {`), outi();
			ln[2].some(l => ( ci_line(l), error ));
			return outj(), outp(`}`);
		default:
			// v = `:${typeof ln.str === 'function' ? ln.str() : ln.type}:`;
			error = `unknown input: ${ln[0]}`;
		}
	};

	const c_expr = (expr) => {
		// console.log('expr', expr);
		if (typeof expr === 'string') {
			if (/^[0-9]+$/.test(expr)) 
				return expr; // number
			if (/^\$[A-Za-z]$/.test(expr)) 
				return expr; // identifier
		}
		else if (Array.isArray(expr)) {
			if (expr[0] === 'call')
				return c_call(expr); // call function
			if (/^(\+|\-|\*|\/|==|<|<=|>|>=)$/.test(expr[0]))
				return `(${c_expr(expr[1])} ${expr[0]} ${c_expr(expr[2])})`; // expression
		}
		return  error = `unknown input: ${expr}`;
	};

	const c_call = (call) => {
		const name = call[1].substr(1);
		const args = call[2].map(a => c_expr(a));
		return `${name}(${args.join(', ')})`;

		// if (!CHECK_DEF) {
		// 	const args = call.arguments.map(a => c_expr(a)).join(', ');
		// 	return `${call.name}(${args})`;
		// }
		// // get function
		// const args = call.arguments.map(a => c_expr(a));
		// const fndef = getfunc(call.name, args.length);
		// if (error) return fndef;
		// // calculate args
		// while (args.length < fndef.arguments.length) args.push('0'); // fill missing args
		// return `${call.name}(${args.join(', ')})`;
	};

	const getfunc = (name, arglen) => {
		// // special functions
		// if (name === 'puti')
		// 	return { name:'puti', type:'int', arguments:['i'] };
		// // user defined functions
		// const fndef = ast.functions.find(fn => fn.name === name);
		// if (!fndef) 
		// 	return error = `unknown function: ${name}`, `:${error}:`;
		// // check arguments count
		// if (fndef.arguments.length < arglen)
		// 	return error = `too many arguments: expected ${fndef.arguments.length}`, `:${error}:`;
		// return fndef;
	};

};