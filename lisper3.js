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
// 
'use strict';

const Lisper3 = new function() {
	let prog = [];
	let state = [];
	let state_stack = 0;
	let err = null;

	this.validate = (list) => {
		try {
			err = null, state = [], state_stack = 0; // clear errors && reset call stack state
			is_list(list) || error(null, -1, `script: expected list`);
			prog = list;
			build_vtable();
			return script(list);
		}
		catch(e) {
			if (e instanceof Error) throw e;
			console.log('error', e);
			err = e;
			return false;
		}
	};
	this.error = () => {
		return err ? err.msg : '';
	};


	// predefine global functions and vars
	const build_vtable = () => {
		// console.log('vtable');
		// // define
		// prog.forEach(ls => {
		// 	if (is_list(ls) && is_lstype(ls, 'define')) {
		// 		console.log('define', ls);
		// 	}
		// });
		// // defun
		// prog.forEach(ls => {
		// 	if (is_list(ls) && is_lstype(ls, 'defun' )) console.log('defun', ls);
		// });
		// throw 'stop';
	};


	// define state and block counting
	const state_push   = () => ++state_stack;
	const state_pop    = () => (--state_stack, state = state.filter(s => s.stack <= state_stack));
	const state_global = () => (state_stack = 0, state = state.filter(s => s.stack <= state_stack));
	const state_define = (ls) => {
		state.forEach(d => d.name === ls[1] && d.stack === state_stack && error(ls, 1, `already defined: ${ls[1]}`));
		state.push({ name:ls[1], stack:state_stack, def:ls });
		// console.log(`defined: ${ls[1]} [${state_stack}]`);
	};
	const state_vtable = (name) => {
		console.log('vtable', name);
		return state.some(d => d.name === name);
		// error(ls, pos, `undefined var: ${ls[pos]}`);
		// return true;
	};


	// helpers
	const error = (ls, pos, msg) => { throw { list:ls, pos:pos, msg:msg }; };

	
	// definition checkers
	const is_list       = (ls) => ls instanceof Array;
	const is_lstype     = (ls, name) => is_list(ls) && ls[0] === name;
	const is_varname    = (name) => /^\$[A-Za-z_][A-Za-z0-9_]*$/.test(name);
	const is_funcname   = (name) => /^\@[A-Za-z_][A-Za-z0-9_]*$/.test(name);
	const is_number     = (val) => /^[0-9]+$/.test(val);
	const is_math       = (ls) => is_list(ls) && /^(\+|\-|\*|\\|==|<=|>=|<|>)$/.test(ls[0]);
	const is_expression = (ls) => is_varname(ls) || is_number(ls) || is_math(ls) || is_lstype(ls, 'call');
	

	// expect definition
	const script = (ls) => {
		// is_list(ls) || error(ls, -1, `script: expected list`);
		ls.forEach((l, i) => {
			state_global();
			if      (is_lstype(l, 'define')) define(l);
			else if (is_lstype(l, 'defun' )) defun(l);
			else    error(l, i, `expected define or defun`);
		});
		return true;
	};
	const list     = (ls, pos)  => is_list(ls[pos]) || error(ls, pos, `expected list`);
	const lstype   = (ls, name) => is_lstype(ls, name) || error(ls, 1, `expected list: ${name}`);
	const varname  = (ls, pos)  => is_varname(ls[pos]) || error(ls, pos, `expected variable-name`);
	const funcname = (ls, pos)  => is_funcname(ls[pos]) || error(ls, pos, `expected function-name`);
	const vardef   = (ls, pos)  => varname(ls, pos) && state_vtable(ls[pos]) || error(ls, pos, `undefined variable: ${ls[pos]}`);
	const funcdef  = (ls, pos)  => funcname(ls, pos) && state_vtable(ls[pos]) || error(ls, pos, `undefined function: ${ls[pos]}`);
	const define = (ls) => {
		lstype(ls, 'define');
		varname(ls, 1);
		state_define(ls);
		ls[2] && expression(ls, 2);
		return true;
	};
	const defun = (ls) => {
		lstype(ls, 'defun');
		funcname(ls, 1);
		state_define(ls), state_push();
		list(ls, 2) && defargs(ls[2]);
		list(ls, 3) && block(ls[3]);
		return true;
	};
	const defargs = (ls) => !ls.forEach((l, i) => list(ls, i) && define(l));
	const block = (ls) => {
		ls.forEach((l, i) => {
			if      (is_lstype(l, 'define')) define(l);
			else if (is_lstype(l, 'set')) vardef(l, 1) && expression(l, 2);
			else if (is_lstype(l, 'if')) expression(l, 1) && list(l, 2) && block(l[2]);
			else if (is_lstype(l, 'while')) expression(l, 1) && list(l, 2) && block(l[2]);
			else if (is_lstype(l, 'return')) l[1] && expression(l, 1);
			else if (is_expression(l)) expression(ls, i);
			else    error(ls, i, `unexpected in block`);
		});
		return true;
	};
	const expression = (ls, pos) => {
		const ex = ls[pos];
		// console.log('expression', ex);
		if      (is_varname(ex)) vardef(ls, pos);
		else if (is_number(ex)) ;
		else if (is_lstype(ex, 'call')) call(ex);
		else if (is_math(ex)) expression(ex, 1) && expression(ex, 2);
		else    error(ls, pos, `unexpected in expression`);
		return true;
	};
	const call = (ls) => {
		// console.log('call', ls);
		lstype(ls, 'call');
		funcdef(ls, 1);
		list(ls, 2) && callargs(ls[2]);
		return true;
	};
	const callargs = (ls) => !ls.forEach((l, i) => expression(ls, i));



	// debugging
	this.showlist = () => {
		let out = '';
		function show(list, indent) {
			out += `${'\t'.repeat(indent)}(`;
			const errpos = err && err.list === list ? err.pos : -1;
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
		prog.forEach(l => ( show(l, 0), out += '\n' ));
		out += err ? `\n\n<error>${err.msg}</error>` : '';
		return out;
	};
};