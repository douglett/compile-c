'use strict';

class Token {
	constructor(token, type, lineno, lineoff) {
		this.set(token, type, lineno, lineoff);
	}
	set(token, type, lineno, lineoff) {
		this.token = token;
		this.type = type;
		this.lineno = lineno;
		this.lineoff = lineoff;
	}
	str() {
		return `(${this.type} ${this.token} [${this.lineno + 1}])`;
	}
}

class Tokenizer {
	constructor(str) {
		this.error = '';
		this.tokens = [];
		this.pos = 0;
		this.eoftok = new Token('EOF', 'EOF', 0, 0);
		this.token = new Token('', 'undefined', 0, 0);
		if (typeof str === 'string') this.parse(str);
	}
	parse(str) {
		this.tokens = [];
		const lines = str.split('\n');
		lines.forEach((line, lno) => {
			// add line text as debug symbol?
			// this.tokens.push( new Token(line, 'debug-sym', lno, 0) );
			// parse each token in line
			let pos = 0;
			while (pos < line.length) {
				if (this.error) return; // stop on error
				// space
				if (/\s/.test(line[pos]))
					this.p_next(lno, pos), pos++;
				// comment block - ignore rest of line
				else if (line[pos] === '/' && line[pos+1] === '/')
					break;
				// string literal
				else if (line[pos] === '"') {
					this.p_next(lno, pos), this.p_add('"'), pos++;
					while (pos < line.length) {
						const c = line[pos++];
						this.p_add(c);
						if (c === '"') break;
					}
					this.p_next(lno, pos);
				}
				// special character
				else if (/\W/.test(line[pos])) 
					this.p_next(lno, pos), this.p_add(line[pos]), this.p_next(lno, pos), pos++;
				// basic characters
				else
					this.p_add(line[pos]), pos++;
			}
			this.p_next(lno, pos);
			// this.p_add('\n'), this.next(lno, pos); // eol?
		});
	}
	p_add(c) {
		this.token.token += c;
	}
	p_next(lno, pos) {
		if (this.token.token.length) {
			// identify
			if      (/^\W$/.test(this.token.token)) this.token.type = 'operator';
			else if (/^\d+$/.test(this.token.token)) this.token.type = 'number';
			else if (/^\w+$/.test(this.token.token)) this.token.type = 'word';
			else if (/^".*"+$/.test(this.token.token)) this.token.type = 'strliteral';
			else {
				this.error = this.token;
				console.error('Tokenizer error: ', this.error);
			}
			this.tokens.push(this.token);
		}
		this.token = new Token('', 'undefined', lno, pos);
	}

	peek(offset) {
		offset |= 0;
		return this.tokens[this.pos + offset] || this.eoftok;
	}
	get() {
		return this.eof() ? this.eoftok : this.tokens[this.pos++];
	}
	eof() {
		return this.peek() === this.eoftok;
	}
}