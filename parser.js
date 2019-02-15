'use strict';

const Parser = new function() {
	const tok = new Tokenizer();
	let error = '';
	this.prog = null;


	this.parse = (str) => {
		this.prog = null, error = '';
		tok.parse(str);
		console.log(tok.tokens);
		if (tok.error) 
			return error = tok.error, false;
		const ok = parseprog();
		console.log(this.prog);
		return ok;
	};
	this.error = () => error;

	
	// main parse function
	const parseprog = () => {
		const prog = this.prog = { type:'prog', defines: [], functions:[] };
		let t;
		while (!error) {
			if (t = p_declare_line()) prog.defines.push(t);
			else if (t = p_function()) prog.functions.push(t);
			else break;
		}
		if (!error && !accept('EOF'))
			error = `expected end of program (EOF): ${tok.peek().str()}`;
		if (error) 
			return console.error(error), false;
		return true;
	};



	// helpers
	const accept = (type, value) => {
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
	const p_declare = () => p_declare_expr();
	// declaration with equals expression
	const p_declare_expr = () => {
		let p, def, ex, t;
		if (!(def = p_declare_spec())) return null;
		p = tok.pos;
		t = accept('operator', '=');
		ex = p_expr();
		if (t && ex)
			return def.val = ex, def;
		return tok.pos = p, def;  // naked declaration
	};
	// declaration specifier (type name)
	const p_declare_spec = () => {
		let p = tok.pos, type, name;
		type = p_type();
		name = p_ident();
		if (type && name) 
			return { type:'define', name:name.token, deftype:type.token };
		return tok.pos = p, null;
	};



	// functions
	const p_function = () => {
		let p = tok.pos, t, def;
		if (!(def = p_function_def())) return null;
		def.type = 'function', def.lines = [];
		while (t = p_statement())
			def.lines.push(t);
		if (accept('operator', '}')) return def;
		error = `unexpected token in function: ${tok.peek().str()}`;
		return null;
	};
	// function definition
	const p_function_def = () => {
		let p = tok.pos, t, type, ident, def, args;
		type = p_type();
		ident = p_ident();
		if (type && ident) {
			def = { type:'function_def', name:ident.token, deftype:type.token };
			t = accept('operator', '(') ;
			def.arguments = p_function_args();
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
		// return tok.pos = p, null;
	};
	// function call
	const p_call = () => {
		let p = tok.pos, t, i;
		i = p_ident();
		t = accept('operator', '(') && accept('operator', ')');
		if (i && t)
			return { type:'call', name:i.token };
		return tok.pos = p, null;
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
			return { type:'assign', name:a.token, val:b };
		return tok.pos = p, null;
	};
	// line expression
	const p_expr_line = () => {
		let p = tok.pos, e, t;
		e = p_expr();
		t = accept('operator', ';');
		if (e && t) return e;
		return tok.pos = p, null;
	};
	// keyword statement
	const p_keyword = () => {
		let p = tok.pos, s, e, t;
		if (s = accept('word', 'return')) {
			e = p_expr();
			t = accept('operator', ';');
			if (s && e && t)
				return { type:'return', val:e };
		}
		return tok.pos = p, null;
	};



	// expressions
	const p_expr = () => p_expr_add();
	// additive expressions
	const p_expr_add = () => {
		let p = tok.pos, o, a, b;
		a = p_expr_mul();
		o = accept('operator', '+') || accept('operator', '-');
		if (a && !o) return a;
		b = p_expr_mul();
		if (a && o && b)
			return { type:o.token, vala:a, valb:b };
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
			return { type:o.token, vala:a, valb:b };
		return tok.pos = p, null;
	};
	// primary expression
	const p_expr_primary = () => {
		let p = tok.pos, t;
		if (t = accept('number')) return t;
		if (t = p_call()) return t;
		if (t = p_ident()) return t;
		if (accept('operator', '(')) {
			t = p_expr();
			if (accept('operator', ')')) return t;
		}
		return tok.pos = p, null;
	};



	// debugging
	this.showast = () => {
		let out = '';
		function show(obj, indent) {
			if (obj instanceof Array) 
				obj.forEach((k, i) => {
					out += `${'\t'.repeat(indent)}---\n`;
					show(k, indent);
				});
			else if (obj instanceof Object) 
				Object.keys(obj).forEach(k => {
					out += `${'\t'.repeat(indent)}${k} :: \n`;
					show(obj[k], indent+1);
				});
			else 
				out = out.substr(0, out.length-1) + `${obj}\n`;
		}
		show(this.prog, 0);
		return out;
	};

};
