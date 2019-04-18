'use strict';

const Parser = new function() {
	const tok = new Tokenizer();
	let error = '';
	this.prog = null;


	this.parse = (str) => {
		this.prog = null, error = '';
		tok.parse(str);
		// console.log(tok.tokens);
		if (tok.error) 
			return error = tok.error, false;
		const ok = parseprog();
		// console.log(this.prog);
		return ok;
	};
	this.error = () => error;

	
	// main parse function
	const parseprog = () => {
		const prog = this.prog = [];
		let t;
		while (!error) {
			if      (accept('EOF')) break;
			else if (t = p_declare_line()) prog.push(t);
			else if (t = p_function()) prog.push(t);
			else    { error = error || `unexpected in main block: ${tok.peek().str()}`;  break; }
		}
		if (!error && !accept('EOF'))
			error = `expected end of program (EOF): ${tok.peek().str()}`;
		if (error) 
			return console.error(error), false;
		return true;
	};



	// helpers
	const accept = (type, value) => {
		while (tok.peek().type === 'debug-sym') tok.get(); // ignore debug symbols if present
		if (tok.peek().type === type) {
			if (!value) return tok.get();
			if (typeof value === 'string' && tok.peek().token === value) return tok.get();
			if (value instanceof RegExp && tok.peek().token.match(value)) return tok.get();
		}
		return null;
	};
	// basic types
	const p_type = () => accept('word', /^int|char$/);
	const p_ident = () => accept('word', /^[A-Za-z_]\w*$/);



	// declaration
	const p_declare = () => p_declare_array() || p_declare_expr() || p_declare_spec();
	// array declaration
	const p_declare_array = () => {
		let p = tok.pos, def, ex, t;
		if (def = p_declare_spec()) {
			t = accept('operator', '[');
			ex = accept('number');
			t = t && accept('operator', ']');
			if (t && ex)
				return [ 'data', def[1], ex.token ];
		}
		return tok.pos = p, null;
	};
	// declaration with equals expression
	const p_declare_expr = () => {
		let p = tok.pos, def, ex, t;
		if (def = p_declare_spec()) {
			t = accept('operator', '=');
			ex = p_expr();
			if (t && ex)
				return def.push(ex), def;
		}
		return tok.pos = p, null;
	};
	// declaration specifier (type name)
	const p_declare_spec = () => {
		let p = tok.pos, type, name;
		type = p_type();
		name = p_ident();
		if (type && name) 
			return [ 'define', `$${name.token}` ];
		return tok.pos = p, null;
	};



	// functions
	const p_function = () => {
		let p = tok.pos, t, def, lines = [];
		if (!(def = p_function_def())) return null;
		while ((t = p_statement()) && !error)
			lines.push(t);
		if (accept('operator', '}')) 
			return def.push(lines), def;
		if (!error)
			error = `unexpected token in function: ${tok.peek().str()}`;
		return def;
	};
	// function definition
	const p_function_def = () => {
		let p = tok.pos, t, type, ident, def, args;
		type = p_type();
		ident = p_ident();
		if (type && ident) {
			def = [ 'defun', `@${ident.token}` ]
			t = accept('operator', '(') ;
			def.push( p_function_args() );
			t = t && accept('operator', ')') && accept('operator', '{');
			if (type && ident && t) 
				return def;
		}
		return tok.pos = p, null;
	};
	// function arguments
	const p_function_args = () => {
		let p = tok.pos, args = [], t;
		while (t = p_declare_spec()) {
			args.push(t);
			if (!accept('operator', ',')) break;
		}
		return args;
	};
	// function call
	const p_call = () => {
		let p = tok.pos, t, id, args;
		id = p_ident();
		t = accept('operator', '(');
		if (id && t) {
			args = p_call_args();
			t = t && accept('operator', ')');
			if (id && t)
				return [ 'call', `@${id.token}`, args ];
		}
		return tok.pos = p, null;
	};
	// function call args
	const p_call_args = () => {
		let args = [], t;
		while (t = p_expr()) {
			args.push(t);
			if (!accept('operator', ',')) break;
		}
		return args;
	};



	// statements
	const p_statement = () => p_declare_line() || p_assign() || p_expr_line() || p_keyword();
	// definition statement
	const p_declare_line = () => {
		let p = tok.pos, def, t;
		def = p_declare();
		t = accept('operator', ';');
		if (def && t)
			return def;
		return tok.pos = p, null;
	};
	// assignment statement
	const p_assign = () => {
		let p = tok.pos, t, a, b;
		a = p_ident();
		t = accept('operator', '=');
		b = p_expr();
		t = t && accept('operator', ';');
		if (a && t && b)
			return [ 'set', `$${a.token}`, b ];
		return tok.pos = p, null;
	};
	// line expression
	const p_expr_line = () => {
		let p = tok.pos, e, t;
		e = p_expr();
		t = accept('operator', ';');
		if (e && t) 
			return e;
		return tok.pos = p, null;
	};
	// keyword statement
	const p_keyword = () => {
		let p = tok.pos, s, e, t, def;
		// return statement
		if (s = accept('word', 'return')) {
			e = p_expr();
			t = accept('operator', ';');
			if (s && e && t)
				return [ 'return', e ];
		}
		// if statement
		else if (s = accept('word', 'if')) {
			t = accept('operator', '(');
			e = p_expr();
			t = t && accept('operator', ')');
			if (s && t && e) 
				if (def = p_block())
					return [ 'if', e, def ];
		}
		// while statement
		else if (s = accept('word', 'while')) {
			t = accept('operator', '(');
			e = p_expr();
			t = t && accept('operator', ')');
			if (s && t && e) 
				if (def = p_block())
					return [ 'while', e, def ];
		}
		// unknown
		else
			return tok.pos = p, null;
		// found, but error
		tok.pos = p;
		if (!error) error = `error in keyword statement: ${tok.peek().str()}`;
		return null;
	};
	// block of statements
	const p_block = () => {
		let p = tok.pos, def = [], t, a;
		t = accept('operator', '{');
		if (!t && !error)
			error = `expected open braces in block: ${tok.peek().str()}`;
		while ((a = p_statement()) && !error)
			def.push(a);
		t = t && accept('operator', '}');
		if (!t && !error)
			error = `expected close braces in block: ${tok.peek().str()}`;
		return def;
	};



	// expressions
	const p_expr = () => p_expr_equal();
	// equality expressions
	const p_expr_equal = () => {
		let p = tok.pos, o, q, a, b, c;
		a = p_expr_add();
		q = accept('operator', '=') || accept('operator', '<') || accept('operator', '>');
		if (a && !q) return a;
		o = accept('operator', '=');
		b = p_expr_add();
		c = (q ? q.token : '') + ( o ? o.token : '');
		if (a && b && c)
			if (/^(==|<|<=|>|>=)$/.test(c))
				return [ c, a, b ];
		return tok.pos = p, null;
	};
	// additive expressions
	const p_expr_add = () => {
		let p = tok.pos, o, a, b;
		a = p_expr_mul();
		o = accept('operator', '+') || accept('operator', '-');
		if (a && !o) return a;
		b = p_expr_mul();
		if (a && o && b)
			return [ o.token, a, b ];
		return tok.pos = p, null;
	};
	// mupliplicative expression
	const p_expr_mul = () => {
		let p = tok.pos, o, a, b;
		a = p_expr_primary();
		o = accept('operator', '*') || accept('operator', '/') || accept('operator', '%');
		if (a && !o) return a;
		b = p_expr_primary();
		if (a && o && b)
			return [ o.token, a, b ];
		return tok.pos = p, null;
	};
	// primary expression
	const p_expr_primary = () => {
		let p = tok.pos, t;
		if (t = accept('number')) return t.token;
		if (t = p_call()) return t;
		if (t = p_ident()) return `$${t.token}`;
		if (accept('operator', '(')) {
			t = p_expr();
			if (accept('operator', ')')) return t;
		}
		return tok.pos = p, null;
	};



	// debugging
	this.showlist = () => {
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
			out += ')';
		}
		// show(this.prog, 0);
		this.prog.forEach(l => ( show(l, 0), out += '\n' ));
		return out;
	};

};
