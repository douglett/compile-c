const Compiler = new function() {
	const outhead = [
		'"use strict"',
		'const puti = (i) => console.log(i);'
	];
	const outtail = [
		'return main();'
	];
	const out = [];
	let error = '';
	this.prog = '';
	// define checking
	const CHECK_DEF = true;
	let ast = {};
	let defines = [];


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
	

	this.compile = (prog) => {
		out.splice(0), error = '', ast = prog, defines = [];
		// defines
		prog.defines.forEach(d => out.push(c_line(d)));
		const defstart = defines.length;
		// functions
		prog.functions.some(fn => {
			const args = fn.arguments.map(a => a.name);
			out.push(`const ${fn.name} = (${args.join(', ')}) => {`);
			defines = defines.slice(0, defstart).concat(args); // update defines list with function arguments
			// function lines
			fn.lines.some(l => ( out.push('\t' + c_line(l)), error ));
			if (error) return true;
			// end function
			if (!/^\s*return/.test(out[out.length-1]))
				out.push(`\treturn 0;`);
			out.push(`};`);
		});
		// output
		console.log(out);
		// error
		if (error) {
			this.prog = out.join('\n');
			return console.error(`Compiler: ${error}`), false;
		}
		this.prog = [].concat(outhead, out, outtail).join('\n');
		return true;
	};

	
	const c_expr = (expr) => {
		if (expr.type === 'number') 
			return expr.token;
		if (expr.type === 'word') {
			if (CHECK_DEF && defines.indexOf(expr.token) === -1)
				return error = `undefined: ${expr.token}`, `:${error}:`; // check if defined
			return expr.token; // identifier
		}
		if (expr.type === 'call')
			return c_call(expr); // call function
		if (/^[\+\-\*\/]$/.test(expr.type)) 
			return `(${c_expr(expr.vala)} ${expr.type} ${c_expr(expr.valb)})`;
		// error
		const v = `:${typeof expr.str === 'function' ? expr.str() : expr.type}:`;
		return error = `unknown input: ${v}`, v;
	};

	const c_line = (ln) => {
		let v;
		switch (ln.type) {
		case 'define':
			defines.push(ln.name);
			v = ln.val ? c_expr(ln.val) : 0;
			return `let ${ln.name} = ${v};`;
		case 'assign':
			return `${ln.name} = ${c_expr(ln.val)};`;
		case 'expression':
			return `${c_expr(ln.val)};`;
		case 'return':
			return `return ${c_expr(ln.val)};`;
		default:
			v = `:${typeof ln.str === 'function' ? ln.str() : ln.type}:`;
			error = `unknown input: ${v}`;
			return v;
		}
	};

	const c_call = (call) => {
		if (!CHECK_DEF) {
			const args = call.arguments.map(a => c_expr(a)).join(', ');
			return `${call.name}(${args})`;
		}
		// get function
		const args = call.arguments.map(a => c_expr(a));
		const fndef = getfunc(call.name, args.length);
		if (error) return fndef;
		// calculate args
		while (args.length < fndef.arguments.length) args.push('0'); // fill missing args
		return `${call.name}(${args.join(', ')})`;
	};

	const getfunc = (name, arglen) => {
		// special functions
		if (name === 'puti')
			return { name:'puti', type:'int', arguments:['i'] };
		// user defined functions
		const fndef = ast.functions.find(fn => fn.name === name);
		if (!fndef) 
			return error = `unknown function: ${name}`, `:${error}:`;
		// check arguments count
		if (fndef.arguments.length < arglen)
			return error = `too many arguments: expected ${fndef.arguments.length}`, `:${error}:`;
		return fndef;
	};

};