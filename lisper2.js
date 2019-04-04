'use strict';

// prog::        [ (define | defun)* ]
// varname::     $identifier
// funcname::    @identifier
// define::      [ "define" varname expression? ]
// defun::       [ "defun" funcname block ]
// expression::  varname | number | [ (("+"|"-"|...) expression expression) | call ]
// block::       [ (define | "return" expression | "set" varname expression | call | if | while ) ]
// call::        [ "call" funcname [ expression* ] ]
// if::          [ "if" expr block ]
// while::       [ "while" expr block ]

const Lisper2 = new function() {
	let error = null;
	this.list = [];

	this.validate = (list) => {
		this.list = list;
		error = null;
		if (!Array.isArray(list)) return seterror(null, 0, `script: expected list`);
		list.some((ls, i) => {
			if      (check_define(ls)) ;
			else if (check_defun(ls)) ;
			else    seterror(list, i, `script: expected define or defun`);
			return  error;
		});
		if (error) console.log('error', error);
	};
	this.error = () => error;


	// helpers
	const seterror = (list, pos, msg) => error = error || { list:list, pos:pos, msg:msg };

	// state
	const set_identifier = (name) => {
		if (!is_variable(name)) return seterror(list, 1, `expected variable`), false;
		// if (!)
	};

	// identify
	const is_number     = (val) => /^[0-9]+$/.test(val);
	const is_identifier = (val) => /^[\$\@][A-Za-z_][A-Za-z0-9_]*$/.test(val);
	const is_variable   = (val) => /^\$/.test(val) && is_identifier(val);
	const is_funcname   = (val) => /^\@/.test(val) && is_identifier(val);
	const is_command    = (list, name) => Array.isArray(list) && list[0] === name;
	const is_math       = (list) => Array.isArray(list) && /^(\+|\-|\*|\\|==|<=|>=|<|>)$/.test(list[0]);


	// validator functions
	const expect_list = (list) => {
		if (Array.isArray(list)) return true;
		return seterror(list, 0, `expected list`), false;
	};

	const check_define = (list) => {
		if (!is_command(list, 'define')) return false;
		const name = list[1];
		const expr = list[2];
		// console.log('define', name, expr);
		if (!is_variable(name)) return seterror(list, 1, `define: expected variable`);
		if (expr) check_expression(expr);
		return true;
	};

	const check_defun = (list) => {
		if (!is_command(list, 'defun')) return false;
		const name  = list[1];
		const args  = list[2];
		const block = list[3];
		// console.log('defun', name);
		if (!is_funcname(name)) return seterror(list, 1, `defun: expected function name`);
		expect_arguments(args);
		expect_block(block);
		return true;
	};

	const expect_arguments = (list) => {
		if (!expect_list(list)) return true;
		list.some((ls, i) => {
			if (!check_define(ls)) seterror(list, i, `arguments: expected define`);
			return error;
		});
		return true;
	};

	const check_expression = (list) => {
		// console.log('expr', list);
		if      (is_number(list)) ;
		else if (is_variable(list)) ;
		else if (check_call(list)) ;
		else if (is_math(list)) list.some((ls, i) => {
				if      (i === 0) ;
				else if (check_expression(ls)) ;
				else    return seterror(list, i, `error in expression`);
			});
		else    return false;
		return true;
	};

	const expect_block = (list) => {
		if (!expect_list(list)) return true;
		list.some((ls, i) => {
			// console.log('block', ls);
			if      (check_define(ls)) ;
			else if (check_expression(ls)) ;
			else if (check_set(ls)) ;
			else if (check_return(ls)) ;
			else if (check_condition(ls, 'if')) ;
			else if (check_condition(ls, 'while')) ;
			else    seterror(list, i, `block: unexpected command`);
			return error;
		});
		return true;
	};

	const check_set = (list) => {
		if (!is_command(list, 'set')) return false;
		const name = list[1];
		const expr = list[2];
		if (!is_variable(name)) return seterror(list, 1, `set: expected variable`);
		check_expression(expr);
		return true;
	};

	const check_condition = (list, cmd) => {
		if (!is_command(list, cmd)) return false;
		const expr  = list[1];
		const block = list[2];
		check_expression(expr);
		expect_block(block);
		return true;
	};

	const check_call = (list) => {
		if (!is_command(list, 'call')) return false;
		const name = list[1];
		const args = list[2];
		if (!is_funcname(name)) return seterror(list, 1, `call: expected function name`);
		if (expect_list(args), error) return true;
		args.some((a, i) => {
			if (!check_expression(a)) seterror(args, i, `expected expression`);
			return error;
		});
		return true;
	};

	const check_return = (list) => {
		if (!is_command(list, 'return')) return false;
		const expr = list[1];
		if (expr) check_expression(expr);
		return true;
	};


	// debugging
	this.showlist = () => {
		let out = '';
		function show(list, indent) {
			out += `${'\t'.repeat(indent)}(`;
			const errpos = error && error.list === list ? error.pos : -1;
			let lastarr = 0;
			list.forEach((k, i) => {
				out += i === errpos ? '<error>' : '';
				if (Array.isArray(k)) 
					out += `\n`, lastarr = 1, show(k, indent+1);
				else if (lastarr)
					out += `\n${'\t'.repeat(indent+1)}${k}`, lastarr = 0;
				else
					out += (i > 0 ? ' ' : '') + k;
				out += i === errpos ? '</error>' : '';
			});
			out += ')';
		}
		this.list.forEach(l => ( show(l, 0), out += '\n' ));
		out += error ? `\n\n<error>${error.msg}</error>` : '';
		return out;
	};
};