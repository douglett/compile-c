const Compiler = new function() {
	let error = null;
	let output = [ 'module', '$mymodule' ];

	this.error = () => error;

	this.compile = (prog) => {
		console.log(prog);
		try {
			compile(prog);
		}
		catch (e) {
			console.error(e);
			error = e;
		}
		this.prog = to_brackets(output);
	};


	const compile = (prog) => {
		prog.forEach((ln, i) => {
			if      (!Array.isArray(ln)) throw "expected list in main";
			else if (ln[0] === 'declare') ;
			else if (ln[0] === 'define' ) c_declare(ln, output);
			else if (ln[0] === 'data'   ) c_data(ln, output);
			else if (ln[0] === 'defun'  ) c_func(ln, output);
			else    throw `Compiler: expected define or defun (${i})`;
		});
	};

	const c_declare = (ls, out) => {
		// console.log('declare', ls);
		const def = [ 'global', ls[1], 'i32' ];
		out.push(def);
		if (ls[2]) c_expr(ls[2], def);
		else def.push([ 'i32.const', '0' ]);
	};
	const c_data = (ls, out) => {
		// console.log('data', ls);
	};
	const c_func = (ls, out) => {
		console.log('func', ls);
		const def = [ 'func', ls[1].replace('@', '$') ];
		out.push(def);
		// arguments
		ls[2].forEach(l => def.push([ 'param', l[1], 'i32' ]));
		def.push([ 'result', 'i32' ]);
		// contents
		console.log(ls[3]);

	};
	const c_expr = (ls, out) => {
		// console.log('expr', ls);
		out.push([ 'i32.const', ls ]);
	};


	const to_brackets = (list) => {
		let out = '';
		function show(list, indent) {
			out += `${'\t'.repeat(indent)}(`;
			let lastarr = 0;
			list.forEach((k, i) => {
				if (Array.isArray(k)) 
					out += `\n`, lastarr = 1, show(k, indent+1);
				else if (lastarr)
					out += `\n${'\t'.repeat(indent+1)}${k}`, lastarr = 0;
				else
					out += (i > 0 ? ' ' : '') + k;
			});
			out += ')'
		}
		show(list, 0);
		return out;
	};

};