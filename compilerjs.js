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


	this.run = () => {
		const fn = Function(this.prog);
		const res = fn();
		console.log(`prog ran. output: ${res}`);
		return res;
	};
	this.crun = (prog) => {
		compile(prog);
		return run();
	};
	this.error = () => error;
	

	this.compile = (prog) => {
		out.splice(0), error = '';
		// defines
		prog.defines.forEach(d => out.push(c_line(d)));
		// functions
		prog.functions.some(fn => {
			const args = fn.arguments.map(a => a.name).join(', ');
			out.push(`const ${fn.name} = (${args}) => {`);
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
		if (!expr) ;
		else if (expr.type === 'number') 
			return expr.token;
		// if (expr.type === 'word') 
		// 	return expr.token;
		else if (/^[\+\-\*\/]$/.test(expr.type)) 
			return `(${c_expr(expr.vala)} ${expr.type} ${c_expr(expr.valb)})`;
		// error
		const v = `:${typeof expr.str === 'function' ? expr.str() : expr.type}:`;
		error = `unknown input: ${v}`;
		return '???';
	};

	const c_line = (ln) => {
		let v;
		switch (ln.type) {
		case 'define':
			v = ln.val ? c_expr(ln.val) : 0;
			return `let ${ln.name} = ${v};`;
		case 'assign':
			return `${ln.name} = ${c_expr(ln.val)};`;
		// case 'val':
		// 	return `${c_expr(ln.val)};`;
		case 'call':
			return `${ln.name}();`;
		case 'return':
			return `return ${c_expr(ln.val)};`;
		default:
			v = `:${typeof ln.str === 'function' ? ln.str() : ln.type}:`;
			error = `unknown input: ${v}`;
			return v;
		}
	};
};