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
			else    error = `script: expected define or defun`;
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
		if (!v_varid()) return error = `define: expected variable name`, true;
		v_expr(); // optional expression
		if (error) return true;
		if (!v_lend()) return error = `define: expected list-end`, true;
		return true;
	};


	const v_defun = () => {
		if (list[pos] !== '(' || list[pos+1] !== 'defun') return false;
		pos += 2;
		if (!v_funcid()) return error = `define: expected function name`, true;
		// argument list
		if (!v_lstart()) return error = `define: expected argument list`, true;
		while (pos < list.length)
			if      (list[pos] === ')') break;
			else if (v_define()) ;
			else if (!error) return error = `define: unexpected argument`, true;
		if (!v_lend()) return error = `define: expected list-end`, true;
		// function body
		if (!v_block()) return error = `define: expected function block`, true;
		return true;
	};

	const v_expr = () => {
		// console.log(pos, list[pos], v_num(list[pos]))
		if (v_varid()) return true;
		if (v_num()) return true;
		if (v_lstart()) {
			if (!/^(\+|\-|\*|\\|==|<=|>=|<|>)$/.test(list[pos])) 
				return error = `expression: unknown command`, true;
			pos++;
			while (pos < list.length)
				if      (error) return true;
				else if (list[pos] === ')') break;
				else    v_expr();
			if (!v_lend()) error = `expression: expected list-end`;
			return true;
		}
		return false; // not an expression
	};

	const v_block = () => {
		if (list[pos] !== '(') return false;
		pos++;
		while (pos < list.length)
			if      (error) return true;
			else if (list[pos] === ')') break;
			else if (v_define()) ;
			else if (v_set()) ;
			else if (v_if()) ;
			else if (v_while()) ;
			else    return error = `block: unknown command [${list[pos] === '(' ? list[pos+1] : list[pos]}]`, true;
			// else    return error = `block: unknown command`, true;
		if (!v_lend()) error = `block: expected list-end`;
		// debugger
		return true;
	};

	const v_set = () => {
		if (list[pos] !== '(' || list[pos+1] !== 'set') return false;
		pos += 2;
		if (!v_varid()) return error = `set: expected identifier`, true;
		if (!v_expr()) return error = `set: expected expression`, true;
		if (!v_lend()) return error = `set: expected list-end`, true;
		return true;
	};

	const v_if = () => {
		if (list[pos] !== '(' || list[pos+1] !== 'if') return false;
		pos += 2;
		if (!v_expr()) return error = `if: expected expression`, true;
		if (!v_block()) return error = `if: expected block`, true;
		if (!v_lend()) return error = `if: expected list-end`, true;
		return true;
	};

	const v_while = () => {
		if (list[pos] !== '(' || list[pos+1] !== 'while') return false;
		pos += 2;
		if (!v_expr()) return error = `while: expected expression`, true;
		if (!v_block()) return error = `while: expected block`, true;
		if (!v_lend()) return error = `while: expected list-end`, true;
		return true;
	};

	const v_call = () => {
		if (list[pos] !== '(' || list[pos+1] !== 'call') return false;
		pos += 2;
		throw 'here';

		if (!v_lend()) return error = `call: expected list-end`, true;
		return true;
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