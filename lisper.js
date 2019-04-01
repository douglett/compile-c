'use strict';

const Lisper = new function() {
	let error = '';
	this.list = [];

	this.parse = (str) => { };
	this.parseTokens = (list) => { };
	this.parseList = (list) => {
		this.list = list;
		validate(list);
	};
	this.error = () => error;



	const is_vname  = (str) => /^\$[A-Za-z_][A-Za-z_0-9]*$/.test(str);
	const is_fname  = (str) => /^\@[A-Za-z_][A-Za-z_0-9]*$/.test(str);
	const is_num    = (str) => /^[0-9]+$/.test(str);
	const v_vname   = (str) => is_vname(str) ? null : error = `expected variable name [${str}]`;
	const v_fname   = (str) => is_fname(str) ? null : error = `expected function name [${str}]`;
	const v_num     = (str) => is_num  (str) ? null : error = `expected number [${str}]`;


	const validate = (list) => {
		error = '';
		// top level
		if (!(list instanceof Array))
			error = `expected list at top level`;
		list.some(l => {
			if (error) 
				return error;
			if (list instanceof Array && l[0] === 'define')
				return v_define(l);
			if (list instanceof Array && l[0] === 'defun')
				return v_defun(l);
			return error = `expected define of defun at main block level`;
		});
		// error checking
		return error 
			? (console.error(`Lisper: ${error}`), false)
			: (console.log(`Lisper: validate OK`), true);
	};

	const v_define = (list) => {
		const name = list[1];
		const ex = list[2];
		if (!is_vname(name))
			return error = `define: expected variable name [${name}]`;
		if (ex) v_expr(ex);
	};

	const v_defun = (list) => {
		const name = list[1];
		const args = list[2];
		const block = list[3];
		if (v_fname(name)) 
			return `defun: ${error}`;
		if (!(args instanceof Array))
			return error = `defun: expected arguments list [${name}]`;
		args.some(a => ( v_define(a), error ));
		if (error) return error;
		v_block(block);
	};

	const v_expr = (list) => {
		if (list instanceof Array) {
			if (/^(\+|\-|\*|\\|==|>=|<=|>|<)$/.test(list[0]))
				for (let i = 1; i < list.length; i++)
					v_expr(list[i]);
			else if (list[0] === 'call') {
				const name = list[1];
				const args = list[2];
				if (v_fname(name)) return error;
				if (!(args instanceof Array))
					return error = `expected arguments list in call [${name}]`;
			}
		}
		else if (is_vname(list)) ;
		else if (is_num(list)) ;
		else 
			return error = `unknown token in expression [${list}]`;
	};

	const v_block = (list) => {
		let name, ex, block;
		if (!(list instanceof Array))
			return error = `expected function block [${name}]`;
		list.some(l => {
			switch (l[0]) {
			case 'define':
				v_define(l);
				break;
			case 'set':
				name = l[1];
				ex = l[2];
				v_vname(name) || v_expr(ex);
				break;
			case 'if':
			case 'while':
				ex = l[1];
				block = l[2];
				v_expr(ex) || v_block(block);
				break;
			default:
				v_expr(l);
				// return error = `unexpected in block [${l[0]}]`;
			}
			return error;
		});
		return error;
	};
};