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
		const prog = this.prog = { type:'prog', defines: [], functions:[] };
		let t;
		while (!error) {
			if (t = p_declare_line()) prog.defines.push(t);
			else if (t = p_function()) prog.functions.push(t);
			else break;
		}
		if (!error && !accept('EOF'))
			error = `expected end of program (EOF): ${tok.peek().str()}`;
		precompile(this.prog);
		if (error) 
			return console.error(error), false;
		return true;
	};



	// precompile - do basic sanity checker, so we don't have to do it in the compiler
	const precompile = () => {
		const def = [];
		let fndef = [];
		let context = 'global';
		// 
		const exists     = (name) => !!def.find(d => d.name === name);
		const exists_ctx = (name) => !!def.find(d => d.name === name && d.ctx === context);
		//
		const check = (ast) => {
			let pos = def.length;
			let fn;
			switch (ast.type) {
				// main program
				case 'prog':
					def.splice(0);
					context = 'global';
					// global defines
					ast.defines.some(t => check(t), error);
					if (error) break;
					// check function contents
					context = 'local';
					fndef = ast.functions;
					ast.functions.some(t => check(t), error);
					break;
				// check defines
				case 'define':
					if (exists_ctx(ast.name)) 
						return error = `variable already defined: ${ast.name}`, 1;
					def.push({ name: ast.name, ctx: context });
					if (ast.val) check(ast.val);
					break;
				// check functions
				case 'function':
					ast.arguments.some(t => check(t), error);
					ast.lines.some(t => check(t), error);
					def.splice(0, pos);
					break;
				// various functionality
				case 'assign':
					if (!exists(ast.name))
						return error = `missing variable in assignment: ${ast.name}`, 1;
					check(ast.val);
					break;
				case 'word': // identifier in expression
					if (!exists(ast.token))
						return error = `missing variable in expression: ${ast.token}`, 1;
					break;
				case 'call':
					// check function definitions
					// console.log('call', ast, fndef);
					if (ast.name === 'puti')
						return console.warn('TODO: puti checking'), 0;
					if (!(fn = fndef.find(f => f.name === ast.name)))
						return error = `call to undefined function: ${ast.name}`, 1;
					if (ast.arguments.length !== fn.arguments.length)
						return error = `wrong number of arguments to function: ${ast.name}`, 1;
					break;
				case '*':
				case '+':
				case '==':
				case '>':
					check(ast.vala);
					check(ast.valb);
					break;
				case 'if':
				case 'while':
					check(ast.val);
					break;
				case 'expression':
				case 'return':
					if (ast.val) check(ast.val);
					break;
				// OK - skip these
				case 'number':
					break;
				// unknown - error
				default:
					// console.log('sanity', ast.type);
					return error = `precompile: unknown input: ${ast.type}`, 1;
			}
		};
		// do check
		return check(this.prog);
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
		while ((t = p_statement()) && !error)
			def.lines.push(t);
		if (accept('operator', '}')) return def;
		if (!error)
			error = `unexpected token in function: ${tok.peek().str()}`;
		// return null;
		return def;
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
		let p = tok.pos, t, id, def;
		id = p_ident();
		t = accept('operator', '(');
		if (id && t) {
			def = { type:'call', name:id.token };
			def.arguments = p_call_args();
			t = t && accept('operator', ')');
			if (id && t)
				return def;
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
			return { type:'assign', name:a.token, val:b };
		return tok.pos = p, null;
	};
	// line expression
	const p_expr_line = () => {
		let p = tok.pos, e, t;
		e = p_expr();
		t = accept('operator', ';');
		if (e && t) 
			return { type:'expression', val:e };
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
				return { type:'return', val:e };
		}
		// if statement
		else if (s = accept('word', 'if')) {
			t = accept('operator', '(');
			e = p_expr();
			t = t && accept('operator', ')');
			if (s && t && e) 
				if (def = p_block())
					return def.type = 'if', def.val = e, def;
		}
		// while statement
		else if (s = accept('word', 'while')) {
			t = accept('operator', '(');
			e = p_expr();
			t = t && accept('operator', ')');
			if (s && t && e) 
				if (def = p_block())
					return def.type = 'while', def.val = e, def;
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
		let p = tok.pos, t, a;
		let def = { type:'block', lines:[] };
		t = accept('operator', '{');
		if (!t && !error)
			error = `expected open braces in block: ${tok.peek().str()}`;
		while ((a = p_statement()) && !error)
			def.lines.push(a);
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
				return { type:c, vala:a, valb:b };
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
