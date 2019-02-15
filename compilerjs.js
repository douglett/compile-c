const Compiler = new function() {
	const outhead = [
		'"use strict"',
		'const puti = (i) => console.log(i);'
	];
	const outtail = [
		'return main();'
	];
	const out = [];

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
	

	this.compile = (prog) => {
		out.splice(0);
		// defines
		prog.defines.forEach(d => out.push(c_line(d)));
		// functions
		prog.functions.forEach(fn => {
			out.push(`const ${fn.name} = () => {`);
			fn.lines.forEach(l => out.push('\t' + c_line(l)));
			if (!/^return/.test(out[out.length-1]))
				out.push(`\treturn 0;`);
			out.push(`};`);
		});
		// output
		console.log(out);
		this.prog = [].concat(outhead, out, outtail).join('\n');
		return this.prog;
	};

	
	const c_expr = (expr) => {
		// if (!expr) return 0;
		if (expr.type === 'number') return expr.token;
		if (/^[\+\-\*\/]$/.test(expr.type)) 
			return `(${c_expr(expr.vala)} ${expr.type} ${c_expr(expr.valb)})`;
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
		case 'call':
			return `${ln.name}();`;
		case 'return':
			return `return ${c_expr(ln.val)};`;
		default:
			return `::${ln.type}::`;
		}
	};
};