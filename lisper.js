'use strict';

const Lisper = new function() {
	let error = '', pos = 0;
	let list = [];
	
	this.validateList = (ls) => {
		list = [];
		const flatten = (l) => {
			if (l instanceof Array)
				list.push('('),
				l.forEach(l => flatten(l)),
				list.push(')');
			else
				list.push(l);
		};
		ls.forEach(l => flatten(l));
		validate();
	};
	this.validate = (ls) => {
		list = ls;
		validate();
	};
	this.error = () => error;


	const validate = () => {
		console.log(list);
		error = '', pos = 0;
		while (pos < list.length) 
			if      (error) break;
			else if (v_define()) ;
			else if (v_defun()) ;
			else if (!error) error = `script: expected define or defun`;
		console.log(error, pos);
	};

	// short validators
	const v_lstart  = () => list[pos] === '(' ? (++pos, true) : false;
	const v_lend    = () => list[pos] === ')' ? (++pos, true) : false;
	const v_varid   = () => /^\$[A-Za-z_][A-Za-z0-9_]*$/.test(list[pos]) ? (++pos, true) : false;
	const v_funcid  = () => /^\@[A-Za-z_][A-Za-z0-9_]*$/.test(list[pos]) ? (++pos, true) : false;
	const v_num     = () => /^[0-9]+$/.test(list[pos]) ? (++pos, true) : false;


	const v_atom = () => {
		typeof list[pos] === 'string' && list[pos] !== '(' && list[pos] !== ')'
			? (++pos, true) : false;
	};
	const v_list = () => {
		if (!v_lstart()) return false;
		// debugger
		while (pos < list.length)
			if      (list[pos] === ')') break;
			else if (v_list() || v_atom()) ;
			else    return false;
		if (!v_lend()) return false;
		return true;
	};


	const v_define = () => {
		if (list[pos] !== '(' || list[pos+1] !== 'define') return false;
		pos += 2;
		if (!v_varid()) return error = `define: expected variable name`, false;
		if (!v_expr() && error) return false;
		if (!v_lend()) return error = `define: expected list end`, false;
		return true;
	};


	const v_defun = () => {
		if (list[pos] !== '(' || list[pos+1] !== 'defun') return false;
		pos += 2;
		if (!v_funcid()) return error = `define: expected function name`, false;
		// argument list
		if (!v_lstart()) return error = `define: expected argument list`, false;
		while (pos < list.length)
			if      (list[pos] === ')') break;
			else if (v_define()) ;
			else if (!error) return error = `define: unexpected argument [${list[pos]}`, false;
		if (!v_lend()) return error = `define: expected list end`, false;
		// function body
		if (!v_block()) return (!error ? error = `define: expected function block` : null), false;
		return true;
	};

	const v_expr = () => {
		// console.log(pos, list[pos], v_num(list[pos]))
		if (v_varid()) return true;
		if (v_num()) return true;
		if (v_lstart()) {
			if (!/^(\+|\-|\*|\\)$/.test(list[pos])) 
				return error = `expression: unknown command [${list[pos]}]`, false;
			pos++;
			while (pos < list.length)
				if      (error) return false;
				else if (list[pos] === ')') break;
				else    e_expr();
			if (!v_lend()) return error = `expression: expected list end`, false;
		}
		return false; // not an expression
	};

	const v_block = () => {
		if (list[pos] !== '(') return false;
		pos++;
		// while (pos < list.length)
		// 	if (error) return false;
		// 	else if (v_define()
		return error = `???`, false;
	};



	// debugging
	this.showlist = () => {
		let out = '', indent = 0, p = 0, last;
		// get token, highlighting error position
		const gettok = () => error && p === pos ? `<error>${list[p]}</error>` : list[p];
		// main loop
		for (p = 0; p < list.length; p++)
		switch (list[p]) {
			case '(':
				out += (p > 0 ? '\n' : '') + '\t'.repeat(indent) + gettok();
				last = 'open', indent++;
				break;
			case ')':
				out += gettok();
				last = 'close', indent--;
				break;
			default:
				out += (last === 'close' ? '\n'+'\t'.repeat(indent) : '') 
					+  (last === 'var' ? ' ' : '') 
					+  gettok();
				last = 'var';
		}
		// show error, if given
		if (error) out += `\n\n<error>${error} [${pos}]</error>`
		return out;
	};
};