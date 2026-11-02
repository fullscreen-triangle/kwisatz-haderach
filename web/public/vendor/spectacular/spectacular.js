// ../../../vision/spectacular/node_modules/d3-array/src/ascending.js
function e(e, t) {
	return e == null || t == null ? NaN : e < t ? -1 : e > t ? 1 : e >= t ? 0 : NaN;
}
// ../../../vision/spectacular/node_modules/d3-array/src/descending.js
function t(e, t) {
	return e == null || t == null ? NaN : t < e ? -1 : t > e ? 1 : t >= e ? 0 : NaN;
}
// ../../../vision/spectacular/node_modules/d3-array/src/bisector.js
function n(n) {
	let i, a, o;
	n.length === 2 ? (i = n === e || n === t ? n : r, a = n, o = n) : (i = e, a = (t, r) => e(n(t), r), o = (e, t) => n(e) - t);
	function s(e, t, n = 0, r = e.length) {
		if (n < r) {
			if (i(t, t) !== 0) return r;
			do {
				let i = n + r >>> 1;
				a(e[i], t) < 0 ? n = i + 1 : r = i;
			} while (n < r);
		}
		return n;
	}
	function c(e, t, n = 0, r = e.length) {
		if (n < r) {
			if (i(t, t) !== 0) return r;
			do {
				let i = n + r >>> 1;
				a(e[i], t) <= 0 ? n = i + 1 : r = i;
			} while (n < r);
		}
		return n;
	}
	function l(e, t, n = 0, r = e.length) {
		let i = s(e, t, n, r - 1);
		return i > n && o(e[i - 1], t) > -o(e[i], t) ? i - 1 : i;
	}
	return {
		left: s,
		center: l,
		right: c
	};
}
function r() {
	return 0;
}
// ../../../vision/spectacular/node_modules/d3-array/src/number.js
function i(e) {
	return e === null ? NaN : +e;
}
// ../../../vision/spectacular/node_modules/d3-array/src/bisect.js
var a = n(e), o = a.right;
a.left, n(i).center;
// ../../../vision/spectacular/node_modules/internmap/src/index.js
var s = class extends Map {
	constructor(e, t = d) {
		if (super(), Object.defineProperties(this, {
			_intern: { value: /* @__PURE__ */ new Map() },
			_key: { value: t }
		}), e != null) for (let [t, n] of e) this.set(t, n);
	}
	get(e) {
		return super.get(c(this, e));
	}
	has(e) {
		return super.has(c(this, e));
	}
	set(e, t) {
		return super.set(l(this, e), t);
	}
	delete(e) {
		return super.delete(u(this, e));
	}
};
function c({ _intern: e, _key: t }, n) {
	let r = t(n);
	return e.has(r) ? e.get(r) : n;
}
function l({ _intern: e, _key: t }, n) {
	let r = t(n);
	return e.has(r) ? e.get(r) : (e.set(r, n), n);
}
function u({ _intern: e, _key: t }, n) {
	let r = t(n);
	return e.has(r) && (n = e.get(r), e.delete(r)), n;
}
function d(e) {
	return typeof e == "object" && e ? e.valueOf() : e;
}
// ../../../vision/spectacular/node_modules/d3-array/src/ticks.js
var f = Math.sqrt(50), p = Math.sqrt(10), m = Math.sqrt(2);
function h(e, t, n) {
	let r = (t - e) / Math.max(0, n), i = Math.floor(Math.log10(r)), a = r / 10 ** i, o = a >= f ? 10 : a >= p ? 5 : a >= m ? 2 : 1, s, c, l;
	return i < 0 ? (l = 10 ** -i / o, s = Math.round(e * l), c = Math.round(t * l), s / l < e && ++s, c / l > t && --c, l = -l) : (l = 10 ** i * o, s = Math.round(e / l), c = Math.round(t / l), s * l < e && ++s, c * l > t && --c), c < s && .5 <= n && n < 2 ? h(e, t, n * 2) : [
		s,
		c,
		l
	];
}
function g(e, t, n) {
	if (t = +t, e = +e, n = +n, !(n > 0)) return [];
	if (e === t) return [e];
	let r = t < e, [i, a, o] = r ? h(t, e, n) : h(e, t, n);
	if (!(a >= i)) return [];
	let s = a - i + 1, c = Array(s);
	if (r) {
		if (o < 0) for (let e = 0; e < s; ++e) c[e] = (a - e) / -o;
		else for (let e = 0; e < s; ++e) c[e] = (a - e) * o;
	} else if (o < 0) for (let e = 0; e < s; ++e) c[e] = (i + e) / -o;
	else for (let e = 0; e < s; ++e) c[e] = (i + e) * o;
	return c;
}
function _(e, t, n) {
	return t = +t, e = +e, n = +n, h(e, t, n)[2];
}
function v(e, t, n) {
	t = +t, e = +e, n = +n;
	let r = t < e, i = r ? _(t, e, n) : _(e, t, n);
	return (r ? -1 : 1) * (i < 0 ? 1 / -i : i);
}
// ../../../vision/spectacular/node_modules/d3-array/src/max.js
function y(e, t) {
	let n;
	if (t === void 0) for (let t of e) t != null && (n < t || n === void 0 && t >= t) && (n = t);
	else {
		let r = -1;
		for (let i of e) (i = t(i, ++r, e)) != null && (n < i || n === void 0 && i >= i) && (n = i);
	}
	return n;
}
// ../../../vision/spectacular/node_modules/d3-array/src/range.js
function b(e, t, n) {
	e = +e, t = +t, n = (i = arguments.length) < 2 ? (t = e, e = 0, 1) : i < 3 ? 1 : +n;
	for (var r = -1, i = Math.max(0, Math.ceil((t - e) / n)) | 0, a = Array(i); ++r < i;) a[r] = e + r * n;
	return a;
}
// ../../../vision/spectacular/node_modules/d3-axis/src/identity.js
function x(e) {
	return e;
}
// ../../../vision/spectacular/node_modules/d3-axis/src/axis.js
var S = 1, C = 2, w = 3, T = 4, E = 1e-6;
function D(e) {
	return "translate(" + e + ",0)";
}
function O(e) {
	return "translate(0," + e + ")";
}
function k(e) {
	return (t) => +e(t);
}
function A(e, t) {
	return t = Math.max(0, e.bandwidth() - t * 2) / 2, e.round() && (t = Math.round(t)), (n) => +e(n) + t;
}
function j() {
	return !this.__axis;
}
function M(e, t) {
	var n = [], r = null, i = null, a = 6, o = 6, s = 3, c = typeof window < "u" && window.devicePixelRatio > 1 ? 0 : .5, l = e === S || e === T ? -1 : 1, u = e === T || e === C ? "x" : "y", d = e === S || e === w ? D : O;
	function f(f) {
		var p = r ?? (t.ticks ? t.ticks.apply(t, n) : t.domain()), m = i ?? (t.tickFormat ? t.tickFormat.apply(t, n) : x), h = Math.max(a, 0) + s, g = t.range(), _ = +g[0] + c, v = +g[g.length - 1] + c, y = (t.bandwidth ? A : k)(t.copy(), c), b = f.selection ? f.selection() : f, D = b.selectAll(".domain").data([null]), O = b.selectAll(".tick").data(p, t).order(), M = O.exit(), N = O.enter().append("g").attr("class", "tick"), P = O.select("line"), F = O.select("text");
		D = D.merge(D.enter().insert("path", ".tick").attr("class", "domain").attr("stroke", "currentColor")), O = O.merge(N), P = P.merge(N.append("line").attr("stroke", "currentColor").attr(u + "2", l * a)), F = F.merge(N.append("text").attr("fill", "currentColor").attr(u, l * h).attr("dy", e === S ? "0em" : e === w ? "0.71em" : "0.32em")), f !== b && (D = D.transition(f), O = O.transition(f), P = P.transition(f), F = F.transition(f), M = M.transition(f).attr("opacity", E).attr("transform", function(e) {
			return isFinite(e = y(e)) ? d(e + c) : this.getAttribute("transform");
		}), N.attr("opacity", E).attr("transform", function(e) {
			var t = this.parentNode.__axis;
			return d((t && isFinite(t = t(e)) ? t : y(e)) + c);
		})), M.remove(), D.attr("d", e === T || e === C ? o ? "M" + l * o + "," + _ + "H" + c + "V" + v + "H" + l * o : "M" + c + "," + _ + "V" + v : o ? "M" + _ + "," + l * o + "V" + c + "H" + v + "V" + l * o : "M" + _ + "," + c + "H" + v), O.attr("opacity", 1).attr("transform", function(e) {
			return d(y(e) + c);
		}), P.attr(u + "2", l * a), F.attr(u, l * h).text(m), b.filter(j).attr("fill", "none").attr("font-size", 10).attr("font-family", "sans-serif").attr("text-anchor", e === C ? "start" : e === T ? "end" : "middle"), b.each(function() {
			this.__axis = y;
		});
	}
	return f.scale = function(e) {
		return arguments.length ? (t = e, f) : t;
	}, f.ticks = function() {
		return n = Array.from(arguments), f;
	}, f.tickArguments = function(e) {
		return arguments.length ? (n = e == null ? [] : Array.from(e), f) : n.slice();
	}, f.tickValues = function(e) {
		return arguments.length ? (r = e == null ? null : Array.from(e), f) : r && r.slice();
	}, f.tickFormat = function(e) {
		return arguments.length ? (i = e, f) : i;
	}, f.tickSize = function(e) {
		return arguments.length ? (a = o = +e, f) : a;
	}, f.tickSizeInner = function(e) {
		return arguments.length ? (a = +e, f) : a;
	}, f.tickSizeOuter = function(e) {
		return arguments.length ? (o = +e, f) : o;
	}, f.tickPadding = function(e) {
		return arguments.length ? (s = +e, f) : s;
	}, f.offset = function(e) {
		return arguments.length ? (c = +e, f) : c;
	}, f;
}
function N(e) {
	return M(w, e);
}
function P(e) {
	return M(T, e);
}
// ../../../vision/spectacular/node_modules/d3-dispatch/src/dispatch.js
var F = { value: () => {} };
function I() {
	for (var e = 0, t = arguments.length, n = {}, r; e < t; ++e) {
		if (!(r = arguments[e] + "") || r in n || /[\s.]/.test(r)) throw Error("illegal type: " + r);
		n[r] = [];
	}
	return new ee(n);
}
function ee(e) {
	this._ = e;
}
function te(e, t) {
	return e.trim().split(/^|\s+/).map(function(e) {
		var n = "", r = e.indexOf(".");
		if (r >= 0 && (n = e.slice(r + 1), e = e.slice(0, r)), e && !t.hasOwnProperty(e)) throw Error("unknown type: " + e);
		return {
			type: e,
			name: n
		};
	});
}
ee.prototype = I.prototype = {
	constructor: ee,
	on: function(e, t) {
		var n = this._, r = te(e + "", n), i, a = -1, o = r.length;
		if (arguments.length < 2) {
			for (; ++a < o;) if ((i = (e = r[a]).type) && (i = ne(n[i], e.name))) return i;
		} else {
			if (t != null && typeof t != "function") throw Error("invalid callback: " + t);
			for (; ++a < o;) if (i = (e = r[a]).type) n[i] = re(n[i], e.name, t);
			else if (t == null) for (i in n) n[i] = re(n[i], e.name, null);
			return this;
		}
	},
	copy: function() {
		var e = {}, t = this._;
		for (var n in t) e[n] = t[n].slice();
		return new ee(e);
	},
	call: function(e, t) {
		if ((i = arguments.length - 2) > 0) for (var n = Array(i), r = 0, i, a; r < i; ++r) n[r] = arguments[r + 2];
		if (!this._.hasOwnProperty(e)) throw Error("unknown type: " + e);
		for (a = this._[e], r = 0, i = a.length; r < i; ++r) a[r].value.apply(t, n);
	},
	apply: function(e, t, n) {
		if (!this._.hasOwnProperty(e)) throw Error("unknown type: " + e);
		for (var r = this._[e], i = 0, a = r.length; i < a; ++i) r[i].value.apply(t, n);
	}
};
function ne(e, t) {
	for (var n = 0, r = e.length, i; n < r; ++n) if ((i = e[n]).name === t) return i.value;
}
function re(e, t, n) {
	for (var r = 0, i = e.length; r < i; ++r) if (e[r].name === t) {
		e[r] = F, e = e.slice(0, r).concat(e.slice(r + 1));
		break;
	}
	return n != null && e.push({
		name: t,
		value: n
	}), e;
}
var L = {
	svg: "http://www.w3.org/2000/svg",
	xhtml: "http://www.w3.org/1999/xhtml",
	xlink: "http://www.w3.org/1999/xlink",
	xml: "http://www.w3.org/XML/1998/namespace",
	xmlns: "http://www.w3.org/2000/xmlns/"
};
// ../../../vision/spectacular/node_modules/d3-selection/src/namespace.js
function ie(e) {
	var t = e += "", n = t.indexOf(":");
	return n >= 0 && (t = e.slice(0, n)) !== "xmlns" && (e = e.slice(n + 1)), L.hasOwnProperty(t) ? {
		space: L[t],
		local: e
	} : e;
}
// ../../../vision/spectacular/node_modules/d3-selection/src/creator.js
function R(e) {
	return function() {
		var t = this.ownerDocument, n = this.namespaceURI;
		return n === "http://www.w3.org/1999/xhtml" && t.documentElement.namespaceURI === "http://www.w3.org/1999/xhtml" ? t.createElement(e) : t.createElementNS(n, e);
	};
}
function ae(e) {
	return function() {
		return this.ownerDocument.createElementNS(e.space, e.local);
	};
}
function oe(e) {
	var t = ie(e);
	return (t.local ? ae : R)(t);
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selector.js
function se() {}
function ce(e) {
	return e == null ? se : function() {
		return this.querySelector(e);
	};
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/select.js
function le(e) {
	typeof e != "function" && (e = ce(e));
	for (var t = this._groups, n = t.length, r = Array(n), i = 0; i < n; ++i) for (var a = t[i], o = a.length, s = r[i] = Array(o), c, l, u = 0; u < o; ++u) (c = a[u]) && (l = e.call(c, c.__data__, u, a)) && ("__data__" in c && (l.__data__ = c.__data__), s[u] = l);
	return new qt(r, this._parents);
}
// ../../../vision/spectacular/node_modules/d3-selection/src/array.js
function ue(e) {
	return e == null ? [] : Array.isArray(e) ? e : Array.from(e);
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selectorAll.js
function de() {
	return [];
}
function fe(e) {
	return e == null ? de : function() {
		return this.querySelectorAll(e);
	};
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/selectAll.js
function pe(e) {
	return function() {
		return ue(e.apply(this, arguments));
	};
}
function me(e) {
	e = typeof e == "function" ? pe(e) : fe(e);
	for (var t = this._groups, n = t.length, r = [], i = [], a = 0; a < n; ++a) for (var o = t[a], s = o.length, c, l = 0; l < s; ++l) (c = o[l]) && (r.push(e.call(c, c.__data__, l, o)), i.push(c));
	return new qt(r, i);
}
// ../../../vision/spectacular/node_modules/d3-selection/src/matcher.js
function he(e) {
	return function() {
		return this.matches(e);
	};
}
function ge(e) {
	return function(t) {
		return t.matches(e);
	};
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/selectChild.js
var _e = Array.prototype.find;
function ve(e) {
	return function() {
		return _e.call(this.children, e);
	};
}
function z() {
	return this.firstElementChild;
}
function ye(e) {
	return this.select(e == null ? z : ve(typeof e == "function" ? e : ge(e)));
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/selectChildren.js
var be = Array.prototype.filter;
function xe() {
	return Array.from(this.children);
}
function B(e) {
	return function() {
		return be.call(this.children, e);
	};
}
function Se(e) {
	return this.selectAll(e == null ? xe : B(typeof e == "function" ? e : ge(e)));
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/filter.js
function V(e) {
	typeof e != "function" && (e = he(e));
	for (var t = this._groups, n = t.length, r = Array(n), i = 0; i < n; ++i) for (var a = t[i], o = a.length, s = r[i] = [], c, l = 0; l < o; ++l) (c = a[l]) && e.call(c, c.__data__, l, a) && s.push(c);
	return new qt(r, this._parents);
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/sparse.js
function H(e) {
	return Array(e.length);
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/enter.js
function Ce() {
	return new qt(this._enter || this._groups.map(H), this._parents);
}
function we(e, t) {
	this.ownerDocument = e.ownerDocument, this.namespaceURI = e.namespaceURI, this._next = null, this._parent = e, this.__data__ = t;
}
we.prototype = {
	constructor: we,
	appendChild: function(e) {
		return this._parent.insertBefore(e, this._next);
	},
	insertBefore: function(e, t) {
		return this._parent.insertBefore(e, t);
	},
	querySelector: function(e) {
		return this._parent.querySelector(e);
	},
	querySelectorAll: function(e) {
		return this._parent.querySelectorAll(e);
	}
};
// ../../../vision/spectacular/node_modules/d3-selection/src/constant.js
function Te(e) {
	return function() {
		return e;
	};
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/data.js
function Ee(e, t, n, r, i, a) {
	for (var o = 0, s, c = t.length, l = a.length; o < l; ++o) (s = t[o]) ? (s.__data__ = a[o], r[o] = s) : n[o] = new we(e, a[o]);
	for (; o < c; ++o) (s = t[o]) && (i[o] = s);
}
function De(e, t, n, r, i, a, o) {
	var s, c, l = /* @__PURE__ */ new Map(), u = t.length, d = a.length, f = Array(u), p;
	for (s = 0; s < u; ++s) (c = t[s]) && (f[s] = p = o.call(c, c.__data__, s, t) + "", l.has(p) ? i[s] = c : l.set(p, c));
	for (s = 0; s < d; ++s) p = o.call(e, a[s], s, a) + "", (c = l.get(p)) ? (r[s] = c, c.__data__ = a[s], l.delete(p)) : n[s] = new we(e, a[s]);
	for (s = 0; s < u; ++s) (c = t[s]) && l.get(f[s]) === c && (i[s] = c);
}
function Oe(e) {
	return e.__data__;
}
function ke(e, t) {
	if (!arguments.length) return Array.from(this, Oe);
	var n = t ? De : Ee, r = this._parents, i = this._groups;
	typeof e != "function" && (e = Te(e));
	for (var a = i.length, o = Array(a), s = Array(a), c = Array(a), l = 0; l < a; ++l) {
		var u = r[l], d = i[l], f = d.length, p = Ae(e.call(u, u && u.__data__, l, r)), m = p.length, h = s[l] = Array(m), g = o[l] = Array(m);
		n(u, d, h, g, c[l] = Array(f), p, t);
		for (var _ = 0, v = 0, y, b; _ < m; ++_) if (y = h[_]) {
			for (_ >= v && (v = _ + 1); !(b = g[v]) && ++v < m;);
			y._next = b || null;
		}
	}
	return o = new qt(o, r), o._enter = s, o._exit = c, o;
}
function Ae(e) {
	return typeof e == "object" && "length" in e ? e : Array.from(e);
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/exit.js
function je() {
	return new qt(this._exit || this._groups.map(H), this._parents);
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/join.js
function Me(e, t, n) {
	var r = this.enter(), i = this, a = this.exit();
	return typeof e == "function" ? (r = e(r), r &&= r.selection()) : r = r.append(e + ""), t != null && (i = t(i), i &&= i.selection()), n == null ? a.remove() : n(a), r && i ? r.merge(i).order() : i;
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/merge.js
function Ne(e) {
	for (var t = e.selection ? e.selection() : e, n = this._groups, r = t._groups, i = n.length, a = r.length, o = Math.min(i, a), s = Array(i), c = 0; c < o; ++c) for (var l = n[c], u = r[c], d = l.length, f = s[c] = Array(d), p, m = 0; m < d; ++m) (p = l[m] || u[m]) && (f[m] = p);
	for (; c < i; ++c) s[c] = n[c];
	return new qt(s, this._parents);
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/order.js
function Pe() {
	for (var e = this._groups, t = -1, n = e.length; ++t < n;) for (var r = e[t], i = r.length - 1, a = r[i], o; --i >= 0;) (o = r[i]) && (a && o.compareDocumentPosition(a) ^ 4 && a.parentNode.insertBefore(o, a), a = o);
	return this;
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/sort.js
function Fe(e) {
	e ||= Ie;
	function t(t, n) {
		return t && n ? e(t.__data__, n.__data__) : !t - !n;
	}
	for (var n = this._groups, r = n.length, i = Array(r), a = 0; a < r; ++a) {
		for (var o = n[a], s = o.length, c = i[a] = Array(s), l, u = 0; u < s; ++u) (l = o[u]) && (c[u] = l);
		c.sort(t);
	}
	return new qt(i, this._parents).order();
}
function Ie(e, t) {
	return e < t ? -1 : e > t ? 1 : e >= t ? 0 : NaN;
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/call.js
function Le() {
	var e = arguments[0];
	return arguments[0] = this, e.apply(null, arguments), this;
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/nodes.js
function Re() {
	return Array.from(this);
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/node.js
function ze() {
	for (var e = this._groups, t = 0, n = e.length; t < n; ++t) for (var r = e[t], i = 0, a = r.length; i < a; ++i) {
		var o = r[i];
		if (o) return o;
	}
	return null;
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/size.js
function Be() {
	let e = 0;
	for (let t of this) ++e;
	return e;
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/empty.js
function Ve() {
	return !this.node();
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/each.js
function He(e) {
	for (var t = this._groups, n = 0, r = t.length; n < r; ++n) for (var i = t[n], a = 0, o = i.length, s; a < o; ++a) (s = i[a]) && e.call(s, s.__data__, a, i);
	return this;
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/attr.js
function Ue(e) {
	return function() {
		this.removeAttribute(e);
	};
}
function We(e) {
	return function() {
		this.removeAttributeNS(e.space, e.local);
	};
}
function Ge(e, t) {
	return function() {
		this.setAttribute(e, t);
	};
}
function Ke(e, t) {
	return function() {
		this.setAttributeNS(e.space, e.local, t);
	};
}
function qe(e, t) {
	return function() {
		var n = t.apply(this, arguments);
		n == null ? this.removeAttribute(e) : this.setAttribute(e, n);
	};
}
function Je(e, t) {
	return function() {
		var n = t.apply(this, arguments);
		n == null ? this.removeAttributeNS(e.space, e.local) : this.setAttributeNS(e.space, e.local, n);
	};
}
function Ye(e, t) {
	var n = ie(e);
	if (arguments.length < 2) {
		var r = this.node();
		return n.local ? r.getAttributeNS(n.space, n.local) : r.getAttribute(n);
	}
	return this.each((t == null ? n.local ? We : Ue : typeof t == "function" ? n.local ? Je : qe : n.local ? Ke : Ge)(n, t));
}
// ../../../vision/spectacular/node_modules/d3-selection/src/window.js
function Xe(e) {
	return e.ownerDocument && e.ownerDocument.defaultView || e.document && e || e.defaultView;
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/style.js
function Ze(e) {
	return function() {
		this.style.removeProperty(e);
	};
}
function Qe(e, t, n) {
	return function() {
		this.style.setProperty(e, t, n);
	};
}
function $e(e, t, n) {
	return function() {
		var r = t.apply(this, arguments);
		r == null ? this.style.removeProperty(e) : this.style.setProperty(e, r, n);
	};
}
function et(e, t, n) {
	return arguments.length > 1 ? this.each((t == null ? Ze : typeof t == "function" ? $e : Qe)(e, t, n ?? "")) : tt(this.node(), e);
}
function tt(e, t) {
	return e.style.getPropertyValue(t) || Xe(e).getComputedStyle(e, null).getPropertyValue(t);
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/property.js
function nt(e) {
	return function() {
		delete this[e];
	};
}
function rt(e, t) {
	return function() {
		this[e] = t;
	};
}
function it(e, t) {
	return function() {
		var n = t.apply(this, arguments);
		n == null ? delete this[e] : this[e] = n;
	};
}
function at(e, t) {
	return arguments.length > 1 ? this.each((t == null ? nt : typeof t == "function" ? it : rt)(e, t)) : this.node()[e];
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/classed.js
function ot(e) {
	return e.trim().split(/^|\s+/);
}
function st(e) {
	return e.classList || new ct(e);
}
function ct(e) {
	this._node = e, this._names = ot(e.getAttribute("class") || "");
}
ct.prototype = {
	add: function(e) {
		this._names.indexOf(e) < 0 && (this._names.push(e), this._node.setAttribute("class", this._names.join(" ")));
	},
	remove: function(e) {
		var t = this._names.indexOf(e);
		t >= 0 && (this._names.splice(t, 1), this._node.setAttribute("class", this._names.join(" ")));
	},
	contains: function(e) {
		return this._names.indexOf(e) >= 0;
	}
};
function lt(e, t) {
	for (var n = st(e), r = -1, i = t.length; ++r < i;) n.add(t[r]);
}
function ut(e, t) {
	for (var n = st(e), r = -1, i = t.length; ++r < i;) n.remove(t[r]);
}
function dt(e) {
	return function() {
		lt(this, e);
	};
}
function ft(e) {
	return function() {
		ut(this, e);
	};
}
function pt(e, t) {
	return function() {
		(t.apply(this, arguments) ? lt : ut)(this, e);
	};
}
function mt(e, t) {
	var n = ot(e + "");
	if (arguments.length < 2) {
		for (var r = st(this.node()), i = -1, a = n.length; ++i < a;) if (!r.contains(n[i])) return !1;
		return !0;
	}
	return this.each((typeof t == "function" ? pt : t ? dt : ft)(n, t));
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/text.js
function ht() {
	this.textContent = "";
}
function gt(e) {
	return function() {
		this.textContent = e;
	};
}
function _t(e) {
	return function() {
		var t = e.apply(this, arguments);
		this.textContent = t ?? "";
	};
}
function vt(e) {
	return arguments.length ? this.each(e == null ? ht : (typeof e == "function" ? _t : gt)(e)) : this.node().textContent;
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/html.js
function yt() {
	this.innerHTML = "";
}
function bt(e) {
	return function() {
		this.innerHTML = e;
	};
}
function xt(e) {
	return function() {
		var t = e.apply(this, arguments);
		this.innerHTML = t ?? "";
	};
}
function St(e) {
	return arguments.length ? this.each(e == null ? yt : (typeof e == "function" ? xt : bt)(e)) : this.node().innerHTML;
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/raise.js
function Ct() {
	this.nextSibling && this.parentNode.appendChild(this);
}
function wt() {
	return this.each(Ct);
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/lower.js
function Tt() {
	this.previousSibling && this.parentNode.insertBefore(this, this.parentNode.firstChild);
}
function Et() {
	return this.each(Tt);
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/append.js
function Dt(e) {
	var t = typeof e == "function" ? e : oe(e);
	return this.select(function() {
		return this.appendChild(t.apply(this, arguments));
	});
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/insert.js
function Ot() {
	return null;
}
function kt(e, t) {
	var n = typeof e == "function" ? e : oe(e), r = t == null ? Ot : typeof t == "function" ? t : ce(t);
	return this.select(function() {
		return this.insertBefore(n.apply(this, arguments), r.apply(this, arguments) || null);
	});
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/remove.js
function At() {
	var e = this.parentNode;
	e && e.removeChild(this);
}
function jt() {
	return this.each(At);
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/clone.js
function Mt() {
	var e = this.cloneNode(!1), t = this.parentNode;
	return t ? t.insertBefore(e, this.nextSibling) : e;
}
function Nt() {
	var e = this.cloneNode(!0), t = this.parentNode;
	return t ? t.insertBefore(e, this.nextSibling) : e;
}
function Pt(e) {
	return this.select(e ? Nt : Mt);
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/datum.js
function Ft(e) {
	return arguments.length ? this.property("__data__", e) : this.node().__data__;
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/on.js
function It(e) {
	return function(t) {
		e.call(this, t, this.__data__);
	};
}
function Lt(e) {
	return e.trim().split(/^|\s+/).map(function(e) {
		var t = "", n = e.indexOf(".");
		return n >= 0 && (t = e.slice(n + 1), e = e.slice(0, n)), {
			type: e,
			name: t
		};
	});
}
function Rt(e) {
	return function() {
		var t = this.__on;
		if (t) {
			for (var n = 0, r = -1, i = t.length, a; n < i; ++n) a = t[n], (!e.type || a.type === e.type) && a.name === e.name ? this.removeEventListener(a.type, a.listener, a.options) : t[++r] = a;
			++r ? t.length = r : delete this.__on;
		}
	};
}
function zt(e, t, n) {
	return function() {
		var r = this.__on, i, a = It(t);
		if (r) {
			for (var o = 0, s = r.length; o < s; ++o) if ((i = r[o]).type === e.type && i.name === e.name) {
				this.removeEventListener(i.type, i.listener, i.options), this.addEventListener(i.type, i.listener = a, i.options = n), i.value = t;
				return;
			}
		}
		this.addEventListener(e.type, a, n), i = {
			type: e.type,
			name: e.name,
			value: t,
			listener: a,
			options: n
		}, r ? r.push(i) : this.__on = [i];
	};
}
function Bt(e, t, n) {
	var r = Lt(e + ""), i, a = r.length, o;
	if (arguments.length < 2) {
		var s = this.node().__on;
		if (s) {
			for (var c = 0, l = s.length, u; c < l; ++c) for (i = 0, u = s[c]; i < a; ++i) if ((o = r[i]).type === u.type && o.name === u.name) return u.value;
		}
	} else {
		for (s = t ? zt : Rt, i = 0; i < a; ++i) this.each(s(r[i], t, n));
		return this;
	}
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/dispatch.js
function Vt(e, t, n) {
	var r = Xe(e), i = r.CustomEvent;
	typeof i == "function" ? i = new i(t, n) : (i = r.document.createEvent("Event"), n ? (i.initEvent(t, n.bubbles, n.cancelable), i.detail = n.detail) : i.initEvent(t, !1, !1)), e.dispatchEvent(i);
}
function Ht(e, t) {
	return function() {
		return Vt(this, e, t);
	};
}
function Ut(e, t) {
	return function() {
		return Vt(this, e, t.apply(this, arguments));
	};
}
function Wt(e, t) {
	return this.each((typeof t == "function" ? Ut : Ht)(e, t));
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/iterator.js
function* Gt() {
	for (var e = this._groups, t = 0, n = e.length; t < n; ++t) for (var r = e[t], i = 0, a = r.length, o; i < a; ++i) (o = r[i]) && (yield o);
}
// ../../../vision/spectacular/node_modules/d3-selection/src/selection/index.js
var Kt = [null];
function qt(e, t) {
	this._groups = e, this._parents = t;
}
function Jt() {
	return new qt([[document.documentElement]], Kt);
}
function Yt() {
	return this;
}
qt.prototype = Jt.prototype = {
	constructor: qt,
	select: le,
	selectAll: me,
	selectChild: ye,
	selectChildren: Se,
	filter: V,
	data: ke,
	enter: Ce,
	exit: je,
	join: Me,
	merge: Ne,
	selection: Yt,
	order: Pe,
	sort: Fe,
	call: Le,
	nodes: Re,
	node: ze,
	size: Be,
	empty: Ve,
	each: He,
	attr: Ye,
	style: et,
	property: at,
	classed: mt,
	text: vt,
	html: St,
	raise: wt,
	lower: Et,
	append: Dt,
	insert: kt,
	remove: jt,
	clone: Pt,
	datum: Ft,
	on: Bt,
	dispatch: Wt,
	[Symbol.iterator]: Gt
};
// ../../../vision/spectacular/node_modules/d3-selection/src/select.js
function Xt(e) {
	return typeof e == "string" ? new qt([[document.querySelector(e)]], [document.documentElement]) : new qt([[e]], Kt);
}
// ../../../vision/spectacular/node_modules/d3-selection/src/sourceEvent.js
function Zt(e) {
	let t;
	for (; t = e.sourceEvent;) e = t;
	return e;
}
// ../../../vision/spectacular/node_modules/d3-selection/src/pointer.js
function Qt(e, t) {
	if (e = Zt(e), t === void 0 && (t = e.currentTarget), t) {
		var n = t.ownerSVGElement || t;
		if (n.createSVGPoint) {
			var r = n.createSVGPoint();
			return r.x = e.clientX, r.y = e.clientY, r = r.matrixTransform(t.getScreenCTM().inverse()), [r.x, r.y];
		}
		if (t.getBoundingClientRect) {
			var i = t.getBoundingClientRect();
			return [e.clientX - i.left - t.clientLeft, e.clientY - i.top - t.clientTop];
		}
	}
	return [e.pageX, e.pageY];
}
// ../../../vision/spectacular/node_modules/d3-drag/src/noevent.js
var $t = {
	capture: !0,
	passive: !1
};
function en(e) {
	e.preventDefault(), e.stopImmediatePropagation();
}
// ../../../vision/spectacular/node_modules/d3-drag/src/nodrag.js
function tn(e) {
	var t = e.document.documentElement, n = Xt(e).on("dragstart.drag", en, $t);
	"onselectstart" in t ? n.on("selectstart.drag", en, $t) : (t.__noselect = t.style.MozUserSelect, t.style.MozUserSelect = "none");
}
function nn(e, t) {
	var n = e.document.documentElement, r = Xt(e).on("dragstart.drag", null);
	t && (r.on("click.drag", en, $t), setTimeout(function() {
		r.on("click.drag", null);
	}, 0)), "onselectstart" in n ? r.on("selectstart.drag", null) : (n.style.MozUserSelect = n.__noselect, delete n.__noselect);
}
// ../../../vision/spectacular/node_modules/d3-color/src/define.js
function rn(e, t, n) {
	e.prototype = t.prototype = n, n.constructor = e;
}
function an(e, t) {
	var n = Object.create(e.prototype);
	for (var r in t) n[r] = t[r];
	return n;
}
// ../../../vision/spectacular/node_modules/d3-color/src/color.js
function on() {}
var sn = .7, cn = 1 / sn, ln = "\\s*([+-]?\\d+)\\s*", un = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", dn = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", fn = /^#([0-9a-f]{3,8})$/, pn = RegExp(`^rgb\\(${ln},${ln},${ln}\\)$`), mn = RegExp(`^rgb\\(${dn},${dn},${dn}\\)$`), hn = RegExp(`^rgba\\(${ln},${ln},${ln},${un}\\)$`), gn = RegExp(`^rgba\\(${dn},${dn},${dn},${un}\\)$`), _n = RegExp(`^hsl\\(${un},${dn},${dn}\\)$`), vn = RegExp(`^hsla\\(${un},${dn},${dn},${un}\\)$`), yn = {
	aliceblue: 15792383,
	antiquewhite: 16444375,
	aqua: 65535,
	aquamarine: 8388564,
	azure: 15794175,
	beige: 16119260,
	bisque: 16770244,
	black: 0,
	blanchedalmond: 16772045,
	blue: 255,
	blueviolet: 9055202,
	brown: 10824234,
	burlywood: 14596231,
	cadetblue: 6266528,
	chartreuse: 8388352,
	chocolate: 13789470,
	coral: 16744272,
	cornflowerblue: 6591981,
	cornsilk: 16775388,
	crimson: 14423100,
	cyan: 65535,
	darkblue: 139,
	darkcyan: 35723,
	darkgoldenrod: 12092939,
	darkgray: 11119017,
	darkgreen: 25600,
	darkgrey: 11119017,
	darkkhaki: 12433259,
	darkmagenta: 9109643,
	darkolivegreen: 5597999,
	darkorange: 16747520,
	darkorchid: 10040012,
	darkred: 9109504,
	darksalmon: 15308410,
	darkseagreen: 9419919,
	darkslateblue: 4734347,
	darkslategray: 3100495,
	darkslategrey: 3100495,
	darkturquoise: 52945,
	darkviolet: 9699539,
	deeppink: 16716947,
	deepskyblue: 49151,
	dimgray: 6908265,
	dimgrey: 6908265,
	dodgerblue: 2003199,
	firebrick: 11674146,
	floralwhite: 16775920,
	forestgreen: 2263842,
	fuchsia: 16711935,
	gainsboro: 14474460,
	ghostwhite: 16316671,
	gold: 16766720,
	goldenrod: 14329120,
	gray: 8421504,
	green: 32768,
	greenyellow: 11403055,
	grey: 8421504,
	honeydew: 15794160,
	hotpink: 16738740,
	indianred: 13458524,
	indigo: 4915330,
	ivory: 16777200,
	khaki: 15787660,
	lavender: 15132410,
	lavenderblush: 16773365,
	lawngreen: 8190976,
	lemonchiffon: 16775885,
	lightblue: 11393254,
	lightcoral: 15761536,
	lightcyan: 14745599,
	lightgoldenrodyellow: 16448210,
	lightgray: 13882323,
	lightgreen: 9498256,
	lightgrey: 13882323,
	lightpink: 16758465,
	lightsalmon: 16752762,
	lightseagreen: 2142890,
	lightskyblue: 8900346,
	lightslategray: 7833753,
	lightslategrey: 7833753,
	lightsteelblue: 11584734,
	lightyellow: 16777184,
	lime: 65280,
	limegreen: 3329330,
	linen: 16445670,
	magenta: 16711935,
	maroon: 8388608,
	mediumaquamarine: 6737322,
	mediumblue: 205,
	mediumorchid: 12211667,
	mediumpurple: 9662683,
	mediumseagreen: 3978097,
	mediumslateblue: 8087790,
	mediumspringgreen: 64154,
	mediumturquoise: 4772300,
	mediumvioletred: 13047173,
	midnightblue: 1644912,
	mintcream: 16121850,
	mistyrose: 16770273,
	moccasin: 16770229,
	navajowhite: 16768685,
	navy: 128,
	oldlace: 16643558,
	olive: 8421376,
	olivedrab: 7048739,
	orange: 16753920,
	orangered: 16729344,
	orchid: 14315734,
	palegoldenrod: 15657130,
	palegreen: 10025880,
	paleturquoise: 11529966,
	palevioletred: 14381203,
	papayawhip: 16773077,
	peachpuff: 16767673,
	peru: 13468991,
	pink: 16761035,
	plum: 14524637,
	powderblue: 11591910,
	purple: 8388736,
	rebeccapurple: 6697881,
	red: 16711680,
	rosybrown: 12357519,
	royalblue: 4286945,
	saddlebrown: 9127187,
	salmon: 16416882,
	sandybrown: 16032864,
	seagreen: 3050327,
	seashell: 16774638,
	sienna: 10506797,
	silver: 12632256,
	skyblue: 8900331,
	slateblue: 6970061,
	slategray: 7372944,
	slategrey: 7372944,
	snow: 16775930,
	springgreen: 65407,
	steelblue: 4620980,
	tan: 13808780,
	teal: 32896,
	thistle: 14204888,
	tomato: 16737095,
	turquoise: 4251856,
	violet: 15631086,
	wheat: 16113331,
	white: 16777215,
	whitesmoke: 16119285,
	yellow: 16776960,
	yellowgreen: 10145074
};
rn(on, wn, {
	copy(e) {
		return Object.assign(new this.constructor(), this, e);
	},
	displayable() {
		return this.rgb().displayable();
	},
	hex: bn,
	formatHex: bn,
	formatHex8: xn,
	formatHsl: Sn,
	formatRgb: Cn,
	toString: Cn
});
function bn() {
	return this.rgb().formatHex();
}
function xn() {
	return this.rgb().formatHex8();
}
function Sn() {
	return Ln(this).formatHsl();
}
function Cn() {
	return this.rgb().formatRgb();
}
function wn(e) {
	var t, n;
	return e = (e + "").trim().toLowerCase(), (t = fn.exec(e)) ? (n = t[1].length, t = parseInt(t[1], 16), n === 6 ? Tn(t) : n === 3 ? new kn(t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, (t & 15) << 4 | t & 15, 1) : n === 8 ? En(t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, (t & 255) / 255) : n === 4 ? En(t >> 12 & 15 | t >> 8 & 240, t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, ((t & 15) << 4 | t & 15) / 255) : null) : (t = pn.exec(e)) ? new kn(t[1], t[2], t[3], 1) : (t = mn.exec(e)) ? new kn(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, 1) : (t = hn.exec(e)) ? En(t[1], t[2], t[3], t[4]) : (t = gn.exec(e)) ? En(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, t[4]) : (t = _n.exec(e)) ? In(t[1], t[2] / 100, t[3] / 100, 1) : (t = vn.exec(e)) ? In(t[1], t[2] / 100, t[3] / 100, t[4]) : yn.hasOwnProperty(e) ? Tn(yn[e]) : e === "transparent" ? new kn(NaN, NaN, NaN, 0) : null;
}
function Tn(e) {
	return new kn(e >> 16 & 255, e >> 8 & 255, e & 255, 1);
}
function En(e, t, n, r) {
	return r <= 0 && (e = t = n = NaN), new kn(e, t, n, r);
}
function Dn(e) {
	return e instanceof on || (e = wn(e)), e ? (e = e.rgb(), new kn(e.r, e.g, e.b, e.opacity)) : new kn();
}
function On(e, t, n, r) {
	return arguments.length === 1 ? Dn(e) : new kn(e, t, n, r ?? 1);
}
function kn(e, t, n, r) {
	this.r = +e, this.g = +t, this.b = +n, this.opacity = +r;
}
rn(kn, On, an(on, {
	brighter(e) {
		return e = e == null ? cn : cn ** +e, new kn(this.r * e, this.g * e, this.b * e, this.opacity);
	},
	darker(e) {
		return e = e == null ? sn : sn ** +e, new kn(this.r * e, this.g * e, this.b * e, this.opacity);
	},
	rgb() {
		return this;
	},
	clamp() {
		return new kn(Pn(this.r), Pn(this.g), Pn(this.b), Nn(this.opacity));
	},
	displayable() {
		return -.5 <= this.r && this.r < 255.5 && -.5 <= this.g && this.g < 255.5 && -.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
	},
	hex: An,
	formatHex: An,
	formatHex8: jn,
	formatRgb: Mn,
	toString: Mn
}));
function An() {
	return `#${Fn(this.r)}${Fn(this.g)}${Fn(this.b)}`;
}
function jn() {
	return `#${Fn(this.r)}${Fn(this.g)}${Fn(this.b)}${Fn((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}
function Mn() {
	let e = Nn(this.opacity);
	return `${e === 1 ? "rgb(" : "rgba("}${Pn(this.r)}, ${Pn(this.g)}, ${Pn(this.b)}${e === 1 ? ")" : `, ${e})`}`;
}
function Nn(e) {
	return isNaN(e) ? 1 : Math.max(0, Math.min(1, e));
}
function Pn(e) {
	return Math.max(0, Math.min(255, Math.round(e) || 0));
}
function Fn(e) {
	return e = Pn(e), (e < 16 ? "0" : "") + e.toString(16);
}
function In(e, t, n, r) {
	return r <= 0 ? e = t = n = NaN : n <= 0 || n >= 1 ? e = t = NaN : t <= 0 && (e = NaN), new zn(e, t, n, r);
}
function Ln(e) {
	if (e instanceof zn) return new zn(e.h, e.s, e.l, e.opacity);
	if (e instanceof on || (e = wn(e)), !e) return new zn();
	if (e instanceof zn) return e;
	e = e.rgb();
	var t = e.r / 255, n = e.g / 255, r = e.b / 255, i = Math.min(t, n, r), a = Math.max(t, n, r), o = NaN, s = a - i, c = (a + i) / 2;
	return s ? (o = t === a ? (n - r) / s + (n < r) * 6 : n === a ? (r - t) / s + 2 : (t - n) / s + 4, s /= c < .5 ? a + i : 2 - a - i, o *= 60) : s = c > 0 && c < 1 ? 0 : o, new zn(o, s, c, e.opacity);
}
function Rn(e, t, n, r) {
	return arguments.length === 1 ? Ln(e) : new zn(e, t, n, r ?? 1);
}
function zn(e, t, n, r) {
	this.h = +e, this.s = +t, this.l = +n, this.opacity = +r;
}
rn(zn, Rn, an(on, {
	brighter(e) {
		return e = e == null ? cn : cn ** +e, new zn(this.h, this.s, this.l * e, this.opacity);
	},
	darker(e) {
		return e = e == null ? sn : sn ** +e, new zn(this.h, this.s, this.l * e, this.opacity);
	},
	rgb() {
		var e = this.h % 360 + (this.h < 0) * 360, t = isNaN(e) || isNaN(this.s) ? 0 : this.s, n = this.l, r = n + (n < .5 ? n : 1 - n) * t, i = 2 * n - r;
		return new kn(Hn(e >= 240 ? e - 240 : e + 120, i, r), Hn(e, i, r), Hn(e < 120 ? e + 240 : e - 120, i, r), this.opacity);
	},
	clamp() {
		return new zn(Bn(this.h), Vn(this.s), Vn(this.l), Nn(this.opacity));
	},
	displayable() {
		return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
	},
	formatHsl() {
		let e = Nn(this.opacity);
		return `${e === 1 ? "hsl(" : "hsla("}${Bn(this.h)}, ${Vn(this.s) * 100}%, ${Vn(this.l) * 100}%${e === 1 ? ")" : `, ${e})`}`;
	}
}));
function Bn(e) {
	return e = (e || 0) % 360, e < 0 ? e + 360 : e;
}
function Vn(e) {
	return Math.max(0, Math.min(1, e || 0));
}
function Hn(e, t, n) {
	return (e < 60 ? t + (n - t) * e / 60 : e < 180 ? n : e < 240 ? t + (n - t) * (240 - e) / 60 : t) * 255;
}
// ../../../vision/spectacular/node_modules/d3-interpolate/src/constant.js
var Un = (e) => () => e;
// ../../../vision/spectacular/node_modules/d3-interpolate/src/color.js
function Wn(e, t) {
	return function(n) {
		return e + n * t;
	};
}
function Gn(e, t, n) {
	return e **= +n, t = t ** +n - e, n = 1 / n, function(r) {
		return (e + r * t) ** +n;
	};
}
function Kn(e) {
	return (e = +e) == 1 ? qn : function(t, n) {
		return n - t ? Gn(t, n, e) : Un(isNaN(t) ? n : t);
	};
}
function qn(e, t) {
	var n = t - e;
	return n ? Wn(e, n) : Un(isNaN(e) ? t : e);
}
// ../../../vision/spectacular/node_modules/d3-interpolate/src/rgb.js
var Jn = (function e(t) {
	var n = Kn(t);
	function r(e, t) {
		var r = n((e = On(e)).r, (t = On(t)).r), i = n(e.g, t.g), a = n(e.b, t.b), o = qn(e.opacity, t.opacity);
		return function(t) {
			return e.r = r(t), e.g = i(t), e.b = a(t), e.opacity = o(t), e + "";
		};
	}
	return r.gamma = e, r;
})(1);
// ../../../vision/spectacular/node_modules/d3-interpolate/src/numberArray.js
function Yn(e, t) {
	t ||= [];
	var n = e ? Math.min(t.length, e.length) : 0, r = t.slice(), i;
	return function(a) {
		for (i = 0; i < n; ++i) r[i] = e[i] * (1 - a) + t[i] * a;
		return r;
	};
}
function Xn(e) {
	return ArrayBuffer.isView(e) && !(e instanceof DataView);
}
// ../../../vision/spectacular/node_modules/d3-interpolate/src/array.js
function Zn(e, t) {
	for (var n = t ? t.length : 0, r = e ? Math.min(n, e.length) : 0, i = Array(r), a = Array(n), o = 0; o < r; ++o) i[o] = or(e[o], t[o]);
	for (; o < n; ++o) a[o] = t[o];
	return function(e) {
		for (o = 0; o < r; ++o) a[o] = i[o](e);
		return a;
	};
}
// ../../../vision/spectacular/node_modules/d3-interpolate/src/date.js
function Qn(e, t) {
	var n = /* @__PURE__ */ new Date();
	return e = +e, t = +t, function(r) {
		return n.setTime(e * (1 - r) + t * r), n;
	};
}
// ../../../vision/spectacular/node_modules/d3-interpolate/src/number.js
function $n(e, t) {
	return e = +e, t = +t, function(n) {
		return e * (1 - n) + t * n;
	};
}
// ../../../vision/spectacular/node_modules/d3-interpolate/src/object.js
function er(e, t) {
	var n = {}, r = {}, i;
	for (i in typeof e == "object" && e || (e = {}), typeof t == "object" && t || (t = {}), t) i in e ? n[i] = or(e[i], t[i]) : r[i] = t[i];
	return function(e) {
		for (i in n) r[i] = n[i](e);
		return r;
	};
}
// ../../../vision/spectacular/node_modules/d3-interpolate/src/string.js
var tr = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, nr = new RegExp(tr.source, "g");
function rr(e) {
	return function() {
		return e;
	};
}
function ir(e) {
	return function(t) {
		return e(t) + "";
	};
}
function ar(e, t) {
	var n = tr.lastIndex = nr.lastIndex = 0, r, i, a, o = -1, s = [], c = [];
	for (e += "", t += ""; (r = tr.exec(e)) && (i = nr.exec(t));) (a = i.index) > n && (a = t.slice(n, a), s[o] ? s[o] += a : s[++o] = a), (r = r[0]) === (i = i[0]) ? s[o] ? s[o] += i : s[++o] = i : (s[++o] = null, c.push({
		i: o,
		x: $n(r, i)
	})), n = nr.lastIndex;
	return n < t.length && (a = t.slice(n), s[o] ? s[o] += a : s[++o] = a), s.length < 2 ? c[0] ? ir(c[0].x) : rr(t) : (t = c.length, function(e) {
		for (var n = 0, r; n < t; ++n) s[(r = c[n]).i] = r.x(e);
		return s.join("");
	});
}
// ../../../vision/spectacular/node_modules/d3-interpolate/src/value.js
function or(e, t) {
	var n = typeof t, r;
	return t == null || n === "boolean" ? Un(t) : (n === "number" ? $n : n === "string" ? (r = wn(t)) ? (t = r, Jn) : ar : t instanceof wn ? Jn : t instanceof Date ? Qn : Xn(t) ? Yn : Array.isArray(t) ? Zn : typeof t.valueOf != "function" && typeof t.toString != "function" || isNaN(t) ? er : $n)(e, t);
}
// ../../../vision/spectacular/node_modules/d3-interpolate/src/round.js
function sr(e, t) {
	return e = +e, t = +t, function(n) {
		return Math.round(e * (1 - n) + t * n);
	};
}
// ../../../vision/spectacular/node_modules/d3-interpolate/src/transform/decompose.js
var cr = 180 / Math.PI, lr = {
	translateX: 0,
	translateY: 0,
	rotate: 0,
	skewX: 0,
	scaleX: 1,
	scaleY: 1
};
function ur(e, t, n, r, i, a) {
	var o, s, c;
	return (o = Math.sqrt(e * e + t * t)) && (e /= o, t /= o), (c = e * n + t * r) && (n -= e * c, r -= t * c), (s = Math.sqrt(n * n + r * r)) && (n /= s, r /= s, c /= s), e * r < t * n && (e = -e, t = -t, c = -c, o = -o), {
		translateX: i,
		translateY: a,
		rotate: Math.atan2(t, e) * cr,
		skewX: Math.atan(c) * cr,
		scaleX: o,
		scaleY: s
	};
}
// ../../../vision/spectacular/node_modules/d3-interpolate/src/transform/parse.js
var dr;
function fr(e) {
	let t = new (typeof DOMMatrix == "function" ? DOMMatrix : WebKitCSSMatrix)(e + "");
	return t.isIdentity ? lr : ur(t.a, t.b, t.c, t.d, t.e, t.f);
}
function pr(e) {
	return e == null || (dr ||= document.createElementNS("http://www.w3.org/2000/svg", "g"), dr.setAttribute("transform", e), !(e = dr.transform.baseVal.consolidate())) ? lr : (e = e.matrix, ur(e.a, e.b, e.c, e.d, e.e, e.f));
}
// ../../../vision/spectacular/node_modules/d3-interpolate/src/transform/index.js
function mr(e, t, n, r) {
	function i(e) {
		return e.length ? e.pop() + " " : "";
	}
	function a(e, r, i, a, o, s) {
		if (e !== i || r !== a) {
			var c = o.push("translate(", null, t, null, n);
			s.push({
				i: c - 4,
				x: $n(e, i)
			}, {
				i: c - 2,
				x: $n(r, a)
			});
		} else (i || a) && o.push("translate(" + i + t + a + n);
	}
	function o(e, t, n, a) {
		e === t ? t && n.push(i(n) + "rotate(" + t + r) : (e - t > 180 ? t += 360 : t - e > 180 && (e += 360), a.push({
			i: n.push(i(n) + "rotate(", null, r) - 2,
			x: $n(e, t)
		}));
	}
	function s(e, t, n, a) {
		e === t ? t && n.push(i(n) + "skewX(" + t + r) : a.push({
			i: n.push(i(n) + "skewX(", null, r) - 2,
			x: $n(e, t)
		});
	}
	function c(e, t, n, r, a, o) {
		if (e !== n || t !== r) {
			var s = a.push(i(a) + "scale(", null, ",", null, ")");
			o.push({
				i: s - 4,
				x: $n(e, n)
			}, {
				i: s - 2,
				x: $n(t, r)
			});
		} else (n !== 1 || r !== 1) && a.push(i(a) + "scale(" + n + "," + r + ")");
	}
	return function(t, n) {
		var r = [], i = [];
		return t = e(t), n = e(n), a(t.translateX, t.translateY, n.translateX, n.translateY, r, i), o(t.rotate, n.rotate, r, i), s(t.skewX, n.skewX, r, i), c(t.scaleX, t.scaleY, n.scaleX, n.scaleY, r, i), t = n = null, function(e) {
			for (var t = -1, n = i.length, a; ++t < n;) r[(a = i[t]).i] = a.x(e);
			return r.join("");
		};
	};
}
var hr = mr(fr, "px, ", "px)", "deg)"), gr = mr(pr, ", ", ")", ")"), _r = 0, vr = 0, yr = 0, br = 1e3, xr, Sr, Cr = 0, wr = 0, Tr = 0, Er = typeof performance == "object" && performance.now ? performance : Date, Dr = typeof window == "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(e) {
	setTimeout(e, 17);
};
function Or() {
	return wr ||= (Dr(kr), Er.now() + Tr);
}
function kr() {
	wr = 0;
}
function Ar() {
	this._call = this._time = this._next = null;
}
Ar.prototype = jr.prototype = {
	constructor: Ar,
	restart: function(e, t, n) {
		if (typeof e != "function") throw TypeError("callback is not a function");
		n = (n == null ? Or() : +n) + (t == null ? 0 : +t), !this._next && Sr !== this && (Sr ? Sr._next = this : xr = this, Sr = this), this._call = e, this._time = n, Ir();
	},
	stop: function() {
		this._call && (this._call = null, this._time = Infinity, Ir());
	}
};
function jr(e, t, n) {
	var r = new Ar();
	return r.restart(e, t, n), r;
}
function Mr() {
	Or(), ++_r;
	for (var e = xr, t; e;) (t = wr - e._time) >= 0 && e._call.call(void 0, t), e = e._next;
	--_r;
}
function Nr() {
	wr = (Cr = Er.now()) + Tr, _r = vr = 0;
	try {
		Mr();
	} finally {
		_r = 0, Fr(), wr = 0;
	}
}
function Pr() {
	var e = Er.now(), t = e - Cr;
	t > br && (Tr -= t, Cr = e);
}
function Fr() {
	for (var e, t = xr, n, r = Infinity; t;) t._call ? (r > t._time && (r = t._time), e = t, t = t._next) : (n = t._next, t._next = null, t = e ? e._next = n : xr = n);
	Sr = e, Ir(r);
}
function Ir(e) {
	_r || (vr &&= clearTimeout(vr), e - wr > 24 ? (e < Infinity && (vr = setTimeout(Nr, e - Er.now() - Tr)), yr &&= clearInterval(yr)) : (yr ||= (Cr = Er.now(), setInterval(Pr, br)), _r = 1, Dr(Nr)));
}
// ../../../vision/spectacular/node_modules/d3-timer/src/timeout.js
function Lr(e, t, n) {
	var r = new Ar();
	return t = t == null ? 0 : +t, r.restart((n) => {
		r.stop(), e(n + t);
	}, t, n), r;
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/schedule.js
var Rr = I("start", "end", "cancel", "interrupt"), zr = [];
function Br(e, t, n, r, i, a) {
	var o = e.__transition;
	if (!o) e.__transition = {};
	else if (n in o) return;
	Wr(e, n, {
		name: t,
		index: r,
		group: i,
		on: Rr,
		tween: zr,
		time: a.time,
		delay: a.delay,
		duration: a.duration,
		ease: a.ease,
		timer: null,
		state: 0
	});
}
function Vr(e, t) {
	var n = Ur(e, t);
	if (n.state > 0) throw Error("too late; already scheduled");
	return n;
}
function Hr(e, t) {
	var n = Ur(e, t);
	if (n.state > 3) throw Error("too late; already running");
	return n;
}
function Ur(e, t) {
	var n = e.__transition;
	if (!n || !(n = n[t])) throw Error("transition not found");
	return n;
}
function Wr(e, t, n) {
	var r = e.__transition, i;
	r[t] = n, n.timer = jr(a, 0, n.time);
	function a(e) {
		n.state = 1, n.timer.restart(o, n.delay, n.time), n.delay <= e && o(e - n.delay);
	}
	function o(a) {
		var l, u, d, f;
		if (n.state !== 1) return c();
		for (l in r) if (f = r[l], f.name === n.name) {
			if (f.state === 3) return Lr(o);
			f.state === 4 ? (f.state = 6, f.timer.stop(), f.on.call("interrupt", e, e.__data__, f.index, f.group), delete r[l]) : +l < t && (f.state = 6, f.timer.stop(), f.on.call("cancel", e, e.__data__, f.index, f.group), delete r[l]);
		}
		if (Lr(function() {
			n.state === 3 && (n.state = 4, n.timer.restart(s, n.delay, n.time), s(a));
		}), n.state = 2, n.on.call("start", e, e.__data__, n.index, n.group), n.state === 2) {
			for (n.state = 3, i = Array(d = n.tween.length), l = 0, u = -1; l < d; ++l) (f = n.tween[l].value.call(e, e.__data__, n.index, n.group)) && (i[++u] = f);
			i.length = u + 1;
		}
	}
	function s(t) {
		for (var r = t < n.duration ? n.ease.call(null, t / n.duration) : (n.timer.restart(c), n.state = 5, 1), a = -1, o = i.length; ++a < o;) i[a].call(e, r);
		n.state === 5 && (n.on.call("end", e, e.__data__, n.index, n.group), c());
	}
	function c() {
		for (var i in n.state = 6, n.timer.stop(), delete r[t], r) return;
		delete e.__transition;
	}
}
// ../../../vision/spectacular/node_modules/d3-transition/src/interrupt.js
function Gr(e, t) {
	var n = e.__transition, r, i, a = !0, o;
	if (n) {
		for (o in t = t == null ? null : t + "", n) (r = n[o]).name === t ? (i = r.state > 2 && r.state < 5, r.state = 6, r.timer.stop(), r.on.call(i ? "interrupt" : "cancel", e, e.__data__, r.index, r.group), delete n[o]) : a = !1;
		a && delete e.__transition;
	}
}
// ../../../vision/spectacular/node_modules/d3-transition/src/selection/interrupt.js
function Kr(e) {
	return this.each(function() {
		Gr(this, e);
	});
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/tween.js
function qr(e, t) {
	var n, r;
	return function() {
		var i = Hr(this, e), a = i.tween;
		if (a !== n) {
			r = n = a;
			for (var o = 0, s = r.length; o < s; ++o) if (r[o].name === t) {
				r = r.slice(), r.splice(o, 1);
				break;
			}
		}
		i.tween = r;
	};
}
function Jr(e, t, n) {
	var r, i;
	if (typeof n != "function") throw Error();
	return function() {
		var a = Hr(this, e), o = a.tween;
		if (o !== r) {
			i = (r = o).slice();
			for (var s = {
				name: t,
				value: n
			}, c = 0, l = i.length; c < l; ++c) if (i[c].name === t) {
				i[c] = s;
				break;
			}
			c === l && i.push(s);
		}
		a.tween = i;
	};
}
function Yr(e, t) {
	var n = this._id;
	if (e += "", arguments.length < 2) {
		for (var r = Ur(this.node(), n).tween, i = 0, a = r.length, o; i < a; ++i) if ((o = r[i]).name === e) return o.value;
		return null;
	}
	return this.each((t == null ? qr : Jr)(n, e, t));
}
function Xr(e, t, n) {
	var r = e._id;
	return e.each(function() {
		var e = Hr(this, r);
		(e.value ||= {})[t] = n.apply(this, arguments);
	}), function(e) {
		return Ur(e, r).value[t];
	};
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/interpolate.js
function Zr(e, t) {
	var n;
	return (typeof t == "number" ? $n : t instanceof wn ? Jn : (n = wn(t)) ? (t = n, Jn) : ar)(e, t);
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/attr.js
function Qr(e) {
	return function() {
		this.removeAttribute(e);
	};
}
function $r(e) {
	return function() {
		this.removeAttributeNS(e.space, e.local);
	};
}
function ei(e, t, n) {
	var r, i = n + "", a;
	return function() {
		var o = this.getAttribute(e);
		return o === i ? null : o === r ? a : a = t(r = o, n);
	};
}
function ti(e, t, n) {
	var r, i = n + "", a;
	return function() {
		var o = this.getAttributeNS(e.space, e.local);
		return o === i ? null : o === r ? a : a = t(r = o, n);
	};
}
function ni(e, t, n) {
	var r, i, a;
	return function() {
		var o, s = n(this), c;
		return s == null ? void this.removeAttribute(e) : (o = this.getAttribute(e), c = s + "", o === c ? null : o === r && c === i ? a : (i = c, a = t(r = o, s)));
	};
}
function ri(e, t, n) {
	var r, i, a;
	return function() {
		var o, s = n(this), c;
		return s == null ? void this.removeAttributeNS(e.space, e.local) : (o = this.getAttributeNS(e.space, e.local), c = s + "", o === c ? null : o === r && c === i ? a : (i = c, a = t(r = o, s)));
	};
}
function ii(e, t) {
	var n = ie(e), r = n === "transform" ? gr : Zr;
	return this.attrTween(e, typeof t == "function" ? (n.local ? ri : ni)(n, r, Xr(this, "attr." + e, t)) : t == null ? (n.local ? $r : Qr)(n) : (n.local ? ti : ei)(n, r, t));
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/attrTween.js
function ai(e, t) {
	return function(n) {
		this.setAttribute(e, t.call(this, n));
	};
}
function oi(e, t) {
	return function(n) {
		this.setAttributeNS(e.space, e.local, t.call(this, n));
	};
}
function si(e, t) {
	var n, r;
	function i() {
		var i = t.apply(this, arguments);
		return i !== r && (n = (r = i) && oi(e, i)), n;
	}
	return i._value = t, i;
}
function ci(e, t) {
	var n, r;
	function i() {
		var i = t.apply(this, arguments);
		return i !== r && (n = (r = i) && ai(e, i)), n;
	}
	return i._value = t, i;
}
function li(e, t) {
	var n = "attr." + e;
	if (arguments.length < 2) return (n = this.tween(n)) && n._value;
	if (t == null) return this.tween(n, null);
	if (typeof t != "function") throw Error();
	var r = ie(e);
	return this.tween(n, (r.local ? si : ci)(r, t));
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/delay.js
function ui(e, t) {
	return function() {
		Vr(this, e).delay = +t.apply(this, arguments);
	};
}
function di(e, t) {
	return t = +t, function() {
		Vr(this, e).delay = t;
	};
}
function fi(e) {
	var t = this._id;
	return arguments.length ? this.each((typeof e == "function" ? ui : di)(t, e)) : Ur(this.node(), t).delay;
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/duration.js
function pi(e, t) {
	return function() {
		Hr(this, e).duration = +t.apply(this, arguments);
	};
}
function mi(e, t) {
	return t = +t, function() {
		Hr(this, e).duration = t;
	};
}
function hi(e) {
	var t = this._id;
	return arguments.length ? this.each((typeof e == "function" ? pi : mi)(t, e)) : Ur(this.node(), t).duration;
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/ease.js
function gi(e, t) {
	if (typeof t != "function") throw Error();
	return function() {
		Hr(this, e).ease = t;
	};
}
function _i(e) {
	var t = this._id;
	return arguments.length ? this.each(gi(t, e)) : Ur(this.node(), t).ease;
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/easeVarying.js
function vi(e, t) {
	return function() {
		var n = t.apply(this, arguments);
		if (typeof n != "function") throw Error();
		Hr(this, e).ease = n;
	};
}
function yi(e) {
	if (typeof e != "function") throw Error();
	return this.each(vi(this._id, e));
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/filter.js
function bi(e) {
	typeof e != "function" && (e = he(e));
	for (var t = this._groups, n = t.length, r = Array(n), i = 0; i < n; ++i) for (var a = t[i], o = a.length, s = r[i] = [], c, l = 0; l < o; ++l) (c = a[l]) && e.call(c, c.__data__, l, a) && s.push(c);
	return new Yi(r, this._parents, this._name, this._id);
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/merge.js
function xi(e) {
	if (e._id !== this._id) throw Error();
	for (var t = this._groups, n = e._groups, r = t.length, i = n.length, a = Math.min(r, i), o = Array(r), s = 0; s < a; ++s) for (var c = t[s], l = n[s], u = c.length, d = o[s] = Array(u), f, p = 0; p < u; ++p) (f = c[p] || l[p]) && (d[p] = f);
	for (; s < r; ++s) o[s] = t[s];
	return new Yi(o, this._parents, this._name, this._id);
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/on.js
function Si(e) {
	return (e + "").trim().split(/^|\s+/).every(function(e) {
		var t = e.indexOf(".");
		return t >= 0 && (e = e.slice(0, t)), !e || e === "start";
	});
}
function Ci(e, t, n) {
	var r, i, a = Si(t) ? Vr : Hr;
	return function() {
		var o = a(this, e), s = o.on;
		s !== r && (i = (r = s).copy()).on(t, n), o.on = i;
	};
}
function wi(e, t) {
	var n = this._id;
	return arguments.length < 2 ? Ur(this.node(), n).on.on(e) : this.each(Ci(n, e, t));
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/remove.js
function Ti(e) {
	return function() {
		var t = this.parentNode;
		for (var n in this.__transition) if (+n !== e) return;
		t && t.removeChild(this);
	};
}
function Ei() {
	return this.on("end.remove", Ti(this._id));
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/select.js
function Di(e) {
	var t = this._name, n = this._id;
	typeof e != "function" && (e = ce(e));
	for (var r = this._groups, i = r.length, a = Array(i), o = 0; o < i; ++o) for (var s = r[o], c = s.length, l = a[o] = Array(c), u, d, f = 0; f < c; ++f) (u = s[f]) && (d = e.call(u, u.__data__, f, s)) && ("__data__" in u && (d.__data__ = u.__data__), l[f] = d, Br(l[f], t, n, f, l, Ur(u, n)));
	return new Yi(a, this._parents, t, n);
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/selectAll.js
function Oi(e) {
	var t = this._name, n = this._id;
	typeof e != "function" && (e = fe(e));
	for (var r = this._groups, i = r.length, a = [], o = [], s = 0; s < i; ++s) for (var c = r[s], l = c.length, u, d = 0; d < l; ++d) if (u = c[d]) {
		for (var f = e.call(u, u.__data__, d, c), p, m = Ur(u, n), h = 0, g = f.length; h < g; ++h) (p = f[h]) && Br(p, t, n, h, f, m);
		a.push(f), o.push(u);
	}
	return new Yi(a, o, t, n);
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/selection.js
var ki = Jt.prototype.constructor;
function Ai() {
	return new ki(this._groups, this._parents);
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/style.js
function ji(e, t) {
	var n, r, i;
	return function() {
		var a = tt(this, e), o = (this.style.removeProperty(e), tt(this, e));
		return a === o ? null : a === n && o === r ? i : i = t(n = a, r = o);
	};
}
function Mi(e) {
	return function() {
		this.style.removeProperty(e);
	};
}
function Ni(e, t, n) {
	var r, i = n + "", a;
	return function() {
		var o = tt(this, e);
		return o === i ? null : o === r ? a : a = t(r = o, n);
	};
}
function Pi(e, t, n) {
	var r, i, a;
	return function() {
		var o = tt(this, e), s = n(this), c = s + "";
		return s ?? (c = s = (this.style.removeProperty(e), tt(this, e))), o === c ? null : o === r && c === i ? a : (i = c, a = t(r = o, s));
	};
}
function Fi(e, t) {
	var n, r, i, a = "style." + t, o = "end." + a, s;
	return function() {
		var c = Hr(this, e), l = c.on, u = c.value[a] == null ? s ||= Mi(t) : void 0;
		(l !== n || i !== u) && (r = (n = l).copy()).on(o, i = u), c.on = r;
	};
}
function Ii(e, t, n) {
	var r = (e += "") == "transform" ? hr : Zr;
	return t == null ? this.styleTween(e, ji(e, r)).on("end.style." + e, Mi(e)) : typeof t == "function" ? this.styleTween(e, Pi(e, r, Xr(this, "style." + e, t))).each(Fi(this._id, e)) : this.styleTween(e, Ni(e, r, t), n).on("end.style." + e, null);
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/styleTween.js
function Li(e, t, n) {
	return function(r) {
		this.style.setProperty(e, t.call(this, r), n);
	};
}
function Ri(e, t, n) {
	var r, i;
	function a() {
		var a = t.apply(this, arguments);
		return a !== i && (r = (i = a) && Li(e, a, n)), r;
	}
	return a._value = t, a;
}
function zi(e, t, n) {
	var r = "style." + (e += "");
	if (arguments.length < 2) return (r = this.tween(r)) && r._value;
	if (t == null) return this.tween(r, null);
	if (typeof t != "function") throw Error();
	return this.tween(r, Ri(e, t, n ?? ""));
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/text.js
function Bi(e) {
	return function() {
		this.textContent = e;
	};
}
function Vi(e) {
	return function() {
		var t = e(this);
		this.textContent = t ?? "";
	};
}
function Hi(e) {
	return this.tween("text", typeof e == "function" ? Vi(Xr(this, "text", e)) : Bi(e == null ? "" : e + ""));
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/textTween.js
function Ui(e) {
	return function(t) {
		this.textContent = e.call(this, t);
	};
}
function Wi(e) {
	var t, n;
	function r() {
		var r = e.apply(this, arguments);
		return r !== n && (t = (n = r) && Ui(r)), t;
	}
	return r._value = e, r;
}
function Gi(e) {
	var t = "text";
	if (arguments.length < 1) return (t = this.tween(t)) && t._value;
	if (e == null) return this.tween(t, null);
	if (typeof e != "function") throw Error();
	return this.tween(t, Wi(e));
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/transition.js
function Ki() {
	for (var e = this._name, t = this._id, n = Xi(), r = this._groups, i = r.length, a = 0; a < i; ++a) for (var o = r[a], s = o.length, c, l = 0; l < s; ++l) if (c = o[l]) {
		var u = Ur(c, t);
		Br(c, e, n, l, o, {
			time: u.time + u.delay + u.duration,
			delay: 0,
			duration: u.duration,
			ease: u.ease
		});
	}
	return new Yi(r, this._parents, e, n);
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/end.js
function qi() {
	var e, t, n = this, r = n._id, i = n.size();
	return new Promise(function(a, o) {
		var s = { value: o }, c = { value: function() {
			--i === 0 && a();
		} };
		n.each(function() {
			var n = Hr(this, r), i = n.on;
			i !== e && (t = (e = i).copy(), t._.cancel.push(s), t._.interrupt.push(s), t._.end.push(c)), n.on = t;
		}), i === 0 && a();
	});
}
// ../../../vision/spectacular/node_modules/d3-transition/src/transition/index.js
var Ji = 0;
function Yi(e, t, n, r) {
	this._groups = e, this._parents = t, this._name = n, this._id = r;
}
function Xi() {
	return ++Ji;
}
var Zi = Jt.prototype;
Yi.prototype = {
	constructor: Yi,
	select: Di,
	selectAll: Oi,
	selectChild: Zi.selectChild,
	selectChildren: Zi.selectChildren,
	filter: bi,
	merge: xi,
	selection: Ai,
	transition: Ki,
	call: Zi.call,
	nodes: Zi.nodes,
	node: Zi.node,
	size: Zi.size,
	empty: Zi.empty,
	each: Zi.each,
	on: wi,
	attr: ii,
	attrTween: li,
	style: Ii,
	styleTween: zi,
	text: Hi,
	textTween: Gi,
	remove: Ei,
	tween: Yr,
	delay: fi,
	duration: hi,
	ease: _i,
	easeVarying: yi,
	end: qi,
	[Symbol.iterator]: Zi[Symbol.iterator]
};
// ../../../vision/spectacular/node_modules/d3-ease/src/cubic.js
function Qi(e) {
	return ((e *= 2) <= 1 ? e * e * e : (e -= 2) * e * e + 2) / 2;
}
// ../../../vision/spectacular/node_modules/d3-transition/src/selection/transition.js
var $i = {
	time: null,
	delay: 0,
	duration: 250,
	ease: Qi
};
function ea(e, t) {
	for (var n; !(n = e.__transition) || !(n = n[t]);) if (!(e = e.parentNode)) throw Error(`transition ${t} not found`);
	return n;
}
function ta(e) {
	var t, n;
	e instanceof Yi ? (t = e._id, e = e._name) : (t = Xi(), (n = $i).time = Or(), e = e == null ? null : e + "");
	for (var r = this._groups, i = r.length, a = 0; a < i; ++a) for (var o = r[a], s = o.length, c, l = 0; l < s; ++l) (c = o[l]) && Br(c, e, t, l, o, n || ea(c, t));
	return new Yi(r, this._parents, e, t);
}
Jt.prototype.interrupt = Kr, Jt.prototype.transition = ta;
// ../../../vision/spectacular/node_modules/d3-brush/src/constant.js
var na = (e) => () => e;
// ../../../vision/spectacular/node_modules/d3-brush/src/event.js
function ra(e, { sourceEvent: t, target: n, selection: r, mode: i, dispatch: a }) {
	Object.defineProperties(this, {
		type: {
			value: e,
			enumerable: !0,
			configurable: !0
		},
		sourceEvent: {
			value: t,
			enumerable: !0,
			configurable: !0
		},
		target: {
			value: n,
			enumerable: !0,
			configurable: !0
		},
		selection: {
			value: r,
			enumerable: !0,
			configurable: !0
		},
		mode: {
			value: i,
			enumerable: !0,
			configurable: !0
		},
		_: { value: a }
	});
}
// ../../../vision/spectacular/node_modules/d3-brush/src/noevent.js
function ia(e) {
	e.stopImmediatePropagation();
}
function aa(e) {
	e.preventDefault(), e.stopImmediatePropagation();
}
// ../../../vision/spectacular/node_modules/d3-brush/src/brush.js
var oa = { name: "drag" }, sa = { name: "space" }, ca = { name: "handle" }, la = { name: "center" }, { abs: ua, max: da, min: fa } = Math;
function pa(e) {
	return [+e[0], +e[1]];
}
function ma(e) {
	return [pa(e[0]), pa(e[1])];
}
var ha = {
	name: "x",
	handles: ["w", "e"].map(Ca),
	input: function(e, t) {
		return e == null ? null : [[+e[0], t[0][1]], [+e[1], t[1][1]]];
	},
	output: function(e) {
		return e && [e[0][0], e[1][0]];
	}
}, ga = {
	name: "y",
	handles: ["n", "s"].map(Ca),
	input: function(e, t) {
		return e == null ? null : [[t[0][0], +e[0]], [t[1][0], +e[1]]];
	},
	output: function(e) {
		return e && [e[0][1], e[1][1]];
	}
}, _a = {
	name: "xy",
	handles: [
		"n",
		"w",
		"e",
		"s",
		"nw",
		"ne",
		"sw",
		"se"
	].map(Ca),
	input: function(e) {
		return e == null ? null : ma(e);
	},
	output: function(e) {
		return e;
	}
}, va = {
	overlay: "crosshair",
	selection: "move",
	n: "ns-resize",
	e: "ew-resize",
	s: "ns-resize",
	w: "ew-resize",
	nw: "nwse-resize",
	ne: "nesw-resize",
	se: "nwse-resize",
	sw: "nesw-resize"
}, ya = {
	e: "w",
	w: "e",
	nw: "ne",
	ne: "nw",
	se: "sw",
	sw: "se"
}, ba = {
	n: "s",
	s: "n",
	nw: "sw",
	ne: "se",
	se: "ne",
	sw: "nw"
}, xa = {
	overlay: 1,
	selection: 1,
	n: null,
	e: 1,
	s: null,
	w: -1,
	nw: -1,
	ne: 1,
	se: 1,
	sw: -1
}, Sa = {
	overlay: 1,
	selection: 1,
	n: -1,
	e: null,
	s: 1,
	w: null,
	nw: -1,
	ne: -1,
	se: 1,
	sw: 1
};
function Ca(e) {
	return { type: e };
}
function wa(e) {
	return !e.ctrlKey && !e.button;
}
function Ta() {
	var e = this.ownerSVGElement || this;
	return e.hasAttribute("viewBox") ? (e = e.viewBox.baseVal, [[e.x, e.y], [e.x + e.width, e.y + e.height]]) : [[0, 0], [e.width.baseVal.value, e.height.baseVal.value]];
}
function Ea() {
	return navigator.maxTouchPoints || "ontouchstart" in this;
}
function Da(e) {
	for (; !e.__brush;) if (!(e = e.parentNode)) return;
	return e.__brush;
}
function Oa(e) {
	return e[0][0] === e[1][0] || e[0][1] === e[1][1];
}
function ka() {
	return ja(ha);
}
function Aa() {
	return ja(_a);
}
function ja(e) {
	var t = Ta, n = wa, r = Ea, i = !0, a = I("start", "brush", "end"), o = 6, s;
	function c(t) {
		var n = t.property("__brush", h).selectAll(".overlay").data([Ca("overlay")]);
		n.enter().append("rect").attr("class", "overlay").attr("pointer-events", "all").attr("cursor", va.overlay).merge(n).each(function() {
			var e = Da(this).extent;
			Xt(this).attr("x", e[0][0]).attr("y", e[0][1]).attr("width", e[1][0] - e[0][0]).attr("height", e[1][1] - e[0][1]);
		}), t.selectAll(".selection").data([Ca("selection")]).enter().append("rect").attr("class", "selection").attr("cursor", va.selection).attr("fill", "#777").attr("fill-opacity", .3).attr("stroke", "#fff").attr("shape-rendering", "crispEdges");
		var i = t.selectAll(".handle").data(e.handles, function(e) {
			return e.type;
		});
		i.exit().remove(), i.enter().append("rect").attr("class", function(e) {
			return "handle handle--" + e.type;
		}).attr("cursor", function(e) {
			return va[e.type];
		}), t.each(l).attr("fill", "none").attr("pointer-events", "all").on("mousedown.brush", f).filter(r).on("touchstart.brush", f).on("touchmove.brush", p).on("touchend.brush touchcancel.brush", m).style("touch-action", "none").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
	}
	c.move = function(t, n, r) {
		t.tween ? t.on("start.brush", function(e) {
			u(this, arguments).beforestart().start(e);
		}).on("interrupt.brush end.brush", function(e) {
			u(this, arguments).end(e);
		}).tween("brush", function() {
			var t = this, r = t.__brush, i = u(t, arguments), a = r.selection, o = e.input(typeof n == "function" ? n.apply(this, arguments) : n, r.extent), s = or(a, o);
			function c(e) {
				r.selection = e === 1 && o === null ? null : s(e), l.call(t), i.brush();
			}
			return a !== null && o !== null ? c : c(1);
		}) : t.each(function() {
			var t = this, i = arguments, a = t.__brush, o = e.input(typeof n == "function" ? n.apply(t, i) : n, a.extent), s = u(t, i).beforestart();
			Gr(t), a.selection = o === null ? null : o, l.call(t), s.start(r).brush(r).end(r);
		});
	}, c.clear = function(e, t) {
		c.move(e, null, t);
	};
	function l() {
		var e = Xt(this), t = Da(this).selection;
		t ? (e.selectAll(".selection").style("display", null).attr("x", t[0][0]).attr("y", t[0][1]).attr("width", t[1][0] - t[0][0]).attr("height", t[1][1] - t[0][1]), e.selectAll(".handle").style("display", null).attr("x", function(e) {
			return e.type[e.type.length - 1] === "e" ? t[1][0] - o / 2 : t[0][0] - o / 2;
		}).attr("y", function(e) {
			return e.type[0] === "s" ? t[1][1] - o / 2 : t[0][1] - o / 2;
		}).attr("width", function(e) {
			return e.type === "n" || e.type === "s" ? t[1][0] - t[0][0] + o : o;
		}).attr("height", function(e) {
			return e.type === "e" || e.type === "w" ? t[1][1] - t[0][1] + o : o;
		})) : e.selectAll(".selection,.handle").style("display", "none").attr("x", null).attr("y", null).attr("width", null).attr("height", null);
	}
	function u(e, t, n) {
		var r = e.__brush.emitter;
		return r && (!n || !r.clean) ? r : new d(e, t, n);
	}
	function d(e, t, n) {
		this.that = e, this.args = t, this.state = e.__brush, this.active = 0, this.clean = n;
	}
	d.prototype = {
		beforestart: function() {
			return ++this.active === 1 && (this.state.emitter = this, this.starting = !0), this;
		},
		start: function(e, t) {
			return this.starting ? (this.starting = !1, this.emit("start", e, t)) : this.emit("brush", e), this;
		},
		brush: function(e, t) {
			return this.emit("brush", e, t), this;
		},
		end: function(e, t) {
			return --this.active === 0 && (delete this.state.emitter, this.emit("end", e, t)), this;
		},
		emit: function(t, n, r) {
			var i = Xt(this.that).datum();
			a.call(t, this.that, new ra(t, {
				sourceEvent: n,
				target: c,
				selection: e.output(this.state.selection),
				mode: r,
				dispatch: a
			}), i);
		}
	};
	function f(t) {
		if (s && !t.touches || !n.apply(this, arguments)) return;
		var r = this, a = t.target.__data__.type, o = (i && t.metaKey ? a = "overlay" : a) === "selection" ? oa : i && t.altKey ? la : ca, c = e === ga ? null : xa[a], d = e === ha ? null : Sa[a], f = Da(r), p = f.extent, m = f.selection, h = p[0][0], g, _, v = p[0][1], y, b, x = p[1][0], S, C, w = p[1][1], T, E, D = 0, O = 0, k, A = c && d && i && t.shiftKey, j, M, N = Array.from(t.touches || [t], (e) => {
			let t = e.identifier;
			return e = Qt(e, r), e.point0 = e.slice(), e.identifier = t, e;
		});
		Gr(r);
		var P = u(r, arguments, !0).beforestart();
		if (a === "overlay") {
			m && (k = !0);
			let n = [N[0], N[1] || N[0]];
			f.selection = m = [[g = e === ga ? h : fa(n[0][0], n[1][0]), y = e === ha ? v : fa(n[0][1], n[1][1])], [S = e === ga ? x : da(n[0][0], n[1][0]), T = e === ha ? w : da(n[0][1], n[1][1])]], N.length > 1 && ne(t);
		} else g = m[0][0], y = m[0][1], S = m[1][0], T = m[1][1];
		_ = g, b = y, C = S, E = T;
		var F = Xt(r).attr("pointer-events", "none"), I = F.selectAll(".overlay").attr("cursor", va[a]);
		if (t.touches) P.moved = te, P.ended = re;
		else {
			var ee = Xt(t.view).on("mousemove.brush", te, !0).on("mouseup.brush", re, !0);
			i && ee.on("keydown.brush", L, !0).on("keyup.brush", ie, !0), tn(t.view);
		}
		l.call(r), P.start(t, o.name);
		function te(e) {
			for (let t of e.changedTouches || [e]) for (let e of N) e.identifier === t.identifier && (e.cur = Qt(t, r));
			if (A && !j && !M && N.length === 1) {
				let e = N[0];
				ua(e.cur[0] - e[0]) > ua(e.cur[1] - e[1]) ? M = !0 : j = !0;
			}
			for (let e of N) e.cur && (e[0] = e.cur[0], e[1] = e.cur[1]);
			k = !0, aa(e), ne(e);
		}
		function ne(e) {
			let t = N[0], n = t.point0;
			var i;
			switch (D = t[0] - n[0], O = t[1] - n[1], o) {
				case sa:
				case oa:
					c && (D = da(h - g, fa(x - S, D)), _ = g + D, C = S + D), d && (O = da(v - y, fa(w - T, O)), b = y + O, E = T + O);
					break;
				case ca:
					N[1] ? (c &&= (_ = da(h, fa(x, N[0][0])), C = da(h, fa(x, N[1][0])), 1), d &&= (b = da(v, fa(w, N[0][1])), E = da(v, fa(w, N[1][1])), 1)) : (c < 0 ? (D = da(h - g, fa(x - g, D)), _ = g + D, C = S) : c > 0 && (D = da(h - S, fa(x - S, D)), _ = g, C = S + D), d < 0 ? (O = da(v - y, fa(w - y, O)), b = y + O, E = T) : d > 0 && (O = da(v - T, fa(w - T, O)), b = y, E = T + O));
					break;
				case la: c && (_ = da(h, fa(x, g - D * c)), C = da(h, fa(x, S + D * c))), d && (b = da(v, fa(w, y - O * d)), E = da(v, fa(w, T + O * d)));
			}
			C < _ && (c *= -1, i = g, g = S, S = i, i = _, _ = C, C = i, a in ya && I.attr("cursor", va[a = ya[a]])), E < b && (d *= -1, i = y, y = T, T = i, i = b, b = E, E = i, a in ba && I.attr("cursor", va[a = ba[a]])), f.selection && (m = f.selection), j && (_ = m[0][0], C = m[1][0]), M && (b = m[0][1], E = m[1][1]), (m[0][0] !== _ || m[0][1] !== b || m[1][0] !== C || m[1][1] !== E) && (f.selection = [[_, b], [C, E]], l.call(r), P.brush(e, o.name));
		}
		function re(e) {
			if (ia(e), e.touches) {
				if (e.touches.length) return;
				s && clearTimeout(s), s = setTimeout(function() {
					s = null;
				}, 500);
			} else nn(e.view, k), ee.on("keydown.brush keyup.brush mousemove.brush mouseup.brush", null);
			F.attr("pointer-events", "all"), I.attr("cursor", va.overlay), f.selection && (m = f.selection), Oa(m) && (f.selection = null, l.call(r)), P.end(e, o.name);
		}
		function L(e) {
			switch (e.keyCode) {
				case 16:
					A = c && d;
					break;
				case 18:
					o === ca && (c && (S = C - D * c, g = _ + D * c), d && (T = E - O * d, y = b + O * d), o = la, ne(e));
					break;
				case 32:
					(o === ca || o === la) && (c < 0 ? S = C - D : c > 0 && (g = _ - D), d < 0 ? T = E - O : d > 0 && (y = b - O), o = sa, I.attr("cursor", va.selection), ne(e));
					break;
				default: return;
			}
			aa(e);
		}
		function ie(e) {
			switch (e.keyCode) {
				case 16:
					A && (j = M = A = !1, ne(e));
					break;
				case 18:
					o === la && (c < 0 ? S = C : c > 0 && (g = _), d < 0 ? T = E : d > 0 && (y = b), o = ca, ne(e));
					break;
				case 32:
					o === sa && (e.altKey ? (c && (S = C - D * c, g = _ + D * c), d && (T = E - O * d, y = b + O * d), o = la) : (c < 0 ? S = C : c > 0 && (g = _), d < 0 ? T = E : d > 0 && (y = b), o = ca), I.attr("cursor", va[a]), ne(e));
					break;
				default: return;
			}
			aa(e);
		}
	}
	function p(e) {
		u(this, arguments).moved(e);
	}
	function m(e) {
		u(this, arguments).ended(e);
	}
	function h() {
		var n = this.__brush || { selection: null };
		return n.extent = ma(t.apply(this, arguments)), n.dim = e, n;
	}
	return c.extent = function(e) {
		return arguments.length ? (t = typeof e == "function" ? e : na(ma(e)), c) : t;
	}, c.filter = function(e) {
		return arguments.length ? (n = typeof e == "function" ? e : na(!!e), c) : n;
	}, c.touchable = function(e) {
		return arguments.length ? (r = typeof e == "function" ? e : na(!!e), c) : r;
	}, c.handleSize = function(e) {
		return arguments.length ? (o = +e, c) : o;
	}, c.keyModifiers = function(e) {
		return arguments.length ? (i = !!e, c) : i;
	}, c.on = function() {
		var e = a.on.apply(a, arguments);
		return e === a ? c : e;
	}, c;
}
// ../../../vision/spectacular/node_modules/d3-dsv/src/dsv.js
var Ma = {}, Na = {}, Pa = 34, Fa = 10, Ia = 13;
function La(e) {
	return Function("d", "return {" + e.map(function(e, t) {
		return JSON.stringify(e) + ": d[" + t + "] || \"\"";
	}).join(",") + "}");
}
function Ra(e, t) {
	var n = La(e);
	return function(r, i) {
		return t(n(r), i, e);
	};
}
function za(e) {
	var t = Object.create(null), n = [];
	return e.forEach(function(e) {
		for (var r in e) r in t || n.push(t[r] = r);
	}), n;
}
function Ba(e, t) {
	var n = e + "", r = n.length;
	return r < t ? Array(t - r + 1).join(0) + n : n;
}
function Va(e) {
	return e < 0 ? "-" + Ba(-e, 6) : e > 9999 ? "+" + Ba(e, 6) : Ba(e, 4);
}
function Ha(e) {
	var t = e.getUTCHours(), n = e.getUTCMinutes(), r = e.getUTCSeconds(), i = e.getUTCMilliseconds();
	return isNaN(e) ? "Invalid Date" : Va(e.getUTCFullYear(), 4) + "-" + Ba(e.getUTCMonth() + 1, 2) + "-" + Ba(e.getUTCDate(), 2) + (i ? "T" + Ba(t, 2) + ":" + Ba(n, 2) + ":" + Ba(r, 2) + "." + Ba(i, 3) + "Z" : r ? "T" + Ba(t, 2) + ":" + Ba(n, 2) + ":" + Ba(r, 2) + "Z" : n || t ? "T" + Ba(t, 2) + ":" + Ba(n, 2) + "Z" : "");
}
function Ua(e) {
	var t = RegExp("[\"" + e + "\n\r]"), n = e.charCodeAt(0);
	function r(e, t) {
		var n, r, a = i(e, function(e, i) {
			if (n) return n(e, i - 1);
			r = e, n = t ? Ra(e, t) : La(e);
		});
		return a.columns = r || [], a;
	}
	function i(e, t) {
		var r = [], i = e.length, a = 0, o = 0, s, c = i <= 0, l = !1;
		e.charCodeAt(i - 1) === Fa && --i, e.charCodeAt(i - 1) === Ia && --i;
		function u() {
			if (c) return Na;
			if (l) return l = !1, Ma;
			var t, r = a, o;
			if (e.charCodeAt(r) === Pa) {
				for (; a++ < i && e.charCodeAt(a) !== Pa || e.charCodeAt(++a) === Pa;);
				return (t = a) >= i ? c = !0 : (o = e.charCodeAt(a++)) === Fa ? l = !0 : o === Ia && (l = !0, e.charCodeAt(a) === Fa && ++a), e.slice(r + 1, t - 1).replace(/""/g, "\"");
			}
			for (; a < i;) {
				if ((o = e.charCodeAt(t = a++)) === Fa) l = !0;
				else if (o === Ia) l = !0, e.charCodeAt(a) === Fa && ++a;
				else if (o !== n) continue;
				return e.slice(r, t);
			}
			return c = !0, e.slice(r, i);
		}
		for (; (s = u()) !== Na;) {
			for (var d = []; s !== Ma && s !== Na;) d.push(s), s = u();
			t && (d = t(d, o++)) == null || r.push(d);
		}
		return r;
	}
	function a(t, n) {
		return t.map(function(t) {
			return n.map(function(e) {
				return u(t[e]);
			}).join(e);
		});
	}
	function o(t, n) {
		return n ??= za(t), [n.map(u).join(e)].concat(a(t, n)).join("\n");
	}
	function s(e, t) {
		return t ??= za(e), a(e, t).join("\n");
	}
	function c(e) {
		return e.map(l).join("\n");
	}
	function l(t) {
		return t.map(u).join(e);
	}
	function u(e) {
		return e == null ? "" : e instanceof Date ? Ha(e) : t.test(e += "") ? "\"" + e.replace(/"/g, "\"\"") + "\"" : e;
	}
	return {
		parse: r,
		parseRows: i,
		format: o,
		formatBody: s,
		formatRows: c,
		formatRow: l,
		formatValue: u
	};
}
// ../../../vision/spectacular/node_modules/d3-format/src/formatDecimal.js
function Wa(e) {
	return Math.abs(e = Math.round(e)) >= 1e21 ? e.toLocaleString("en").replace(/,/g, "") : e.toString(10);
}
function Ga(e, t) {
	if (!isFinite(e) || e === 0) return null;
	var n = (e = t ? e.toExponential(t - 1) : e.toExponential()).indexOf("e"), r = e.slice(0, n);
	return [r.length > 1 ? r[0] + r.slice(2) : r, +e.slice(n + 1)];
}
// ../../../vision/spectacular/node_modules/d3-format/src/exponent.js
function Ka(e) {
	return e = Ga(Math.abs(e)), e ? e[1] : NaN;
}
// ../../../vision/spectacular/node_modules/d3-format/src/formatGroup.js
function qa(e, t) {
	return function(n, r) {
		for (var i = n.length, a = [], o = 0, s = e[0], c = 0; i > 0 && s > 0 && (c + s + 1 > r && (s = Math.max(1, r - c)), a.push(n.substring(i -= s, i + s)), !((c += s + 1) > r));) s = e[o = (o + 1) % e.length];
		return a.reverse().join(t);
	};
}
// ../../../vision/spectacular/node_modules/d3-format/src/formatNumerals.js
function Ja(e) {
	return function(t) {
		return t.replace(/[0-9]/g, function(t) {
			return e[+t];
		});
	};
}
// ../../../vision/spectacular/node_modules/d3-format/src/formatSpecifier.js
var Ya = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;
function Xa(e) {
	if (!(t = Ya.exec(e))) throw Error("invalid format: " + e);
	var t;
	return new Za({
		fill: t[1],
		align: t[2],
		sign: t[3],
		symbol: t[4],
		zero: t[5],
		width: t[6],
		comma: t[7],
		precision: t[8] && t[8].slice(1),
		trim: t[9],
		type: t[10]
	});
}
Xa.prototype = Za.prototype;
function Za(e) {
	this.fill = e.fill === void 0 ? " " : e.fill + "", this.align = e.align === void 0 ? ">" : e.align + "", this.sign = e.sign === void 0 ? "-" : e.sign + "", this.symbol = e.symbol === void 0 ? "" : e.symbol + "", this.zero = !!e.zero, this.width = e.width === void 0 ? void 0 : +e.width, this.comma = !!e.comma, this.precision = e.precision === void 0 ? void 0 : +e.precision, this.trim = !!e.trim, this.type = e.type === void 0 ? "" : e.type + "";
}
Za.prototype.toString = function() {
	return this.fill + this.align + this.sign + this.symbol + (this.zero ? "0" : "") + (this.width === void 0 ? "" : Math.max(1, this.width | 0)) + (this.comma ? "," : "") + (this.precision === void 0 ? "" : "." + Math.max(0, this.precision | 0)) + (this.trim ? "~" : "") + this.type;
};
// ../../../vision/spectacular/node_modules/d3-format/src/formatTrim.js
function Qa(e) {
	out: for (var t = e.length, n = 1, r = -1, i; n < t; ++n) switch (e[n]) {
		case ".":
			r = i = n;
			break;
		case "0":
			r === 0 && (r = n), i = n;
			break;
		default:
			if (!+e[n]) break out;
			r > 0 && (r = 0);
	}
	return r > 0 ? e.slice(0, r) + e.slice(i + 1) : e;
}
// ../../../vision/spectacular/node_modules/d3-format/src/formatPrefixAuto.js
var $a;
function eo(e, t) {
	var n = Ga(e, t);
	if (!n) return $a = void 0, e.toPrecision(t);
	var r = n[0], i = n[1], a = i - ($a = Math.max(-8, Math.min(8, Math.floor(i / 3))) * 3) + 1, o = r.length;
	return a === o ? r : a > o ? r + Array(a - o + 1).join("0") : a > 0 ? r.slice(0, a) + "." + r.slice(a) : "0." + Array(1 - a).join("0") + Ga(e, Math.max(0, t + a - 1))[0];
}
// ../../../vision/spectacular/node_modules/d3-format/src/formatRounded.js
function to(e, t) {
	var n = Ga(e, t);
	if (!n) return e + "";
	var r = n[0], i = n[1];
	return i < 0 ? "0." + Array(-i).join("0") + r : r.length > i + 1 ? r.slice(0, i + 1) + "." + r.slice(i + 1) : r + Array(i - r.length + 2).join("0");
}
// ../../../vision/spectacular/node_modules/d3-format/src/formatTypes.js
var no = {
	"%": (e, t) => (e * 100).toFixed(t),
	b: (e) => Math.round(e).toString(2),
	c: (e) => e + "",
	d: Wa,
	e: (e, t) => e.toExponential(t),
	f: (e, t) => e.toFixed(t),
	g: (e, t) => e.toPrecision(t),
	o: (e) => Math.round(e).toString(8),
	p: (e, t) => to(e * 100, t),
	r: to,
	s: eo,
	X: (e) => Math.round(e).toString(16).toUpperCase(),
	x: (e) => Math.round(e).toString(16)
};
// ../../../vision/spectacular/node_modules/d3-format/src/identity.js
function ro(e) {
	return e;
}
// ../../../vision/spectacular/node_modules/d3-format/src/locale.js
var io = Array.prototype.map, ao = [
	"y",
	"z",
	"a",
	"f",
	"p",
	"n",
	"µ",
	"m",
	"",
	"k",
	"M",
	"G",
	"T",
	"P",
	"E",
	"Z",
	"Y"
];
function oo(e) {
	var t = e.grouping === void 0 || e.thousands === void 0 ? ro : qa(io.call(e.grouping, Number), e.thousands + ""), n = e.currency === void 0 ? "" : e.currency[0] + "", r = e.currency === void 0 ? "" : e.currency[1] + "", i = e.decimal === void 0 ? "." : e.decimal + "", a = e.numerals === void 0 ? ro : Ja(io.call(e.numerals, String)), o = e.percent === void 0 ? "%" : e.percent + "", s = e.minus === void 0 ? "−" : e.minus + "", c = e.nan === void 0 ? "NaN" : e.nan + "";
	function l(e, l) {
		e = Xa(e);
		var u = e.fill, d = e.align, f = e.sign, p = e.symbol, m = e.zero, h = e.width, g = e.comma, _ = e.precision, v = e.trim, y = e.type;
		y === "n" ? (g = !0, y = "g") : no[y] || (_ === void 0 && (_ = 12), v = !0, y = "g"), (m || u === "0" && d === "=") && (m = !0, u = "0", d = "=");
		var b = (l && l.prefix !== void 0 ? l.prefix : "") + (p === "$" ? n : p === "#" && /[boxX]/.test(y) ? "0" + y.toLowerCase() : ""), x = (p === "$" ? r : /[%p]/.test(y) ? o : "") + (l && l.suffix !== void 0 ? l.suffix : ""), S = no[y], C = /[defgprs%]/.test(y);
		_ = _ === void 0 ? 6 : /[gprs]/.test(y) ? Math.max(1, Math.min(21, _)) : Math.max(0, Math.min(20, _));
		function w(e) {
			var n = b, r = x, o, l, p;
			if (y === "c") r = S(e) + r, e = "";
			else {
				e = +e;
				var w = e < 0 || 1 / e < 0;
				if (e = isNaN(e) ? c : S(Math.abs(e), _), v && (e = Qa(e)), w && +e == 0 && f !== "+" && (w = !1), n = (w ? f === "(" ? f : s : f === "-" || f === "(" ? "" : f) + n, r = (y === "s" && !isNaN(e) && $a !== void 0 ? ao[8 + $a / 3] : "") + r + (w && f === "(" ? ")" : ""), C) {
					for (o = -1, l = e.length; ++o < l;) if (p = e.charCodeAt(o), 48 > p || p > 57) {
						r = (p === 46 ? i + e.slice(o + 1) : e.slice(o)) + r, e = e.slice(0, o);
						break;
					}
				}
			}
			g && !m && (e = t(e, Infinity));
			var T = n.length + e.length + r.length, E = T < h ? Array(h - T + 1).join(u) : "";
			switch (g && m && (e = t(E + e, E.length ? h - r.length : Infinity), E = ""), d) {
				case "<":
					e = n + e + r + E;
					break;
				case "=":
					e = n + E + e + r;
					break;
				case "^":
					e = E.slice(0, T = E.length >> 1) + n + e + r + E.slice(T);
					break;
				default: e = E + n + e + r;
			}
			return a(e);
		}
		return w.toString = function() {
			return e + "";
		}, w;
	}
	function u(e, t) {
		var n = Math.max(-8, Math.min(8, Math.floor(Ka(t) / 3))) * 3, r = 10 ** -n, i = l((e = Xa(e), e.type = "f", e), { suffix: ao[8 + n / 3] });
		return function(e) {
			return i(r * e);
		};
	}
	return {
		format: l,
		formatPrefix: u
	};
}
// ../../../vision/spectacular/node_modules/d3-format/src/defaultLocale.js
var so, co, lo;
uo({
	thousands: ",",
	grouping: [3],
	currency: ["$", ""]
});
function uo(e) {
	return so = oo(e), co = so.format, lo = so.formatPrefix, so;
}
// ../../../vision/spectacular/node_modules/d3-format/src/precisionFixed.js
function fo(e) {
	return Math.max(0, -Ka(Math.abs(e)));
}
// ../../../vision/spectacular/node_modules/d3-format/src/precisionPrefix.js
function po(e, t) {
	return Math.max(0, Math.max(-8, Math.min(8, Math.floor(Ka(t) / 3))) * 3 - Ka(Math.abs(e)));
}
// ../../../vision/spectacular/node_modules/d3-format/src/precisionRound.js
function mo(e, t) {
	return e = Math.abs(e), t = Math.abs(t) - e, Math.max(0, Ka(t) - Ka(e)) + 1;
}
// ../../../vision/spectacular/node_modules/d3-scale/src/init.js
function ho(e, t) {
	switch (arguments.length) {
		case 0: break;
		case 1:
			this.range(e);
			break;
		default: this.range(t).domain(e);
	}
	return this;
}
// ../../../vision/spectacular/node_modules/d3-scale/src/ordinal.js
var go = Symbol("implicit");
function _o() {
	var e = new s(), t = [], n = [], r = go;
	function i(i) {
		let a = e.get(i);
		if (a === void 0) {
			if (r !== go) return r;
			e.set(i, a = t.push(i) - 1);
		}
		return n[a % n.length];
	}
	return i.domain = function(n) {
		if (!arguments.length) return t.slice();
		t = [], e = new s();
		for (let r of n) e.has(r) || e.set(r, t.push(r) - 1);
		return i;
	}, i.range = function(e) {
		return arguments.length ? (n = Array.from(e), i) : n.slice();
	}, i.unknown = function(e) {
		return arguments.length ? (r = e, i) : r;
	}, i.copy = function() {
		return _o(t, n).unknown(r);
	}, ho.apply(i, arguments), i;
}
// ../../../vision/spectacular/node_modules/d3-scale/src/band.js
function vo() {
	var e = _o().unknown(void 0), t = e.domain, n = e.range, r = 0, i = 1, a, o, s = !1, c = 0, l = 0, u = .5;
	delete e.unknown;
	function d() {
		var e = t().length, d = i < r, f = d ? i : r, p = d ? r : i;
		a = (p - f) / Math.max(1, e - c + l * 2), s && (a = Math.floor(a)), f += (p - f - a * (e - c)) * u, o = a * (1 - c), s && (f = Math.round(f), o = Math.round(o));
		var m = b(e).map(function(e) {
			return f + a * e;
		});
		return n(d ? m.reverse() : m);
	}
	return e.domain = function(e) {
		return arguments.length ? (t(e), d()) : t();
	}, e.range = function(e) {
		return arguments.length ? ([r, i] = e, r = +r, i = +i, d()) : [r, i];
	}, e.rangeRound = function(e) {
		return [r, i] = e, r = +r, i = +i, s = !0, d();
	}, e.bandwidth = function() {
		return o;
	}, e.step = function() {
		return a;
	}, e.round = function(e) {
		return arguments.length ? (s = !!e, d()) : s;
	}, e.padding = function(e) {
		return arguments.length ? (c = Math.min(1, l = +e), d()) : c;
	}, e.paddingInner = function(e) {
		return arguments.length ? (c = Math.min(1, e), d()) : c;
	}, e.paddingOuter = function(e) {
		return arguments.length ? (l = +e, d()) : l;
	}, e.align = function(e) {
		return arguments.length ? (u = Math.max(0, Math.min(1, e)), d()) : u;
	}, e.copy = function() {
		return vo(t(), [r, i]).round(s).paddingInner(c).paddingOuter(l).align(u);
	}, ho.apply(d(), arguments);
}
// ../../../vision/spectacular/node_modules/d3-scale/src/constant.js
function yo(e) {
	return function() {
		return e;
	};
}
// ../../../vision/spectacular/node_modules/d3-scale/src/number.js
function bo(e) {
	return +e;
}
// ../../../vision/spectacular/node_modules/d3-scale/src/continuous.js
var xo = [0, 1];
function So(e) {
	return e;
}
function Co(e, t) {
	return (t -= e = +e) ? function(n) {
		return (n - e) / t;
	} : yo(isNaN(t) ? NaN : .5);
}
function wo(e, t) {
	var n;
	return e > t && (n = e, e = t, t = n), function(n) {
		return Math.max(e, Math.min(t, n));
	};
}
function To(e, t, n) {
	var r = e[0], i = e[1], a = t[0], o = t[1];
	return i < r ? (r = Co(i, r), a = n(o, a)) : (r = Co(r, i), a = n(a, o)), function(e) {
		return a(r(e));
	};
}
function Eo(e, t, n) {
	var r = Math.min(e.length, t.length) - 1, i = Array(r), a = Array(r), s = -1;
	for (e[r] < e[0] && (e = e.slice().reverse(), t = t.slice().reverse()); ++s < r;) i[s] = Co(e[s], e[s + 1]), a[s] = n(t[s], t[s + 1]);
	return function(t) {
		var n = o(e, t, 1, r) - 1;
		return a[n](i[n](t));
	};
}
function Do(e, t) {
	return t.domain(e.domain()).range(e.range()).interpolate(e.interpolate()).clamp(e.clamp()).unknown(e.unknown());
}
function Oo() {
	var e = xo, t = xo, n = or, r, i, a, o = So, s, c, l;
	function u() {
		var n = Math.min(e.length, t.length);
		return o !== So && (o = wo(e[0], e[n - 1])), s = n > 2 ? Eo : To, c = l = null, d;
	}
	function d(i) {
		return i == null || isNaN(i = +i) ? a : (c ||= s(e.map(r), t, n))(r(o(i)));
	}
	return d.invert = function(n) {
		return o(i((l ||= s(t, e.map(r), $n))(n)));
	}, d.domain = function(t) {
		return arguments.length ? (e = Array.from(t, bo), u()) : e.slice();
	}, d.range = function(e) {
		return arguments.length ? (t = Array.from(e), u()) : t.slice();
	}, d.rangeRound = function(e) {
		return t = Array.from(e), n = sr, u();
	}, d.clamp = function(e) {
		return arguments.length ? (o = e ? !0 : So, u()) : o !== So;
	}, d.interpolate = function(e) {
		return arguments.length ? (n = e, u()) : n;
	}, d.unknown = function(e) {
		return arguments.length ? (a = e, d) : a;
	}, function(e, t) {
		return r = e, i = t, u();
	};
}
function ko() {
	return Oo()(So, So);
}
// ../../../vision/spectacular/node_modules/d3-scale/src/tickFormat.js
function Ao(e, t, n, r) {
	var i = v(e, t, n), a;
	switch (r = Xa(r ?? ",f"), r.type) {
		case "s":
			var o = Math.max(Math.abs(e), Math.abs(t));
			return r.precision == null && !isNaN(a = po(i, o)) && (r.precision = a), lo(r, o);
		case "":
		case "e":
		case "g":
		case "p":
		case "r":
			r.precision == null && !isNaN(a = mo(i, Math.max(Math.abs(e), Math.abs(t)))) && (r.precision = a - (r.type === "e"));
			break;
		case "f":
		case "%": r.precision == null && !isNaN(a = fo(i)) && (r.precision = a - (r.type === "%") * 2);
	}
	return co(r);
}
// ../../../vision/spectacular/node_modules/d3-scale/src/linear.js
function jo(e) {
	var t = e.domain;
	return e.ticks = function(e) {
		var n = t();
		return g(n[0], n[n.length - 1], e ?? 10);
	}, e.tickFormat = function(e, n) {
		var r = t();
		return Ao(r[0], r[r.length - 1], e ?? 10, n);
	}, e.nice = function(n) {
		n ??= 10;
		var r = t(), i = 0, a = r.length - 1, o = r[i], s = r[a], c, l, u = 10;
		for (s < o && (l = o, o = s, s = l, l = i, i = a, a = l); u-- > 0;) {
			if (l = _(o, s, n), l === c) return r[i] = o, r[a] = s, t(r);
			if (l > 0) o = Math.floor(o / l) * l, s = Math.ceil(s / l) * l;
			else if (l < 0) o = Math.ceil(o * l) / l, s = Math.floor(s * l) / l;
			else break;
			c = l;
		}
		return e;
	}, e;
}
function Mo() {
	var e = ko();
	return e.copy = function() {
		return Do(e, Mo());
	}, ho.apply(e, arguments), jo(e);
}
// ../../../vision/spectacular/node_modules/d3-scale-chromatic/src/colors.js
function No(e) {
	for (var t = e.length / 6 | 0, n = Array(t), r = 0; r < t;) n[r] = "#" + e.slice(r * 6, ++r * 6);
	return n;
}
// ../../../vision/spectacular/node_modules/d3-scale-chromatic/src/categorical/Tableau10.js
var Po = No("4e79a7f28e2ce1575976b7b259a14fedc949af7aa1ff9da79c755fbab0ab");
// ../../../vision/spectacular/node_modules/d3-scale-chromatic/src/sequential-multi/viridis.js
function Fo(e) {
	var t = e.length;
	return function(n) {
		return e[Math.max(0, Math.min(t - 1, Math.floor(n * t)))];
	};
}
var Io = Fo(No("44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725"));
Fo(No("00000401000501010601010802010902020b02020d03030f03031204041405041606051806051a07061c08071e0907200a08220b09240c09260d0a290e0b2b100b2d110c2f120d31130d34140e36150e38160f3b180f3d19103f1a10421c10441d11471e114920114b21114e22115024125325125527125829115a2a115c2c115f2d11612f116331116533106734106936106b38106c390f6e3b0f703d0f713f0f72400f74420f75440f764510774710784910784a10794c117a4e117b4f127b51127c52137c54137d56147d57157e59157e5a167e5c167f5d177f5f187f601880621980641a80651a80671b80681c816a1c816b1d816d1d816e1e81701f81721f817320817521817621817822817922827b23827c23827e24828025828125818326818426818627818827818928818b29818c29818e2a81902a81912b81932b80942c80962c80982d80992d809b2e7f9c2e7f9e2f7fa02f7fa1307ea3307ea5317ea6317da8327daa337dab337cad347cae347bb0357bb2357bb3367ab5367ab73779b83779ba3878bc3978bd3977bf3a77c03a76c23b75c43c75c53c74c73d73c83e73ca3e72cc3f71cd4071cf4070d0416fd2426fd3436ed5446dd6456cd8456cd9466bdb476adc4869de4968df4a68e04c67e24d66e34e65e44f64e55064e75263e85362e95462ea5661eb5760ec5860ed5a5fee5b5eef5d5ef05f5ef1605df2625df2645cf3655cf4675cf4695cf56b5cf66c5cf66e5cf7705cf7725cf8745cf8765cf9785df9795df97b5dfa7d5efa7f5efa815ffb835ffb8560fb8761fc8961fc8a62fc8c63fc8e64fc9065fd9266fd9467fd9668fd9869fd9a6afd9b6bfe9d6cfe9f6dfea16efea36ffea571fea772fea973feaa74feac76feae77feb078feb27afeb47bfeb67cfeb77efeb97ffebb81febd82febf84fec185fec287fec488fec68afec88cfeca8dfecc8ffecd90fecf92fed194fed395fed597fed799fed89afdda9cfddc9efddea0fde0a1fde2a3fde3a5fde5a7fde7a9fde9aafdebacfcecaefceeb0fcf0b2fcf2b4fcf4b6fcf6b8fcf7b9fcf9bbfcfbbdfcfdbf"));
var Lo = Fo(No("00000401000501010601010802010a02020c02020e03021004031204031405041706041907051b08051d09061f0a07220b07240c08260d08290e092b10092d110a30120a32140b34150b37160b39180c3c190c3e1b0c411c0c431e0c451f0c48210c4a230c4c240c4f260c51280b53290b552b0b572d0b592f0a5b310a5c320a5e340a5f3609613809623909633b09643d09653e0966400a67420a68440a68450a69470b6a490b6a4a0c6b4c0c6b4d0d6c4f0d6c510e6c520e6d540f6d550f6d57106e59106e5a116e5c126e5d126e5f136e61136e62146e64156e65156e67166e69166e6a176e6c186e6d186e6f196e71196e721a6e741a6e751b6e771c6d781c6d7a1d6d7c1d6d7d1e6d7f1e6c801f6c82206c84206b85216b87216b88226a8a226a8c23698d23698f24699025689225689326679526679727669827669a28659b29649d29649f2a63a02a63a22b62a32c61a52c60a62d60a82e5fa92e5eab2f5ead305dae305cb0315bb1325ab3325ab43359b63458b73557b93556ba3655bc3754bd3853bf3952c03a51c13a50c33b4fc43c4ec63d4dc73e4cc83f4bca404acb4149cc4248ce4347cf4446d04545d24644d34743d44842d54a41d74b3fd84c3ed94d3dda4e3cdb503bdd513ade5238df5337e05536e15635e25734e35933e45a31e55c30e65d2fe75e2ee8602de9612bea632aeb6429eb6628ec6726ed6925ee6a24ef6c23ef6e21f06f20f1711ff1731df2741cf3761bf37819f47918f57b17f57d15f67e14f68013f78212f78410f8850ff8870ef8890cf98b0bf98c0af98e09fa9008fa9207fa9407fb9606fb9706fb9906fb9b06fb9d07fc9f07fca108fca309fca50afca60cfca80dfcaa0ffcac11fcae12fcb014fcb216fcb418fbb61afbb81dfbba1ffbbc21fbbe23fac026fac228fac42afac62df9c72ff9c932f9cb35f8cd37f8cf3af7d13df7d340f6d543f6d746f5d949f5db4cf4dd4ff4df53f4e156f3e35af3e55df2e661f2e865f2ea69f1ec6df1ed71f1ef75f1f179f2f27df2f482f3f586f3f68af4f88ef5f992f6fa96f8fb9af9fc9dfafda1fcffa4"));
Fo(No("0d088710078813078916078a19068c1b068d1d068e20068f2206902406912605912805922a05932c05942e05952f059631059733059735049837049938049a3a049a3c049b3e049c3f049c41049d43039e44039e46039f48039f4903a04b03a14c02a14e02a25002a25102a35302a35502a45601a45801a45901a55b01a55c01a65e01a66001a66100a76300a76400a76600a76700a86900a86a00a86c00a86e00a86f00a87100a87201a87401a87501a87701a87801a87a02a87b02a87d03a87e03a88004a88104a78305a78405a78606a68707a68808a68a09a58b0aa58d0ba58e0ca48f0da4910ea3920fa39410a29511a19613a19814a099159f9a169f9c179e9d189d9e199da01a9ca11b9ba21d9aa31e9aa51f99a62098a72197a82296aa2395ab2494ac2694ad2793ae2892b02991b12a90b22b8fb32c8eb42e8db52f8cb6308bb7318ab83289ba3388bb3488bc3587bd3786be3885bf3984c03a83c13b82c23c81c33d80c43e7fc5407ec6417dc7427cc8437bc9447aca457acb4679cc4778cc4977cd4a76ce4b75cf4c74d04d73d14e72d24f71d35171d45270d5536fd5546ed6556dd7566cd8576bd9586ada5a6ada5b69db5c68dc5d67dd5e66de5f65de6164df6263e06363e16462e26561e26660e3685fe4695ee56a5de56b5de66c5ce76e5be76f5ae87059e97158e97257ea7457eb7556eb7655ec7754ed7953ed7a52ee7b51ef7c51ef7e50f07f4ff0804ef1814df1834cf2844bf3854bf3874af48849f48948f58b47f58c46f68d45f68f44f79044f79143f79342f89441f89540f9973ff9983ef99a3efa9b3dfa9c3cfa9e3bfb9f3afba139fba238fca338fca537fca636fca835fca934fdab33fdac33fdae32fdaf31fdb130fdb22ffdb42ffdb52efeb72dfeb82cfeba2cfebb2bfebd2afebe2afec029fdc229fdc328fdc527fdc627fdc827fdca26fdcb26fccd25fcce25fcd025fcd225fbd324fbd524fbd724fad824fada24f9dc24f9dd25f8df25f8e125f7e225f7e425f6e626f6e826f5e926f5eb27f4ed27f3ee27f3f027f2f227f1f426f1f525f0f724f0f921"));
// ../../../vision/spectacular/node_modules/d3-zoom/src/transform.js
function Ro(e, t, n) {
	this.k = e, this.x = t, this.y = n;
}
Ro.prototype = {
	constructor: Ro,
	scale: function(e) {
		return e === 1 ? this : new Ro(this.k * e, this.x, this.y);
	},
	translate: function(e, t) {
		return e === 0 & t === 0 ? this : new Ro(this.k, this.x + this.k * e, this.y + this.k * t);
	},
	apply: function(e) {
		return [e[0] * this.k + this.x, e[1] * this.k + this.y];
	},
	applyX: function(e) {
		return e * this.k + this.x;
	},
	applyY: function(e) {
		return e * this.k + this.y;
	},
	invert: function(e) {
		return [(e[0] - this.x) / this.k, (e[1] - this.y) / this.k];
	},
	invertX: function(e) {
		return (e - this.x) / this.k;
	},
	invertY: function(e) {
		return (e - this.y) / this.k;
	},
	rescaleX: function(e) {
		return e.copy().domain(e.range().map(this.invertX, this).map(e.invert, e));
	},
	rescaleY: function(e) {
		return e.copy().domain(e.range().map(this.invertY, this).map(e.invert, e));
	},
	toString: function() {
		return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
	}
};
var zo = new Ro(1, 0, 0);
Bo.prototype = Ro.prototype;
function Bo(e) {
	for (; !e.__zoom;) if (!(e = e.parentNode)) return zo;
	return e.__zoom;
}
// ../../../vision/spectacular/packages/viz/src/spec.ts
var Vo = "spectacular/v0", Ho = {
	scatter: {
		required: ["x", "y"],
		optional: ["color"]
	},
	histogram: {
		required: ["field"],
		optional: []
	},
	bars: {
		required: ["field"],
		optional: []
	},
	density: {
		required: ["x", "y"],
		optional: []
	},
	scatter3d: {
		required: [
			"x",
			"y",
			"z"
		],
		optional: ["color"]
	}
}, Uo = {
	scatter: {
		x: "quantitative",
		y: "quantitative",
		color: void 0
	},
	histogram: { field: "quantitative" },
	bars: { field: "nominal" },
	density: {
		x: "quantitative",
		y: "quantitative"
	},
	scatter3d: {
		x: "quantitative",
		y: "quantitative",
		z: "quantitative",
		color: void 0
	}
}, Wo = {
	scatter: ["xy", "none"],
	histogram: ["x", "none"],
	bars: ["select", "none"],
	density: [],
	scatter3d: []
}, Go = [
	"id",
	"type",
	"title",
	"height",
	"span"
], Ko = {
	scatter: ["brush", "pointSize"],
	histogram: ["brush", "bins"],
	bars: ["brush"],
	density: ["bins"],
	scatter3d: ["pointSize"]
}, qo = [
	"$schema",
	"version",
	"title",
	"description",
	"data",
	"fields",
	"views",
	"layout",
	"output"
], Jo = {
	url: [
		"url",
		"format",
		"pointer"
	],
	values: ["values"],
	columns: ["columns"]
}, Yo = [
	"csv",
	"tsv",
	"json"
], Xo = [
	"svg",
	"pdf",
	"png"
], Zo = [
	"mm",
	"in",
	"px"
];
function Qo(e, t) {
	let n = Array.from({ length: t.length + 1 }, (e, t) => t);
	for (let r = 1; r <= e.length; r++) {
		let i = n[0];
		n[0] = r;
		for (let a = 1; a <= t.length; a++) {
			let o = n[a];
			n[a] = Math.min(n[a] + 1, n[a - 1] + 1, i + (e[r - 1] === t[a - 1] ? 0 : 1)), i = o;
		}
	}
	return n[t.length];
}
function $o(e, t, n, r) {
	for (let i of Object.keys(e)) {
		if (t.includes(i)) continue;
		let e = t.filter((e) => Qo(e.toLowerCase(), i.toLowerCase()) <= 2);
		r(`${n}/${i}`, `unknown property "${i}"` + (e.length ? `; did you mean "${e[0]}"?` : `; allowed: ${t.join(", ")}`));
	}
}
var es = (e) => typeof e == "object" && !!e && !Array.isArray(e);
function ts(e) {
	switch (e.type) {
		case "scatter": return (e.brush ?? "xy") === "xy" ? 2 : 0;
		case "histogram":
		case "bars": return 1;
		case "density": return 2;
		case "scatter3d": return 0;
	}
}
function ns(e) {
	let t = Uo[e.type];
	return t ? Object.keys(t).map((n) => [e[n], t[n]]).filter((e) => typeof e[0] == "string").map(([e, t]) => [e, t]) : [];
}
function rs(e, t) {
	let n = [], r = (e, t) => n.push({
		path: e,
		message: t
	});
	if (!es(e)) return [{
		path: "",
		message: "a spec must be a JSON object"
	}];
	let i = e;
	$o(i, qo, "", r), i.version !== void 0 && i.version !== "spectacular/v0" && r("/version", `unsupported version ${JSON.stringify(i.version)}; this build reads "${Vo}"`);
	let a = i.data;
	if (!es(a)) r("/data", "required: { url } | { values } | { columns: \"external\" }");
	else {
		let e = [
			"url",
			"values",
			"columns"
		].filter((e) => e in a);
		e.length === 1 ? "url" in a ? ($o(a, Jo.url, "/data", r), typeof a.url != "string" && r("/data/url", "must be a string"), a.format !== void 0 && !Yo.includes(a.format) && r("/data/format", `one of ${Yo.join(", ")}`), a.pointer !== void 0 && (typeof a.pointer != "string" || a.pointer !== "" && !a.pointer.startsWith("/")) && r("/data/pointer", "a JSON Pointer: \"\" or a string starting with \"/\"")) : "values" in a ? ($o(a, Jo.values, "/data", r), Array.isArray(a.values) && a.values.every(es) || r("/data/values", "must be an array of row objects")) : ($o(a, Jo.columns, "/data", r), a.columns !== "external" && r("/data/columns", "must be \"external\"")) : r("/data", `give exactly one of url, values, columns (got ${e.join(", ") || "none"})`);
	}
	let o = { ...t };
	if (i.fields !== void 0) {
		if (!es(i.fields)) r("/fields", "must be an object of field name to definition");
		else for (let [e, t] of Object.entries(i.fields)) es(t) ? ($o(t, ["type", "title"], `/fields/${e}`, r), t.type !== void 0 && (t.type !== "quantitative" && t.type !== "nominal" ? r(`/fields/${e}/type`, "must be \"quantitative\" or \"nominal\"") : o[e] = t.type)) : r(`/fields/${e}`, "must be an object");
	}
	if (!Array.isArray(i.views) || i.views.length === 0) return r("/views", "required: a non-empty array of views"), n;
	let s = /* @__PURE__ */ new Set();
	if (i.views.forEach((e, n) => {
		let i = `/views/${n}`;
		if (!es(e)) return r(i, "must be an object");
		typeof e.id != "string" || e.id === "" ? r(`${i}/id`, "required: a non-empty string") : s.has(e.id) ? r(`${i}/id`, `duplicate id "${e.id}"`) : s.add(e.id);
		let a = e.type;
		if (!(a in Ho)) return r(`${i}/type`, `unknown view type ${JSON.stringify(e.type)}; one of ${Object.keys(Ho).join(", ")}`);
		let { required: c, optional: l } = Ho[a];
		$o(e, [
			...Go,
			...c,
			...l,
			...Ko[a]
		], i, r);
		for (let t of c) typeof e[t] != "string" && r(`${i}/${t}`, "required: the name of a field");
		for (let n of [...c, ...l]) {
			let s = e[n];
			if (typeof s != "string") continue;
			let c = Uo[a][n], l = o[s];
			t && !(s in t) ? r(`${i}/${n}`, `no field "${s}" in the data`) : c && l && c !== l && r(`${i}/${n}`, `${a}.${n} needs a ${c} field; "${s}" is ${l}`);
		}
		e.brush !== void 0 && Wo[a].length && !Wo[a].includes(e.brush) && r(`${i}/brush`, `one of ${Wo[a].join(", ")}`), e.bins !== void 0 && ((a === "density" ? Array.isArray(e.bins) && e.bins.length === 2 && e.bins.every((e) => Number.isInteger(e) && e > 0 && e <= 1024) : Number.isInteger(e.bins) && e.bins > 0 && e.bins <= 1e4) || r(`${i}/bins`, a === "density" ? "[xBins, yBins], integers in 1..1024" : "an integer in 1..10000"));
		for (let t of [
			"height",
			"span",
			"pointSize"
		]) e[t] !== void 0 && !(typeof e[t] == "number" && e[t] > 0) && r(`${i}/${t}`, "must be a positive number");
	}), i.layout !== void 0) {
		if (!es(i.layout)) r("/layout", "must be an object");
		else {
			$o(i.layout, ["columns"], "/layout", r);
			let e = i.layout.columns;
			e !== void 0 && !(Number.isInteger(e) && e >= 1 && e <= 12) && r("/layout/columns", "an integer in 1..12");
		}
	}
	i.output !== void 0 && (es(i.output) ? ($o(i.output, ["interactive", "figure"], "/output", r), i.output.interactive !== void 0 && typeof i.output.interactive != "boolean" && r("/output/interactive", "must be true or false")) : r("/output", "must be an object"));
	let c = i.views.filter((e) => es(e) && e.type in Ho).reduce((e, t) => e + ts(t), 0);
	c > 32 && r("/views", `these views need ${c} crossfilter dimensions; the limit is 32 (scatter with brush 2, density 2, histogram 1, bars 1, scatter3d 0)`);
	let l = es(i.output) ? i.output.figure : void 0;
	return l !== void 0 && (es(l) ? ($o(l, [
		"format",
		"width",
		"unit",
		"dpi"
	], "/output/figure", r), Xo.includes(l.format) || r("/output/figure/format", `one of ${Xo.join(", ")}`), typeof l.width == "number" && l.width > 0 || r("/output/figure/width", "required: a positive number"), l.unit !== void 0 && !Zo.includes(l.unit) && r("/output/figure/unit", `one of ${Zo.join(", ")}`), l.dpi !== void 0 && !(typeof l.dpi == "number" && l.dpi > 0) && r("/output/figure/dpi", "must be a positive number")) : r("/output/figure", "must be an object")), n;
}
var is = class extends Error {
	problems;
	constructor(e) {
		super("invalid spec:\n" + e.map((e) => `  ${e.path || "/"}: ${e.message}`).join("\n")), this.problems = e;
	}
};
// ../../../vision/spectacular/packages/viz/src/data.ts
function as(e) {
	let t = Infinity, n = -Infinity;
	for (let r of e) r < t && (t = r), r > n && (n = r);
	return {
		type: "quantitative",
		values: e,
		extent: t <= n ? [t, n] : [0, 1]
	};
}
function os(e) {
	let t = /* @__PURE__ */ new Map(), n = [], r = new Uint32Array(e.length);
	for (let i = 0; i < e.length; i++) {
		let a = e[i] == null ? "" : String(e[i]), o = t.get(a);
		o === void 0 && (o = n.length, t.set(a, o), n.push(a)), r[i] = o;
	}
	return {
		type: "nominal",
		codes: r,
		labels: n
	};
}
function ss(e) {
	for (let t = 0; t < e.length; t++) {
		let n = e[t];
		if (n != null && n !== "" && typeof n != "number" && !(typeof n == "string" && n.trim() !== "" && Number.isFinite(Number(n)))) return "nominal";
	}
	return "quantitative";
}
function cs(e) {
	let t = new Float64Array(e.length);
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		t[n] = r == null || r === "" ? NaN : Number(r);
	}
	return t;
}
function ls(e) {
	let t = new Set(e.views.flatMap((e) => ns(e).map(([e]) => e)));
	for (let n of Object.keys(e.fields ?? {})) t.add(n);
	return [...t];
}
function us(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of ls(e)) {
		if (t.length && !(r in t[0])) continue;
		let i = t.map((e) => e[r]), a = e.fields?.[r]?.type ?? ss(i);
		n.set(r, a === "quantitative" ? as(cs(i)) : os(i));
	}
	return {
		rows: t.length,
		columns: n
	};
}
function ds(e, t) {
	let n = /* @__PURE__ */ new Map(), r = -1;
	for (let i of ls(e)) {
		let a = t[i];
		if (a === void 0) continue;
		let o;
		o = "codes" in a && "labels" in a ? {
			type: "nominal",
			codes: Uint32Array.from(a.codes),
			labels: a.labels
		} : e.fields?.[i]?.type === "nominal" || a.length > 0 && typeof a[0] == "string" ? os(a) : as(a instanceof Float64Array ? a : Float64Array.from(a));
		let s = o.type === "quantitative" ? o.values.length : o.codes.length;
		if (r >= 0 && s !== r) throw Error(`column "${i}" has ${s} rows, others have ${r}`);
		r = s, n.set(i, o);
	}
	return {
		rows: Math.max(r, 0),
		columns: n
	};
}
async function fs(e, t, n = fetch) {
	let r = e.data;
	if ("columns" in r) {
		if (!t) throw Error("data.columns is \"external\" but no columns were passed to mount()");
		return ds(e, t);
	}
	if ("values" in r) return us(e, r.values);
	let i = await n(r.url);
	if (!i.ok) throw Error(`fetching ${r.url}: ${i.status} ${i.statusText}`);
	let a = await i.text(), o = r.format ?? (/\.json(ld)?(\?|#|$)/i.test(r.url) ? "json" : /\.tsv(\?|#|$)/i.test(r.url) ? "tsv" : "csv");
	return o === "json" ? us(e, ps(JSON.parse(a), r.pointer ?? "")) : us(e, Ua(o === "tsv" ? "	" : ",").parse(a));
}
function ps(e, t) {
	let n = e;
	for (let e of t === "" ? [] : t.slice(1).split("/")) {
		let r = e.replace(/~1/g, "/").replace(/~0/g, "~");
		if (n = typeof n == "object" && n ? n[r] : void 0, n === void 0) throw Error(`data.pointer ${JSON.stringify(t)}: nothing at "${r}"`);
	}
	if (!Array.isArray(n)) throw Error(`data.pointer ${JSON.stringify(t || "(document)")} must lead to an array of row objects`);
	return n;
}
function ms(e) {
	return Object.fromEntries([...e.columns].map(([e, t]) => [e, t.type]));
}
// ../../../vision/spectacular/packages/viz/src/engine/client.ts
var hs = class e {
	worker;
	seq = 0;
	inFlight = !1;
	pending = /* @__PURE__ */ new Map();
	sent = [];
	listeners = /* @__PURE__ */ new Set();
	state;
	filters = /* @__PURE__ */ new Map();
	constructor(e, t, n) {
		this.worker = e, this.state = {
			mask: new Uint8Array(t).fill(1),
			counts: n.counts,
			baseline: n.counts.map((e) => e.slice()),
			binnings: n.binnings,
			selectedCount: n.selectedCount,
			rows: t,
			elapsed: 0
		}, e.onmessage = (e) => this.receive(e.data);
	}
	static start(t, n, r, i) {
		let a = i ?? new Worker(new URL(
			/* @vite-ignore */
			"/assets/worker-C1jRHgn3.js",
			"" + import.meta.url
		), { type: "module" });
		return new Promise((i, o) => {
			a.onmessage = (n) => {
				n.data.type === "ready" ? i(new e(a, t, n.data)) : n.data.type === "error" && o(Error(n.data.message));
			}, a.onerror = (e) => o(Error(e.message)), a.postMessage({
				type: "init",
				rows: t,
				dims: n,
				groups: r
			});
		});
	}
	on(e) {
		return this.listeners.add(e), () => this.listeners.delete(e);
	}
	filter(e) {
		this.pending.set(e.dim, e), this.flush();
	}
	dispose() {
		this.worker.terminate(), this.listeners.clear();
	}
	flush() {
		if (this.inFlight || this.pending.size === 0) return;
		let e = [...this.pending.values()];
		this.pending.clear(), this.sent = e, this.inFlight = !0, this.worker.postMessage({
			type: "filter",
			seq: ++this.seq,
			ops: e
		});
	}
	receive(e) {
		if (e.type === "error") {
			this.inFlight = !1, console.error("spectacular engine:", e.message), this.flush();
			return;
		}
		if (e.type !== "update") return;
		let t = this.state;
		if (e.mask) t.mask.set(e.mask);
		else if (e.changed) for (let n of e.changed) t.mask[n] = t.mask[n] ^ 1;
		t.counts = e.counts, t.selectedCount = e.selectedCount, t.elapsed = e.elapsed;
		for (let e of this.sent) "clear" in e ? this.filters.delete(e.dim) : this.filters.set(e.dim, e);
		this.inFlight = !1;
		for (let e of this.listeners) e(t);
		this.flush();
	}
}, gs = {
	top: 8,
	right: 12,
	bottom: 34,
	left: 52
}, _s = Po;
function vs(e, t = 300) {
	let n = document.createElement("div");
	n.className = "sv-panel", n.dataset.view = e.view.id;
	let r = document.createElement("div");
	r.className = "sv-title", r.textContent = e.view.title ?? e.view.id, n.append(r);
	let i = document.createElement("div");
	i.className = "sv-stage", i.style.height = `${t + gs.top + gs.bottom}px`, n.append(i);
	let a = Math.max(80, e.width - gs.left - gs.right), o = t, s = document.createElement("div");
	s.className = "sv-plot", Object.assign(s.style, {
		left: `${gs.left}px`,
		top: `${gs.top}px`,
		width: `${a}px`,
		height: `${o}px`
	}), i.append(s);
	let c = Xt(i).append("svg").attr("class", "sv-overlay").attr("width", a + gs.left + gs.right).attr("height", o + gs.top + gs.bottom);
	return {
		root: n,
		plot: s,
		svg: c,
		g: c.append("g").attr("transform", `translate(${gs.left},${gs.top})`),
		w: a,
		h: o
	};
}
function ys(e, t) {
	return t <= Math.max(e, 1) * 1.25 ? {
		max: Math.max(t, e, 1),
		context: !0
	} : {
		max: Math.max(e, 1),
		context: !1
	};
}
var bs = 0;
function xs(e) {
	let t = `sv-clip-${++bs}`;
	return e.svg.append("defs").append("clipPath").attr("id", t).append("rect").attr("width", e.w).attr("height", e.h), t;
}
function Ss(e, t, n) {
	e.g.append("text").attr("class", "sv-axis-label").attr("x", e.w).attr("y", e.h + 30).attr("text-anchor", "end").text(t), e.g.append("text").attr("class", "sv-axis-label").attr("transform", "rotate(-90)").attr("x", 0).attr("y", -40).attr("text-anchor", "end").text(n);
}
function Cs(e, t) {
	let n = e.columns.get(t);
	if (!n || n.type !== "quantitative") throw Error(`field "${t}" is not quantitative`);
	return n;
}
function ws(e, t) {
	let n = e.columns.get(t);
	if (!n || n.type !== "nominal") throw Error(`field "${t}" is not nominal`);
	return n;
}
function Ts(e) {
	return Math.min(.85, Math.max(.02, 4e4 / Math.max(e, 1)));
}
function Es(e, t) {
	return e < t && e < 2e4 ? 2 : 1;
}
function Ds(e) {
	let t = parseInt(e.slice(1), 16);
	return [
		(t >> 16 & 255) / 255,
		(t >> 8 & 255) / 255,
		(t & 255) / 255
	];
}
function Os(e, t) {
	let n = e.rows;
	if (!t) return {
		mode: 0,
		data: new Float32Array(n)
	};
	let r = e.columns.get(t);
	if (!r) throw Error(`no field "${t}"`);
	if (r.type === "nominal") return {
		mode: 1,
		data: Float32Array.from(r.codes, (e) => e % _s.length)
	};
	let [i, a] = r.extent, o = a > i ? a - i : 1;
	return {
		mode: 2,
		data: Float32Array.from(r.values, (e) => Number.isNaN(e) ? 0 : (e - i) / o)
	};
}
function ks(e, t) {
	let n = (t[0] + t[1]) / 2;
	return {
		data: Float32Array.from(e, (e) => e - n),
		centre: n
	};
}
var As = "\nuniform int u_colorMode;\nuniform vec3 u_palette[10];\nuniform vec3 u_base;\nvec3 viridis(float t) {\n  t = clamp(t, 0.0, 1.0);\n  const vec3 c0 = vec3(0.2777, 0.0054, 0.3341), c1 = vec3(0.1050, 1.4046, 1.3846),\n             c2 = vec3(-0.3309, 0.2148, 0.0951), c3 = vec3(-4.6342, -5.7991, -19.3324),\n             c4 = vec3(6.2283, 14.1799, 56.6906), c5 = vec3(4.7764, -13.7451, -65.3530),\n             c6 = vec3(-5.4355, 4.6459, 26.3124);\n  return c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6)))));\n}\nvec3 pointColor(float c) {\n  if (u_colorMode == 1) return u_palette[int(c + 0.5)];\n  if (u_colorMode == 2) return viridis(c);\n  return u_base;\n}";
// ../../../vision/spectacular/packages/viz/src/views/bars.ts
function js(e) {
	let { view: t, table: n, engine: r, alloc: i } = e, a = ws(n, t.field), o = i.group, s = vs(e, t.height ?? Math.min(420, Math.max(120, a.labels.length * 22))), c = Math.min(160, 8 + 7 * Math.max(...a.labels.map((e) => e.length))), l = Math.floor((c - 8) / 7), u = (e) => e.length <= l ? e : "…" + e.slice(e.length - l + 1);
	s.g.attr("transform", `translate(${c},8)`);
	let d = s.w - (c - 52), f = vo().domain(a.labels.map((e, t) => t)).range([0, s.h]).padding(.15), p = Mo().range([0, d]), m = s.g.append("g").attr("transform", `translate(0,${s.h})`);
	s.g.append("g").call(P(f).tickFormat((e) => u(a.labels[e]))).call((e) => e.selectAll(".tick").append("title").text((e) => a.labels[e]));
	let h = /* @__PURE__ */ new Set(), g = s.g.append("g").attr("clip-path", `url(#${xs({
		...s,
		w: d
	})})`).selectAll("g.sv-row").data(a.labels.map((e, t) => t)).join("g").attr("class", "sv-row").attr("transform", (e) => `translate(0,${f(e)})`), _ = g.append("rect").attr("class", "sv-context").attr("height", f.bandwidth()), v = g.append("rect").attr("class", "sv-focus").attr("height", f.bandwidth()).attr("fill", (e) => _s[e % _s.length]), b = (e) => {
		let t = e.counts[o], n = ys(y(t) ?? 0, y(e.baseline[o]) ?? 0);
		p.domain([0, n.max]).nice(), m.call(N(p).ticks(4).tickFormat(co("~s"))), _.attr("display", n.context ? null : "none").attr("width", (t) => p(e.baseline[o][t])), v.attr("width", (e) => p(t[e])).attr("opacity", (e) => h.size === 0 || h.has(e) ? 1 : .25);
	};
	if (b(r.state), (t.brush ?? "select") === "select") {
		let e = i.dims[t.field];
		g.style("cursor", "pointer").on("click", (t, n) => {
			h.has(n) ? h.delete(n) : h.add(n), r.filter(h.size ? {
				dim: e,
				codes: [...h]
			} : {
				dim: e,
				clear: !0
			}), b(r.state);
		});
	}
	return {
		el: s.root,
		update: b,
		destroy() {}
	};
}
// ../../../vision/spectacular/packages/viz/src/views/density.ts
var Ms = Array.from({ length: 256 }, (e, t) => {
	let n = On(Lo(t / 255));
	return [
		n.r,
		n.g,
		n.b
	];
});
function Ns(e) {
	let { view: t, engine: n, alloc: r } = e, i = vs(e, t.height ?? 300), a = r.group, [o, s, c, l, u, d] = n.state.binnings[a], f = Mo().domain([o, o + s * c]).range([0, i.w]), p = Mo().domain([l, l + u * d]).range([i.h, 0]);
	i.g.append("g").attr("transform", `translate(0,${i.h})`).call(N(f).ticks(Math.max(2, i.w / 80))), i.g.append("g").call(P(p).ticks(Math.max(2, i.h / 50))), Ss(i, e.titleOf(t.x), e.titleOf(t.y));
	let m = document.createElement("canvas");
	m.width = c, m.height = d, Object.assign(m.style, {
		width: `${i.w}px`,
		height: `${i.h}px`,
		imageRendering: "pixelated"
	}), i.plot.append(m);
	let h = m.getContext("2d"), g = h.createImageData(c, d), _ = (e) => {
		let t = e.counts[a], n = 0;
		for (let e of t) e > n && (n = e);
		let r = n > 0 ? 255 / Math.log1p(n) : 0;
		for (let e = 0; e < d; e++) {
			let n = (d - 1 - e) * c;
			for (let i = 0; i < c; i++) {
				let a = t[e * c + i], o = (n + i) * 4;
				if (a === 0) {
					g.data[o + 3] = 0;
					continue;
				}
				let [s, l, u] = Ms[Math.min(255, Math.round(Math.log1p(a) * r))];
				g.data[o] = s, g.data[o + 1] = l, g.data[o + 2] = u, g.data[o + 3] = 255;
			}
		}
		h.putImageData(g, 0, 0);
	};
	return _(n.state), {
		el: i.root,
		update: _,
		destroy() {}
	};
}
// ../../../vision/spectacular/packages/viz/src/views/histogram.ts
function Ps(e) {
	let { view: t, engine: n, alloc: r } = e, i = vs(e, t.height ?? 200), a = r.group, [o, s, c] = n.state.binnings[a], l = Mo().domain([o, o + s * c]).range([0, i.w]), u = Mo().range([i.h, 0]);
	i.g.append("g").attr("transform", `translate(0,${i.h})`).call(N(l).ticks(Math.max(2, i.w / 80)));
	let d = i.g.append("g");
	Ss(i, e.titleOf(t.field), "count");
	let f = Math.max(1, i.w / c - +(c < 80)), p = i.g.append("g").attr("clip-path", `url(#${xs(i)})`), m = (e, t) => p.append("g").attr("class", e).selectAll("rect").data(Array.from(t)).join("rect").attr("x", (e, t) => l(o + t * s)).attr("width", f), h = m("sv-context", n.state.baseline[a]), g = m("sv-focus", n.state.counts[a]), _ = (e) => {
		let t = e.counts[a], n = ys(y(t) ?? 0, y(e.baseline[a]) ?? 0);
		u.domain([0, n.max]).nice(), d.call(P(u).ticks(4).tickFormat(co("~s")));
		let r = (e) => Math.max(0, i.h - u(e));
		h.attr("display", n.context ? null : "none").attr("y", (e) => i.h - r(e)).attr("height", r), g.data(Array.from(t)).attr("y", (e) => i.h - r(e)).attr("height", r);
	};
	if (_(n.state), (t.brush ?? "x") === "x") {
		let e = r.dims[t.field], a = ka().extent([[0, 0], [i.w, i.h]]).on("brush end", (t) => {
			let r = t.selection;
			n.filter(r ? {
				dim: e,
				range: [l.invert(r[0]), l.invert(r[1])]
			} : {
				dim: e,
				clear: !0
			});
		});
		i.g.append("g").attr("class", "sv-brush").call(a);
	}
	return {
		el: i.root,
		update: _,
		destroy() {}
	};
}
// ../../../vision/spectacular/packages/viz/src/export.ts
var Fs = "http://www.w3.org/2000/svg", Is = [
	"fill",
	"fill-opacity",
	"stroke",
	"stroke-width",
	"stroke-opacity",
	"stroke-dasharray",
	"font-family",
	"font-size",
	"font-weight",
	"font-style",
	"text-anchor"
], Ls = ["opacity"], Rs = ".overlay, .handle", zs = (e) => e === "transparent" || /^rgba\(.*,\s*0\)$/.test(e);
function Bs(e, t) {
	let n = document.createElementNS(Fs, e);
	for (let [e, r] of Object.entries(t)) n.setAttribute(e, String(r));
	return n;
}
var Vs = (e) => Math.round(e * 100) / 100, Hs;
function Us(e, t) {
	Hs ??= document.createElement("canvas").getContext("2d");
	let n = parseFloat(e.fontSize);
	return Hs ? (Hs.font = `${e.fontStyle} ${e.fontWeight} ${e.fontSize} ${e.fontFamily}`, Hs.measureText(t).fontBoundingBoxAscent || n * .8) : n * .8;
}
function Ws(e) {
	let t = e.cloneNode(!0), n = [e, ...e.querySelectorAll("*")], r = [t, ...t.querySelectorAll("*")], i = [];
	n.forEach((t, n) => {
		let a = r[n], o = getComputedStyle(t);
		if (o.display === "none" || t.matches(Rs)) return i.push(a);
		let s = t === e ? void 0 : getComputedStyle(t.parentElement);
		for (let e of Is) {
			let n = o.getPropertyValue(e);
			(t.hasAttribute(e) || !s || s.getPropertyValue(e) !== n) && a.setAttribute(e, n);
		}
		for (let e of Ls) o.getPropertyValue(e) !== "1" && a.setAttribute(e, o.getPropertyValue(e));
		a.removeAttribute("style");
	});
	for (let e of i) e.remove();
	return t;
}
function Gs(e, t = /* @__PURE__ */ new Map()) {
	let n = e.getBoundingClientRect(), r = Math.ceil(n.width), i = Math.ceil(n.height), a = getComputedStyle(e), o = Bs("svg", {
		xmlns: Fs,
		width: r,
		height: i,
		viewBox: `0 0 ${r} ${i}`,
		color: a.color
	}), s = "";
	for (let t = e; t && !s; t = t.parentElement) {
		let e = getComputedStyle(t).backgroundColor;
		zs(e) || (s = e);
	}
	o.append(Bs("rect", {
		width: r,
		height: i,
		fill: s || "#fff"
	}));
	let c = (e) => ({
		x: Vs(e.left - n.left),
		y: Vs(e.top - n.top),
		width: Vs(e.width),
		height: Vs(e.height)
	}), l = (e, r) => {
		let i = getComputedStyle(e);
		if (i.display === "none" || i.visibility === "hidden") return;
		if (e instanceof SVGSVGElement) {
			let t = Ws(e), n = c(e.getBoundingClientRect());
			t.setAttribute("x", String(n.x)), t.setAttribute("y", String(n.y)), t.setAttribute("overflow", "visible"), r.append(t);
			return;
		}
		let a = c(e.getBoundingClientRect()), o = t.get(e);
		if (o) {
			let e = Bs("g", { transform: `translate(${a.x},${a.y})` });
			e.append(o), r.append(e);
			return;
		}
		if (e instanceof HTMLCanvasElement) {
			let t = Bs("image", {
				...a,
				href: e.toDataURL("image/png"),
				preserveAspectRatio: "none"
			});
			i.imageRendering === "pixelated" && (t.setAttribute("image-rendering", "optimizeSpeed"), t.setAttribute("style", "image-rendering:pixelated")), r.append(t);
			return;
		}
		let s = parseFloat(i.borderTopWidth) || 0;
		(!zs(i.backgroundColor) || s > 0) && r.append(Bs("rect", {
			x: a.x + s / 2,
			y: a.y + s / 2,
			width: a.width - s,
			height: a.height - s,
			rx: parseFloat(i.borderTopLeftRadius) || 0,
			fill: zs(i.backgroundColor) ? "none" : i.backgroundColor,
			stroke: s > 0 ? i.borderTopColor : "none",
			"stroke-width": s
		}));
		for (let t of e.childNodes) if (t instanceof Element) l(t, r);
		else if (t.nodeType === Node.TEXT_NODE && t.textContent.trim()) {
			let e = document.createRange();
			e.selectNodeContents(t);
			let a = e.getClientRects()[0];
			if (!a) continue;
			let o = t.textContent.replace(/\s+/g, " ").trim(), s = Bs("text", {
				x: Vs(a.left - n.left),
				y: Vs(a.top - n.top + Us(i, o)),
				fill: i.color,
				"font-family": i.fontFamily,
				"font-size": i.fontSize,
				"font-weight": i.fontWeight
			});
			s.textContent = o, r.append(s);
		}
	};
	for (let t of e.children) l(t, o);
	return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + new XMLSerializer().serializeToString(o) + "\n";
}
// ../../../vision/spectacular/packages/viz/src/views/scatter.ts
var Ks = `#version 300 es
in float a_x;
in float a_y;
in float a_sel;
in float a_c;
uniform vec2 u_scale;
uniform vec2 u_offset;
uniform float u_pass;
uniform float u_size;
uniform float u_alpha;
uniform float u_dimAlpha;
uniform float u_selScale;
out vec4 v_color;
${As}
void main() {
  bool sel = a_sel > 0.5;
  if ((u_pass > 0.5) != sel) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
  gl_Position = vec4(a_x * u_scale.x + u_offset.x, a_y * u_scale.y + u_offset.y, 0.0, 1.0);
  gl_PointSize = sel ? u_size * u_selScale : max(1.0, u_size - 1.0);
  v_color = sel ? vec4(pointColor(a_c), u_alpha) : vec4(0.55, 0.55, 0.6, u_dimAlpha);
}`, qs = "#version 300 es\nprecision mediump float;\nin vec4 v_color;\nout vec4 color;\nvoid main() {\n  vec2 d = gl_PointCoord - 0.5;\n  if (dot(d, d) > 0.25) discard;\n  color = vec4(v_color.rgb * v_color.a, v_color.a);\n}";
function Js(e, t, n) {
	let r = (t, n) => {
		let r = e.createShader(t);
		if (e.shaderSource(r, n), e.compileShader(r), !e.getShaderParameter(r, e.COMPILE_STATUS)) throw Error(e.getShaderInfoLog(r) ?? "shader");
		return r;
	}, i = e.createProgram();
	if (e.attachShader(i, r(e.VERTEX_SHADER, t)), e.attachShader(i, r(e.FRAGMENT_SHADER, n)), e.linkProgram(i), !e.getProgramParameter(i, e.LINK_STATUS)) throw Error(e.getProgramInfoLog(i) ?? "link");
	return i;
}
function Ys(e) {
	let { view: t, table: n, engine: r, alloc: i } = e, a = vs(e, t.height ?? 320), o = Cs(n, t.x), s = Cs(n, t.y), c = Mo().domain(o.extent).range([0, a.w]).nice(), l = Mo().domain(s.extent).range([a.h, 0]).nice();
	a.g.append("g").attr("transform", `translate(0,${a.h})`).call(N(c).ticks(Math.max(2, a.w / 80))), a.g.append("g").call(P(l).ticks(Math.max(2, a.h / 50))), Ss(a, e.titleOf(t.x), e.titleOf(t.y));
	let u = document.createElement("canvas"), d = window.devicePixelRatio || 1;
	u.width = Math.round(a.w * d), u.height = Math.round(a.h * d), u.style.width = `${a.w}px`, u.style.height = `${a.h}px`, a.plot.append(u);
	let f = u.getContext("webgl2", {
		premultipliedAlpha: !0,
		antialias: !1,
		preserveDrawingBuffer: !0
	});
	if (!f) throw Error("WebGL2 is not available");
	let p = Js(f, Ks, qs);
	f.useProgram(p);
	let m = f.createVertexArray();
	f.bindVertexArray(m);
	let h = (e, t, n, r = !1) => {
		let i = f.createBuffer();
		f.bindBuffer(f.ARRAY_BUFFER, i), f.bufferData(f.ARRAY_BUFFER, t, f.STATIC_DRAW);
		let a = f.getAttribLocation(p, e);
		return f.enableVertexAttribArray(a), f.vertexAttribPointer(a, 1, n, r, 0, 0), i;
	}, g = ks(o.values, o.extent), _ = ks(s.values, s.extent);
	h("a_x", g.data, f.FLOAT), h("a_y", _.data, f.FLOAT);
	let v = Os(n, t.color);
	h("a_c", v.data, f.FLOAT);
	let y = h("a_sel", r.state.mask, f.UNSIGNED_BYTE), [b, x] = c.domain(), [S, C] = l.domain(), w = 2 / (x - b), T = 2 / (C - S), E = (e) => f.getUniformLocation(p, e);
	f.uniform2f(E("u_scale"), w, T), f.uniform2f(E("u_offset"), (g.centre - b) * w - 1, (_.centre - S) * T - 1);
	let D = t.pointSize ?? (n.rows > 2e5 ? 2 : 4);
	f.uniform1f(E("u_size"), D * d), f.uniform1i(E("u_colorMode"), v.mode), f.uniform3fv(E("u_palette"), _s.flatMap(Ds)), f.uniform3fv(E("u_base"), Ds(_s[0])), f.enable(f.BLEND), f.blendFunc(f.ONE, f.ONE_MINUS_SRC_ALPHA);
	let O = (e) => {
		f.bindBuffer(f.ARRAY_BUFFER, y), f.bufferSubData(f.ARRAY_BUFFER, 0, e.mask), f.viewport(0, 0, u.width, u.height), f.clearColor(0, 0, 0, 0), f.clear(f.COLOR_BUFFER_BIT), f.uniform1f(E("u_alpha"), Ts(e.selectedCount)), f.uniform1f(E("u_dimAlpha"), Math.min(.15, Ts(e.rows))), f.uniform1f(E("u_selScale"), Es(e.selectedCount, e.rows));
		for (let e of [0, 1]) f.uniform1f(E("u_pass"), e), f.drawArrays(f.POINTS, 0, n.rows);
	};
	if (O(r.state), (t.brush ?? "xy") === "xy") {
		let e = i.dims[t.x], n = i.dims[t.y], o = Aa().extent([[0, 0], [a.w, a.h]]).on("brush end", (t) => {
			let i = t.selection;
			i ? (r.filter({
				dim: e,
				range: [c.invert(i[0][0]), c.invert(i[1][0])]
			}), r.filter({
				dim: n,
				range: [l.invert(i[1][1]), l.invert(i[0][1])]
			})) : (r.filter({
				dim: e,
				clear: !0
			}), r.filter({
				dim: n,
				clear: !0
			}));
		});
		a.g.append("g").attr("class", "sv-brush").call(o);
	}
	return {
		el: a.root,
		update: O,
		vector: () => {
			if (n.rows > 5e4) return;
			let e = r.state, t = document.createElementNS(Fs, "g"), i = [{
				sel: 0,
				r: Math.max(1, D * d - 1) / d / 2,
				alpha: Math.min(.15, Ts(e.rows)),
				fill: () => "rgb(140,140,153)"
			}, {
				sel: 1,
				r: D * Es(e.selectedCount, e.rows) / 2,
				alpha: Ts(e.selectedCount),
				fill: (e) => v.mode === 1 ? _s[v.data[e]] : v.mode === 2 ? Io(v.data[e]) : _s[0]
			}];
			for (let r of i) {
				let i = /* @__PURE__ */ new Map();
				for (let a = 0; a < n.rows; a++) {
					let n = o.values[a], u = s.values[a];
					if (e.mask[a] !== r.sel || Number.isNaN(n) || Number.isNaN(u)) continue;
					let d = r.fill(a), f = i.get(d);
					f || (f = document.createElementNS(Fs, "g"), f.setAttribute("fill", d), f.setAttribute("fill-opacity", r.alpha.toFixed(3)), i.set(d, f), t.append(f));
					let p = document.createElementNS(Fs, "circle");
					p.setAttribute("cx", c(n).toFixed(2)), p.setAttribute("cy", l(u).toFixed(2)), p.setAttribute("r", r.r.toFixed(2)), f.append(p);
				}
			}
			return {
				plot: a.plot,
				content: t
			};
		},
		destroy: () => f.getExtension("WEBGL_lose_context")?.loseContext()
	};
}
var Xs = {
	LEFT: 0,
	MIDDLE: 1,
	RIGHT: 2,
	ROTATE: 0,
	DOLLY: 1,
	PAN: 2
}, Zs = {
	ROTATE: 0,
	PAN: 1,
	DOLLY_PAN: 2,
	DOLLY_ROTATE: 3
}, Qs = 1e3, $s = 1001, ec = 1002, tc = 1003, nc = 1004, rc = 1005, ic = 1006, ac = 1007, oc = 1008, sc = 1009, cc = 1010, lc = 1011, uc = 1012, dc = 1013, fc = 1014, pc = 1015, mc = 1016, hc = 1017, gc = 1018, _c = 1020, vc = 35902, yc = 35899, bc = 1021, xc = 1022, Sc = 1023, Cc = 1026, wc = 1027, Tc = 1028, Ec = 1029, Dc = 1030, Oc = 1031, kc = 1033, Ac = 33776, jc = 33777, Mc = 33778, Nc = 33779, Pc = 35840, Fc = 35841, Ic = 35842, Lc = 35843, Rc = 36196, zc = 37492, Bc = 37496, Vc = 37488, Hc = 37489, Uc = 37490, Wc = 37491, Gc = 37808, Kc = 37809, qc = 37810, Jc = 37811, Yc = 37812, Xc = 37813, Zc = 37814, Qc = 37815, $c = 37816, el = 37817, tl = 37818, nl = 37819, rl = 37820, il = 37821, al = 36492, ol = 36494, sl = 36495, cl = 36283, ll = 36284, ul = 36285, dl = 36286, fl = 2300, pl = 2301, ml = 2302, hl = 2303, gl = 2400, _l = 2401, vl = 2402, yl = 3200, bl = "srgb", xl = "srgb-linear", Sl = "linear", Cl = "srgb", wl = 7680, Tl = 35044, El = 35048, Dl = "300 es", Ol = 2e3;
function kl(e) {
	for (let t = e.length - 1; t >= 0; --t) if (e[t] >= 65535) return !0;
	return !1;
}
function Al(e) {
	return ArrayBuffer.isView(e) && !(e instanceof DataView);
}
function jl(e) {
	return document.createElementNS("http://www.w3.org/1999/xhtml", e);
}
function Ml() {
	let e = jl("canvas");
	return e.style.display = "block", e;
}
var Nl = {};
function Pl(...e) {
	let t = "THREE." + e.shift();
	console.log(t, ...e);
}
function Fl(e) {
	let t = e[0];
	if (typeof t == "string" && t.startsWith("TSL:")) {
		let t = e[1];
		t && t.isStackTrace ? e[0] += " " + t.getLocation() : e[1] = "Stack trace not available. Enable \"THREE.Node.captureStackTrace\" to capture stack traces.";
	}
	return e;
}
function U(...e) {
	e = Fl(e);
	let t = "THREE." + e.shift();
	{
		let n = e[0];
		n && n.isStackTrace ? console.warn(n.getError(t)) : console.warn(t, ...e);
	}
}
function W(...e) {
	e = Fl(e);
	let t = "THREE." + e.shift();
	{
		let n = e[0];
		n && n.isStackTrace ? console.error(n.getError(t)) : console.error(t, ...e);
	}
}
function Il(...e) {
	let t = e.join(" ");
	t in Nl || (Nl[t] = !0, U(...e));
}
function Ll(e, t, n) {
	return new Promise(function(r, i) {
		function a() {
			switch (e.clientWaitSync(t, e.SYNC_FLUSH_COMMANDS_BIT, 0)) {
				case e.WAIT_FAILED:
					i();
					break;
				case e.TIMEOUT_EXPIRED:
					setTimeout(a, n);
					break;
				default: r();
			}
		}
		setTimeout(a, n);
	});
}
var Rl = {
	0: 1,
	2: 6,
	4: 7,
	3: 5,
	1: 0,
	6: 2,
	7: 4,
	5: 3
}, zl = class {
	addEventListener(e, t) {
		this._listeners === void 0 && (this._listeners = {});
		let n = this._listeners;
		n[e] === void 0 && (n[e] = []), n[e].indexOf(t) === -1 && n[e].push(t);
	}
	hasEventListener(e, t) {
		let n = this._listeners;
		return n !== void 0 && n[e] !== void 0 && n[e].indexOf(t) !== -1;
	}
	removeEventListener(e, t) {
		let n = this._listeners;
		if (n === void 0) return;
		let r = n[e];
		if (r !== void 0) {
			let e = r.indexOf(t);
			e !== -1 && r.splice(e, 1);
		}
	}
	dispatchEvent(e) {
		let t = this._listeners;
		if (t === void 0) return;
		let n = t[e.type];
		if (n !== void 0) {
			e.target = this;
			let t = n.slice(0);
			for (let n = 0, r = t.length; n < r; n++) t[n].call(this, e);
			e.target = null;
		}
	}
}, Bl = /* @__PURE__ */ "00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff".split("."), Vl = 1234567, Hl = Math.PI / 180, Ul = 180 / Math.PI;
function Wl() {
	let e = Math.random() * 4294967295 | 0, t = Math.random() * 4294967295 | 0, n = Math.random() * 4294967295 | 0, r = Math.random() * 4294967295 | 0;
	return (Bl[e & 255] + Bl[e >> 8 & 255] + Bl[e >> 16 & 255] + Bl[e >> 24 & 255] + "-" + Bl[t & 255] + Bl[t >> 8 & 255] + "-" + Bl[t >> 16 & 15 | 64] + Bl[t >> 24 & 255] + "-" + Bl[n & 63 | 128] + Bl[n >> 8 & 255] + "-" + Bl[n >> 16 & 255] + Bl[n >> 24 & 255] + Bl[r & 255] + Bl[r >> 8 & 255] + Bl[r >> 16 & 255] + Bl[r >> 24 & 255]).toLowerCase();
}
function G(e, t, n) {
	return Math.max(t, Math.min(n, e));
}
function Gl(e, t) {
	return (e % t + t) % t;
}
function Kl(e, t, n, r, i) {
	return r + (e - t) * (i - r) / (n - t);
}
function ql(e, t, n) {
	return e === t ? 0 : (n - e) / (t - e);
}
function Jl(e, t, n) {
	return (1 - n) * e + n * t;
}
function Yl(e, t, n, r) {
	return Jl(e, t, 1 - Math.exp(-n * r));
}
function Xl(e, t = 1) {
	return t - Math.abs(Gl(e, t * 2) - t);
}
function Zl(e, t, n) {
	return e <= t ? 0 : e >= n ? 1 : (e = (e - t) / (n - t), e * e * (3 - 2 * e));
}
function Ql(e, t, n) {
	return e <= t ? 0 : e >= n ? 1 : (e = (e - t) / (n - t), e * e * e * (e * (e * 6 - 15) + 10));
}
function $l(e, t) {
	return e + Math.floor(Math.random() * (t - e + 1));
}
function eu(e, t) {
	return e + Math.random() * (t - e);
}
function tu(e) {
	return e * (.5 - Math.random());
}
function nu(e) {
	e !== void 0 && (Vl = e);
	let t = Vl += 1831565813;
	return t = Math.imul(t ^ t >>> 15, t | 1), t ^= t + Math.imul(t ^ t >>> 7, t | 61), ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function ru(e) {
	return e * Hl;
}
function iu(e) {
	return e * Ul;
}
function au(e) {
	return e > 0 && Number.isInteger(e) && 2 ** Math.round(Math.log2(e)) === e;
}
function ou(e) {
	return 2 ** Math.ceil(Math.log(e) / Math.LN2);
}
function su(e) {
	return 2 ** Math.floor(Math.log(e) / Math.LN2);
}
function cu(e, t, n, r, i) {
	let a = Math.cos, o = Math.sin, s = a(n / 2), c = o(n / 2), l = a((t + r) / 2), u = o((t + r) / 2), d = a((t - r) / 2), f = o((t - r) / 2), p = a((r - t) / 2), m = o((r - t) / 2);
	switch (i) {
		case "XYX":
			e.set(s * u, c * d, c * f, s * l);
			break;
		case "YZY":
			e.set(c * f, s * u, c * d, s * l);
			break;
		case "ZXZ":
			e.set(c * d, c * f, s * u, s * l);
			break;
		case "XZX":
			e.set(s * u, c * m, c * p, s * l);
			break;
		case "YXY":
			e.set(c * p, s * u, c * m, s * l);
			break;
		case "ZYZ":
			e.set(c * m, c * p, s * u, s * l);
			break;
		default: U("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: " + i);
	}
}
function lu(e, t) {
	switch (t.constructor) {
		case Float32Array: return e;
		case Uint32Array: return e / 4294967295;
		case Uint16Array: return e / 65535;
		case Uint8Array:
		case Uint8ClampedArray: return e / 255;
		case Int32Array: return Math.max(e / 2147483647, -1);
		case Int16Array: return Math.max(e / 32767, -1);
		case Int8Array: return Math.max(e / 127, -1);
		default: throw Error("THREE.MathUtils: Invalid component type.");
	}
}
function uu(e, t) {
	switch (t.constructor) {
		case Float32Array: return e;
		case Uint32Array: return Math.round(e * 4294967295);
		case Uint16Array: return Math.round(e * 65535);
		case Uint8Array:
		case Uint8ClampedArray: return Math.round(e * 255);
		case Int32Array: return Math.round(e * 2147483647);
		case Int16Array: return Math.round(e * 32767);
		case Int8Array: return Math.round(e * 127);
		default: throw Error("THREE.MathUtils: Invalid component type.");
	}
}
var du = {
	DEG2RAD: Hl,
	RAD2DEG: Ul,
	generateUUID: Wl,
	clamp: G,
	euclideanModulo: Gl,
	mapLinear: Kl,
	inverseLerp: ql,
	lerp: Jl,
	damp: Yl,
	pingpong: Xl,
	smoothstep: Zl,
	smootherstep: Ql,
	randInt: $l,
	randFloat: eu,
	randFloatSpread: tu,
	seededRandom: nu,
	degToRad: ru,
	radToDeg: iu,
	isPowerOfTwo: au,
	ceilPowerOfTwo: ou,
	floorPowerOfTwo: su,
	setQuaternionFromProperEuler: cu,
	normalize: uu,
	denormalize: lu
}, K = class e {
	static {
		e.prototype.isVector2 = !0;
	}
	constructor(e = 0, t = 0) {
		this.x = e, this.y = t;
	}
	get width() {
		return this.x;
	}
	set width(e) {
		this.x = e;
	}
	get height() {
		return this.y;
	}
	set height(e) {
		this.y = e;
	}
	set(e, t) {
		return this.x = e, this.y = t, this;
	}
	setScalar(e) {
		return this.x = e, this.y = e, this;
	}
	setX(e) {
		return this.x = e, this;
	}
	setY(e) {
		return this.y = e, this;
	}
	setComponent(e, t) {
		switch (e) {
			case 0:
				this.x = t;
				break;
			case 1:
				this.y = t;
				break;
			default: throw Error("THREE.Vector2: index is out of range: " + e);
		}
		return this;
	}
	getComponent(e) {
		switch (e) {
			case 0: return this.x;
			case 1: return this.y;
			default: throw Error("THREE.Vector2: index is out of range: " + e);
		}
	}
	clone() {
		return new this.constructor(this.x, this.y);
	}
	copy(e) {
		return this.x = e.x, this.y = e.y, this;
	}
	add(e) {
		return this.x += e.x, this.y += e.y, this;
	}
	addScalar(e) {
		return this.x += e, this.y += e, this;
	}
	addVectors(e, t) {
		return this.x = e.x + t.x, this.y = e.y + t.y, this;
	}
	addScaledVector(e, t) {
		return this.x += e.x * t, this.y += e.y * t, this;
	}
	sub(e) {
		return this.x -= e.x, this.y -= e.y, this;
	}
	subScalar(e) {
		return this.x -= e, this.y -= e, this;
	}
	subVectors(e, t) {
		return this.x = e.x - t.x, this.y = e.y - t.y, this;
	}
	multiply(e) {
		return this.x *= e.x, this.y *= e.y, this;
	}
	multiplyScalar(e) {
		return this.x *= e, this.y *= e, this;
	}
	divide(e) {
		return this.x /= e.x, this.y /= e.y, this;
	}
	divideScalar(e) {
		return this.multiplyScalar(1 / e);
	}
	applyMatrix3(e) {
		let t = this.x, n = this.y, r = e.elements;
		return this.x = r[0] * t + r[3] * n + r[6], this.y = r[1] * t + r[4] * n + r[7], this;
	}
	min(e) {
		return this.x = Math.min(this.x, e.x), this.y = Math.min(this.y, e.y), this;
	}
	max(e) {
		return this.x = Math.max(this.x, e.x), this.y = Math.max(this.y, e.y), this;
	}
	clamp(e, t) {
		return this.x = G(this.x, e.x, t.x), this.y = G(this.y, e.y, t.y), this;
	}
	clampScalar(e, t) {
		return this.x = G(this.x, e, t), this.y = G(this.y, e, t), this;
	}
	clampLength(e, t) {
		let n = this.length();
		return this.divideScalar(n || 1).multiplyScalar(G(n, e, t));
	}
	floor() {
		return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this;
	}
	ceil() {
		return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this;
	}
	round() {
		return this.x = Math.round(this.x), this.y = Math.round(this.y), this;
	}
	roundToZero() {
		return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this;
	}
	negate() {
		return this.x = -this.x, this.y = -this.y, this;
	}
	dot(e) {
		return this.x * e.x + this.y * e.y;
	}
	cross(e) {
		return this.x * e.y - this.y * e.x;
	}
	lengthSq() {
		return this.x * this.x + this.y * this.y;
	}
	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
	manhattanLength() {
		return Math.abs(this.x) + Math.abs(this.y);
	}
	normalize() {
		return this.divideScalar(this.length() || 1);
	}
	angle() {
		return Math.atan2(-this.y, -this.x) + Math.PI;
	}
	angleTo(e) {
		let t = Math.sqrt(this.lengthSq() * e.lengthSq());
		if (t === 0) return Math.PI / 2;
		let n = this.dot(e) / t;
		return Math.acos(G(n, -1, 1));
	}
	distanceTo(e) {
		return Math.sqrt(this.distanceToSquared(e));
	}
	distanceToSquared(e) {
		let t = this.x - e.x, n = this.y - e.y;
		return t * t + n * n;
	}
	manhattanDistanceTo(e) {
		return Math.abs(this.x - e.x) + Math.abs(this.y - e.y);
	}
	setLength(e) {
		return this.normalize().multiplyScalar(e);
	}
	lerp(e, t) {
		return this.x += (e.x - this.x) * t, this.y += (e.y - this.y) * t, this;
	}
	lerpVectors(e, t, n) {
		return this.x = e.x + (t.x - e.x) * n, this.y = e.y + (t.y - e.y) * n, this;
	}
	equals(e) {
		return e.x === this.x && e.y === this.y;
	}
	fromArray(e, t = 0) {
		return this.x = e[t], this.y = e[t + 1], this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this.x, e[t + 1] = this.y, e;
	}
	fromBufferAttribute(e, t) {
		return this.x = e.getX(t), this.y = e.getY(t), this;
	}
	rotateAround(e, t) {
		let n = Math.cos(t), r = Math.sin(t), i = this.x - e.x, a = this.y - e.y;
		return this.x = i * n - a * r + e.x, this.y = i * r + a * n + e.y, this;
	}
	random() {
		return this.x = Math.random(), this.y = Math.random(), this;
	}
	*[Symbol.iterator]() {
		yield this.x, yield this.y;
	}
}, fu = class {
	constructor(e = 0, t = 0, n = 0, r = 1) {
		this.isQuaternion = !0, this._x = e, this._y = t, this._z = n, this._w = r;
	}
	static slerpFlat(e, t, n, r, i, a, o) {
		let s = n[r + 0], c = n[r + 1], l = n[r + 2], u = n[r + 3], d = i[a + 0], f = i[a + 1], p = i[a + 2], m = i[a + 3];
		if (u !== m || s !== d || c !== f || l !== p) {
			let e = s * d + c * f + l * p + u * m;
			e < 0 && (d = -d, f = -f, p = -p, m = -m, e = -e);
			let t = 1 - o;
			if (e < .9995) {
				let n = Math.acos(e), r = Math.sin(n);
				t = Math.sin(t * n) / r, o = Math.sin(o * n) / r, s = s * t + d * o, c = c * t + f * o, l = l * t + p * o, u = u * t + m * o;
			} else {
				s = s * t + d * o, c = c * t + f * o, l = l * t + p * o, u = u * t + m * o;
				let e = 1 / Math.sqrt(s * s + c * c + l * l + u * u);
				s *= e, c *= e, l *= e, u *= e;
			}
		}
		e[t] = s, e[t + 1] = c, e[t + 2] = l, e[t + 3] = u;
	}
	static multiplyQuaternionsFlat(e, t, n, r, i, a) {
		let o = n[r], s = n[r + 1], c = n[r + 2], l = n[r + 3], u = i[a], d = i[a + 1], f = i[a + 2], p = i[a + 3];
		return e[t] = o * p + l * u + s * f - c * d, e[t + 1] = s * p + l * d + c * u - o * f, e[t + 2] = c * p + l * f + o * d - s * u, e[t + 3] = l * p - o * u - s * d - c * f, e;
	}
	get x() {
		return this._x;
	}
	set x(e) {
		this._x = e, this._onChangeCallback();
	}
	get y() {
		return this._y;
	}
	set y(e) {
		this._y = e, this._onChangeCallback();
	}
	get z() {
		return this._z;
	}
	set z(e) {
		this._z = e, this._onChangeCallback();
	}
	get w() {
		return this._w;
	}
	set w(e) {
		this._w = e, this._onChangeCallback();
	}
	set(e, t, n, r) {
		return this._x = e, this._y = t, this._z = n, this._w = r, this._onChangeCallback(), this;
	}
	clone() {
		return new this.constructor(this._x, this._y, this._z, this._w);
	}
	copy(e) {
		return this._x = e.x, this._y = e.y, this._z = e.z, this._w = e.w, this._onChangeCallback(), this;
	}
	setFromEuler(e, t = !0) {
		let n = e._x, r = e._y, i = e._z, a = e._order, o = Math.cos, s = Math.sin, c = o(n / 2), l = o(r / 2), u = o(i / 2), d = s(n / 2), f = s(r / 2), p = s(i / 2);
		switch (a) {
			case "XYZ":
				this._x = d * l * u + c * f * p, this._y = c * f * u - d * l * p, this._z = c * l * p + d * f * u, this._w = c * l * u - d * f * p;
				break;
			case "YXZ":
				this._x = d * l * u + c * f * p, this._y = c * f * u - d * l * p, this._z = c * l * p - d * f * u, this._w = c * l * u + d * f * p;
				break;
			case "ZXY":
				this._x = d * l * u - c * f * p, this._y = c * f * u + d * l * p, this._z = c * l * p + d * f * u, this._w = c * l * u - d * f * p;
				break;
			case "ZYX":
				this._x = d * l * u - c * f * p, this._y = c * f * u + d * l * p, this._z = c * l * p - d * f * u, this._w = c * l * u + d * f * p;
				break;
			case "YZX":
				this._x = d * l * u + c * f * p, this._y = c * f * u + d * l * p, this._z = c * l * p - d * f * u, this._w = c * l * u - d * f * p;
				break;
			case "XZY":
				this._x = d * l * u - c * f * p, this._y = c * f * u - d * l * p, this._z = c * l * p + d * f * u, this._w = c * l * u + d * f * p;
				break;
			default: U("Quaternion: .setFromEuler() encountered an unknown order: " + a);
		}
		return t === !0 && this._onChangeCallback(), this;
	}
	setFromAxisAngle(e, t) {
		let n = t / 2, r = Math.sin(n);
		return this._x = e.x * r, this._y = e.y * r, this._z = e.z * r, this._w = Math.cos(n), this._onChangeCallback(), this;
	}
	setFromRotationMatrix(e) {
		let t = e.elements, n = t[0], r = t[4], i = t[8], a = t[1], o = t[5], s = t[9], c = t[2], l = t[6], u = t[10], d = n + o + u;
		if (d > 0) {
			let e = .5 / Math.sqrt(d + 1);
			this._w = .25 / e, this._x = (l - s) * e, this._y = (i - c) * e, this._z = (a - r) * e;
		} else if (n > o && n > u) {
			let e = 2 * Math.sqrt(1 + n - o - u);
			this._w = (l - s) / e, this._x = .25 * e, this._y = (r + a) / e, this._z = (i + c) / e;
		} else if (o > u) {
			let e = 2 * Math.sqrt(1 + o - n - u);
			this._w = (i - c) / e, this._x = (r + a) / e, this._y = .25 * e, this._z = (s + l) / e;
		} else {
			let e = 2 * Math.sqrt(1 + u - n - o);
			this._w = (a - r) / e, this._x = (i + c) / e, this._y = (s + l) / e, this._z = .25 * e;
		}
		return this._onChangeCallback(), this;
	}
	setFromUnitVectors(e, t) {
		let n = e.dot(t) + 1;
		return n < 1e-8 ? (n = 0, Math.abs(e.x) > Math.abs(e.z) ? (this._x = -e.y, this._y = e.x, this._z = 0, this._w = n) : (this._x = 0, this._y = -e.z, this._z = e.y, this._w = n)) : (this._x = e.y * t.z - e.z * t.y, this._y = e.z * t.x - e.x * t.z, this._z = e.x * t.y - e.y * t.x, this._w = n), this.normalize();
	}
	angleTo(e) {
		return 2 * Math.acos(Math.abs(G(this.dot(e), -1, 1)));
	}
	rotateTowards(e, t) {
		let n = this.angleTo(e);
		if (n === 0) return this;
		let r = Math.min(1, t / n);
		return this.slerp(e, r), this;
	}
	identity() {
		return this.set(0, 0, 0, 1);
	}
	invert() {
		return this.conjugate();
	}
	conjugate() {
		return this._x *= -1, this._y *= -1, this._z *= -1, this._onChangeCallback(), this;
	}
	dot(e) {
		return this._x * e._x + this._y * e._y + this._z * e._z + this._w * e._w;
	}
	lengthSq() {
		return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;
	}
	length() {
		return Math.sqrt(this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w);
	}
	normalize() {
		let e = this.length();
		return e === 0 ? (this._x = 0, this._y = 0, this._z = 0, this._w = 1) : (e = 1 / e, this._x *= e, this._y *= e, this._z *= e, this._w *= e), this._onChangeCallback(), this;
	}
	multiply(e) {
		return this.multiplyQuaternions(this, e);
	}
	premultiply(e) {
		return this.multiplyQuaternions(e, this);
	}
	multiplyQuaternions(e, t) {
		let n = e._x, r = e._y, i = e._z, a = e._w, o = t._x, s = t._y, c = t._z, l = t._w;
		return this._x = n * l + a * o + r * c - i * s, this._y = r * l + a * s + i * o - n * c, this._z = i * l + a * c + n * s - r * o, this._w = a * l - n * o - r * s - i * c, this._onChangeCallback(), this;
	}
	slerp(e, t) {
		let n = e._x, r = e._y, i = e._z, a = e._w, o = this.dot(e);
		o < 0 && (n = -n, r = -r, i = -i, a = -a, o = -o);
		let s = 1 - t;
		if (o < .9995) {
			let e = Math.acos(o), c = Math.sin(e);
			s = Math.sin(s * e) / c, t = Math.sin(t * e) / c, this._x = this._x * s + n * t, this._y = this._y * s + r * t, this._z = this._z * s + i * t, this._w = this._w * s + a * t, this._onChangeCallback();
		} else this._x = this._x * s + n * t, this._y = this._y * s + r * t, this._z = this._z * s + i * t, this._w = this._w * s + a * t, this.normalize();
		return this;
	}
	slerpQuaternions(e, t, n) {
		return this.copy(e).slerp(t, n);
	}
	random() {
		let e = 2 * Math.PI * Math.random(), t = 2 * Math.PI * Math.random(), n = Math.random(), r = Math.sqrt(1 - n), i = Math.sqrt(n);
		return this.set(r * Math.sin(e), r * Math.cos(e), i * Math.sin(t), i * Math.cos(t));
	}
	equals(e) {
		return e._x === this._x && e._y === this._y && e._z === this._z && e._w === this._w;
	}
	fromArray(e, t = 0) {
		return this._x = e[t], this._y = e[t + 1], this._z = e[t + 2], this._w = e[t + 3], this._onChangeCallback(), this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this._x, e[t + 1] = this._y, e[t + 2] = this._z, e[t + 3] = this._w, e;
	}
	fromBufferAttribute(e, t) {
		return this._x = e.getX(t), this._y = e.getY(t), this._z = e.getZ(t), this._w = e.getW(t), this._onChangeCallback(), this;
	}
	toJSON() {
		return this.toArray();
	}
	_onChange(e) {
		return this._onChangeCallback = e, this;
	}
	_onChangeCallback() {}
	*[Symbol.iterator]() {
		yield this._x, yield this._y, yield this._z, yield this._w;
	}
}, q = class e {
	static {
		e.prototype.isVector3 = !0;
	}
	constructor(e = 0, t = 0, n = 0) {
		this.x = e, this.y = t, this.z = n;
	}
	set(e, t, n) {
		return n === void 0 && (n = this.z), this.x = e, this.y = t, this.z = n, this;
	}
	setScalar(e) {
		return this.x = e, this.y = e, this.z = e, this;
	}
	setX(e) {
		return this.x = e, this;
	}
	setY(e) {
		return this.y = e, this;
	}
	setZ(e) {
		return this.z = e, this;
	}
	setComponent(e, t) {
		switch (e) {
			case 0:
				this.x = t;
				break;
			case 1:
				this.y = t;
				break;
			case 2:
				this.z = t;
				break;
			default: throw Error("THREE.Vector3: index is out of range: " + e);
		}
		return this;
	}
	getComponent(e) {
		switch (e) {
			case 0: return this.x;
			case 1: return this.y;
			case 2: return this.z;
			default: throw Error("THREE.Vector3: index is out of range: " + e);
		}
	}
	clone() {
		return new this.constructor(this.x, this.y, this.z);
	}
	copy(e) {
		return this.x = e.x, this.y = e.y, this.z = e.z, this;
	}
	add(e) {
		return this.x += e.x, this.y += e.y, this.z += e.z, this;
	}
	addScalar(e) {
		return this.x += e, this.y += e, this.z += e, this;
	}
	addVectors(e, t) {
		return this.x = e.x + t.x, this.y = e.y + t.y, this.z = e.z + t.z, this;
	}
	addScaledVector(e, t) {
		return this.x += e.x * t, this.y += e.y * t, this.z += e.z * t, this;
	}
	sub(e) {
		return this.x -= e.x, this.y -= e.y, this.z -= e.z, this;
	}
	subScalar(e) {
		return this.x -= e, this.y -= e, this.z -= e, this;
	}
	subVectors(e, t) {
		return this.x = e.x - t.x, this.y = e.y - t.y, this.z = e.z - t.z, this;
	}
	multiply(e) {
		return this.x *= e.x, this.y *= e.y, this.z *= e.z, this;
	}
	multiplyScalar(e) {
		return this.x *= e, this.y *= e, this.z *= e, this;
	}
	multiplyVectors(e, t) {
		return this.x = e.x * t.x, this.y = e.y * t.y, this.z = e.z * t.z, this;
	}
	applyEuler(e) {
		return this.applyQuaternion(mu.setFromEuler(e));
	}
	applyAxisAngle(e, t) {
		return this.applyQuaternion(mu.setFromAxisAngle(e, t));
	}
	applyMatrix3(e) {
		let t = this.x, n = this.y, r = this.z, i = e.elements;
		return this.x = i[0] * t + i[3] * n + i[6] * r, this.y = i[1] * t + i[4] * n + i[7] * r, this.z = i[2] * t + i[5] * n + i[8] * r, this;
	}
	applyNormalMatrix(e) {
		return this.applyMatrix3(e).normalize();
	}
	applyMatrix4(e) {
		let t = this.x, n = this.y, r = this.z, i = e.elements, a = 1 / (i[3] * t + i[7] * n + i[11] * r + i[15]);
		return this.x = (i[0] * t + i[4] * n + i[8] * r + i[12]) * a, this.y = (i[1] * t + i[5] * n + i[9] * r + i[13]) * a, this.z = (i[2] * t + i[6] * n + i[10] * r + i[14]) * a, this;
	}
	applyQuaternion(e) {
		let t = this.x, n = this.y, r = this.z, i = e.x, a = e.y, o = e.z, s = e.w, c = 2 * (a * r - o * n), l = 2 * (o * t - i * r), u = 2 * (i * n - a * t);
		return this.x = t + s * c + a * u - o * l, this.y = n + s * l + o * c - i * u, this.z = r + s * u + i * l - a * c, this;
	}
	project(e) {
		return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix);
	}
	unproject(e) {
		return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld);
	}
	transformDirection(e) {
		let t = this.x, n = this.y, r = this.z, i = e.elements;
		return this.x = i[0] * t + i[4] * n + i[8] * r, this.y = i[1] * t + i[5] * n + i[9] * r, this.z = i[2] * t + i[6] * n + i[10] * r, this.normalize();
	}
	divide(e) {
		return this.x /= e.x, this.y /= e.y, this.z /= e.z, this;
	}
	divideScalar(e) {
		return this.multiplyScalar(1 / e);
	}
	min(e) {
		return this.x = Math.min(this.x, e.x), this.y = Math.min(this.y, e.y), this.z = Math.min(this.z, e.z), this;
	}
	max(e) {
		return this.x = Math.max(this.x, e.x), this.y = Math.max(this.y, e.y), this.z = Math.max(this.z, e.z), this;
	}
	clamp(e, t) {
		return this.x = G(this.x, e.x, t.x), this.y = G(this.y, e.y, t.y), this.z = G(this.z, e.z, t.z), this;
	}
	clampScalar(e, t) {
		return this.x = G(this.x, e, t), this.y = G(this.y, e, t), this.z = G(this.z, e, t), this;
	}
	clampLength(e, t) {
		let n = this.length();
		return this.divideScalar(n || 1).multiplyScalar(G(n, e, t));
	}
	floor() {
		return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this.z = Math.floor(this.z), this;
	}
	ceil() {
		return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this.z = Math.ceil(this.z), this;
	}
	round() {
		return this.x = Math.round(this.x), this.y = Math.round(this.y), this.z = Math.round(this.z), this;
	}
	roundToZero() {
		return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this.z = Math.trunc(this.z), this;
	}
	negate() {
		return this.x = -this.x, this.y = -this.y, this.z = -this.z, this;
	}
	dot(e) {
		return this.x * e.x + this.y * e.y + this.z * e.z;
	}
	lengthSq() {
		return this.x * this.x + this.y * this.y + this.z * this.z;
	}
	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}
	manhattanLength() {
		return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z);
	}
	normalize() {
		return this.divideScalar(this.length() || 1);
	}
	setLength(e) {
		return this.normalize().multiplyScalar(e);
	}
	lerp(e, t) {
		return this.x += (e.x - this.x) * t, this.y += (e.y - this.y) * t, this.z += (e.z - this.z) * t, this;
	}
	lerpVectors(e, t, n) {
		return this.x = e.x + (t.x - e.x) * n, this.y = e.y + (t.y - e.y) * n, this.z = e.z + (t.z - e.z) * n, this;
	}
	cross(e) {
		return this.crossVectors(this, e);
	}
	crossVectors(e, t) {
		let n = e.x, r = e.y, i = e.z, a = t.x, o = t.y, s = t.z;
		return this.x = r * s - i * o, this.y = i * a - n * s, this.z = n * o - r * a, this;
	}
	projectOnVector(e) {
		let t = e.lengthSq();
		if (t === 0) return this.set(0, 0, 0);
		let n = e.dot(this) / t;
		return this.copy(e).multiplyScalar(n);
	}
	projectOnPlane(e) {
		return pu.copy(this).projectOnVector(e), this.sub(pu);
	}
	reflect(e) {
		return this.sub(pu.copy(e).multiplyScalar(2 * this.dot(e)));
	}
	angleTo(e) {
		let t = Math.sqrt(this.lengthSq() * e.lengthSq());
		if (t === 0) return Math.PI / 2;
		let n = this.dot(e) / t;
		return Math.acos(G(n, -1, 1));
	}
	distanceTo(e) {
		return Math.sqrt(this.distanceToSquared(e));
	}
	distanceToSquared(e) {
		let t = this.x - e.x, n = this.y - e.y, r = this.z - e.z;
		return t * t + n * n + r * r;
	}
	manhattanDistanceTo(e) {
		return Math.abs(this.x - e.x) + Math.abs(this.y - e.y) + Math.abs(this.z - e.z);
	}
	setFromSpherical(e) {
		return this.setFromSphericalCoords(e.radius, e.phi, e.theta);
	}
	setFromSphericalCoords(e, t, n) {
		let r = Math.sin(t) * e;
		return this.x = r * Math.sin(n), this.y = Math.cos(t) * e, this.z = r * Math.cos(n), this;
	}
	setFromCylindrical(e) {
		return this.setFromCylindricalCoords(e.radius, e.theta, e.y);
	}
	setFromCylindricalCoords(e, t, n) {
		return this.x = e * Math.sin(t), this.y = n, this.z = e * Math.cos(t), this;
	}
	setFromMatrixPosition(e) {
		let t = e.elements;
		return this.x = t[12], this.y = t[13], this.z = t[14], this;
	}
	setFromMatrixScale(e) {
		let t = this.setFromMatrixColumn(e, 0).length(), n = this.setFromMatrixColumn(e, 1).length(), r = this.setFromMatrixColumn(e, 2).length();
		return this.x = t, this.y = n, this.z = r, this;
	}
	setFromMatrixColumn(e, t) {
		return this.fromArray(e.elements, t * 4);
	}
	setFromMatrix3Column(e, t) {
		return this.fromArray(e.elements, t * 3);
	}
	setFromEuler(e) {
		return this.x = e._x, this.y = e._y, this.z = e._z, this;
	}
	setFromColor(e) {
		return this.x = e.r, this.y = e.g, this.z = e.b, this;
	}
	equals(e) {
		return e.x === this.x && e.y === this.y && e.z === this.z;
	}
	fromArray(e, t = 0) {
		return this.x = e[t], this.y = e[t + 1], this.z = e[t + 2], this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this.x, e[t + 1] = this.y, e[t + 2] = this.z, e;
	}
	fromBufferAttribute(e, t) {
		return this.x = e.getX(t), this.y = e.getY(t), this.z = e.getZ(t), this;
	}
	random() {
		return this.x = Math.random(), this.y = Math.random(), this.z = Math.random(), this;
	}
	randomDirection() {
		let e = Math.random() * Math.PI * 2, t = Math.random() * 2 - 1, n = Math.sqrt(1 - t * t);
		return this.x = n * Math.cos(e), this.y = t, this.z = n * Math.sin(e), this;
	}
	*[Symbol.iterator]() {
		yield this.x, yield this.y, yield this.z;
	}
}, pu = /*@__PURE__*/ new q(), mu = /*@__PURE__*/ new fu(), J = class e {
	static {
		e.prototype.isMatrix3 = !0;
	}
	constructor(e, t, n, r, i, a, o, s, c) {
		this.elements = [
			1,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			1
		], e !== void 0 && this.set(e, t, n, r, i, a, o, s, c);
	}
	set(e, t, n, r, i, a, o, s, c) {
		let l = this.elements;
		return l[0] = e, l[1] = r, l[2] = o, l[3] = t, l[4] = i, l[5] = s, l[6] = n, l[7] = a, l[8] = c, this;
	}
	identity() {
		return this.set(1, 0, 0, 0, 1, 0, 0, 0, 1), this;
	}
	copy(e) {
		let t = this.elements, n = e.elements;
		return t[0] = n[0], t[1] = n[1], t[2] = n[2], t[3] = n[3], t[4] = n[4], t[5] = n[5], t[6] = n[6], t[7] = n[7], t[8] = n[8], this;
	}
	extractBasis(e, t, n) {
		return e.setFromMatrix3Column(this, 0), t.setFromMatrix3Column(this, 1), n.setFromMatrix3Column(this, 2), this;
	}
	setFromMatrix4(e) {
		let t = e.elements;
		return this.set(t[0], t[4], t[8], t[1], t[5], t[9], t[2], t[6], t[10]), this;
	}
	multiply(e) {
		return this.multiplyMatrices(this, e);
	}
	premultiply(e) {
		return this.multiplyMatrices(e, this);
	}
	multiplyMatrices(e, t) {
		let n = e.elements, r = t.elements, i = this.elements, a = n[0], o = n[3], s = n[6], c = n[1], l = n[4], u = n[7], d = n[2], f = n[5], p = n[8], m = r[0], h = r[3], g = r[6], _ = r[1], v = r[4], y = r[7], b = r[2], x = r[5], S = r[8];
		return i[0] = a * m + o * _ + s * b, i[3] = a * h + o * v + s * x, i[6] = a * g + o * y + s * S, i[1] = c * m + l * _ + u * b, i[4] = c * h + l * v + u * x, i[7] = c * g + l * y + u * S, i[2] = d * m + f * _ + p * b, i[5] = d * h + f * v + p * x, i[8] = d * g + f * y + p * S, this;
	}
	multiplyScalar(e) {
		let t = this.elements;
		return t[0] *= e, t[3] *= e, t[6] *= e, t[1] *= e, t[4] *= e, t[7] *= e, t[2] *= e, t[5] *= e, t[8] *= e, this;
	}
	determinant() {
		let e = this.elements, t = e[0], n = e[1], r = e[2], i = e[3], a = e[4], o = e[5], s = e[6], c = e[7], l = e[8];
		return t * a * l - t * o * c - n * i * l + n * o * s + r * i * c - r * a * s;
	}
	invert() {
		let e = this.elements, t = e[0], n = e[1], r = e[2], i = e[3], a = e[4], o = e[5], s = e[6], c = e[7], l = e[8], u = l * a - o * c, d = o * s - l * i, f = c * i - a * s, p = t * u + n * d + r * f;
		if (p === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0);
		let m = 1 / p;
		return e[0] = u * m, e[1] = (r * c - l * n) * m, e[2] = (o * n - r * a) * m, e[3] = d * m, e[4] = (l * t - r * s) * m, e[5] = (r * i - o * t) * m, e[6] = f * m, e[7] = (n * s - c * t) * m, e[8] = (a * t - n * i) * m, this;
	}
	transpose() {
		let e, t = this.elements;
		return e = t[1], t[1] = t[3], t[3] = e, e = t[2], t[2] = t[6], t[6] = e, e = t[5], t[5] = t[7], t[7] = e, this;
	}
	getNormalMatrix(e) {
		return this.setFromMatrix4(e).invert().transpose();
	}
	transposeIntoArray(e) {
		let t = this.elements;
		return e[0] = t[0], e[1] = t[3], e[2] = t[6], e[3] = t[1], e[4] = t[4], e[5] = t[7], e[6] = t[2], e[7] = t[5], e[8] = t[8], this;
	}
	setUvTransform(e, t, n, r, i, a, o) {
		let s = Math.cos(i), c = Math.sin(i);
		return this.set(n * s, n * c, -n * (s * a + c * o) + a + e, -r * c, r * s, -r * (-c * a + s * o) + o + t, 0, 0, 1), this;
	}
	scale(e, t) {
		return Il("Matrix3: .scale() is deprecated. Use .makeScale() instead."), this.premultiply(hu.makeScale(e, t)), this;
	}
	rotate(e) {
		return Il("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."), this.premultiply(hu.makeRotation(-e)), this;
	}
	translate(e, t) {
		return Il("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."), this.premultiply(hu.makeTranslation(e, t)), this;
	}
	makeTranslation(e, t) {
		return e.isVector2 ? this.set(1, 0, e.x, 0, 1, e.y, 0, 0, 1) : this.set(1, 0, e, 0, 1, t, 0, 0, 1), this;
	}
	makeRotation(e) {
		let t = Math.cos(e), n = Math.sin(e);
		return this.set(t, -n, 0, n, t, 0, 0, 0, 1), this;
	}
	makeScale(e, t) {
		return this.set(e, 0, 0, 0, t, 0, 0, 0, 1), this;
	}
	equals(e) {
		let t = this.elements, n = e.elements;
		for (let e = 0; e < 9; e++) if (t[e] !== n[e]) return !1;
		return !0;
	}
	fromArray(e, t = 0) {
		for (let n = 0; n < 9; n++) this.elements[n] = e[n + t];
		return this;
	}
	toArray(e = [], t = 0) {
		let n = this.elements;
		return e[t] = n[0], e[t + 1] = n[1], e[t + 2] = n[2], e[t + 3] = n[3], e[t + 4] = n[4], e[t + 5] = n[5], e[t + 6] = n[6], e[t + 7] = n[7], e[t + 8] = n[8], e;
	}
	clone() {
		return new this.constructor().fromArray(this.elements);
	}
}, hu = /*@__PURE__*/ new J(), gu = /*@__PURE__*/ new J().set(.4123908, .3575843, .1804808, .212639, .7151687, .0721923, .0193308, .1191948, .9505322), _u = /*@__PURE__*/ new J().set(3.2409699, -1.5373832, -.4986108, -.9692436, 1.8759675, .0415551, .0556301, -.203977, 1.0569715);
function vu() {
	let e = {
		enabled: !0,
		workingColorSpace: xl,
		spaces: {},
		convert: function(e, t, n) {
			return this.enabled === !1 || t === n || !t || !n || (this.spaces[t].transfer === "srgb" && (e.r = yu(e.r), e.g = yu(e.g), e.b = yu(e.b)), this.spaces[t].primaries !== this.spaces[n].primaries && (e.applyMatrix3(this.spaces[t].toXYZ), e.applyMatrix3(this.spaces[n].fromXYZ)), this.spaces[n].transfer === "srgb" && (e.r = bu(e.r), e.g = bu(e.g), e.b = bu(e.b))), e;
		},
		workingToColorSpace: function(e, t) {
			return this.convert(e, this.workingColorSpace, t);
		},
		colorSpaceToWorking: function(e, t) {
			return this.convert(e, t, this.workingColorSpace);
		},
		getPrimaries: function(e) {
			return this.spaces[e].primaries;
		},
		getTransfer: function(e) {
			return e === "" ? Sl : this.spaces[e].transfer;
		},
		getToneMappingMode: function(e) {
			return this.spaces[e].outputColorSpaceConfig.toneMappingMode || "standard";
		},
		getLuminanceCoefficients: function(e, t = this.workingColorSpace) {
			return e.fromArray(this.spaces[t].luminanceCoefficients);
		},
		define: function(e) {
			Object.assign(this.spaces, e);
		},
		_getMatrix: function(e, t, n) {
			return e.copy(this.spaces[t].toXYZ).multiply(this.spaces[n].fromXYZ);
		},
		_getDrawingBufferColorSpace: function(e) {
			return this.spaces[e].outputColorSpaceConfig.drawingBufferColorSpace;
		},
		_getUnpackColorSpace: function(e = this.workingColorSpace) {
			return this.spaces[e].workingColorSpaceConfig.unpackColorSpace;
		},
		fromWorkingColorSpace: function(t, n) {
			return Il("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."), e.workingToColorSpace(t, n);
		},
		toWorkingColorSpace: function(t, n) {
			return Il("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."), e.colorSpaceToWorking(t, n);
		}
	}, t = [
		.64,
		.33,
		.3,
		.6,
		.15,
		.06
	], n = [
		.2126,
		.7152,
		.0722
	], r = [.3127, .329];
	return e.define({
		[xl]: {
			primaries: t,
			whitePoint: r,
			transfer: Sl,
			toXYZ: gu,
			fromXYZ: _u,
			luminanceCoefficients: n,
			workingColorSpaceConfig: { unpackColorSpace: bl },
			outputColorSpaceConfig: { drawingBufferColorSpace: bl }
		},
		[bl]: {
			primaries: t,
			whitePoint: r,
			transfer: Cl,
			toXYZ: gu,
			fromXYZ: _u,
			luminanceCoefficients: n,
			outputColorSpaceConfig: { drawingBufferColorSpace: bl }
		}
	}), e;
}
var Y = /*@__PURE__*/ vu();
function yu(e) {
	return e < .04045 ? e * .0773993808 : (e * .9478672986 + .0521327014) ** 2.4;
}
function bu(e) {
	return e < .0031308 ? e * 12.92 : 1.055 * e ** .41666 - .055;
}
var xu, Su = class {
	static getDataURL(e, t = "image/png") {
		if (/^data:/i.test(e.src) || typeof HTMLCanvasElement > "u") return e.src;
		let n;
		if (e instanceof HTMLCanvasElement) n = e;
		else {
			xu === void 0 && (xu = jl("canvas")), xu.width = e.width, xu.height = e.height;
			let t = xu.getContext("2d");
			e instanceof ImageData ? t.putImageData(e, 0, 0) : t.drawImage(e, 0, 0, e.width, e.height), n = xu;
		}
		return n.toDataURL(t);
	}
	static sRGBToLinear(e) {
		if (typeof HTMLImageElement < "u" && e instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && e instanceof ImageBitmap) {
			let t = jl("canvas");
			t.width = e.width, t.height = e.height;
			let n = t.getContext("2d");
			n.drawImage(e, 0, 0, e.width, e.height);
			let r = n.getImageData(0, 0, e.width, e.height), i = r.data;
			for (let e = 0; e < i.length; e++) i[e] = yu(i[e] / 255) * 255;
			return n.putImageData(r, 0, 0), t;
		}
		if (e.data) {
			let t = e.data.slice(0);
			for (let e = 0; e < t.length; e++) t instanceof Uint8Array || t instanceof Uint8ClampedArray ? t[e] = Math.floor(yu(t[e] / 255) * 255) : t[e] = yu(t[e]);
			return {
				data: t,
				width: e.width,
				height: e.height
			};
		}
		return U("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."), e;
	}
}, Cu = 0, wu = class {
	constructor(e = null) {
		this.isTextureSource = !0, Object.defineProperty(this, "id", { value: Cu++ }), this.uuid = Wl(), this.data = e, this.dataReady = !0, this.version = 0;
	}
	getSize(e) {
		let t = this.data;
		return typeof HTMLVideoElement < "u" && t instanceof HTMLVideoElement ? e.set(t.videoWidth, t.videoHeight, 0) : typeof VideoFrame < "u" && t instanceof VideoFrame ? e.set(t.displayWidth, t.displayHeight, 0) : t === null ? e.set(0, 0, 0) : e.set(t.width, t.height, t.depth || 0), e;
	}
	set needsUpdate(e) {
		e === !0 && this.version++;
	}
	toJSON(e) {
		let t = e === void 0 || typeof e == "string";
		if (!t && e.images[this.uuid] !== void 0) return e.images[this.uuid];
		let n = {
			uuid: this.uuid,
			url: ""
		}, r = this.data;
		if (r !== null) {
			let e;
			if (Array.isArray(r)) {
				e = [];
				for (let t = 0, n = r.length; t < n; t++) r[t].isDataTexture ? e.push(Tu(r[t].image)) : e.push(Tu(r[t]));
			} else e = Tu(r);
			n.url = e;
		}
		return t || (e.images[this.uuid] = n), n;
	}
};
function Tu(e) {
	return typeof HTMLImageElement < "u" && e instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && e instanceof ImageBitmap ? Su.getDataURL(e) : e.data ? {
		data: Array.from(e.data),
		width: e.width,
		height: e.height,
		type: e.data.constructor.name
	} : (U("Texture: Unable to serialize Texture."), {});
}
var Eu = 0, Du = /*@__PURE__*/ new q(), Ou = class e extends zl {
	constructor(t = e.DEFAULT_IMAGE, n = e.DEFAULT_MAPPING, r = $s, i = $s, a = ic, o = oc, s = Sc, c = sc, l = e.DEFAULT_ANISOTROPY, u = "") {
		super(), this.isTexture = !0, Object.defineProperty(this, "id", { value: Eu++ }), this.uuid = Wl(), this.name = "", this.source = new wu(t), this.mipmaps = [], this.mapping = n, this.channel = 0, this.wrapS = r, this.wrapT = i, this.magFilter = a, this.minFilter = o, this.anisotropy = l, this.format = s, this.internalFormat = null, this.type = c, this.offset = new K(0, 0), this.repeat = new K(1, 1), this.center = new K(0, 0), this.rotation = 0, this.matrixAutoUpdate = !0, this.matrix = new J(), this.generateMipmaps = !0, this.premultiplyAlpha = !1, this.flipY = !0, this.unpackAlignment = 4, this.colorSpace = u, this.userData = {}, this.updateRanges = [], this.version = 0, this.onUpdate = null, this.renderTarget = null, this.isRenderTargetTexture = !1, this.isArrayTexture = !!(t && t.depth && t.depth > 1), this.pmremVersion = 0, this.normalized = !1;
	}
	get width() {
		return this.source.getSize(Du).x;
	}
	get height() {
		return this.source.getSize(Du).y;
	}
	get depth() {
		return this.source.getSize(Du).z;
	}
	get image() {
		return this.source.data;
	}
	set image(e) {
		this.source.data = e;
	}
	updateMatrix() {
		this.matrix.setUvTransform(this.offset.x, this.offset.y, this.repeat.x, this.repeat.y, this.rotation, this.center.x, this.center.y);
	}
	addUpdateRange(e, t) {
		this.updateRanges.push({
			start: e,
			count: t
		});
	}
	clearUpdateRanges() {
		this.updateRanges.length = 0;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		return this.name = e.name, this.source = e.source, this.mipmaps = e.mipmaps.slice(0), this.mapping = e.mapping, this.channel = e.channel, this.wrapS = e.wrapS, this.wrapT = e.wrapT, this.magFilter = e.magFilter, this.minFilter = e.minFilter, this.anisotropy = e.anisotropy, this.format = e.format, this.internalFormat = e.internalFormat, this.type = e.type, this.normalized = e.normalized, this.offset.copy(e.offset), this.repeat.copy(e.repeat), this.center.copy(e.center), this.rotation = e.rotation, this.matrixAutoUpdate = e.matrixAutoUpdate, this.matrix.copy(e.matrix), this.generateMipmaps = e.generateMipmaps, this.premultiplyAlpha = e.premultiplyAlpha, this.flipY = e.flipY, this.unpackAlignment = e.unpackAlignment, this.colorSpace = e.colorSpace, this.renderTarget = e.renderTarget, this.isRenderTargetTexture = e.isRenderTargetTexture, this.isArrayTexture = e.isArrayTexture, this.userData = JSON.parse(JSON.stringify(e.userData)), this.needsUpdate = !0, this;
	}
	setValues(e) {
		for (let t in e) {
			let n = e[t];
			if (n === void 0) {
				U(`Texture.setValues(): parameter '${t}' has value of undefined.`);
				continue;
			}
			let r = this[t];
			r === void 0 ? U(`Texture.setValues(): property '${t}' does not exist.`) : r && n && r.isVector2 && n.isVector2 || r && n && r.isVector3 && n.isVector3 || r && n && r.isMatrix3 && n.isMatrix3 ? r.copy(n) : this[t] = n;
		}
	}
	toJSON(e) {
		let t = e === void 0 || typeof e == "string";
		if (!t && e.textures[this.uuid] !== void 0) return e.textures[this.uuid];
		let n = {
			metadata: {
				version: 4.7,
				type: "Texture",
				generator: "Texture.toJSON"
			},
			uuid: this.uuid,
			name: this.name,
			image: this.source.toJSON(e).uuid,
			mapping: this.mapping,
			channel: this.channel,
			repeat: [this.repeat.x, this.repeat.y],
			offset: [this.offset.x, this.offset.y],
			center: [this.center.x, this.center.y],
			rotation: this.rotation,
			wrap: [this.wrapS, this.wrapT],
			format: this.format,
			internalFormat: this.internalFormat,
			type: this.type,
			normalized: this.normalized,
			colorSpace: this.colorSpace,
			minFilter: this.minFilter,
			magFilter: this.magFilter,
			anisotropy: this.anisotropy,
			flipY: this.flipY,
			generateMipmaps: this.generateMipmaps,
			premultiplyAlpha: this.premultiplyAlpha,
			unpackAlignment: this.unpackAlignment
		};
		return Object.keys(this.userData).length > 0 && (n.userData = this.userData), t || (e.textures[this.uuid] = n), n;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
	transformUv(e) {
		if (this.mapping !== 300) return e;
		if (e.applyMatrix3(this.matrix), e.x < 0 || e.x > 1) switch (this.wrapS) {
			case Qs:
				e.x -= Math.floor(e.x);
				break;
			case $s:
				e.x = e.x < 0 ? 0 : 1;
				break;
			case ec: Math.abs(Math.floor(e.x) % 2) === 1 ? e.x = Math.ceil(e.x) - e.x : e.x -= Math.floor(e.x);
		}
		if (e.y < 0 || e.y > 1) switch (this.wrapT) {
			case Qs:
				e.y -= Math.floor(e.y);
				break;
			case $s:
				e.y = e.y < 0 ? 0 : 1;
				break;
			case ec: Math.abs(Math.floor(e.y) % 2) === 1 ? e.y = Math.ceil(e.y) - e.y : e.y -= Math.floor(e.y);
		}
		return this.flipY && (e.y = 1 - e.y), e;
	}
	set needsUpdate(e) {
		e === !0 && (this.version++, this.source.needsUpdate = !0);
	}
	set needsPMREMUpdate(e) {
		e === !0 && this.pmremVersion++;
	}
};
Ou.DEFAULT_IMAGE = null, Ou.DEFAULT_MAPPING = 300, Ou.DEFAULT_ANISOTROPY = 1;
var ku = class e {
	static {
		e.prototype.isVector4 = !0;
	}
	constructor(e = 0, t = 0, n = 0, r = 1) {
		this.x = e, this.y = t, this.z = n, this.w = r;
	}
	get width() {
		return this.z;
	}
	set width(e) {
		this.z = e;
	}
	get height() {
		return this.w;
	}
	set height(e) {
		this.w = e;
	}
	set(e, t, n, r) {
		return this.x = e, this.y = t, this.z = n, this.w = r, this;
	}
	setScalar(e) {
		return this.x = e, this.y = e, this.z = e, this.w = e, this;
	}
	setX(e) {
		return this.x = e, this;
	}
	setY(e) {
		return this.y = e, this;
	}
	setZ(e) {
		return this.z = e, this;
	}
	setW(e) {
		return this.w = e, this;
	}
	setComponent(e, t) {
		switch (e) {
			case 0:
				this.x = t;
				break;
			case 1:
				this.y = t;
				break;
			case 2:
				this.z = t;
				break;
			case 3:
				this.w = t;
				break;
			default: throw Error("THREE.Vector4: index is out of range: " + e);
		}
		return this;
	}
	getComponent(e) {
		switch (e) {
			case 0: return this.x;
			case 1: return this.y;
			case 2: return this.z;
			case 3: return this.w;
			default: throw Error("THREE.Vector4: index is out of range: " + e);
		}
	}
	clone() {
		return new this.constructor(this.x, this.y, this.z, this.w);
	}
	copy(e) {
		return this.x = e.x, this.y = e.y, this.z = e.z, this.w = e.w === void 0 ? 1 : e.w, this;
	}
	add(e) {
		return this.x += e.x, this.y += e.y, this.z += e.z, this.w += e.w, this;
	}
	addScalar(e) {
		return this.x += e, this.y += e, this.z += e, this.w += e, this;
	}
	addVectors(e, t) {
		return this.x = e.x + t.x, this.y = e.y + t.y, this.z = e.z + t.z, this.w = e.w + t.w, this;
	}
	addScaledVector(e, t) {
		return this.x += e.x * t, this.y += e.y * t, this.z += e.z * t, this.w += e.w * t, this;
	}
	sub(e) {
		return this.x -= e.x, this.y -= e.y, this.z -= e.z, this.w -= e.w, this;
	}
	subScalar(e) {
		return this.x -= e, this.y -= e, this.z -= e, this.w -= e, this;
	}
	subVectors(e, t) {
		return this.x = e.x - t.x, this.y = e.y - t.y, this.z = e.z - t.z, this.w = e.w - t.w, this;
	}
	multiply(e) {
		return this.x *= e.x, this.y *= e.y, this.z *= e.z, this.w *= e.w, this;
	}
	multiplyScalar(e) {
		return this.x *= e, this.y *= e, this.z *= e, this.w *= e, this;
	}
	applyMatrix4(e) {
		let t = this.x, n = this.y, r = this.z, i = this.w, a = e.elements;
		return this.x = a[0] * t + a[4] * n + a[8] * r + a[12] * i, this.y = a[1] * t + a[5] * n + a[9] * r + a[13] * i, this.z = a[2] * t + a[6] * n + a[10] * r + a[14] * i, this.w = a[3] * t + a[7] * n + a[11] * r + a[15] * i, this;
	}
	divide(e) {
		return this.x /= e.x, this.y /= e.y, this.z /= e.z, this.w /= e.w, this;
	}
	divideScalar(e) {
		return this.multiplyScalar(1 / e);
	}
	setAxisAngleFromQuaternion(e) {
		this.w = 2 * Math.acos(e.w);
		let t = Math.sqrt(1 - e.w * e.w);
		return t < 1e-4 ? (this.x = 1, this.y = 0, this.z = 0) : (this.x = e.x / t, this.y = e.y / t, this.z = e.z / t), this;
	}
	setAxisAngleFromRotationMatrix(e) {
		let t, n, r, i, a = .01, o = .1, s = e.elements, c = s[0], l = s[4], u = s[8], d = s[1], f = s[5], p = s[9], m = s[2], h = s[6], g = s[10];
		if (Math.abs(l - d) < a && Math.abs(u - m) < a && Math.abs(p - h) < a) {
			if (Math.abs(l + d) < o && Math.abs(u + m) < o && Math.abs(p + h) < o && Math.abs(c + f + g - 3) < o) return this.set(1, 0, 0, 0), this;
			t = Math.PI;
			let e = (c + 1) / 2, s = (f + 1) / 2, _ = (g + 1) / 2, v = (l + d) / 4, y = (u + m) / 4, b = (p + h) / 4;
			return e > s && e > _ ? e < a ? (n = 0, r = .707106781, i = .707106781) : (n = Math.sqrt(e), r = v / n, i = y / n) : s > _ ? s < a ? (n = .707106781, r = 0, i = .707106781) : (r = Math.sqrt(s), n = v / r, i = b / r) : _ < a ? (n = .707106781, r = .707106781, i = 0) : (i = Math.sqrt(_), n = y / i, r = b / i), this.set(n, r, i, t), this;
		}
		let _ = Math.sqrt((h - p) * (h - p) + (u - m) * (u - m) + (d - l) * (d - l));
		return Math.abs(_) < .001 && (_ = 1), this.x = (h - p) / _, this.y = (u - m) / _, this.z = (d - l) / _, this.w = Math.acos((c + f + g - 1) / 2), this;
	}
	setFromMatrixPosition(e) {
		let t = e.elements;
		return this.x = t[12], this.y = t[13], this.z = t[14], this.w = t[15], this;
	}
	min(e) {
		return this.x = Math.min(this.x, e.x), this.y = Math.min(this.y, e.y), this.z = Math.min(this.z, e.z), this.w = Math.min(this.w, e.w), this;
	}
	max(e) {
		return this.x = Math.max(this.x, e.x), this.y = Math.max(this.y, e.y), this.z = Math.max(this.z, e.z), this.w = Math.max(this.w, e.w), this;
	}
	clamp(e, t) {
		return this.x = G(this.x, e.x, t.x), this.y = G(this.y, e.y, t.y), this.z = G(this.z, e.z, t.z), this.w = G(this.w, e.w, t.w), this;
	}
	clampScalar(e, t) {
		return this.x = G(this.x, e, t), this.y = G(this.y, e, t), this.z = G(this.z, e, t), this.w = G(this.w, e, t), this;
	}
	clampLength(e, t) {
		let n = this.length();
		return this.divideScalar(n || 1).multiplyScalar(G(n, e, t));
	}
	floor() {
		return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this.z = Math.floor(this.z), this.w = Math.floor(this.w), this;
	}
	ceil() {
		return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this.z = Math.ceil(this.z), this.w = Math.ceil(this.w), this;
	}
	round() {
		return this.x = Math.round(this.x), this.y = Math.round(this.y), this.z = Math.round(this.z), this.w = Math.round(this.w), this;
	}
	roundToZero() {
		return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this.z = Math.trunc(this.z), this.w = Math.trunc(this.w), this;
	}
	negate() {
		return this.x = -this.x, this.y = -this.y, this.z = -this.z, this.w = -this.w, this;
	}
	dot(e) {
		return this.x * e.x + this.y * e.y + this.z * e.z + this.w * e.w;
	}
	lengthSq() {
		return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
	}
	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
	}
	manhattanLength() {
		return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z) + Math.abs(this.w);
	}
	normalize() {
		return this.divideScalar(this.length() || 1);
	}
	setLength(e) {
		return this.normalize().multiplyScalar(e);
	}
	lerp(e, t) {
		return this.x += (e.x - this.x) * t, this.y += (e.y - this.y) * t, this.z += (e.z - this.z) * t, this.w += (e.w - this.w) * t, this;
	}
	lerpVectors(e, t, n) {
		return this.x = e.x + (t.x - e.x) * n, this.y = e.y + (t.y - e.y) * n, this.z = e.z + (t.z - e.z) * n, this.w = e.w + (t.w - e.w) * n, this;
	}
	equals(e) {
		return e.x === this.x && e.y === this.y && e.z === this.z && e.w === this.w;
	}
	fromArray(e, t = 0) {
		return this.x = e[t], this.y = e[t + 1], this.z = e[t + 2], this.w = e[t + 3], this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this.x, e[t + 1] = this.y, e[t + 2] = this.z, e[t + 3] = this.w, e;
	}
	fromBufferAttribute(e, t) {
		return this.x = e.getX(t), this.y = e.getY(t), this.z = e.getZ(t), this.w = e.getW(t), this;
	}
	random() {
		return this.x = Math.random(), this.y = Math.random(), this.z = Math.random(), this.w = Math.random(), this;
	}
	*[Symbol.iterator]() {
		yield this.x, yield this.y, yield this.z, yield this.w;
	}
}, Au = class extends zl {
	constructor(e = 1, t = 1, n = {}) {
		super(), n = Object.assign({
			generateMipmaps: !1,
			internalFormat: null,
			minFilter: ic,
			depthBuffer: !0,
			stencilBuffer: !1,
			resolveColorBuffer: !0,
			resolveDepthBuffer: !0,
			resolveStencilBuffer: !0,
			storeMultisampledColorBuffer: !0,
			storeMultisampledDepthBuffer: !0,
			storeMultisampledStencilBuffer: !0,
			depthTexture: null,
			samples: 0,
			count: 1,
			depth: 1,
			multiview: !1,
			useArrayDepthTexture: !1
		}, n), this.isRenderTarget = !0, this.width = e, this.height = t, this.depth = n.depth, this.scissor = new ku(0, 0, e, t), this.scissorTest = !1, this.viewport = new ku(0, 0, e, t), this.textures = [];
		let r = new Ou({
			width: e,
			height: t,
			depth: n.depth
		}), i = n.count;
		for (let e = 0; e < i; e++) this.textures[e] = r.clone(), this.textures[e].isRenderTargetTexture = !0, this.textures[e].renderTarget = this;
		this._setTextureOptions(n), this.depthBuffer = n.depthBuffer, this.stencilBuffer = n.stencilBuffer, this.resolveColorBuffer = n.resolveColorBuffer, this.resolveDepthBuffer = n.resolveDepthBuffer, this.resolveStencilBuffer = n.resolveStencilBuffer, this.storeMultisampledColorBuffer = n.storeMultisampledColorBuffer, this.storeMultisampledDepthBuffer = n.storeMultisampledDepthBuffer, this.storeMultisampledStencilBuffer = n.storeMultisampledStencilBuffer, this._depthTexture = null, this.depthTexture = n.depthTexture, this.samples = n.samples, this.multiview = n.multiview, this.useArrayDepthTexture = n.useArrayDepthTexture;
	}
	_setTextureOptions(e = {}) {
		let t = {
			minFilter: ic,
			generateMipmaps: !1,
			flipY: !1,
			internalFormat: null
		};
		e.mapping !== void 0 && (t.mapping = e.mapping), e.wrapS !== void 0 && (t.wrapS = e.wrapS), e.wrapT !== void 0 && (t.wrapT = e.wrapT), e.wrapR !== void 0 && (t.wrapR = e.wrapR), e.magFilter !== void 0 && (t.magFilter = e.magFilter), e.minFilter !== void 0 && (t.minFilter = e.minFilter), e.format !== void 0 && (t.format = e.format), e.type !== void 0 && (t.type = e.type), e.anisotropy !== void 0 && (t.anisotropy = e.anisotropy), e.colorSpace !== void 0 && (t.colorSpace = e.colorSpace), e.flipY !== void 0 && (t.flipY = e.flipY), e.generateMipmaps !== void 0 && (t.generateMipmaps = e.generateMipmaps), e.internalFormat !== void 0 && (t.internalFormat = e.internalFormat);
		for (let e = 0; e < this.textures.length; e++) this.textures[e].setValues(t);
	}
	get texture() {
		return this.textures[0];
	}
	set texture(e) {
		this.textures[0] = e;
	}
	set depthTexture(e) {
		this._depthTexture !== null && this._depthTexture.renderTarget === this && (this._depthTexture.renderTarget = null), e !== null && e.renderTarget === null && (e.renderTarget = this), this._depthTexture = e;
	}
	get depthTexture() {
		return this._depthTexture;
	}
	setSize(e, t, n = 1) {
		if (this.width !== e || this.height !== t || this.depth !== n) {
			this.width = e, this.height = t, this.depth = n;
			for (let r = 0, i = this.textures.length; r < i; r++) this.textures[r].image.width = e, this.textures[r].image.height = t, this.textures[r].image.depth = n, this.textures[r].isData3DTexture !== !0 && (this.textures[r].isArrayTexture = this.textures[r].image.depth > 1);
			this.dispose();
		}
		this.viewport.set(0, 0, e, t), this.scissor.set(0, 0, e, t);
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		this.width = e.width, this.height = e.height, this.depth = e.depth, this.scissor.copy(e.scissor), this.scissorTest = e.scissorTest, this.viewport.copy(e.viewport), this.textures.length = 0;
		for (let t = 0, n = e.textures.length; t < n; t++) {
			this.textures[t] = e.textures[t].clone(), this.textures[t].isRenderTargetTexture = !0, this.textures[t].renderTarget = this;
			let n = Object.assign({}, e.textures[t].image);
			this.textures[t].source = new wu(n);
		}
		if (this.depthBuffer = e.depthBuffer, this.stencilBuffer = e.stencilBuffer, this.resolveColorBuffer = e.resolveColorBuffer, this.resolveDepthBuffer = e.resolveDepthBuffer, this.resolveStencilBuffer = e.resolveStencilBuffer, this.storeMultisampledColorBuffer = e.storeMultisampledColorBuffer, this.storeMultisampledDepthBuffer = e.storeMultisampledDepthBuffer, this.storeMultisampledStencilBuffer = e.storeMultisampledStencilBuffer, e.depthTexture !== null) {
			if (e.depthTexture.renderTarget === e) {
				let t = e.depthTexture.clone();
				t.renderTarget = null, this.depthTexture = t;
			} else this.depthTexture = e.depthTexture;
		}
		return this.samples = e.samples, this.multiview = e.multiview, this.useArrayDepthTexture = e.useArrayDepthTexture, this;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
}, ju = class extends Au {
	constructor(e = 1, t = 1, n = {}) {
		super(e, t, n), this.isWebGLRenderTarget = !0;
	}
}, Mu = class extends Ou {
	constructor(e = null, t = 1, n = 1, r = 1) {
		super(null), this.isDataArrayTexture = !0, this.image = {
			data: e,
			width: t,
			height: n,
			depth: r
		}, this.magFilter = tc, this.minFilter = tc, this.wrapR = $s, this.generateMipmaps = !1, this.flipY = !1, this.unpackAlignment = 1, this.layerUpdates = /* @__PURE__ */ new Set();
	}
	copy(e) {
		return super.copy(e), this.wrapR = e.wrapR, this;
	}
	addLayerUpdate(e) {
		this.layerUpdates.add(e);
	}
	clearLayerUpdates() {
		this.layerUpdates.clear();
	}
}, Nu = class extends Ou {
	constructor(e = null, t = 1, n = 1, r = 1) {
		super(null), this.isData3DTexture = !0, this.image = {
			data: e,
			width: t,
			height: n,
			depth: r
		}, this.magFilter = tc, this.minFilter = tc, this.wrapR = $s, this.generateMipmaps = !1, this.flipY = !1, this.unpackAlignment = 1;
	}
	copy(e) {
		return super.copy(e), this.wrapR = e.wrapR, this;
	}
}, Pu = class e {
	static {
		e.prototype.isMatrix4 = !0;
	}
	constructor(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h) {
		this.elements = [
			1,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			1
		], e !== void 0 && this.set(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h);
	}
	set(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h) {
		let g = this.elements;
		return g[0] = e, g[4] = t, g[8] = n, g[12] = r, g[1] = i, g[5] = a, g[9] = o, g[13] = s, g[2] = c, g[6] = l, g[10] = u, g[14] = d, g[3] = f, g[7] = p, g[11] = m, g[15] = h, this;
	}
	identity() {
		return this.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1), this;
	}
	clone() {
		return new e().fromArray(this.elements);
	}
	copy(e) {
		let t = this.elements, n = e.elements;
		return t[0] = n[0], t[1] = n[1], t[2] = n[2], t[3] = n[3], t[4] = n[4], t[5] = n[5], t[6] = n[6], t[7] = n[7], t[8] = n[8], t[9] = n[9], t[10] = n[10], t[11] = n[11], t[12] = n[12], t[13] = n[13], t[14] = n[14], t[15] = n[15], this;
	}
	copyPosition(e) {
		let t = this.elements, n = e.elements;
		return t[12] = n[12], t[13] = n[13], t[14] = n[14], this;
	}
	setFromMatrix3(e) {
		let t = e.elements;
		return this.set(t[0], t[3], t[6], 0, t[1], t[4], t[7], 0, t[2], t[5], t[8], 0, 0, 0, 0, 1), this;
	}
	extractBasis(e, t, n) {
		return this.determinantAffine() === 0 ? (e.set(1, 0, 0), t.set(0, 1, 0), n.set(0, 0, 1), this) : (e.setFromMatrixColumn(this, 0), t.setFromMatrixColumn(this, 1), n.setFromMatrixColumn(this, 2), this);
	}
	makeBasis(e, t, n) {
		return this.set(e.x, t.x, n.x, 0, e.y, t.y, n.y, 0, e.z, t.z, n.z, 0, 0, 0, 0, 1), this;
	}
	extractRotation(e) {
		if (e.determinantAffine() === 0) return this.identity();
		let t = this.elements, n = e.elements, r = 1 / Fu.setFromMatrixColumn(e, 0).length(), i = 1 / Fu.setFromMatrixColumn(e, 1).length(), a = 1 / Fu.setFromMatrixColumn(e, 2).length();
		return t[0] = n[0] * r, t[1] = n[1] * r, t[2] = n[2] * r, t[3] = 0, t[4] = n[4] * i, t[5] = n[5] * i, t[6] = n[6] * i, t[7] = 0, t[8] = n[8] * a, t[9] = n[9] * a, t[10] = n[10] * a, t[11] = 0, t[12] = 0, t[13] = 0, t[14] = 0, t[15] = 1, this;
	}
	makeRotationFromEuler(e) {
		let t = this.elements, n = e.x, r = e.y, i = e.z, a = Math.cos(n), o = Math.sin(n), s = Math.cos(r), c = Math.sin(r), l = Math.cos(i), u = Math.sin(i);
		if (e.order === "XYZ") {
			let e = a * l, n = a * u, r = o * l, i = o * u;
			t[0] = s * l, t[4] = -s * u, t[8] = c, t[1] = n + r * c, t[5] = e - i * c, t[9] = -o * s, t[2] = i - e * c, t[6] = r + n * c, t[10] = a * s;
		} else if (e.order === "YXZ") {
			let e = s * l, n = s * u, r = c * l, i = c * u;
			t[0] = e + i * o, t[4] = r * o - n, t[8] = a * c, t[1] = a * u, t[5] = a * l, t[9] = -o, t[2] = n * o - r, t[6] = i + e * o, t[10] = a * s;
		} else if (e.order === "ZXY") {
			let e = s * l, n = s * u, r = c * l, i = c * u;
			t[0] = e - i * o, t[4] = -a * u, t[8] = r + n * o, t[1] = n + r * o, t[5] = a * l, t[9] = i - e * o, t[2] = -a * c, t[6] = o, t[10] = a * s;
		} else if (e.order === "ZYX") {
			let e = a * l, n = a * u, r = o * l, i = o * u;
			t[0] = s * l, t[4] = r * c - n, t[8] = e * c + i, t[1] = s * u, t[5] = i * c + e, t[9] = n * c - r, t[2] = -c, t[6] = o * s, t[10] = a * s;
		} else if (e.order === "YZX") {
			let e = a * s, n = a * c, r = o * s, i = o * c;
			t[0] = s * l, t[4] = i - e * u, t[8] = r * u + n, t[1] = u, t[5] = a * l, t[9] = -o * l, t[2] = -c * l, t[6] = n * u + r, t[10] = e - i * u;
		} else if (e.order === "XZY") {
			let e = a * s, n = a * c, r = o * s, i = o * c;
			t[0] = s * l, t[4] = -u, t[8] = c * l, t[1] = e * u + i, t[5] = a * l, t[9] = n * u - r, t[2] = r * u - n, t[6] = o * l, t[10] = i * u + e;
		}
		return t[3] = 0, t[7] = 0, t[11] = 0, t[12] = 0, t[13] = 0, t[14] = 0, t[15] = 1, this;
	}
	makeRotationFromQuaternion(e) {
		return this.compose(Lu, e, Ru);
	}
	lookAt(e, t, n) {
		let r = this.elements;
		return Vu.subVectors(e, t), Vu.lengthSq() === 0 && (Vu.z = 1), Vu.normalize(), zu.crossVectors(n, Vu), zu.lengthSq() === 0 && (Math.abs(n.z) === 1 ? Vu.x += 1e-4 : Vu.z += 1e-4, Vu.normalize(), zu.crossVectors(n, Vu)), zu.normalize(), Bu.crossVectors(Vu, zu), r[0] = zu.x, r[4] = Bu.x, r[8] = Vu.x, r[1] = zu.y, r[5] = Bu.y, r[9] = Vu.y, r[2] = zu.z, r[6] = Bu.z, r[10] = Vu.z, this;
	}
	multiply(e) {
		return this.multiplyMatrices(this, e);
	}
	premultiply(e) {
		return this.multiplyMatrices(e, this);
	}
	multiplyMatrices(e, t) {
		let n = e.elements, r = t.elements, i = this.elements, a = n[0], o = n[4], s = n[8], c = n[12], l = n[1], u = n[5], d = n[9], f = n[13], p = n[2], m = n[6], h = n[10], g = n[14], _ = n[3], v = n[7], y = n[11], b = n[15], x = r[0], S = r[4], C = r[8], w = r[12], T = r[1], E = r[5], D = r[9], O = r[13], k = r[2], A = r[6], j = r[10], M = r[14], N = r[3], P = r[7], F = r[11], I = r[15];
		return i[0] = a * x + o * T + s * k + c * N, i[4] = a * S + o * E + s * A + c * P, i[8] = a * C + o * D + s * j + c * F, i[12] = a * w + o * O + s * M + c * I, i[1] = l * x + u * T + d * k + f * N, i[5] = l * S + u * E + d * A + f * P, i[9] = l * C + u * D + d * j + f * F, i[13] = l * w + u * O + d * M + f * I, i[2] = p * x + m * T + h * k + g * N, i[6] = p * S + m * E + h * A + g * P, i[10] = p * C + m * D + h * j + g * F, i[14] = p * w + m * O + h * M + g * I, i[3] = _ * x + v * T + y * k + b * N, i[7] = _ * S + v * E + y * A + b * P, i[11] = _ * C + v * D + y * j + b * F, i[15] = _ * w + v * O + y * M + b * I, this;
	}
	multiplyScalar(e) {
		let t = this.elements;
		return t[0] *= e, t[4] *= e, t[8] *= e, t[12] *= e, t[1] *= e, t[5] *= e, t[9] *= e, t[13] *= e, t[2] *= e, t[6] *= e, t[10] *= e, t[14] *= e, t[3] *= e, t[7] *= e, t[11] *= e, t[15] *= e, this;
	}
	determinant() {
		let e = this.elements, t = e[0], n = e[4], r = e[8], i = e[12], a = e[1], o = e[5], s = e[9], c = e[13], l = e[2], u = e[6], d = e[10], f = e[14], p = e[3], m = e[7], h = e[11], g = e[15], _ = s * f - c * d, v = o * f - c * u, y = o * d - s * u, b = a * f - c * l, x = a * d - s * l, S = a * u - o * l;
		return t * (m * _ - h * v + g * y) - n * (p * _ - h * b + g * x) + r * (p * v - m * b + g * S) - i * (p * y - m * x + h * S);
	}
	determinantAffine() {
		let e = this.elements, t = e[0], n = e[4], r = e[8], i = e[1], a = e[5], o = e[9], s = e[2], c = e[6], l = e[10];
		return t * (a * l - o * c) - n * (i * l - o * s) + r * (i * c - a * s);
	}
	transpose() {
		let e = this.elements, t;
		return t = e[1], e[1] = e[4], e[4] = t, t = e[2], e[2] = e[8], e[8] = t, t = e[6], e[6] = e[9], e[9] = t, t = e[3], e[3] = e[12], e[12] = t, t = e[7], e[7] = e[13], e[13] = t, t = e[11], e[11] = e[14], e[14] = t, this;
	}
	setPosition(e, t, n) {
		let r = this.elements;
		return e.isVector3 ? (r[12] = e.x, r[13] = e.y, r[14] = e.z) : (r[12] = e, r[13] = t, r[14] = n), this;
	}
	invert() {
		let e = this.elements, t = e[0], n = e[1], r = e[2], i = e[3], a = e[4], o = e[5], s = e[6], c = e[7], l = e[8], u = e[9], d = e[10], f = e[11], p = e[12], m = e[13], h = e[14], g = e[15], _ = t * o - n * a, v = t * s - r * a, y = t * c - i * a, b = n * s - r * o, x = n * c - i * o, S = r * c - i * s, C = l * m - u * p, w = l * h - d * p, T = l * g - f * p, E = u * h - d * m, D = u * g - f * m, O = d * g - f * h, k = _ * O - v * D + y * E + b * T - x * w + S * C;
		if (k === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
		let A = 1 / k;
		return e[0] = (o * O - s * D + c * E) * A, e[1] = (r * D - n * O - i * E) * A, e[2] = (m * S - h * x + g * b) * A, e[3] = (d * x - u * S - f * b) * A, e[4] = (s * T - a * O - c * w) * A, e[5] = (t * O - r * T + i * w) * A, e[6] = (h * y - p * S - g * v) * A, e[7] = (l * S - d * y + f * v) * A, e[8] = (a * D - o * T + c * C) * A, e[9] = (n * T - t * D - i * C) * A, e[10] = (p * x - m * y + g * _) * A, e[11] = (u * y - l * x - f * _) * A, e[12] = (o * w - a * E - s * C) * A, e[13] = (t * E - n * w + r * C) * A, e[14] = (m * v - p * b - h * _) * A, e[15] = (l * b - u * v + d * _) * A, this;
	}
	scale(e) {
		let t = this.elements, n = e.x, r = e.y, i = e.z;
		return t[0] *= n, t[4] *= r, t[8] *= i, t[1] *= n, t[5] *= r, t[9] *= i, t[2] *= n, t[6] *= r, t[10] *= i, t[3] *= n, t[7] *= r, t[11] *= i, this;
	}
	getMaxScaleOnAxis() {
		let e = this.elements, t = e[0] * e[0] + e[1] * e[1] + e[2] * e[2], n = e[4] * e[4] + e[5] * e[5] + e[6] * e[6], r = e[8] * e[8] + e[9] * e[9] + e[10] * e[10];
		return Math.sqrt(Math.max(t, n, r));
	}
	makeTranslation(e, t, n) {
		return e.isVector3 ? this.set(1, 0, 0, e.x, 0, 1, 0, e.y, 0, 0, 1, e.z, 0, 0, 0, 1) : this.set(1, 0, 0, e, 0, 1, 0, t, 0, 0, 1, n, 0, 0, 0, 1), this;
	}
	makeRotationX(e) {
		let t = Math.cos(e), n = Math.sin(e);
		return this.set(1, 0, 0, 0, 0, t, -n, 0, 0, n, t, 0, 0, 0, 0, 1), this;
	}
	makeRotationY(e) {
		let t = Math.cos(e), n = Math.sin(e);
		return this.set(t, 0, n, 0, 0, 1, 0, 0, -n, 0, t, 0, 0, 0, 0, 1), this;
	}
	makeRotationZ(e) {
		let t = Math.cos(e), n = Math.sin(e);
		return this.set(t, -n, 0, 0, n, t, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1), this;
	}
	makeRotationAxis(e, t) {
		let n = Math.cos(t), r = Math.sin(t), i = 1 - n, a = e.x, o = e.y, s = e.z, c = i * a, l = i * o;
		return this.set(c * a + n, c * o - r * s, c * s + r * o, 0, c * o + r * s, l * o + n, l * s - r * a, 0, c * s - r * o, l * s + r * a, i * s * s + n, 0, 0, 0, 0, 1), this;
	}
	makeScale(e, t, n) {
		return this.set(e, 0, 0, 0, 0, t, 0, 0, 0, 0, n, 0, 0, 0, 0, 1), this;
	}
	makeShear(e, t, n, r, i, a) {
		return this.set(1, n, i, 0, e, 1, a, 0, t, r, 1, 0, 0, 0, 0, 1), this;
	}
	compose(e, t, n) {
		let r = this.elements, i = t._x, a = t._y, o = t._z, s = t._w, c = i + i, l = a + a, u = o + o, d = i * c, f = i * l, p = i * u, m = a * l, h = a * u, g = o * u, _ = s * c, v = s * l, y = s * u, b = n.x, x = n.y, S = n.z;
		return r[0] = (1 - (m + g)) * b, r[1] = (f + y) * b, r[2] = (p - v) * b, r[3] = 0, r[4] = (f - y) * x, r[5] = (1 - (d + g)) * x, r[6] = (h + _) * x, r[7] = 0, r[8] = (p + v) * S, r[9] = (h - _) * S, r[10] = (1 - (d + m)) * S, r[11] = 0, r[12] = e.x, r[13] = e.y, r[14] = e.z, r[15] = 1, this;
	}
	decompose(e, t, n) {
		let r = this.elements;
		e.x = r[12], e.y = r[13], e.z = r[14];
		let i = this.determinantAffine();
		if (i === 0) return n.set(1, 1, 1), t.identity(), this;
		let a = Fu.set(r[0], r[1], r[2]).length(), o = Fu.set(r[4], r[5], r[6]).length(), s = Fu.set(r[8], r[9], r[10]).length();
		i < 0 && (a = -a), Iu.copy(this);
		let c = 1 / a, l = 1 / o, u = 1 / s;
		return Iu.elements[0] *= c, Iu.elements[1] *= c, Iu.elements[2] *= c, Iu.elements[4] *= l, Iu.elements[5] *= l, Iu.elements[6] *= l, Iu.elements[8] *= u, Iu.elements[9] *= u, Iu.elements[10] *= u, t.setFromRotationMatrix(Iu), n.x = a, n.y = o, n.z = s, this;
	}
	makePerspective(e, t, n, r, i, a, o = Ol, s = !1) {
		let c = this.elements, l = 2 * i / (t - e), u = 2 * i / (n - r), d = (t + e) / (t - e), f = (n + r) / (n - r), p, m;
		if (s) p = i / (a - i), m = a * i / (a - i);
		else if (o === 2e3) p = -(a + i) / (a - i), m = -2 * a * i / (a - i);
		else if (o === 2001) p = -a / (a - i), m = -a * i / (a - i);
		else throw Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: " + o);
		return c[0] = l, c[4] = 0, c[8] = d, c[12] = 0, c[1] = 0, c[5] = u, c[9] = f, c[13] = 0, c[2] = 0, c[6] = 0, c[10] = p, c[14] = m, c[3] = 0, c[7] = 0, c[11] = -1, c[15] = 0, this;
	}
	makeOrthographic(e, t, n, r, i, a, o = Ol, s = !1) {
		let c = this.elements, l = 2 / (t - e), u = 2 / (n - r), d = -(t + e) / (t - e), f = -(n + r) / (n - r), p, m;
		if (s) p = 1 / (a - i), m = a / (a - i);
		else if (o === 2e3) p = -2 / (a - i), m = -(a + i) / (a - i);
		else if (o === 2001) p = -1 / (a - i), m = -i / (a - i);
		else throw Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: " + o);
		return c[0] = l, c[4] = 0, c[8] = 0, c[12] = d, c[1] = 0, c[5] = u, c[9] = 0, c[13] = f, c[2] = 0, c[6] = 0, c[10] = p, c[14] = m, c[3] = 0, c[7] = 0, c[11] = 0, c[15] = 1, this;
	}
	equals(e) {
		let t = this.elements, n = e.elements;
		for (let e = 0; e < 16; e++) if (t[e] !== n[e]) return !1;
		return !0;
	}
	fromArray(e, t = 0) {
		for (let n = 0; n < 16; n++) this.elements[n] = e[n + t];
		return this;
	}
	toArray(e = [], t = 0) {
		let n = this.elements;
		return e[t] = n[0], e[t + 1] = n[1], e[t + 2] = n[2], e[t + 3] = n[3], e[t + 4] = n[4], e[t + 5] = n[5], e[t + 6] = n[6], e[t + 7] = n[7], e[t + 8] = n[8], e[t + 9] = n[9], e[t + 10] = n[10], e[t + 11] = n[11], e[t + 12] = n[12], e[t + 13] = n[13], e[t + 14] = n[14], e[t + 15] = n[15], e;
	}
}, Fu = /*@__PURE__*/ new q(), Iu = /*@__PURE__*/ new Pu(), Lu = /*@__PURE__*/ new q(0, 0, 0), Ru = /*@__PURE__*/ new q(1, 1, 1), zu = /*@__PURE__*/ new q(), Bu = /*@__PURE__*/ new q(), Vu = /*@__PURE__*/ new q(), Hu = /*@__PURE__*/ new Pu(), Uu = /*@__PURE__*/ new fu(), Wu = class e {
	constructor(t = 0, n = 0, r = 0, i = e.DEFAULT_ORDER) {
		this.isEuler = !0, this._x = t, this._y = n, this._z = r, this._order = i;
	}
	get x() {
		return this._x;
	}
	set x(e) {
		this._x = e, this._onChangeCallback();
	}
	get y() {
		return this._y;
	}
	set y(e) {
		this._y = e, this._onChangeCallback();
	}
	get z() {
		return this._z;
	}
	set z(e) {
		this._z = e, this._onChangeCallback();
	}
	get order() {
		return this._order;
	}
	set order(e) {
		this._order = e, this._onChangeCallback();
	}
	set(e, t, n, r = this._order) {
		return this._x = e, this._y = t, this._z = n, this._order = r, this._onChangeCallback(), this;
	}
	clone() {
		return new this.constructor(this._x, this._y, this._z, this._order);
	}
	copy(e) {
		return this._x = e._x, this._y = e._y, this._z = e._z, this._order = e._order, this._onChangeCallback(), this;
	}
	setFromRotationMatrix(e, t = this._order, n = !0) {
		let r = e.elements, i = r[0], a = r[4], o = r[8], s = r[1], c = r[5], l = r[9], u = r[2], d = r[6], f = r[10];
		switch (t) {
			case "XYZ":
				this._y = Math.asin(G(o, -1, 1)), Math.abs(o) < .9999999 ? (this._x = Math.atan2(-l, f), this._z = Math.atan2(-a, i)) : (this._x = Math.atan2(d, c), this._z = 0);
				break;
			case "YXZ":
				this._x = Math.asin(-G(l, -1, 1)), Math.abs(l) < .9999999 ? (this._y = Math.atan2(o, f), this._z = Math.atan2(s, c)) : (this._y = Math.atan2(-u, i), this._z = 0);
				break;
			case "ZXY":
				this._x = Math.asin(G(d, -1, 1)), Math.abs(d) < .9999999 ? (this._y = Math.atan2(-u, f), this._z = Math.atan2(-a, c)) : (this._y = 0, this._z = Math.atan2(s, i));
				break;
			case "ZYX":
				this._y = Math.asin(-G(u, -1, 1)), Math.abs(u) < .9999999 ? (this._x = Math.atan2(d, f), this._z = Math.atan2(s, i)) : (this._x = 0, this._z = Math.atan2(-a, c));
				break;
			case "YZX":
				this._z = Math.asin(G(s, -1, 1)), Math.abs(s) < .9999999 ? (this._x = Math.atan2(-l, c), this._y = Math.atan2(-u, i)) : (this._x = 0, this._y = Math.atan2(o, f));
				break;
			case "XZY":
				this._z = Math.asin(-G(a, -1, 1)), Math.abs(a) < .9999999 ? (this._x = Math.atan2(d, c), this._y = Math.atan2(o, i)) : (this._x = Math.atan2(-l, f), this._y = 0);
				break;
			default: U("Euler: .setFromRotationMatrix() encountered an unknown order: " + t);
		}
		return this._order = t, n === !0 && this._onChangeCallback(), this;
	}
	setFromQuaternion(e, t, n) {
		return Hu.makeRotationFromQuaternion(e), this.setFromRotationMatrix(Hu, t, n);
	}
	setFromVector3(e, t = this._order) {
		return this.set(e.x, e.y, e.z, t);
	}
	reorder(e) {
		return Uu.setFromEuler(this), this.setFromQuaternion(Uu, e);
	}
	equals(e) {
		return e._x === this._x && e._y === this._y && e._z === this._z && e._order === this._order;
	}
	fromArray(e) {
		return this._x = e[0], this._y = e[1], this._z = e[2], e[3] !== void 0 && (this._order = e[3]), this._onChangeCallback(), this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this._x, e[t + 1] = this._y, e[t + 2] = this._z, e[t + 3] = this._order, e;
	}
	_onChange(e) {
		return this._onChangeCallback = e, this;
	}
	_onChangeCallback() {}
	*[Symbol.iterator]() {
		yield this._x, yield this._y, yield this._z, yield this._order;
	}
};
Wu.DEFAULT_ORDER = "XYZ";
var Gu = class {
	constructor() {
		this.mask = 1;
	}
	set(e) {
		this.mask = 1 << e >>> 0;
	}
	enable(e) {
		this.mask |= 1 << e;
	}
	enableAll() {
		this.mask = -1;
	}
	toggle(e) {
		this.mask ^= 1 << e;
	}
	disable(e) {
		this.mask &= ~(1 << e);
	}
	disableAll() {
		this.mask = 0;
	}
	test(e) {
		return (this.mask & e.mask) !== 0;
	}
	isEnabled(e) {
		return !!(this.mask & 1 << e);
	}
}, Ku = 0, qu = /*@__PURE__*/ new q(), Ju = /*@__PURE__*/ new fu(), Yu = /*@__PURE__*/ new Pu(), Xu = /*@__PURE__*/ new q(), Zu = /*@__PURE__*/ new q(), Qu = /*@__PURE__*/ new q(), $u = /*@__PURE__*/ new fu(), ed = /*@__PURE__*/ new q(1, 0, 0), td = /*@__PURE__*/ new q(0, 1, 0), nd = /*@__PURE__*/ new q(0, 0, 1), rd = { type: "added" }, id = { type: "removed" }, ad = {
	type: "childadded",
	child: null
}, od = {
	type: "childremoved",
	child: null
}, sd = class e extends zl {
	constructor() {
		super(), this.isObject3D = !0, Object.defineProperty(this, "id", { value: Ku++ }), this.uuid = Wl(), this.name = "", this.type = "Object3D", this.parent = null, this.children = [], this.up = e.DEFAULT_UP.clone();
		let t = new q(), n = new Wu(), r = new fu(), i = new q(1, 1, 1);
		function a() {
			r.setFromEuler(n, !1);
		}
		function o() {
			n.setFromQuaternion(r, void 0, !1);
		}
		n._onChange(a), r._onChange(o), Object.defineProperties(this, {
			position: {
				configurable: !0,
				enumerable: !0,
				value: t
			},
			rotation: {
				configurable: !0,
				enumerable: !0,
				value: n
			},
			quaternion: {
				configurable: !0,
				enumerable: !0,
				value: r
			},
			scale: {
				configurable: !0,
				enumerable: !0,
				value: i
			},
			modelViewMatrix: { value: new Pu() },
			normalMatrix: { value: new J() }
		}), this.matrix = new Pu(), this.matrixWorld = new Pu(), this.matrixAutoUpdate = e.DEFAULT_MATRIX_AUTO_UPDATE, this.matrixWorldAutoUpdate = e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE, this.matrixWorldNeedsUpdate = !1, this.layers = new Gu(), this.visible = !0, this.castShadow = !1, this.receiveShadow = !1, this.frustumCulled = !0, this.renderOrder = 0, this.animations = [], this.customDepthMaterial = void 0, this.customDistanceMaterial = void 0, this.static = !1, this.userData = {}, this.pivot = null;
	}
	onBeforeShadow() {}
	onAfterShadow() {}
	onBeforeRender() {}
	onAfterRender() {}
	applyMatrix4(e) {
		this.matrixAutoUpdate && this.updateMatrix(), this.matrix.premultiply(e), this.matrix.decompose(this.position, this.quaternion, this.scale);
	}
	applyQuaternion(e) {
		return this.quaternion.premultiply(e), this;
	}
	setRotationFromAxisAngle(e, t) {
		this.quaternion.setFromAxisAngle(e, t);
	}
	setRotationFromEuler(e) {
		this.quaternion.setFromEuler(e, !0);
	}
	setRotationFromMatrix(e) {
		this.quaternion.setFromRotationMatrix(e);
	}
	setRotationFromQuaternion(e) {
		this.quaternion.copy(e);
	}
	rotateOnAxis(e, t) {
		return Ju.setFromAxisAngle(e, t), this.quaternion.multiply(Ju), this;
	}
	rotateOnWorldAxis(e, t) {
		return Ju.setFromAxisAngle(e, t), this.quaternion.premultiply(Ju), this;
	}
	rotateX(e) {
		return this.rotateOnAxis(ed, e);
	}
	rotateY(e) {
		return this.rotateOnAxis(td, e);
	}
	rotateZ(e) {
		return this.rotateOnAxis(nd, e);
	}
	translateOnAxis(e, t) {
		return qu.copy(e).applyQuaternion(this.quaternion), this.position.add(qu.multiplyScalar(t)), this;
	}
	translateX(e) {
		return this.translateOnAxis(ed, e);
	}
	translateY(e) {
		return this.translateOnAxis(td, e);
	}
	translateZ(e) {
		return this.translateOnAxis(nd, e);
	}
	localToWorld(e) {
		return this.updateWorldMatrix(!0, !1), e.applyMatrix4(this.matrixWorld);
	}
	worldToLocal(e) {
		return this.updateWorldMatrix(!0, !1), e.applyMatrix4(Yu.copy(this.matrixWorld).invert());
	}
	lookAt(e, t, n) {
		e.isVector3 ? Xu.copy(e) : Xu.set(e, t, n);
		let r = this.parent;
		this.updateWorldMatrix(!0, !1), Zu.setFromMatrixPosition(this.matrixWorld), this.isCamera || this.isLight ? Yu.lookAt(Zu, Xu, this.up) : Yu.lookAt(Xu, Zu, this.up), this.quaternion.setFromRotationMatrix(Yu), r && (Yu.extractRotation(r.matrixWorld), Ju.setFromRotationMatrix(Yu), this.quaternion.premultiply(Ju.invert()));
	}
	add(e) {
		if (arguments.length > 1) {
			for (let e = 0; e < arguments.length; e++) this.add(arguments[e]);
			return this;
		}
		return e === this ? (W("Object3D.add: object can't be added as a child of itself.", e), this) : (e && e.isObject3D ? (e.removeFromParent(), e.parent = this, this.children.push(e), e.dispatchEvent(rd), ad.child = e, this.dispatchEvent(ad), ad.child = null) : W("Object3D.add: object not an instance of THREE.Object3D.", e), this);
	}
	remove(e) {
		if (arguments.length > 1) {
			for (let e = 0; e < arguments.length; e++) this.remove(arguments[e]);
			return this;
		}
		let t = this.children.indexOf(e);
		return t !== -1 && (e.parent = null, this.children.splice(t, 1), e.dispatchEvent(id), od.child = e, this.dispatchEvent(od), od.child = null), this;
	}
	removeFromParent() {
		let e = this.parent;
		return e !== null && e.remove(this), this;
	}
	clear() {
		return this.remove(...this.children);
	}
	attach(e) {
		return this.updateWorldMatrix(!0, !1), Yu.copy(this.matrixWorld).invert(), e.parent !== null && (e.parent.updateWorldMatrix(!0, !1), Yu.multiply(e.parent.matrixWorld)), e.applyMatrix4(Yu), e.removeFromParent(), e.parent = this, this.children.push(e), e.updateWorldMatrix(!1, !0), e.dispatchEvent(rd), ad.child = e, this.dispatchEvent(ad), ad.child = null, this;
	}
	getObjectById(e) {
		return this.getObjectByProperty("id", e);
	}
	getObjectByName(e) {
		return this.getObjectByProperty("name", e);
	}
	getObjectByProperty(e, t) {
		if (this[e] === t) return this;
		for (let n = 0, r = this.children.length; n < r; n++) {
			let r = this.children[n].getObjectByProperty(e, t);
			if (r !== void 0) return r;
		}
	}
	getObjectsByProperty(e, t, n = []) {
		this[e] === t && n.push(this);
		let r = this.children;
		for (let i = 0, a = r.length; i < a; i++) r[i].getObjectsByProperty(e, t, n);
		return n;
	}
	getWorldPosition(e) {
		return this.updateWorldMatrix(!0, !1), e.setFromMatrixPosition(this.matrixWorld);
	}
	getWorldQuaternion(e) {
		return this.updateWorldMatrix(!0, !1), this.matrixWorld.decompose(Zu, e, Qu), e;
	}
	getWorldScale(e) {
		return this.updateWorldMatrix(!0, !1), this.matrixWorld.decompose(Zu, $u, e), e;
	}
	getWorldDirection(e) {
		this.updateWorldMatrix(!0, !1);
		let t = this.matrixWorld.elements;
		return e.set(t[8], t[9], t[10]).normalize();
	}
	raycast() {}
	intersectsFrustum() {}
	traverse(e) {
		e(this);
		let t = this.children;
		for (let n = 0, r = t.length; n < r; n++) t[n].traverse(e);
	}
	traverseVisible(e) {
		if (this.visible === !1) return;
		e(this);
		let t = this.children;
		for (let n = 0, r = t.length; n < r; n++) t[n].traverseVisible(e);
	}
	traverseAncestors(e) {
		let t = this.parent;
		t !== null && (e(t), t.traverseAncestors(e));
	}
	updateMatrix() {
		this.matrix.compose(this.position, this.quaternion, this.scale);
		let e = this.pivot;
		if (e !== null) {
			let t = e.x, n = e.y, r = e.z, i = this.matrix.elements;
			i[12] += t - i[0] * t - i[4] * n - i[8] * r, i[13] += n - i[1] * t - i[5] * n - i[9] * r, i[14] += r - i[2] * t - i[6] * n - i[10] * r;
		}
		this.matrixWorldNeedsUpdate = !0;
	}
	updateMatrixWorld(e) {
		this.matrixAutoUpdate && this.updateMatrix(), (this.matrixWorldNeedsUpdate || e) && (this.matrixWorldAutoUpdate === !0 && (this.parent === null ? this.matrixWorld.copy(this.matrix) : this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)), this.matrixWorldNeedsUpdate = !1, e = !0);
		let t = this.children;
		for (let n = 0, r = t.length; n < r; n++) t[n].updateMatrixWorld(e);
	}
	updateWorldMatrix(e, t, n = !1) {
		let r = this.parent;
		if (e === !0 && r !== null && r.updateWorldMatrix(!0, !1), this.matrixAutoUpdate && this.updateMatrix(), (this.matrixWorldNeedsUpdate || n) && (this.matrixWorldAutoUpdate === !0 && (this.parent === null ? this.matrixWorld.copy(this.matrix) : this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)), this.matrixWorldNeedsUpdate = !1, n = !0), t === !0) {
			let e = this.children;
			for (let t = 0, r = e.length; t < r; t++) e[t].updateWorldMatrix(!1, !0, n);
		}
	}
	toJSON(e) {
		let t = e === void 0 || typeof e == "string", n = {};
		t && (e = {
			geometries: {},
			materials: {},
			textures: {},
			images: {},
			shapes: {},
			skeletons: {},
			animations: {},
			nodes: {}
		}, n.metadata = {
			version: 4.7,
			type: "Object",
			generator: "Object3D.toJSON"
		});
		let r = {};
		r.uuid = this.uuid, r.type = this.type, r.name = this.name, r.castShadow = this.castShadow, r.receiveShadow = this.receiveShadow, r.visible = this.visible, r.frustumCulled = this.frustumCulled, r.renderOrder = this.renderOrder, r.static = this.static, r.matrixAutoUpdate = this.matrixAutoUpdate, Object.keys(this.userData).length > 0 && (r.userData = this.userData), r.layers = this.layers.mask, r.matrix = this.matrix.toArray(), r.up = this.up.toArray(), this.pivot !== null && (r.pivot = this.pivot.toArray()), this.morphTargetDictionary !== void 0 && (r.morphTargetDictionary = Object.assign({}, this.morphTargetDictionary)), this.morphTargetInfluences !== void 0 && (r.morphTargetInfluences = this.morphTargetInfluences.slice()), this.isInstancedMesh && (r.type = "InstancedMesh", r.count = this.count, r.instanceMatrix = this.instanceMatrix.toJSON(), this.instanceColor !== null && (r.instanceColor = this.instanceColor.toJSON())), this.isBatchedMesh && (r.type = "BatchedMesh", r.perObjectFrustumCulled = this.perObjectFrustumCulled, r.sortObjects = this.sortObjects, r.drawRanges = this._drawRanges, r.reservedRanges = this._reservedRanges, r.geometryInfo = this._geometryInfo.map((e) => ({
			...e,
			boundingBox: e.boundingBox ? e.boundingBox.toJSON() : void 0,
			boundingSphere: e.boundingSphere ? e.boundingSphere.toJSON() : void 0
		})), r.instanceInfo = this._instanceInfo.map((e) => ({ ...e })), r.availableInstanceIds = this._availableInstanceIds.slice(), r.availableGeometryIds = this._availableGeometryIds.slice(), r.nextIndexStart = this._nextIndexStart, r.nextVertexStart = this._nextVertexStart, r.geometryCount = this._geometryCount, r.maxInstanceCount = this._maxInstanceCount, r.maxVertexCount = this._maxVertexCount, r.maxIndexCount = this._maxIndexCount, r.geometryInitialized = this._geometryInitialized, r.matricesTexture = this._matricesTexture.toJSON(e), r.indirectTexture = this._indirectTexture.toJSON(e), this._colorsTexture !== null && (r.colorsTexture = this._colorsTexture.toJSON(e)), this.boundingSphere !== null && (r.boundingSphere = this.boundingSphere.toJSON()), this.boundingBox !== null && (r.boundingBox = this.boundingBox.toJSON()));
		function i(t, n) {
			return t[n.uuid] === void 0 && (t[n.uuid] = n.toJSON(e)), n.uuid;
		}
		if (this.isScene) this.background && (this.background.isColor ? r.background = this.background.toJSON() : this.background.isTexture && (r.background = this.background.toJSON(e).uuid)), this.environment && this.environment.isTexture && this.environment.isRenderTargetTexture !== !0 && (r.environment = this.environment.toJSON(e).uuid);
		else if (this.isMesh || this.isLine || this.isPoints) {
			r.geometry = i(e.geometries, this.geometry);
			let t = this.geometry.parameters;
			if (t !== void 0 && t.shapes !== void 0) {
				let n = t.shapes;
				if (Array.isArray(n)) for (let t = 0, r = n.length; t < r; t++) {
					let r = n[t];
					i(e.shapes, r);
				}
				else i(e.shapes, n);
			}
		}
		if (this.isSkinnedMesh && (r.bindMode = this.bindMode, r.bindMatrix = this.bindMatrix.toArray(), this.skeleton !== void 0 && (i(e.skeletons, this.skeleton), r.skeleton = this.skeleton.uuid)), this.material !== void 0) {
			if (Array.isArray(this.material)) {
				let t = [];
				for (let n = 0, r = this.material.length; n < r; n++) t.push(i(e.materials, this.material[n]));
				r.material = t;
			} else r.material = i(e.materials, this.material);
		}
		if (this.children.length > 0) {
			r.children = [];
			for (let t = 0; t < this.children.length; t++) r.children.push(this.children[t].toJSON(e).object);
		}
		if (this.animations.length > 0) {
			r.animations = [];
			for (let t = 0; t < this.animations.length; t++) {
				let n = this.animations[t];
				r.animations.push(i(e.animations, n));
			}
		}
		if (t) {
			let t = a(e.geometries), r = a(e.materials), i = a(e.textures), o = a(e.images), s = a(e.shapes), c = a(e.skeletons), l = a(e.animations), u = a(e.nodes);
			t.length > 0 && (n.geometries = t), r.length > 0 && (n.materials = r), i.length > 0 && (n.textures = i), o.length > 0 && (n.images = o), s.length > 0 && (n.shapes = s), c.length > 0 && (n.skeletons = c), l.length > 0 && (n.animations = l), u.length > 0 && (n.nodes = u);
		}
		return n.object = r, n;
		function a(e) {
			let t = [];
			for (let n in e) {
				let r = e[n];
				delete r.metadata, t.push(r);
			}
			return t;
		}
	}
	clone(e) {
		return new this.constructor().copy(this, e);
	}
	copy(e, t = !0) {
		if (this.name = e.name, this.up.copy(e.up), this.position.copy(e.position), this.rotation.order = e.rotation.order, this.quaternion.copy(e.quaternion), this.scale.copy(e.scale), this.pivot = e.pivot === null ? null : e.pivot.clone(), this.matrix.copy(e.matrix), this.matrixWorld.copy(e.matrixWorld), this.matrixAutoUpdate = e.matrixAutoUpdate, this.matrixWorldAutoUpdate = e.matrixWorldAutoUpdate, this.matrixWorldNeedsUpdate = e.matrixWorldNeedsUpdate, this.layers.mask = e.layers.mask, this.visible = e.visible, this.castShadow = e.castShadow, this.receiveShadow = e.receiveShadow, this.frustumCulled = e.frustumCulled, this.renderOrder = e.renderOrder, this.static = e.static, this.animations = e.animations.slice(), this.userData = JSON.parse(JSON.stringify(e.userData)), t === !0) for (let t = 0; t < e.children.length; t++) {
			let n = e.children[t];
			this.add(n.clone());
		}
		return this;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
};
sd.DEFAULT_UP = /*@__PURE__*/ new q(0, 1, 0), sd.DEFAULT_MATRIX_AUTO_UPDATE = !0, sd.DEFAULT_MATRIX_WORLD_AUTO_UPDATE = !0;
var cd = class extends sd {
	constructor() {
		super(), this.isGroup = !0, this.type = "Group";
	}
}, ld = { type: "move" }, ud = class {
	constructor() {
		this._targetRay = null, this._grip = null, this._hand = null;
	}
	getHandSpace() {
		return this._hand === null && (this._hand = new cd(), this._hand.matrixAutoUpdate = !1, this._hand.visible = !1, this._hand.joints = {}, this._hand.inputState = { pinching: !1 }), this._hand;
	}
	getTargetRaySpace() {
		return this._targetRay === null && (this._targetRay = new cd(), this._targetRay.matrixAutoUpdate = !1, this._targetRay.visible = !1, this._targetRay.hasLinearVelocity = !1, this._targetRay.linearVelocity = new q(), this._targetRay.hasAngularVelocity = !1, this._targetRay.angularVelocity = new q()), this._targetRay;
	}
	getGripSpace() {
		return this._grip === null && (this._grip = new cd(), this._grip.matrixAutoUpdate = !1, this._grip.visible = !1, this._grip.hasLinearVelocity = !1, this._grip.linearVelocity = new q(), this._grip.hasAngularVelocity = !1, this._grip.angularVelocity = new q(), this._grip.eventsEnabled = !1), this._grip;
	}
	dispatchEvent(e) {
		return this._targetRay !== null && this._targetRay.dispatchEvent(e), this._grip !== null && this._grip.dispatchEvent(e), this._hand !== null && this._hand.dispatchEvent(e), this;
	}
	connect(e) {
		if (e && e.hand) {
			let t = this._hand;
			if (t) for (let n of e.hand.values()) this._getHandJoint(t, n);
		}
		return this.dispatchEvent({
			type: "connected",
			data: e
		}), this;
	}
	disconnect(e) {
		return this.dispatchEvent({
			type: "disconnected",
			data: e
		}), this._targetRay !== null && (this._targetRay.visible = !1), this._grip !== null && (this._grip.visible = !1), this._hand !== null && (this._hand.visible = !1), this;
	}
	update(e, t, n) {
		let r = null, i = null, a = null, o = this._targetRay, s = this._grip, c = this._hand;
		if (e && t.session.visibilityState !== "visible-blurred") {
			if (c && e.hand) {
				a = !0;
				for (let r of e.hand.values()) {
					let e = t.getJointPose(r, n), i = this._getHandJoint(c, r);
					e !== null && (i.matrix.fromArray(e.transform.matrix), i.matrix.decompose(i.position, i.rotation, i.scale), i.matrixWorldNeedsUpdate = !0, i.jointRadius = e.radius), i.visible = e !== null;
				}
				let r = c.joints["index-finger-tip"], i = c.joints["thumb-tip"], o = r.position.distanceTo(i.position);
				c.inputState.pinching && o > .025 ? (c.inputState.pinching = !1, this.dispatchEvent({
					type: "pinchend",
					handedness: e.handedness,
					target: this
				})) : !c.inputState.pinching && o <= .015 && (c.inputState.pinching = !0, this.dispatchEvent({
					type: "pinchstart",
					handedness: e.handedness,
					target: this
				}));
			} else s !== null && e.gripSpace && (i = t.getPose(e.gripSpace, n), i !== null && (s.matrix.fromArray(i.transform.matrix), s.matrix.decompose(s.position, s.rotation, s.scale), s.matrixWorldNeedsUpdate = !0, i.linearVelocity ? (s.hasLinearVelocity = !0, s.linearVelocity.copy(i.linearVelocity)) : s.hasLinearVelocity = !1, i.angularVelocity ? (s.hasAngularVelocity = !0, s.angularVelocity.copy(i.angularVelocity)) : s.hasAngularVelocity = !1, s.eventsEnabled && s.dispatchEvent({
				type: "gripUpdated",
				data: e,
				target: this
			})));
			o !== null && (r = t.getPose(e.targetRaySpace, n), r === null && i !== null && (r = i), r !== null && (o.matrix.fromArray(r.transform.matrix), o.matrix.decompose(o.position, o.rotation, o.scale), o.matrixWorldNeedsUpdate = !0, r.linearVelocity ? (o.hasLinearVelocity = !0, o.linearVelocity.copy(r.linearVelocity)) : o.hasLinearVelocity = !1, r.angularVelocity ? (o.hasAngularVelocity = !0, o.angularVelocity.copy(r.angularVelocity)) : o.hasAngularVelocity = !1, this.dispatchEvent(ld)));
		}
		return o !== null && (o.visible = r !== null), s !== null && (s.visible = i !== null), c !== null && (c.visible = a !== null), this;
	}
	_getHandJoint(e, t) {
		if (e.joints[t.jointName] === void 0) {
			let n = new cd();
			n.matrixAutoUpdate = !1, n.visible = !1, e.joints[t.jointName] = n, e.add(n);
		}
		return e.joints[t.jointName];
	}
}, dd = {
	aliceblue: 15792383,
	antiquewhite: 16444375,
	aqua: 65535,
	aquamarine: 8388564,
	azure: 15794175,
	beige: 16119260,
	bisque: 16770244,
	black: 0,
	blanchedalmond: 16772045,
	blue: 255,
	blueviolet: 9055202,
	brown: 10824234,
	burlywood: 14596231,
	cadetblue: 6266528,
	chartreuse: 8388352,
	chocolate: 13789470,
	coral: 16744272,
	cornflowerblue: 6591981,
	cornsilk: 16775388,
	crimson: 14423100,
	cyan: 65535,
	darkblue: 139,
	darkcyan: 35723,
	darkgoldenrod: 12092939,
	darkgray: 11119017,
	darkgreen: 25600,
	darkgrey: 11119017,
	darkkhaki: 12433259,
	darkmagenta: 9109643,
	darkolivegreen: 5597999,
	darkorange: 16747520,
	darkorchid: 10040012,
	darkred: 9109504,
	darksalmon: 15308410,
	darkseagreen: 9419919,
	darkslateblue: 4734347,
	darkslategray: 3100495,
	darkslategrey: 3100495,
	darkturquoise: 52945,
	darkviolet: 9699539,
	deeppink: 16716947,
	deepskyblue: 49151,
	dimgray: 6908265,
	dimgrey: 6908265,
	dodgerblue: 2003199,
	firebrick: 11674146,
	floralwhite: 16775920,
	forestgreen: 2263842,
	fuchsia: 16711935,
	gainsboro: 14474460,
	ghostwhite: 16316671,
	gold: 16766720,
	goldenrod: 14329120,
	gray: 8421504,
	green: 32768,
	greenyellow: 11403055,
	grey: 8421504,
	honeydew: 15794160,
	hotpink: 16738740,
	indianred: 13458524,
	indigo: 4915330,
	ivory: 16777200,
	khaki: 15787660,
	lavender: 15132410,
	lavenderblush: 16773365,
	lawngreen: 8190976,
	lemonchiffon: 16775885,
	lightblue: 11393254,
	lightcoral: 15761536,
	lightcyan: 14745599,
	lightgoldenrodyellow: 16448210,
	lightgray: 13882323,
	lightgreen: 9498256,
	lightgrey: 13882323,
	lightpink: 16758465,
	lightsalmon: 16752762,
	lightseagreen: 2142890,
	lightskyblue: 8900346,
	lightslategray: 7833753,
	lightslategrey: 7833753,
	lightsteelblue: 11584734,
	lightyellow: 16777184,
	lime: 65280,
	limegreen: 3329330,
	linen: 16445670,
	magenta: 16711935,
	maroon: 8388608,
	mediumaquamarine: 6737322,
	mediumblue: 205,
	mediumorchid: 12211667,
	mediumpurple: 9662683,
	mediumseagreen: 3978097,
	mediumslateblue: 8087790,
	mediumspringgreen: 64154,
	mediumturquoise: 4772300,
	mediumvioletred: 13047173,
	midnightblue: 1644912,
	mintcream: 16121850,
	mistyrose: 16770273,
	moccasin: 16770229,
	navajowhite: 16768685,
	navy: 128,
	oldlace: 16643558,
	olive: 8421376,
	olivedrab: 7048739,
	orange: 16753920,
	orangered: 16729344,
	orchid: 14315734,
	palegoldenrod: 15657130,
	palegreen: 10025880,
	paleturquoise: 11529966,
	palevioletred: 14381203,
	papayawhip: 16773077,
	peachpuff: 16767673,
	peru: 13468991,
	pink: 16761035,
	plum: 14524637,
	powderblue: 11591910,
	purple: 8388736,
	rebeccapurple: 6697881,
	red: 16711680,
	rosybrown: 12357519,
	royalblue: 4286945,
	saddlebrown: 9127187,
	salmon: 16416882,
	sandybrown: 16032864,
	seagreen: 3050327,
	seashell: 16774638,
	sienna: 10506797,
	silver: 12632256,
	skyblue: 8900331,
	slateblue: 6970061,
	slategray: 7372944,
	slategrey: 7372944,
	snow: 16775930,
	springgreen: 65407,
	steelblue: 4620980,
	tan: 13808780,
	teal: 32896,
	thistle: 14204888,
	tomato: 16737095,
	turquoise: 4251856,
	violet: 15631086,
	wheat: 16113331,
	white: 16777215,
	whitesmoke: 16119285,
	yellow: 16776960,
	yellowgreen: 10145074
}, fd = {
	h: 0,
	s: 0,
	l: 0
}, pd = {
	h: 0,
	s: 0,
	l: 0
};
function md(e, t, n) {
	return n < 0 && (n += 1), n > 1 && --n, n < 1 / 6 ? e + (t - e) * 6 * n : n < 1 / 2 ? t : n < 2 / 3 ? e + (t - e) * 6 * (2 / 3 - n) : e;
}
var X = class {
	constructor(e, t, n) {
		return this.isColor = !0, this.r = 1, this.g = 1, this.b = 1, this.set(e, t, n);
	}
	set(e, t, n) {
		if (t === void 0 && n === void 0) {
			let t = e;
			t && t.isColor ? this.copy(t) : typeof t == "number" ? this.setHex(t) : typeof t == "string" && this.setStyle(t);
		} else this.setRGB(e, t, n);
		return this;
	}
	setScalar(e) {
		return this.r = e, this.g = e, this.b = e, this;
	}
	setHex(e, t = bl) {
		return e = Math.floor(e), this.r = (e >> 16 & 255) / 255, this.g = (e >> 8 & 255) / 255, this.b = (e & 255) / 255, Y.colorSpaceToWorking(this, t), this;
	}
	setRGB(e, t, n, r = Y.workingColorSpace) {
		return this.r = e, this.g = t, this.b = n, Y.colorSpaceToWorking(this, r), this;
	}
	setHSL(e, t, n, r = Y.workingColorSpace) {
		if (e = Gl(e, 1), t = G(t, 0, 1), n = G(n, 0, 1), t === 0) this.r = this.g = this.b = n;
		else {
			let r = n <= .5 ? n * (1 + t) : n + t - n * t, i = 2 * n - r;
			this.r = md(i, r, e + 1 / 3), this.g = md(i, r, e), this.b = md(i, r, e - 1 / 3);
		}
		return Y.colorSpaceToWorking(this, r), this;
	}
	setStyle(e, t = bl) {
		function n(t) {
			t !== void 0 && parseFloat(t) < 1 && U("Color: Alpha component of " + e + " will be ignored.");
		}
		let r;
		if (r = /^(\w+)\(([^\)]*)\)/.exec(e)) {
			let i, a = r[1], o = r[2];
			switch (a) {
				case "rgb":
				case "rgba":
					if (i = /^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o)) return n(i[4]), this.setRGB(Math.min(255, parseInt(i[1], 10)) / 255, Math.min(255, parseInt(i[2], 10)) / 255, Math.min(255, parseInt(i[3], 10)) / 255, t);
					if (i = /^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o)) return n(i[4]), this.setRGB(Math.min(100, parseInt(i[1], 10)) / 100, Math.min(100, parseInt(i[2], 10)) / 100, Math.min(100, parseInt(i[3], 10)) / 100, t);
					break;
				case "hsl":
				case "hsla":
					if (i = /^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o)) return n(i[4]), this.setHSL(parseFloat(i[1]) / 360, parseFloat(i[2]) / 100, parseFloat(i[3]) / 100, t);
					break;
				default: U("Color: Unknown color model " + e);
			}
		} else if (r = /^\#([A-Fa-f\d]+)$/.exec(e)) {
			let n = r[1], i = n.length;
			if (i === 3) return this.setRGB(parseInt(n.charAt(0), 16) / 15, parseInt(n.charAt(1), 16) / 15, parseInt(n.charAt(2), 16) / 15, t);
			if (i === 6) return this.setHex(parseInt(n, 16), t);
			U("Color: Invalid hex color " + e);
		} else if (e && e.length > 0) return this.setColorName(e, t);
		return this;
	}
	setColorName(e, t = bl) {
		let n = dd[e.toLowerCase()];
		return n === void 0 ? U("Color: Unknown color " + e) : this.setHex(n, t), this;
	}
	clone() {
		return new this.constructor(this.r, this.g, this.b);
	}
	copy(e) {
		return this.r = e.r, this.g = e.g, this.b = e.b, this;
	}
	copySRGBToLinear(e) {
		return this.r = yu(e.r), this.g = yu(e.g), this.b = yu(e.b), this;
	}
	copyLinearToSRGB(e) {
		return this.r = bu(e.r), this.g = bu(e.g), this.b = bu(e.b), this;
	}
	convertSRGBToLinear() {
		return this.copySRGBToLinear(this), this;
	}
	convertLinearToSRGB() {
		return this.copyLinearToSRGB(this), this;
	}
	getHex(e = bl) {
		return Y.workingToColorSpace(hd.copy(this), e), Math.round(G(hd.r * 255, 0, 255)) * 65536 + Math.round(G(hd.g * 255, 0, 255)) * 256 + Math.round(G(hd.b * 255, 0, 255));
	}
	getHexString(e = bl) {
		return ("000000" + this.getHex(e).toString(16)).slice(-6);
	}
	getHSL(e, t = Y.workingColorSpace) {
		Y.workingToColorSpace(hd.copy(this), t);
		let n = hd.r, r = hd.g, i = hd.b, a = Math.max(n, r, i), o = Math.min(n, r, i), s, c, l = (o + a) / 2;
		if (o === a) s = 0, c = 0;
		else {
			let e = a - o;
			switch (c = l <= .5 ? e / (a + o) : e / (2 - a - o), a) {
				case n:
					s = (r - i) / e + (r < i ? 6 : 0);
					break;
				case r:
					s = (i - n) / e + 2;
					break;
				case i: s = (n - r) / e + 4;
			}
			s /= 6;
		}
		return e.h = s, e.s = c, e.l = l, e;
	}
	getRGB(e, t = Y.workingColorSpace) {
		return Y.workingToColorSpace(hd.copy(this), t), e.r = hd.r, e.g = hd.g, e.b = hd.b, e;
	}
	getStyle(e = bl) {
		Y.workingToColorSpace(hd.copy(this), e);
		let t = hd.r, n = hd.g, r = hd.b;
		return e === "srgb" ? `rgb(${Math.round(t * 255)},${Math.round(n * 255)},${Math.round(r * 255)})` : `color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`;
	}
	offsetHSL(e, t, n) {
		return this.getHSL(fd), this.setHSL(fd.h + e, fd.s + t, fd.l + n);
	}
	add(e) {
		return this.r += e.r, this.g += e.g, this.b += e.b, this;
	}
	addColors(e, t) {
		return this.r = e.r + t.r, this.g = e.g + t.g, this.b = e.b + t.b, this;
	}
	addScalar(e) {
		return this.r += e, this.g += e, this.b += e, this;
	}
	sub(e) {
		return this.r = Math.max(0, this.r - e.r), this.g = Math.max(0, this.g - e.g), this.b = Math.max(0, this.b - e.b), this;
	}
	multiply(e) {
		return this.r *= e.r, this.g *= e.g, this.b *= e.b, this;
	}
	multiplyScalar(e) {
		return this.r *= e, this.g *= e, this.b *= e, this;
	}
	lerp(e, t) {
		return this.r += (e.r - this.r) * t, this.g += (e.g - this.g) * t, this.b += (e.b - this.b) * t, this;
	}
	lerpColors(e, t, n) {
		return this.r = e.r + (t.r - e.r) * n, this.g = e.g + (t.g - e.g) * n, this.b = e.b + (t.b - e.b) * n, this;
	}
	lerpHSL(e, t) {
		this.getHSL(fd), e.getHSL(pd);
		let n = Jl(fd.h, pd.h, t), r = Jl(fd.s, pd.s, t), i = Jl(fd.l, pd.l, t);
		return this.setHSL(n, r, i), this;
	}
	setFromVector3(e) {
		return this.r = e.x, this.g = e.y, this.b = e.z, this;
	}
	applyMatrix3(e) {
		let t = this.r, n = this.g, r = this.b, i = e.elements;
		return this.r = i[0] * t + i[3] * n + i[6] * r, this.g = i[1] * t + i[4] * n + i[7] * r, this.b = i[2] * t + i[5] * n + i[8] * r, this;
	}
	equals(e) {
		return e.r === this.r && e.g === this.g && e.b === this.b;
	}
	fromArray(e, t = 0) {
		return this.r = e[t], this.g = e[t + 1], this.b = e[t + 2], this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this.r, e[t + 1] = this.g, e[t + 2] = this.b, e;
	}
	fromBufferAttribute(e, t) {
		return this.r = e.getX(t), this.g = e.getY(t), this.b = e.getZ(t), this;
	}
	toJSON() {
		return this.getHex();
	}
	*[Symbol.iterator]() {
		yield this.r, yield this.g, yield this.b;
	}
}, hd = /*@__PURE__*/ new X();
X.NAMES = dd;
var gd = class extends sd {
	constructor() {
		super(), this.isScene = !0, this.type = "Scene", this.background = null, this.environment = null, this.fog = null, this.backgroundBlurriness = 0, this.backgroundIntensity = 1, this.backgroundRotation = new Wu(), this.environmentIntensity = 1, this.environmentRotation = new Wu(), this.overrideMaterial = null, typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
	}
	copy(e, t) {
		return super.copy(e, t), e.background !== null && (this.background = e.background.clone()), e.environment !== null && (this.environment = e.environment.clone()), e.fog !== null && (this.fog = e.fog.clone()), this.backgroundBlurriness = e.backgroundBlurriness, this.backgroundIntensity = e.backgroundIntensity, this.backgroundRotation.copy(e.backgroundRotation), this.environmentIntensity = e.environmentIntensity, this.environmentRotation.copy(e.environmentRotation), e.overrideMaterial !== null && (this.overrideMaterial = e.overrideMaterial.clone()), this.matrixAutoUpdate = e.matrixAutoUpdate, this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return this.fog !== null && (t.object.fog = this.fog.toJSON()), t.object.backgroundBlurriness = this.backgroundBlurriness, t.object.backgroundIntensity = this.backgroundIntensity, t.object.backgroundRotation = this.backgroundRotation.toArray(), t.object.environmentIntensity = this.environmentIntensity, t.object.environmentRotation = this.environmentRotation.toArray(), t;
	}
}, _d = /*@__PURE__*/ new q(), vd = /*@__PURE__*/ new q(), yd = /*@__PURE__*/ new q(), bd = /*@__PURE__*/ new q(), xd = /*@__PURE__*/ new q(), Sd = /*@__PURE__*/ new q(), Cd = /*@__PURE__*/ new q(), wd = /*@__PURE__*/ new q(), Td = /*@__PURE__*/ new q(), Ed = /*@__PURE__*/ new q(), Dd = /*@__PURE__*/ new ku(), Od = /*@__PURE__*/ new ku(), kd = /*@__PURE__*/ new ku(), Ad = class e {
	constructor(e = new q(), t = new q(), n = new q()) {
		this.a = e, this.b = t, this.c = n;
	}
	static getNormal(e, t, n, r) {
		r.subVectors(n, t), _d.subVectors(e, t), r.cross(_d);
		let i = r.lengthSq();
		return i > 0 ? r.multiplyScalar(1 / Math.sqrt(i)) : r.set(0, 0, 0);
	}
	static getBarycoord(e, t, n, r, i) {
		_d.subVectors(r, t), vd.subVectors(n, t), yd.subVectors(e, t);
		let a = _d.dot(_d), o = _d.dot(vd), s = _d.dot(yd), c = vd.dot(vd), l = vd.dot(yd), u = a * c - o * o;
		if (u === 0) return i.set(0, 0, 0), null;
		let d = 1 / u, f = (c * s - o * l) * d, p = (a * l - o * s) * d;
		return i.set(1 - f - p, p, f);
	}
	static containsPoint(e, t, n, r) {
		return this.getBarycoord(e, t, n, r, bd) !== null && bd.x >= 0 && bd.y >= 0 && bd.x + bd.y <= 1;
	}
	static getInterpolation(e, t, n, r, i, a, o, s) {
		return this.getBarycoord(e, t, n, r, bd) === null ? (s.x = 0, s.y = 0, "z" in s && (s.z = 0), "w" in s && (s.w = 0), null) : (s.setScalar(0), s.addScaledVector(i, bd.x), s.addScaledVector(a, bd.y), s.addScaledVector(o, bd.z), s);
	}
	static getInterpolatedAttribute(e, t, n, r, i, a) {
		return Dd.setScalar(0), Od.setScalar(0), kd.setScalar(0), Dd.fromBufferAttribute(e, t), Od.fromBufferAttribute(e, n), kd.fromBufferAttribute(e, r), a.setScalar(0), a.addScaledVector(Dd, i.x), a.addScaledVector(Od, i.y), a.addScaledVector(kd, i.z), a;
	}
	static isFrontFacing(e, t, n, r) {
		return _d.subVectors(n, t), vd.subVectors(e, t), _d.cross(vd).dot(r) < 0;
	}
	set(e, t, n) {
		return this.a.copy(e), this.b.copy(t), this.c.copy(n), this;
	}
	setFromPointsAndIndices(e, t, n, r) {
		return this.a.copy(e[t]), this.b.copy(e[n]), this.c.copy(e[r]), this;
	}
	setFromAttributeAndIndices(e, t, n, r) {
		return this.a.fromBufferAttribute(e, t), this.b.fromBufferAttribute(e, n), this.c.fromBufferAttribute(e, r), this;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		return this.a.copy(e.a), this.b.copy(e.b), this.c.copy(e.c), this;
	}
	getArea() {
		return _d.subVectors(this.c, this.b), vd.subVectors(this.a, this.b), _d.cross(vd).length() * .5;
	}
	getMidpoint(e) {
		return e.addVectors(this.a, this.b).add(this.c).multiplyScalar(1 / 3);
	}
	getNormal(t) {
		return e.getNormal(this.a, this.b, this.c, t);
	}
	getPlane(e) {
		return e.setFromCoplanarPoints(this.a, this.b, this.c);
	}
	getBarycoord(t, n) {
		return e.getBarycoord(t, this.a, this.b, this.c, n);
	}
	getInterpolation(t, n, r, i, a) {
		return e.getInterpolation(t, this.a, this.b, this.c, n, r, i, a);
	}
	containsPoint(t) {
		return e.containsPoint(t, this.a, this.b, this.c);
	}
	isFrontFacing(t) {
		return e.isFrontFacing(this.a, this.b, this.c, t);
	}
	intersectsBox(e) {
		return e.intersectsTriangle(this);
	}
	closestPointToPoint(e, t) {
		let n = this.a, r = this.b, i = this.c, a, o;
		xd.subVectors(r, n), Sd.subVectors(i, n), wd.subVectors(e, n);
		let s = xd.dot(wd), c = Sd.dot(wd);
		if (s <= 0 && c <= 0) return t.copy(n);
		Td.subVectors(e, r);
		let l = xd.dot(Td), u = Sd.dot(Td);
		if (l >= 0 && u <= l) return t.copy(r);
		let d = s * u - l * c;
		if (d <= 0 && s >= 0 && l <= 0) return a = s / (s - l), t.copy(n).addScaledVector(xd, a);
		Ed.subVectors(e, i);
		let f = xd.dot(Ed), p = Sd.dot(Ed);
		if (p >= 0 && f <= p) return t.copy(i);
		let m = f * c - s * p;
		if (m <= 0 && c >= 0 && p <= 0) return o = c / (c - p), t.copy(n).addScaledVector(Sd, o);
		let h = l * p - f * u;
		if (h <= 0 && u - l >= 0 && f - p >= 0) return Cd.subVectors(i, r), o = (u - l) / (u - l + (f - p)), t.copy(r).addScaledVector(Cd, o);
		let g = 1 / (h + m + d);
		return a = m * g, o = d * g, t.copy(n).addScaledVector(xd, a).addScaledVector(Sd, o);
	}
	equals(e) {
		return e.a.equals(this.a) && e.b.equals(this.b) && e.c.equals(this.c);
	}
}, jd = class {
	constructor(e = new q(Infinity, Infinity, Infinity), t = new q(-Infinity, -Infinity, -Infinity)) {
		this.isBox3 = !0, this.min = e, this.max = t;
	}
	set(e, t) {
		return this.min.copy(e), this.max.copy(t), this;
	}
	setFromArray(e) {
		this.makeEmpty();
		for (let t = 0, n = e.length; t < n; t += 3) this.expandByPoint(Nd.fromArray(e, t));
		return this;
	}
	setFromBufferAttribute(e) {
		this.makeEmpty();
		for (let t = 0, n = e.count; t < n; t++) this.expandByPoint(Nd.fromBufferAttribute(e, t));
		return this;
	}
	setFromPoints(e) {
		this.makeEmpty();
		for (let t = 0, n = e.length; t < n; t++) this.expandByPoint(e[t]);
		return this;
	}
	setFromCenterAndSize(e, t) {
		let n = Nd.copy(t).multiplyScalar(.5);
		return this.min.copy(e).sub(n), this.max.copy(e).add(n), this;
	}
	setFromObject(e, t = !1) {
		return this.makeEmpty(), this.expandByObject(e, t);
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		return this.min.copy(e.min), this.max.copy(e.max), this;
	}
	makeEmpty() {
		return this.min.x = this.min.y = this.min.z = Infinity, this.max.x = this.max.y = this.max.z = -Infinity, this;
	}
	isEmpty() {
		return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
	}
	getCenter(e) {
		return this.isEmpty() ? e.set(0, 0, 0) : e.addVectors(this.min, this.max).multiplyScalar(.5);
	}
	getSize(e) {
		return this.isEmpty() ? e.set(0, 0, 0) : e.subVectors(this.max, this.min);
	}
	expandByPoint(e) {
		return this.min.min(e), this.max.max(e), this;
	}
	expandByVector(e) {
		return this.min.sub(e), this.max.add(e), this;
	}
	expandByScalar(e) {
		return this.min.addScalar(-e), this.max.addScalar(e), this;
	}
	expandByObject(e, t = !1) {
		e.updateWorldMatrix(!1, !1);
		let n = e.geometry;
		if (n !== void 0) {
			let r = n.getAttribute("position");
			if (t === !0 && r !== void 0 && e.isInstancedMesh !== !0) for (let t = 0, n = r.count; t < n; t++) e.isMesh === !0 ? e.getVertexPosition(t, Nd) : Nd.fromBufferAttribute(r, t), Nd.applyMatrix4(e.matrixWorld), this.expandByPoint(Nd);
			else e.boundingBox === void 0 ? (n.boundingBox === null && n.computeBoundingBox(), Pd.copy(n.boundingBox)) : (e.boundingBox === null && e.computeBoundingBox(), Pd.copy(e.boundingBox)), Pd.applyMatrix4(e.matrixWorld), this.union(Pd);
		}
		let r = e.children;
		for (let e = 0, n = r.length; e < n; e++) this.expandByObject(r[e], t);
		return this;
	}
	containsPoint(e) {
		return e.x >= this.min.x && e.x <= this.max.x && e.y >= this.min.y && e.y <= this.max.y && e.z >= this.min.z && e.z <= this.max.z;
	}
	containsBox(e) {
		return this.min.x <= e.min.x && e.max.x <= this.max.x && this.min.y <= e.min.y && e.max.y <= this.max.y && this.min.z <= e.min.z && e.max.z <= this.max.z;
	}
	getParameter(e, t) {
		return t.set((e.x - this.min.x) / (this.max.x - this.min.x), (e.y - this.min.y) / (this.max.y - this.min.y), (e.z - this.min.z) / (this.max.z - this.min.z));
	}
	intersectsBox(e) {
		return e.max.x >= this.min.x && e.min.x <= this.max.x && e.max.y >= this.min.y && e.min.y <= this.max.y && e.max.z >= this.min.z && e.min.z <= this.max.z;
	}
	intersectsSphere(e) {
		return this.clampPoint(e.center, Nd), Nd.distanceToSquared(e.center) <= e.radius * e.radius;
	}
	intersectsPlane(e) {
		let t, n;
		return e.normal.x > 0 ? (t = e.normal.x * this.min.x, n = e.normal.x * this.max.x) : (t = e.normal.x * this.max.x, n = e.normal.x * this.min.x), e.normal.y > 0 ? (t += e.normal.y * this.min.y, n += e.normal.y * this.max.y) : (t += e.normal.y * this.max.y, n += e.normal.y * this.min.y), e.normal.z > 0 ? (t += e.normal.z * this.min.z, n += e.normal.z * this.max.z) : (t += e.normal.z * this.max.z, n += e.normal.z * this.min.z), t <= -e.constant && n >= -e.constant;
	}
	intersectsTriangle(e) {
		if (this.isEmpty()) return !1;
		this.getCenter(Vd), Hd.subVectors(this.max, Vd), Fd.subVectors(e.a, Vd), Id.subVectors(e.b, Vd), Ld.subVectors(e.c, Vd), Rd.subVectors(Id, Fd), zd.subVectors(Ld, Id), Bd.subVectors(Fd, Ld);
		let t = [
			0,
			-Rd.z,
			Rd.y,
			0,
			-zd.z,
			zd.y,
			0,
			-Bd.z,
			Bd.y,
			Rd.z,
			0,
			-Rd.x,
			zd.z,
			0,
			-zd.x,
			Bd.z,
			0,
			-Bd.x,
			-Rd.y,
			Rd.x,
			0,
			-zd.y,
			zd.x,
			0,
			-Bd.y,
			Bd.x,
			0
		];
		return !Gd(t, Fd, Id, Ld, Hd) || (t = [
			1,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			1
		], !Gd(t, Fd, Id, Ld, Hd)) ? !1 : (Ud.crossVectors(Rd, zd), t = [
			Ud.x,
			Ud.y,
			Ud.z
		], Gd(t, Fd, Id, Ld, Hd));
	}
	clampPoint(e, t) {
		return t.copy(e).clamp(this.min, this.max);
	}
	distanceToPoint(e) {
		return this.clampPoint(e, Nd).distanceTo(e);
	}
	getBoundingSphere(e) {
		return this.isEmpty() ? e.makeEmpty() : (this.getCenter(e.center), e.radius = this.getSize(Nd).length() * .5), e;
	}
	intersect(e) {
		return this.min.max(e.min), this.max.min(e.max), this.isEmpty() && this.makeEmpty(), this;
	}
	union(e) {
		return this.min.min(e.min), this.max.max(e.max), this;
	}
	applyMatrix4(e) {
		return this.isEmpty() || (Md[0].set(this.min.x, this.min.y, this.min.z).applyMatrix4(e), Md[1].set(this.min.x, this.min.y, this.max.z).applyMatrix4(e), Md[2].set(this.min.x, this.max.y, this.min.z).applyMatrix4(e), Md[3].set(this.min.x, this.max.y, this.max.z).applyMatrix4(e), Md[4].set(this.max.x, this.min.y, this.min.z).applyMatrix4(e), Md[5].set(this.max.x, this.min.y, this.max.z).applyMatrix4(e), Md[6].set(this.max.x, this.max.y, this.min.z).applyMatrix4(e), Md[7].set(this.max.x, this.max.y, this.max.z).applyMatrix4(e), this.setFromPoints(Md)), this;
	}
	translate(e) {
		return this.min.add(e), this.max.add(e), this;
	}
	equals(e) {
		return e.min.equals(this.min) && e.max.equals(this.max);
	}
	toJSON() {
		return {
			min: this.min.toArray(),
			max: this.max.toArray()
		};
	}
	fromJSON(e) {
		return this.min.fromArray(e.min), this.max.fromArray(e.max), this;
	}
}, Md = [
	/*@__PURE__*/ new q(),
	/*@__PURE__*/ new q(),
	/*@__PURE__*/ new q(),
	/*@__PURE__*/ new q(),
	/*@__PURE__*/ new q(),
	/*@__PURE__*/ new q(),
	/*@__PURE__*/ new q(),
	/*@__PURE__*/ new q()
], Nd = /*@__PURE__*/ new q(), Pd = /*@__PURE__*/ new jd(), Fd = /*@__PURE__*/ new q(), Id = /*@__PURE__*/ new q(), Ld = /*@__PURE__*/ new q(), Rd = /*@__PURE__*/ new q(), zd = /*@__PURE__*/ new q(), Bd = /*@__PURE__*/ new q(), Vd = /*@__PURE__*/ new q(), Hd = /*@__PURE__*/ new q(), Ud = /*@__PURE__*/ new q(), Wd = /*@__PURE__*/ new q();
function Gd(e, t, n, r, i) {
	for (let a = 0, o = e.length - 3; a <= o; a += 3) {
		Wd.fromArray(e, a);
		let o = i.x * Math.abs(Wd.x) + i.y * Math.abs(Wd.y) + i.z * Math.abs(Wd.z), s = t.dot(Wd), c = n.dot(Wd), l = r.dot(Wd);
		if (Math.max(-Math.max(s, c, l), Math.min(s, c, l)) > o) return !1;
	}
	return !0;
}
var Kd = /*@__PURE__*/ new q(), qd = /*@__PURE__*/ new K(), Jd = 0, Yd = class extends zl {
	constructor(e, t, n = !1) {
		if (super(), Array.isArray(e)) throw TypeError("THREE.BufferAttribute: array should be a Typed Array.");
		this.isBufferAttribute = !0, Object.defineProperty(this, "id", { value: Jd++ }), this.name = "", this.array = e, this.itemSize = t, this.count = e === void 0 ? 0 : e.length / t, this.normalized = n, this.usage = Tl, this.updateRanges = [], this.gpuType = pc, this.version = 0;
	}
	onUploadCallback() {}
	set needsUpdate(e) {
		e === !0 && this.version++;
	}
	setUsage(e) {
		return this.usage = e, this;
	}
	addUpdateRange(e, t) {
		this.updateRanges.push({
			start: e,
			count: t
		});
	}
	clearUpdateRanges() {
		this.updateRanges.length = 0;
	}
	copy(e) {
		return this.name = e.name, this.array = new e.array.constructor(e.array), this.itemSize = e.itemSize, this.count = e.count, this.normalized = e.normalized, this.usage = e.usage, this.gpuType = e.gpuType, this;
	}
	copyAt(e, t, n) {
		e *= this.itemSize, n *= t.itemSize;
		for (let r = 0, i = this.itemSize; r < i; r++) this.array[e + r] = t.array[n + r];
		return this;
	}
	copyArray(e) {
		return this.array.set(e), this;
	}
	applyMatrix3(e) {
		if (this.itemSize === 2) for (let t = 0, n = this.count; t < n; t++) qd.fromBufferAttribute(this, t), qd.applyMatrix3(e), this.setXY(t, qd.x, qd.y);
		else if (this.itemSize === 3) for (let t = 0, n = this.count; t < n; t++) Kd.fromBufferAttribute(this, t), Kd.applyMatrix3(e), this.setXYZ(t, Kd.x, Kd.y, Kd.z);
		return this;
	}
	applyMatrix4(e) {
		for (let t = 0, n = this.count; t < n; t++) Kd.fromBufferAttribute(this, t), Kd.applyMatrix4(e), this.setXYZ(t, Kd.x, Kd.y, Kd.z);
		return this;
	}
	applyNormalMatrix(e) {
		for (let t = 0, n = this.count; t < n; t++) Kd.fromBufferAttribute(this, t), Kd.applyNormalMatrix(e), this.setXYZ(t, Kd.x, Kd.y, Kd.z);
		return this;
	}
	transformDirection(e) {
		for (let t = 0, n = this.count; t < n; t++) Kd.fromBufferAttribute(this, t), Kd.transformDirection(e), this.setXYZ(t, Kd.x, Kd.y, Kd.z);
		return this;
	}
	set(e, t = 0) {
		return this.array.set(e, t), this;
	}
	getComponent(e, t) {
		let n = this.array[e * this.itemSize + t];
		return this.normalized && (n = lu(n, this.array)), n;
	}
	setComponent(e, t, n) {
		return this.normalized && (n = uu(n, this.array)), this.array[e * this.itemSize + t] = n, this;
	}
	getX(e) {
		let t = this.array[e * this.itemSize];
		return this.normalized && (t = lu(t, this.array)), t;
	}
	setX(e, t) {
		return this.normalized && (t = uu(t, this.array)), this.array[e * this.itemSize] = t, this;
	}
	getY(e) {
		let t = this.array[e * this.itemSize + 1];
		return this.normalized && (t = lu(t, this.array)), t;
	}
	setY(e, t) {
		return this.normalized && (t = uu(t, this.array)), this.array[e * this.itemSize + 1] = t, this;
	}
	getZ(e) {
		let t = this.array[e * this.itemSize + 2];
		return this.normalized && (t = lu(t, this.array)), t;
	}
	setZ(e, t) {
		return this.normalized && (t = uu(t, this.array)), this.array[e * this.itemSize + 2] = t, this;
	}
	getW(e) {
		let t = this.array[e * this.itemSize + 3];
		return this.normalized && (t = lu(t, this.array)), t;
	}
	setW(e, t) {
		return this.normalized && (t = uu(t, this.array)), this.array[e * this.itemSize + 3] = t, this;
	}
	setXY(e, t, n) {
		return e *= this.itemSize, this.normalized && (t = uu(t, this.array), n = uu(n, this.array)), this.array[e + 0] = t, this.array[e + 1] = n, this;
	}
	setXYZ(e, t, n, r) {
		return e *= this.itemSize, this.normalized && (t = uu(t, this.array), n = uu(n, this.array), r = uu(r, this.array)), this.array[e + 0] = t, this.array[e + 1] = n, this.array[e + 2] = r, this;
	}
	setXYZW(e, t, n, r, i) {
		return e *= this.itemSize, this.normalized && (t = uu(t, this.array), n = uu(n, this.array), r = uu(r, this.array), i = uu(i, this.array)), this.array[e + 0] = t, this.array[e + 1] = n, this.array[e + 2] = r, this.array[e + 3] = i, this;
	}
	onUpload(e) {
		return this.onUploadCallback = e, this;
	}
	clone() {
		return new this.constructor(this.array, this.itemSize).copy(this);
	}
	toJSON() {
		let e = {
			itemSize: this.itemSize,
			type: this.array.constructor.name,
			array: Array.from(this.array),
			normalized: this.normalized
		};
		return e.name = this.name, e.usage = this.usage, e.gpuType = this.gpuType, e;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
}, Xd = class extends Yd {
	constructor(e, t, n) {
		super(new Uint16Array(e), t, n);
	}
}, Zd = class extends Yd {
	constructor(e, t, n) {
		super(new Uint32Array(e), t, n);
	}
}, Qd = class extends Yd {
	constructor(e, t, n) {
		super(new Float32Array(e), t, n);
	}
}, $d = /*@__PURE__*/ new jd(), ef = /*@__PURE__*/ new q(), tf = /*@__PURE__*/ new q(), nf = class {
	constructor(e = new q(), t = -1) {
		this.isSphere = !0, this.center = e, this.radius = t;
	}
	set(e, t) {
		return this.center.copy(e), this.radius = t, this;
	}
	setFromPoints(e, t) {
		let n = this.center;
		t === void 0 ? $d.setFromPoints(e).getCenter(n) : n.copy(t);
		let r = 0;
		for (let t = 0, i = e.length; t < i; t++) r = Math.max(r, n.distanceToSquared(e[t]));
		return this.radius = Math.sqrt(r), this;
	}
	copy(e) {
		return this.center.copy(e.center), this.radius = e.radius, this;
	}
	isEmpty() {
		return this.radius < 0;
	}
	makeEmpty() {
		return this.center.set(0, 0, 0), this.radius = -1, this;
	}
	containsPoint(e) {
		return e.distanceToSquared(this.center) <= this.radius * this.radius;
	}
	distanceToPoint(e) {
		return e.distanceTo(this.center) - this.radius;
	}
	intersectsSphere(e) {
		let t = this.radius + e.radius;
		return e.center.distanceToSquared(this.center) <= t * t;
	}
	intersectsBox(e) {
		return e.intersectsSphere(this);
	}
	intersectsPlane(e) {
		return Math.abs(e.distanceToPoint(this.center)) <= this.radius;
	}
	clampPoint(e, t) {
		let n = this.center.distanceToSquared(e);
		return t.copy(e), n > this.radius * this.radius && (t.sub(this.center).normalize(), t.multiplyScalar(this.radius).add(this.center)), t;
	}
	getBoundingBox(e) {
		return this.isEmpty() ? (e.makeEmpty(), e) : (e.set(this.center, this.center), e.expandByScalar(this.radius), e);
	}
	applyMatrix4(e) {
		return this.center.applyMatrix4(e), this.radius *= e.getMaxScaleOnAxis(), this;
	}
	translate(e) {
		return this.center.add(e), this;
	}
	expandByPoint(e) {
		if (this.isEmpty()) return this.center.copy(e), this.radius = 0, this;
		ef.subVectors(e, this.center);
		let t = ef.lengthSq();
		if (t > this.radius * this.radius) {
			let e = Math.sqrt(t), n = (e - this.radius) * .5;
			this.center.addScaledVector(ef, n / e), this.radius += n;
		}
		return this;
	}
	union(e) {
		return e.isEmpty() ? this : this.isEmpty() ? (this.copy(e), this) : (this.center.equals(e.center) === !0 ? this.radius = Math.max(this.radius, e.radius) : (tf.subVectors(e.center, this.center).setLength(e.radius), this.expandByPoint(ef.copy(e.center).add(tf)), this.expandByPoint(ef.copy(e.center).sub(tf))), this);
	}
	equals(e) {
		return e.center.equals(this.center) && e.radius === this.radius;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	toJSON() {
		return {
			radius: this.radius,
			center: this.center.toArray()
		};
	}
	fromJSON(e) {
		return this.radius = e.radius, this.center.fromArray(e.center), this;
	}
}, rf = 0, af = /*@__PURE__*/ new Pu(), of = /*@__PURE__*/ new sd(), sf = /*@__PURE__*/ new q(), cf = /*@__PURE__*/ new jd(), lf = /*@__PURE__*/ new jd(), uf = /*@__PURE__*/ new q(), df = class e extends zl {
	constructor() {
		super(), this.isBufferGeometry = !0, Object.defineProperty(this, "id", { value: rf++ }), this.uuid = Wl(), this.name = "", this.type = "BufferGeometry", this.index = null, this.indirect = null, this.indirectOffset = 0, this.attributes = {}, this.morphAttributes = {}, this.morphTargetsRelative = !1, this.groups = [], this.boundingBox = null, this.boundingSphere = null, this.drawRange = {
			start: 0,
			count: Infinity
		}, this.userData = {}, this._transformed = !1;
	}
	getIndex() {
		return this.index;
	}
	setIndex(e) {
		return this.index = Array.isArray(e) ? new (kl(e) ? Zd : Xd)(e, 1) : e, this;
	}
	setIndirect(e, t = 0) {
		return this.indirect = e, this.indirectOffset = t, this;
	}
	getIndirect() {
		return this.indirect;
	}
	getAttribute(e) {
		return this.attributes[e];
	}
	setAttribute(e, t) {
		return this.attributes[e] = t, this;
	}
	deleteAttribute(e) {
		return delete this.attributes[e], this;
	}
	hasAttribute(e) {
		return this.attributes[e] !== void 0;
	}
	addGroup(e, t, n = 0) {
		this.groups.push({
			start: e,
			count: t,
			materialIndex: n
		});
	}
	clearGroups() {
		this.groups = [];
	}
	setDrawRange(e, t) {
		this.drawRange.start = e, this.drawRange.count = t;
	}
	applyMatrix4(e) {
		let t = this.attributes.position;
		t !== void 0 && (t.applyMatrix4(e), t.needsUpdate = !0);
		let n = this.attributes.normal;
		if (n !== void 0) {
			let t = new J().getNormalMatrix(e);
			n.applyNormalMatrix(t), n.needsUpdate = !0;
		}
		let r = this.attributes.tangent;
		return r !== void 0 && (r.transformDirection(e), r.needsUpdate = !0), this.boundingBox !== null && this.computeBoundingBox(), this.boundingSphere !== null && this.computeBoundingSphere(), this._transformed = !0, this;
	}
	applyQuaternion(e) {
		return af.makeRotationFromQuaternion(e), this.applyMatrix4(af), this;
	}
	rotateX(e) {
		return af.makeRotationX(e), this.applyMatrix4(af), this;
	}
	rotateY(e) {
		return af.makeRotationY(e), this.applyMatrix4(af), this;
	}
	rotateZ(e) {
		return af.makeRotationZ(e), this.applyMatrix4(af), this;
	}
	translate(e, t, n) {
		return af.makeTranslation(e, t, n), this.applyMatrix4(af), this;
	}
	scale(e, t, n) {
		return af.makeScale(e, t, n), this.applyMatrix4(af), this;
	}
	lookAt(e) {
		return of.lookAt(e), of.updateMatrix(), this.applyMatrix4(of.matrix), this;
	}
	center() {
		return this.computeBoundingBox(), this.boundingBox.getCenter(sf).negate(), this.translate(sf.x, sf.y, sf.z), this;
	}
	setFromPoints(e) {
		let t = this.getAttribute("position");
		if (t === void 0) {
			let t = [];
			for (let n = 0, r = e.length; n < r; n++) {
				let r = e[n];
				t.push(r.x, r.y, r.z || 0);
			}
			this.setAttribute("position", new Qd(t, 3));
		} else {
			let n = Math.min(e.length, t.count);
			for (let r = 0; r < n; r++) {
				let n = e[r];
				t.setXYZ(r, n.x, n.y, n.z || 0);
			}
			e.length > t.count && U("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."), t.needsUpdate = !0;
		}
		return this;
	}
	computeBoundingBox() {
		this.boundingBox === null && (this.boundingBox = new jd());
		let e = this.attributes.position, t = this.morphAttributes.position;
		if (e && e.isGLBufferAttribute) W("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.", this), this.boundingBox.set(new q(-Infinity, -Infinity, -Infinity), new q(Infinity, Infinity, Infinity));
		else {
			if (e !== void 0) {
				if (this.boundingBox.setFromBufferAttribute(e), t) for (let e = 0, n = t.length; e < n; e++) {
					let n = t[e];
					cf.setFromBufferAttribute(n), this.morphTargetsRelative ? (uf.addVectors(this.boundingBox.min, cf.min), this.boundingBox.expandByPoint(uf), uf.addVectors(this.boundingBox.max, cf.max), this.boundingBox.expandByPoint(uf)) : (this.boundingBox.expandByPoint(cf.min), this.boundingBox.expandByPoint(cf.max));
				}
			} else this.boundingBox.makeEmpty();
			(isNaN(this.boundingBox.min.x) || isNaN(this.boundingBox.min.y) || isNaN(this.boundingBox.min.z)) && W("BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The \"position\" attribute is likely to have NaN values.", this);
		}
	}
	computeBoundingSphere() {
		this.boundingSphere === null && (this.boundingSphere = new nf());
		let e = this.attributes.position, t = this.morphAttributes.position;
		if (e && e.isGLBufferAttribute) W("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.", this), this.boundingSphere.set(new q(), Infinity);
		else if (e) {
			let n = this.boundingSphere.center;
			if (cf.setFromBufferAttribute(e), t) for (let e = 0, n = t.length; e < n; e++) {
				let n = t[e];
				lf.setFromBufferAttribute(n), this.morphTargetsRelative ? (uf.addVectors(cf.min, lf.min), cf.expandByPoint(uf), uf.addVectors(cf.max, lf.max), cf.expandByPoint(uf)) : (cf.expandByPoint(lf.min), cf.expandByPoint(lf.max));
			}
			cf.getCenter(n);
			let r = 0;
			for (let t = 0, i = e.count; t < i; t++) uf.fromBufferAttribute(e, t), r = Math.max(r, n.distanceToSquared(uf));
			if (t) for (let i = 0, a = t.length; i < a; i++) {
				let a = t[i], o = this.morphTargetsRelative;
				for (let t = 0, i = a.count; t < i; t++) uf.fromBufferAttribute(a, t), o && (sf.fromBufferAttribute(e, t), uf.add(sf)), r = Math.max(r, n.distanceToSquared(uf));
			}
			this.boundingSphere.radius = Math.sqrt(r), isNaN(this.boundingSphere.radius) && W("BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The \"position\" attribute is likely to have NaN values.", this);
		}
	}
	computeTangents() {
		let e = this.index, t = this.attributes;
		if (e === null || t.position === void 0 || t.normal === void 0 || t.uv === void 0) {
			W("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");
			return;
		}
		let n = t.position, r = t.normal, i = t.uv, a = this.getAttribute("tangent");
		(a === void 0 || a.count !== n.count) && (a = new Yd(new Float32Array(4 * n.count), 4), this.setAttribute("tangent", a));
		let o = [], s = [];
		for (let e = 0; e < n.count; e++) o[e] = new q(), s[e] = new q();
		let c = new q(), l = new q(), u = new q(), d = new K(), f = new K(), p = new K(), m = new q(), h = new q();
		function g(e, t, r) {
			c.fromBufferAttribute(n, e), l.fromBufferAttribute(n, t), u.fromBufferAttribute(n, r), d.fromBufferAttribute(i, e), f.fromBufferAttribute(i, t), p.fromBufferAttribute(i, r), l.sub(c), u.sub(c), f.sub(d), p.sub(d);
			let a = 1 / (f.x * p.y - p.x * f.y);
			isFinite(a) && (m.copy(l).multiplyScalar(p.y).addScaledVector(u, -f.y).multiplyScalar(a), h.copy(u).multiplyScalar(f.x).addScaledVector(l, -p.x).multiplyScalar(a), o[e].add(m), o[t].add(m), o[r].add(m), s[e].add(h), s[t].add(h), s[r].add(h));
		}
		let _ = this.groups;
		_.length === 0 && (_ = [{
			start: 0,
			count: e.count
		}]);
		for (let t = 0, n = _.length; t < n; ++t) {
			let n = _[t], r = n.start, i = n.count;
			for (let t = r, n = r + i; t < n; t += 3) g(e.getX(t + 0), e.getX(t + 1), e.getX(t + 2));
		}
		let v = new q(), y = new q(), b = new q(), x = new q();
		function S(e) {
			b.fromBufferAttribute(r, e), x.copy(b);
			let t = o[e];
			v.copy(t), v.sub(b.multiplyScalar(b.dot(t))).normalize(), y.crossVectors(x, t);
			let n = y.dot(s[e]) < 0 ? -1 : 1;
			a.setXYZW(e, v.x, v.y, v.z, n);
		}
		for (let t = 0, n = _.length; t < n; ++t) {
			let n = _[t], r = n.start, i = n.count;
			for (let t = r, n = r + i; t < n; t += 3) S(e.getX(t + 0)), S(e.getX(t + 1)), S(e.getX(t + 2));
		}
		this._transformed = !0;
	}
	computeVertexNormals() {
		let e = this.index, t = this.getAttribute("position");
		if (t !== void 0) {
			let n = this.getAttribute("normal");
			if (n === void 0 || n.count !== t.count) n = new Yd(new Float32Array(t.count * 3), 3), this.setAttribute("normal", n);
			else for (let e = 0, t = n.count; e < t; e++) n.setXYZ(e, 0, 0, 0);
			let r = new q(), i = new q(), a = new q(), o = new q(), s = new q(), c = new q(), l = new q(), u = new q();
			if (e) for (let d = 0, f = e.count; d < f; d += 3) {
				let f = e.getX(d + 0), p = e.getX(d + 1), m = e.getX(d + 2);
				r.fromBufferAttribute(t, f), i.fromBufferAttribute(t, p), a.fromBufferAttribute(t, m), l.subVectors(a, i), u.subVectors(r, i), l.cross(u), o.fromBufferAttribute(n, f), s.fromBufferAttribute(n, p), c.fromBufferAttribute(n, m), o.add(l), s.add(l), c.add(l), n.setXYZ(f, o.x, o.y, o.z), n.setXYZ(p, s.x, s.y, s.z), n.setXYZ(m, c.x, c.y, c.z);
			}
			else for (let e = 0, o = t.count; e < o; e += 3) r.fromBufferAttribute(t, e + 0), i.fromBufferAttribute(t, e + 1), a.fromBufferAttribute(t, e + 2), l.subVectors(a, i), u.subVectors(r, i), l.cross(u), n.setXYZ(e + 0, l.x, l.y, l.z), n.setXYZ(e + 1, l.x, l.y, l.z), n.setXYZ(e + 2, l.x, l.y, l.z);
			this.normalizeNormals(), n.needsUpdate = !0;
		}
	}
	normalizeNormals() {
		let e = this.attributes.normal;
		for (let t = 0, n = e.count; t < n; t++) uf.fromBufferAttribute(e, t), uf.normalize(), e.setXYZ(t, uf.x, uf.y, uf.z);
	}
	toNonIndexed() {
		function t(e, t) {
			let n = e.array, r = e.itemSize, i = e.normalized, a = new n.constructor(t.length * r), o = 0, s = 0;
			for (let i = 0, c = t.length; i < c; i++) {
				o = e.isInterleavedBufferAttribute ? t[i] * e.data.stride + e.offset : t[i] * r;
				for (let e = 0; e < r; e++) a[s++] = n[o++];
			}
			return new Yd(a, r, i);
		}
		if (this.index === null) return U("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."), this;
		let n = new e(), r = this.index.array, i = this.attributes;
		for (let e in i) {
			let a = i[e], o = t(a, r);
			n.setAttribute(e, o);
		}
		let a = this.morphAttributes;
		for (let e in a) {
			let i = [], o = a[e];
			for (let e = 0, n = o.length; e < n; e++) {
				let n = o[e], a = t(n, r);
				i.push(a);
			}
			n.morphAttributes[e] = i;
		}
		n.morphTargetsRelative = this.morphTargetsRelative;
		let o = this.groups;
		for (let e = 0, t = o.length; e < t; e++) {
			let t = o[e];
			n.addGroup(t.start, t.count, t.materialIndex);
		}
		return n;
	}
	toJSON() {
		let e = { metadata: {
			version: 4.7,
			type: "BufferGeometry",
			generator: "BufferGeometry.toJSON"
		} };
		if (e.uuid = this.uuid, e.type = this.parameters !== void 0 && this._transformed === !0 ? "BufferGeometry" : this.type, e.name = this.name, Object.keys(this.userData).length > 0 && (e.userData = this.userData), this.parameters !== void 0 && this._transformed !== !0) {
			let t = this.parameters;
			for (let n in t) t[n] !== void 0 && (e[n] = t[n]);
			return e;
		}
		e.data = { attributes: {} };
		let t = this.index;
		t !== null && (e.data.index = {
			type: t.array.constructor.name,
			array: Array.prototype.slice.call(t.array)
		});
		let n = this.attributes;
		for (let t in n) {
			let r = n[t];
			e.data.attributes[t] = r.toJSON(e.data);
		}
		let r = {}, i = !1;
		for (let t in this.morphAttributes) {
			let n = this.morphAttributes[t], a = [];
			for (let t = 0, r = n.length; t < r; t++) {
				let r = n[t];
				a.push(r.toJSON(e.data));
			}
			a.length > 0 && (r[t] = a, i = !0);
		}
		i && (e.data.morphAttributes = r, e.data.morphTargetsRelative = this.morphTargetsRelative);
		let a = this.groups;
		a.length > 0 && (e.data.groups = JSON.parse(JSON.stringify(a)));
		let o = this.boundingSphere;
		return o !== null && (e.data.boundingSphere = o.toJSON()), e;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		this.index = null, this.attributes = {}, this.morphAttributes = {}, this.groups = [], this.boundingBox = null, this.boundingSphere = null;
		let t = {};
		this.name = e.name;
		let n = e.index;
		n !== null && this.setIndex(n.clone());
		let r = e.attributes;
		for (let e in r) {
			let n = r[e];
			this.setAttribute(e, n.clone(t));
		}
		let i = e.morphAttributes;
		for (let e in i) {
			let n = [], r = i[e];
			for (let e = 0, i = r.length; e < i; e++) n.push(r[e].clone(t));
			this.morphAttributes[e] = n;
		}
		this.morphTargetsRelative = e.morphTargetsRelative;
		let a = e.groups;
		for (let e = 0, t = a.length; e < t; e++) {
			let t = a[e];
			this.addGroup(t.start, t.count, t.materialIndex);
		}
		let o = e.boundingBox;
		o !== null && (this.boundingBox = o.clone());
		let s = e.boundingSphere;
		return s !== null && (this.boundingSphere = s.clone()), this.drawRange.start = e.drawRange.start, this.drawRange.count = e.drawRange.count, this.userData = e.userData, this._transformed = e._transformed, this;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
}, ff = /*@__PURE__*/ new q(), pf = /*@__PURE__*/ new q(), mf = /*@__PURE__*/ new J(), hf = class {
	constructor(e = new q(1, 0, 0), t = 0) {
		this.isPlane = !0, this.normal = e, this.constant = t;
	}
	set(e, t) {
		return this.normal.copy(e), this.constant = t, this;
	}
	setComponents(e, t, n, r) {
		return this.normal.set(e, t, n), this.constant = r, this;
	}
	setFromNormalAndCoplanarPoint(e, t) {
		return this.normal.copy(e), this.constant = -t.dot(this.normal), this;
	}
	setFromCoplanarPoints(e, t, n) {
		let r = ff.subVectors(n, t).cross(pf.subVectors(e, t)).normalize();
		return this.setFromNormalAndCoplanarPoint(r, e), this;
	}
	copy(e) {
		return this.normal.copy(e.normal), this.constant = e.constant, this;
	}
	normalize() {
		let e = 1 / this.normal.length();
		return this.normal.multiplyScalar(e), this.constant *= e, this;
	}
	negate() {
		return this.constant *= -1, this.normal.negate(), this;
	}
	distanceToPoint(e) {
		return this.normal.dot(e) + this.constant;
	}
	distanceToSphere(e) {
		return this.distanceToPoint(e.center) - e.radius;
	}
	projectPoint(e, t) {
		return t.copy(e).addScaledVector(this.normal, -this.distanceToPoint(e));
	}
	intersectLine(e, t, n = !0) {
		let r = e.delta(ff), i = this.normal.dot(r);
		if (i === 0) return this.distanceToPoint(e.start) === 0 ? t.copy(e.start) : null;
		let a = -(e.start.dot(this.normal) + this.constant) / i;
		return n === !0 && (a < 0 || a > 1) ? null : t.copy(e.start).addScaledVector(r, a);
	}
	intersectsLine(e) {
		let t = this.distanceToPoint(e.start), n = this.distanceToPoint(e.end);
		return t < 0 && n > 0 || n < 0 && t > 0;
	}
	intersectsBox(e) {
		return e.intersectsPlane(this);
	}
	intersectsSphere(e) {
		return e.intersectsPlane(this);
	}
	coplanarPoint(e) {
		return e.copy(this.normal).multiplyScalar(-this.constant);
	}
	applyMatrix4(e, t) {
		let n = t || mf.getNormalMatrix(e), r = this.coplanarPoint(ff).applyMatrix4(e), i = this.normal.applyMatrix3(n).normalize();
		return this.constant = -r.dot(i), this;
	}
	translate(e) {
		return this.constant -= e.dot(this.normal), this;
	}
	equals(e) {
		return e.normal.equals(this.normal) && e.constant === this.constant;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	toJSON() {
		return {
			normal: this.normal.toArray(),
			constant: this.constant
		};
	}
	fromJSON(e) {
		return this.normal.fromArray(e.normal), this.constant = e.constant, this;
	}
}, gf = 0, _f = class extends zl {
	constructor() {
		super(), this.isMaterial = !0, Object.defineProperty(this, "id", { value: gf++ }), this.uuid = Wl(), this.name = "", this.type = "Material", this.blending = 1, this.side = 0, this.vertexColors = !1, this.opacity = 1, this.transparent = !1, this.alphaHash = !1, this.blendSrc = 204, this.blendDst = 205, this.blendEquation = 100, this.blendSrcAlpha = null, this.blendDstAlpha = null, this.blendEquationAlpha = null, this.blendColor = new X(0, 0, 0), this.blendAlpha = 0, this.depthFunc = 3, this.depthTest = !0, this.depthWrite = !0, this.stencilWriteMask = 255, this.stencilFunc = 519, this.stencilRef = 0, this.stencilFuncMask = 255, this.stencilFail = wl, this.stencilZFail = wl, this.stencilZPass = wl, this.stencilWrite = !1, this.clippingPlanes = null, this.clipIntersection = !1, this.clipShadows = !1, this.shadowSide = null, this.colorWrite = !0, this.precision = null, this.polygonOffset = !1, this.polygonOffsetFactor = 0, this.polygonOffsetUnits = 0, this.dithering = !1, this.alphaToCoverage = !1, this.premultipliedAlpha = !1, this.forceSinglePass = !1, this.allowOverride = !0, this.visible = !0, this.toneMapped = !0, this.userData = {}, this.version = 0, this._alphaTest = 0;
	}
	get alphaTest() {
		return this._alphaTest;
	}
	set alphaTest(e) {
		this._alphaTest > 0 != e > 0 && this.version++, this._alphaTest = e;
	}
	onBeforeRender() {}
	onBeforeCompile() {}
	customProgramCacheKey() {
		return this.onBeforeCompile.toString();
	}
	setValues(e) {
		if (e !== void 0) for (let t in e) {
			let n = e[t];
			if (n === void 0) {
				U(`Material: parameter '${t}' has value of undefined.`);
				continue;
			}
			let r = this[t];
			r === void 0 ? U(`Material: '${t}' is not a property of THREE.${this.type}.`) : r && r.isColor ? r.set(n) : r && r.isVector2 && n && n.isVector2 || r && r.isEuler && n && n.isEuler || r && r.isVector3 && n && n.isVector3 ? r.copy(n) : this[t] = n;
		}
	}
	toJSON(e) {
		let t = e === void 0 || typeof e == "string";
		t && (e = {
			textures: {},
			images: {}
		});
		let n = { metadata: {
			version: 4.7,
			type: "Material",
			generator: "Material.toJSON"
		} };
		n.uuid = this.uuid, n.type = this.type, n.blending = this.blending, n.side = this.side, n.shadowSide = this.shadowSide, n.vertexColors = this.vertexColors, n.opacity = this.opacity, n.transparent = this.transparent, n.blendSrc = this.blendSrc, n.blendDst = this.blendDst, n.blendEquation = this.blendEquation, n.blendSrcAlpha = this.blendSrcAlpha, n.blendDstAlpha = this.blendDstAlpha, n.blendEquationAlpha = this.blendEquationAlpha, n.blendColor = this.blendColor.getHex(), n.blendAlpha = this.blendAlpha, n.depthFunc = this.depthFunc, n.depthTest = this.depthTest, n.depthWrite = this.depthWrite, n.colorWrite = this.colorWrite, n.clipIntersection = this.clipIntersection, n.clipShadows = this.clipShadows, n.stencilWriteMask = this.stencilWriteMask, n.stencilFunc = this.stencilFunc, n.stencilRef = this.stencilRef, n.stencilFuncMask = this.stencilFuncMask, n.stencilFail = this.stencilFail, n.stencilZFail = this.stencilZFail, n.stencilZPass = this.stencilZPass, n.stencilWrite = this.stencilWrite, n.polygonOffset = this.polygonOffset, n.polygonOffsetFactor = this.polygonOffsetFactor, n.polygonOffsetUnits = this.polygonOffsetUnits, n.dithering = this.dithering, n.alphaTest = this.alphaTest, n.alphaHash = this.alphaHash, n.alphaToCoverage = this.alphaToCoverage, n.premultipliedAlpha = this.premultipliedAlpha, n.forceSinglePass = this.forceSinglePass, n.allowOverride = this.allowOverride, n.visible = this.visible, n.toneMapped = this.toneMapped, n.name = this.name, this.color && this.color.isColor && (n.color = this.color.getHex()), this.roughness !== void 0 && (n.roughness = this.roughness), this.metalness !== void 0 && (n.metalness = this.metalness), this.sheen !== void 0 && (n.sheen = this.sheen), this.sheenColor && this.sheenColor.isColor && (n.sheenColor = this.sheenColor.getHex()), this.sheenRoughness !== void 0 && (n.sheenRoughness = this.sheenRoughness), this.emissive && this.emissive.isColor && (n.emissive = this.emissive.getHex()), this.emissiveIntensity !== void 0 && (n.emissiveIntensity = this.emissiveIntensity), this.specular && this.specular.isColor && (n.specular = this.specular.getHex()), this.specularIntensity !== void 0 && (n.specularIntensity = this.specularIntensity), this.specularColor && this.specularColor.isColor && (n.specularColor = this.specularColor.getHex()), this.shininess !== void 0 && (n.shininess = this.shininess), this.clearcoat !== void 0 && (n.clearcoat = this.clearcoat), this.clearcoatRoughness !== void 0 && (n.clearcoatRoughness = this.clearcoatRoughness), this.clearcoatMap && this.clearcoatMap.isTexture && (n.clearcoatMap = this.clearcoatMap.toJSON(e).uuid), this.clearcoatRoughnessMap && this.clearcoatRoughnessMap.isTexture && (n.clearcoatRoughnessMap = this.clearcoatRoughnessMap.toJSON(e).uuid), this.clearcoatNormalMap && this.clearcoatNormalMap.isTexture && (n.clearcoatNormalMap = this.clearcoatNormalMap.toJSON(e).uuid, n.clearcoatNormalScale = this.clearcoatNormalScale.toArray()), this.sheenColorMap && this.sheenColorMap.isTexture && (n.sheenColorMap = this.sheenColorMap.toJSON(e).uuid), this.sheenRoughnessMap && this.sheenRoughnessMap.isTexture && (n.sheenRoughnessMap = this.sheenRoughnessMap.toJSON(e).uuid), this.dispersion !== void 0 && (n.dispersion = this.dispersion), this.retroreflectivity !== void 0 && (n.retroreflectivity = this.retroreflectivity), this.iridescence !== void 0 && (n.iridescence = this.iridescence), this.iridescenceIOR !== void 0 && (n.iridescenceIOR = this.iridescenceIOR), this.iridescenceThicknessRange !== void 0 && (n.iridescenceThicknessRange = this.iridescenceThicknessRange), this.iridescenceMap && this.iridescenceMap.isTexture && (n.iridescenceMap = this.iridescenceMap.toJSON(e).uuid), this.iridescenceThicknessMap && this.iridescenceThicknessMap.isTexture && (n.iridescenceThicknessMap = this.iridescenceThicknessMap.toJSON(e).uuid), this.anisotropy !== void 0 && (n.anisotropy = this.anisotropy), this.anisotropyRotation !== void 0 && (n.anisotropyRotation = this.anisotropyRotation), this.anisotropyMap && this.anisotropyMap.isTexture && (n.anisotropyMap = this.anisotropyMap.toJSON(e).uuid), this.map && this.map.isTexture && (n.map = this.map.toJSON(e).uuid), this.matcap && this.matcap.isTexture && (n.matcap = this.matcap.toJSON(e).uuid), this.alphaMap && this.alphaMap.isTexture && (n.alphaMap = this.alphaMap.toJSON(e).uuid), this.lightMap && this.lightMap.isTexture && (n.lightMap = this.lightMap.toJSON(e).uuid, n.lightMapIntensity = this.lightMapIntensity), this.aoMap && this.aoMap.isTexture && (n.aoMap = this.aoMap.toJSON(e).uuid, n.aoMapIntensity = this.aoMapIntensity), this.bumpMap && this.bumpMap.isTexture && (n.bumpMap = this.bumpMap.toJSON(e).uuid, n.bumpScale = this.bumpScale), this.normalMap && this.normalMap.isTexture && (n.normalMap = this.normalMap.toJSON(e).uuid, n.normalMapType = this.normalMapType, n.normalScale = this.normalScale.toArray()), this.displacementMap && this.displacementMap.isTexture && (n.displacementMap = this.displacementMap.toJSON(e).uuid, n.displacementScale = this.displacementScale, n.displacementBias = this.displacementBias), this.roughnessMap && this.roughnessMap.isTexture && (n.roughnessMap = this.roughnessMap.toJSON(e).uuid), this.metalnessMap && this.metalnessMap.isTexture && (n.metalnessMap = this.metalnessMap.toJSON(e).uuid), this.emissiveMap && this.emissiveMap.isTexture && (n.emissiveMap = this.emissiveMap.toJSON(e).uuid), this.specularMap && this.specularMap.isTexture && (n.specularMap = this.specularMap.toJSON(e).uuid), this.specularIntensityMap && this.specularIntensityMap.isTexture && (n.specularIntensityMap = this.specularIntensityMap.toJSON(e).uuid), this.specularColorMap && this.specularColorMap.isTexture && (n.specularColorMap = this.specularColorMap.toJSON(e).uuid), this.envMap && this.envMap.isTexture && (n.envMap = this.envMap.toJSON(e).uuid, this.combine !== void 0 && (n.combine = this.combine)), this.envMapRotation !== void 0 && (n.envMapRotation = this.envMapRotation.toArray()), this.envMapIntensity !== void 0 && (n.envMapIntensity = this.envMapIntensity), this.reflectivity !== void 0 && (n.reflectivity = this.reflectivity), this.refractionRatio !== void 0 && (n.refractionRatio = this.refractionRatio), this.gradientMap && this.gradientMap.isTexture && (n.gradientMap = this.gradientMap.toJSON(e).uuid), this.transmission !== void 0 && (n.transmission = this.transmission), this.transmissionMap && this.transmissionMap.isTexture && (n.transmissionMap = this.transmissionMap.toJSON(e).uuid), this.thickness !== void 0 && (n.thickness = this.thickness), this.thicknessMap && this.thicknessMap.isTexture && (n.thicknessMap = this.thicknessMap.toJSON(e).uuid), this.attenuationDistance !== void 0 && (n.attenuationDistance = this.attenuationDistance), this.attenuationColor !== void 0 && (n.attenuationColor = this.attenuationColor.getHex()), this.size !== void 0 && (n.size = this.size), this.sizeAttenuation !== void 0 && (n.sizeAttenuation = this.sizeAttenuation), Array.isArray(this.clippingPlanes) && this.clippingPlanes.length > 0 && (n.clippingPlanes = this.clippingPlanes.map((e) => e.toJSON())), this.rotation !== void 0 && (n.rotation = this.rotation), this.depthPacking !== void 0 && (n.depthPacking = this.depthPacking), this.linewidth !== void 0 && (n.linewidth = this.linewidth), this.linecap !== void 0 && (n.linecap = this.linecap), this.linejoin !== void 0 && (n.linejoin = this.linejoin), this.dashSize !== void 0 && (n.dashSize = this.dashSize), this.gapSize !== void 0 && (n.gapSize = this.gapSize), this.scale !== void 0 && (n.scale = this.scale), this.wireframe !== void 0 && (n.wireframe = this.wireframe), this.wireframeLinewidth !== void 0 && (n.wireframeLinewidth = this.wireframeLinewidth), this.wireframeLinecap !== void 0 && (n.wireframeLinecap = this.wireframeLinecap), this.wireframeLinejoin !== void 0 && (n.wireframeLinejoin = this.wireframeLinejoin), this.flatShading !== void 0 && (n.flatShading = this.flatShading), this.fog !== void 0 && (n.fog = this.fog), Object.keys(this.userData).length > 0 && (n.userData = this.userData);
		function r(e) {
			let t = [];
			for (let n in e) {
				let r = e[n];
				delete r.metadata, t.push(r);
			}
			return t;
		}
		if (t) {
			let t = r(e.textures), i = r(e.images);
			t.length > 0 && (n.textures = t), i.length > 0 && (n.images = i);
		}
		return n;
	}
	fromJSON(e, t) {
		if (e.uuid !== void 0 && (this.uuid = e.uuid), e.name !== void 0 && (this.name = e.name), e.color !== void 0 && this.color !== void 0 && this.color.setHex(e.color), e.roughness !== void 0 && (this.roughness = e.roughness), e.metalness !== void 0 && (this.metalness = e.metalness), e.sheen !== void 0 && (this.sheen = e.sheen), e.sheenColor !== void 0 && (this.sheenColor = new X().setHex(e.sheenColor)), e.sheenRoughness !== void 0 && (this.sheenRoughness = e.sheenRoughness), e.emissive !== void 0 && this.emissive !== void 0 && this.emissive.setHex(e.emissive), e.specular !== void 0 && this.specular !== void 0 && this.specular.setHex(e.specular), e.specularIntensity !== void 0 && (this.specularIntensity = e.specularIntensity), e.specularColor !== void 0 && this.specularColor !== void 0 && this.specularColor.setHex(e.specularColor), e.shininess !== void 0 && (this.shininess = e.shininess), e.clearcoat !== void 0 && (this.clearcoat = e.clearcoat), e.clearcoatRoughness !== void 0 && (this.clearcoatRoughness = e.clearcoatRoughness), e.dispersion !== void 0 && (this.dispersion = e.dispersion), e.retroreflectivity !== void 0 && (this.retroreflectivity = e.retroreflectivity), e.iridescence !== void 0 && (this.iridescence = e.iridescence), e.iridescenceIOR !== void 0 && (this.iridescenceIOR = e.iridescenceIOR), e.iridescenceThicknessRange !== void 0 && (this.iridescenceThicknessRange = e.iridescenceThicknessRange), e.transmission !== void 0 && (this.transmission = e.transmission), e.thickness !== void 0 && (this.thickness = e.thickness), e.attenuationDistance !== void 0 && (this.attenuationDistance = e.attenuationDistance), e.attenuationColor !== void 0 && this.attenuationColor !== void 0 && this.attenuationColor.setHex(e.attenuationColor), e.anisotropy !== void 0 && (this.anisotropy = e.anisotropy), e.anisotropyRotation !== void 0 && (this.anisotropyRotation = e.anisotropyRotation), e.fog !== void 0 && (this.fog = e.fog), e.flatShading !== void 0 && (this.flatShading = e.flatShading), e.blending !== void 0 && (this.blending = e.blending), e.combine !== void 0 && (this.combine = e.combine), e.side !== void 0 && (this.side = e.side), e.shadowSide !== void 0 && (this.shadowSide = e.shadowSide), e.opacity !== void 0 && (this.opacity = e.opacity), e.transparent !== void 0 && (this.transparent = e.transparent), e.alphaTest !== void 0 && (this.alphaTest = e.alphaTest), e.alphaHash !== void 0 && (this.alphaHash = e.alphaHash), e.depthFunc !== void 0 && (this.depthFunc = e.depthFunc), e.depthTest !== void 0 && (this.depthTest = e.depthTest), e.depthWrite !== void 0 && (this.depthWrite = e.depthWrite), e.colorWrite !== void 0 && (this.colorWrite = e.colorWrite), e.clippingPlanes !== void 0 && (this.clippingPlanes = e.clippingPlanes.map((e) => new hf().fromJSON(e))), e.clipIntersection !== void 0 && (this.clipIntersection = e.clipIntersection), e.clipShadows !== void 0 && (this.clipShadows = e.clipShadows), e.depthPacking !== void 0 && (this.depthPacking = e.depthPacking), e.blendSrc !== void 0 && (this.blendSrc = e.blendSrc), e.blendDst !== void 0 && (this.blendDst = e.blendDst), e.blendEquation !== void 0 && (this.blendEquation = e.blendEquation), e.blendSrcAlpha !== void 0 && (this.blendSrcAlpha = e.blendSrcAlpha), e.blendDstAlpha !== void 0 && (this.blendDstAlpha = e.blendDstAlpha), e.blendEquationAlpha !== void 0 && (this.blendEquationAlpha = e.blendEquationAlpha), e.blendColor !== void 0 && this.blendColor !== void 0 && this.blendColor.setHex(e.blendColor), e.blendAlpha !== void 0 && (this.blendAlpha = e.blendAlpha), e.stencilWriteMask !== void 0 && (this.stencilWriteMask = e.stencilWriteMask), e.stencilFunc !== void 0 && (this.stencilFunc = e.stencilFunc), e.stencilRef !== void 0 && (this.stencilRef = e.stencilRef), e.stencilFuncMask !== void 0 && (this.stencilFuncMask = e.stencilFuncMask), e.stencilFail !== void 0 && (this.stencilFail = e.stencilFail), e.stencilZFail !== void 0 && (this.stencilZFail = e.stencilZFail), e.stencilZPass !== void 0 && (this.stencilZPass = e.stencilZPass), e.stencilWrite !== void 0 && (this.stencilWrite = e.stencilWrite), e.wireframe !== void 0 && (this.wireframe = e.wireframe), e.wireframeLinewidth !== void 0 && (this.wireframeLinewidth = e.wireframeLinewidth), e.wireframeLinecap !== void 0 && (this.wireframeLinecap = e.wireframeLinecap), e.wireframeLinejoin !== void 0 && (this.wireframeLinejoin = e.wireframeLinejoin), e.rotation !== void 0 && (this.rotation = e.rotation), e.linewidth !== void 0 && (this.linewidth = e.linewidth), e.linecap !== void 0 && (this.linecap = e.linecap), e.linejoin !== void 0 && (this.linejoin = e.linejoin), e.dashSize !== void 0 && (this.dashSize = e.dashSize), e.gapSize !== void 0 && (this.gapSize = e.gapSize), e.scale !== void 0 && (this.scale = e.scale), e.polygonOffset !== void 0 && (this.polygonOffset = e.polygonOffset), e.polygonOffsetFactor !== void 0 && (this.polygonOffsetFactor = e.polygonOffsetFactor), e.polygonOffsetUnits !== void 0 && (this.polygonOffsetUnits = e.polygonOffsetUnits), e.dithering !== void 0 && (this.dithering = e.dithering), e.alphaToCoverage !== void 0 && (this.alphaToCoverage = e.alphaToCoverage), e.premultipliedAlpha !== void 0 && (this.premultipliedAlpha = e.premultipliedAlpha), e.forceSinglePass !== void 0 && (this.forceSinglePass = e.forceSinglePass), e.allowOverride !== void 0 && (this.allowOverride = e.allowOverride), e.visible !== void 0 && (this.visible = e.visible), e.toneMapped !== void 0 && (this.toneMapped = e.toneMapped), e.userData !== void 0 && (this.userData = e.userData), e.vertexColors !== void 0 && (this.vertexColors = typeof e.vertexColors == "number" ? e.vertexColors > 0 : e.vertexColors), e.size !== void 0 && (this.size = e.size), e.sizeAttenuation !== void 0 && (this.sizeAttenuation = e.sizeAttenuation), e.map !== void 0 && (this.map = t[e.map] || null), e.matcap !== void 0 && (this.matcap = t[e.matcap] || null), e.alphaMap !== void 0 && (this.alphaMap = t[e.alphaMap] || null), e.bumpMap !== void 0 && (this.bumpMap = t[e.bumpMap] || null), e.bumpScale !== void 0 && (this.bumpScale = e.bumpScale), e.normalMap !== void 0 && (this.normalMap = t[e.normalMap] || null), e.normalMapType !== void 0 && (this.normalMapType = e.normalMapType), e.normalScale !== void 0) {
			let t = e.normalScale;
			Array.isArray(t) === !1 && (t = [t, t]), this.normalScale = new K().fromArray(t);
		}
		return e.displacementMap !== void 0 && (this.displacementMap = t[e.displacementMap] || null), e.displacementScale !== void 0 && (this.displacementScale = e.displacementScale), e.displacementBias !== void 0 && (this.displacementBias = e.displacementBias), e.roughnessMap !== void 0 && (this.roughnessMap = t[e.roughnessMap] || null), e.metalnessMap !== void 0 && (this.metalnessMap = t[e.metalnessMap] || null), e.emissiveMap !== void 0 && (this.emissiveMap = t[e.emissiveMap] || null), e.emissiveIntensity !== void 0 && (this.emissiveIntensity = e.emissiveIntensity), e.specularMap !== void 0 && (this.specularMap = t[e.specularMap] || null), e.specularIntensityMap !== void 0 && (this.specularIntensityMap = t[e.specularIntensityMap] || null), e.specularColorMap !== void 0 && (this.specularColorMap = t[e.specularColorMap] || null), e.envMap !== void 0 && (this.envMap = t[e.envMap] || null), e.envMapRotation !== void 0 && this.envMapRotation.fromArray(e.envMapRotation), e.envMapIntensity !== void 0 && (this.envMapIntensity = e.envMapIntensity), e.reflectivity !== void 0 && (this.reflectivity = e.reflectivity), e.refractionRatio !== void 0 && (this.refractionRatio = e.refractionRatio), e.lightMap !== void 0 && (this.lightMap = t[e.lightMap] || null), e.lightMapIntensity !== void 0 && (this.lightMapIntensity = e.lightMapIntensity), e.aoMap !== void 0 && (this.aoMap = t[e.aoMap] || null), e.aoMapIntensity !== void 0 && (this.aoMapIntensity = e.aoMapIntensity), e.gradientMap !== void 0 && (this.gradientMap = t[e.gradientMap] || null), e.clearcoatMap !== void 0 && (this.clearcoatMap = t[e.clearcoatMap] || null), e.clearcoatRoughnessMap !== void 0 && (this.clearcoatRoughnessMap = t[e.clearcoatRoughnessMap] || null), e.clearcoatNormalMap !== void 0 && (this.clearcoatNormalMap = t[e.clearcoatNormalMap] || null), e.clearcoatNormalScale !== void 0 && (this.clearcoatNormalScale = new K().fromArray(e.clearcoatNormalScale)), e.iridescenceMap !== void 0 && (this.iridescenceMap = t[e.iridescenceMap] || null), e.iridescenceThicknessMap !== void 0 && (this.iridescenceThicknessMap = t[e.iridescenceThicknessMap] || null), e.transmissionMap !== void 0 && (this.transmissionMap = t[e.transmissionMap] || null), e.thicknessMap !== void 0 && (this.thicknessMap = t[e.thicknessMap] || null), e.anisotropyMap !== void 0 && (this.anisotropyMap = t[e.anisotropyMap] || null), e.sheenColorMap !== void 0 && (this.sheenColorMap = t[e.sheenColorMap] || null), e.sheenRoughnessMap !== void 0 && (this.sheenRoughnessMap = t[e.sheenRoughnessMap] || null), this;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		this.name = e.name, this.blending = e.blending, this.side = e.side, this.vertexColors = e.vertexColors, this.opacity = e.opacity, this.transparent = e.transparent, this.blendSrc = e.blendSrc, this.blendDst = e.blendDst, this.blendEquation = e.blendEquation, this.blendSrcAlpha = e.blendSrcAlpha, this.blendDstAlpha = e.blendDstAlpha, this.blendEquationAlpha = e.blendEquationAlpha, this.blendColor.copy(e.blendColor), this.blendAlpha = e.blendAlpha, this.depthFunc = e.depthFunc, this.depthTest = e.depthTest, this.depthWrite = e.depthWrite, this.stencilWriteMask = e.stencilWriteMask, this.stencilFunc = e.stencilFunc, this.stencilRef = e.stencilRef, this.stencilFuncMask = e.stencilFuncMask, this.stencilFail = e.stencilFail, this.stencilZFail = e.stencilZFail, this.stencilZPass = e.stencilZPass, this.stencilWrite = e.stencilWrite;
		let t = e.clippingPlanes, n = null;
		if (t !== null) {
			let e = t.length;
			n = Array(e);
			for (let r = 0; r !== e; ++r) n[r] = t[r].clone();
		}
		return this.clippingPlanes = n, this.clipIntersection = e.clipIntersection, this.clipShadows = e.clipShadows, this.shadowSide = e.shadowSide, this.colorWrite = e.colorWrite, this.precision = e.precision, this.polygonOffset = e.polygonOffset, this.polygonOffsetFactor = e.polygonOffsetFactor, this.polygonOffsetUnits = e.polygonOffsetUnits, this.dithering = e.dithering, this.alphaTest = e.alphaTest, this.alphaHash = e.alphaHash, this.alphaToCoverage = e.alphaToCoverage, this.premultipliedAlpha = e.premultipliedAlpha, this.forceSinglePass = e.forceSinglePass, this.allowOverride = e.allowOverride, this.visible = e.visible, this.toneMapped = e.toneMapped, this.userData = JSON.parse(JSON.stringify(e.userData)), this;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
	set needsUpdate(e) {
		e === !0 && this.version++;
	}
}, vf = /*@__PURE__*/ new q(), yf = /*@__PURE__*/ new q(), bf = /*@__PURE__*/ new q(), xf = /*@__PURE__*/ new q(), Sf = class {
	constructor(e = new q(), t = new q(0, 0, -1)) {
		this.origin = e, this.direction = t;
	}
	set(e, t) {
		return this.origin.copy(e), this.direction.copy(t), this;
	}
	copy(e) {
		return this.origin.copy(e.origin), this.direction.copy(e.direction), this;
	}
	at(e, t) {
		return t.copy(this.origin).addScaledVector(this.direction, e);
	}
	lookAt(e) {
		return this.direction.copy(e).sub(this.origin).normalize(), this;
	}
	recast(e) {
		return this.origin.copy(this.at(e, vf)), this;
	}
	closestPointToPoint(e, t) {
		t.subVectors(e, this.origin);
		let n = t.dot(this.direction);
		return n < 0 ? t.copy(this.origin) : t.copy(this.origin).addScaledVector(this.direction, n);
	}
	distanceToPoint(e) {
		return Math.sqrt(this.distanceSqToPoint(e));
	}
	distanceSqToPoint(e) {
		let t = vf.subVectors(e, this.origin).dot(this.direction);
		return t < 0 ? this.origin.distanceToSquared(e) : (vf.copy(this.origin).addScaledVector(this.direction, t), vf.distanceToSquared(e));
	}
	distanceSqToSegment(e, t, n, r) {
		yf.copy(e).add(t).multiplyScalar(.5), bf.copy(t).sub(e).normalize(), xf.copy(this.origin).sub(yf);
		let i = e.distanceTo(t) * .5, a = -this.direction.dot(bf), o = xf.dot(this.direction), s = -xf.dot(bf), c = xf.lengthSq(), l = Math.abs(1 - a * a), u, d, f, p;
		if (l > 0) {
			if (u = a * s - o, d = a * o - s, p = i * l, u >= 0) {
				if (d >= -p) {
					if (d <= p) {
						let e = 1 / l;
						u *= e, d *= e, f = u * (u + a * d + 2 * o) + d * (a * u + d + 2 * s) + c;
					} else d = i, u = Math.max(0, -(a * d + o)), f = -u * u + d * (d + 2 * s) + c;
				} else d = -i, u = Math.max(0, -(a * d + o)), f = -u * u + d * (d + 2 * s) + c;
			} else d <= -p ? (u = Math.max(0, -(-a * i + o)), d = u > 0 ? -i : Math.min(Math.max(-i, -s), i), f = -u * u + d * (d + 2 * s) + c) : d <= p ? (u = 0, d = Math.min(Math.max(-i, -s), i), f = d * (d + 2 * s) + c) : (u = Math.max(0, -(a * i + o)), d = u > 0 ? i : Math.min(Math.max(-i, -s), i), f = -u * u + d * (d + 2 * s) + c);
		} else d = a > 0 ? -i : i, u = Math.max(0, -(a * d + o)), f = -u * u + d * (d + 2 * s) + c;
		return n && n.copy(this.origin).addScaledVector(this.direction, u), r && r.copy(yf).addScaledVector(bf, d), f;
	}
	intersectSphere(e, t) {
		if (e.radius < 0) return null;
		vf.subVectors(e.center, this.origin);
		let n = vf.dot(this.direction), r = vf.dot(vf) - n * n, i = e.radius * e.radius;
		if (r > i) return null;
		let a = Math.sqrt(i - r), o = n - a, s = n + a;
		return s < 0 ? null : o < 0 ? this.at(s, t) : this.at(o, t);
	}
	intersectsSphere(e) {
		return e.radius < 0 ? !1 : this.distanceSqToPoint(e.center) <= e.radius * e.radius;
	}
	distanceToPlane(e) {
		let t = e.normal.dot(this.direction);
		if (t === 0) return e.distanceToPoint(this.origin) === 0 ? 0 : null;
		let n = -(this.origin.dot(e.normal) + e.constant) / t;
		return n >= 0 ? n : null;
	}
	intersectPlane(e, t) {
		let n = this.distanceToPlane(e);
		return n === null ? null : this.at(n, t);
	}
	intersectsPlane(e) {
		let t = e.distanceToPoint(this.origin);
		return t === 0 || e.normal.dot(this.direction) * t < 0;
	}
	intersectBox(e, t) {
		let n, r, i, a, o, s, c = 1 / this.direction.x, l = 1 / this.direction.y, u = 1 / this.direction.z, d = this.origin;
		return c >= 0 ? (n = (e.min.x - d.x) * c, r = (e.max.x - d.x) * c) : (n = (e.max.x - d.x) * c, r = (e.min.x - d.x) * c), l >= 0 ? (i = (e.min.y - d.y) * l, a = (e.max.y - d.y) * l) : (i = (e.max.y - d.y) * l, a = (e.min.y - d.y) * l), n > a || i > r || ((i > n || isNaN(n)) && (n = i), (a < r || isNaN(r)) && (r = a), u >= 0 ? (o = (e.min.z - d.z) * u, s = (e.max.z - d.z) * u) : (o = (e.max.z - d.z) * u, s = (e.min.z - d.z) * u), n > s || o > r) || ((o > n || n !== n) && (n = o), (s < r || r !== r) && (r = s), r < 0) ? null : this.at(n >= 0 ? n : r, t);
	}
	intersectsBox(e) {
		return this.intersectBox(e, vf) !== null;
	}
	intersectTriangle(e, t, n, r, i) {
		let a = this.origin, o = this.direction, s = o.x, c = o.y, l = o.z, u = e.x - a.x, d = e.y - a.y, f = e.z - a.z, p = t.x - a.x, m = t.y - a.y, h = t.z - a.z, g = n.x - a.x, _ = n.y - a.y, v = n.z - a.z, y = Math.abs(s), b = Math.abs(c), x = Math.abs(l), S, C, w, T, E, D, O, k, A, j, M, N;
		if (y >= b && y >= x ? (w = s, D = u, A = p, N = g, s >= 0 ? (S = c, C = l, T = d, E = f, O = m, k = h, j = _, M = v) : (S = l, C = c, T = f, E = d, O = h, k = m, j = v, M = _)) : b >= x ? (w = c, D = d, A = m, N = _, c >= 0 ? (S = l, C = s, T = f, E = u, O = h, k = p, j = v, M = g) : (S = s, C = l, T = u, E = f, O = p, k = h, j = g, M = v)) : (w = l, D = f, A = h, N = v, l >= 0 ? (S = s, C = c, T = u, E = d, O = p, k = m, j = g, M = _) : (S = c, C = s, T = d, E = u, O = m, k = p, j = _, M = g)), w === 0) return null;
		let P = S / w, F = C / w, I = 1 / w, ee = T - P * D, te = E - F * D, ne = O - P * A, re = k - F * A, L = j - P * N, ie = M - F * N, R = L * re - ie * ne, ae = ee * ie - te * L, oe = ne * te - re * ee;
		if (r) {
			if (R < 0 || ae < 0 || oe < 0) return null;
		} else if ((R < 0 || ae < 0 || oe < 0) && (R > 0 || ae > 0 || oe > 0)) return null;
		let se = R + ae + oe;
		if (se === 0) return null;
		let ce = I * (R * D + ae * A + oe * N);
		return (se > 0 ? ce < 0 : ce > 0) ? null : this.at(ce / se, i);
	}
	applyMatrix4(e) {
		return this.origin.applyMatrix4(e), this.direction.transformDirection(e), this;
	}
	equals(e) {
		return e.origin.equals(this.origin) && e.direction.equals(this.direction);
	}
	clone() {
		return new this.constructor().copy(this);
	}
}, Cf = class extends _f {
	constructor(e) {
		super(), this.isMeshBasicMaterial = !0, this.type = "MeshBasicMaterial", this.color = new X(16777215), this.map = null, this.lightMap = null, this.lightMapIntensity = 1, this.aoMap = null, this.aoMapIntensity = 1, this.specularMap = null, this.alphaMap = null, this.envMap = null, this.envMapRotation = new Wu(), this.combine = 0, this.reflectivity = 1, this.refractionRatio = .98, this.wireframe = !1, this.wireframeLinewidth = 1, this.wireframeLinecap = "round", this.wireframeLinejoin = "round", this.fog = !0, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.color.copy(e.color), this.map = e.map, this.lightMap = e.lightMap, this.lightMapIntensity = e.lightMapIntensity, this.aoMap = e.aoMap, this.aoMapIntensity = e.aoMapIntensity, this.specularMap = e.specularMap, this.alphaMap = e.alphaMap, this.envMap = e.envMap, this.envMapRotation.copy(e.envMapRotation), this.combine = e.combine, this.reflectivity = e.reflectivity, this.refractionRatio = e.refractionRatio, this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this.wireframeLinecap = e.wireframeLinecap, this.wireframeLinejoin = e.wireframeLinejoin, this.fog = e.fog, this;
	}
}, wf = /*@__PURE__*/ new Pu(), Tf = /*@__PURE__*/ new Sf(), Ef = /*@__PURE__*/ new nf(), Df = /*@__PURE__*/ new q(), Of = /*@__PURE__*/ new q(), kf = /*@__PURE__*/ new q(), Af = /*@__PURE__*/ new q(), jf = /*@__PURE__*/ new q(), Mf = /*@__PURE__*/ new q(), Nf = /*@__PURE__*/ new q(), Pf = /*@__PURE__*/ new q(), Ff = class extends sd {
	constructor(e = new df(), t = new Cf()) {
		super(), this.isMesh = !0, this.type = "Mesh", this.geometry = e, this.material = t, this.morphTargetDictionary = void 0, this.morphTargetInfluences = void 0, this.count = 1, this.updateMorphTargets();
	}
	copy(e, t) {
		return super.copy(e, t), e.morphTargetInfluences !== void 0 && (this.morphTargetInfluences = e.morphTargetInfluences.slice()), e.morphTargetDictionary !== void 0 && (this.morphTargetDictionary = Object.assign({}, e.morphTargetDictionary)), this.material = Array.isArray(e.material) ? e.material.slice() : e.material, this.geometry = e.geometry, this;
	}
	updateMorphTargets() {
		let e = this.geometry.morphAttributes, t = Object.keys(e);
		if (t.length > 0) {
			let n = e[t[0]];
			if (n !== void 0) {
				this.morphTargetInfluences = [], this.morphTargetDictionary = {};
				for (let e = 0, t = n.length; e < t; e++) {
					let t = n[e].name || String(e);
					this.morphTargetInfluences.push(0), this.morphTargetDictionary[t] = e;
				}
			}
		}
	}
	getVertexPosition(e, t) {
		let n = this.geometry, r = n.attributes.position, i = n.morphAttributes.position, a = n.morphTargetsRelative;
		t.fromBufferAttribute(r, e);
		let o = this.morphTargetInfluences;
		if (i && o) {
			Mf.set(0, 0, 0);
			for (let n = 0, r = i.length; n < r; n++) {
				let r = o[n], s = i[n];
				r !== 0 && (jf.fromBufferAttribute(s, e), a ? Mf.addScaledVector(jf, r) : Mf.addScaledVector(jf.sub(t), r));
			}
			t.add(Mf);
		}
		return t;
	}
	intersectsFrustum(e) {
		return e.intersectsObject(this);
	}
	raycast(e, t) {
		let n = this.geometry, r = this.material, i = this.matrixWorld;
		r !== void 0 && (n.boundingSphere === null && n.computeBoundingSphere(), Ef.copy(n.boundingSphere), Ef.applyMatrix4(i), Tf.copy(e.ray).recast(e.near), !(Ef.containsPoint(Tf.origin) === !1 && (Tf.intersectSphere(Ef, Df) === null || Tf.origin.distanceToSquared(Df) > (e.far - e.near) ** 2)) && (wf.copy(i).invert(), Tf.copy(e.ray).applyMatrix4(wf), (n.boundingBox === null || Tf.intersectsBox(n.boundingBox) !== !1) && this._computeIntersections(e, t, Tf)));
	}
	_computeIntersections(e, t, n) {
		let r, i = this.geometry, a = this.material, o = i.index, s = i.attributes.position, c = i.attributes.uv, l = i.attributes.uv1, u = i.attributes.normal, d = i.groups, f = i.drawRange;
		if (o !== null) {
			if (Array.isArray(a)) for (let i = 0, s = d.length; i < s; i++) {
				let s = d[i], p = a[s.materialIndex], m = Math.max(s.start, f.start), h = Math.min(o.count, Math.min(s.start + s.count, f.start + f.count));
				for (let i = m, a = h; i < a; i += 3) {
					let a = o.getX(i), d = o.getX(i + 1), f = o.getX(i + 2);
					r = Lf(this, p, e, n, c, l, u, a, d, f), r && (r.faceIndex = Math.floor(i / 3), r.face.materialIndex = s.materialIndex, t.push(r));
				}
			}
			else {
				let i = Math.max(0, f.start), s = Math.min(o.count, f.start + f.count);
				for (let d = i, f = s; d < f; d += 3) {
					let i = o.getX(d), s = o.getX(d + 1), f = o.getX(d + 2);
					r = Lf(this, a, e, n, c, l, u, i, s, f), r && (r.faceIndex = Math.floor(d / 3), t.push(r));
				}
			}
		} else if (s !== void 0) {
			if (Array.isArray(a)) for (let i = 0, o = d.length; i < o; i++) {
				let o = d[i], p = a[o.materialIndex], m = Math.max(o.start, f.start), h = Math.min(s.count, Math.min(o.start + o.count, f.start + f.count));
				for (let i = m, a = h; i < a; i += 3) {
					let a = i, s = i + 1, d = i + 2;
					r = Lf(this, p, e, n, c, l, u, a, s, d), r && (r.faceIndex = Math.floor(i / 3), r.face.materialIndex = o.materialIndex, t.push(r));
				}
			}
			else {
				let i = Math.max(0, f.start), o = Math.min(s.count, f.start + f.count);
				for (let s = i, d = o; s < d; s += 3) {
					let i = s, o = s + 1, d = s + 2;
					r = Lf(this, a, e, n, c, l, u, i, o, d), r && (r.faceIndex = Math.floor(s / 3), t.push(r));
				}
			}
		}
	}
};
function If(e, t, n, r, i, a, o, s) {
	let c;
	if (c = t.side === 1 ? r.intersectTriangle(o, a, i, !0, s) : r.intersectTriangle(i, a, o, t.side === 0, s), c === null) return null;
	Pf.copy(s), Pf.applyMatrix4(e.matrixWorld);
	let l = n.ray.origin.distanceTo(Pf);
	return l < n.near || l > n.far ? null : {
		distance: l,
		point: Pf.clone(),
		object: e
	};
}
function Lf(e, t, n, r, i, a, o, s, c, l) {
	e.getVertexPosition(s, Of), e.getVertexPosition(c, kf), e.getVertexPosition(l, Af);
	let u = If(e, t, n, r, Of, kf, Af, Nf);
	if (u) {
		let e = new q();
		Ad.getBarycoord(Nf, Of, kf, Af, e), i && (u.uv = Ad.getInterpolatedAttribute(i, s, c, l, e, new K())), a && (u.uv1 = Ad.getInterpolatedAttribute(a, s, c, l, e, new K())), o && (u.normal = Ad.getInterpolatedAttribute(o, s, c, l, e, new q()), u.normal.dot(r.direction) > 0 && u.normal.multiplyScalar(-1));
		let t = {
			a: s,
			b: c,
			c: l,
			normal: new q(),
			materialIndex: 0
		};
		Ad.getNormal(Of, kf, Af, t.normal), u.face = t, u.barycoord = e;
	}
	return u;
}
var Rf = class extends Ou {
	constructor(e = null, t = 1, n = 1, r, i, a, o, s, c = tc, l = tc, u, d) {
		super(null, a, o, s, c, l, r, i, u, d), this.isDataTexture = !0, this.image = {
			data: e,
			width: t,
			height: n
		}, this.generateMipmaps = !1, this.flipY = !1, this.unpackAlignment = 1;
	}
}, zf = /*@__PURE__*/ new nf(), Bf = /*@__PURE__*/ new K(.5, .5), Vf = /*@__PURE__*/ new q(), Hf = class {
	constructor(e = new hf(), t = new hf(), n = new hf(), r = new hf(), i = new hf(), a = new hf()) {
		this.planes = [
			e,
			t,
			n,
			r,
			i,
			a
		];
	}
	set(e, t, n, r, i, a) {
		let o = this.planes;
		return o[0].copy(e), o[1].copy(t), o[2].copy(n), o[3].copy(r), o[4].copy(i), o[5].copy(a), this;
	}
	copy(e) {
		let t = this.planes;
		for (let n = 0; n < 6; n++) t[n].copy(e.planes[n]);
		return this;
	}
	setFromProjectionMatrix(e, t = Ol, n = !1) {
		let r = this.planes, i = e.elements, a = i[0], o = i[1], s = i[2], c = i[3], l = i[4], u = i[5], d = i[6], f = i[7], p = i[8], m = i[9], h = i[10], g = i[11], _ = i[12], v = i[13], y = i[14], b = i[15];
		if (r[0].setComponents(c - a, f - l, g - p, b - _).normalize(), r[1].setComponents(c + a, f + l, g + p, b + _).normalize(), r[2].setComponents(c + o, f + u, g + m, b + v).normalize(), r[3].setComponents(c - o, f - u, g - m, b - v).normalize(), n) r[4].setComponents(s, d, h, y).normalize(), r[5].setComponents(c - s, f - d, g - h, b - y).normalize();
		else if (r[4].setComponents(c - s, f - d, g - h, b - y).normalize(), t === 2e3) r[5].setComponents(c + s, f + d, g + h, b + y).normalize();
		else if (t === 2001) r[5].setComponents(s, d, h, y).normalize();
		else throw Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: " + t);
		return this;
	}
	intersectsObject(e) {
		if (e.boundingSphere !== void 0) e.boundingSphere === null && e.computeBoundingSphere(), zf.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);
		else {
			let t = e.geometry;
			t.boundingSphere === null && t.computeBoundingSphere(), zf.copy(t.boundingSphere).applyMatrix4(e.matrixWorld);
		}
		return this.intersectsSphere(zf);
	}
	intersectsSprite(e) {
		return zf.center.set(0, 0, 0), zf.radius = .7071067811865476 + Bf.distanceTo(e.center), zf.applyMatrix4(e.matrixWorld), this.intersectsSphere(zf);
	}
	intersectsSphere(e) {
		let t = this.planes, n = e.center, r = -e.radius;
		for (let e = 0; e < 6; e++) if (t[e].distanceToPoint(n) < r) return !1;
		return !0;
	}
	intersectsBox(e) {
		let t = this.planes;
		for (let n = 0; n < 6; n++) {
			let r = t[n];
			if (Vf.x = r.normal.x > 0 ? e.max.x : e.min.x, Vf.y = r.normal.y > 0 ? e.max.y : e.min.y, Vf.z = r.normal.z > 0 ? e.max.z : e.min.z, r.distanceToPoint(Vf) < 0) return !1;
		}
		return !0;
	}
	containsPoint(e) {
		let t = this.planes;
		for (let n = 0; n < 6; n++) if (t[n].distanceToPoint(e) < 0) return !1;
		return !0;
	}
	clone() {
		return new this.constructor().copy(this);
	}
}, Uf = class extends _f {
	constructor(e) {
		super(), this.isLineBasicMaterial = !0, this.type = "LineBasicMaterial", this.color = new X(16777215), this.map = null, this.linewidth = 1, this.linecap = "round", this.linejoin = "round", this.fog = !0, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.color.copy(e.color), this.map = e.map, this.linewidth = e.linewidth, this.linecap = e.linecap, this.linejoin = e.linejoin, this.fog = e.fog, this;
	}
}, Wf = /*@__PURE__*/ new q(), Gf = /*@__PURE__*/ new q(), Kf = /*@__PURE__*/ new Pu(), qf = /*@__PURE__*/ new Sf(), Jf = /*@__PURE__*/ new nf(), Yf = /*@__PURE__*/ new q(), Xf = /*@__PURE__*/ new q(), Zf = class extends sd {
	constructor(e = new df(), t = new Uf()) {
		super(), this.isLine = !0, this.type = "Line", this.geometry = e, this.material = t, this.morphTargetDictionary = void 0, this.morphTargetInfluences = void 0, this.updateMorphTargets();
	}
	copy(e, t) {
		return super.copy(e, t), this.material = Array.isArray(e.material) ? e.material.slice() : e.material, this.geometry = e.geometry, this;
	}
	computeLineDistances() {
		let e = this.geometry;
		if (e.index === null) {
			let t = e.attributes.position, n = [0];
			for (let e = 1, r = t.count; e < r; e++) Wf.fromBufferAttribute(t, e - 1), Gf.fromBufferAttribute(t, e), n[e] = n[e - 1], n[e] += Wf.distanceTo(Gf);
			e.setAttribute("lineDistance", new Qd(n, 1));
		} else U("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");
		return this;
	}
	intersectsFrustum(e) {
		return e.intersectsObject(this);
	}
	raycast(e, t) {
		let n = this.geometry, r = this.matrixWorld, i = e.params.Line.threshold, a = n.drawRange;
		if (n.boundingSphere === null && n.computeBoundingSphere(), Jf.copy(n.boundingSphere), Jf.applyMatrix4(r), Jf.radius += i, e.ray.intersectsSphere(Jf) === !1) return;
		Kf.copy(r).invert(), qf.copy(e.ray).applyMatrix4(Kf);
		let o = i / ((this.scale.x + this.scale.y + this.scale.z) / 3), s = o * o, c = this.isLineSegments ? 2 : 1, l = n.index, u = n.attributes.position;
		if (l !== null) {
			let n = Math.max(0, a.start), r = Math.min(l.count, a.start + a.count);
			for (let i = n, a = r - 1; i < a; i += c) {
				let n = l.getX(i), r = l.getX(i + 1), a = Qf(this, e, qf, s, n, r, i);
				a && t.push(a);
			}
			if (this.isLineLoop) {
				let i = l.getX(r - 1), a = l.getX(n), o = Qf(this, e, qf, s, i, a, r - 1);
				o && t.push(o);
			}
		} else {
			let n = Math.max(0, a.start), r = Math.min(u.count, a.start + a.count);
			for (let i = n, a = r - 1; i < a; i += c) {
				let n = Qf(this, e, qf, s, i, i + 1, i);
				n && t.push(n);
			}
			if (this.isLineLoop) {
				let i = Qf(this, e, qf, s, r - 1, n, r - 1);
				i && t.push(i);
			}
		}
	}
	updateMorphTargets() {
		let e = this.geometry.morphAttributes, t = Object.keys(e);
		if (t.length > 0) {
			let n = e[t[0]];
			if (n !== void 0) {
				this.morphTargetInfluences = [], this.morphTargetDictionary = {};
				for (let e = 0, t = n.length; e < t; e++) {
					let t = n[e].name || String(e);
					this.morphTargetInfluences.push(0), this.morphTargetDictionary[t] = e;
				}
			}
		}
	}
};
function Qf(e, t, n, r, i, a, o) {
	let s = e.geometry.attributes.position;
	if (Wf.fromBufferAttribute(s, i), Gf.fromBufferAttribute(s, a), n.distanceSqToSegment(Wf, Gf, Yf, Xf) > r) return;
	Yf.applyMatrix4(e.matrixWorld);
	let c = t.ray.origin.distanceTo(Yf);
	if (!(c < t.near || c > t.far)) return {
		distance: c,
		point: Xf.clone().applyMatrix4(e.matrixWorld),
		index: o,
		face: null,
		faceIndex: null,
		barycoord: null,
		object: e
	};
}
var $f = /*@__PURE__*/ new q(), ep = /*@__PURE__*/ new q(), tp = class extends Zf {
	constructor(e, t) {
		super(e, t), this.isLineSegments = !0, this.type = "LineSegments";
	}
	computeLineDistances() {
		let e = this.geometry;
		if (e.index === null) {
			let t = e.attributes.position, n = [];
			for (let e = 0, r = t.count; e < r; e += 2) $f.fromBufferAttribute(t, e), ep.fromBufferAttribute(t, e + 1), n[e] = e === 0 ? 0 : n[e - 1], n[e + 1] = n[e] + $f.distanceTo(ep);
			e.setAttribute("lineDistance", new Qd(n, 1));
		} else U("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");
		return this;
	}
}, np = class extends _f {
	constructor(e) {
		super(), this.isPointsMaterial = !0, this.type = "PointsMaterial", this.color = new X(16777215), this.map = null, this.alphaMap = null, this.size = 1, this.sizeAttenuation = !0, this.fog = !0, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.color.copy(e.color), this.map = e.map, this.alphaMap = e.alphaMap, this.size = e.size, this.sizeAttenuation = e.sizeAttenuation, this.fog = e.fog, this;
	}
}, rp = /*@__PURE__*/ new Pu(), ip = /*@__PURE__*/ new Sf(), ap = /*@__PURE__*/ new nf(), op = /*@__PURE__*/ new q(), sp = class extends sd {
	constructor(e = new df(), t = new np()) {
		super(), this.isPoints = !0, this.type = "Points", this.geometry = e, this.material = t, this.morphTargetDictionary = void 0, this.morphTargetInfluences = void 0, this.updateMorphTargets();
	}
	copy(e, t) {
		return super.copy(e, t), this.material = Array.isArray(e.material) ? e.material.slice() : e.material, this.geometry = e.geometry, this;
	}
	intersectsFrustum(e) {
		return e.intersectsObject(this);
	}
	raycast(e, t) {
		let n = this.geometry, r = this.matrixWorld, i = e.params.Points.threshold, a = n.drawRange;
		if (n.boundingSphere === null && n.computeBoundingSphere(), ap.copy(n.boundingSphere), ap.applyMatrix4(r), ap.radius += i, e.ray.intersectsSphere(ap) === !1) return;
		rp.copy(r).invert(), ip.copy(e.ray).applyMatrix4(rp);
		let o = i / ((this.scale.x + this.scale.y + this.scale.z) / 3), s = o * o, c = n.index, l = n.attributes.position;
		if (c !== null) {
			let n = Math.max(0, a.start), i = Math.min(c.count, a.start + a.count);
			for (let a = n, o = i; a < o; a++) {
				let n = c.getX(a);
				op.fromBufferAttribute(l, n), cp(op, n, s, r, e, t, this);
			}
		} else {
			let n = Math.max(0, a.start), i = Math.min(l.count, a.start + a.count);
			for (let a = n, o = i; a < o; a++) op.fromBufferAttribute(l, a), cp(op, a, s, r, e, t, this);
		}
	}
	updateMorphTargets() {
		let e = this.geometry.morphAttributes, t = Object.keys(e);
		if (t.length > 0) {
			let n = e[t[0]];
			if (n !== void 0) {
				this.morphTargetInfluences = [], this.morphTargetDictionary = {};
				for (let e = 0, t = n.length; e < t; e++) {
					let t = n[e].name || String(e);
					this.morphTargetInfluences.push(0), this.morphTargetDictionary[t] = e;
				}
			}
		}
	}
};
function cp(e, t, n, r, i, a, o) {
	let s = ip.distanceSqToPoint(e);
	if (s < n) {
		let n = new q();
		ip.closestPointToPoint(e, n), n.applyMatrix4(r);
		let c = i.ray.origin.distanceTo(n);
		if (c < i.near || c > i.far) return;
		a.push({
			distance: c,
			distanceToRay: Math.sqrt(s),
			point: n,
			index: t,
			face: null,
			faceIndex: null,
			barycoord: null,
			object: o
		});
	}
}
var lp = class extends Ou {
	constructor(e = [], t = 301, n, r, i, a, o, s, c, l) {
		super(e, t, n, r, i, a, o, s, c, l), this.isCubeTexture = !0, this.flipY = !1;
	}
	get images() {
		return this.image;
	}
	set images(e) {
		this.image = e;
	}
}, up = class extends Ou {
	constructor(e, t, n = fc, r, i, a, o = tc, s = tc, c, l = Cc, u = 1) {
		if (l !== 1026 && l !== 1027) throw Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");
		super({
			width: e,
			height: t,
			depth: u
		}, r, i, a, o, s, l, n, c), this.isDepthTexture = !0, this.flipY = !1, this.generateMipmaps = !1, this.compareFunction = null;
	}
	copy(e) {
		return super.copy(e), this.source = new wu(Object.assign({}, e.image)), this.compareFunction = e.compareFunction, this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return t.compareFunction = this.compareFunction, t;
	}
}, dp = class extends up {
	constructor(e, t = fc, n = 301, r, i, a = tc, o = tc, s, c = Cc) {
		let l = {
			width: e,
			height: e,
			depth: 1
		}, u = [
			l,
			l,
			l,
			l,
			l,
			l
		];
		super(e, e, t, n, r, i, a, o, s, c), this.image = u, this.isCubeDepthTexture = !0, this.isCubeTexture = !0;
	}
	get images() {
		return this.image;
	}
	set images(e) {
		this.image = e;
	}
}, fp = class extends Ou {
	constructor(e = null) {
		super(), this.sourceTexture = e, this.isExternalTexture = !0;
	}
	copy(e) {
		return super.copy(e), this.sourceTexture = e.sourceTexture, this;
	}
}, pp = class e extends df {
	constructor(e = 1, t = 1, n = 1, r = 1, i = 1, a = 1) {
		super(), this.type = "BoxGeometry", this.parameters = {
			width: e,
			height: t,
			depth: n,
			widthSegments: r,
			heightSegments: i,
			depthSegments: a
		};
		let o = this;
		r = Math.floor(r), i = Math.floor(i), a = Math.floor(a);
		let s = [], c = [], l = [], u = [], d = 0, f = 0;
		p("z", "y", "x", -1, -1, n, t, e, a, i, 0), p("z", "y", "x", 1, -1, n, t, -e, a, i, 1), p("x", "z", "y", 1, 1, e, n, t, r, a, 2), p("x", "z", "y", 1, -1, e, n, -t, r, a, 3), p("x", "y", "z", 1, -1, e, t, n, r, i, 4), p("x", "y", "z", -1, -1, e, t, -n, r, i, 5), this.setIndex(s), this.setAttribute("position", new Qd(c, 3)), this.setAttribute("normal", new Qd(l, 3)), this.setAttribute("uv", new Qd(u, 2));
		function p(e, t, n, r, i, a, p, m, h, g, _) {
			let v = a / h, y = p / g, b = a / 2, x = p / 2, S = m / 2, C = h + 1, w = g + 1, T = 0, E = 0, D = new q();
			for (let a = 0; a < w; a++) {
				let o = a * y - x;
				for (let s = 0; s < C; s++) D[e] = (s * v - b) * r, D[t] = o * i, D[n] = S, c.push(D.x, D.y, D.z), D[e] = 0, D[t] = 0, D[n] = m > 0 ? 1 : -1, l.push(D.x, D.y, D.z), u.push(s / h), u.push(1 - a / g), T += 1;
			}
			for (let e = 0; e < g; e++) for (let t = 0; t < h; t++) {
				let n = d + t + C * e, r = d + t + C * (e + 1), i = d + (t + 1) + C * (e + 1), a = d + (t + 1) + C * e;
				s.push(n, r, a), s.push(r, i, a), E += 6;
			}
			o.addGroup(f, E, _), f += E, d += T;
		}
	}
	copy(e) {
		return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
	}
	static fromJSON(t) {
		return new e(t.width, t.height, t.depth, t.widthSegments, t.heightSegments, t.depthSegments);
	}
}, mp = /*@__PURE__*/ new q(), hp = /*@__PURE__*/ new q(), gp = /*@__PURE__*/ new q(), _p = /*@__PURE__*/ new Ad(), vp = class extends df {
	constructor(e = null, t = 1) {
		if (super(), this.type = "EdgesGeometry", this.parameters = {
			geometry: e,
			thresholdAngle: t
		}, e !== null) {
			let n = 1e4, r = Math.cos(Hl * t), i = e.getIndex(), a = e.getAttribute("position"), o = i ? i.count : a.count, s = [
				0,
				0,
				0
			], c = [
				"a",
				"b",
				"c"
			], l = [
				,
				,
				,
			], u = {}, d = [];
			for (let e = 0; e < o; e += 3) {
				i ? (s[0] = i.getX(e), s[1] = i.getX(e + 1), s[2] = i.getX(e + 2)) : (s[0] = e, s[1] = e + 1, s[2] = e + 2);
				let { a: t, b: o, c: f } = _p;
				if (t.fromBufferAttribute(a, s[0]), o.fromBufferAttribute(a, s[1]), f.fromBufferAttribute(a, s[2]), _p.getNormal(gp), l[0] = `${Math.round(t.x * n)},${Math.round(t.y * n)},${Math.round(t.z * n)}`, l[1] = `${Math.round(o.x * n)},${Math.round(o.y * n)},${Math.round(o.z * n)}`, l[2] = `${Math.round(f.x * n)},${Math.round(f.y * n)},${Math.round(f.z * n)}`, l[0] !== l[1] && l[1] !== l[2] && l[2] !== l[0]) for (let e = 0; e < 3; e++) {
					let t = (e + 1) % 3, n = l[e], i = l[t], a = _p[c[e]], o = _p[c[t]], f = `${n}_${i}`, p = `${i}_${n}`;
					p in u && u[p] ? (gp.dot(u[p].normal) <= r && (d.push(a.x, a.y, a.z), d.push(o.x, o.y, o.z)), u[p] = null) : f in u || (u[f] = {
						index0: s[e],
						index1: s[t],
						normal: gp.clone()
					});
				}
			}
			for (let e in u) if (u[e]) {
				let { index0: t, index1: n } = u[e];
				mp.fromBufferAttribute(a, t), hp.fromBufferAttribute(a, n), d.push(mp.x, mp.y, mp.z), d.push(hp.x, hp.y, hp.z);
			}
			this.setAttribute("position", new Qd(d, 3));
		}
	}
	copy(e) {
		return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
	}
}, yp = class e extends df {
	constructor(e = 1, t = 1, n = 1, r = 1) {
		super(), this.type = "PlaneGeometry", this.parameters = {
			width: e,
			height: t,
			widthSegments: n,
			heightSegments: r
		};
		let i = e / 2, a = t / 2, o = Math.floor(n), s = Math.floor(r), c = o + 1, l = s + 1, u = e / o, d = t / s, f = [], p = [], m = [], h = [];
		for (let e = 0; e < l; e++) {
			let t = e * d - a;
			for (let n = 0; n < c; n++) {
				let r = n * u - i;
				p.push(r, -t, 0), m.push(0, 0, 1), h.push(n / o), h.push(1 - e / s);
			}
		}
		for (let e = 0; e < s; e++) for (let t = 0; t < o; t++) {
			let n = t + c * e, r = t + c * (e + 1), i = t + 1 + c * (e + 1), a = t + 1 + c * e;
			f.push(n, r, a), f.push(r, i, a);
		}
		this.setIndex(f), this.setAttribute("position", new Qd(p, 3)), this.setAttribute("normal", new Qd(m, 3)), this.setAttribute("uv", new Qd(h, 2));
	}
	copy(e) {
		return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
	}
	static fromJSON(t) {
		return new e(t.width, t.height, t.widthSegments, t.heightSegments);
	}
};
function bp(e) {
	let t = {};
	for (let n in e) {
		t[n] = {};
		for (let r in e[n]) {
			let i = e[n][r];
			if (Sp(i)) i.isRenderTargetTexture ? (U("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."), t[n][r] = null) : t[n][r] = i.clone();
			else if (Array.isArray(i)) {
				if (Sp(i[0])) {
					let e = [];
					for (let t = 0, n = i.length; t < n; t++) e[t] = i[t].clone();
					t[n][r] = e;
				} else t[n][r] = i.slice();
			} else t[n][r] = i;
		}
	}
	return t;
}
function xp(e) {
	let t = {};
	for (let n = 0; n < e.length; n++) {
		let r = bp(e[n]);
		for (let e in r) t[e] = r[e];
	}
	return t;
}
function Sp(e) {
	return e && (e.isColor || e.isMatrix3 || e.isMatrix4 || e.isVector2 || e.isVector3 || e.isVector4 || e.isTexture || e.isQuaternion);
}
function Cp(e) {
	let t = [];
	for (let n = 0; n < e.length; n++) t.push(e[n].clone());
	return t;
}
function wp(e) {
	let t = e.getRenderTarget();
	return t === null ? e.outputColorSpace : t.isXRRenderTarget === !0 ? t.texture.colorSpace : Y.workingColorSpace;
}
var Tp = {
	clone: bp,
	merge: xp
}, Ep = "void main() {\n	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}", Dp = "void main() {\n	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );\n}", Op = class extends _f {
	constructor(e) {
		super(), this.isShaderMaterial = !0, this.type = "ShaderMaterial", this.defines = {}, this.uniforms = {}, this.uniformsGroups = [], this.vertexShader = Ep, this.fragmentShader = Dp, this.linewidth = 1, this.wireframe = !1, this.wireframeLinewidth = 1, this.fog = !1, this.lights = !1, this.clipping = !1, this.forceSinglePass = !0, this.extensions = {
			clipCullDistance: !1,
			multiDraw: !1
		}, this.defaultAttributeValues = {
			color: [
				1,
				1,
				1
			],
			uv: [0, 0],
			uv1: [0, 0]
		}, this.index0AttributeName = void 0, this.uniformsNeedUpdate = !1, this.glslVersion = null, e !== void 0 && this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.fragmentShader = e.fragmentShader, this.vertexShader = e.vertexShader, this.uniforms = bp(e.uniforms), this.uniformsGroups = Cp(e.uniformsGroups), this.defines = Object.assign({}, e.defines), this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this.fog = e.fog, this.lights = e.lights, this.clipping = e.clipping, this.extensions = Object.assign({}, e.extensions), this.glslVersion = e.glslVersion, this.defaultAttributeValues = Object.assign({}, e.defaultAttributeValues), this.index0AttributeName = e.index0AttributeName, this.uniformsNeedUpdate = e.uniformsNeedUpdate, this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		t.glslVersion = this.glslVersion, t.uniforms = {};
		for (let n in this.uniforms) {
			let r = this.uniforms[n].value;
			r && r.isTexture ? t.uniforms[n] = {
				type: "t",
				value: r.toJSON(e).uuid
			} : r && r.isColor ? t.uniforms[n] = {
				type: "c",
				value: r.getHex()
			} : r && r.isVector2 ? t.uniforms[n] = {
				type: "v2",
				value: r.toArray()
			} : r && r.isVector3 ? t.uniforms[n] = {
				type: "v3",
				value: r.toArray()
			} : r && r.isVector4 ? t.uniforms[n] = {
				type: "v4",
				value: r.toArray()
			} : r && r.isMatrix3 ? t.uniforms[n] = {
				type: "m3",
				value: r.toArray()
			} : r && r.isMatrix4 ? t.uniforms[n] = {
				type: "m4",
				value: r.toArray()
			} : t.uniforms[n] = { value: r };
		}
		Object.keys(this.defines).length > 0 && (t.defines = this.defines), t.vertexShader = this.vertexShader, t.fragmentShader = this.fragmentShader, t.lights = this.lights, t.clipping = this.clipping;
		let n = {};
		for (let e in this.extensions) this.extensions[e] === !0 && (n[e] = !0);
		return Object.keys(n).length > 0 && (t.extensions = n), t;
	}
	fromJSON(e, t) {
		if (super.fromJSON(e, t), e.uniforms !== void 0) for (let n in e.uniforms) {
			let r = e.uniforms[n];
			switch (this.uniforms[n] = {}, r.type) {
				case "t":
					this.uniforms[n].value = t[r.value] || null;
					break;
				case "c":
					this.uniforms[n].value = new X().setHex(r.value);
					break;
				case "v2":
					this.uniforms[n].value = new K().fromArray(r.value);
					break;
				case "v3":
					this.uniforms[n].value = new q().fromArray(r.value);
					break;
				case "v4":
					this.uniforms[n].value = new ku().fromArray(r.value);
					break;
				case "m3":
					this.uniforms[n].value = new J().fromArray(r.value);
					break;
				case "m4":
					this.uniforms[n].value = new Pu().fromArray(r.value);
					break;
				default: this.uniforms[n].value = r.value;
			}
		}
		if (e.defines !== void 0 && (this.defines = e.defines), e.vertexShader !== void 0 && (this.vertexShader = e.vertexShader), e.fragmentShader !== void 0 && (this.fragmentShader = e.fragmentShader), e.glslVersion !== void 0 && (this.glslVersion = e.glslVersion), e.extensions !== void 0) for (let t in e.extensions) this.extensions[t] = e.extensions[t];
		return e.lights !== void 0 && (this.lights = e.lights), e.clipping !== void 0 && (this.clipping = e.clipping), this;
	}
}, kp = class extends Op {
	constructor(e) {
		super(e), this.isRawShaderMaterial = !0, this.type = "RawShaderMaterial";
	}
}, Ap = class extends _f {
	constructor(e) {
		super(), this.isMeshDepthMaterial = !0, this.type = "MeshDepthMaterial", this.depthPacking = yl, this.map = null, this.alphaMap = null, this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.wireframe = !1, this.wireframeLinewidth = 1, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.depthPacking = e.depthPacking, this.map = e.map, this.alphaMap = e.alphaMap, this.displacementMap = e.displacementMap, this.displacementScale = e.displacementScale, this.displacementBias = e.displacementBias, this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this;
	}
}, jp = class extends _f {
	constructor(e) {
		super(), this.isMeshDistanceMaterial = !0, this.type = "MeshDistanceMaterial", this.map = null, this.alphaMap = null, this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.map = e.map, this.alphaMap = e.alphaMap, this.displacementMap = e.displacementMap, this.displacementScale = e.displacementScale, this.displacementBias = e.displacementBias, this;
	}
};
function Mp(e, t) {
	return !e || e.constructor === t ? e : typeof t.BYTES_PER_ELEMENT == "number" ? new t(e) : Array.prototype.slice.call(e);
}
function Np(e) {
	return e !== void 0 && e.inTangents !== void 0 && e.outTangents !== void 0;
}
var Pp = class {
	constructor(e, t, n, r) {
		this.parameterPositions = e, this._cachedIndex = 0, this.resultBuffer = r === void 0 ? new t.constructor(n) : r, this.sampleValues = t, this.valueSize = n, this.settings = null, this.DefaultSettings_ = {};
	}
	evaluate(e) {
		let t = this.parameterPositions, n = this._cachedIndex, r = t[n], i = t[n - 1];
		validate_interval: {
			seek: {
				let a;
				linear_scan: {
					forward_scan: if (!(e < r)) {
						for (let a = n + 2;;) {
							if (r === void 0) {
								if (e < i) break forward_scan;
								return n = t.length, this._cachedIndex = n, this.copySampleValue_(n - 1);
							}
							if (n === a) break;
							if (i = r, r = t[++n], e < r) break seek;
						}
						a = t.length;
						break linear_scan;
					}
					if (!(e >= i)) {
						let o = t[1];
						e < o && (n = 2, i = o);
						for (let a = n - 2;;) {
							if (i === void 0) return this._cachedIndex = 0, this.copySampleValue_(0);
							if (n === a) break;
							if (r = i, i = t[--n - 1], e >= i) break seek;
						}
						a = n, n = 0;
						break linear_scan;
					}
					break validate_interval;
				}
				for (; n < a;) {
					let r = n + a >>> 1;
					e < t[r] ? a = r : n = r + 1;
				}
				if (r = t[n], i = t[n - 1], i === void 0) return this._cachedIndex = 0, this.copySampleValue_(0);
				if (r === void 0) return n = t.length, this._cachedIndex = n, this.copySampleValue_(n - 1);
			}
			this._cachedIndex = n, this.intervalChanged_(n, i, r);
		}
		return this.interpolate_(n, i, e, r);
	}
	getSettings_() {
		return this.settings || this.DefaultSettings_;
	}
	copySampleValue_(e) {
		let t = this.resultBuffer, n = this.sampleValues, r = this.valueSize, i = e * r;
		for (let e = 0; e !== r; ++e) t[e] = n[i + e];
		return t;
	}
	interpolate_() {
		throw Error("THREE.Interpolant: Call to abstract method.");
	}
	intervalChanged_() {}
}, Fp = class extends Pp {
	constructor(e, t, n, r) {
		super(e, t, n, r), this._weightPrev = -0, this._offsetPrev = -0, this._weightNext = -0, this._offsetNext = -0, this.DefaultSettings_ = {
			endingStart: gl,
			endingEnd: gl
		};
	}
	intervalChanged_(e, t, n) {
		let r = this.parameterPositions, i = e - 2, a = e + 1, o = r[i], s = r[a];
		if (o === void 0) switch (this.getSettings_().endingStart) {
			case _l:
				i = e, o = 2 * t - n;
				break;
			case vl:
				i = r.length - 2, o = t + r[i] - r[i + 1];
				break;
			default: i = e, o = n;
		}
		if (s === void 0) switch (this.getSettings_().endingEnd) {
			case _l:
				a = e, s = 2 * n - t;
				break;
			case vl:
				a = 1, s = n + r[1] - r[0];
				break;
			default: a = e - 1, s = t;
		}
		let c = (n - t) * .5, l = this.valueSize;
		this._weightPrev = c / (t - o), this._weightNext = c / (s - n), this._offsetPrev = i * l, this._offsetNext = a * l;
	}
	interpolate_(e, t, n, r) {
		let i = this.resultBuffer, a = this.sampleValues, o = this.valueSize, s = e * o, c = s - o, l = this._offsetPrev, u = this._offsetNext, d = this._weightPrev, f = this._weightNext, p = (n - t) / (r - t), m = p * p, h = m * p, g = -d * h + 2 * d * m - d * p, _ = (1 + d) * h + (-1.5 - 2 * d) * m + (-.5 + d) * p + 1, v = (-1 - f) * h + (1.5 + f) * m + .5 * p, y = f * h - f * m;
		for (let e = 0; e !== o; ++e) i[e] = g * a[l + e] + _ * a[c + e] + v * a[s + e] + y * a[u + e];
		return i;
	}
}, Ip = class extends Pp {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
	interpolate_(e, t, n, r) {
		let i = this.resultBuffer, a = this.sampleValues, o = this.valueSize, s = e * o, c = s - o, l = (n - t) / (r - t), u = 1 - l;
		for (let e = 0; e !== o; ++e) i[e] = a[c + e] * u + a[s + e] * l;
		return i;
	}
}, Lp = class extends Pp {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
	interpolate_(e) {
		return this.copySampleValue_(e - 1);
	}
}, Rp = class extends Pp {
	interpolate_(e, t, n, r) {
		let i = this.resultBuffer, a = this.sampleValues, o = this.valueSize, s = e * o, c = s - o, l = this.inTangents, u = this.outTangents;
		if (!l || !u) {
			let e = (n - t) / (r - t), l = 1 - e;
			for (let t = 0; t !== o; ++t) i[t] = a[c + t] * l + a[s + t] * e;
			return i;
		}
		let d = o * 2, f = e - 1;
		for (let p = 0; p !== o; ++p) {
			let o = a[c + p], m = a[s + p], h = f * d + p * 2, g = u[h], _ = u[h + 1], v = e * d + p * 2, y = l[v], b = l[v + 1], x = Vp(n, t, g, y, r);
			i[p] = zp(x, o, _, b, m);
		}
		return i;
	}
};
function zp(e, t, n, r, i) {
	let a = 1 - e;
	return a * a * a * t + 3 * a * a * e * n + 3 * a * e * e * r + e * e * e * i;
}
function Bp(e, t, n, r, i) {
	let a = 1 - e;
	return 3 * a * a * (n - t) + 6 * a * e * (r - n) + 3 * e * e * (i - r);
}
function Vp(e, t, n, r, i) {
	let a = (e - t) / (i - t);
	for (let o = 0; o < 8; o++) {
		let o = zp(a, t, n, r, i) - e;
		if (Math.abs(o) < 1e-10) break;
		let s = Bp(a, t, n, r, i);
		if (Math.abs(s) < 1e-10) break;
		a = Math.max(0, Math.min(1, a - o / s));
	}
	return a;
}
var Hp = class {
	constructor(e, t, n, r) {
		if (e === void 0) throw Error("THREE.KeyframeTrack: track name is undefined");
		if (t === void 0 || t.length === 0) throw Error("THREE.KeyframeTrack: no keyframes in track named " + e);
		this.name = e, this.times = Mp(t, this.TimeBufferType), this.values = Mp(n, this.ValueBufferType), this.setInterpolation(r || this.DefaultInterpolation);
	}
	static toJSON(e) {
		let t = e.constructor, n;
		if (t.toJSON !== this.toJSON) n = t.toJSON(e);
		else {
			n = {
				name: e.name,
				times: Mp(e.times, Array),
				values: Mp(e.values, Array)
			};
			let t = e.getInterpolation();
			t !== e.DefaultInterpolation && (n.interpolation = t), Np(e.settings) && (n.settings = {
				inTangents: Mp(e.settings.inTangents, Array),
				outTangents: Mp(e.settings.outTangents, Array)
			});
		}
		return n.type = e.ValueTypeName, n;
	}
	InterpolantFactoryMethodDiscrete(e) {
		return new Lp(this.times, this.values, this.getValueSize(), e);
	}
	InterpolantFactoryMethodLinear(e) {
		return new Ip(this.times, this.values, this.getValueSize(), e);
	}
	InterpolantFactoryMethodSmooth(e) {
		return new Fp(this.times, this.values, this.getValueSize(), e);
	}
	InterpolantFactoryMethodBezier(e) {
		let t = new Rp(this.times, this.values, this.getValueSize(), e);
		return this.settings && (t.inTangents = this.settings.inTangents, t.outTangents = this.settings.outTangents), t;
	}
	setInterpolation(e) {
		let t;
		switch (e) {
			case fl:
				t = this.InterpolantFactoryMethodDiscrete;
				break;
			case pl:
				t = this.InterpolantFactoryMethodLinear;
				break;
			case ml:
				t = this.InterpolantFactoryMethodSmooth;
				break;
			case hl: t = this.InterpolantFactoryMethodBezier;
		}
		if (t === void 0) {
			let t = "unsupported interpolation for " + this.ValueTypeName + " keyframe track named " + this.name;
			if (this.createInterpolant === void 0) {
				if (e !== this.DefaultInterpolation) this.setInterpolation(this.DefaultInterpolation);
				else throw Error(t);
			}
			return U("KeyframeTrack:", t), this;
		}
		return this.createInterpolant = t, this;
	}
	getInterpolation() {
		switch (this.createInterpolant) {
			case this.InterpolantFactoryMethodDiscrete: return fl;
			case this.InterpolantFactoryMethodLinear: return pl;
			case this.InterpolantFactoryMethodSmooth: return ml;
			case this.InterpolantFactoryMethodBezier: return hl;
		}
	}
	getValueSize() {
		return this.values.length / this.times.length;
	}
	shift(e) {
		if (e !== 0) {
			let t = this.times;
			for (let n = 0, r = t.length; n !== r; ++n) t[n] += e;
		}
		return this;
	}
	scale(e) {
		if (e !== 1) {
			let t = this.times;
			for (let n = 0, r = t.length; n !== r; ++n) t[n] *= e;
			Np(this.settings) && (Up(this.settings.inTangents, e), Up(this.settings.outTangents, e));
		}
		return this;
	}
	trim(e, t) {
		let n = this.times, r = n.length, i = 0, a = r - 1;
		for (; i !== r && n[i] < e;) ++i;
		for (; a !== -1 && n[a] > t;) --a;
		if (++a, i !== 0 || a !== r) {
			i >= a && (a = Math.max(a, 1), i = a - 1);
			let e = this.getValueSize();
			this.times = n.slice(i, a), this.values = this.values.slice(i * e, a * e);
		}
		return this;
	}
	validate() {
		let e = !0, t = this.getValueSize();
		t - Math.floor(t) !== 0 && (W("KeyframeTrack: Invalid value size in track.", this), e = !1);
		let n = this.times, r = this.values, i = n.length;
		i === 0 && (W("KeyframeTrack: Track is empty.", this), e = !1);
		let a = null;
		for (let t = 0; t !== i; t++) {
			let r = n[t];
			if (typeof r == "number" && isNaN(r)) {
				W("KeyframeTrack: Time is not a valid number.", this, t, r), e = !1;
				break;
			}
			if (a !== null && a > r) {
				W("KeyframeTrack: Out of order keys.", this, t, r, a), e = !1;
				break;
			}
			a = r;
		}
		if (r !== void 0 && Al(r)) for (let t = 0, n = r.length; t !== n; ++t) {
			let n = r[t];
			if (isNaN(n)) {
				W("KeyframeTrack: Value is not a valid number.", this, t, n), e = !1;
				break;
			}
		}
		return e;
	}
	optimize() {
		let e = this.times.slice(), t = this.values.slice(), n = this.getValueSize(), r = this.getInterpolation() === ml, i = e.length - 1, a = 1;
		for (let o = 1; o < i; ++o) {
			let i = !1, s = e[o];
			if (s !== e[o + 1] && (o !== 1 || s !== e[0])) {
				if (r) i = !0;
				else {
					let e = o * n, r = e - n, a = e + n;
					for (let o = 0; o !== n; ++o) {
						let n = t[e + o];
						if (n !== t[r + o] || n !== t[a + o]) {
							i = !0;
							break;
						}
					}
				}
			}
			if (i) {
				if (o !== a) {
					e[a] = e[o];
					let r = o * n, i = a * n;
					for (let e = 0; e !== n; ++e) t[i + e] = t[r + e];
				}
				++a;
			}
		}
		if (i > 0) {
			e[a] = e[i];
			for (let e = i * n, r = a * n, o = 0; o !== n; ++o) t[r + o] = t[e + o];
			++a;
		}
		return a === e.length ? (this.times = e, this.values = t) : (this.times = e.slice(0, a), this.values = t.slice(0, a * n)), this;
	}
	clone() {
		let e = this.times.slice(), t = this.values.slice(), n = this.constructor, r = new n(this.name, e, t);
		return r.createInterpolant = this.createInterpolant, Np(this.settings) && (r.settings = {
			inTangents: this.settings.inTangents.slice(),
			outTangents: this.settings.outTangents.slice()
		}), r;
	}
};
function Up(e, t) {
	for (let n = 0, r = e.length; n !== r; n += 2) e[n] *= t;
}
Hp.prototype.ValueTypeName = "", Hp.prototype.TimeBufferType = Float32Array, Hp.prototype.ValueBufferType = Float32Array, Hp.prototype.DefaultInterpolation = pl;
var Wp = class extends Hp {
	constructor(e, t, n) {
		super(e, t, n);
	}
};
Wp.prototype.ValueTypeName = "bool", Wp.prototype.ValueBufferType = Array, Wp.prototype.DefaultInterpolation = fl, Wp.prototype.InterpolantFactoryMethodLinear = void 0, Wp.prototype.InterpolantFactoryMethodSmooth = void 0;
var Gp = class extends Hp {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
};
Gp.prototype.ValueTypeName = "color";
var Kp = class extends Hp {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
};
Kp.prototype.ValueTypeName = "number";
var qp = class extends Pp {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
	interpolate_(e, t, n, r) {
		let i = this.resultBuffer, a = this.sampleValues, o = this.valueSize, s = (n - t) / (r - t), c = e * o;
		for (let e = c + o; c !== e; c += 4) fu.slerpFlat(i, 0, a, c - o, a, c, s);
		return i;
	}
}, Jp = class extends Hp {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
	InterpolantFactoryMethodLinear(e) {
		return new qp(this.times, this.values, this.getValueSize(), e);
	}
};
Jp.prototype.ValueTypeName = "quaternion", Jp.prototype.InterpolantFactoryMethodSmooth = void 0;
var Yp = class extends Hp {
	constructor(e, t, n) {
		super(e, t, n);
	}
};
Yp.prototype.ValueTypeName = "string", Yp.prototype.ValueBufferType = Array, Yp.prototype.DefaultInterpolation = fl, Yp.prototype.InterpolantFactoryMethodLinear = void 0, Yp.prototype.InterpolantFactoryMethodSmooth = void 0;
var Xp = class extends Hp {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
};
Xp.prototype.ValueTypeName = "vector";
var Zp = /*@__PURE__*/ new q(), Qp = /*@__PURE__*/ new fu(), $p = /*@__PURE__*/ new q(), em = class extends sd {
	constructor() {
		super(), this.isCamera = !0, this.type = "Camera", this.matrixWorldInverse = new Pu(), this.projectionMatrix = new Pu(), this.projectionMatrixInverse = new Pu(), this.coordinateSystem = Ol, this._reversedDepth = !1;
	}
	get reversedDepth() {
		return this._reversedDepth;
	}
	copy(e, t) {
		return super.copy(e, t), this.matrixWorldInverse.copy(e.matrixWorldInverse), this.projectionMatrix.copy(e.projectionMatrix), this.projectionMatrixInverse.copy(e.projectionMatrixInverse), this.coordinateSystem = e.coordinateSystem, this;
	}
	getWorldDirection(e) {
		return super.getWorldDirection(e).negate();
	}
	updateMatrixWorld(e) {
		super.updateMatrixWorld(e), this.matrixWorld.decompose(Zp, Qp, $p), $p.x === 1 && $p.y === 1 && $p.z === 1 ? this.matrixWorldInverse.copy(this.matrixWorld).invert() : this.matrixWorldInverse.compose(Zp, Qp, $p.set(1, 1, 1)).invert();
	}
	updateWorldMatrix(e, t, n = !1) {
		super.updateWorldMatrix(e, t, n), this.matrixWorld.decompose(Zp, Qp, $p), $p.x === 1 && $p.y === 1 && $p.z === 1 ? this.matrixWorldInverse.copy(this.matrixWorld).invert() : this.matrixWorldInverse.compose(Zp, Qp, $p.set(1, 1, 1)).invert();
	}
	clone() {
		return new this.constructor().copy(this);
	}
}, tm = /*@__PURE__*/ new q(), nm = /*@__PURE__*/ new K(), rm = /*@__PURE__*/ new K(), im = class extends em {
	constructor(e = 50, t = 1, n = .1, r = 2e3) {
		super(), this.isPerspectiveCamera = !0, this.type = "PerspectiveCamera", this.fov = e, this.zoom = 1, this.near = n, this.far = r, this.focus = 10, this.aspect = t, this.view = null, this.filmGauge = 35, this.filmOffset = 0, this.updateProjectionMatrix();
	}
	copy(e, t) {
		return super.copy(e, t), this.fov = e.fov, this.zoom = e.zoom, this.near = e.near, this.far = e.far, this.focus = e.focus, this.aspect = e.aspect, this.view = e.view === null ? null : Object.assign({}, e.view), this.filmGauge = e.filmGauge, this.filmOffset = e.filmOffset, this;
	}
	setFocalLength(e) {
		let t = .5 * this.getFilmHeight() / e;
		this.fov = Ul * 2 * Math.atan(t), this.updateProjectionMatrix();
	}
	getFocalLength() {
		let e = Math.tan(Hl * .5 * this.fov);
		return .5 * this.getFilmHeight() / e;
	}
	getEffectiveFOV() {
		return Ul * 2 * Math.atan(Math.tan(Hl * .5 * this.fov) / this.zoom);
	}
	getFilmWidth() {
		return this.filmGauge * Math.min(this.aspect, 1);
	}
	getFilmHeight() {
		return this.filmGauge / Math.max(this.aspect, 1);
	}
	getViewBounds(e, t, n) {
		tm.set(-1, -1, .5).applyMatrix4(this.projectionMatrixInverse), t.set(tm.x, tm.y).multiplyScalar(-e / tm.z), tm.set(1, 1, .5).applyMatrix4(this.projectionMatrixInverse), n.set(tm.x, tm.y).multiplyScalar(-e / tm.z);
	}
	getViewSize(e, t) {
		return this.getViewBounds(e, nm, rm), t.subVectors(rm, nm);
	}
	setViewOffset(e, t, n, r, i, a) {
		this.aspect = e / t, this.view === null && (this.view = {
			enabled: !0,
			fullWidth: 1,
			fullHeight: 1,
			offsetX: 0,
			offsetY: 0,
			width: 1,
			height: 1
		}), this.view.enabled = !0, this.view.fullWidth = e, this.view.fullHeight = t, this.view.offsetX = n, this.view.offsetY = r, this.view.width = i, this.view.height = a, this.updateProjectionMatrix();
	}
	clearViewOffset() {
		this.view !== null && (this.view.enabled = !1), this.updateProjectionMatrix();
	}
	updateProjectionMatrix() {
		let e = this.near, t = e * Math.tan(Hl * .5 * this.fov) / this.zoom, n = 2 * t, r = this.aspect * n, i = -.5 * r, a = this.view;
		if (this.view !== null && this.view.enabled) {
			let e = a.fullWidth, o = a.fullHeight;
			i += a.offsetX * r / e, t -= a.offsetY * n / o, r *= a.width / e, n *= a.height / o;
		}
		let o = this.filmOffset;
		o !== 0 && (i += e * o / this.getFilmWidth()), this.projectionMatrix.makePerspective(i, i + r, t, t - n, e, this.far, this.coordinateSystem, this.reversedDepth), this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return t.object.fov = this.fov, t.object.zoom = this.zoom, t.object.near = this.near, t.object.far = this.far, t.object.focus = this.focus, t.object.aspect = this.aspect, this.view !== null && (t.object.view = Object.assign({}, this.view)), t.object.filmGauge = this.filmGauge, t.object.filmOffset = this.filmOffset, t;
	}
}, am = class extends em {
	constructor(e = -1, t = 1, n = 1, r = -1, i = .1, a = 2e3) {
		super(), this.isOrthographicCamera = !0, this.type = "OrthographicCamera", this.zoom = 1, this.view = null, this.left = e, this.right = t, this.top = n, this.bottom = r, this.near = i, this.far = a, this.updateProjectionMatrix();
	}
	copy(e, t) {
		return super.copy(e, t), this.left = e.left, this.right = e.right, this.top = e.top, this.bottom = e.bottom, this.near = e.near, this.far = e.far, this.zoom = e.zoom, this.view = e.view === null ? null : Object.assign({}, e.view), this;
	}
	setViewOffset(e, t, n, r, i, a) {
		this.view === null && (this.view = {
			enabled: !0,
			fullWidth: 1,
			fullHeight: 1,
			offsetX: 0,
			offsetY: 0,
			width: 1,
			height: 1
		}), this.view.enabled = !0, this.view.fullWidth = e, this.view.fullHeight = t, this.view.offsetX = n, this.view.offsetY = r, this.view.width = i, this.view.height = a, this.updateProjectionMatrix();
	}
	clearViewOffset() {
		this.view !== null && (this.view.enabled = !1), this.updateProjectionMatrix();
	}
	updateProjectionMatrix() {
		let e = (this.right - this.left) / (2 * this.zoom), t = (this.top - this.bottom) / (2 * this.zoom), n = (this.right + this.left) / 2, r = (this.top + this.bottom) / 2, i = n - e, a = n + e, o = r + t, s = r - t;
		if (this.view !== null && this.view.enabled) {
			let e = (this.right - this.left) / this.view.fullWidth / this.zoom, t = (this.top - this.bottom) / this.view.fullHeight / this.zoom;
			i += e * this.view.offsetX, a = i + e * this.view.width, o -= t * this.view.offsetY, s = o - t * this.view.height;
		}
		this.projectionMatrix.makeOrthographic(i, a, o, s, this.near, this.far, this.coordinateSystem, this.reversedDepth), this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return t.object.zoom = this.zoom, t.object.left = this.left, t.object.right = this.right, t.object.top = this.top, t.object.bottom = this.bottom, t.object.near = this.near, t.object.far = this.far, this.view !== null && (t.object.view = Object.assign({}, this.view)), t;
	}
}, om = -90, sm = 1, cm = class extends sd {
	constructor(e, t, n) {
		super(), this.type = "CubeCamera", this.renderTarget = n, this.coordinateSystem = null, this.activeMipmapLevel = 0;
		let r = new im(om, sm, e, t);
		r.layers = this.layers, this.add(r);
		let i = new im(om, sm, e, t);
		i.layers = this.layers, this.add(i);
		let a = new im(om, sm, e, t);
		a.layers = this.layers, this.add(a);
		let o = new im(om, sm, e, t);
		o.layers = this.layers, this.add(o);
		let s = new im(om, sm, e, t);
		s.layers = this.layers, this.add(s);
		let c = new im(om, sm, e, t);
		c.layers = this.layers, this.add(c);
	}
	updateCoordinateSystem() {
		let e = this.coordinateSystem, t = this.children.concat(), [n, r, i, a, o, s] = t;
		for (let e of t) this.remove(e);
		if (e === 2e3) n.up.set(0, 1, 0), n.lookAt(1, 0, 0), r.up.set(0, 1, 0), r.lookAt(-1, 0, 0), i.up.set(0, 0, -1), i.lookAt(0, 1, 0), a.up.set(0, 0, 1), a.lookAt(0, -1, 0), o.up.set(0, 1, 0), o.lookAt(0, 0, 1), s.up.set(0, 1, 0), s.lookAt(0, 0, -1);
		else if (e === 2001) n.up.set(0, -1, 0), n.lookAt(-1, 0, 0), r.up.set(0, -1, 0), r.lookAt(1, 0, 0), i.up.set(0, 0, 1), i.lookAt(0, 1, 0), a.up.set(0, 0, -1), a.lookAt(0, -1, 0), o.up.set(0, -1, 0), o.lookAt(0, 0, 1), s.up.set(0, -1, 0), s.lookAt(0, 0, -1);
		else throw Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: " + e);
		for (let e of t) this.add(e), e.updateMatrixWorld();
	}
	update(e, t) {
		this.parent === null && this.updateMatrixWorld();
		let { renderTarget: n, activeMipmapLevel: r } = this;
		this.coordinateSystem !== e.coordinateSystem && (this.coordinateSystem = e.coordinateSystem, this.updateCoordinateSystem());
		let [i, a, o, s, c, l] = this.children, u = e.getRenderTarget(), d = e.getActiveCubeFace(), f = e.getActiveMipmapLevel(), p = e.xr.enabled;
		e.xr.enabled = !1;
		let m = n.texture.generateMipmaps;
		n.texture.generateMipmaps = !1;
		let h = !1;
		h = e.isWebGLRenderer === !0 ? e.state.buffers.depth.getReversed() : e.reversedDepthBuffer, e.setRenderTarget(n, 0, r), h && e.autoClear === !1 && e.clearDepth(), e.render(t, i), e.setRenderTarget(n, 1, r), h && e.autoClear === !1 && e.clearDepth(), e.render(t, a), e.setRenderTarget(n, 2, r), h && e.autoClear === !1 && e.clearDepth(), e.render(t, o), e.setRenderTarget(n, 3, r), h && e.autoClear === !1 && e.clearDepth(), e.render(t, s), e.setRenderTarget(n, 4, r), h && e.autoClear === !1 && e.clearDepth(), e.render(t, c), n.texture.generateMipmaps = m, e.setRenderTarget(n, 5, r), h && e.autoClear === !1 && e.clearDepth(), e.render(t, l), e.setRenderTarget(u, d, f), e.xr.enabled = p, n.texture.needsPMREMUpdate = !0;
	}
}, lm = class extends im {
	constructor(e = []) {
		super(), this.isArrayCamera = !0, this.isMultiViewCamera = !1, this.cameras = e;
	}
}, um = "\\[\\]\\.:\\/", dm = /* @__PURE__ */ RegExp("[\\[\\]\\.:\\/]", "g"), fm = "[^\\[\\]\\.:\\/]", pm = "[^" + um.replace("\\.", "") + "]", mm = /*@__PURE__*/ "((?:WC+[\\/:])*)".replace("WC", fm), hm = /*@__PURE__*/ "(WCOD+)?".replace("WCOD", pm), gm = /*@__PURE__*/ "(?:\\.(WC+)(?:\\[(.+)\\])?)?".replace("WC", fm), _m = /*@__PURE__*/ "\\.(WC+)(?:\\[(.+)\\])?".replace("WC", fm), vm = RegExp("^" + mm + hm + gm + _m + "$"), ym = [
	"material",
	"materials",
	"bones",
	"map"
], bm = class {
	constructor(e, t, n) {
		let r = n || xm.parseTrackName(t);
		this._targetGroup = e, this._bindings = e.subscribe_(t, r);
	}
	getValue(e, t) {
		this.bind();
		let n = this._targetGroup.nCachedObjects_, r = this._bindings[n];
		r !== void 0 && r.getValue(e, t);
	}
	setValue(e, t) {
		let n = this._bindings;
		for (let r = this._targetGroup.nCachedObjects_, i = n.length; r !== i; ++r) n[r].setValue(e, t);
	}
	bind() {
		let e = this._bindings;
		for (let t = this._targetGroup.nCachedObjects_, n = e.length; t !== n; ++t) e[t].bind();
	}
	unbind() {
		let e = this._bindings;
		for (let t = this._targetGroup.nCachedObjects_, n = e.length; t !== n; ++t) e[t].unbind();
	}
}, xm = class e {
	constructor(t, n, r) {
		this.path = n, this.parsedPath = r || e.parseTrackName(n), this.node = e.findNode(t, this.parsedPath.nodeName), this.rootNode = t, this.getValue = this._getValue_unbound, this.setValue = this._setValue_unbound;
	}
	static create(t, n, r) {
		return t && t.isAnimationObjectGroup ? new e.Composite(t, n, r) : new e(t, n, r);
	}
	static sanitizeNodeName(e) {
		return e.replace(/\s/g, "_").replace(dm, "");
	}
	static parseTrackName(e) {
		let t = vm.exec(e);
		if (t === null) throw Error("THREE.PropertyBinding: Cannot parse trackName: " + e);
		let n = {
			nodeName: t[2],
			objectName: t[3],
			objectIndex: t[4],
			propertyName: t[5],
			propertyIndex: t[6]
		}, r = n.nodeName && n.nodeName.lastIndexOf(".");
		if (r !== void 0 && r !== -1) {
			let e = n.nodeName.substring(r + 1);
			ym.indexOf(e) !== -1 && (n.nodeName = n.nodeName.substring(0, r), n.objectName = e);
		}
		if (n.propertyName === null || n.propertyName.length === 0) throw Error("THREE.PropertyBinding: can not parse propertyName from trackName: " + e);
		return n;
	}
	static findNode(e, t) {
		if (t === void 0 || t === "" || t === "." || t === -1 || t === e.name || t === e.uuid) return e;
		if (e.skeleton) {
			let n = e.skeleton.getBoneByName(t);
			if (n !== void 0) return n;
		}
		if (e.children) {
			let n = function(e) {
				for (let r = 0; r < e.length; r++) {
					let i = e[r];
					if (i.name === t || i.uuid === t) return i;
					let a = n(i.children);
					if (a) return a;
				}
				return null;
			}, r = n(e.children);
			if (r) return r;
		}
		return null;
	}
	_getValue_unavailable() {}
	_setValue_unavailable() {}
	_getValue_direct(e, t) {
		e[t] = this.targetObject[this.propertyName];
	}
	_getValue_array(e, t) {
		let n = this.resolvedProperty;
		for (let r = 0, i = n.length; r !== i; ++r) e[t++] = n[r];
	}
	_getValue_arrayElement(e, t) {
		e[t] = this.resolvedProperty[this.propertyIndex];
	}
	_getValue_toArray(e, t) {
		this.resolvedProperty.toArray(e, t);
	}
	_setValue_direct(e, t) {
		this.targetObject[this.propertyName] = e[t];
	}
	_setValue_direct_setNeedsUpdate(e, t) {
		this.targetObject[this.propertyName] = e[t], this.targetObject.needsUpdate = !0;
	}
	_setValue_direct_setMatrixWorldNeedsUpdate(e, t) {
		this.targetObject[this.propertyName] = e[t], this.targetObject.matrixWorldNeedsUpdate = !0;
	}
	_setValue_array(e, t) {
		let n = this.resolvedProperty;
		for (let r = 0, i = n.length; r !== i; ++r) n[r] = e[t++];
	}
	_setValue_array_setNeedsUpdate(e, t) {
		let n = this.resolvedProperty;
		for (let r = 0, i = n.length; r !== i; ++r) n[r] = e[t++];
		this.targetObject.needsUpdate = !0;
	}
	_setValue_array_setMatrixWorldNeedsUpdate(e, t) {
		let n = this.resolvedProperty;
		for (let r = 0, i = n.length; r !== i; ++r) n[r] = e[t++];
		this.targetObject.matrixWorldNeedsUpdate = !0;
	}
	_setValue_arrayElement(e, t) {
		this.resolvedProperty[this.propertyIndex] = e[t];
	}
	_setValue_arrayElement_setNeedsUpdate(e, t) {
		this.resolvedProperty[this.propertyIndex] = e[t], this.targetObject.needsUpdate = !0;
	}
	_setValue_arrayElement_setMatrixWorldNeedsUpdate(e, t) {
		this.resolvedProperty[this.propertyIndex] = e[t], this.targetObject.matrixWorldNeedsUpdate = !0;
	}
	_setValue_fromArray(e, t) {
		this.resolvedProperty.fromArray(e, t);
	}
	_setValue_fromArray_setNeedsUpdate(e, t) {
		this.resolvedProperty.fromArray(e, t), this.targetObject.needsUpdate = !0;
	}
	_setValue_fromArray_setMatrixWorldNeedsUpdate(e, t) {
		this.resolvedProperty.fromArray(e, t), this.targetObject.matrixWorldNeedsUpdate = !0;
	}
	_getValue_unbound(e, t) {
		this.bind(), this.getValue(e, t);
	}
	_setValue_unbound(e, t) {
		this.bind(), this.setValue(e, t);
	}
	bind() {
		let t = this.node, n = this.parsedPath, r = n.objectName, i = n.propertyName, a = n.propertyIndex;
		if (t || (t = e.findNode(this.rootNode, n.nodeName), this.node = t), this.getValue = this._getValue_unavailable, this.setValue = this._setValue_unavailable, !t) {
			U("PropertyBinding: No target node found for track: " + this.path + ".");
			return;
		}
		if (r) {
			let e = n.objectIndex;
			switch (r) {
				case "materials":
					if (!t.material) {
						W("PropertyBinding: Can not bind to material as node does not have a material.", this);
						return;
					}
					if (!t.material.materials) {
						W("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.", this);
						return;
					}
					t = t.material.materials;
					break;
				case "bones":
					if (!t.skeleton) {
						W("PropertyBinding: Can not bind to bones as node does not have a skeleton.", this);
						return;
					}
					t = t.skeleton.bones;
					for (let n = 0; n < t.length; n++) if (t[n].name === e) {
						e = n;
						break;
					}
					break;
				case "map":
					if ("map" in t) {
						t = t.map;
						break;
					}
					if (!t.material) {
						W("PropertyBinding: Can not bind to material as node does not have a material.", this);
						return;
					}
					if (!t.material.map) {
						W("PropertyBinding: Can not bind to material.map as node.material does not have a map.", this);
						return;
					}
					t = t.material.map;
					break;
				default:
					if (t[r] === void 0) {
						W("PropertyBinding: Can not bind to objectName of node undefined.", this);
						return;
					}
					t = t[r];
			}
			if (e !== void 0) {
				if (t[e] === void 0) {
					W("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.", this, t);
					return;
				}
				t = t[e];
			}
		}
		let o = t[i];
		if (o === void 0) {
			let e = n.nodeName;
			W("PropertyBinding: Trying to update property for track: " + e + "." + i + " but it wasn't found.", t);
			return;
		}
		let s = this.Versioning.None;
		this.targetObject = t, t.isMaterial === !0 ? s = this.Versioning.NeedsUpdate : t.isObject3D === !0 && (s = this.Versioning.MatrixWorldNeedsUpdate);
		let c = this.BindingType.Direct;
		if (a !== void 0) {
			if (i === "morphTargetInfluences") {
				if (!t.geometry) {
					W("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.", this);
					return;
				}
				if (!t.geometry.morphAttributes) {
					W("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.", this);
					return;
				}
				t.morphTargetDictionary[a] !== void 0 && (a = t.morphTargetDictionary[a]);
			}
			c = this.BindingType.ArrayElement, this.resolvedProperty = o, this.propertyIndex = a;
		} else o.fromArray !== void 0 && o.toArray !== void 0 ? (c = this.BindingType.HasFromToArray, this.resolvedProperty = o) : Array.isArray(o) ? (c = this.BindingType.EntireArray, this.resolvedProperty = o) : this.propertyName = i;
		this.getValue = this.GetterByBindingType[c], this.setValue = this.SetterByBindingTypeAndVersioning[c][s];
	}
	unbind() {
		this.node = null, this.getValue = this._getValue_unbound, this.setValue = this._setValue_unbound;
	}
};
xm.Composite = bm, xm.prototype.BindingType = {
	Direct: 0,
	EntireArray: 1,
	ArrayElement: 2,
	HasFromToArray: 3
}, xm.prototype.Versioning = {
	None: 0,
	NeedsUpdate: 1,
	MatrixWorldNeedsUpdate: 2
}, xm.prototype.GetterByBindingType = [
	xm.prototype._getValue_direct,
	xm.prototype._getValue_array,
	xm.prototype._getValue_arrayElement,
	xm.prototype._getValue_toArray
], xm.prototype.SetterByBindingTypeAndVersioning = [
	[
		xm.prototype._setValue_direct,
		xm.prototype._setValue_direct_setNeedsUpdate,
		xm.prototype._setValue_direct_setMatrixWorldNeedsUpdate
	],
	[
		xm.prototype._setValue_array,
		xm.prototype._setValue_array_setNeedsUpdate,
		xm.prototype._setValue_array_setMatrixWorldNeedsUpdate
	],
	[
		xm.prototype._setValue_arrayElement,
		xm.prototype._setValue_arrayElement_setNeedsUpdate,
		xm.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate
	],
	[
		xm.prototype._setValue_fromArray,
		xm.prototype._setValue_fromArray_setNeedsUpdate,
		xm.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate
	]
];
var Sm = class {
	constructor(e = 1, t = 0, n = 0) {
		this.radius = e, this.phi = t, this.theta = n;
	}
	set(e, t, n) {
		return this.radius = e, this.phi = t, this.theta = n, this;
	}
	copy(e) {
		return this.radius = e.radius, this.phi = e.phi, this.theta = e.theta, this;
	}
	makeSafe() {
		let e = 1e-6;
		return this.phi = G(this.phi, e, Math.PI - e), this;
	}
	setFromVector3(e) {
		return this.setFromCartesianCoords(e.x, e.y, e.z);
	}
	setFromCartesianCoords(e, t, n) {
		return this.radius = Math.sqrt(e * e + t * t + n * n), this.radius === 0 ? (this.theta = 0, this.phi = 0) : (this.theta = Math.atan2(e, n), this.phi = Math.acos(G(t / this.radius, -1, 1))), this;
	}
	clone() {
		return new this.constructor().copy(this);
	}
};
(class e {
	static {
		e.prototype.isMatrix2 = !0;
	}
	constructor(e, t, n, r) {
		this.elements = [
			1,
			0,
			0,
			1
		], e !== void 0 && this.set(e, t, n, r);
	}
	identity() {
		return this.set(1, 0, 0, 1), this;
	}
	fromArray(e, t = 0) {
		for (let n = 0; n < 4; n++) this.elements[n] = e[n + t];
		return this;
	}
	set(e, t, n, r) {
		let i = this.elements;
		return i[0] = e, i[2] = t, i[1] = n, i[3] = r, this;
	}
});
var Cm = class extends tp {
	constructor(e = 1) {
		let t = [
			0,
			0,
			0,
			e,
			0,
			0,
			0,
			0,
			0,
			0,
			e,
			0,
			0,
			0,
			0,
			0,
			0,
			e
		], n = [
			1,
			0,
			0,
			1,
			.6,
			0,
			0,
			1,
			0,
			.6,
			1,
			0,
			0,
			0,
			1,
			0,
			.6,
			1
		], r = new df();
		r.setAttribute("position", new Qd(t, 3)), r.setAttribute("color", new Qd(n, 3));
		let i = new Uf({
			vertexColors: !0,
			toneMapped: !1
		});
		super(r, i), this.type = "AxesHelper";
	}
	setColors(e, t, n) {
		let r = new X(), i = this.geometry.attributes.color.array;
		return r.set(e), r.toArray(i, 0), r.toArray(i, 3), r.set(t), r.toArray(i, 6), r.toArray(i, 9), r.set(n), r.toArray(i, 12), r.toArray(i, 15), this.geometry.attributes.color.needsUpdate = !0, this;
	}
	dispose() {
		super.dispose(), this.geometry.dispose(), this.material.dispose();
	}
}, wm = class extends zl {
	constructor(e, t = null) {
		super(), this.object = e, this.domElement = t, this.enabled = !0, this.state = -1, this.keys = {}, this.mouseButtons = {
			LEFT: null,
			MIDDLE: null,
			RIGHT: null
		}, this.touches = {
			ONE: null,
			TWO: null
		};
	}
	connect(e) {
		this.domElement !== null && this.disconnect(), this.domElement = e;
	}
	disconnect() {}
	dispose() {}
	update() {}
};
function Tm(e, t, n, r) {
	let i = Em(r);
	switch (n) {
		case bc: return e * t;
		case Tc: return e * t / i.components * i.byteLength;
		case Ec: return e * t / i.components * i.byteLength;
		case Dc: return e * t * 2 / i.components * i.byteLength;
		case Oc: return e * t * 2 / i.components * i.byteLength;
		case xc: return e * t * 3 / i.components * i.byteLength;
		case Sc: return e * t * 4 / i.components * i.byteLength;
		case kc: return e * t * 4 / i.components * i.byteLength;
		case Ac:
		case jc: return Math.floor((e + 3) / 4) * Math.floor((t + 3) / 4) * 8;
		case Mc:
		case Nc: return Math.floor((e + 3) / 4) * Math.floor((t + 3) / 4) * 16;
		case Fc:
		case Lc: return Math.max(e, 16) * Math.max(t, 8) / 4;
		case Pc:
		case Ic: return Math.max(e, 8) * Math.max(t, 8) / 2;
		case Rc:
		case zc:
		case Vc:
		case Hc: return Math.floor((e + 3) / 4) * Math.floor((t + 3) / 4) * 8;
		case Bc:
		case Uc:
		case Wc: return Math.floor((e + 3) / 4) * Math.floor((t + 3) / 4) * 16;
		case Gc: return Math.floor((e + 3) / 4) * Math.floor((t + 3) / 4) * 16;
		case Kc: return Math.floor((e + 4) / 5) * Math.floor((t + 3) / 4) * 16;
		case qc: return Math.floor((e + 4) / 5) * Math.floor((t + 4) / 5) * 16;
		case Jc: return Math.floor((e + 5) / 6) * Math.floor((t + 4) / 5) * 16;
		case Yc: return Math.floor((e + 5) / 6) * Math.floor((t + 5) / 6) * 16;
		case Xc: return Math.floor((e + 7) / 8) * Math.floor((t + 4) / 5) * 16;
		case Zc: return Math.floor((e + 7) / 8) * Math.floor((t + 5) / 6) * 16;
		case Qc: return Math.floor((e + 7) / 8) * Math.floor((t + 7) / 8) * 16;
		case $c: return Math.floor((e + 9) / 10) * Math.floor((t + 4) / 5) * 16;
		case el: return Math.floor((e + 9) / 10) * Math.floor((t + 5) / 6) * 16;
		case tl: return Math.floor((e + 9) / 10) * Math.floor((t + 7) / 8) * 16;
		case nl: return Math.floor((e + 9) / 10) * Math.floor((t + 9) / 10) * 16;
		case rl: return Math.floor((e + 11) / 12) * Math.floor((t + 9) / 10) * 16;
		case il: return Math.floor((e + 11) / 12) * Math.floor((t + 11) / 12) * 16;
		case al:
		case ol:
		case sl: return Math.ceil(e / 4) * Math.ceil(t / 4) * 16;
		case cl:
		case ll: return Math.ceil(e / 4) * Math.ceil(t / 4) * 8;
		case ul:
		case dl: return Math.ceil(e / 4) * Math.ceil(t / 4) * 16;
	}
	throw Error(`Unable to determine texture byte length for ${n} format.`);
}
function Em(e) {
	switch (e) {
		case sc:
		case cc: return {
			byteLength: 1,
			components: 1
		};
		case uc:
		case lc:
		case mc: return {
			byteLength: 2,
			components: 1
		};
		case hc:
		case gc: return {
			byteLength: 2,
			components: 4
		};
		case fc:
		case dc:
		case pc: return {
			byteLength: 4,
			components: 1
		};
		case vc:
		case yc: return {
			byteLength: 4,
			components: 3
		};
	}
	throw Error(`THREE.TextureUtils: Unknown texture type ${e}.`);
}
typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register", { detail: { revision: "186" } })), typeof window < "u" && (window.__THREE__ ? U("WARNING: Multiple instances of Three.js being imported.") : window.__THREE__ = "186");
// ../../../vision/spectacular/node_modules/three/build/three.module.js
function Dm() {
	let e = null, t = !1, n = null, r = null;
	function i(t, a) {
		r = e.requestAnimationFrame(i), n(t, a);
	}
	return {
		start: function() {
			t !== !0 && n !== null && e !== null && (r = e.requestAnimationFrame(i), t = !0);
		},
		stop: function() {
			e !== null && e.cancelAnimationFrame(r), t = !1;
		},
		setAnimationLoop: function(e) {
			n = e;
		},
		setContext: function(t) {
			e = t;
		}
	};
}
function Om(e) {
	let t = /* @__PURE__ */ new WeakMap();
	function n(t, n) {
		let r = t.array, i = t.usage, a = r.byteLength, o = e.createBuffer();
		e.bindBuffer(n, o), e.bufferData(n, r, i), t.onUploadCallback();
		let s;
		if (r instanceof Float32Array) s = e.FLOAT;
		else if (typeof Float16Array < "u" && r instanceof Float16Array) s = e.HALF_FLOAT;
		else if (r instanceof Uint16Array) s = t.isFloat16BufferAttribute ? e.HALF_FLOAT : e.UNSIGNED_SHORT;
		else if (r instanceof Int16Array) s = e.SHORT;
		else if (r instanceof Uint32Array) s = e.UNSIGNED_INT;
		else if (r instanceof Int32Array) s = e.INT;
		else if (r instanceof Int8Array) s = e.BYTE;
		else if (r instanceof Uint8Array) s = e.UNSIGNED_BYTE;
		else if (r instanceof Uint8ClampedArray) s = e.UNSIGNED_BYTE;
		else throw Error("THREE.WebGLAttributes: Unsupported buffer data format: " + r);
		return {
			buffer: o,
			type: s,
			bytesPerElement: r.BYTES_PER_ELEMENT,
			version: t.version,
			size: a
		};
	}
	function r(t, n, r) {
		let i = n.array, a = n.updateRanges;
		if (e.bindBuffer(r, t), a.length === 0) e.bufferSubData(r, 0, i);
		else {
			a.sort((e, t) => e.start - t.start);
			let t = 0;
			for (let e = 1; e < a.length; e++) {
				let n = a[t], r = a[e];
				r.start <= n.start + n.count + 1 ? n.count = Math.max(n.count, r.start + r.count - n.start) : (++t, a[t] = r);
			}
			a.length = t + 1;
			for (let t = 0, n = a.length; t < n; t++) {
				let n = a[t];
				e.bufferSubData(r, n.start * i.BYTES_PER_ELEMENT, i, n.start, n.count);
			}
			n.clearUpdateRanges();
		}
		n.onUploadCallback();
	}
	function i(e) {
		return e.isInterleavedBufferAttribute && (e = e.data), t.get(e);
	}
	function a(n) {
		n.isInterleavedBufferAttribute && (n = n.data);
		let r = t.get(n);
		r && (e.deleteBuffer(r.buffer), t.delete(n));
	}
	function o(e, i) {
		if (e.isInterleavedBufferAttribute && (e = e.data), e.isGLBufferAttribute) {
			let n = t.get(e);
			(!n || n.version < e.version) && t.set(e, {
				buffer: e.buffer,
				type: e.type,
				bytesPerElement: e.elementSize,
				version: e.version
			});
			return;
		}
		let a = t.get(e);
		if (a === void 0) t.set(e, n(e, i));
		else if (a.version < e.version) {
			if (a.size !== e.array.byteLength) throw Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");
			r(a.buffer, e, i), a.version = e.version;
		}
	}
	return {
		get: i,
		remove: a,
		update: o
	};
}
var Z = {
	alphahash_fragment: "#ifdef USE_ALPHAHASH\n	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;\n#endif",
	alphahash_pars_fragment: "#ifdef USE_ALPHAHASH\n	const float ALPHA_HASH_SCALE = 0.05;\n	float hash2D( vec2 value ) {\n		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );\n	}\n	float hash3D( vec3 value ) {\n		return hash2D( vec2( hash2D( value.xy ), value.z ) );\n	}\n	float getAlphaHashThreshold( vec3 position ) {\n		float maxDeriv = max(\n			length( dFdx( position.xyz ) ),\n			length( dFdy( position.xyz ) )\n		);\n		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );\n		vec2 pixScales = vec2(\n			exp2( floor( log2( pixScale ) ) ),\n			exp2( ceil( log2( pixScale ) ) )\n		);\n		vec2 alpha = vec2(\n			hash3D( floor( pixScales.x * position.xyz ) ),\n			hash3D( floor( pixScales.y * position.xyz ) )\n		);\n		float lerpFactor = fract( log2( pixScale ) );\n		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;\n		float a = min( lerpFactor, 1.0 - lerpFactor );\n		vec3 cases = vec3(\n			x * x / ( 2.0 * a * ( 1.0 - a ) ),\n			( x - 0.5 * a ) / ( 1.0 - a ),\n			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )\n		);\n		float threshold = ( x < ( 1.0 - a ) )\n			? ( ( x < a ) ? cases.x : cases.y )\n			: cases.z;\n		return clamp( threshold , 1.0e-6, 1.0 );\n	}\n#endif",
	alphamap_fragment: "#ifdef USE_ALPHAMAP\n	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;\n#endif",
	alphamap_pars_fragment: "#ifdef USE_ALPHAMAP\n	uniform sampler2D alphaMap;\n#endif",
	alphatest_fragment: "#ifdef USE_ALPHATEST\n	#ifdef ALPHA_TO_COVERAGE\n	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );\n	if ( diffuseColor.a == 0.0 ) discard;\n	#else\n	if ( diffuseColor.a < alphaTest ) discard;\n	#endif\n#endif",
	alphatest_pars_fragment: "#ifdef USE_ALPHATEST\n	uniform float alphaTest;\n#endif",
	aomap_fragment: "#ifdef USE_AOMAP\n	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;\n	reflectedLight.indirectDiffuse *= ambientOcclusion;\n	#if defined( USE_CLEARCOAT ) \n		clearcoatSpecularIndirect *= ambientOcclusion;\n	#endif\n	#if defined( USE_SHEEN ) \n		sheenSpecularIndirect *= ambientOcclusion;\n	#endif\n	#if defined( USE_ENVMAP ) && defined( STANDARD )\n		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );\n		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );\n	#endif\n#endif",
	aomap_pars_fragment: "#ifdef USE_AOMAP\n	uniform sampler2D aoMap;\n	uniform float aoMapIntensity;\n#endif",
	batching_pars_vertex: "#ifdef USE_BATCHING\n	#if ! defined( GL_ANGLE_multi_draw )\n	#define gl_DrawID _gl_DrawID\n	uniform int _gl_DrawID;\n	#endif\n	uniform highp sampler2D batchingTexture;\n	uniform highp usampler2D batchingIdTexture;\n	mat4 getBatchingMatrix( const in float i ) {\n		int size = textureSize( batchingTexture, 0 ).x;\n		int j = int( i ) * 4;\n		int x = j % size;\n		int y = j / size;\n		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );\n		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );\n		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );\n		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );\n		return mat4( v1, v2, v3, v4 );\n	}\n	float getIndirectIndex( const in int i ) {\n		int size = textureSize( batchingIdTexture, 0 ).x;\n		int x = i % size;\n		int y = i / size;\n		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );\n	}\n#endif\n#ifdef USE_BATCHING_COLOR\n	uniform sampler2D batchingColorTexture;\n	vec4 getBatchingColor( const in float i ) {\n		int size = textureSize( batchingColorTexture, 0 ).x;\n		int j = int( i );\n		int x = j % size;\n		int y = j / size;\n		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );\n	}\n#endif",
	batching_vertex: "#ifdef USE_BATCHING\n	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );\n#endif",
	begin_vertex: "vec3 transformed = vec3( position );\n#ifdef USE_ALPHAHASH\n	vPosition = vec3( position );\n#endif",
	beginnormal_vertex: "vec3 objectNormal = vec3( normal );\n#ifdef USE_TANGENT\n	vec3 objectTangent = vec3( tangent.xyz );\n#endif",
	bsdfs: "float G_BlinnPhong_Implicit( ) {\n	return 0.25;\n}\nfloat D_BlinnPhong( const in float shininess, const in float dotNH ) {\n	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );\n}\nvec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {\n	vec3 halfDir = normalize( lightDir + viewDir );\n	float dotNH = saturate( dot( normal, halfDir ) );\n	float dotVH = saturate( dot( viewDir, halfDir ) );\n	vec3 F = F_Schlick( specularColor, 1.0, dotVH );\n	float G = G_BlinnPhong_Implicit( );\n	float D = D_BlinnPhong( shininess, dotNH );\n	return F * ( G * D );\n} // validated",
	iridescence_fragment: "#ifdef USE_IRIDESCENCE\n	const mat3 XYZ_TO_REC709 = mat3(\n		 3.2404542, -0.9692660,  0.0556434,\n		-1.5371385,  1.8760108, -0.2040259,\n		-0.4985314,  0.0415560,  1.0572252\n	);\n	vec3 Fresnel0ToIor( vec3 fresnel0 ) {\n		vec3 sqrtF0 = sqrt( fresnel0 );\n		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );\n	}\n	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {\n		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );\n	}\n	float IorToFresnel0( float transmittedIor, float incidentIor ) {\n		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));\n	}\n	vec3 evalSensitivity( float OPD, vec3 shift ) {\n		float phase = 2.0 * PI * OPD * 1.0e-9;\n		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );\n		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );\n		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );\n		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );\n		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );\n		xyz /= 1.0685e-7;\n		vec3 rgb = XYZ_TO_REC709 * xyz;\n		return rgb;\n	}\n	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {\n		vec3 I;\n		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );\n		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );\n		float cosTheta2Sq = 1.0 - sinTheta2Sq;\n		if ( cosTheta2Sq < 0.0 ) {\n			return vec3( 1.0 );\n		}\n		float cosTheta2 = sqrt( cosTheta2Sq );\n		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );\n		float R12 = F_Schlick( R0, 1.0, cosTheta1 );\n		float T121 = 1.0 - R12;\n		float phi12 = 0.0;\n		if ( iridescenceIOR < outsideIOR ) phi12 = PI;\n		float phi21 = PI - phi12;\n		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );\n		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );\n		vec3 phi23 = vec3( 0.0 );\n		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;\n		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;\n		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;\n		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;\n		vec3 phi = vec3( phi21 ) + phi23;\n		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );\n		vec3 r123 = sqrt( R123 );\n		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );\n		vec3 C0 = R12 + Rs;\n		I = C0;\n		vec3 Cm = Rs - T121;\n		for ( int m = 1; m <= 2; ++ m ) {\n			Cm *= r123;\n			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );\n			I += Cm * Sm;\n		}\n		return max( I, vec3( 0.0 ) );\n	}\n#endif",
	bumpmap_pars_fragment: "#ifdef USE_BUMPMAP\n	uniform sampler2D bumpMap;\n	uniform float bumpScale;\n	vec2 dHdxy_fwd() {\n		vec2 dSTdx = dFdx( vBumpMapUv );\n		vec2 dSTdy = dFdy( vBumpMapUv );\n		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;\n		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;\n		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;\n		return vec2( dBx, dBy );\n	}\n	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {\n		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );\n		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );\n		vec3 vN = surf_norm;\n		vec3 R1 = cross( vSigmaY, vN );\n		vec3 R2 = cross( vN, vSigmaX );\n		float fDet = dot( vSigmaX, R1 ) * faceDirection;\n		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );\n		return normalize( abs( fDet ) * surf_norm - vGrad );\n	}\n#endif",
	clipping_planes_fragment: "#if NUM_CLIPPING_PLANES > 0\n	vec4 plane;\n	#ifdef ALPHA_TO_COVERAGE\n		float distanceToPlane, distanceGradient;\n		float clipOpacity = 1.0;\n		#pragma unroll_loop_start\n		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {\n			plane = clippingPlanes[ i ];\n			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;\n			distanceGradient = fwidth( distanceToPlane ) / 2.0;\n			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );\n			if ( clipOpacity == 0.0 ) discard;\n		}\n		#pragma unroll_loop_end\n		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES\n			float unionClipOpacity = 1.0;\n			#pragma unroll_loop_start\n			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {\n				plane = clippingPlanes[ i ];\n				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;\n				distanceGradient = fwidth( distanceToPlane ) / 2.0;\n				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );\n			}\n			#pragma unroll_loop_end\n			clipOpacity *= 1.0 - unionClipOpacity;\n		#endif\n		diffuseColor.a *= clipOpacity;\n		if ( diffuseColor.a == 0.0 ) discard;\n	#else\n		#pragma unroll_loop_start\n		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {\n			plane = clippingPlanes[ i ];\n			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;\n		}\n		#pragma unroll_loop_end\n		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES\n			bool clipped = true;\n			#pragma unroll_loop_start\n			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {\n				plane = clippingPlanes[ i ];\n				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;\n			}\n			#pragma unroll_loop_end\n			if ( clipped ) discard;\n		#endif\n	#endif\n#endif",
	clipping_planes_pars_fragment: "#if NUM_CLIPPING_PLANES > 0\n	varying vec3 vClipPosition;\n	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];\n#endif",
	clipping_planes_pars_vertex: "#if NUM_CLIPPING_PLANES > 0\n	varying vec3 vClipPosition;\n#endif",
	clipping_planes_vertex: "#if NUM_CLIPPING_PLANES > 0\n	vClipPosition = - mvPosition.xyz;\n#endif",
	color_fragment: "#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )\n	diffuseColor *= vColor;\n#endif",
	color_pars_fragment: "#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )\n	varying vec4 vColor;\n#endif",
	color_pars_vertex: "#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )\n	varying vec4 vColor;\n#endif",
	color_vertex: "#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )\n	vColor = vec4( 1.0 );\n#endif\n#ifdef USE_COLOR_ALPHA\n	vColor *= color;\n#elif defined( USE_COLOR )\n	vColor.rgb *= color;\n#endif\n#ifdef USE_INSTANCING_COLOR\n	vColor.rgb *= instanceColor.rgb;\n#endif\n#ifdef USE_BATCHING_COLOR\n	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );\n#endif",
	common: "#define PI 3.141592653589793\n#define PI2 6.283185307179586\n#define PI_HALF 1.5707963267948966\n#define RECIPROCAL_PI 0.3183098861837907\n#define RECIPROCAL_PI2 0.15915494309189535\n#define EPSILON 1e-6\n#ifndef saturate\n#define saturate( a ) clamp( a, 0.0, 1.0 )\n#endif\n#define whiteComplement( a ) ( 1.0 - saturate( a ) )\nfloat pow2( const in float x ) { return x*x; }\nvec3 pow2( const in vec3 x ) { return x*x; }\nfloat pow3( const in float x ) { return x*x*x; }\nfloat pow4( const in float x ) { float x2 = x*x; return x2*x2; }\nfloat max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }\nfloat average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }\nhighp float rand( const in vec2 uv ) {\n	const highp float a = 12.9898, b = 78.233, c = 43758.5453;\n	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );\n	return fract( sin( sn ) * c );\n}\n#ifdef HIGH_PRECISION\n	float precisionSafeLength( vec3 v ) { return length( v ); }\n#else\n	float precisionSafeLength( vec3 v ) {\n		float maxComponent = max3( abs( v ) );\n		return length( v / maxComponent ) * maxComponent;\n	}\n#endif\nstruct IncidentLight {\n	vec3 color;\n	vec3 direction;\n	bool visible;\n};\nstruct ReflectedLight {\n	vec3 directDiffuse;\n	vec3 directSpecular;\n	vec3 indirectDiffuse;\n	vec3 indirectSpecular;\n};\n#ifdef USE_ALPHAHASH\n	varying vec3 vPosition;\n#endif\nvec3 transformDirection( in vec3 dir, in mat4 matrix ) {\n	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );\n}\n#define inverseTransformDirection transformDirectionByInverseViewMatrix\nvec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {\n	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );\n}\nvec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {\n	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );\n}\nbool isPerspectiveMatrix( mat4 m ) {\n	return m[ 2 ][ 3 ] == - 1.0;\n}\nvec2 equirectUv( in vec3 dir ) {\n	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;\n	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;\n	return vec2( u, v );\n}\nvec3 BRDF_Lambert( const in vec3 diffuseColor ) {\n	return RECIPROCAL_PI * diffuseColor;\n}\nvec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {\n	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );\n	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );\n}\nfloat F_Schlick( const in float f0, const in float f90, const in float dotVH ) {\n	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );\n	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );\n} // validated",
	cube_uv_reflection_fragment: "#ifdef ENVMAP_TYPE_CUBE_UV\n	#define cubeUV_minMipLevel 4.0\n	#define cubeUV_minTileSize 16.0\n	float getFace( vec3 direction ) {\n		vec3 absDirection = abs( direction );\n		float face = - 1.0;\n		if ( absDirection.x > absDirection.z ) {\n			if ( absDirection.x > absDirection.y )\n				face = direction.x > 0.0 ? 0.0 : 3.0;\n			else\n				face = direction.y > 0.0 ? 1.0 : 4.0;\n		} else {\n			if ( absDirection.z > absDirection.y )\n				face = direction.z > 0.0 ? 2.0 : 5.0;\n			else\n				face = direction.y > 0.0 ? 1.0 : 4.0;\n		}\n		return face;\n	}\n	vec2 getUV( vec3 direction, float face ) {\n		vec2 uv;\n		if ( face == 0.0 ) {\n			uv = vec2( direction.z, direction.y ) / abs( direction.x );\n		} else if ( face == 1.0 ) {\n			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );\n		} else if ( face == 2.0 ) {\n			uv = vec2( - direction.x, direction.y ) / abs( direction.z );\n		} else if ( face == 3.0 ) {\n			uv = vec2( - direction.z, direction.y ) / abs( direction.x );\n		} else if ( face == 4.0 ) {\n			uv = vec2( - direction.x, direction.z ) / abs( direction.y );\n		} else {\n			uv = vec2( direction.x, direction.y ) / abs( direction.z );\n		}\n		return 0.5 * ( uv + 1.0 );\n	}\n	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {\n		float face = getFace( direction );\n		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );\n		mipInt = max( mipInt, cubeUV_minMipLevel );\n		float faceSize = exp2( mipInt );\n		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;\n		if ( face > 2.0 ) {\n			uv.y += faceSize;\n			face -= 3.0;\n		}\n		uv.x += face * faceSize;\n		uv.x += filterInt * 3.0 * cubeUV_minTileSize;\n		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );\n		uv.x *= CUBEUV_TEXEL_WIDTH;\n		uv.y *= CUBEUV_TEXEL_HEIGHT;\n		#ifdef texture2DGradEXT\n			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;\n		#else\n			return texture2D( envMap, uv ).rgb;\n		#endif\n	}\n	#define cubeUV_r0 1.0\n	#define cubeUV_m0 - 2.0\n	#define cubeUV_r1 0.8\n	#define cubeUV_m1 - 1.0\n	#define cubeUV_r4 0.4\n	#define cubeUV_m4 2.0\n	#define cubeUV_r5 0.305\n	#define cubeUV_m5 3.0\n	#define cubeUV_r6 0.21\n	#define cubeUV_m6 4.0\n	float roughnessToMip( float roughness ) {\n		float mip = 0.0;\n		if ( roughness >= cubeUV_r1 ) {\n			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;\n		} else if ( roughness >= cubeUV_r4 ) {\n			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;\n		} else if ( roughness >= cubeUV_r5 ) {\n			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;\n		} else if ( roughness >= cubeUV_r6 ) {\n			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;\n		} else {\n			mip = - 2.0 * log2( 1.16 * roughness );		}\n		return mip;\n	}\n	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {\n		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );\n		float mipF = fract( mip );\n		float mipInt = floor( mip );\n		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );\n		if ( mipF == 0.0 ) {\n			return vec4( color0, 1.0 );\n		} else {\n			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );\n			return vec4( mix( color0, color1, mipF ), 1.0 );\n		}\n	}\n#endif",
	defaultnormal_vertex: "vec3 transformedNormal = objectNormal;\n#ifdef USE_TANGENT\n	vec3 transformedTangent = objectTangent;\n#endif\n#ifdef USE_BATCHING\n	mat3 bm = mat3( batchingMatrix );\n	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );\n	transformedNormal = bm * transformedNormal;\n	#ifdef USE_TANGENT\n		transformedTangent = bm * transformedTangent;\n	#endif\n#endif\n#ifdef USE_INSTANCING\n	mat3 im = mat3( instanceMatrix );\n	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );\n	transformedNormal = im * transformedNormal;\n	#ifdef USE_TANGENT\n		transformedTangent = im * transformedTangent;\n	#endif\n#endif\ntransformedNormal = normalMatrix * transformedNormal;\n#ifdef FLIP_SIDED\n	transformedNormal = - transformedNormal;\n#endif\n#ifdef USE_TANGENT\n	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;\n#endif",
	displacementmap_pars_vertex: "#ifdef USE_DISPLACEMENTMAP\n	uniform sampler2D displacementMap;\n	uniform float displacementScale;\n	uniform float displacementBias;\n#endif",
	displacementmap_vertex: "#ifdef USE_DISPLACEMENTMAP\n	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );\n#endif",
	emissivemap_fragment: "#ifdef USE_EMISSIVEMAP\n	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );\n	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE\n		emissiveColor = sRGBTransferEOTF( emissiveColor );\n	#endif\n	totalEmissiveRadiance *= emissiveColor.rgb;\n#endif",
	emissivemap_pars_fragment: "#ifdef USE_EMISSIVEMAP\n	uniform sampler2D emissiveMap;\n#endif",
	colorspace_fragment: "gl_FragColor = linearToOutputTexel( gl_FragColor );",
	colorspace_pars_fragment: "vec4 LinearTransferOETF( in vec4 value ) {\n	return value;\n}\nvec4 sRGBTransferEOTF( in vec4 value ) {\n	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );\n}\nvec4 sRGBTransferOETF( in vec4 value ) {\n	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );\n}",
	envmap_fragment: "#ifdef USE_ENVMAP\n	#ifdef ENV_WORLDPOS\n		vec3 cameraToFrag;\n		if ( isOrthographic ) {\n			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );\n		} else {\n			cameraToFrag = normalize( vWorldPosition - cameraPosition );\n		}\n		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );\n		#ifdef ENVMAP_MODE_REFLECTION\n			vec3 reflectVec = reflect( cameraToFrag, worldNormal );\n		#else\n			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );\n		#endif\n	#else\n		vec3 reflectVec = vReflect;\n	#endif\n	#ifdef ENVMAP_TYPE_CUBE\n		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );\n		#ifdef ENVMAP_BLENDING_MULTIPLY\n			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );\n		#elif defined( ENVMAP_BLENDING_MIX )\n			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );\n		#elif defined( ENVMAP_BLENDING_ADD )\n			outgoingLight += envColor.xyz * specularStrength * reflectivity;\n		#endif\n	#endif\n#endif",
	envmap_common_pars_fragment: "#ifdef USE_ENVMAP\n	uniform float envMapIntensity;\n	uniform mat3 envMapRotation;\n	#ifdef ENVMAP_TYPE_CUBE\n		uniform samplerCube envMap;\n	#else\n		uniform sampler2D envMap;\n	#endif\n#endif",
	envmap_pars_fragment: "#ifdef USE_ENVMAP\n	uniform float reflectivity;\n	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )\n		#define ENV_WORLDPOS\n	#endif\n	#ifdef ENV_WORLDPOS\n		varying vec3 vWorldPosition;\n		uniform float refractionRatio;\n	#else\n		varying vec3 vReflect;\n	#endif\n#endif",
	envmap_pars_vertex: "#ifdef USE_ENVMAP\n	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )\n		#define ENV_WORLDPOS\n	#endif\n	#ifdef ENV_WORLDPOS\n		\n		varying vec3 vWorldPosition;\n	#else\n		varying vec3 vReflect;\n		uniform float refractionRatio;\n	#endif\n#endif",
	envmap_physical_pars_fragment: "#ifdef USE_ENVMAP\n	vec3 getIBLIrradiance( const in vec3 normal ) {\n		#ifdef ENVMAP_TYPE_CUBE_UV\n			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );\n			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );\n			return PI * envMapColor.rgb * envMapIntensity;\n		#else\n			return vec3( 0.0 );\n		#endif\n	}\n	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {\n		#ifdef ENVMAP_TYPE_CUBE_UV\n			vec3 reflectVec = reflect( - viewDir, normal );\n			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );\n			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );\n			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );\n			return envMapColor.rgb * envMapIntensity;\n		#else\n			return vec3( 0.0 );\n		#endif\n	}\n	#ifdef USE_RETROREFLECTION\n		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {\n			#ifdef ENVMAP_TYPE_CUBE_UV\n				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );\n				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );\n				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );\n				return envMapColor.rgb * envMapIntensity;\n			#else\n				return vec3( 0.0 );\n			#endif\n		}\n	#endif\n	#ifdef USE_ANISOTROPY\n		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {\n			#ifdef ENVMAP_TYPE_CUBE_UV\n				vec3 bentNormal = cross( bitangent, viewDir );\n				bentNormal = normalize( cross( bentNormal, bitangent ) );\n				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );\n				return getIBLRadiance( viewDir, bentNormal, roughness );\n			#else\n				return vec3( 0.0 );\n			#endif\n		}\n		#ifdef USE_RETROREFLECTION\n			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {\n				#ifdef ENVMAP_TYPE_CUBE_UV\n					vec3 bentNormal = cross( bitangent, viewDir );\n					bentNormal = normalize( cross( bentNormal, bitangent ) );\n					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );\n					return getIBLRetroRadiance( viewDir, bentNormal, roughness );\n				#else\n					return vec3( 0.0 );\n				#endif\n			}\n		#endif\n	#endif\n#endif",
	envmap_vertex: "#ifdef USE_ENVMAP\n	#ifdef ENV_WORLDPOS\n		vWorldPosition = worldPosition.xyz;\n	#else\n		vec3 cameraToVertex;\n		if ( isOrthographic ) {\n			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );\n		} else {\n			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );\n		}\n		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );\n		#ifdef ENVMAP_MODE_REFLECTION\n			vReflect = reflect( cameraToVertex, worldNormal );\n		#else\n			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );\n		#endif\n	#endif\n#endif",
	fog_vertex: "#ifdef USE_FOG\n	vFogDepth = - mvPosition.z;\n#endif",
	fog_pars_vertex: "#ifdef USE_FOG\n	varying float vFogDepth;\n#endif",
	fog_fragment: "#ifdef USE_FOG\n	#ifdef FOG_EXP2\n		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );\n	#else\n		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );\n	#endif\n	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );\n#endif",
	fog_pars_fragment: "#ifdef USE_FOG\n	uniform vec3 fogColor;\n	varying float vFogDepth;\n	#ifdef FOG_EXP2\n		uniform float fogDensity;\n	#else\n		uniform float fogNear;\n		uniform float fogFar;\n	#endif\n#endif",
	gradientmap_pars_fragment: "#ifdef USE_GRADIENTMAP\n	uniform sampler2D gradientMap;\n#endif\nvec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {\n	float dotNL = dot( normal, lightDirection );\n	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );\n	#ifdef USE_GRADIENTMAP\n		return vec3( texture2D( gradientMap, coord ).r );\n	#else\n		vec2 fw = fwidth( coord ) * 0.5;\n		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );\n	#endif\n}",
	lightmap_pars_fragment: "#ifdef USE_LIGHTMAP\n	uniform sampler2D lightMap;\n	uniform float lightMapIntensity;\n#endif",
	lights_lambert_fragment: "LambertMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;\nmaterial.specularStrength = specularStrength;",
	lights_lambert_pars_fragment: "varying vec3 vViewPosition;\nstruct LambertMaterial {\n	vec3 diffuseColor;\n	float specularStrength;\n};\nvoid RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {\n	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n	vec3 irradiance = dotNL * directLight.color;\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\nvoid RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {\n	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\n#define RE_Direct				RE_Direct_Lambert\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert",
	lights_pars_begin: "uniform bool receiveShadow;\nuniform vec3 ambientLightColor;\n#if defined( USE_LIGHT_PROBES )\n	uniform vec3 lightProbe[ 9 ];\n#endif\nvec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {\n	float x = normal.x, y = normal.y, z = normal.z;\n	vec3 result = shCoefficients[ 0 ] * 0.886227;\n	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;\n	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;\n	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;\n	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;\n	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;\n	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );\n	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;\n	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );\n	return result;\n}\nvec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {\n	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );\n	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );\n	return irradiance;\n}\nvec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {\n	vec3 irradiance = ambientLightColor;\n	return irradiance;\n}\nfloat getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {\n	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );\n	if ( cutoffDistance > 0.0 ) {\n		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );\n	}\n	return distanceFalloff;\n}\nfloat getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {\n	return smoothstep( coneCosine, penumbraCosine, angleCosine );\n}\n#if NUM_SUN_LIGHTS > 0\n	struct SunLight {\n		vec3 direction;\n		vec3 color;\n	};\n	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];\n	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {\n		light.color = sunLight.color;\n		light.direction = sunLight.direction;\n		light.visible = true;\n	}\n#endif\n#if NUM_DIR_LIGHTS > 0\n	struct DirectionalLight {\n		vec3 direction;\n		vec3 color;\n	};\n	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];\n	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {\n		light.color = directionalLight.color;\n		light.direction = directionalLight.direction;\n		light.visible = true;\n	}\n#endif\n#if NUM_POINT_LIGHTS > 0\n	struct PointLight {\n		vec3 position;\n		vec3 color;\n		float distance;\n		float decay;\n	};\n	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];\n	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {\n		vec3 lVector = pointLight.position - geometryPosition;\n		light.direction = normalize( lVector );\n		float lightDistance = length( lVector );\n		light.color = pointLight.color;\n		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );\n		light.visible = ( light.color != vec3( 0.0 ) );\n	}\n#endif\n#if NUM_SPOT_LIGHTS > 0\n	struct SpotLight {\n		vec3 position;\n		vec3 direction;\n		vec3 color;\n		float distance;\n		float decay;\n		float coneCos;\n		float penumbraCos;\n	};\n	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];\n	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {\n		vec3 lVector = spotLight.position - geometryPosition;\n		light.direction = normalize( lVector );\n		float angleCos = dot( light.direction, spotLight.direction );\n		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );\n		if ( spotAttenuation > 0.0 ) {\n			float lightDistance = length( lVector );\n			light.color = spotLight.color * spotAttenuation;\n			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );\n			light.visible = ( light.color != vec3( 0.0 ) );\n		} else {\n			light.color = vec3( 0.0 );\n			light.visible = false;\n		}\n	}\n#endif\n#if NUM_RECT_AREA_LIGHTS > 0\n	struct RectAreaLight {\n		vec3 color;\n		vec3 position;\n		vec3 halfWidth;\n		vec3 halfHeight;\n	};\n	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;\n	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];\n#endif\n#if NUM_HEMI_LIGHTS > 0\n	struct HemisphereLight {\n		vec3 direction;\n		vec3 skyColor;\n		vec3 groundColor;\n	};\n	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];\n	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {\n		float dotNL = dot( normal, hemiLight.direction );\n		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;\n		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );\n		return irradiance;\n	}\n#endif\n#include <lightprobes_pars_fragment>",
	lights_toon_fragment: "ToonMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;",
	lights_toon_pars_fragment: "varying vec3 vViewPosition;\nstruct ToonMaterial {\n	vec3 diffuseColor;\n};\nvoid RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {\n	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\nvoid RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {\n	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\n#define RE_Direct				RE_Direct_Toon\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon",
	lights_phong_fragment: "BlinnPhongMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;\nmaterial.specularColor = specular;\nmaterial.specularShininess = shininess;\nmaterial.specularStrength = specularStrength;",
	lights_phong_pars_fragment: "varying vec3 vViewPosition;\nstruct BlinnPhongMaterial {\n	vec3 diffuseColor;\n	vec3 specularColor;\n	float specularShininess;\n	float specularStrength;\n};\nvoid RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {\n	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n	vec3 irradiance = dotNL * directLight.color;\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;\n}\nvoid RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {\n	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\n#define RE_Direct				RE_Direct_BlinnPhong\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong",
	lights_physical_fragment: "PhysicalMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;\nmaterial.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );\nmaterial.metalness = metalnessFactor;\nvec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );\nfloat geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );\nmaterial.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;\nmaterial.roughness = min( material.roughness, 1.0 );\n#ifdef IOR\n	material.ior = ior;\n	#ifdef USE_SPECULAR\n		float specularIntensityFactor = specularIntensity;\n		vec3 specularColorFactor = specularColor;\n		#ifdef USE_SPECULAR_COLORMAP\n			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;\n		#endif\n		#ifdef USE_SPECULAR_INTENSITYMAP\n			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;\n		#endif\n		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );\n	#else\n		float specularIntensityFactor = 1.0;\n		vec3 specularColorFactor = vec3( 1.0 );\n		material.specularF90 = 1.0;\n	#endif\n	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;\n	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );\n#else\n	material.specularColor = vec3( 0.04 );\n	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );\n	material.specularF90 = 1.0;\n#endif\n#ifdef USE_CLEARCOAT\n	material.clearcoat = clearcoat;\n	material.clearcoatRoughness = clearcoatRoughness;\n	material.clearcoatF0 = vec3( 0.04 );\n	material.clearcoatF90 = 1.0;\n	#ifdef USE_CLEARCOATMAP\n		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;\n	#endif\n	#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;\n	#endif\n	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );\n	material.clearcoatRoughness += geometryRoughness;\n	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );\n#endif\n#ifdef USE_DISPERSION\n	material.dispersion = dispersion;\n#endif\n#ifdef USE_RETROREFLECTION\n	material.retroreflectivity = retroreflectivity;\n#endif\n#ifdef USE_IRIDESCENCE\n	material.iridescence = iridescence;\n	material.iridescenceIOR = iridescenceIOR;\n	#ifdef USE_IRIDESCENCEMAP\n		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;\n	#endif\n	#ifdef USE_IRIDESCENCE_THICKNESSMAP\n		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;\n	#else\n		material.iridescenceThickness = iridescenceThicknessMaximum;\n	#endif\n#endif\n#ifdef USE_SHEEN\n	material.sheenColor = sheenColor;\n	#ifdef USE_SHEEN_COLORMAP\n		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;\n	#endif\n	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );\n	#ifdef USE_SHEEN_ROUGHNESSMAP\n		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;\n	#endif\n#endif\n#ifdef USE_ANISOTROPY\n	#ifdef USE_ANISOTROPYMAP\n		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );\n		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;\n		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;\n	#else\n		vec2 anisotropyV = anisotropyVector;\n	#endif\n	material.anisotropy = length( anisotropyV );\n	if( material.anisotropy == 0.0 ) {\n		anisotropyV = vec2( 1.0, 0.0 );\n	} else {\n		anisotropyV /= material.anisotropy;\n		material.anisotropy = saturate( material.anisotropy );\n	}\n	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );\n	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;\n	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;\n#endif",
	lights_physical_pars_fragment: "uniform sampler2D dfgLUT;\nstruct PhysicalMaterial {\n	vec3 diffuseColor;\n	vec3 diffuseContribution;\n	vec3 specularColor;\n	vec3 specularColorBlended;\n	float roughness;\n	float metalness;\n	float specularF90;\n	float dispersion;\n	vec2 dfg;\n	vec3 multiScatteringCompensation;\n	#ifdef USE_RETROREFLECTION\n		float retroreflectivity;\n	#endif\n	#ifdef USE_CLEARCOAT\n		float clearcoat;\n		float clearcoatRoughness;\n		vec3 clearcoatF0;\n		float clearcoatF90;\n	#endif\n	#ifdef USE_IRIDESCENCE\n		float iridescence;\n		float iridescenceIOR;\n		float iridescenceThickness;\n		vec3 iridescenceFresnel;\n		vec3 iridescenceF0Dielectric;\n		vec3 iridescenceF0Metallic;\n	#endif\n	#ifdef USE_SHEEN\n		vec3 sheenColor;\n		float sheenRoughness;\n	#endif\n	#ifdef IOR\n		float ior;\n	#endif\n	#ifdef USE_TRANSMISSION\n		float transmission;\n		float transmissionAlpha;\n		float thickness;\n		float attenuationDistance;\n		vec3 attenuationColor;\n	#endif\n	#ifdef USE_ANISOTROPY\n		float anisotropy;\n		float alphaT;\n		vec3 anisotropyT;\n		vec3 anisotropyB;\n	#endif\n};\nvec3 clearcoatSpecularDirect = vec3( 0.0 );\nvec3 clearcoatSpecularIndirect = vec3( 0.0 );\nvec3 sheenSpecularDirect = vec3( 0.0 );\nvec3 sheenSpecularIndirect = vec3(0.0 );\nvec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {\n    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );\n    float x2 = x * x;\n    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );\n    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );\n}\nfloat V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {\n	float a2 = pow2( alpha );\n	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );\n	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );\n	return 0.5 / max( gv + gl, EPSILON );\n}\nfloat D_GGX( const in float alpha, const in float dotNH ) {\n	float a2 = pow2( alpha );\n	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;\n	return RECIPROCAL_PI * a2 / pow2( denom );\n}\n#ifdef USE_ANISOTROPY\n	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {\n		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );\n		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );\n		return 0.5 / max( gv + gl, EPSILON );\n	}\n	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {\n		float a2 = alphaT * alphaB;\n		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );\n		highp float v2 = dot( v, v );\n		float w2 = a2 / v2;\n		return RECIPROCAL_PI * a2 * pow2 ( w2 );\n	}\n#endif\n#ifdef USE_CLEARCOAT\n	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {\n		vec3 f0 = material.clearcoatF0;\n		float f90 = material.clearcoatF90;\n		float roughness = material.clearcoatRoughness;\n		float alpha = pow2( roughness );\n		vec3 halfDir = normalize( lightDir + viewDir );\n		float dotNL = saturate( dot( normal, lightDir ) );\n		float dotNV = saturate( dot( normal, viewDir ) );\n		float dotNH = saturate( dot( normal, halfDir ) );\n		float dotVH = saturate( dot( viewDir, halfDir ) );\n		vec3 F = F_Schlick( f0, f90, dotVH );\n		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );\n		float D = D_GGX( alpha, dotNH );\n		return F * ( V * D );\n	}\n#endif\nvec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {\n	vec3 f0 = material.specularColorBlended;\n	float f90 = material.specularF90;\n	float roughness = material.roughness;\n	float alpha = pow2( roughness );\n	vec3 halfDir = normalize( lightDir + viewDir );\n	float dotNL = saturate( dot( normal, lightDir ) );\n	float dotNV = saturate( dot( normal, viewDir ) );\n	float dotNH = saturate( dot( normal, halfDir ) );\n	float dotVH = saturate( dot( viewDir, halfDir ) );\n	vec3 F = F_Schlick( f0, f90, dotVH );\n	#ifdef USE_IRIDESCENCE\n		F = mix( F, material.iridescenceFresnel, material.iridescence );\n	#endif\n	#ifdef USE_ANISOTROPY\n		float dotTL = dot( material.anisotropyT, lightDir );\n		float dotTV = dot( material.anisotropyT, viewDir );\n		float dotTH = dot( material.anisotropyT, halfDir );\n		float dotBL = dot( material.anisotropyB, lightDir );\n		float dotBV = dot( material.anisotropyB, viewDir );\n		float dotBH = dot( material.anisotropyB, halfDir );\n		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );\n		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );\n	#else\n		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );\n		float D = D_GGX( alpha, dotNH );\n	#endif\n	return F * ( V * D );\n}\nvec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {\n	const float LUT_SIZE = 64.0;\n	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;\n	const float LUT_BIAS = 0.5 / LUT_SIZE;\n	float dotNV = saturate( dot( N, V ) );\n	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );\n	uv = uv * LUT_SCALE + LUT_BIAS;\n	return uv;\n}\nfloat LTC_ClippedSphereFormFactor( const in vec3 f ) {\n	float l = length( f );\n	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );\n}\nvec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {\n	float x = dot( v1, v2 );\n	float y = abs( x );\n	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;\n	float b = 3.4175940 + ( 4.1616724 + y ) * y;\n	float v = a / b;\n	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;\n	return cross( v1, v2 ) * theta_sintheta;\n}\nvec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {\n	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];\n	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];\n	vec3 lightNormal = cross( v1, v2 );\n	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );\n	vec3 T1, T2;\n	T1 = normalize( V - N * dot( V, N ) );\n	T2 = - cross( N, T1 );\n	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );\n	vec3 coords[ 4 ];\n	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );\n	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );\n	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );\n	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );\n	coords[ 0 ] = normalize( coords[ 0 ] );\n	coords[ 1 ] = normalize( coords[ 1 ] );\n	coords[ 2 ] = normalize( coords[ 2 ] );\n	coords[ 3 ] = normalize( coords[ 3 ] );\n	vec3 vectorFormFactor = vec3( 0.0 );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );\n	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );\n	return vec3( result );\n}\n#if defined( USE_SHEEN )\nfloat D_Charlie( float roughness, float dotNH ) {\n	float alpha = pow2( roughness );\n	float invAlpha = 1.0 / alpha;\n	float cos2h = dotNH * dotNH;\n	float sin2h = max( 1.0 - cos2h, 0.0078125 );\n	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );\n}\nfloat V_Neubelt( float dotNV, float dotNL ) {\n	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );\n}\nvec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {\n	vec3 halfDir = normalize( lightDir + viewDir );\n	float dotNL = saturate( dot( normal, lightDir ) );\n	float dotNV = saturate( dot( normal, viewDir ) );\n	float dotNH = saturate( dot( normal, halfDir ) );\n	float D = D_Charlie( sheenRoughness, dotNH );\n	float V = V_Neubelt( dotNV, dotNL );\n	return sheenColor * ( D * V );\n}\n#endif\nfloat IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {\n	float dotNV = saturate( dot( normal, viewDir ) );\n	float r2 = roughness * roughness;\n	float rInv = 1.0 / ( roughness + 0.1 );\n	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;\n	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;\n	float DG = exp( a * dotNV + b );\n	return saturate( DG );\n}\nvec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {\n	float dotNV = saturate( dot( normal, viewDir ) );\n	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;\n	return specularColor * fab.x + specularF90 * fab.y;\n}\n#ifdef USE_IRIDESCENCE\nvoid computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {\n#else\nvoid computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {\n#endif\n	#ifdef USE_IRIDESCENCE\n		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );\n	#else\n		vec3 Fr = specularColor;\n	#endif\n	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;\n	float Ess = fab.x + fab.y;\n	float Ems = 1.0 - Ess;\n	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );\n	singleScatter += FssEss;\n	multiScatter += Fms * Ems;\n}\n#if NUM_RECT_AREA_LIGHTS > 0\n	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n		vec3 normal = geometryNormal;\n		vec3 viewDir = geometryViewDir;\n		vec3 position = geometryPosition;\n		vec3 lightPos = rectAreaLight.position;\n		vec3 halfWidth = rectAreaLight.halfWidth;\n		vec3 halfHeight = rectAreaLight.halfHeight;\n		vec3 lightColor = rectAreaLight.color;\n		float roughness = material.roughness;\n		vec3 rectCoords[ 4 ];\n		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;\n		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;\n		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;\n		vec2 uv = LTC_Uv( normal, viewDir, roughness );\n		vec4 t1 = texture2D( ltc_1, uv );\n		vec4 t2 = texture2D( ltc_2, uv );\n		mat3 mInv = mat3(\n			vec3( t1.x, 0, t1.y ),\n			vec3(    0, 1,    0 ),\n			vec3( t1.z, 0, t1.w )\n		);\n		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );\n		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );\n		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );\n		#ifdef USE_CLEARCOAT\n			vec3 Ncc = geometryClearcoatNormal;\n			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );\n			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );\n			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );\n			mat3 mInvClearcoat = mat3(\n				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),\n				vec3(             0, 1,             0 ),\n				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )\n			);\n			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;\n			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );\n		#endif\n	}\n#endif\nvoid RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n	vec3 irradiance = dotNL * directLight.color;\n	#ifdef USE_CLEARCOAT\n		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );\n		vec3 ccIrradiance = dotNLcc * directLight.color;\n		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );\n	#endif\n	#ifdef USE_SHEEN\n \n 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );\n \n 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );\n 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );\n \n 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );\n \n 		irradiance *= sheenEnergyComp;\n \n 	#endif\n	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );\n	#ifdef USE_RETROREFLECTION\n		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );\n		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );\n		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );\n	#endif\n	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;\n	vec3 halfDir = normalize( directLight.direction + geometryViewDir );\n	float dotVH = saturate( dot( geometryViewDir, halfDir ) );\n	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );\n	#ifdef USE_RETROREFLECTION\n		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );\n		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );\n		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );\n		F = mix( F, retroF, saturate( material.retroreflectivity ) );\n	#endif\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );\n}\nvoid RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n	vec3 singleScattering = vec3( 0.0 );\n	vec3 multiScattering = vec3( 0.0 );\n	#ifdef USE_IRIDESCENCE\n		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );\n	#else\n		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );\n	#endif\n	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );\n	#ifdef USE_SHEEN\n		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );\n		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;\n		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;\n		diffuse *= sheenEnergyComp;\n	#endif\n	reflectedLight.indirectDiffuse += diffuse;\n}\nvoid RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {\n	#ifdef USE_CLEARCOAT\n		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );\n	#endif\n	#ifdef USE_SHEEN\n		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;\n 	#endif\n	vec3 singleScatteringDielectric = vec3( 0.0 );\n	vec3 multiScatteringDielectric = vec3( 0.0 );\n	vec3 singleScatteringMetallic = vec3( 0.0 );\n	vec3 multiScatteringMetallic = vec3( 0.0 );\n	#ifdef USE_IRIDESCENCE\n		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );\n		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );\n	#else\n		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );\n		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );\n	#endif\n	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );\n	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );\n	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;\n	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );\n	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;\n	vec3 indirectSpecular = radiance * singleScattering;\n	indirectSpecular += multiScattering * cosineWeightedIrradiance;\n	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;\n	#ifdef USE_SHEEN\n		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );\n		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;\n		indirectSpecular *= sheenEnergyComp;\n		indirectDiffuse *= sheenEnergyComp;\n	#endif\n	reflectedLight.indirectSpecular += indirectSpecular;\n	reflectedLight.indirectDiffuse += indirectDiffuse;\n}\n#define RE_Direct				RE_Direct_Physical\n#define RE_Direct_RectArea		RE_Direct_RectArea_Physical\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical\n#define RE_IndirectSpecular		RE_IndirectSpecular_Physical\nfloat computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {\n	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );\n}",
	lights_fragment_begin: "\nvec3 geometryPosition = - vViewPosition;\nvec3 geometryNormal = normal;\nvec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );\nvec3 geometryClearcoatNormal = vec3( 0.0 );\n#ifdef USE_CLEARCOAT\n	geometryClearcoatNormal = clearcoatNormal;\n#endif\n#ifdef USE_IRIDESCENCE\n	float dotNVi = saturate( dot( normal, geometryViewDir ) );\n	if ( material.iridescenceThickness == 0.0 ) {\n		material.iridescence = 0.0;\n	} else {\n		material.iridescence = saturate( material.iridescence );\n	}\n	if ( material.iridescence > 0.0 ) {\n		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );\n		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );\n		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );\n		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );\n		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );\n	}\n#endif\n#ifdef STANDARD\n	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );\n	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;\n	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )\n		float EssMs = material.dfg.x + material.dfg.y;\n		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );\n	#endif\n#endif\nIncidentLight directLight;\n#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )\n	PointLight pointLight;\n	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0\n	PointLightShadow pointLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {\n		pointLight = pointLights[ i ];\n		getPointLightInfo( pointLight, geometryPosition, directLight );\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )\n		pointLightShadow = pointLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )\n	SpotLight spotLight;\n	vec4 spotColor;\n	vec3 spotLightCoord;\n	bool inSpotLightMap;\n	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0\n	SpotLightShadow spotLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {\n		spotLight = spotLights[ i ];\n		getSpotLightInfo( spotLight, geometryPosition, directLight );\n		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )\n		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX\n		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )\n		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS\n		#else\n		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )\n		#endif\n		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )\n			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;\n			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );\n			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );\n			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;\n		#endif\n		#undef SPOT_LIGHT_MAP_INDEX\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )\n		spotLightShadow = spotLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )\n	SunLight sunLight;\n	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0\n	SunLightShadow sunLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {\n		sunLight = sunLights[ i ];\n		getSunLightInfo( sunLight, directLight );\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )\n		sunLightShadow = sunLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )\n	DirectionalLight directionalLight;\n	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0\n	DirectionalLightShadow directionalLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {\n		directionalLight = directionalLights[ i ];\n		getDirectionalLightInfo( directionalLight, directLight );\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )\n		directionalLightShadow = directionalLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )\n	RectAreaLight rectAreaLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {\n		rectAreaLight = rectAreaLights[ i ];\n		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if defined( RE_IndirectDiffuse )\n	vec3 iblIrradiance = vec3( 0.0 );\n	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );\n	#if defined( USE_LIGHT_PROBES )\n		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );\n	#endif\n	#if ( NUM_HEMI_LIGHTS > 0 )\n		#pragma unroll_loop_start\n		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {\n			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );\n		}\n		#pragma unroll_loop_end\n	#endif\n	#ifdef USE_LIGHT_PROBES_GRID\n		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;\n		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );\n		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );\n	#endif\n#endif\n#if defined( RE_IndirectSpecular )\n	vec3 radiance = vec3( 0.0 );\n	vec3 clearcoatRadiance = vec3( 0.0 );\n#endif",
	lights_fragment_maps: "#if defined( RE_IndirectDiffuse )\n	#ifdef USE_LIGHTMAP\n		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );\n		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;\n		irradiance += lightMapIrradiance;\n	#endif\n	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )\n		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )\n			iblIrradiance += getIBLIrradiance( geometryNormal );\n		#endif\n	#endif\n#endif\n#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )\n	#ifdef USE_ANISOTROPY\n		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );\n	#else\n		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );\n	#endif\n	#ifdef USE_RETROREFLECTION\n		#ifdef USE_ANISOTROPY\n			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );\n		#else\n			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );\n		#endif\n		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );\n	#endif\n	radiance += iblRadiance;\n	#ifdef USE_CLEARCOAT\n		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );\n	#endif\n#endif",
	lights_fragment_end: "#if defined( RE_IndirectDiffuse )\n	#if defined( LAMBERT ) || defined( PHONG )\n		irradiance += iblIrradiance;\n	#endif\n	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n#endif\n#if defined( RE_IndirectSpecular )\n	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n#endif",
	lightprobes_pars_fragment: "#ifdef USE_LIGHT_PROBES_GRID\nuniform highp sampler3D probesSH;\nuniform vec3 probesMin;\nuniform vec3 probesMax;\nuniform vec3 probesResolution;\nvec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {\n	vec3 res = probesResolution;\n	vec3 gridRange = probesMax - probesMin;\n	vec3 resMinusOne = res - 1.0;\n	vec3 probeSpacing = gridRange / resMinusOne;\n	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;\n	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );\n	uvw = uvw * resMinusOne / res + 0.5 / res;\n	float nz          = res.z;\n	float paddedSlices = nz + 2.0;\n	float atlasDepth  = 7.0 * paddedSlices;\n	float uvZBase     = uvw.z * nz + 1.0;\n	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );\n	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );\n	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );\n	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );\n	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );\n	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );\n	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );\n	vec3 c0 = s0.xyz;\n	vec3 c1 = vec3( s0.w, s1.xy );\n	vec3 c2 = vec3( s1.zw, s2.x );\n	vec3 c3 = s2.yzw;\n	vec3 c4 = s3.xyz;\n	vec3 c5 = vec3( s3.w, s4.xy );\n	vec3 c6 = vec3( s4.zw, s5.x );\n	vec3 c7 = s5.yzw;\n	vec3 c8 = s6.xyz;\n	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;\n	vec3 result = c0 * 0.886227;\n	result += c1 * 2.0 * 0.511664 * y;\n	result += c2 * 2.0 * 0.511664 * z;\n	result += c3 * 2.0 * 0.511664 * x;\n	result += c4 * 2.0 * 0.429043 * x * y;\n	result += c5 * 2.0 * 0.429043 * y * z;\n	result += c6 * ( 0.743125 * z * z - 0.247708 );\n	result += c7 * 2.0 * 0.429043 * x * z;\n	result += c8 * 0.429043 * ( x * x - y * y );\n	return max( result, vec3( 0.0 ) );\n}\n#endif",
	logdepthbuf_fragment: "#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )\n	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;\n#endif",
	logdepthbuf_pars_fragment: "#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )\n	uniform float logDepthBufFC;\n	varying float vFragDepth;\n	varying float vIsPerspective;\n#endif",
	logdepthbuf_pars_vertex: "#ifdef USE_LOGARITHMIC_DEPTH_BUFFER\n	varying float vFragDepth;\n	varying float vIsPerspective;\n#endif",
	logdepthbuf_vertex: "#ifdef USE_LOGARITHMIC_DEPTH_BUFFER\n	vFragDepth = 1.0 + gl_Position.w;\n	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );\n#endif",
	map_fragment: "#ifdef USE_MAP\n	vec4 sampledDiffuseColor = texture2D( map, vMapUv );\n	#ifdef DECODE_VIDEO_TEXTURE\n		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );\n	#endif\n	diffuseColor *= sampledDiffuseColor;\n#endif",
	map_pars_fragment: "#ifdef USE_MAP\n	uniform sampler2D map;\n#endif",
	map_particle_fragment: "#if defined( USE_MAP ) || defined( USE_ALPHAMAP )\n	#if defined( USE_POINTS_UV )\n		vec2 uv = vUv;\n	#else\n		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;\n	#endif\n#endif\n#ifdef USE_MAP\n	diffuseColor *= texture2D( map, uv );\n#endif\n#ifdef USE_ALPHAMAP\n	diffuseColor.a *= texture2D( alphaMap, uv ).g;\n#endif",
	map_particle_pars_fragment: "#if defined( USE_POINTS_UV )\n	varying vec2 vUv;\n#else\n	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )\n		uniform mat3 uvTransform;\n	#endif\n#endif\n#ifdef USE_MAP\n	uniform sampler2D map;\n#endif\n#ifdef USE_ALPHAMAP\n	uniform sampler2D alphaMap;\n#endif",
	metalnessmap_fragment: "float metalnessFactor = metalness;\n#ifdef USE_METALNESSMAP\n	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );\n	metalnessFactor *= texelMetalness.b;\n#endif",
	metalnessmap_pars_fragment: "#ifdef USE_METALNESSMAP\n	uniform sampler2D metalnessMap;\n#endif",
	morphinstance_vertex: "#ifdef USE_INSTANCING_MORPH\n	float morphTargetInfluences[ MORPHTARGETS_COUNT ];\n	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;\n	}\n#endif",
	morphcolor_vertex: "#if defined( USE_MORPHCOLORS )\n	vColor *= morphTargetBaseInfluence;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		#if defined( USE_COLOR_ALPHA )\n			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];\n		#elif defined( USE_COLOR )\n			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];\n		#endif\n	}\n#endif",
	morphnormal_vertex: "#ifdef USE_MORPHNORMALS\n	objectNormal *= morphTargetBaseInfluence;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];\n	}\n#endif",
	morphtarget_pars_vertex: "#ifdef USE_MORPHTARGETS\n	#ifndef USE_INSTANCING_MORPH\n		uniform float morphTargetBaseInfluence;\n		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];\n	#endif\n	uniform sampler2DArray morphTargetsTexture;\n	uniform ivec2 morphTargetsTextureSize;\n	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {\n		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;\n		int y = texelIndex / morphTargetsTextureSize.x;\n		int x = texelIndex - y * morphTargetsTextureSize.x;\n		ivec3 morphUV = ivec3( x, y, morphTargetIndex );\n		return texelFetch( morphTargetsTexture, morphUV, 0 );\n	}\n#endif",
	morphtarget_vertex: "#ifdef USE_MORPHTARGETS\n	transformed *= morphTargetBaseInfluence;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];\n	}\n#endif",
	normal_fragment_begin: "float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;\n#ifdef FLAT_SHADED\n	vec3 fdx = dFdx( vViewPosition );\n	vec3 fdy = dFdy( vViewPosition );\n	vec3 normal = normalize( cross( fdx, fdy ) );\n#else\n	vec3 normal = normalize( vNormal );\n	#ifdef DOUBLE_SIDED\n		normal *= faceDirection;\n	#endif\n#endif\n#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )\n	#ifdef USE_TANGENT\n		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );\n	#else\n		mat3 tbn = getTangentFrame( - vViewPosition, normal,\n		#if defined( USE_NORMALMAP )\n			vNormalMapUv\n		#elif defined( USE_CLEARCOAT_NORMALMAP )\n			vClearcoatNormalMapUv\n		#else\n			vUv\n		#endif\n		);\n	#endif\n	#ifdef DOUBLE_SIDED\n		tbn[0] *= faceDirection;\n		tbn[1] *= faceDirection;\n	#endif\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	#ifdef USE_TANGENT\n		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );\n	#else\n		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );\n	#endif\n	#ifdef DOUBLE_SIDED\n		tbn2[0] *= faceDirection;\n		tbn2[1] *= faceDirection;\n	#endif\n#endif\nvec3 nonPerturbedNormal = normal;",
	normal_fragment_maps: "#ifdef USE_NORMALMAP_OBJECTSPACE\n	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;\n	#ifdef FLIP_SIDED\n		normal = - normal;\n	#endif\n	#ifdef DOUBLE_SIDED\n		normal = normal * faceDirection;\n	#endif\n	normal = normalize( normalMatrix * normal );\n#elif defined( USE_NORMALMAP_TANGENTSPACE )\n	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;\n	#if defined( USE_PACKED_NORMALMAP )\n		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );\n	#endif\n	mapN.xy *= normalScale;\n	normal = normalize( tbn * mapN );\n#elif defined( USE_BUMPMAP )\n	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );\n#endif",
	normal_pars_fragment: "#ifndef FLAT_SHADED\n	varying vec3 vNormal;\n	#ifdef USE_TANGENT\n		varying vec3 vTangent;\n		varying vec3 vBitangent;\n	#endif\n#endif",
	normal_pars_vertex: "#ifndef FLAT_SHADED\n	varying vec3 vNormal;\n	#ifdef USE_TANGENT\n		varying vec3 vTangent;\n		varying vec3 vBitangent;\n	#endif\n#endif",
	normal_vertex: "#ifndef FLAT_SHADED\n	vNormal = normalize( transformedNormal );\n	#ifdef USE_TANGENT\n		vTangent = normalize( transformedTangent );\n		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );\n		#ifdef FLIP_SIDED\n			vBitangent = - vBitangent;\n		#endif\n	#endif\n#endif",
	normalmap_pars_fragment: "#ifdef USE_NORMALMAP\n	uniform sampler2D normalMap;\n	uniform vec2 normalScale;\n#endif\n#ifdef USE_NORMALMAP_OBJECTSPACE\n	uniform mat3 normalMatrix;\n#endif\n#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )\n	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {\n		vec3 q0 = dFdx( eye_pos.xyz );\n		vec3 q1 = dFdy( eye_pos.xyz );\n		vec2 st0 = dFdx( uv.st );\n		vec2 st1 = dFdy( uv.st );\n		vec3 N = surf_norm;\n		vec3 q1perp = cross( q1, N );\n		vec3 q0perp = cross( N, q0 );\n		vec3 T = q1perp * st0.x + q0perp * st1.x;\n		vec3 B = q1perp * st0.y + q0perp * st1.y;\n		float det = max( dot( T, T ), dot( B, B ) );\n		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );\n		return mat3( T * scale, B * scale, N );\n	}\n#endif",
	clearcoat_normal_fragment_begin: "#ifdef USE_CLEARCOAT\n	vec3 clearcoatNormal = nonPerturbedNormal;\n#endif",
	clearcoat_normal_fragment_maps: "#ifdef USE_CLEARCOAT_NORMALMAP\n	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;\n	clearcoatMapN.xy *= clearcoatNormalScale;\n	clearcoatNormal = normalize( tbn2 * clearcoatMapN );\n#endif",
	clearcoat_pars_fragment: "#ifdef USE_CLEARCOATMAP\n	uniform sampler2D clearcoatMap;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	uniform sampler2D clearcoatNormalMap;\n	uniform vec2 clearcoatNormalScale;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	uniform sampler2D clearcoatRoughnessMap;\n#endif",
	iridescence_pars_fragment: "#ifdef USE_IRIDESCENCEMAP\n	uniform sampler2D iridescenceMap;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	uniform sampler2D iridescenceThicknessMap;\n#endif",
	opaque_fragment: "#ifdef OPAQUE\ndiffuseColor.a = 1.0;\n#endif\n#ifdef USE_TRANSMISSION\ndiffuseColor.a *= material.transmissionAlpha;\n#endif\ngl_FragColor = vec4( outgoingLight, diffuseColor.a );",
	packing: "vec3 packNormalToRGB( const in vec3 normal ) {\n	return normalize( normal ) * 0.5 + 0.5;\n}\nvec3 unpackRGBToNormal( const in vec3 rgb ) {\n	return 2.0 * rgb.xyz - 1.0;\n}\nconst float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;\nconst float Inv255 = 1. / 255.;\nconst vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );\nconst vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );\nconst vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );\nconst vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );\nvec4 packDepthToRGBA( const in float v ) {\n	if( v <= 0.0 )\n		return vec4( 0., 0., 0., 0. );\n	if( v >= 1.0 )\n		return vec4( 1., 1., 1., 1. );\n	float vuf;\n	float af = modf( v * PackFactors.a, vuf );\n	float bf = modf( vuf * ShiftRight8, vuf );\n	float gf = modf( vuf * ShiftRight8, vuf );\n	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );\n}\nvec3 packDepthToRGB( const in float v ) {\n	if( v <= 0.0 )\n		return vec3( 0., 0., 0. );\n	if( v >= 1.0 )\n		return vec3( 1., 1., 1. );\n	float vuf;\n	float bf = modf( v * PackFactors.b, vuf );\n	float gf = modf( vuf * ShiftRight8, vuf );\n	return vec3( vuf * Inv255, gf * PackUpscale, bf );\n}\nvec2 packDepthToRG( const in float v ) {\n	if( v <= 0.0 )\n		return vec2( 0., 0. );\n	if( v >= 1.0 )\n		return vec2( 1., 1. );\n	float vuf;\n	float gf = modf( v * 256., vuf );\n	return vec2( vuf * Inv255, gf );\n}\nfloat unpackRGBAToDepth( const in vec4 v ) {\n	return dot( v, UnpackFactors4 );\n}\nfloat unpackRGBToDepth( const in vec3 v ) {\n	return dot( v, UnpackFactors3 );\n}\nfloat unpackRGToDepth( const in vec2 v ) {\n	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;\n}\nvec4 pack2HalfToRGBA( const in vec2 v ) {\n	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );\n	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );\n}\nvec2 unpackRGBATo2Half( const in vec4 v ) {\n	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );\n}\nfloat viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {\n	return ( viewZ + near ) / ( near - far );\n}\nfloat orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {\n	#ifdef USE_REVERSED_DEPTH_BUFFER\n	\n		return depth * ( far - near ) - far;\n	#else\n		return depth * ( near - far ) - near;\n	#endif\n}\nfloat viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {\n	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );\n}\nfloat perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {\n	\n	#ifdef USE_REVERSED_DEPTH_BUFFER\n		return ( near * far ) / ( ( near - far ) * depth - near );\n	#else\n		return ( near * far ) / ( ( far - near ) * depth - far );\n	#endif\n}",
	premultiplied_alpha_fragment: "#ifdef PREMULTIPLIED_ALPHA\n	gl_FragColor.rgb *= gl_FragColor.a;\n#endif",
	project_vertex: "vec4 mvPosition = vec4( transformed, 1.0 );\n#ifdef USE_BATCHING\n	mvPosition = batchingMatrix * mvPosition;\n#endif\n#ifdef USE_INSTANCING\n	mvPosition = instanceMatrix * mvPosition;\n#endif\nmvPosition = modelViewMatrix * mvPosition;\ngl_Position = projectionMatrix * mvPosition;",
	dithering_fragment: "#ifdef DITHERING\n	gl_FragColor.rgb = dithering( gl_FragColor.rgb );\n#endif",
	dithering_pars_fragment: "#ifdef DITHERING\n	vec3 dithering( vec3 color ) {\n		float grid_position = rand( gl_FragCoord.xy );\n		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );\n		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );\n		return color + dither_shift_RGB;\n	}\n#endif",
	roughnessmap_fragment: "float roughnessFactor = roughness;\n#ifdef USE_ROUGHNESSMAP\n	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );\n	roughnessFactor *= texelRoughness.g;\n#endif",
	roughnessmap_pars_fragment: "#ifdef USE_ROUGHNESSMAP\n	uniform sampler2D roughnessMap;\n#endif",
	shadowmap_pars_fragment: "#if NUM_SPOT_LIGHT_COORDS > 0\n	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];\n#endif\n#if NUM_SPOT_LIGHT_MAPS > 0\n	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];\n#endif\n#ifdef USE_SHADOWMAP\n	#if NUM_SUN_LIGHT_SHADOWS > 0\n		#define SUN_LIGHT_CASCADES 2\n		#if defined( SHADOWMAP_TYPE_PCF )\n			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];\n		#else\n			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];\n		#endif\n		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];\n		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];\n		varying vec4 vSunShadowWorldPosition;\n		varying vec3 vSunShadowWorldNormal;\n		struct SunLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n		#if defined( SHADOWMAP_TYPE_PCF )\n			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];\n		#else\n			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];\n		#endif\n		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];\n		struct DirectionalLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_SPOT_LIGHT_SHADOWS > 0\n		#if defined( SHADOWMAP_TYPE_PCF )\n			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];\n		#else\n			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];\n		#endif\n		struct SpotLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n		#if defined( SHADOWMAP_TYPE_PCF )\n			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];\n		#elif defined( SHADOWMAP_TYPE_BASIC )\n			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];\n		#endif\n		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];\n		struct PointLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n			float shadowCameraNear;\n			float shadowCameraFar;\n		};\n		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];\n	#endif\n	#if defined( SHADOWMAP_TYPE_PCF )\n		float interleavedGradientNoise( vec2 position ) {\n			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );\n		}\n		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {\n			const float goldenAngle = 2.399963229728653;\n			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );\n			float theta = float( sampleIndex ) * goldenAngle + phi;\n			return vec2( cos( theta ), sin( theta ) ) * r;\n		}\n	#endif\n	#if defined( SHADOWMAP_TYPE_PCF )\n		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {\n			float shadow = 1.0;\n			shadowCoord.xyz /= shadowCoord.w;\n			shadowCoord.z += shadowBias;\n			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;\n			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;\n			if ( frustumTest ) {\n				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;\n				float radius = shadowRadius * texelSize.x;\n				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;\n				shadow = (\n					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +\n					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +\n					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +\n					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +\n					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )\n				) * 0.2;\n			}\n			return mix( 1.0, shadow, shadowIntensity );\n		}\n	#elif defined( SHADOWMAP_TYPE_VSM )\n		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {\n			float shadow = 1.0;\n			shadowCoord.xyz /= shadowCoord.w;\n			#ifdef USE_REVERSED_DEPTH_BUFFER\n				shadowCoord.z -= shadowBias;\n			#else\n				shadowCoord.z += shadowBias;\n			#endif\n			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;\n			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;\n			if ( frustumTest ) {\n				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;\n				float mean = distribution.x;\n				float variance = distribution.y * distribution.y;\n				#ifdef USE_REVERSED_DEPTH_BUFFER\n					float hard_shadow = step( mean, shadowCoord.z );\n				#else\n					float hard_shadow = step( shadowCoord.z, mean );\n				#endif\n				\n				if ( hard_shadow == 1.0 ) {\n					shadow = 1.0;\n				} else {\n					variance = max( variance, 0.0000001 );\n					float d = shadowCoord.z - mean;\n					float p_max = variance / ( variance + d * d );\n					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );\n					shadow = max( hard_shadow, p_max );\n				}\n			}\n			return mix( 1.0, shadow, shadowIntensity );\n		}\n	#else\n		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {\n			float shadow = 1.0;\n			shadowCoord.xyz /= shadowCoord.w;\n			#ifdef USE_REVERSED_DEPTH_BUFFER\n				shadowCoord.z -= shadowBias;\n			#else\n				shadowCoord.z += shadowBias;\n			#endif\n			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;\n			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;\n			if ( frustumTest ) {\n				float depth = texture2D( shadowMap, shadowCoord.xy ).r;\n				#ifdef USE_REVERSED_DEPTH_BUFFER\n					shadow = step( depth, shadowCoord.z );\n				#else\n					shadow = step( shadowCoord.z, depth );\n				#endif\n			}\n			return mix( 1.0, shadow, shadowIntensity );\n		}\n	#endif\n	#if NUM_SUN_LIGHT_SHADOWS > 0\n		float getSunShadow(\n			#if defined( SHADOWMAP_TYPE_PCF )\n				sampler2DShadow shadowMap,\n			#else\n				sampler2D shadowMap,\n			#endif\n			SunLightShadow sunLightShadow,\n			int shadowIndex\n		) {\n			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );\n			float viewDepth = vSunShadowWorldPosition.w;\n			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;\n			float shadow = 1.0;\n			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {\n				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];\n				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {\n					float cascadeShadow = getShadow(\n						shadowMap,\n						sunLightShadow.shadowMapSize,\n						sunLightShadow.shadowIntensity,\n						sunLightShadow.shadowBias,\n						sunLightShadow.shadowRadius,\n						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition\n					);\n					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );\n				}\n			}\n			return shadow;\n		}\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n	#if defined( SHADOWMAP_TYPE_PCF )\n	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {\n		float shadow = 1.0;\n		vec3 lightToPosition = shadowCoord.xyz;\n		vec3 bd3D = normalize( lightToPosition );\n		vec3 absVec = abs( lightToPosition );\n		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );\n		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {\n			#ifdef USE_REVERSED_DEPTH_BUFFER\n				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );\n				dp -= shadowBias;\n			#else\n				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );\n				dp += shadowBias;\n			#endif\n			float texelSize = shadowRadius / shadowMapSize.x;\n			vec3 absDir = abs( bd3D );\n			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );\n			tangent = normalize( cross( bd3D, tangent ) );\n			vec3 bitangent = cross( bd3D, tangent );\n			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;\n			vec2 sample0 = vogelDiskSample( 0, 5, phi );\n			vec2 sample1 = vogelDiskSample( 1, 5, phi );\n			vec2 sample2 = vogelDiskSample( 2, 5, phi );\n			vec2 sample3 = vogelDiskSample( 3, 5, phi );\n			vec2 sample4 = vogelDiskSample( 4, 5, phi );\n			shadow = (\n				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +\n				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +\n				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +\n				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +\n				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )\n			) * 0.2;\n		}\n		return mix( 1.0, shadow, shadowIntensity );\n	}\n	#elif defined( SHADOWMAP_TYPE_BASIC )\n	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {\n		float shadow = 1.0;\n		vec3 lightToPosition = shadowCoord.xyz;\n		vec3 absVec = abs( lightToPosition );\n		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );\n		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {\n			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );\n			dp += shadowBias;\n			vec3 bd3D = normalize( lightToPosition );\n			float depth = textureCube( shadowMap, bd3D ).r;\n			#ifdef USE_REVERSED_DEPTH_BUFFER\n				depth = 1.0 - depth;\n			#endif\n			shadow = step( dp, depth );\n		}\n		return mix( 1.0, shadow, shadowIntensity );\n	}\n	#endif\n	#endif\n#endif",
	shadowmap_pars_vertex: "#if NUM_SPOT_LIGHT_COORDS > 0\n	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];\n	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];\n#endif\n#ifdef USE_SHADOWMAP\n	#if NUM_SUN_LIGHT_SHADOWS > 0\n		varying vec4 vSunShadowWorldPosition;\n		varying vec3 vSunShadowWorldNormal;\n	#endif\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];\n		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];\n		struct DirectionalLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_SPOT_LIGHT_SHADOWS > 0\n		struct SpotLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];\n		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];\n		struct PointLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n			float shadowCameraNear;\n			float shadowCameraFar;\n		};\n		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];\n	#endif\n#endif",
	shadowmap_vertex: "#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )\n	#ifdef HAS_NORMAL\n		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );\n	#else\n		vec3 shadowWorldNormal = vec3( 0.0 );\n	#endif\n	vec4 shadowWorldPosition;\n#endif\n#if defined( USE_SHADOWMAP )\n	#if NUM_SUN_LIGHT_SHADOWS > 0\n		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );\n		vSunShadowWorldNormal = shadowWorldNormal;\n	#endif\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n		#pragma unroll_loop_start\n		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {\n			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );\n			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;\n		}\n		#pragma unroll_loop_end\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n		#pragma unroll_loop_start\n		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {\n			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );\n			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;\n		}\n		#pragma unroll_loop_end\n	#endif\n#endif\n#if NUM_SPOT_LIGHT_COORDS > 0\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {\n		shadowWorldPosition = worldPosition;\n		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )\n			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;\n		#endif\n		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;\n	}\n	#pragma unroll_loop_end\n#endif",
	shadowmask_pars_fragment: "float getShadowMask() {\n	float shadow = 1.0;\n	#ifdef USE_SHADOWMAP\n	#if NUM_SUN_LIGHT_SHADOWS > 0\n	SunLightShadow sunLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {\n		sunLight = sunLightShadows[ i ];\n		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n	DirectionalLightShadow directionalLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {\n		directionalLight = directionalLightShadows[ i ];\n		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#if NUM_SPOT_LIGHT_SHADOWS > 0\n	SpotLightShadow spotLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {\n		spotLight = spotLightShadows[ i ];\n		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )\n	PointLightShadow pointLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {\n		pointLight = pointLightShadows[ i ];\n		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#endif\n	return shadow;\n}",
	skinbase_vertex: "#ifdef USE_SKINNING\n	mat4 boneMatX = getBoneMatrix( skinIndex.x );\n	mat4 boneMatY = getBoneMatrix( skinIndex.y );\n	mat4 boneMatZ = getBoneMatrix( skinIndex.z );\n	mat4 boneMatW = getBoneMatrix( skinIndex.w );\n#endif",
	skinning_pars_vertex: "#ifdef USE_SKINNING\n	uniform mat4 bindMatrix;\n	uniform mat4 bindMatrixInverse;\n	uniform highp sampler2D boneTexture;\n	mat4 getBoneMatrix( const in float i ) {\n		int size = textureSize( boneTexture, 0 ).x;\n		int j = int( i ) * 4;\n		int x = j % size;\n		int y = j / size;\n		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );\n		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );\n		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );\n		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );\n		return mat4( v1, v2, v3, v4 );\n	}\n#endif",
	skinning_vertex: "#ifdef USE_SKINNING\n	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );\n	vec4 skinned = vec4( 0.0 );\n	skinned += boneMatX * skinVertex * skinWeight.x;\n	skinned += boneMatY * skinVertex * skinWeight.y;\n	skinned += boneMatZ * skinVertex * skinWeight.z;\n	skinned += boneMatW * skinVertex * skinWeight.w;\n	transformed = ( bindMatrixInverse * skinned ).xyz;\n#endif",
	skinnormal_vertex: "#ifdef USE_SKINNING\n	mat4 skinMatrix = mat4( 0.0 );\n	skinMatrix += skinWeight.x * boneMatX;\n	skinMatrix += skinWeight.y * boneMatY;\n	skinMatrix += skinWeight.z * boneMatZ;\n	skinMatrix += skinWeight.w * boneMatW;\n	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;\n	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;\n	#ifdef USE_TANGENT\n		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;\n	#endif\n#endif",
	specularmap_fragment: "float specularStrength;\n#ifdef USE_SPECULARMAP\n	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );\n	specularStrength = texelSpecular.r;\n#else\n	specularStrength = 1.0;\n#endif",
	specularmap_pars_fragment: "#ifdef USE_SPECULARMAP\n	uniform sampler2D specularMap;\n#endif",
	tonemapping_fragment: "#if defined( TONE_MAPPING )\n	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );\n#endif",
	tonemapping_pars_fragment: "#ifndef saturate\n#define saturate( a ) clamp( a, 0.0, 1.0 )\n#endif\nuniform float toneMappingExposure;\nvec3 LinearToneMapping( vec3 color ) {\n	return saturate( toneMappingExposure * color );\n}\nvec3 ReinhardToneMapping( vec3 color ) {\n	color *= toneMappingExposure;\n	return saturate( color / ( vec3( 1.0 ) + color ) );\n}\nvec3 CineonToneMapping( vec3 color ) {\n	color *= toneMappingExposure;\n	color = max( vec3( 0.0 ), color - 0.004 );\n	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );\n}\nvec3 RRTAndODTFit( vec3 v ) {\n	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;\n	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;\n	return a / b;\n}\nvec3 ACESFilmicToneMapping( vec3 color ) {\n	const mat3 ACESInputMat = mat3(\n		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),\n		vec3( 0.04823, 0.01566, 0.83777 )\n	);\n	const mat3 ACESOutputMat = mat3(\n		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),\n		vec3( -0.07367, -0.00605,  1.07602 )\n	);\n	color *= toneMappingExposure / 0.6;\n	color = ACESInputMat * color;\n	color = RRTAndODTFit( color );\n	color = ACESOutputMat * color;\n	return saturate( color );\n}\nconst mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(\n	vec3( 1.6605, - 0.1246, - 0.0182 ),\n	vec3( - 0.5876, 1.1329, - 0.1006 ),\n	vec3( - 0.0728, - 0.0083, 1.1187 )\n);\nconst mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(\n	vec3( 0.6274, 0.0691, 0.0164 ),\n	vec3( 0.3293, 0.9195, 0.0880 ),\n	vec3( 0.0433, 0.0113, 0.8956 )\n);\nvec3 agxDefaultContrastApprox( vec3 x ) {\n	vec3 x2 = x * x;\n	vec3 x4 = x2 * x2;\n	return + 15.5 * x4 * x2\n		- 40.14 * x4 * x\n		+ 31.96 * x4\n		- 6.868 * x2 * x\n		+ 0.4298 * x2\n		+ 0.1191 * x\n		- 0.00232;\n}\nvec3 AgXToneMapping( vec3 color ) {\n	const mat3 AgXInsetMatrix = mat3(\n		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),\n		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),\n		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )\n	);\n	const mat3 AgXOutsetMatrix = mat3(\n		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),\n		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),\n		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )\n	);\n	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;\n	color *= toneMappingExposure;\n	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;\n	color = AgXInsetMatrix * color;\n	color = max( color, 1e-10 );	color = log2( color );\n	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );\n	color = clamp( color, 0.0, 1.0 );\n	color = agxDefaultContrastApprox( color );\n	color = AgXOutsetMatrix * color;\n	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );\n	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;\n	color = clamp( color, 0.0, 1.0 );\n	return color;\n}\nvec3 NeutralToneMapping( vec3 color ) {\n	const float StartCompression = 0.8 - 0.04;\n	const float Desaturation = 0.15;\n	color *= toneMappingExposure;\n	float x = min( color.r, min( color.g, color.b ) );\n	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;\n	color -= offset;\n	float peak = max( color.r, max( color.g, color.b ) );\n	if ( peak < StartCompression ) return color;\n	float d = 1. - StartCompression;\n	float newPeak = 1. - d * d / ( peak + d - StartCompression );\n	color *= newPeak / peak;\n	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );\n	return mix( color, vec3( newPeak ), g );\n}\nvec3 CustomToneMapping( vec3 color ) { return color; }",
	transmission_fragment: "#ifdef USE_TRANSMISSION\n	material.transmission = transmission;\n	material.transmissionAlpha = 1.0;\n	material.thickness = thickness;\n	material.attenuationDistance = attenuationDistance;\n	material.attenuationColor = attenuationColor;\n	#ifdef USE_TRANSMISSIONMAP\n		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;\n	#endif\n	#ifdef USE_THICKNESSMAP\n		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;\n	#endif\n	vec3 pos = vWorldPosition;\n	vec3 v = normalize( cameraPosition - pos );\n	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );\n	vec4 transmitted = getIBLVolumeRefraction(\n		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,\n		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,\n		material.attenuationColor, material.attenuationDistance );\n	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );\n	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );\n#endif",
	transmission_pars_fragment: "#ifdef USE_TRANSMISSION\n	uniform float transmission;\n	uniform float thickness;\n	uniform float attenuationDistance;\n	uniform vec3 attenuationColor;\n	#ifdef USE_TRANSMISSIONMAP\n		uniform sampler2D transmissionMap;\n	#endif\n	#ifdef USE_THICKNESSMAP\n		uniform sampler2D thicknessMap;\n	#endif\n	uniform vec2 transmissionSamplerSize;\n	uniform sampler2D transmissionSamplerMap;\n	uniform mat4 modelMatrix;\n	uniform mat4 projectionMatrix;\n	varying vec3 vWorldPosition;\n	float w0( float a ) {\n		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );\n	}\n	float w1( float a ) {\n		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );\n	}\n	float w2( float a ){\n		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );\n	}\n	float w3( float a ) {\n		return ( 1.0 / 6.0 ) * ( a * a * a );\n	}\n	float g0( float a ) {\n		return w0( a ) + w1( a );\n	}\n	float g1( float a ) {\n		return w2( a ) + w3( a );\n	}\n	float h0( float a ) {\n		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );\n	}\n	float h1( float a ) {\n		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );\n	}\n	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {\n		uv = uv * texelSize.zw + 0.5;\n		vec2 iuv = floor( uv );\n		vec2 fuv = fract( uv );\n		float g0x = g0( fuv.x );\n		float g1x = g1( fuv.x );\n		float h0x = h0( fuv.x );\n		float h1x = h1( fuv.x );\n		float h0y = h0( fuv.y );\n		float h1y = h1( fuv.y );\n		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;\n		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;\n		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;\n		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;\n		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +\n			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );\n	}\n	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {\n		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );\n		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );\n		vec2 fLodSizeInv = 1.0 / fLodSize;\n		vec2 cLodSizeInv = 1.0 / cLodSize;\n		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );\n		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );\n		return mix( fSample, cSample, fract( lod ) );\n	}\n	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {\n		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );\n		vec3 modelScale;\n		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );\n		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );\n		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );\n		return normalize( refractionVector ) * thickness * modelScale;\n	}\n	float applyIorToRoughness( const in float roughness, const in float ior ) {\n		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );\n	}\n	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {\n		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );\n		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );\n	}\n	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {\n		if ( isinf( attenuationDistance ) ) {\n			return vec3( 1.0 );\n		} else {\n			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;\n			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;\n		}\n	}\n	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,\n		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,\n		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,\n		const in vec3 attenuationColor, const in float attenuationDistance ) {\n		vec4 transmittedLight;\n		vec3 transmittance;\n		#ifdef USE_DISPERSION\n			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;\n			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );\n			for ( int i = 0; i < 3; i ++ ) {\n				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );\n				vec3 refractedRayExit = position + transmissionRay;\n				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );\n				vec2 refractionCoords = ndcPos.xy / ndcPos.w;\n				refractionCoords += 1.0;\n				refractionCoords /= 2.0;\n				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );\n				transmittedLight[ i ] = transmissionSample[ i ];\n				transmittedLight.a += transmissionSample.a;\n				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];\n			}\n			transmittedLight.a /= 3.0;\n		#else\n			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );\n			vec3 refractedRayExit = position + transmissionRay;\n			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );\n			vec2 refractionCoords = ndcPos.xy / ndcPos.w;\n			refractionCoords += 1.0;\n			refractionCoords /= 2.0;\n			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );\n			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );\n		#endif\n		vec3 attenuatedColor = transmittance * transmittedLight.rgb;\n		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );\n		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;\n		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );\n	}\n#endif",
	uv_pars_fragment: "#if defined( USE_UV ) || defined( USE_ANISOTROPY )\n	varying vec2 vUv;\n#endif\n#ifdef USE_MAP\n	varying vec2 vMapUv;\n#endif\n#ifdef USE_ALPHAMAP\n	varying vec2 vAlphaMapUv;\n#endif\n#ifdef USE_LIGHTMAP\n	varying vec2 vLightMapUv;\n#endif\n#ifdef USE_AOMAP\n	varying vec2 vAoMapUv;\n#endif\n#ifdef USE_BUMPMAP\n	varying vec2 vBumpMapUv;\n#endif\n#ifdef USE_NORMALMAP\n	varying vec2 vNormalMapUv;\n#endif\n#ifdef USE_EMISSIVEMAP\n	varying vec2 vEmissiveMapUv;\n#endif\n#ifdef USE_METALNESSMAP\n	varying vec2 vMetalnessMapUv;\n#endif\n#ifdef USE_ROUGHNESSMAP\n	varying vec2 vRoughnessMapUv;\n#endif\n#ifdef USE_ANISOTROPYMAP\n	varying vec2 vAnisotropyMapUv;\n#endif\n#ifdef USE_CLEARCOATMAP\n	varying vec2 vClearcoatMapUv;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	varying vec2 vClearcoatNormalMapUv;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	varying vec2 vClearcoatRoughnessMapUv;\n#endif\n#ifdef USE_IRIDESCENCEMAP\n	varying vec2 vIridescenceMapUv;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	varying vec2 vIridescenceThicknessMapUv;\n#endif\n#ifdef USE_SHEEN_COLORMAP\n	varying vec2 vSheenColorMapUv;\n#endif\n#ifdef USE_SHEEN_ROUGHNESSMAP\n	varying vec2 vSheenRoughnessMapUv;\n#endif\n#ifdef USE_SPECULARMAP\n	varying vec2 vSpecularMapUv;\n#endif\n#ifdef USE_SPECULAR_COLORMAP\n	varying vec2 vSpecularColorMapUv;\n#endif\n#ifdef USE_SPECULAR_INTENSITYMAP\n	varying vec2 vSpecularIntensityMapUv;\n#endif\n#ifdef USE_TRANSMISSIONMAP\n	uniform mat3 transmissionMapTransform;\n	varying vec2 vTransmissionMapUv;\n#endif\n#ifdef USE_THICKNESSMAP\n	uniform mat3 thicknessMapTransform;\n	varying vec2 vThicknessMapUv;\n#endif",
	uv_pars_vertex: "#if defined( USE_UV ) || defined( USE_ANISOTROPY )\n	varying vec2 vUv;\n#endif\n#ifdef USE_MAP\n	uniform mat3 mapTransform;\n	varying vec2 vMapUv;\n#endif\n#ifdef USE_ALPHAMAP\n	uniform mat3 alphaMapTransform;\n	varying vec2 vAlphaMapUv;\n#endif\n#ifdef USE_LIGHTMAP\n	uniform mat3 lightMapTransform;\n	varying vec2 vLightMapUv;\n#endif\n#ifdef USE_AOMAP\n	uniform mat3 aoMapTransform;\n	varying vec2 vAoMapUv;\n#endif\n#ifdef USE_BUMPMAP\n	uniform mat3 bumpMapTransform;\n	varying vec2 vBumpMapUv;\n#endif\n#ifdef USE_NORMALMAP\n	uniform mat3 normalMapTransform;\n	varying vec2 vNormalMapUv;\n#endif\n#ifdef USE_DISPLACEMENTMAP\n	uniform mat3 displacementMapTransform;\n	varying vec2 vDisplacementMapUv;\n#endif\n#ifdef USE_EMISSIVEMAP\n	uniform mat3 emissiveMapTransform;\n	varying vec2 vEmissiveMapUv;\n#endif\n#ifdef USE_METALNESSMAP\n	uniform mat3 metalnessMapTransform;\n	varying vec2 vMetalnessMapUv;\n#endif\n#ifdef USE_ROUGHNESSMAP\n	uniform mat3 roughnessMapTransform;\n	varying vec2 vRoughnessMapUv;\n#endif\n#ifdef USE_ANISOTROPYMAP\n	uniform mat3 anisotropyMapTransform;\n	varying vec2 vAnisotropyMapUv;\n#endif\n#ifdef USE_CLEARCOATMAP\n	uniform mat3 clearcoatMapTransform;\n	varying vec2 vClearcoatMapUv;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	uniform mat3 clearcoatNormalMapTransform;\n	varying vec2 vClearcoatNormalMapUv;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	uniform mat3 clearcoatRoughnessMapTransform;\n	varying vec2 vClearcoatRoughnessMapUv;\n#endif\n#ifdef USE_SHEEN_COLORMAP\n	uniform mat3 sheenColorMapTransform;\n	varying vec2 vSheenColorMapUv;\n#endif\n#ifdef USE_SHEEN_ROUGHNESSMAP\n	uniform mat3 sheenRoughnessMapTransform;\n	varying vec2 vSheenRoughnessMapUv;\n#endif\n#ifdef USE_IRIDESCENCEMAP\n	uniform mat3 iridescenceMapTransform;\n	varying vec2 vIridescenceMapUv;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	uniform mat3 iridescenceThicknessMapTransform;\n	varying vec2 vIridescenceThicknessMapUv;\n#endif\n#ifdef USE_SPECULARMAP\n	uniform mat3 specularMapTransform;\n	varying vec2 vSpecularMapUv;\n#endif\n#ifdef USE_SPECULAR_COLORMAP\n	uniform mat3 specularColorMapTransform;\n	varying vec2 vSpecularColorMapUv;\n#endif\n#ifdef USE_SPECULAR_INTENSITYMAP\n	uniform mat3 specularIntensityMapTransform;\n	varying vec2 vSpecularIntensityMapUv;\n#endif\n#ifdef USE_TRANSMISSIONMAP\n	uniform mat3 transmissionMapTransform;\n	varying vec2 vTransmissionMapUv;\n#endif\n#ifdef USE_THICKNESSMAP\n	uniform mat3 thicknessMapTransform;\n	varying vec2 vThicknessMapUv;\n#endif",
	uv_vertex: "#if defined( USE_UV ) || defined( USE_ANISOTROPY )\n	vUv = vec3( uv, 1 ).xy;\n#endif\n#ifdef USE_MAP\n	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_ALPHAMAP\n	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_LIGHTMAP\n	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_AOMAP\n	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_BUMPMAP\n	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_NORMALMAP\n	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_DISPLACEMENTMAP\n	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_EMISSIVEMAP\n	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_METALNESSMAP\n	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_ROUGHNESSMAP\n	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_ANISOTROPYMAP\n	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_CLEARCOATMAP\n	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_IRIDESCENCEMAP\n	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SHEEN_COLORMAP\n	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SHEEN_ROUGHNESSMAP\n	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SPECULARMAP\n	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SPECULAR_COLORMAP\n	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SPECULAR_INTENSITYMAP\n	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_TRANSMISSIONMAP\n	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_THICKNESSMAP\n	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;\n#endif",
	worldpos_vertex: "#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0\n	vec4 worldPosition = vec4( transformed, 1.0 );\n	#ifdef USE_BATCHING\n		worldPosition = batchingMatrix * worldPosition;\n	#endif\n	#ifdef USE_INSTANCING\n		worldPosition = instanceMatrix * worldPosition;\n	#endif\n	worldPosition = modelMatrix * worldPosition;\n#endif",
	background_vert: "varying vec2 vUv;\nuniform mat3 uvTransform;\nvoid main() {\n	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;\n	gl_Position = vec4( position.xy, 1.0, 1.0 );\n}",
	background_frag: "uniform sampler2D t2D;\nuniform float backgroundIntensity;\nvarying vec2 vUv;\nvoid main() {\n	vec4 texColor = texture2D( t2D, vUv );\n	#ifdef DECODE_VIDEO_TEXTURE\n		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );\n	#endif\n	texColor.rgb *= backgroundIntensity;\n	gl_FragColor = texColor;\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}",
	backgroundCube_vert: "varying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vWorldDirection = transformDirection( position, modelMatrix );\n	#include <begin_vertex>\n	#include <project_vertex>\n	gl_Position.z = gl_Position.w;\n}",
	backgroundCube_frag: "#ifdef ENVMAP_TYPE_CUBE\n	uniform samplerCube envMap;\n#elif defined( ENVMAP_TYPE_CUBE_UV )\n	uniform sampler2D envMap;\n#endif\nuniform float backgroundBlurriness;\nuniform float backgroundIntensity;\nuniform mat3 backgroundRotation;\nvarying vec3 vWorldDirection;\n#include <cube_uv_reflection_fragment>\nvoid main() {\n	#ifdef ENVMAP_TYPE_CUBE\n		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );\n	#elif defined( ENVMAP_TYPE_CUBE_UV )\n		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );\n	#else\n		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );\n	#endif\n	texColor.rgb *= backgroundIntensity;\n	gl_FragColor = texColor;\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}",
	cube_vert: "varying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vWorldDirection = transformDirection( position, modelMatrix );\n	#include <begin_vertex>\n	#include <project_vertex>\n	gl_Position.z = gl_Position.w;\n}",
	cube_frag: "uniform samplerCube tCube;\nuniform float tFlip;\nuniform float opacity;\nvarying vec3 vWorldDirection;\nvoid main() {\n	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );\n	gl_FragColor = texColor;\n	gl_FragColor.a *= opacity;\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}",
	depth_vert: "#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvarying vec2 vHighPrecisionZW;\nvoid main() {\n	#include <uv_vertex>\n	#include <batching_vertex>\n	#include <skinbase_vertex>\n	#include <morphinstance_vertex>\n	#ifdef USE_DISPLACEMENTMAP\n		#include <beginnormal_vertex>\n		#include <morphnormal_vertex>\n		#include <skinnormal_vertex>\n	#endif\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vHighPrecisionZW = gl_Position.zw;\n}",
	depth_frag: "#if DEPTH_PACKING == 3200\n	uniform float opacity;\n#endif\n#include <common>\n#include <packing>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvarying vec2 vHighPrecisionZW;\nvoid main() {\n	vec4 diffuseColor = vec4( 1.0 );\n	#include <clipping_planes_fragment>\n	#if DEPTH_PACKING == 3200\n		diffuseColor.a = opacity;\n	#endif\n	#include <map_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <logdepthbuf_fragment>\n	#ifdef USE_REVERSED_DEPTH_BUFFER\n		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];\n	#else\n		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;\n	#endif\n	#if DEPTH_PACKING == 3200\n		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );\n	#elif DEPTH_PACKING == 3201\n		gl_FragColor = packDepthToRGBA( fragCoordZ );\n	#elif DEPTH_PACKING == 3202\n		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );\n	#elif DEPTH_PACKING == 3203\n		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );\n	#endif\n}",
	distance_vert: "#define DISTANCE\nvarying vec3 vWorldPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <batching_vertex>\n	#include <skinbase_vertex>\n	#include <morphinstance_vertex>\n	#ifdef USE_DISPLACEMENTMAP\n		#include <beginnormal_vertex>\n		#include <morphnormal_vertex>\n		#include <skinnormal_vertex>\n	#endif\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <worldpos_vertex>\n	#include <clipping_planes_vertex>\n	vWorldPosition = worldPosition.xyz;\n}",
	distance_frag: "#define DISTANCE\nuniform vec3 referencePosition;\nuniform float nearDistance;\nuniform float farDistance;\nvarying vec3 vWorldPosition;\n#include <common>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( 1.0 );\n	#include <clipping_planes_fragment>\n	#include <map_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	float dist = length( vWorldPosition - referencePosition );\n	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );\n	dist = saturate( dist );\n	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );\n}",
	equirect_vert: "varying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vWorldDirection = transformDirection( position, modelMatrix );\n	#include <begin_vertex>\n	#include <project_vertex>\n}",
	equirect_frag: "uniform sampler2D tEquirect;\nvarying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vec3 direction = normalize( vWorldDirection );\n	vec2 sampleUV = equirectUv( direction );\n	gl_FragColor = texture2D( tEquirect, sampleUV );\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}",
	linedashed_vert: "uniform float scale;\nattribute float lineDistance;\nvarying float vLineDistance;\n#include <common>\n#include <uv_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	vLineDistance = scale * lineDistance;\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <fog_vertex>\n}",
	linedashed_frag: "uniform vec3 diffuse;\nuniform float opacity;\nuniform float dashSize;\nuniform float totalSize;\nvarying float vLineDistance;\n#include <common>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <fog_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	if ( mod( vLineDistance, totalSize ) > dashSize ) {\n		discard;\n	}\n	vec3 outgoingLight = vec3( 0.0 );\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	outgoingLight = diffuseColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n}",
	meshbasic_vert: "#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )\n		#include <beginnormal_vertex>\n		#include <morphnormal_vertex>\n		#include <skinbase_vertex>\n		#include <skinnormal_vertex>\n		#include <defaultnormal_vertex>\n	#endif\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <worldpos_vertex>\n	#include <envmap_vertex>\n	#include <fog_vertex>\n}",
	meshbasic_frag: "uniform vec3 diffuse;\nuniform float opacity;\n#ifndef FLAT_SHADED\n	varying vec3 vNormal;\n#endif\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_pars_fragment>\n#include <fog_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <specularmap_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	#ifdef USE_LIGHTMAP\n		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );\n		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;\n	#else\n		reflectedLight.indirectDiffuse += vec3( 1.0 );\n	#endif\n	#include <aomap_fragment>\n	reflectedLight.indirectDiffuse *= diffuseColor.rgb;\n	vec3 outgoingLight = reflectedLight.indirectDiffuse;\n	#include <envmap_fragment>\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshlambert_vert: "#define LAMBERT\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <envmap_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}",
	meshlambert_frag: "#define LAMBERT\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float opacity;\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <cube_uv_reflection_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_pars_fragment>\n#include <envmap_physical_pars_fragment>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_lambert_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <specularmap_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_lambert_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;\n	#include <envmap_fragment>\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshmatcap_vert: "#define MATCAP\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <color_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <fog_vertex>\n	vViewPosition = - mvPosition.xyz;\n}",
	meshmatcap_frag: "#define MATCAP\nuniform vec3 diffuse;\nuniform float opacity;\nuniform sampler2D matcap;\nvarying vec3 vViewPosition;\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <fog_pars_fragment>\n#include <normal_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	vec3 viewDir = normalize( vViewPosition );\n	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );\n	vec3 y = cross( viewDir, x );\n	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;\n	#ifdef USE_MATCAP\n		vec4 matcapColor = texture2D( matcap, uv );\n	#else\n		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );\n	#endif\n	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshnormal_vert: "#define NORMAL\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	varying vec3 vViewPosition;\n#endif\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphinstance_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	vViewPosition = - mvPosition.xyz;\n#endif\n}",
	meshnormal_frag: "#define NORMAL\nuniform float opacity;\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	varying vec3 vViewPosition;\n#endif\n#include <uv_pars_fragment>\n#include <normal_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );\n	#include <clipping_planes_fragment>\n	#include <logdepthbuf_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );\n	#ifdef OPAQUE\n		gl_FragColor.a = 1.0;\n	#endif\n}",
	meshphong_vert: "#define PHONG\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphinstance_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <envmap_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}",
	meshphong_frag: "#define PHONG\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform vec3 specular;\nuniform float shininess;\nuniform float opacity;\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <cube_uv_reflection_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_pars_fragment>\n#include <envmap_physical_pars_fragment>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_phong_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <specularmap_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_phong_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;\n	#include <envmap_fragment>\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshphysical_vert: "#define STANDARD\nvarying vec3 vViewPosition;\n#ifdef USE_TRANSMISSION\n	varying vec3 vWorldPosition;\n#endif\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n#ifdef USE_TRANSMISSION\n	vWorldPosition = worldPosition.xyz;\n#endif\n}",
	meshphysical_frag: "#define STANDARD\n#ifdef PHYSICAL\n	#define IOR\n	#define USE_SPECULAR\n#endif\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float roughness;\nuniform float metalness;\nuniform float opacity;\n#ifdef IOR\n	uniform float ior;\n#endif\n#ifdef USE_SPECULAR\n	uniform float specularIntensity;\n	uniform vec3 specularColor;\n	#ifdef USE_SPECULAR_COLORMAP\n		uniform sampler2D specularColorMap;\n	#endif\n	#ifdef USE_SPECULAR_INTENSITYMAP\n		uniform sampler2D specularIntensityMap;\n	#endif\n#endif\n#ifdef USE_CLEARCOAT\n	uniform float clearcoat;\n	uniform float clearcoatRoughness;\n#endif\n#ifdef USE_DISPERSION\n	uniform float dispersion;\n#endif\n#ifdef USE_RETROREFLECTION\n	uniform float retroreflectivity;\n#endif\n#ifdef USE_IRIDESCENCE\n	uniform float iridescence;\n	uniform float iridescenceIOR;\n	uniform float iridescenceThicknessMinimum;\n	uniform float iridescenceThicknessMaximum;\n#endif\n#ifdef USE_SHEEN\n	uniform vec3 sheenColor;\n	uniform float sheenRoughness;\n	#ifdef USE_SHEEN_COLORMAP\n		uniform sampler2D sheenColorMap;\n	#endif\n	#ifdef USE_SHEEN_ROUGHNESSMAP\n		uniform sampler2D sheenRoughnessMap;\n	#endif\n#endif\n#ifdef USE_ANISOTROPY\n	uniform vec2 anisotropyVector;\n	#ifdef USE_ANISOTROPYMAP\n		uniform sampler2D anisotropyMap;\n	#endif\n#endif\nvarying vec3 vViewPosition;\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <iridescence_fragment>\n#include <cube_uv_reflection_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_physical_pars_fragment>\n#include <fog_pars_fragment>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_physical_pars_fragment>\n#include <transmission_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <clearcoat_pars_fragment>\n#include <iridescence_pars_fragment>\n#include <roughnessmap_pars_fragment>\n#include <metalnessmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <roughnessmap_fragment>\n	#include <metalnessmap_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <clearcoat_normal_fragment_begin>\n	#include <clearcoat_normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_physical_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;\n	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;\n	#include <transmission_fragment>\n	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;\n	#ifdef USE_SHEEN\n \n		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;\n \n 	#endif\n	#ifdef USE_CLEARCOAT\n		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );\n		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );\n		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;\n	#endif\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshtoon_vert: "#define TOON\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}",
	meshtoon_frag: "#define TOON\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float opacity;\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <gradientmap_pars_fragment>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_toon_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_toon_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	points_vert: "uniform float size;\nuniform float scale;\n#include <common>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\n#ifdef USE_POINTS_UV\n	varying vec2 vUv;\n	uniform mat3 uvTransform;\n#endif\nvoid main() {\n	#ifdef USE_POINTS_UV\n		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;\n	#endif\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <project_vertex>\n	gl_PointSize = size;\n	#ifdef USE_SIZEATTENUATION\n		bool isPerspective = isPerspectiveMatrix( projectionMatrix );\n		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );\n	#endif\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <worldpos_vertex>\n	#include <fog_vertex>\n}",
	points_frag: "uniform vec3 diffuse;\nuniform float opacity;\n#include <common>\n#include <color_pars_fragment>\n#include <map_particle_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <fog_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	vec3 outgoingLight = vec3( 0.0 );\n	#include <logdepthbuf_fragment>\n	#include <map_particle_fragment>\n	#include <color_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	outgoingLight = diffuseColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n}",
	shadow_vert: "#include <common>\n#include <batching_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <shadowmap_pars_vertex>\nvoid main() {\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphinstance_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <worldpos_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}",
	shadow_frag: "uniform vec3 color;\nuniform float opacity;\n#include <common>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <logdepthbuf_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>\nvoid main() {\n	#include <logdepthbuf_fragment>\n	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n}",
	sprite_vert: "uniform float rotation;\nuniform vec2 center;\n#include <common>\n#include <uv_pars_vertex>\n#include <fog_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	vec4 mvPosition = modelViewMatrix[ 3 ];\n	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );\n	#ifndef USE_SIZEATTENUATION\n		bool isPerspective = isPerspectiveMatrix( projectionMatrix );\n		if ( isPerspective ) scale *= - mvPosition.z;\n	#endif\n	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;\n	vec2 rotatedPosition;\n	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;\n	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;\n	mvPosition.xy += rotatedPosition;\n	gl_Position = projectionMatrix * mvPosition;\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <fog_vertex>\n}",
	sprite_frag: "uniform vec3 diffuse;\nuniform float opacity;\n#include <common>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <fog_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	vec3 outgoingLight = vec3( 0.0 );\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	outgoingLight = diffuseColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n}"
}, Q = {
	common: {
		diffuse: { value: /*@__PURE__*/ new X(16777215) },
		opacity: { value: 1 },
		map: { value: null },
		mapTransform: { value: /*@__PURE__*/ new J() },
		alphaMap: { value: null },
		alphaMapTransform: { value: /*@__PURE__*/ new J() },
		alphaTest: { value: 0 }
	},
	specularmap: {
		specularMap: { value: null },
		specularMapTransform: { value: /*@__PURE__*/ new J() }
	},
	envmap: {
		envMap: { value: null },
		envMapRotation: { value: /*@__PURE__*/ new J() },
		reflectivity: { value: 1 },
		ior: { value: 1.5 },
		refractionRatio: { value: .98 },
		dfgLUT: { value: null }
	},
	aomap: {
		aoMap: { value: null },
		aoMapIntensity: { value: 1 },
		aoMapTransform: { value: /*@__PURE__*/ new J() }
	},
	lightmap: {
		lightMap: { value: null },
		lightMapIntensity: { value: 1 },
		lightMapTransform: { value: /*@__PURE__*/ new J() }
	},
	bumpmap: {
		bumpMap: { value: null },
		bumpMapTransform: { value: /*@__PURE__*/ new J() },
		bumpScale: { value: 1 }
	},
	normalmap: {
		normalMap: { value: null },
		normalMapTransform: { value: /*@__PURE__*/ new J() },
		normalScale: { value: /*@__PURE__*/ new K(1, 1) }
	},
	displacementmap: {
		displacementMap: { value: null },
		displacementMapTransform: { value: /*@__PURE__*/ new J() },
		displacementScale: { value: 1 },
		displacementBias: { value: 0 }
	},
	emissivemap: {
		emissiveMap: { value: null },
		emissiveMapTransform: { value: /*@__PURE__*/ new J() }
	},
	metalnessmap: {
		metalnessMap: { value: null },
		metalnessMapTransform: { value: /*@__PURE__*/ new J() }
	},
	roughnessmap: {
		roughnessMap: { value: null },
		roughnessMapTransform: { value: /*@__PURE__*/ new J() }
	},
	gradientmap: { gradientMap: { value: null } },
	fog: {
		fogDensity: { value: 25e-5 },
		fogNear: { value: 1 },
		fogFar: { value: 2e3 },
		fogColor: { value: /*@__PURE__*/ new X(16777215) }
	},
	lights: {
		ambientLightColor: { value: [] },
		lightProbe: { value: [] },
		sunLights: {
			value: [],
			properties: {
				direction: {},
				color: {}
			}
		},
		sunLightShadows: {
			value: [],
			properties: {
				shadowIntensity: 1,
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {}
			}
		},
		sunShadowMatrix: { value: [] },
		sunShadowCascade: { value: [] },
		directionalLights: {
			value: [],
			properties: {
				direction: {},
				color: {}
			}
		},
		directionalLightShadows: {
			value: [],
			properties: {
				shadowIntensity: 1,
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {}
			}
		},
		directionalShadowMatrix: { value: [] },
		spotLights: {
			value: [],
			properties: {
				color: {},
				position: {},
				direction: {},
				distance: {},
				coneCos: {},
				penumbraCos: {},
				decay: {}
			}
		},
		spotLightShadows: {
			value: [],
			properties: {
				shadowIntensity: 1,
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {}
			}
		},
		spotLightMap: { value: [] },
		spotLightMatrix: { value: [] },
		pointLights: {
			value: [],
			properties: {
				color: {},
				position: {},
				decay: {},
				distance: {}
			}
		},
		pointLightShadows: {
			value: [],
			properties: {
				shadowIntensity: 1,
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {},
				shadowCameraNear: {},
				shadowCameraFar: {}
			}
		},
		pointShadowMatrix: { value: [] },
		hemisphereLights: {
			value: [],
			properties: {
				direction: {},
				skyColor: {},
				groundColor: {}
			}
		},
		rectAreaLights: {
			value: [],
			properties: {
				color: {},
				position: {},
				width: {},
				height: {}
			}
		},
		ltc_1: { value: null },
		ltc_2: { value: null },
		probesSH: { value: null },
		probesMin: { value: /*@__PURE__*/ new q() },
		probesMax: { value: /*@__PURE__*/ new q() },
		probesResolution: { value: /*@__PURE__*/ new q() }
	},
	points: {
		diffuse: { value: /*@__PURE__*/ new X(16777215) },
		opacity: { value: 1 },
		size: { value: 1 },
		scale: { value: 1 },
		map: { value: null },
		alphaMap: { value: null },
		alphaMapTransform: { value: /*@__PURE__*/ new J() },
		alphaTest: { value: 0 },
		uvTransform: { value: /*@__PURE__*/ new J() }
	},
	sprite: {
		diffuse: { value: /*@__PURE__*/ new X(16777215) },
		opacity: { value: 1 },
		center: { value: /*@__PURE__*/ new K(.5, .5) },
		rotation: { value: 0 },
		map: { value: null },
		mapTransform: { value: /*@__PURE__*/ new J() },
		alphaMap: { value: null },
		alphaMapTransform: { value: /*@__PURE__*/ new J() },
		alphaTest: { value: 0 }
	}
}, km = {
	basic: {
		uniforms: /*@__PURE__*/ xp([
			Q.common,
			Q.specularmap,
			Q.envmap,
			Q.aomap,
			Q.lightmap,
			Q.fog
		]),
		vertexShader: Z.meshbasic_vert,
		fragmentShader: Z.meshbasic_frag
	},
	lambert: {
		uniforms: /*@__PURE__*/ xp([
			Q.common,
			Q.specularmap,
			Q.envmap,
			Q.aomap,
			Q.lightmap,
			Q.emissivemap,
			Q.bumpmap,
			Q.normalmap,
			Q.displacementmap,
			Q.fog,
			Q.lights,
			{
				emissive: { value: /*@__PURE__*/ new X(0) },
				envMapIntensity: { value: 1 }
			}
		]),
		vertexShader: Z.meshlambert_vert,
		fragmentShader: Z.meshlambert_frag
	},
	phong: {
		uniforms: /*@__PURE__*/ xp([
			Q.common,
			Q.specularmap,
			Q.envmap,
			Q.aomap,
			Q.lightmap,
			Q.emissivemap,
			Q.bumpmap,
			Q.normalmap,
			Q.displacementmap,
			Q.fog,
			Q.lights,
			{
				emissive: { value: /*@__PURE__*/ new X(0) },
				specular: { value: /*@__PURE__*/ new X(1118481) },
				shininess: { value: 30 },
				envMapIntensity: { value: 1 }
			}
		]),
		vertexShader: Z.meshphong_vert,
		fragmentShader: Z.meshphong_frag
	},
	standard: {
		uniforms: /*@__PURE__*/ xp([
			Q.common,
			Q.envmap,
			Q.aomap,
			Q.lightmap,
			Q.emissivemap,
			Q.bumpmap,
			Q.normalmap,
			Q.displacementmap,
			Q.roughnessmap,
			Q.metalnessmap,
			Q.fog,
			Q.lights,
			{
				emissive: { value: /*@__PURE__*/ new X(0) },
				roughness: { value: 1 },
				metalness: { value: 0 },
				envMapIntensity: { value: 1 }
			}
		]),
		vertexShader: Z.meshphysical_vert,
		fragmentShader: Z.meshphysical_frag
	},
	toon: {
		uniforms: /*@__PURE__*/ xp([
			Q.common,
			Q.aomap,
			Q.lightmap,
			Q.emissivemap,
			Q.bumpmap,
			Q.normalmap,
			Q.displacementmap,
			Q.gradientmap,
			Q.fog,
			Q.lights,
			{ emissive: { value: /*@__PURE__*/ new X(0) } }
		]),
		vertexShader: Z.meshtoon_vert,
		fragmentShader: Z.meshtoon_frag
	},
	matcap: {
		uniforms: /*@__PURE__*/ xp([
			Q.common,
			Q.bumpmap,
			Q.normalmap,
			Q.displacementmap,
			Q.fog,
			{ matcap: { value: null } }
		]),
		vertexShader: Z.meshmatcap_vert,
		fragmentShader: Z.meshmatcap_frag
	},
	points: {
		uniforms: /*@__PURE__*/ xp([Q.points, Q.fog]),
		vertexShader: Z.points_vert,
		fragmentShader: Z.points_frag
	},
	dashed: {
		uniforms: /*@__PURE__*/ xp([
			Q.common,
			Q.fog,
			{
				scale: { value: 1 },
				dashSize: { value: 1 },
				totalSize: { value: 2 }
			}
		]),
		vertexShader: Z.linedashed_vert,
		fragmentShader: Z.linedashed_frag
	},
	depth: {
		uniforms: /*@__PURE__*/ xp([Q.common, Q.displacementmap]),
		vertexShader: Z.depth_vert,
		fragmentShader: Z.depth_frag
	},
	normal: {
		uniforms: /*@__PURE__*/ xp([
			Q.common,
			Q.bumpmap,
			Q.normalmap,
			Q.displacementmap,
			{ opacity: { value: 1 } }
		]),
		vertexShader: Z.meshnormal_vert,
		fragmentShader: Z.meshnormal_frag
	},
	sprite: {
		uniforms: /*@__PURE__*/ xp([Q.sprite, Q.fog]),
		vertexShader: Z.sprite_vert,
		fragmentShader: Z.sprite_frag
	},
	background: {
		uniforms: {
			uvTransform: { value: /*@__PURE__*/ new J() },
			t2D: { value: null },
			backgroundIntensity: { value: 1 }
		},
		vertexShader: Z.background_vert,
		fragmentShader: Z.background_frag
	},
	backgroundCube: {
		uniforms: {
			envMap: { value: null },
			backgroundBlurriness: { value: 0 },
			backgroundIntensity: { value: 1 },
			backgroundRotation: { value: /*@__PURE__*/ new J() }
		},
		vertexShader: Z.backgroundCube_vert,
		fragmentShader: Z.backgroundCube_frag
	},
	cube: {
		uniforms: {
			tCube: { value: null },
			tFlip: { value: -1 },
			opacity: { value: 1 }
		},
		vertexShader: Z.cube_vert,
		fragmentShader: Z.cube_frag
	},
	equirect: {
		uniforms: { tEquirect: { value: null } },
		vertexShader: Z.equirect_vert,
		fragmentShader: Z.equirect_frag
	},
	distance: {
		uniforms: /*@__PURE__*/ xp([
			Q.common,
			Q.displacementmap,
			{
				referencePosition: { value: /*@__PURE__*/ new q() },
				nearDistance: { value: 1 },
				farDistance: { value: 1e3 }
			}
		]),
		vertexShader: Z.distance_vert,
		fragmentShader: Z.distance_frag
	},
	shadow: {
		uniforms: /*@__PURE__*/ xp([
			Q.lights,
			Q.fog,
			{
				color: { value: /*@__PURE__*/ new X(0) },
				opacity: { value: 1 }
			}
		]),
		vertexShader: Z.shadow_vert,
		fragmentShader: Z.shadow_frag
	}
};
km.physical = {
	uniforms: /*@__PURE__*/ xp([km.standard.uniforms, {
		clearcoat: { value: 0 },
		clearcoatMap: { value: null },
		clearcoatMapTransform: { value: /*@__PURE__*/ new J() },
		clearcoatNormalMap: { value: null },
		clearcoatNormalMapTransform: { value: /*@__PURE__*/ new J() },
		clearcoatNormalScale: { value: /*@__PURE__*/ new K(1, 1) },
		clearcoatRoughness: { value: 0 },
		clearcoatRoughnessMap: { value: null },
		clearcoatRoughnessMapTransform: { value: /*@__PURE__*/ new J() },
		dispersion: { value: 0 },
		retroreflectivity: { value: 0 },
		iridescence: { value: 0 },
		iridescenceMap: { value: null },
		iridescenceMapTransform: { value: /*@__PURE__*/ new J() },
		iridescenceIOR: { value: 1.3 },
		iridescenceThicknessMinimum: { value: 100 },
		iridescenceThicknessMaximum: { value: 400 },
		iridescenceThicknessMap: { value: null },
		iridescenceThicknessMapTransform: { value: /*@__PURE__*/ new J() },
		sheen: { value: 0 },
		sheenColor: { value: /*@__PURE__*/ new X(0) },
		sheenColorMap: { value: null },
		sheenColorMapTransform: { value: /*@__PURE__*/ new J() },
		sheenRoughness: { value: 1 },
		sheenRoughnessMap: { value: null },
		sheenRoughnessMapTransform: { value: /*@__PURE__*/ new J() },
		transmission: { value: 0 },
		transmissionMap: { value: null },
		transmissionMapTransform: { value: /*@__PURE__*/ new J() },
		transmissionSamplerSize: { value: /*@__PURE__*/ new K() },
		transmissionSamplerMap: { value: null },
		thickness: { value: 0 },
		thicknessMap: { value: null },
		thicknessMapTransform: { value: /*@__PURE__*/ new J() },
		attenuationDistance: { value: 0 },
		attenuationColor: { value: /*@__PURE__*/ new X(0) },
		specularColor: { value: /*@__PURE__*/ new X(1, 1, 1) },
		specularColorMap: { value: null },
		specularColorMapTransform: { value: /*@__PURE__*/ new J() },
		specularIntensity: { value: 1 },
		specularIntensityMap: { value: null },
		specularIntensityMapTransform: { value: /*@__PURE__*/ new J() },
		anisotropyVector: { value: /*@__PURE__*/ new K() },
		anisotropyMap: { value: null },
		anisotropyMapTransform: { value: /*@__PURE__*/ new J() }
	}]),
	vertexShader: Z.meshphysical_vert,
	fragmentShader: Z.meshphysical_frag
};
var Am = {
	r: 0,
	b: 0,
	g: 0
}, jm = /*@__PURE__*/ new Pu(), Mm = /*@__PURE__*/ new J();
Mm.set(-1, 0, 0, 0, 1, 0, 0, 0, 1);
function Nm(e, t, n, r, i, a) {
	let o = new X(0), s = i === !0 ? 0 : 1, c, l, u = null, d = 0, f = null;
	function p(e) {
		let n = e.isScene === !0 ? e.background : null;
		if (n && n.isTexture) {
			let r = e.backgroundBlurriness > 0;
			n = t.get(n, r);
		}
		return n;
	}
	function m(t) {
		let r = !1, i = p(t);
		i === null ? g(o, s) : i && i.isColor && (g(i, 1), r = !0);
		let c = e.xr.getEnvironmentBlendMode();
		c === "additive" ? n.buffers.color.setClear(0, 0, 0, 1, a) : c === "alpha-blend" && n.buffers.color.setClear(0, 0, 0, 0, a), (e.autoClear || r) && (n.buffers.depth.setTest(!0), n.buffers.depth.setMask(!0), n.buffers.color.setMask(!0), e.clear(e.autoClearColor, e.autoClearDepth, e.autoClearStencil));
	}
	function h(t, n) {
		let i = p(n);
		i && (i.isCubeTexture || i.mapping === 306) ? (l === void 0 && (l = new Ff(new pp(1, 1, 1), new Op({
			name: "BackgroundCubeMaterial",
			uniforms: bp(km.backgroundCube.uniforms),
			vertexShader: km.backgroundCube.vertexShader,
			fragmentShader: km.backgroundCube.fragmentShader,
			side: 1,
			depthTest: !1,
			depthWrite: !1,
			fog: !1,
			allowOverride: !1
		})), l.geometry.deleteAttribute("normal"), l.geometry.deleteAttribute("uv"), l.onBeforeRender = function(e, t, n) {
			this.matrixWorld.copyPosition(n.matrixWorld);
		}, Object.defineProperty(l.material, "envMap", { get: function() {
			return this.uniforms.envMap.value;
		} }), r.update(l)), l.material.uniforms.envMap.value = i, l.material.uniforms.backgroundBlurriness.value = n.backgroundBlurriness, l.material.uniforms.backgroundIntensity.value = n.backgroundIntensity, l.material.uniforms.backgroundRotation.value.setFromMatrix4(jm.makeRotationFromEuler(n.backgroundRotation)).transpose(), i.isCubeTexture && i.isRenderTargetTexture === !1 && l.material.uniforms.backgroundRotation.value.premultiply(Mm), l.material.toneMapped = Y.getTransfer(i.colorSpace) !== Cl, (u !== i || d !== i.version || f !== e.toneMapping) && (l.material.needsUpdate = !0, u = i, d = i.version, f = e.toneMapping), l.layers.enableAll(), t.unshift(l, l.geometry, l.material, 0, 0, null)) : i && i.isTexture && (c === void 0 && (c = new Ff(new yp(2, 2), new Op({
			name: "BackgroundMaterial",
			uniforms: bp(km.background.uniforms),
			vertexShader: km.background.vertexShader,
			fragmentShader: km.background.fragmentShader,
			side: 0,
			depthTest: !1,
			depthWrite: !1,
			fog: !1,
			allowOverride: !1
		})), c.geometry.deleteAttribute("normal"), Object.defineProperty(c.material, "map", { get: function() {
			return this.uniforms.t2D.value;
		} }), r.update(c)), c.material.uniforms.t2D.value = i, c.material.uniforms.backgroundIntensity.value = n.backgroundIntensity, c.material.toneMapped = Y.getTransfer(i.colorSpace) !== Cl, i.matrixAutoUpdate === !0 && i.updateMatrix(), c.material.uniforms.uvTransform.value.copy(i.matrix), (u !== i || d !== i.version || f !== e.toneMapping) && (c.material.needsUpdate = !0, u = i, d = i.version, f = e.toneMapping), c.layers.enableAll(), t.unshift(c, c.geometry, c.material, 0, 0, null));
	}
	function g(t, r) {
		t.getRGB(Am, wp(e)), n.buffers.color.setClear(Am.r, Am.g, Am.b, r, a);
	}
	function _() {
		l !== void 0 && (l.geometry.dispose(), l.material.dispose(), l = void 0), c !== void 0 && (c.geometry.dispose(), c.material.dispose(), c = void 0);
	}
	return {
		getClearColor: function() {
			return o;
		},
		setClearColor: function(e, t = 1) {
			o.set(e), s = t, g(o, s);
		},
		getClearAlpha: function() {
			return s;
		},
		setClearAlpha: function(e) {
			s = e, g(o, s);
		},
		render: m,
		addToRenderList: h,
		dispose: _
	};
}
function Pm(e, t) {
	let n = e.getParameter(e.MAX_VERTEX_ATTRIBS), r = {}, i = f(null), a = i, o = !1;
	function s(n, r, i, s, c) {
		let u = !1, f = d(n, s, i, r);
		a !== f && (a = f, l(a.object)), u = p(n, s, i, c), u && m(n, s, i, c), c !== null && t.update(c, e.ELEMENT_ARRAY_BUFFER), (u || o) && (o = !1, b(n, r, i, s), c !== null && e.bindBuffer(e.ELEMENT_ARRAY_BUFFER, t.get(c).buffer));
	}
	function c() {
		return e.createVertexArray();
	}
	function l(t) {
		return e.bindVertexArray(t);
	}
	function u(t) {
		return e.deleteVertexArray(t);
	}
	function d(e, t, n, i) {
		let a = i.wireframe === !0, o = r[t.id];
		o === void 0 && (o = {}, r[t.id] = o);
		let s = e.isInstancedMesh === !0 ? e.id : 0, l = o[s];
		l === void 0 && (l = {}, o[s] = l);
		let u = l[n.id];
		u === void 0 && (u = {}, l[n.id] = u);
		let d = u[a];
		return d === void 0 && (d = f(c()), u[a] = d), d;
	}
	function f(e) {
		let t = [], r = [], i = [];
		for (let e = 0; e < n; e++) t[e] = 0, r[e] = 0, i[e] = 0;
		return {
			geometry: null,
			program: null,
			wireframe: !1,
			newAttributes: t,
			enabledAttributes: r,
			attributeDivisors: i,
			object: e,
			attributes: {},
			index: null
		};
	}
	function p(e, t, n, r) {
		let i = a.attributes, o = t.attributes, s = 0, c = n.getAttributes();
		for (let t in c) if (c[t].location >= 0) {
			let n = i[t], r = o[t];
			if (r === void 0 && (t === "instanceMatrix" && e.instanceMatrix && (r = e.instanceMatrix), t === "instanceColor" && e.instanceColor && (r = e.instanceColor)), n === void 0 || n.attribute !== r || r && n.data !== r.data) return !0;
			s++;
		}
		return a.attributesNum !== s || a.index !== r;
	}
	function m(e, t, n, r) {
		let i = {}, o = t.attributes, s = 0, c = n.getAttributes();
		for (let t in c) if (c[t].location >= 0) {
			let n = o[t];
			n === void 0 && (t === "instanceMatrix" && e.instanceMatrix && (n = e.instanceMatrix), t === "instanceColor" && e.instanceColor && (n = e.instanceColor));
			let r = {};
			r.attribute = n, n && n.data && (r.data = n.data), i[t] = r, s++;
		}
		a.attributes = i, a.attributesNum = s, a.index = r;
	}
	function h() {
		let e = a.newAttributes;
		for (let t = 0, n = e.length; t < n; t++) e[t] = 0;
	}
	function g(e) {
		_(e, 0);
	}
	function _(t, n) {
		let r = a.newAttributes, i = a.enabledAttributes, o = a.attributeDivisors;
		r[t] = 1, i[t] === 0 && (e.enableVertexAttribArray(t), i[t] = 1), o[t] !== n && (e.vertexAttribDivisor(t, n), o[t] = n);
	}
	function v() {
		let t = a.newAttributes, n = a.enabledAttributes;
		for (let r = 0, i = n.length; r < i; r++) n[r] !== t[r] && (e.disableVertexAttribArray(r), n[r] = 0);
	}
	function y(t, n, r, i, a, o, s) {
		s === !0 ? e.vertexAttribIPointer(t, n, r, a, o) : e.vertexAttribPointer(t, n, r, i, a, o);
	}
	function b(n, r, i, a) {
		h();
		let o = a.attributes, s = i.getAttributes(), c = r.defaultAttributeValues;
		for (let r in s) {
			let i = s[r];
			if (i.location >= 0) {
				let s = o[r];
				if (s === void 0 && (r === "instanceMatrix" && n.instanceMatrix && (s = n.instanceMatrix), r === "instanceColor" && n.instanceColor && (s = n.instanceColor)), s !== void 0) {
					let r = s.normalized, o = s.itemSize, c = t.get(s);
					if (c === void 0) continue;
					let l = c.buffer, u = c.type, d = c.bytesPerElement, f = u === e.INT || u === e.UNSIGNED_INT || s.gpuType === 1013;
					if (s.isInterleavedBufferAttribute) {
						let t = s.data, c = t.stride, p = s.offset;
						if (t.isInstancedInterleavedBuffer) {
							for (let e = 0; e < i.locationSize; e++) _(i.location + e, t.meshPerAttribute);
							n.isInstancedMesh !== !0 && a._maxInstanceCount === void 0 && (a._maxInstanceCount = t.meshPerAttribute * t.count);
						} else for (let e = 0; e < i.locationSize; e++) g(i.location + e);
						e.bindBuffer(e.ARRAY_BUFFER, l);
						for (let e = 0; e < i.locationSize; e++) y(i.location + e, o / i.locationSize, u, r, c * d, (p + o / i.locationSize * e) * d, f);
					} else {
						if (s.isInstancedBufferAttribute) {
							for (let e = 0; e < i.locationSize; e++) _(i.location + e, s.meshPerAttribute);
							n.isInstancedMesh !== !0 && a._maxInstanceCount === void 0 && (a._maxInstanceCount = s.meshPerAttribute * s.count);
						} else for (let e = 0; e < i.locationSize; e++) g(i.location + e);
						e.bindBuffer(e.ARRAY_BUFFER, l);
						for (let e = 0; e < i.locationSize; e++) y(i.location + e, o / i.locationSize, u, r, o * d, o / i.locationSize * e * d, f);
					}
				} else if (c !== void 0) {
					let t = c[r];
					if (t !== void 0) switch (t.length) {
						case 2:
							e.vertexAttrib2fv(i.location, t);
							break;
						case 3:
							e.vertexAttrib3fv(i.location, t);
							break;
						case 4:
							e.vertexAttrib4fv(i.location, t);
							break;
						default: e.vertexAttrib1fv(i.location, t);
					}
				}
			}
		}
		v();
	}
	function x() {
		T();
		for (let e in r) {
			let t = r[e];
			for (let e in t) {
				let n = t[e];
				for (let e in n) {
					let t = n[e];
					for (let e in t) u(t[e].object), delete t[e];
					delete n[e];
				}
			}
			delete r[e];
		}
	}
	function S(e) {
		if (r[e.id] === void 0) return;
		let t = r[e.id];
		for (let e in t) {
			let n = t[e];
			for (let e in n) {
				let t = n[e];
				for (let e in t) u(t[e].object), delete t[e];
				delete n[e];
			}
		}
		delete r[e.id];
	}
	function C(e) {
		for (let t in r) {
			let n = r[t];
			for (let t in n) {
				let r = n[t];
				if (r[e.id] === void 0) continue;
				let i = r[e.id];
				for (let e in i) u(i[e].object), delete i[e];
				delete r[e.id];
			}
		}
	}
	function w(e) {
		for (let t in r) {
			let n = r[t], i = e.isInstancedMesh === !0 ? e.id : 0, a = n[i];
			if (a !== void 0) {
				for (let e in a) {
					let t = a[e];
					for (let e in t) u(t[e].object), delete t[e];
					delete a[e];
				}
				delete n[i], Object.keys(n).length === 0 && delete r[t];
			}
		}
	}
	function T() {
		E(), o = !0, a !== i && (a = i, l(a.object));
	}
	function E() {
		i.geometry = null, i.program = null, i.wireframe = !1;
	}
	return {
		setup: s,
		reset: T,
		resetDefaultState: E,
		dispose: x,
		releaseStatesOfGeometry: S,
		releaseStatesOfObject: w,
		releaseStatesOfProgram: C,
		initAttributes: h,
		enableAttribute: g,
		disableUnusedAttributes: v
	};
}
function Fm(e, t, n) {
	let r;
	function i(e) {
		r = e;
	}
	function a(t, i) {
		e.drawArrays(r, t, i), n.update(i, r, 1);
	}
	function o(t, i, a) {
		a !== 0 && (e.drawArraysInstanced(r, t, i, a), n.update(i, r, a));
	}
	function s(e, i, a) {
		if (a === 0) return;
		t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(r, e, 0, i, 0, a);
		let o = 0;
		for (let e = 0; e < a; e++) o += i[e];
		n.update(o, r, 1);
	}
	this.setMode = i, this.render = a, this.renderInstances = o, this.renderMultiDraw = s;
}
function Im(e, t, n, r) {
	let i;
	function a() {
		if (i !== void 0) return i;
		if (t.has("EXT_texture_filter_anisotropic") === !0) {
			let n = t.get("EXT_texture_filter_anisotropic");
			i = e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
		} else i = 0;
		return i;
	}
	function o(t) {
		return t === 1023 || r.convert(t) === e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT);
	}
	function s(n) {
		let i = n === 1016 && (t.has("EXT_color_buffer_half_float") || t.has("EXT_color_buffer_float"));
		return !(n !== 1009 && n !== 1015 && !i && r.convert(n) !== e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE));
	}
	function c(t) {
		if (t === "highp") {
			if (e.getShaderPrecisionFormat(e.VERTEX_SHADER, e.HIGH_FLOAT).precision > 0 && e.getShaderPrecisionFormat(e.FRAGMENT_SHADER, e.HIGH_FLOAT).precision > 0) return "highp";
			t = "mediump";
		}
		return t === "mediump" && e.getShaderPrecisionFormat(e.VERTEX_SHADER, e.MEDIUM_FLOAT).precision > 0 && e.getShaderPrecisionFormat(e.FRAGMENT_SHADER, e.MEDIUM_FLOAT).precision > 0 ? "mediump" : "lowp";
	}
	let l = n.precision === void 0 ? "highp" : n.precision, u = c(l);
	u !== l && (U("WebGLRenderer:", l, "not supported, using", u, "instead."), l = u);
	let d = n.logarithmicDepthBuffer === !0, f = n.reversedDepthBuffer === !0 && t.has("EXT_clip_control");
	n.reversedDepthBuffer === !0 && f === !1 && U("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");
	let p = e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS), m = e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS), h = e.getParameter(e.MAX_TEXTURE_SIZE), g = e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE), _ = e.getParameter(e.MAX_VERTEX_ATTRIBS), v = e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS), y = e.getParameter(e.MAX_VARYING_VECTORS), b = e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS), x = e.getParameter(e.MAX_SAMPLES), S = e.getParameter(e.SAMPLES);
	return {
		isWebGL2: !0,
		getMaxAnisotropy: a,
		getMaxPrecision: c,
		textureFormatReadable: o,
		textureTypeReadable: s,
		precision: l,
		logarithmicDepthBuffer: d,
		reversedDepthBuffer: f,
		maxTextures: p,
		maxVertexTextures: m,
		maxTextureSize: h,
		maxCubemapSize: g,
		maxAttributes: _,
		maxVertexUniforms: v,
		maxVaryings: y,
		maxFragmentUniforms: b,
		maxSamples: x,
		samples: S
	};
}
function Lm(e) {
	let t = this, n = null, r = 0, i = !1, a = !1, o = new hf(), s = new J(), c = {
		value: null,
		needsUpdate: !1
	};
	this.uniform = c, this.numPlanes = 0, this.numIntersection = 0, this.init = function(e, t) {
		let n = e.length !== 0 || t || r !== 0 || i;
		return i = t, r = e.length, n;
	}, this.beginShadows = function() {
		a = !0, u(null);
	}, this.endShadows = function() {
		a = !1;
	}, this.setGlobalState = function(e, t) {
		n = u(e, t, 0);
	}, this.setState = function(t, o, s) {
		let d = t.clippingPlanes, f = t.clipIntersection, p = t.clipShadows, m = e.get(t);
		if (!i || d === null || d.length === 0 || a && !p) a ? u(null) : l();
		else {
			let e = a ? 0 : r, t = e * 4, i = m.clippingState || null;
			c.value = i, i = u(d, o, t, s);
			for (let e = 0; e !== t; ++e) i[e] = n[e];
			m.clippingState = i, this.numIntersection = f ? this.numPlanes : 0, this.numPlanes += e;
		}
	};
	function l() {
		c.value !== n && (c.value = n, c.needsUpdate = r > 0), t.numPlanes = r, t.numIntersection = 0;
	}
	function u(e, n, r, i) {
		let a = e === null ? 0 : e.length, l = null;
		if (a !== 0) {
			if (l = c.value, i !== !0 || l === null) {
				let t = r + a * 4, i = n.matrixWorldInverse;
				s.getNormalMatrix(i), (l === null || l.length < t) && (l = new Float32Array(t));
				for (let t = 0, n = r; t !== a; ++t, n += 4) o.copy(e[t]).applyMatrix4(i, s), o.normal.toArray(l, n), l[n + 3] = o.constant;
			}
			c.value = l, c.needsUpdate = !0;
		}
		return t.numPlanes = a, t.numIntersection = 0, l;
	}
}
var Rm = 4, zm = 6, Bm = 20, Vm = 256, Hm = /*@__PURE__*/ new am(), Um = /*@__PURE__*/ new X(), Wm = null, Gm = 0, Km = 0, qm = !1, Jm = /*@__PURE__*/ new q(), Ym = /*@__PURE__*/ new q(), Xm = class {
	constructor(e) {
		this._renderer = e, this._pingPongRenderTarget = null, this._lodMax = 0, this._cubeSize = 0, this._sizeLods = [], this._lodMeshes = [], this._backgroundBox = null, this._cubemapMaterial = null, this._equirectMaterial = null, this._blurMaterial = null, this._ggxMaterial = null;
	}
	fromScene(e, t = 0, n = .1, r = 100, i = {}) {
		let { size: a = 256, position: o = Jm } = i;
		Wm = this._renderer.getRenderTarget(), Gm = this._renderer.getActiveCubeFace(), Km = this._renderer.getActiveMipmapLevel(), qm = this._renderer.xr.enabled, this._renderer.xr.enabled = !1, this._setSize(a);
		let s = this._allocateTargets();
		return s.depthBuffer = !0, this._sceneToCubeUV(e, n, r, s, o), t > 0 && this._blur(s, 0, 0, t), this._applyPMREM(s), this._cleanup(s), s;
	}
	fromEquirectangular(e, t = null) {
		return this._fromTexture(e, t);
	}
	fromCubemap(e, t = null) {
		return this._fromTexture(e, t);
	}
	compileCubemapShader() {
		this._cubemapMaterial === null && (this._cubemapMaterial = rh(), this._compileMaterial(this._cubemapMaterial));
	}
	compileEquirectangularShader() {
		this._equirectMaterial === null && (this._equirectMaterial = nh(), this._compileMaterial(this._equirectMaterial));
	}
	dispose() {
		this._dispose(), this._cubemapMaterial !== null && this._cubemapMaterial.dispose(), this._equirectMaterial !== null && this._equirectMaterial.dispose(), this._backgroundBox !== null && (this._backgroundBox.geometry.dispose(), this._backgroundBox.material.dispose());
	}
	_setSize(e) {
		this._lodMax = Math.floor(Math.log2(e)), this._cubeSize = 2 ** this._lodMax;
	}
	_dispose() {
		this._blurMaterial !== null && this._blurMaterial.dispose(), this._ggxMaterial !== null && this._ggxMaterial.dispose(), this._pingPongRenderTarget !== null && this._pingPongRenderTarget.dispose();
		for (let e = 0; e < this._lodMeshes.length; e++) this._lodMeshes[e].geometry.dispose();
	}
	_cleanup(e) {
		this._renderer.setRenderTarget(Wm, Gm, Km), this._renderer.xr.enabled = qm, e.scissorTest = !1, $m(e, 0, 0, e.width, e.height);
	}
	_fromTexture(e, t) {
		e.mapping === 301 || e.mapping === 302 ? this._setSize(e.image.length === 0 ? 16 : e.image[0].width || e.image[0].image.width) : this._setSize(e.image.width / 4), Wm = this._renderer.getRenderTarget(), Gm = this._renderer.getActiveCubeFace(), Km = this._renderer.getActiveMipmapLevel(), qm = this._renderer.xr.enabled, this._renderer.xr.enabled = !1;
		let n = t || this._allocateTargets();
		return this._textureToCubeUV(e, n), this._applyPMREM(n), this._cleanup(n), n;
	}
	_allocateTargets() {
		let e = 3 * Math.max(this._cubeSize, 112), t = 4 * this._cubeSize, n = {
			magFilter: ic,
			minFilter: ic,
			generateMipmaps: !1,
			type: mc,
			format: Sc,
			colorSpace: xl,
			depthBuffer: !1
		}, r = Qm(e, t, n);
		if (this._pingPongRenderTarget === null || this._pingPongRenderTarget.width !== e || this._pingPongRenderTarget.height !== t) {
			this._pingPongRenderTarget !== null && this._dispose(), this._pingPongRenderTarget = Qm(e, t, n);
			let { _lodMax: r } = this;
			({lodMeshes: this._lodMeshes, sizeLods: this._sizeLods} = Zm(r)), this._blurMaterial = th(r, e, t), this._ggxMaterial = eh(r, e, t);
		}
		return r;
	}
	_compileMaterial(e) {
		let t = new Ff(new df(), e);
		this._renderer.compile(t, Hm);
	}
	_sceneToCubeUV(e, t, n, r, i) {
		let a = new im(90, 1, t, n), o = [
			1,
			-1,
			1,
			1,
			1,
			1
		], s = [
			1,
			1,
			1,
			-1,
			-1,
			-1
		], c = this._renderer, l = c.autoClear, u = c.toneMapping;
		c.getClearColor(Um), c.toneMapping = 0, c.autoClear = !1, c.state.buffers.depth.getReversed() && (c.setRenderTarget(r), c.clearDepth(), c.setRenderTarget(null)), this._backgroundBox === null && (this._backgroundBox = new Ff(new pp(), new Cf({
			name: "PMREM.Background",
			side: 1,
			depthWrite: !1,
			depthTest: !1
		})));
		let d = this._backgroundBox, f = d.material, p = !1, m = e.background;
		m ? m.isColor && (f.color.copy(m), e.background = null, p = !0) : (f.color.copy(Um), p = !0);
		for (let t = 0; t < 6; t++) {
			let n = t % 3;
			n === 0 ? (a.up.set(0, o[t], 0), a.position.set(i.x, i.y, i.z), a.lookAt(i.x + s[t], i.y, i.z)) : n === 1 ? (a.up.set(0, 0, o[t]), a.position.set(i.x, i.y, i.z), a.lookAt(i.x, i.y + s[t], i.z)) : (a.up.set(0, o[t], 0), a.position.set(i.x, i.y, i.z), a.lookAt(i.x, i.y, i.z + s[t]));
			let l = this._cubeSize;
			$m(r, n * l, t > 2 ? l : 0, l, l), c.setRenderTarget(r), p && c.render(d, a), c.render(e, a);
		}
		c.toneMapping = u, c.autoClear = l, e.background = m;
	}
	_textureToCubeUV(e, t) {
		let n = this._renderer, r = e.mapping === 301 || e.mapping === 302;
		r ? (this._cubemapMaterial === null && (this._cubemapMaterial = rh()), this._cubemapMaterial.uniforms.flipEnvMap.value = e.isRenderTargetTexture === !1 ? -1 : 1) : this._equirectMaterial === null && (this._equirectMaterial = nh());
		let i = r ? this._cubemapMaterial : this._equirectMaterial, a = this._lodMeshes[0];
		a.material = i;
		let o = i.uniforms;
		o.envMap.value = e;
		let s = this._cubeSize;
		$m(t, 0, 0, 3 * s, 2 * s), n.setRenderTarget(t), n.render(a, Hm);
	}
	_applyPMREM(e) {
		let t = this._renderer, n = t.autoClear;
		t.autoClear = !1;
		let r = this._lodMeshes.length;
		for (let t = 1; t < r; t++) this._applyGGXFilter(e, t - 1, t);
		t.autoClear = n;
	}
	_applyGGXFilter(e, t, n) {
		let r = this._renderer, i = this._pingPongRenderTarget, a = this._ggxMaterial, o = this._lodMeshes[n];
		o.material = a;
		let s = a.uniforms, c = n / (this._lodMeshes.length - 1), l = t / (this._lodMeshes.length - 1), u = Math.sqrt(c * c - l * l) * (c * 1.25), { _lodMax: d } = this, f = this._sizeLods[n], p = 3 * f * (n > d - Rm ? n - d + Rm : 0), m = 4 * (this._cubeSize - f);
		s.envMap.value = e.texture, s.roughness.value = u, s.mipInt.value = d - t, $m(i, p, m, 3 * f, 2 * f), r.setRenderTarget(i), r.render(o, Hm), s.envMap.value = i.texture, s.roughness.value = 0, s.mipInt.value = d - n, $m(e, p, m, 3 * f, 2 * f), r.setRenderTarget(e), r.render(o, Hm);
	}
	_blur(e, t, n, r) {
		let i = this._pingPongRenderTarget, a = Math.min(r, Math.PI) / Math.SQRT2;
		this._blurPass(e, i, t, n, a), this._blurPass(i, e, n, n, a);
	}
	_blurPass(e, t, n, r, i) {
		let a = this._renderer, o = this._blurMaterial, s = this._lodMeshes[r];
		s.material = o;
		let c = o.uniforms;
		c.envMap.value = e.texture, c.sigma.value = i, c.mipInt.value = this._lodMax - n;
		let l = this._sizeLods[r];
		$m(t, 3 * l * (r > this._lodMax - Rm ? r - this._lodMax + Rm : 0), 4 * (this._cubeSize - l), 3 * l, 2 * l), a.setRenderTarget(t), a.render(s, Hm);
	}
};
function Zm(e) {
	let t = [], n = [], r = e, i = e - Rm + 1 + zm;
	for (let e = 0; e < i; e++) {
		let e = 2 ** r;
		t.push(e);
		let i = 1 / (e - 2), a = -i, o = 1 + i, s = [
			a,
			a,
			o,
			a,
			o,
			o,
			a,
			a,
			o,
			o,
			a,
			o
		], c = /* @__PURE__ */ new Float32Array(108), l = /* @__PURE__ */ new Float32Array(108);
		for (let e = 0; e < 6; e++) {
			let t = e % 3 * 2 / 3 - 1, n = e > 2 ? 0 : -1, r = [
				t,
				n,
				0,
				t + 2 / 3,
				n,
				0,
				t + 2 / 3,
				n + 1,
				0,
				t,
				n,
				0,
				t + 2 / 3,
				n + 1,
				0,
				t,
				n + 1,
				0
			];
			c.set(r, 18 * e);
			for (let t = 0; t < 6; t++) {
				let n = s[t * 2] * 2 - 1, r = s[t * 2 + 1] * 2 - 1;
				e === 0 ? Ym.set(1, r, n) : e === 1 ? Ym.set(-n, 1, -r) : e === 2 ? Ym.set(-n, r, 1) : e === 3 ? Ym.set(-1, r, -n) : e === 4 ? Ym.set(-n, -1, r) : Ym.set(n, r, -1), Ym.toArray(l, (e * 6 + t) * 3);
			}
		}
		let u = new df();
		u.setAttribute("position", new Yd(c, 3)), u.setAttribute("outputDirection", new Yd(l, 3)), n.push(new Ff(u, null)), r > Rm && r--;
	}
	return {
		lodMeshes: n,
		sizeLods: t
	};
}
function Qm(e, t, n) {
	let r = new ju(e, t, n);
	return r.texture.mapping = 306, r.texture.name = "PMREM.cubeUv", r.scissorTest = !0, r;
}
function $m(e, t, n, r, i) {
	e.viewport.set(t, n, r, i), e.scissor.set(t, n, r, i);
}
function eh(e, t, n) {
	return new Op({
		name: "PMREMGGXConvolution",
		defines: {
			GGX_SAMPLES: Vm,
			CUBEUV_TEXEL_WIDTH: 1 / t,
			CUBEUV_TEXEL_HEIGHT: 1 / n,
			CUBEUV_MAX_MIP: `${e}.0`
		},
		uniforms: {
			envMap: { value: null },
			roughness: { value: 0 },
			mipInt: { value: 0 }
		},
		vertexShader: ih(),
		fragmentShader: "\n\n			precision highp float;\n			precision highp int;\n\n			varying vec3 vOutputDirection;\n\n			uniform sampler2D envMap;\n			uniform float roughness;\n			uniform float mipInt;\n\n			#define ENVMAP_TYPE_CUBE_UV\n			#include <cube_uv_reflection_fragment>\n\n			#define PI 3.14159265359\n\n			// Van der Corput radical inverse\n			float radicalInverse_VdC(uint bits) {\n				bits = (bits << 16u) | (bits >> 16u);\n				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);\n				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);\n				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);\n				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);\n				return float(bits) * 2.3283064365386963e-10; // / 0x100000000\n			}\n\n			// Hammersley sequence\n			vec2 hammersley(uint i, uint N) {\n				return vec2(float(i) / float(N), radicalInverse_VdC(i));\n			}\n\n			// GGX VNDF importance sampling (Eric Heitz 2018)\n			// \"Sampling the GGX Distribution of Visible Normals\"\n			// https://jcgt.org/published/0007/04/01/\n			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {\n				float alpha = roughness * roughness;\n\n				// Section 4.1: Orthonormal basis\n				vec3 T1 = vec3(1.0, 0.0, 0.0);\n				vec3 T2 = cross(V, T1);\n\n				// Section 4.2: Parameterization of projected area\n				float r = sqrt(Xi.x);\n				float phi = 2.0 * PI * Xi.y;\n				float t1 = r * cos(phi);\n				float t2 = r * sin(phi);\n				float s = 0.5 * (1.0 + V.z);\n				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;\n\n				// Section 4.3: Reprojection onto hemisphere\n				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;\n\n				// Section 3.4: Transform back to ellipsoid configuration\n				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));\n			}\n\n			void main() {\n				vec3 N = normalize(vOutputDirection);\n				vec3 V = N; // Assume view direction equals normal for pre-filtering\n\n				vec3 prefilteredColor = vec3(0.0);\n				float totalWeight = 0.0;\n\n				// For very low roughness, just sample the environment directly\n				if (roughness < 0.001) {\n					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);\n					return;\n				}\n\n				// Tangent space basis for VNDF sampling\n				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);\n				vec3 tangent = normalize(cross(up, N));\n				vec3 bitangent = cross(N, tangent);\n\n				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {\n					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));\n\n					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)\n					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);\n\n					// Transform H back to world space\n					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);\n					vec3 L = normalize(2.0 * dot(V, H) * H - V);\n\n					float NdotL = max(dot(N, L), 0.0);\n\n					if(NdotL > 0.0) {\n						// Sample environment at fixed mip level\n						// VNDF importance sampling handles the distribution filtering\n						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);\n\n						// Weight by NdotL for the split-sum approximation\n						// VNDF PDF naturally accounts for the visible microfacet distribution\n						prefilteredColor += sampleColor * NdotL;\n						totalWeight += NdotL;\n					}\n				}\n\n				if (totalWeight > 0.0) {\n					prefilteredColor = prefilteredColor / totalWeight;\n				}\n\n				gl_FragColor = vec4(prefilteredColor, 1.0);\n			}\n		",
		blending: 0,
		depthTest: !1,
		depthWrite: !1
	});
}
function th(e, t, n) {
	return new Op({
		name: "SphericalGaussianBlur",
		defines: {
			SAMPLES: Bm,
			CUBEUV_TEXEL_WIDTH: 1 / t,
			CUBEUV_TEXEL_HEIGHT: 1 / n,
			CUBEUV_MAX_MIP: `${e}.0`
		},
		uniforms: {
			envMap: { value: null },
			sigma: { value: 0 },
			mipInt: { value: 0 }
		},
		vertexShader: ih(),
		fragmentShader: "\n\n			precision highp float;\n			precision highp int;\n\n			varying vec3 vOutputDirection;\n\n			uniform sampler2D envMap;\n			uniform float sigma;\n			uniform float mipInt;\n\n			#define ENVMAP_TYPE_CUBE_UV\n			#include <cube_uv_reflection_fragment>\n\n			#define PI 3.14159265359\n			#define GOLDEN_ANGLE 2.39996322973\n\n			void main() {\n\n				if ( sigma == 0.0 ) {\n\n					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );\n					return;\n\n				}\n\n				vec3 outputDirection = normalize( vOutputDirection );\n\n				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );\n				vec3 tangent = normalize( cross( up, outputDirection ) );\n				vec3 bitangent = cross( outputDirection, tangent );\n\n				// Truncate the kernel at three standard deviations or at the antipode.\n				float thetaMax = min( 3.0 * sigma, PI );\n				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );\n\n				vec3 accumColor = vec3( 0.0 );\n				float accumWeight = 0.0;\n\n				for ( int i = 0; i < SAMPLES; i ++ ) {\n\n					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.\n					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );\n					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );\n					float phi = float( i ) * GOLDEN_ANGLE;\n\n					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;\n					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;\n\n					// Correct the planar sample density to solid angle.\n					float weight = sin( theta ) / theta;\n\n					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );\n					accumWeight += weight;\n\n				}\n\n				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );\n\n			}\n		",
		blending: 0,
		depthTest: !1,
		depthWrite: !1
	});
}
function nh() {
	return new Op({
		name: "EquirectangularToCubeUV",
		uniforms: { envMap: { value: null } },
		vertexShader: ih(),
		fragmentShader: "\n\n			precision mediump float;\n			precision mediump int;\n\n			varying vec3 vOutputDirection;\n\n			uniform sampler2D envMap;\n\n			#include <common>\n\n			void main() {\n\n				vec3 outputDirection = normalize( vOutputDirection );\n				vec2 uv = equirectUv( outputDirection );\n\n				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );\n\n			}\n		",
		blending: 0,
		depthTest: !1,
		depthWrite: !1
	});
}
function rh() {
	return new Op({
		name: "CubemapToCubeUV",
		uniforms: {
			envMap: { value: null },
			flipEnvMap: { value: -1 }
		},
		vertexShader: ih(),
		fragmentShader: "\n\n			precision mediump float;\n			precision mediump int;\n\n			uniform float flipEnvMap;\n\n			varying vec3 vOutputDirection;\n\n			uniform samplerCube envMap;\n\n			void main() {\n\n				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );\n\n			}\n		",
		blending: 0,
		depthTest: !1,
		depthWrite: !1
	});
}
function ih() {
	return "\n\n		precision mediump float;\n		precision mediump int;\n\n		attribute vec3 outputDirection;\n\n		varying vec3 vOutputDirection;\n\n		void main() {\n\n			vOutputDirection = outputDirection;\n			gl_Position = vec4( position, 1.0 );\n\n		}\n	";
}
var ah = class extends ju {
	constructor(e = 1, t = {}) {
		super(e, e, t), this.isWebGLCubeRenderTarget = !0;
		let n = {
			width: e,
			height: e,
			depth: 1
		}, r = [
			n,
			n,
			n,
			n,
			n,
			n
		];
		this.texture = new lp(r), this._setTextureOptions(t), this.texture.isRenderTargetTexture = !0;
	}
	fromEquirectangularTexture(e, t) {
		this.texture.type = t.type, this.texture.colorSpace = t.colorSpace, this.texture.generateMipmaps = t.generateMipmaps, this.texture.minFilter = t.minFilter, this.texture.magFilter = t.magFilter;
		let n = {
			uniforms: { tEquirect: { value: null } },
			vertexShader: "\n\n				varying vec3 vWorldDirection;\n\n				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {\n\n					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );\n\n				}\n\n				void main() {\n\n					vWorldDirection = transformDirection( position, modelMatrix );\n\n					#include <begin_vertex>\n					#include <project_vertex>\n\n				}\n			",
			fragmentShader: "\n\n				uniform sampler2D tEquirect;\n\n				varying vec3 vWorldDirection;\n\n				#include <common>\n\n				void main() {\n\n					vec3 direction = normalize( vWorldDirection );\n\n					vec2 sampleUV = equirectUv( direction );\n\n					gl_FragColor = texture2D( tEquirect, sampleUV );\n\n				}\n			"
		}, r = new pp(5, 5, 5), i = new Op({
			name: "CubemapFromEquirect",
			uniforms: bp(n.uniforms),
			vertexShader: n.vertexShader,
			fragmentShader: n.fragmentShader,
			side: 1,
			blending: 0
		});
		i.uniforms.tEquirect.value = t;
		let a = new Ff(r, i), o = t.minFilter;
		return t.minFilter === 1008 && (t.minFilter = ic), new cm(1, 10, this).update(e, a), t.minFilter = o, a.geometry.dispose(), a.material.dispose(), this;
	}
	clear(e, t = !0, n = !0, r = !0) {
		let i = e.getRenderTarget();
		for (let i = 0; i < 6; i++) e.setRenderTarget(this, i), e.clear(t, n, r);
		e.setRenderTarget(i);
	}
};
function oh(e) {
	let t = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap(), r = null;
	function i(e, t = !1) {
		return e == null ? null : t ? o(e) : a(e);
	}
	function a(n) {
		if (n && n.isTexture) {
			let r = n.mapping;
			if (r === 303 || r === 304) {
				if (t.has(n)) {
					let e = t.get(n).texture;
					return s(e, n.mapping);
				}
				{
					let r = n.image;
					if (r && r.height > 0) {
						let i = new ah(r.height);
						return i.fromEquirectangularTexture(e, n), t.set(n, i), n.addEventListener("dispose", l), s(i.texture, n.mapping);
					}
					return null;
				}
			}
		}
		return n;
	}
	function o(t) {
		if (t && t.isTexture) {
			let i = t.mapping, a = i === 303 || i === 304, o = i === 301 || i === 302;
			if (a || o) {
				let i = n.get(t), s = i === void 0 ? 0 : i.texture.pmremVersion;
				if (t.isRenderTargetTexture && t.pmremVersion !== s) return r === null && (r = new Xm(e)), i = a ? r.fromEquirectangular(t, i) : r.fromCubemap(t, i), i.texture.pmremVersion = t.pmremVersion, n.set(t, i), i.texture;
				if (i !== void 0) return i.texture;
				{
					let s = t.image;
					return a && s && s.height > 0 || o && s && c(s) ? (r === null && (r = new Xm(e)), i = a ? r.fromEquirectangular(t) : r.fromCubemap(t), i.texture.pmremVersion = t.pmremVersion, n.set(t, i), t.addEventListener("dispose", u), i.texture) : null;
				}
			}
		}
		return t;
	}
	function s(e, t) {
		return t === 303 ? e.mapping = 301 : t === 304 && (e.mapping = 302), e;
	}
	function c(e) {
		let t = 0;
		for (let n = 0; n < 6; n++) e[n] !== void 0 && t++;
		return t === 6;
	}
	function l(e) {
		let n = e.target;
		n.removeEventListener("dispose", l);
		let r = t.get(n);
		r !== void 0 && (t.delete(n), r.dispose());
	}
	function u(e) {
		let t = e.target;
		t.removeEventListener("dispose", u);
		let r = n.get(t);
		r !== void 0 && (n.delete(t), r.dispose());
	}
	function d() {
		t = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap(), r !== null && (r.dispose(), r = null);
	}
	return {
		get: i,
		dispose: d
	};
}
function sh(e) {
	let t = {};
	function n(n) {
		if (t[n] !== void 0) return t[n];
		let r = e.getExtension(n);
		return t[n] = r, r;
	}
	return {
		has: function(e) {
			return n(e) !== null;
		},
		init: function() {
			n("EXT_color_buffer_float"), n("WEBGL_clip_cull_distance"), n("OES_texture_float_linear"), n("EXT_color_buffer_half_float"), n("WEBGL_multisampled_render_to_texture"), n("WEBGL_render_shared_exponent");
		},
		get: function(e) {
			let t = n(e);
			return t === null && Il("WebGLRenderer: " + e + " extension not supported."), t;
		}
	};
}
function ch(e, t, n, r) {
	let i = {}, a = /* @__PURE__ */ new WeakMap();
	function o(e) {
		let s = e.target;
		s.index !== null && t.remove(s.index);
		for (let e in s.attributes) t.remove(s.attributes[e]);
		s.removeEventListener("dispose", o), delete i[s.id];
		let c = a.get(s);
		c && (t.remove(c), a.delete(s)), r.releaseStatesOfGeometry(s), s.isInstancedBufferGeometry === !0 && delete s._maxInstanceCount, n.memory.geometries--;
	}
	function s(e, t) {
		return i[t.id] === !0 || (t.addEventListener("dispose", o), i[t.id] = !0, n.memory.geometries++), t;
	}
	function c(n) {
		let r = n.attributes;
		for (let n in r) t.update(r[n], e.ARRAY_BUFFER);
	}
	function l(e) {
		let n = [], r = e.index, i = e.attributes.position, o = 0;
		if (i === void 0) return;
		if (r !== null) {
			let e = r.array;
			o = r.version;
			for (let t = 0, r = e.length; t < r; t += 3) {
				let r = e[t + 0], i = e[t + 1], a = e[t + 2];
				n.push(r, i, i, a, a, r);
			}
		} else {
			let e = i.array;
			o = i.version;
			for (let t = 0, r = e.length / 3 - 1; t < r; t += 3) {
				let e = t + 0, r = t + 1, i = t + 2;
				n.push(e, r, r, i, i, e);
			}
		}
		let s = new (i.count >= 65535 ? Zd : Xd)(n, 1);
		s.version = o;
		let c = a.get(e);
		c && t.remove(c), a.set(e, s);
	}
	function u(e) {
		let t = a.get(e);
		if (t) {
			let n = e.index;
			n !== null && t.version < n.version && l(e);
		} else l(e);
		return a.get(e);
	}
	return {
		get: s,
		update: c,
		getWireframeAttribute: u
	};
}
function lh(e, t, n) {
	let r;
	function i(e) {
		r = e;
	}
	let a, o;
	function s(e) {
		a = e.type, o = e.bytesPerElement;
	}
	function c(t, i) {
		e.drawElements(r, i, a, t * o), n.update(i, r, 1);
	}
	function l(t, i, s) {
		s !== 0 && (e.drawElementsInstanced(r, i, a, t * o, s), n.update(i, r, s));
	}
	function u(e, i, o) {
		if (o === 0) return;
		t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(r, i, 0, a, e, 0, o);
		let s = 0;
		for (let e = 0; e < o; e++) s += i[e];
		n.update(s, r, 1);
	}
	this.setMode = i, this.setIndex = s, this.render = c, this.renderInstances = l, this.renderMultiDraw = u;
}
function uh(e) {
	let t = {
		geometries: 0,
		textures: 0
	}, n = {
		frame: 0,
		calls: 0,
		triangles: 0,
		points: 0,
		lines: 0
	};
	function r(t, r, i) {
		switch (n.calls++, r) {
			case e.TRIANGLES:
				n.triangles += t / 3 * i;
				break;
			case e.LINES:
				n.lines += t / 2 * i;
				break;
			case e.LINE_STRIP:
				n.lines += i * (t - 1);
				break;
			case e.LINE_LOOP:
				n.lines += i * t;
				break;
			case e.POINTS:
				n.points += i * t;
				break;
			default: W("WebGLInfo: Unknown draw mode:", r);
		}
	}
	function i() {
		n.calls = 0, n.triangles = 0, n.points = 0, n.lines = 0;
	}
	return {
		memory: t,
		render: n,
		programs: null,
		autoReset: !0,
		reset: i,
		update: r
	};
}
function dh(e, t, n) {
	let r = /* @__PURE__ */ new WeakMap(), i = new ku();
	function a(a, o, s) {
		let c = a.morphTargetInfluences, l = o.morphAttributes.position || o.morphAttributes.normal || o.morphAttributes.color, u = l === void 0 ? 0 : l.length, d = r.get(o);
		if (d === void 0 || d.count !== u) {
			d !== void 0 && d.texture.dispose();
			let e = o.morphAttributes.position !== void 0, n = o.morphAttributes.normal !== void 0, a = o.morphAttributes.color !== void 0, s = o.morphAttributes.position || [], c = o.morphAttributes.normal || [], l = o.morphAttributes.color || [], f = 0;
			e === !0 && (f = 1), n === !0 && (f = 2), a === !0 && (f = 3);
			let p = o.attributes.position.count * f, m = 1;
			p > t.maxTextureSize && (m = Math.ceil(p / t.maxTextureSize), p = t.maxTextureSize);
			let h = new Float32Array(p * m * 4 * u), g = new Mu(h, p, m, u);
			g.type = pc, g.needsUpdate = !0;
			let _ = f * 4;
			for (let t = 0; t < u; t++) {
				let r = s[t], o = c[t], u = l[t], d = p * m * 4 * t;
				for (let t = 0; t < r.count; t++) {
					let s = t * _;
					e === !0 && (i.fromBufferAttribute(r, t), h[d + s + 0] = i.x, h[d + s + 1] = i.y, h[d + s + 2] = i.z, h[d + s + 3] = 0), n === !0 && (i.fromBufferAttribute(o, t), h[d + s + 4] = i.x, h[d + s + 5] = i.y, h[d + s + 6] = i.z, h[d + s + 7] = 0), a === !0 && (i.fromBufferAttribute(u, t), h[d + s + 8] = i.x, h[d + s + 9] = i.y, h[d + s + 10] = i.z, h[d + s + 11] = u.itemSize === 4 ? i.w : 1);
				}
			}
			d = {
				count: u,
				texture: g,
				size: new K(p, m)
			}, r.set(o, d);
			function v() {
				g.dispose(), r.delete(o), o.removeEventListener("dispose", v);
			}
			o.addEventListener("dispose", v);
		}
		if (a.isInstancedMesh === !0 && a.morphTexture !== null) s.getUniforms().setValue(e, "morphTexture", a.morphTexture, n);
		else {
			let t = 0;
			for (let e = 0; e < c.length; e++) t += c[e];
			let n = o.morphTargetsRelative ? 1 : 1 - t;
			s.getUniforms().setValue(e, "morphTargetBaseInfluence", n), s.getUniforms().setValue(e, "morphTargetInfluences", c);
		}
		s.getUniforms().setValue(e, "morphTargetsTexture", d.texture, n), s.getUniforms().setValue(e, "morphTargetsTextureSize", d.size);
	}
	return { update: a };
}
function fh(e, t, n, r, i) {
	let a = /* @__PURE__ */ new WeakMap();
	function o(r) {
		let o = i.render.frame, s = r.geometry, l = t.get(r, s);
		if (a.get(l) !== o && (t.update(l), a.set(l, o)), r.isInstancedMesh && (r.hasEventListener("dispose", c) === !1 && r.addEventListener("dispose", c), a.get(r) !== o && (n.update(r.instanceMatrix, e.ARRAY_BUFFER), r.instanceColor !== null && n.update(r.instanceColor, e.ARRAY_BUFFER), a.set(r, o))), r.isSkinnedMesh) {
			let e = r.skeleton;
			a.get(e) !== o && (e.update(), a.set(e, o));
		}
		return l;
	}
	function s() {
		a = /* @__PURE__ */ new WeakMap();
	}
	function c(e) {
		let t = e.target;
		t.removeEventListener("dispose", c), r.releaseStatesOfObject(t), n.remove(t.instanceMatrix), t.instanceColor !== null && n.remove(t.instanceColor);
	}
	return {
		update: o,
		dispose: s
	};
}
var ph = {
	1: "LINEAR_TONE_MAPPING",
	2: "REINHARD_TONE_MAPPING",
	3: "CINEON_TONE_MAPPING",
	4: "ACES_FILMIC_TONE_MAPPING",
	6: "AGX_TONE_MAPPING",
	7: "NEUTRAL_TONE_MAPPING",
	5: "CUSTOM_TONE_MAPPING"
};
function mh(e, t, n, r, i, a) {
	let o = new ju(t, n, {
		type: e,
		depthBuffer: i,
		stencilBuffer: a,
		samples: r ? 4 : 0,
		storeMultisampledDepthBuffer: !1,
		storeMultisampledStencilBuffer: !1,
		resolveDepthBuffer: !1,
		resolveStencilBuffer: !1
	}), s = null, c = null, l = new df();
	l.setAttribute("position", new Qd([
		-1,
		3,
		0,
		-1,
		-1,
		0,
		3,
		-1,
		0
	], 3)), l.setAttribute("uv", new Qd([
		0,
		2,
		0,
		0,
		2,
		0
	], 2));
	let u = new kp({
		uniforms: { tDiffuse: { value: null } },
		vertexShader: "\n			precision highp float;\n\n			uniform mat4 modelViewMatrix;\n			uniform mat4 projectionMatrix;\n\n			attribute vec3 position;\n			attribute vec2 uv;\n\n			varying vec2 vUv;\n\n			void main() {\n				vUv = uv;\n				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n			}",
		fragmentShader: "\n			precision highp float;\n\n			uniform sampler2D tDiffuse;\n\n			varying vec2 vUv;\n\n			#include <tonemapping_pars_fragment>\n			#include <colorspace_pars_fragment>\n\n			void main() {\n				gl_FragColor = texture2D( tDiffuse, vUv );\n\n				#ifdef LINEAR_TONE_MAPPING\n					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );\n				#elif defined( REINHARD_TONE_MAPPING )\n					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );\n				#elif defined( CINEON_TONE_MAPPING )\n					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );\n				#elif defined( ACES_FILMIC_TONE_MAPPING )\n					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );\n				#elif defined( AGX_TONE_MAPPING )\n					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );\n				#elif defined( NEUTRAL_TONE_MAPPING )\n					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );\n				#elif defined( CUSTOM_TONE_MAPPING )\n					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );\n				#endif\n\n				#ifdef SRGB_TRANSFER\n					gl_FragColor = sRGBTransferOETF( gl_FragColor );\n				#endif\n			}",
		depthTest: !1,
		depthWrite: !1
	}), d = new Ff(l, u), f = new am(-1, 1, 1, -1, 0, 1), p = null, m = null, h = !1, g, _ = null, v = [], y = !1;
	this.setSize = function(e, t) {
		o.setSize(e, t), s !== null && s.setSize(e, t), c !== null && c.setSize(e, t);
		for (let n = 0; n < v.length; n++) {
			let r = v[n];
			r.setSize && r.setSize(e, t);
		}
	}, this.setEffects = function(e) {
		v = e, y = v.length > 0 && v[0].isRenderPass === !0;
		let t = o.width, n = o.height;
		v.length > 0 && s === null && (s = new ju(t, n, {
			type: mc,
			depthBuffer: !1,
			stencilBuffer: !1
		}), c = new ju(t, n, {
			type: mc,
			depthBuffer: !1,
			stencilBuffer: !1
		}));
		for (let e = 0; e < v.length; e++) {
			let r = v[e];
			r.setSize && r.setSize(t, n);
		}
	}, this.begin = function(e, t) {
		if (h || e.toneMapping === 0 && v.length === 0) return !1;
		if (_ = t, t !== null) {
			let e = t.width, n = t.height;
			(o.width !== e || o.height !== n) && this.setSize(e, n);
		}
		return y === !1 && e.setRenderTarget(o), g = e.toneMapping, e.toneMapping = 0, !0;
	}, this.hasRenderPass = function() {
		return y;
	}, this.end = function(e, t) {
		e.toneMapping = g, h = !0;
		let n = o, r = s;
		for (let i = 0; i < v.length; i++) {
			let a = v[i];
			a.enabled !== !1 && (a.render(e, r, n, t), a.needsSwap !== !1 && (n = r, r = r === s ? c : s));
		}
		if (p !== e.outputColorSpace || m !== e.toneMapping) {
			p = e.outputColorSpace, m = e.toneMapping, u.defines = {}, Y.getTransfer(p) === "srgb" && (u.defines.SRGB_TRANSFER = "");
			let t = ph[m];
			t && (u.defines[t] = ""), u.needsUpdate = !0;
		}
		u.uniforms.tDiffuse.value = n.texture, e.setRenderTarget(_), e.render(d, f), _ = null, h = !1;
	}, this.isCompositing = function() {
		return h;
	}, this.dispose = function() {
		o.dispose(), s !== null && s.dispose(), c !== null && c.dispose(), l.dispose(), u.dispose();
	};
}
var hh = /*@__PURE__*/ new Ou(), gh = /*@__PURE__*/ new up(1, 1), _h = /*@__PURE__*/ new Mu(), vh = /*@__PURE__*/ new Nu(), yh = /*@__PURE__*/ new lp(), bh = [], xh = [], Sh = /* @__PURE__ */ new Float32Array(16), Ch = /* @__PURE__ */ new Float32Array(9), wh = /* @__PURE__ */ new Float32Array(4);
function Th(e, t, n) {
	let r = e[0];
	if (r <= 0 || r > 0) return e;
	let i = t * n, a = bh[i];
	if (a === void 0 && (a = new Float32Array(i), bh[i] = a), t !== 0) {
		r.toArray(a, 0);
		for (let r = 1, i = 0; r !== t; ++r) i += n, e[r].toArray(a, i);
	}
	return a;
}
function Eh(e, t) {
	if (e.length !== t.length) return !1;
	for (let n = 0, r = e.length; n < r; n++) if (e[n] !== t[n]) return !1;
	return !0;
}
function Dh(e, t) {
	for (let n = 0, r = t.length; n < r; n++) e[n] = t[n];
}
function Oh(e, t) {
	let n = xh[t];
	n === void 0 && (n = new Int32Array(t), xh[t] = n);
	for (let r = 0; r !== t; ++r) n[r] = e.allocateTextureUnit();
	return n;
}
function kh(e, t) {
	let n = this.cache;
	n[0] !== t && (e.uniform1f(this.addr, t), n[0] = t);
}
function Ah(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y) && (e.uniform2f(this.addr, t.x, t.y), n[0] = t.x, n[1] = t.y);
	else {
		if (Eh(n, t)) return;
		e.uniform2fv(this.addr, t), Dh(n, t);
	}
}
function jh(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z) && (e.uniform3f(this.addr, t.x, t.y, t.z), n[0] = t.x, n[1] = t.y, n[2] = t.z);
	else if (t.r !== void 0) (n[0] !== t.r || n[1] !== t.g || n[2] !== t.b) && (e.uniform3f(this.addr, t.r, t.g, t.b), n[0] = t.r, n[1] = t.g, n[2] = t.b);
	else {
		if (Eh(n, t)) return;
		e.uniform3fv(this.addr, t), Dh(n, t);
	}
}
function Mh(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z || n[3] !== t.w) && (e.uniform4f(this.addr, t.x, t.y, t.z, t.w), n[0] = t.x, n[1] = t.y, n[2] = t.z, n[3] = t.w);
	else {
		if (Eh(n, t)) return;
		e.uniform4fv(this.addr, t), Dh(n, t);
	}
}
function Nh(e, t) {
	let n = this.cache, r = t.elements;
	if (r === void 0) {
		if (Eh(n, t)) return;
		e.uniformMatrix2fv(this.addr, !1, t), Dh(n, t);
	} else {
		if (Eh(n, r)) return;
		wh.set(r), e.uniformMatrix2fv(this.addr, !1, wh), Dh(n, r);
	}
}
function Ph(e, t) {
	let n = this.cache, r = t.elements;
	if (r === void 0) {
		if (Eh(n, t)) return;
		e.uniformMatrix3fv(this.addr, !1, t), Dh(n, t);
	} else {
		if (Eh(n, r)) return;
		Ch.set(r), e.uniformMatrix3fv(this.addr, !1, Ch), Dh(n, r);
	}
}
function Fh(e, t) {
	let n = this.cache, r = t.elements;
	if (r === void 0) {
		if (Eh(n, t)) return;
		e.uniformMatrix4fv(this.addr, !1, t), Dh(n, t);
	} else {
		if (Eh(n, r)) return;
		Sh.set(r), e.uniformMatrix4fv(this.addr, !1, Sh), Dh(n, r);
	}
}
function Ih(e, t) {
	let n = this.cache;
	n[0] !== t && (e.uniform1i(this.addr, t), n[0] = t);
}
function Lh(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y) && (e.uniform2i(this.addr, t.x, t.y), n[0] = t.x, n[1] = t.y);
	else {
		if (Eh(n, t)) return;
		e.uniform2iv(this.addr, t), Dh(n, t);
	}
}
function Rh(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z) && (e.uniform3i(this.addr, t.x, t.y, t.z), n[0] = t.x, n[1] = t.y, n[2] = t.z);
	else {
		if (Eh(n, t)) return;
		e.uniform3iv(this.addr, t), Dh(n, t);
	}
}
function zh(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z || n[3] !== t.w) && (e.uniform4i(this.addr, t.x, t.y, t.z, t.w), n[0] = t.x, n[1] = t.y, n[2] = t.z, n[3] = t.w);
	else {
		if (Eh(n, t)) return;
		e.uniform4iv(this.addr, t), Dh(n, t);
	}
}
function Bh(e, t) {
	let n = this.cache;
	n[0] !== t && (e.uniform1ui(this.addr, t), n[0] = t);
}
function Vh(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y) && (e.uniform2ui(this.addr, t.x, t.y), n[0] = t.x, n[1] = t.y);
	else {
		if (Eh(n, t)) return;
		e.uniform2uiv(this.addr, t), Dh(n, t);
	}
}
function Hh(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z) && (e.uniform3ui(this.addr, t.x, t.y, t.z), n[0] = t.x, n[1] = t.y, n[2] = t.z);
	else {
		if (Eh(n, t)) return;
		e.uniform3uiv(this.addr, t), Dh(n, t);
	}
}
function Uh(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z || n[3] !== t.w) && (e.uniform4ui(this.addr, t.x, t.y, t.z, t.w), n[0] = t.x, n[1] = t.y, n[2] = t.z, n[3] = t.w);
	else {
		if (Eh(n, t)) return;
		e.uniform4uiv(this.addr, t), Dh(n, t);
	}
}
function Wh(e, t, n) {
	let r = this.cache, i = n.allocateTextureUnit();
	r[0] !== i && (e.uniform1i(this.addr, i), r[0] = i);
	let a;
	this.type === e.SAMPLER_2D_SHADOW ? (gh.compareFunction = n.isReversedDepthBuffer() ? 518 : 515, a = gh) : a = hh, n.setTexture2D(t || a, i);
}
function Gh(e, t, n) {
	let r = this.cache, i = n.allocateTextureUnit();
	r[0] !== i && (e.uniform1i(this.addr, i), r[0] = i), n.setTexture3D(t || vh, i);
}
function Kh(e, t, n) {
	let r = this.cache, i = n.allocateTextureUnit();
	r[0] !== i && (e.uniform1i(this.addr, i), r[0] = i), n.setTextureCube(t || yh, i);
}
function qh(e, t, n) {
	let r = this.cache, i = n.allocateTextureUnit();
	r[0] !== i && (e.uniform1i(this.addr, i), r[0] = i), n.setTexture2DArray(t || _h, i);
}
function Jh(e) {
	switch (e) {
		case 5126: return kh;
		case 35664: return Ah;
		case 35665: return jh;
		case 35666: return Mh;
		case 35674: return Nh;
		case 35675: return Ph;
		case 35676: return Fh;
		case 5124:
		case 35670: return Ih;
		case 35667:
		case 35671: return Lh;
		case 35668:
		case 35672: return Rh;
		case 35669:
		case 35673: return zh;
		case 5125: return Bh;
		case 36294: return Vh;
		case 36295: return Hh;
		case 36296: return Uh;
		case 35678:
		case 36198:
		case 36298:
		case 36306:
		case 35682: return Wh;
		case 35679:
		case 36299:
		case 36307: return Gh;
		case 35680:
		case 36300:
		case 36308:
		case 36293: return Kh;
		case 36289:
		case 36303:
		case 36311:
		case 36292: return qh;
	}
}
function Yh(e, t) {
	e.uniform1fv(this.addr, t);
}
function Xh(e, t) {
	let n = Th(t, this.size, 2);
	e.uniform2fv(this.addr, n);
}
function Zh(e, t) {
	let n = Th(t, this.size, 3);
	e.uniform3fv(this.addr, n);
}
function Qh(e, t) {
	let n = Th(t, this.size, 4);
	e.uniform4fv(this.addr, n);
}
function $h(e, t) {
	let n = Th(t, this.size, 4);
	e.uniformMatrix2fv(this.addr, !1, n);
}
function eg(e, t) {
	let n = Th(t, this.size, 9);
	e.uniformMatrix3fv(this.addr, !1, n);
}
function tg(e, t) {
	let n = Th(t, this.size, 16);
	e.uniformMatrix4fv(this.addr, !1, n);
}
function ng(e, t) {
	e.uniform1iv(this.addr, t);
}
function rg(e, t) {
	e.uniform2iv(this.addr, t);
}
function ig(e, t) {
	e.uniform3iv(this.addr, t);
}
function ag(e, t) {
	e.uniform4iv(this.addr, t);
}
function og(e, t) {
	e.uniform1uiv(this.addr, t);
}
function sg(e, t) {
	e.uniform2uiv(this.addr, t);
}
function cg(e, t) {
	e.uniform3uiv(this.addr, t);
}
function lg(e, t) {
	e.uniform4uiv(this.addr, t);
}
function ug(e, t, n) {
	let r = this.cache, i = t.length, a = Oh(n, i);
	Eh(r, a) || (e.uniform1iv(this.addr, a), Dh(r, a));
	let o;
	o = this.type === e.SAMPLER_2D_SHADOW ? gh : hh;
	for (let e = 0; e !== i; ++e) n.setTexture2D(t[e] || o, a[e]);
}
function dg(e, t, n) {
	let r = this.cache, i = t.length, a = Oh(n, i);
	Eh(r, a) || (e.uniform1iv(this.addr, a), Dh(r, a));
	for (let e = 0; e !== i; ++e) n.setTexture3D(t[e] || vh, a[e]);
}
function fg(e, t, n) {
	let r = this.cache, i = t.length, a = Oh(n, i);
	Eh(r, a) || (e.uniform1iv(this.addr, a), Dh(r, a));
	for (let e = 0; e !== i; ++e) n.setTextureCube(t[e] || yh, a[e]);
}
function pg(e, t, n) {
	let r = this.cache, i = t.length, a = Oh(n, i);
	Eh(r, a) || (e.uniform1iv(this.addr, a), Dh(r, a));
	for (let e = 0; e !== i; ++e) n.setTexture2DArray(t[e] || _h, a[e]);
}
function mg(e) {
	switch (e) {
		case 5126: return Yh;
		case 35664: return Xh;
		case 35665: return Zh;
		case 35666: return Qh;
		case 35674: return $h;
		case 35675: return eg;
		case 35676: return tg;
		case 5124:
		case 35670: return ng;
		case 35667:
		case 35671: return rg;
		case 35668:
		case 35672: return ig;
		case 35669:
		case 35673: return ag;
		case 5125: return og;
		case 36294: return sg;
		case 36295: return cg;
		case 36296: return lg;
		case 35678:
		case 36198:
		case 36298:
		case 36306:
		case 35682: return ug;
		case 35679:
		case 36299:
		case 36307: return dg;
		case 35680:
		case 36300:
		case 36308:
		case 36293: return fg;
		case 36289:
		case 36303:
		case 36311:
		case 36292: return pg;
	}
}
var hg = class {
	constructor(e, t, n) {
		this.id = e, this.addr = n, this.cache = [], this.type = t.type, this.setValue = Jh(t.type);
	}
}, gg = class {
	constructor(e, t, n) {
		this.id = e, this.addr = n, this.cache = [], this.type = t.type, this.size = t.size, this.setValue = mg(t.type);
	}
}, _g = class {
	constructor(e) {
		this.id = e, this.seq = [], this.map = {};
	}
	setValue(e, t, n) {
		let r = this.seq;
		for (let i = 0, a = r.length; i !== a; ++i) {
			let a = r[i];
			a.setValue(e, t[a.id], n);
		}
	}
}, vg = /(\w+)(\])?(\[|\.)?/g;
function yg(e, t) {
	e.seq.push(t), e.map[t.id] = t;
}
function bg(e, t, n) {
	let r = e.name, i = r.length;
	for (vg.lastIndex = 0;;) {
		let a = vg.exec(r), o = vg.lastIndex, s = a[1], c = a[2] === "]", l = a[3];
		if (c && (s |= 0), l === void 0 || l === "[" && o + 2 === i) {
			yg(n, l === void 0 ? new hg(s, e, t) : new gg(s, e, t));
			break;
		}
		{
			let e = n.map[s];
			e === void 0 && (e = new _g(s), yg(n, e)), n = e;
		}
	}
}
var xg = class {
	constructor(e, t) {
		this.seq = [], this.map = {};
		let n = e.getProgramParameter(t, e.ACTIVE_UNIFORMS);
		for (let r = 0; r < n; ++r) {
			let n = e.getActiveUniform(t, r);
			bg(n, e.getUniformLocation(t, n.name), this);
		}
		let r = [], i = [];
		for (let t of this.seq) t.type === e.SAMPLER_2D_SHADOW || t.type === e.SAMPLER_CUBE_SHADOW || t.type === e.SAMPLER_2D_ARRAY_SHADOW ? r.push(t) : i.push(t);
		r.length > 0 && (this.seq = r.concat(i));
	}
	setValue(e, t, n, r) {
		let i = this.map[t];
		i !== void 0 && i.setValue(e, n, r);
	}
	setOptional(e, t, n) {
		let r = t[n];
		r !== void 0 && this.setValue(e, n, r);
	}
	static upload(e, t, n, r) {
		for (let i = 0, a = t.length; i !== a; ++i) {
			let a = t[i], o = n[a.id];
			o.needsUpdate !== !1 && a.setValue(e, o.value, r);
		}
	}
	static seqWithValue(e, t) {
		let n = [];
		for (let r = 0, i = e.length; r !== i; ++r) {
			let i = e[r];
			i.id in t && n.push(i);
		}
		return n;
	}
};
function Sg(e, t, n) {
	let r = e.createShader(t);
	return e.shaderSource(r, n), e.compileShader(r), r;
}
var Cg = 37297, wg = 0;
function Tg(e, t) {
	let n = e.split("\n"), r = [], i = Math.max(t - 6, 0), a = Math.min(t + 6, n.length);
	for (let e = i; e < a; e++) {
		let i = e + 1;
		r.push(`${i === t ? ">" : " "} ${i}: ${n[e]}`);
	}
	return r.join("\n");
}
var Eg = /*@__PURE__*/ new J();
function Dg(e) {
	Y._getMatrix(Eg, Y.workingColorSpace, e);
	let t = `mat3( ${Eg.elements.map((e) => e.toFixed(4))} )`;
	switch (Y.getTransfer(e)) {
		case Sl: return [t, "LinearTransferOETF"];
		case Cl: return [t, "sRGBTransferOETF"];
		default: return U("WebGLProgram: Unsupported color space: ", e), [t, "LinearTransferOETF"];
	}
}
function Og(e, t, n) {
	let r = e.getShaderParameter(t, e.COMPILE_STATUS), i = (e.getShaderInfoLog(t) || "").trim();
	if (r && i === "") return "";
	let a = /ERROR: 0:(\d+)/.exec(i);
	if (a) {
		let r = parseInt(a[1]);
		return n.toUpperCase() + "\n\n" + i + "\n\n" + Tg(e.getShaderSource(t), r);
	}
	return i;
}
function kg(e, t) {
	let n = Dg(t);
	return [
		`vec4 ${e}( vec4 value ) {`,
		`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,
		"}"
	].join("\n");
}
var Ag = {
	1: "Linear",
	2: "Reinhard",
	3: "Cineon",
	4: "ACESFilmic",
	6: "AgX",
	7: "Neutral",
	5: "Custom"
};
function jg(e, t) {
	let n = Ag[t];
	return n === void 0 ? (U("WebGLProgram: Unsupported toneMapping:", t), "vec3 " + e + "( vec3 color ) { return LinearToneMapping( color ); }") : "vec3 " + e + "( vec3 color ) { return " + n + "ToneMapping( color ); }";
}
var Mg = /*@__PURE__*/ new q();
function Ng() {
	return Y.getLuminanceCoefficients(Mg), [
		"float luminance( const in vec3 rgb ) {",
		`	const vec3 weights = vec3( ${Mg.x.toFixed(4)}, ${Mg.y.toFixed(4)}, ${Mg.z.toFixed(4)} );`,
		"	return dot( weights, rgb );",
		"}"
	].join("\n");
}
function Pg(e) {
	return [e.extensionClipCullDistance ? "#extension GL_ANGLE_clip_cull_distance : require" : "", e.extensionMultiDraw ? "#extension GL_ANGLE_multi_draw : require" : ""].filter(Lg).join("\n");
}
function Fg(e) {
	let t = [];
	for (let n in e) {
		let r = e[n];
		r !== !1 && t.push("#define " + n + " " + r);
	}
	return t.join("\n");
}
function Ig(e, t) {
	let n = {}, r = e.getProgramParameter(t, e.ACTIVE_ATTRIBUTES);
	for (let i = 0; i < r; i++) {
		let r = e.getActiveAttrib(t, i), a = r.name, o = 1;
		r.type === e.FLOAT_MAT2 && (o = 2), r.type === e.FLOAT_MAT3 && (o = 3), r.type === e.FLOAT_MAT4 && (o = 4), n[a] = {
			type: r.type,
			location: e.getAttribLocation(t, a),
			locationSize: o
		};
	}
	return n;
}
function Lg(e) {
	return e !== "";
}
function Rg(e, t) {
	let n = t.numSpotLightShadows + t.numSpotLightMaps - t.numSpotLightShadowsWithMaps;
	return e.replace(/NUM_SUN_LIGHTS/g, t.numSunLights).replace(/NUM_DIR_LIGHTS/g, t.numDirLights).replace(/NUM_SPOT_LIGHTS/g, t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g, t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g, n).replace(/NUM_RECT_AREA_LIGHTS/g, t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g, t.numPointLights).replace(/NUM_HEMI_LIGHTS/g, t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g, t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g, t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g, t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g, t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g, t.numPointLightShadows);
}
function zg(e, t) {
	return e.replace(/NUM_CLIPPING_PLANES/g, t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g, t.numClippingPlanes - t.numClipIntersection);
}
var Bg = /^[ \t]*#include +<([\w\d./]+)>/gm;
function Vg(e) {
	return e.replace(Bg, Ug);
}
var Hg = /* @__PURE__ */ new Map();
function Ug(e, t) {
	let n = Z[t];
	if (n === void 0) {
		let e = Hg.get(t);
		if (e !== void 0) n = Z[e], U("WebGLRenderer: Shader chunk \"%s\" has been deprecated. Use \"%s\" instead.", t, e);
		else throw Error("THREE.WebGLProgram: Can not resolve #include <" + t + ">");
	}
	return Vg(n);
}
var Wg = /#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;
function Gg(e) {
	return e.replace(Wg, Kg);
}
function Kg(e, t, n, r) {
	let i = "";
	for (let e = parseInt(t); e < parseInt(n); e++) i += r.replace(/\[\s*i\s*\]/g, "[ " + e + " ]").replace(/UNROLLED_LOOP_INDEX/g, e);
	return i;
}
function qg(e) {
	let t = `precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;
	return e.precision === "highp" ? t += "\n#define HIGH_PRECISION" : e.precision === "mediump" ? t += "\n#define MEDIUM_PRECISION" : e.precision === "lowp" && (t += "\n#define LOW_PRECISION"), t;
}
var Jg = {
	1: "SHADOWMAP_TYPE_PCF",
	3: "SHADOWMAP_TYPE_VSM"
};
function Yg(e) {
	return Jg[e.shadowMapType] || "SHADOWMAP_TYPE_BASIC";
}
var Xg = {
	301: "ENVMAP_TYPE_CUBE",
	302: "ENVMAP_TYPE_CUBE",
	306: "ENVMAP_TYPE_CUBE_UV"
};
function Zg(e) {
	return e.envMap === !1 ? "ENVMAP_TYPE_CUBE" : Xg[e.envMapMode] || "ENVMAP_TYPE_CUBE";
}
var Qg = { 302: "ENVMAP_MODE_REFRACTION" };
function $g(e) {
	return e.envMap === !1 ? "ENVMAP_MODE_REFLECTION" : Qg[e.envMapMode] || "ENVMAP_MODE_REFLECTION";
}
var e_ = {
	0: "ENVMAP_BLENDING_MULTIPLY",
	1: "ENVMAP_BLENDING_MIX",
	2: "ENVMAP_BLENDING_ADD"
};
function t_(e) {
	return e.envMap === !1 ? "ENVMAP_BLENDING_NONE" : e_[e.combine] || "ENVMAP_BLENDING_NONE";
}
function n_(e) {
	let t = e.envMapCubeUVHeight;
	if (t === null) return null;
	let n = Math.log2(t) - 2, r = 1 / t;
	return {
		texelWidth: 1 / (3 * Math.max(2 ** n, 112)),
		texelHeight: r,
		maxMip: n
	};
}
function r_(e, t, n, r) {
	let i = e.getContext(), a = n.defines, o = n.vertexShader, s = n.fragmentShader, c = Yg(n), l = Zg(n), u = $g(n), d = t_(n), f = n_(n), p = Pg(n), m = Fg(a), h = i.createProgram(), g, _, v = n.glslVersion ? "#version " + n.glslVersion + "\n" : "";
	n.isRawShaderMaterial ? (g = [
		"#define SHADER_TYPE " + n.shaderType,
		"#define SHADER_NAME " + n.shaderName,
		m
	].filter(Lg).join("\n"), g.length > 0 && (g += "\n"), _ = [
		"#define SHADER_TYPE " + n.shaderType,
		"#define SHADER_NAME " + n.shaderName,
		m
	].filter(Lg).join("\n"), _.length > 0 && (_ += "\n")) : (g = [
		qg(n),
		"#define SHADER_TYPE " + n.shaderType,
		"#define SHADER_NAME " + n.shaderName,
		m,
		n.extensionClipCullDistance ? "#define USE_CLIP_DISTANCE" : "",
		n.batching ? "#define USE_BATCHING" : "",
		n.batchingColor ? "#define USE_BATCHING_COLOR" : "",
		n.instancing ? "#define USE_INSTANCING" : "",
		n.instancingColor ? "#define USE_INSTANCING_COLOR" : "",
		n.instancingMorph ? "#define USE_INSTANCING_MORPH" : "",
		n.useFog && n.fog ? "#define USE_FOG" : "",
		n.useFog && n.fogExp2 ? "#define FOG_EXP2" : "",
		n.map ? "#define USE_MAP" : "",
		n.envMap ? "#define USE_ENVMAP" : "",
		n.envMap ? "#define " + u : "",
		n.lightMap ? "#define USE_LIGHTMAP" : "",
		n.aoMap ? "#define USE_AOMAP" : "",
		n.bumpMap ? "#define USE_BUMPMAP" : "",
		n.normalMap ? "#define USE_NORMALMAP" : "",
		n.normalMapObjectSpace ? "#define USE_NORMALMAP_OBJECTSPACE" : "",
		n.normalMapTangentSpace ? "#define USE_NORMALMAP_TANGENTSPACE" : "",
		n.displacementMap ? "#define USE_DISPLACEMENTMAP" : "",
		n.emissiveMap ? "#define USE_EMISSIVEMAP" : "",
		n.anisotropy ? "#define USE_ANISOTROPY" : "",
		n.anisotropyMap ? "#define USE_ANISOTROPYMAP" : "",
		n.clearcoatMap ? "#define USE_CLEARCOATMAP" : "",
		n.clearcoatRoughnessMap ? "#define USE_CLEARCOAT_ROUGHNESSMAP" : "",
		n.clearcoatNormalMap ? "#define USE_CLEARCOAT_NORMALMAP" : "",
		n.iridescenceMap ? "#define USE_IRIDESCENCEMAP" : "",
		n.iridescenceThicknessMap ? "#define USE_IRIDESCENCE_THICKNESSMAP" : "",
		n.specularMap ? "#define USE_SPECULARMAP" : "",
		n.specularColorMap ? "#define USE_SPECULAR_COLORMAP" : "",
		n.specularIntensityMap ? "#define USE_SPECULAR_INTENSITYMAP" : "",
		n.roughnessMap ? "#define USE_ROUGHNESSMAP" : "",
		n.metalnessMap ? "#define USE_METALNESSMAP" : "",
		n.alphaMap ? "#define USE_ALPHAMAP" : "",
		n.alphaHash ? "#define USE_ALPHAHASH" : "",
		n.transmission ? "#define USE_TRANSMISSION" : "",
		n.transmissionMap ? "#define USE_TRANSMISSIONMAP" : "",
		n.thicknessMap ? "#define USE_THICKNESSMAP" : "",
		n.sheenColorMap ? "#define USE_SHEEN_COLORMAP" : "",
		n.sheenRoughnessMap ? "#define USE_SHEEN_ROUGHNESSMAP" : "",
		n.mapUv ? "#define MAP_UV " + n.mapUv : "",
		n.alphaMapUv ? "#define ALPHAMAP_UV " + n.alphaMapUv : "",
		n.lightMapUv ? "#define LIGHTMAP_UV " + n.lightMapUv : "",
		n.aoMapUv ? "#define AOMAP_UV " + n.aoMapUv : "",
		n.emissiveMapUv ? "#define EMISSIVEMAP_UV " + n.emissiveMapUv : "",
		n.bumpMapUv ? "#define BUMPMAP_UV " + n.bumpMapUv : "",
		n.normalMapUv ? "#define NORMALMAP_UV " + n.normalMapUv : "",
		n.displacementMapUv ? "#define DISPLACEMENTMAP_UV " + n.displacementMapUv : "",
		n.metalnessMapUv ? "#define METALNESSMAP_UV " + n.metalnessMapUv : "",
		n.roughnessMapUv ? "#define ROUGHNESSMAP_UV " + n.roughnessMapUv : "",
		n.anisotropyMapUv ? "#define ANISOTROPYMAP_UV " + n.anisotropyMapUv : "",
		n.clearcoatMapUv ? "#define CLEARCOATMAP_UV " + n.clearcoatMapUv : "",
		n.clearcoatNormalMapUv ? "#define CLEARCOAT_NORMALMAP_UV " + n.clearcoatNormalMapUv : "",
		n.clearcoatRoughnessMapUv ? "#define CLEARCOAT_ROUGHNESSMAP_UV " + n.clearcoatRoughnessMapUv : "",
		n.iridescenceMapUv ? "#define IRIDESCENCEMAP_UV " + n.iridescenceMapUv : "",
		n.iridescenceThicknessMapUv ? "#define IRIDESCENCE_THICKNESSMAP_UV " + n.iridescenceThicknessMapUv : "",
		n.sheenColorMapUv ? "#define SHEEN_COLORMAP_UV " + n.sheenColorMapUv : "",
		n.sheenRoughnessMapUv ? "#define SHEEN_ROUGHNESSMAP_UV " + n.sheenRoughnessMapUv : "",
		n.specularMapUv ? "#define SPECULARMAP_UV " + n.specularMapUv : "",
		n.specularColorMapUv ? "#define SPECULAR_COLORMAP_UV " + n.specularColorMapUv : "",
		n.specularIntensityMapUv ? "#define SPECULAR_INTENSITYMAP_UV " + n.specularIntensityMapUv : "",
		n.transmissionMapUv ? "#define TRANSMISSIONMAP_UV " + n.transmissionMapUv : "",
		n.thicknessMapUv ? "#define THICKNESSMAP_UV " + n.thicknessMapUv : "",
		n.vertexTangents && n.flatShading === !1 ? "#define USE_TANGENT" : "",
		n.vertexNormals ? "#define HAS_NORMAL" : "",
		n.vertexColors ? "#define USE_COLOR" : "",
		n.vertexAlphas ? "#define USE_COLOR_ALPHA" : "",
		n.vertexUv1s ? "#define USE_UV1" : "",
		n.vertexUv2s ? "#define USE_UV2" : "",
		n.vertexUv3s ? "#define USE_UV3" : "",
		n.pointsUvs ? "#define USE_POINTS_UV" : "",
		n.flatShading ? "#define FLAT_SHADED" : "",
		n.skinning ? "#define USE_SKINNING" : "",
		n.morphTargets ? "#define USE_MORPHTARGETS" : "",
		n.morphNormals && n.flatShading === !1 ? "#define USE_MORPHNORMALS" : "",
		n.morphColors ? "#define USE_MORPHCOLORS" : "",
		n.morphTargetsCount > 0 ? "#define MORPHTARGETS_TEXTURE_STRIDE " + n.morphTextureStride : "",
		n.morphTargetsCount > 0 ? "#define MORPHTARGETS_COUNT " + n.morphTargetsCount : "",
		n.doubleSided ? "#define DOUBLE_SIDED" : "",
		n.flipSided ? "#define FLIP_SIDED" : "",
		n.shadowMapEnabled ? "#define USE_SHADOWMAP" : "",
		n.shadowMapEnabled ? "#define " + c : "",
		n.sizeAttenuation ? "#define USE_SIZEATTENUATION" : "",
		n.numLightProbes > 0 ? "#define USE_LIGHT_PROBES" : "",
		n.logarithmicDepthBuffer ? "#define USE_LOGARITHMIC_DEPTH_BUFFER" : "",
		n.reversedDepthBuffer ? "#define USE_REVERSED_DEPTH_BUFFER" : "",
		"uniform mat4 modelMatrix;",
		"uniform mat4 modelViewMatrix;",
		"uniform mat4 projectionMatrix;",
		"uniform mat4 viewMatrix;",
		"uniform mat3 normalMatrix;",
		"uniform vec3 cameraPosition;",
		"uniform bool isOrthographic;",
		"#ifdef USE_INSTANCING",
		"	attribute mat4 instanceMatrix;",
		"#endif",
		"#ifdef USE_INSTANCING_COLOR",
		"	attribute vec3 instanceColor;",
		"#endif",
		"#ifdef USE_INSTANCING_MORPH",
		"	uniform sampler2D morphTexture;",
		"#endif",
		"attribute vec3 position;",
		"attribute vec3 normal;",
		"attribute vec2 uv;",
		"#ifdef USE_UV1",
		"	attribute vec2 uv1;",
		"#endif",
		"#ifdef USE_UV2",
		"	attribute vec2 uv2;",
		"#endif",
		"#ifdef USE_UV3",
		"	attribute vec2 uv3;",
		"#endif",
		"#ifdef USE_TANGENT",
		"	attribute vec4 tangent;",
		"#endif",
		"#if defined( USE_COLOR_ALPHA )",
		"	attribute vec4 color;",
		"#elif defined( USE_COLOR )",
		"	attribute vec3 color;",
		"#endif",
		"#ifdef USE_SKINNING",
		"	attribute vec4 skinIndex;",
		"	attribute vec4 skinWeight;",
		"#endif",
		"\n"
	].filter(Lg).join("\n"), _ = [
		qg(n),
		"#define SHADER_TYPE " + n.shaderType,
		"#define SHADER_NAME " + n.shaderName,
		m,
		n.useFog && n.fog ? "#define USE_FOG" : "",
		n.useFog && n.fogExp2 ? "#define FOG_EXP2" : "",
		n.alphaToCoverage ? "#define ALPHA_TO_COVERAGE" : "",
		n.map ? "#define USE_MAP" : "",
		n.matcap ? "#define USE_MATCAP" : "",
		n.envMap ? "#define USE_ENVMAP" : "",
		n.envMap ? "#define " + l : "",
		n.envMap ? "#define " + u : "",
		n.envMap ? "#define " + d : "",
		f ? "#define CUBEUV_TEXEL_WIDTH " + f.texelWidth : "",
		f ? "#define CUBEUV_TEXEL_HEIGHT " + f.texelHeight : "",
		f ? "#define CUBEUV_MAX_MIP " + f.maxMip + ".0" : "",
		n.lightMap ? "#define USE_LIGHTMAP" : "",
		n.aoMap ? "#define USE_AOMAP" : "",
		n.bumpMap ? "#define USE_BUMPMAP" : "",
		n.normalMap ? "#define USE_NORMALMAP" : "",
		n.normalMapObjectSpace ? "#define USE_NORMALMAP_OBJECTSPACE" : "",
		n.normalMapTangentSpace ? "#define USE_NORMALMAP_TANGENTSPACE" : "",
		n.packedNormalMap ? "#define USE_PACKED_NORMALMAP" : "",
		n.emissiveMap ? "#define USE_EMISSIVEMAP" : "",
		n.anisotropy ? "#define USE_ANISOTROPY" : "",
		n.anisotropyMap ? "#define USE_ANISOTROPYMAP" : "",
		n.clearcoat ? "#define USE_CLEARCOAT" : "",
		n.clearcoatMap ? "#define USE_CLEARCOATMAP" : "",
		n.clearcoatRoughnessMap ? "#define USE_CLEARCOAT_ROUGHNESSMAP" : "",
		n.clearcoatNormalMap ? "#define USE_CLEARCOAT_NORMALMAP" : "",
		n.dispersion ? "#define USE_DISPERSION" : "",
		n.retroreflection ? "#define USE_RETROREFLECTION" : "",
		n.iridescence ? "#define USE_IRIDESCENCE" : "",
		n.iridescenceMap ? "#define USE_IRIDESCENCEMAP" : "",
		n.iridescenceThicknessMap ? "#define USE_IRIDESCENCE_THICKNESSMAP" : "",
		n.specularMap ? "#define USE_SPECULARMAP" : "",
		n.specularColorMap ? "#define USE_SPECULAR_COLORMAP" : "",
		n.specularIntensityMap ? "#define USE_SPECULAR_INTENSITYMAP" : "",
		n.roughnessMap ? "#define USE_ROUGHNESSMAP" : "",
		n.metalnessMap ? "#define USE_METALNESSMAP" : "",
		n.alphaMap ? "#define USE_ALPHAMAP" : "",
		n.alphaTest ? "#define USE_ALPHATEST" : "",
		n.alphaHash ? "#define USE_ALPHAHASH" : "",
		n.sheen ? "#define USE_SHEEN" : "",
		n.sheenColorMap ? "#define USE_SHEEN_COLORMAP" : "",
		n.sheenRoughnessMap ? "#define USE_SHEEN_ROUGHNESSMAP" : "",
		n.transmission ? "#define USE_TRANSMISSION" : "",
		n.transmissionMap ? "#define USE_TRANSMISSIONMAP" : "",
		n.thicknessMap ? "#define USE_THICKNESSMAP" : "",
		n.vertexTangents && n.flatShading === !1 ? "#define USE_TANGENT" : "",
		n.vertexColors || n.instancingColor ? "#define USE_COLOR" : "",
		n.vertexAlphas || n.batchingColor ? "#define USE_COLOR_ALPHA" : "",
		n.vertexUv1s ? "#define USE_UV1" : "",
		n.vertexUv2s ? "#define USE_UV2" : "",
		n.vertexUv3s ? "#define USE_UV3" : "",
		n.pointsUvs ? "#define USE_POINTS_UV" : "",
		n.gradientMap ? "#define USE_GRADIENTMAP" : "",
		n.flatShading ? "#define FLAT_SHADED" : "",
		n.doubleSided ? "#define DOUBLE_SIDED" : "",
		n.flipSided ? "#define FLIP_SIDED" : "",
		n.shadowMapEnabled ? "#define USE_SHADOWMAP" : "",
		n.shadowMapEnabled ? "#define " + c : "",
		n.premultipliedAlpha ? "#define PREMULTIPLIED_ALPHA" : "",
		n.numLightProbes > 0 ? "#define USE_LIGHT_PROBES" : "",
		n.numLightProbeGrids > 0 ? "#define USE_LIGHT_PROBES_GRID" : "",
		n.decodeVideoTexture ? "#define DECODE_VIDEO_TEXTURE" : "",
		n.decodeVideoTextureEmissive ? "#define DECODE_VIDEO_TEXTURE_EMISSIVE" : "",
		n.logarithmicDepthBuffer ? "#define USE_LOGARITHMIC_DEPTH_BUFFER" : "",
		n.reversedDepthBuffer ? "#define USE_REVERSED_DEPTH_BUFFER" : "",
		"uniform mat4 viewMatrix;",
		"uniform vec3 cameraPosition;",
		"uniform bool isOrthographic;",
		n.toneMapping === 0 ? "" : "#define TONE_MAPPING",
		n.toneMapping === 0 ? "" : Z.tonemapping_pars_fragment,
		n.toneMapping === 0 ? "" : jg("toneMapping", n.toneMapping),
		n.dithering ? "#define DITHERING" : "",
		n.opaque ? "#define OPAQUE" : "",
		Z.colorspace_pars_fragment,
		kg("linearToOutputTexel", n.outputColorSpace),
		Ng(),
		n.useDepthPacking ? "#define DEPTH_PACKING " + n.depthPacking : "",
		"\n"
	].filter(Lg).join("\n")), o = Vg(o), o = Rg(o, n), o = zg(o, n), s = Vg(s), s = Rg(s, n), s = zg(s, n), o = Gg(o), s = Gg(s), n.isRawShaderMaterial !== !0 && (v = "#version 300 es\n", g = [
		p,
		"#define attribute in",
		"#define varying out",
		"#define texture2D texture"
	].join("\n") + "\n" + g, _ = [
		"#define varying in",
		n.glslVersion === "300 es" ? "" : "layout(location = 0) out highp vec4 pc_fragColor;",
		n.glslVersion === "300 es" ? "" : "#define gl_FragColor pc_fragColor",
		"#define gl_FragDepthEXT gl_FragDepth",
		"#define texture2D texture",
		"#define textureCube texture",
		"#define texture2DProj textureProj",
		"#define texture2DLodEXT textureLod",
		"#define texture2DProjLodEXT textureProjLod",
		"#define textureCubeLodEXT textureLod",
		"#define texture2DGradEXT textureGrad",
		"#define texture2DProjGradEXT textureProjGrad",
		"#define textureCubeGradEXT textureGrad"
	].join("\n") + "\n" + _);
	let y = v + g + o, b = v + _ + s, x = Sg(i, i.VERTEX_SHADER, y), S = Sg(i, i.FRAGMENT_SHADER, b);
	i.attachShader(h, x), i.attachShader(h, S), n.index0AttributeName === void 0 ? n.hasPositionAttribute === !0 && i.bindAttribLocation(h, 0, "position") : i.bindAttribLocation(h, 0, n.index0AttributeName), i.linkProgram(h);
	function C(t) {
		if (e.debug.checkShaderErrors) {
			let n = i.getProgramInfoLog(h) || "", r = i.getShaderInfoLog(x) || "", a = i.getShaderInfoLog(S) || "", o = n.trim(), s = r.trim(), c = a.trim(), l = !0, u = !0;
			if (i.getProgramParameter(h, i.LINK_STATUS) === !1) {
				if (l = !1, typeof e.debug.onShaderError == "function") e.debug.onShaderError(i, h, x, S);
				else {
					let e = Og(i, x, "vertex"), n = Og(i, S, "fragment");
					W("WebGLProgram: Shader Error " + i.getError() + " - VALIDATE_STATUS " + i.getProgramParameter(h, i.VALIDATE_STATUS) + "\n\nMaterial Name: " + t.name + "\nMaterial Type: " + t.type + "\n\nProgram Info Log: " + o + "\n" + e + "\n" + n);
				}
			} else o === "" ? (s === "" || c === "") && (u = !1) : U("WebGLProgram: Program Info Log:", o);
			u && (t.diagnostics = {
				runnable: l,
				programLog: o,
				vertexShader: {
					log: s,
					prefix: g
				},
				fragmentShader: {
					log: c,
					prefix: _
				}
			});
		}
		i.deleteShader(x), i.deleteShader(S), w = new xg(i, h), T = Ig(i, h);
	}
	let w;
	this.getUniforms = function() {
		return w === void 0 && C(this), w;
	};
	let T;
	this.getAttributes = function() {
		return T === void 0 && C(this), T;
	};
	let E = n.rendererExtensionParallelShaderCompile === !1;
	return this.isReady = function() {
		return E === !1 && (E = i.getProgramParameter(h, Cg)), E;
	}, this.destroy = function() {
		r.releaseStatesOfProgram(this), i.deleteProgram(h), this.program = void 0;
	}, this.type = n.shaderType, this.name = n.shaderName, this.id = wg++, this.cacheKey = t, this.usedTimes = 1, this.program = h, this.vertexShader = x, this.fragmentShader = S, this;
}
var i_ = 0, a_ = class {
	constructor() {
		this.shaderCache = /* @__PURE__ */ new Map(), this.materialCache = /* @__PURE__ */ new Map();
	}
	update(e, t, n) {
		let r = this._getShaderCacheForMaterial(e);
		return r.has(t) === !1 && (r.add(t), t.usedTimes++), r.has(n) === !1 && (r.add(n), n.usedTimes++), this;
	}
	remove(e) {
		let t = this.materialCache.get(e);
		for (let e of t) e.usedTimes--, e.usedTimes === 0 && this.shaderCache.delete(e.code);
		return this.materialCache.delete(e), this;
	}
	getVertexShaderStage(e) {
		return this._getShaderStage(e.vertexShader);
	}
	getFragmentShaderStage(e) {
		return this._getShaderStage(e.fragmentShader);
	}
	dispose() {
		this.shaderCache.clear(), this.materialCache.clear();
	}
	_getShaderCacheForMaterial(e) {
		let t = this.materialCache, n = t.get(e);
		return n === void 0 && (n = /* @__PURE__ */ new Set(), t.set(e, n)), n;
	}
	_getShaderStage(e) {
		let t = this.shaderCache, n = t.get(e);
		return n === void 0 && (n = new o_(e), t.set(e, n)), n;
	}
}, o_ = class {
	constructor(e) {
		this.id = i_++, this.code = e, this.usedTimes = 0;
	}
};
function s_(e) {
	return e === 1030 || e === 37490 || e === 36285;
}
function c_(e, t, n, r, i, a) {
	let o = new Gu(), s = new a_(), c = /* @__PURE__ */ new Set(), l = [], u = /* @__PURE__ */ new Map(), d = r.logarithmicDepthBuffer, f = r.precision, p = {
		MeshDepthMaterial: "depth",
		MeshDistanceMaterial: "distance",
		MeshNormalMaterial: "normal",
		MeshBasicMaterial: "basic",
		MeshLambertMaterial: "lambert",
		MeshPhongMaterial: "phong",
		MeshToonMaterial: "toon",
		MeshStandardMaterial: "physical",
		MeshPhysicalMaterial: "physical",
		MeshMatcapMaterial: "matcap",
		LineBasicMaterial: "basic",
		LineDashedMaterial: "dashed",
		PointsMaterial: "points",
		ShadowMaterial: "shadow",
		SpriteMaterial: "sprite"
	};
	function m(e) {
		return c.add(e), e === 0 ? "uv" : `uv${e}`;
	}
	function h(i, o, l, u, h, g) {
		let _ = u.fog, v = h.geometry, y = i.isMeshStandardMaterial || i.isMeshLambertMaterial || i.isMeshPhongMaterial ? u.environment : null, b = i.isMeshStandardMaterial || i.isMeshLambertMaterial && !i.envMap || i.isMeshPhongMaterial && !i.envMap, x = t.get(i.envMap || y, b), S = x && x.mapping === 306 ? x.image.height : null, C = p[i.type];
		i.precision !== null && (f = r.getMaxPrecision(i.precision), f !== i.precision && U("WebGLProgram.getParameters:", i.precision, "not supported, using", f, "instead."));
		let w = v.morphAttributes.position || v.morphAttributes.normal || v.morphAttributes.color, T = w === void 0 ? 0 : w.length, E = 0;
		v.morphAttributes.position !== void 0 && (E = 1), v.morphAttributes.normal !== void 0 && (E = 2), v.morphAttributes.color !== void 0 && (E = 3);
		let D, O, k, A;
		if (C) {
			let e = km[C];
			D = e.vertexShader, O = e.fragmentShader;
		} else {
			D = i.vertexShader, O = i.fragmentShader;
			let e = s.getVertexShaderStage(i), t = s.getFragmentShaderStage(i);
			s.update(i, e, t), k = e.id, A = t.id;
		}
		let j = e.getRenderTarget(), M = e.state.buffers.depth.getReversed(), N = h.isInstancedMesh === !0, P = h.isBatchedMesh === !0, F = !!i.map, I = !!i.matcap, ee = !!x, te = !!i.aoMap, ne = !!i.lightMap, re = !!i.bumpMap && i.wireframe === !1, L = !!i.normalMap, ie = !!i.displacementMap, R = !!i.emissiveMap, ae = !!i.metalnessMap, oe = !!i.roughnessMap, se = i.anisotropy > 0, ce = i.clearcoat > 0, le = i.dispersion > 0, ue = i.retroreflectivity > 0, de = i.iridescence > 0, fe = i.sheen > 0, pe = i.transmission > 0, me = se && !!i.anisotropyMap, he = ce && !!i.clearcoatMap, ge = ce && !!i.clearcoatNormalMap, _e = ce && !!i.clearcoatRoughnessMap, ve = de && !!i.iridescenceMap, z = de && !!i.iridescenceThicknessMap, ye = fe && !!i.sheenColorMap, be = fe && !!i.sheenRoughnessMap, xe = !!i.specularMap, B = !!i.specularColorMap, Se = !!i.specularIntensityMap, V = pe && !!i.transmissionMap, H = pe && !!i.thicknessMap, Ce = !!i.gradientMap, we = !!i.alphaMap, Te = i.alphaTest > 0, Ee = !!i.alphaHash, De = !!i.extensions, Oe = 0;
		i.toneMapped && (j === null || j.isXRRenderTarget === !0) && (Oe = e.toneMapping);
		let ke = {
			shaderID: C,
			shaderType: i.type,
			shaderName: i.name,
			vertexShader: D,
			fragmentShader: O,
			defines: i.defines,
			customVertexShaderID: k,
			customFragmentShaderID: A,
			isRawShaderMaterial: i.isRawShaderMaterial === !0,
			glslVersion: i.glslVersion,
			precision: f,
			batching: P,
			batchingColor: P && h._colorsTexture !== null,
			instancing: N,
			instancingColor: N && h.instanceColor !== null,
			instancingMorph: N && h.morphTexture !== null,
			outputColorSpace: j === null ? e.outputColorSpace : j.isXRRenderTarget === !0 ? j.texture.colorSpace : Y.workingColorSpace,
			alphaToCoverage: !!i.alphaToCoverage,
			map: F,
			matcap: I,
			envMap: ee,
			envMapMode: ee && x.mapping,
			envMapCubeUVHeight: S,
			aoMap: te,
			lightMap: ne,
			bumpMap: re,
			normalMap: L,
			displacementMap: ie,
			emissiveMap: R,
			normalMapObjectSpace: L && i.normalMapType === 1,
			normalMapTangentSpace: L && i.normalMapType === 0,
			packedNormalMap: L && i.normalMapType === 0 && s_(i.normalMap.format),
			metalnessMap: ae,
			roughnessMap: oe,
			anisotropy: se,
			anisotropyMap: me,
			clearcoat: ce,
			clearcoatMap: he,
			clearcoatNormalMap: ge,
			clearcoatRoughnessMap: _e,
			dispersion: le,
			retroreflection: ue,
			iridescence: de,
			iridescenceMap: ve,
			iridescenceThicknessMap: z,
			sheen: fe,
			sheenColorMap: ye,
			sheenRoughnessMap: be,
			specularMap: xe,
			specularColorMap: B,
			specularIntensityMap: Se,
			transmission: pe,
			transmissionMap: V,
			thicknessMap: H,
			gradientMap: Ce,
			opaque: i.transparent === !1 && i.blending === 1 && i.alphaToCoverage === !1,
			alphaMap: we,
			alphaTest: Te,
			alphaHash: Ee,
			combine: i.combine,
			mapUv: F && m(i.map.channel),
			aoMapUv: te && m(i.aoMap.channel),
			lightMapUv: ne && m(i.lightMap.channel),
			bumpMapUv: re && m(i.bumpMap.channel),
			normalMapUv: L && m(i.normalMap.channel),
			displacementMapUv: ie && m(i.displacementMap.channel),
			emissiveMapUv: R && m(i.emissiveMap.channel),
			metalnessMapUv: ae && m(i.metalnessMap.channel),
			roughnessMapUv: oe && m(i.roughnessMap.channel),
			anisotropyMapUv: me && m(i.anisotropyMap.channel),
			clearcoatMapUv: he && m(i.clearcoatMap.channel),
			clearcoatNormalMapUv: ge && m(i.clearcoatNormalMap.channel),
			clearcoatRoughnessMapUv: _e && m(i.clearcoatRoughnessMap.channel),
			iridescenceMapUv: ve && m(i.iridescenceMap.channel),
			iridescenceThicknessMapUv: z && m(i.iridescenceThicknessMap.channel),
			sheenColorMapUv: ye && m(i.sheenColorMap.channel),
			sheenRoughnessMapUv: be && m(i.sheenRoughnessMap.channel),
			specularMapUv: xe && m(i.specularMap.channel),
			specularColorMapUv: B && m(i.specularColorMap.channel),
			specularIntensityMapUv: Se && m(i.specularIntensityMap.channel),
			transmissionMapUv: V && m(i.transmissionMap.channel),
			thicknessMapUv: H && m(i.thicknessMap.channel),
			alphaMapUv: we && m(i.alphaMap.channel),
			vertexTangents: !!v.attributes.tangent && (L || se),
			vertexNormals: !!v.attributes.normal,
			vertexColors: i.vertexColors,
			vertexAlphas: i.vertexColors === !0 && !!v.attributes.color && v.attributes.color.itemSize === 4,
			pointsUvs: h.isPoints === !0 && !!v.attributes.uv && (F || we),
			fog: !!_,
			useFog: i.fog === !0,
			fogExp2: !!_ && _.isFogExp2,
			flatShading: i.wireframe === !1 && (i.flatShading === !0 || v.attributes.normal === void 0 && L === !1 && (i.isMeshLambertMaterial || i.isMeshPhongMaterial || i.isMeshStandardMaterial || i.isMeshPhysicalMaterial)),
			sizeAttenuation: i.sizeAttenuation === !0,
			logarithmicDepthBuffer: d,
			reversedDepthBuffer: M,
			skinning: h.isSkinnedMesh === !0,
			hasPositionAttribute: v.attributes.position !== void 0,
			morphTargets: v.morphAttributes.position !== void 0,
			morphNormals: v.morphAttributes.normal !== void 0,
			morphColors: v.morphAttributes.color !== void 0,
			morphTargetsCount: T,
			morphTextureStride: E,
			numSunLights: o.sun.length,
			numDirLights: o.directional.length,
			numPointLights: o.point.length,
			numSpotLights: o.spot.length,
			numSpotLightMaps: o.spotLightMap.length,
			numRectAreaLights: o.rectArea.length,
			numHemiLights: o.hemi.length,
			numSunLightShadows: o.sunShadowMap.length,
			numDirLightShadows: o.directionalShadowMap.length,
			numPointLightShadows: o.pointShadowMap.length,
			numSpotLightShadows: o.spotShadowMap.length,
			numSpotLightShadowsWithMaps: o.numSpotLightShadowsWithMaps,
			numLightProbes: o.numLightProbes,
			numLightProbeGrids: g.length,
			numClippingPlanes: a.numPlanes,
			numClipIntersection: a.numIntersection,
			dithering: i.dithering,
			shadowMapEnabled: e.shadowMap.enabled && l.length > 0,
			shadowMapType: e.shadowMap.type,
			toneMapping: Oe,
			decodeVideoTexture: F && i.map.isVideoTexture === !0 && Y.getTransfer(i.map.colorSpace) === "srgb",
			decodeVideoTextureEmissive: R && i.emissiveMap.isVideoTexture === !0 && Y.getTransfer(i.emissiveMap.colorSpace) === "srgb",
			premultipliedAlpha: i.premultipliedAlpha,
			doubleSided: i.side === 2,
			flipSided: i.side === 1,
			useDepthPacking: i.depthPacking >= 0,
			depthPacking: i.depthPacking || 0,
			index0AttributeName: i.index0AttributeName,
			extensionClipCullDistance: De && i.extensions.clipCullDistance === !0 && n.has("WEBGL_clip_cull_distance"),
			extensionMultiDraw: (De && i.extensions.multiDraw === !0 || P) && n.has("WEBGL_multi_draw"),
			rendererExtensionParallelShaderCompile: n.has("KHR_parallel_shader_compile"),
			customProgramCacheKey: i.customProgramCacheKey()
		};
		return ke.vertexUv1s = c.has(1), ke.vertexUv2s = c.has(2), ke.vertexUv3s = c.has(3), c.clear(), ke;
	}
	function g(t) {
		let n = [];
		if (t.shaderID ? n.push(t.shaderID) : (n.push(t.customVertexShaderID), n.push(t.customFragmentShaderID)), t.defines !== void 0) for (let e in t.defines) n.push(e), n.push(t.defines[e]);
		return t.isRawShaderMaterial === !1 && (_(n, t), v(n, t), n.push(e.outputColorSpace)), n.push(t.customProgramCacheKey), n.join();
	}
	function _(e, t) {
		e.push(t.precision), e.push(t.outputColorSpace), e.push(t.envMapMode), e.push(t.envMapCubeUVHeight), e.push(t.mapUv), e.push(t.alphaMapUv), e.push(t.lightMapUv), e.push(t.aoMapUv), e.push(t.bumpMapUv), e.push(t.normalMapUv), e.push(t.displacementMapUv), e.push(t.emissiveMapUv), e.push(t.metalnessMapUv), e.push(t.roughnessMapUv), e.push(t.anisotropyMapUv), e.push(t.clearcoatMapUv), e.push(t.clearcoatNormalMapUv), e.push(t.clearcoatRoughnessMapUv), e.push(t.iridescenceMapUv), e.push(t.iridescenceThicknessMapUv), e.push(t.sheenColorMapUv), e.push(t.sheenRoughnessMapUv), e.push(t.specularMapUv), e.push(t.specularColorMapUv), e.push(t.specularIntensityMapUv), e.push(t.transmissionMapUv), e.push(t.thicknessMapUv), e.push(t.combine), e.push(t.fogExp2), e.push(t.sizeAttenuation), e.push(t.morphTargetsCount), e.push(t.morphAttributeCount), e.push(t.numSunLights), e.push(t.numDirLights), e.push(t.numPointLights), e.push(t.numSpotLights), e.push(t.numSpotLightMaps), e.push(t.numHemiLights), e.push(t.numRectAreaLights), e.push(t.numSunLightShadows), e.push(t.numDirLightShadows), e.push(t.numPointLightShadows), e.push(t.numSpotLightShadows), e.push(t.numSpotLightShadowsWithMaps), e.push(t.numLightProbes), e.push(t.shadowMapType), e.push(t.toneMapping), e.push(t.numClippingPlanes), e.push(t.numClipIntersection), e.push(t.depthPacking);
	}
	function v(e, t) {
		o.disableAll(), t.instancing && o.enable(0), t.instancingColor && o.enable(1), t.instancingMorph && o.enable(2), t.matcap && o.enable(3), t.envMap && o.enable(4), t.normalMapObjectSpace && o.enable(5), t.normalMapTangentSpace && o.enable(6), t.clearcoat && o.enable(7), t.iridescence && o.enable(8), t.alphaTest && o.enable(9), t.vertexColors && o.enable(10), t.vertexAlphas && o.enable(11), t.vertexUv1s && o.enable(12), t.vertexUv2s && o.enable(13), t.vertexUv3s && o.enable(14), t.vertexTangents && o.enable(15), t.anisotropy && o.enable(16), t.alphaHash && o.enable(17), t.batching && o.enable(18), t.dispersion && o.enable(19), t.retroreflection && o.enable(24), t.batchingColor && o.enable(20), t.gradientMap && o.enable(21), t.packedNormalMap && o.enable(22), t.vertexNormals && o.enable(23), e.push(o.mask), o.disableAll(), t.fog && o.enable(0), t.useFog && o.enable(1), t.flatShading && o.enable(2), t.logarithmicDepthBuffer && o.enable(3), t.reversedDepthBuffer && o.enable(4), t.skinning && o.enable(5), t.morphTargets && o.enable(6), t.morphNormals && o.enable(7), t.morphColors && o.enable(8), t.premultipliedAlpha && o.enable(9), t.shadowMapEnabled && o.enable(10), t.doubleSided && o.enable(11), t.flipSided && o.enable(12), t.useDepthPacking && o.enable(13), t.dithering && o.enable(14), t.transmission && o.enable(15), t.sheen && o.enable(16), t.opaque && o.enable(17), t.pointsUvs && o.enable(18), t.decodeVideoTexture && o.enable(19), t.decodeVideoTextureEmissive && o.enable(20), t.alphaToCoverage && o.enable(21), t.numLightProbeGrids > 0 && o.enable(22), t.hasPositionAttribute && o.enable(23), e.push(o.mask);
	}
	function y(e) {
		let t = p[e.type], n;
		if (t) {
			let e = km[t];
			n = Tp.clone(e.uniforms);
		} else n = e.uniforms;
		return n;
	}
	function b(t, n) {
		let r = u.get(n);
		return r === void 0 ? (r = new r_(e, n, t, i), l.push(r), u.set(n, r)) : ++r.usedTimes, r;
	}
	function x(e) {
		if (--e.usedTimes === 0) {
			let t = l.indexOf(e);
			l[t] = l[l.length - 1], l.pop(), u.delete(e.cacheKey), e.destroy();
		}
	}
	function S(e) {
		s.remove(e);
	}
	function C() {
		s.dispose();
	}
	return {
		getParameters: h,
		getProgramCacheKey: g,
		getUniforms: y,
		acquireProgram: b,
		releaseProgram: x,
		releaseShaderCache: S,
		programs: l,
		dispose: C
	};
}
function l_() {
	let e = /* @__PURE__ */ new WeakMap();
	function t(t) {
		return e.has(t);
	}
	function n(t) {
		let n = e.get(t);
		return n === void 0 && (n = {}, e.set(t, n)), n;
	}
	function r(t) {
		e.delete(t);
	}
	function i(t, n, r) {
		e.get(t)[n] = r;
	}
	function a() {
		e = /* @__PURE__ */ new WeakMap();
	}
	return {
		has: t,
		get: n,
		remove: r,
		update: i,
		dispose: a
	};
}
function u_(e, t) {
	return e.groupOrder === t.groupOrder ? e.renderOrder === t.renderOrder ? e.material.id === t.material.id ? e.materialVariant === t.materialVariant ? e.z === t.z ? e.id - t.id : e.z - t.z : e.materialVariant - t.materialVariant : e.material.id - t.material.id : e.renderOrder - t.renderOrder : e.groupOrder - t.groupOrder;
}
function d_(e, t) {
	return e.groupOrder === t.groupOrder ? e.renderOrder === t.renderOrder ? e.z === t.z ? e.id - t.id : t.z - e.z : e.renderOrder - t.renderOrder : e.groupOrder - t.groupOrder;
}
function f_() {
	let e = [], t = 0, n = [], r = [], i = [];
	function a() {
		t = 0, n.length = 0, r.length = 0, i.length = 0;
	}
	function o(e) {
		let t = 0;
		return e.isInstancedMesh && (t += 2), e.isSkinnedMesh && (t += 1), t;
	}
	function s(n, r, i, a, s, c) {
		let l = e[t];
		return l === void 0 ? (l = {
			id: n.id,
			object: n,
			geometry: r,
			material: i,
			materialVariant: o(n),
			groupOrder: a,
			renderOrder: n.renderOrder,
			z: s,
			group: c
		}, e[t] = l) : (l.id = n.id, l.object = n, l.geometry = r, l.material = i, l.materialVariant = o(n), l.groupOrder = a, l.renderOrder = n.renderOrder, l.z = s, l.group = c), t++, l;
	}
	function c(e, t, a, o, c, l, u) {
		u.reversedDepth === !0 && (c = -c);
		let d = s(e, t, a, o, c, l);
		a.transmission > 0 ? r.push(d) : a.transparent === !0 ? i.push(d) : n.push(d);
	}
	function l(e, t, a, o, c, l) {
		let u = s(e, t, a, o, c, l);
		a.transmission > 0 ? r.unshift(u) : a.transparent === !0 ? i.unshift(u) : n.unshift(u);
	}
	function u(e, t) {
		n.length > 1 && n.sort(e || u_), r.length > 1 && r.sort(t || d_), i.length > 1 && i.sort(t || d_);
	}
	function d() {
		for (let n = t, r = e.length; n < r; n++) {
			let t = e[n];
			if (t.id === null) break;
			t.id = null, t.object = null, t.geometry = null, t.material = null, t.group = null;
		}
	}
	return {
		opaque: n,
		transmissive: r,
		transparent: i,
		init: a,
		push: c,
		unshift: l,
		finish: d,
		sort: u
	};
}
function p_() {
	let e = /* @__PURE__ */ new WeakMap();
	function t(t, n) {
		let r = e.get(t), i;
		return r === void 0 ? (i = new f_(), e.set(t, [i])) : n >= r.length ? (i = new f_(), r.push(i)) : i = r[n], i;
	}
	function n() {
		e = /* @__PURE__ */ new WeakMap();
	}
	return {
		get: t,
		dispose: n
	};
}
function m_() {
	let e = {};
	return { get: function(t) {
		if (e[t.id] !== void 0) return e[t.id];
		let n;
		switch (t.type) {
			case "SunLight":
			case "DirectionalLight":
				n = {
					direction: new q(),
					color: new X()
				};
				break;
			case "SpotLight":
				n = {
					position: new q(),
					direction: new q(),
					color: new X(),
					distance: 0,
					coneCos: 0,
					penumbraCos: 0,
					decay: 0
				};
				break;
			case "PointLight":
				n = {
					position: new q(),
					color: new X(),
					distance: 0,
					decay: 0
				};
				break;
			case "HemisphereLight":
				n = {
					direction: new q(),
					skyColor: new X(),
					groundColor: new X()
				};
				break;
			case "RectAreaLight": n = {
				color: new X(),
				position: new q(),
				halfWidth: new q(),
				halfHeight: new q()
			};
		}
		return e[t.id] = n, n;
	} };
}
function h_() {
	let e = {};
	return { get: function(t) {
		if (e[t.id] !== void 0) return e[t.id];
		let n;
		switch (t.type) {
			case "SunLight":
			case "DirectionalLight":
				n = {
					shadowIntensity: 1,
					shadowBias: 0,
					shadowNormalBias: 0,
					shadowRadius: 1,
					shadowMapSize: new K()
				};
				break;
			case "SpotLight":
				n = {
					shadowIntensity: 1,
					shadowBias: 0,
					shadowNormalBias: 0,
					shadowRadius: 1,
					shadowMapSize: new K()
				};
				break;
			case "PointLight": n = {
				shadowIntensity: 1,
				shadowBias: 0,
				shadowNormalBias: 0,
				shadowRadius: 1,
				shadowMapSize: new K(),
				shadowCameraNear: 1,
				shadowCameraFar: 1e3
			};
		}
		return e[t.id] = n, n;
	} };
}
var g_ = 0;
function __(e, t) {
	return (t.castShadow ? 2 : 0) - (e.castShadow ? 2 : 0) + +!!t.map - !!e.map;
}
function v_(e) {
	let t = new m_(), n = h_(), r = {
		version: 0,
		hash: {
			sunLength: -1,
			directionalLength: -1,
			pointLength: -1,
			spotLength: -1,
			rectAreaLength: -1,
			hemiLength: -1,
			numSunShadows: -1,
			numDirectionalShadows: -1,
			numPointShadows: -1,
			numSpotShadows: -1,
			numSpotMaps: -1,
			numLightProbes: -1
		},
		ambient: [
			0,
			0,
			0
		],
		probe: [],
		sun: [],
		sunShadow: [],
		sunShadowMap: [],
		sunShadowMatrix: [],
		sunShadowCascade: [],
		directional: [],
		directionalShadow: [],
		directionalShadowMap: [],
		directionalShadowMatrix: [],
		spot: [],
		spotLightMap: [],
		spotShadow: [],
		spotShadowMap: [],
		spotLightMatrix: [],
		rectArea: [],
		rectAreaLTC1: null,
		rectAreaLTC2: null,
		point: [],
		pointShadow: [],
		pointShadowMap: [],
		pointShadowMatrix: [],
		hemi: [],
		numSpotLightShadowsWithMaps: 0,
		numLightProbes: 0
	};
	for (let e = 0; e < 9; e++) r.probe.push(new q());
	let i = new q(), a = new Pu(), o = new Pu();
	function s(i) {
		let a = 0, o = 0, s = 0;
		for (let e = 0; e < 9; e++) r.probe[e].set(0, 0, 0);
		let c = 0, l = 0, u = 0, d = 0, f = 0, p = 0, m = 0, h = 0, g = 0, _ = 0, v = 0, y = 0, b = 0, x = 0;
		i.sort(__);
		for (let e = 0, S = i.length; e < S; e++) {
			let S = i[e], C = S.color, w = S.intensity, T = S.distance, E = null;
			if (S.shadow && S.shadow.map && (E = S.shadow.map.texture.format === 1030 ? S.shadow.map.texture : S.shadow.map.depthTexture || S.shadow.map.texture), S.isAmbientLight) a += C.r * w, o += C.g * w, s += C.b * w;
			else if (S.isLightProbe) {
				for (let e = 0; e < 9; e++) r.probe[e].addScaledVector(S.sh.coefficients[e], w);
				x++;
			} else if (S.isSunLight) {
				let e = t.get(S);
				if (e.color.copy(S.color).multiplyScalar(S.intensity), S.castShadow) {
					let e = S.shadow, t = n.get(S);
					t.shadowIntensity = e.intensity, t.shadowBias = e.bias, t.shadowNormalBias = e.normalBias, t.shadowRadius = e.radius, t.shadowMapSize.copy(e.mapSize).multiply(e.getFrameExtents()), r.sunShadow[l] = t, r.sunShadowMap[l] = E;
					let i = e.getViewportCount();
					for (let t = 0; t < i; t++) r.sunShadowMatrix[u + t] = e.getMatrix(t), r.sunShadowCascade[u + t] = e._cascadeData[t];
					u += i, l++;
				}
				r.sun[c] = e, c++;
			} else if (S.isDirectionalLight) {
				let e = t.get(S);
				if (e.color.copy(S.color).multiplyScalar(S.intensity), S.castShadow) {
					let e = S.shadow, t = n.get(S);
					t.shadowIntensity = e.intensity, t.shadowBias = e.bias, t.shadowNormalBias = e.normalBias, t.shadowRadius = e.radius, t.shadowMapSize = e.mapSize, r.directionalShadow[d] = t, r.directionalShadowMap[d] = E, r.directionalShadowMatrix[d] = S.shadow.matrix, g++;
				}
				r.directional[d] = e, d++;
			} else if (S.isSpotLight) {
				let e = t.get(S);
				e.position.setFromMatrixPosition(S.matrixWorld), e.color.copy(C).multiplyScalar(w), e.distance = T, e.coneCos = Math.cos(S.angle), e.penumbraCos = Math.cos(S.angle * (1 - S.penumbra)), e.decay = S.decay, r.spot[p] = e;
				let i = S.shadow;
				if (S.map && (r.spotLightMap[y] = S.map, y++, i.updateMatrices(S), S.castShadow && b++), r.spotLightMatrix[p] = i.matrix, S.castShadow) {
					let e = n.get(S);
					e.shadowIntensity = i.intensity, e.shadowBias = i.bias, e.shadowNormalBias = i.normalBias, e.shadowRadius = i.radius, e.shadowMapSize = i.mapSize, r.spotShadow[p] = e, r.spotShadowMap[p] = E, v++;
				}
				p++;
			} else if (S.isRectAreaLight) {
				let e = t.get(S);
				e.color.copy(C).multiplyScalar(w), e.halfWidth.set(S.width * .5, 0, 0), e.halfHeight.set(0, S.height * .5, 0), r.rectArea[m] = e, m++;
			} else if (S.isPointLight) {
				let e = t.get(S);
				if (e.color.copy(S.color).multiplyScalar(S.intensity), e.distance = S.distance, e.decay = S.decay, S.castShadow) {
					let e = S.shadow, t = n.get(S);
					t.shadowIntensity = e.intensity, t.shadowBias = e.bias, t.shadowNormalBias = e.normalBias, t.shadowRadius = e.radius, t.shadowMapSize = e.mapSize, t.shadowCameraNear = e.camera.near, t.shadowCameraFar = e.camera.far, r.pointShadow[f] = t, r.pointShadowMap[f] = E, r.pointShadowMatrix[f] = S.shadow.matrix, _++;
				}
				r.point[f] = e, f++;
			} else if (S.isHemisphereLight) {
				let e = t.get(S);
				e.skyColor.copy(S.color).multiplyScalar(w), e.groundColor.copy(S.groundColor).multiplyScalar(w), r.hemi[h] = e, h++;
			}
		}
		m > 0 && (e.has("OES_texture_float_linear") === !0 ? (r.rectAreaLTC1 = Q.LTC_FLOAT_1, r.rectAreaLTC2 = Q.LTC_FLOAT_2) : (r.rectAreaLTC1 = Q.LTC_HALF_1, r.rectAreaLTC2 = Q.LTC_HALF_2)), r.ambient[0] = a, r.ambient[1] = o, r.ambient[2] = s;
		let S = r.hash;
		(S.sunLength !== c || S.directionalLength !== d || S.pointLength !== f || S.spotLength !== p || S.rectAreaLength !== m || S.hemiLength !== h || S.numSunShadows !== l || S.numDirectionalShadows !== g || S.numPointShadows !== _ || S.numSpotShadows !== v || S.numSpotMaps !== y || S.numLightProbes !== x) && (r.sun.length = c, r.directional.length = d, r.spot.length = p, r.rectArea.length = m, r.point.length = f, r.hemi.length = h, r.sunShadow.length = l, r.sunShadowMap.length = l, r.sunShadowMatrix.length = u, r.sunShadowCascade.length = u, r.directionalShadow.length = g, r.directionalShadowMap.length = g, r.directionalShadowMatrix.length = g, r.pointShadow.length = _, r.pointShadowMap.length = _, r.pointShadowMatrix.length = _, r.spotShadow.length = v, r.spotShadowMap.length = v, r.spotLightMatrix.length = v + y - b, r.spotLightMap.length = y, r.numSpotLightShadowsWithMaps = b, r.numLightProbes = x, S.sunLength = c, S.directionalLength = d, S.pointLength = f, S.spotLength = p, S.rectAreaLength = m, S.hemiLength = h, S.numSunShadows = l, S.numDirectionalShadows = g, S.numPointShadows = _, S.numSpotShadows = v, S.numSpotMaps = y, S.numLightProbes = x, r.version = g_++);
	}
	function c(e, t) {
		let n = 0, s = 0, c = 0, l = 0, u = 0, d = 0, f = t.matrixWorldInverse;
		for (let t = 0, p = e.length; t < p; t++) {
			let p = e[t];
			if (p.isSunLight) {
				let e = r.sun[n];
				e.direction.setFromMatrixPosition(p.matrixWorld), e.direction.transformDirection(f), n++;
			} else if (p.isDirectionalLight) {
				let e = r.directional[s];
				e.direction.setFromMatrixPosition(p.matrixWorld), i.setFromMatrixPosition(p.target.matrixWorld), e.direction.sub(i), e.direction.transformDirection(f), s++;
			} else if (p.isSpotLight) {
				let e = r.spot[l];
				e.position.setFromMatrixPosition(p.matrixWorld), e.position.applyMatrix4(f), e.direction.setFromMatrixPosition(p.matrixWorld), i.setFromMatrixPosition(p.target.matrixWorld), e.direction.sub(i), e.direction.transformDirection(f), l++;
			} else if (p.isRectAreaLight) {
				let e = r.rectArea[u];
				e.position.setFromMatrixPosition(p.matrixWorld), e.position.applyMatrix4(f), o.identity(), a.copy(p.matrixWorld), a.premultiply(f), o.extractRotation(a), e.halfWidth.set(p.width * .5, 0, 0), e.halfHeight.set(0, p.height * .5, 0), e.halfWidth.applyMatrix4(o), e.halfHeight.applyMatrix4(o), u++;
			} else if (p.isPointLight) {
				let e = r.point[c];
				e.position.setFromMatrixPosition(p.matrixWorld), e.position.applyMatrix4(f), c++;
			} else if (p.isHemisphereLight) {
				let e = r.hemi[d];
				e.direction.setFromMatrixPosition(p.matrixWorld), e.direction.transformDirection(f), d++;
			}
		}
	}
	return {
		setup: s,
		setupView: c,
		state: r
	};
}
function y_(e) {
	let t = new v_(e), n = [], r = [], i = [];
	function a(e) {
		d.camera = e, n.length = 0, r.length = 0, i.length = 0;
	}
	function o(e) {
		n.push(e);
	}
	function s(e) {
		r.push(e);
	}
	function c(e) {
		i.push(e);
	}
	function l() {
		t.setup(n);
	}
	function u(e) {
		t.setupView(n, e);
	}
	let d = {
		lightsArray: n,
		shadowsArray: r,
		lightProbeGridArray: i,
		camera: null,
		lights: t,
		transmissionRenderTarget: {},
		textureUnits: 0
	};
	return {
		init: a,
		state: d,
		setupLights: l,
		setupLightsView: u,
		pushLight: o,
		pushShadow: s,
		pushLightProbeGrid: c
	};
}
function b_(e) {
	let t = /* @__PURE__ */ new WeakMap();
	function n(n, r = 0) {
		let i = t.get(n), a;
		return i === void 0 ? (a = new y_(e), t.set(n, [a])) : r >= i.length ? (a = new y_(e), i.push(a)) : a = i[r], a;
	}
	function r() {
		t = /* @__PURE__ */ new WeakMap();
	}
	return {
		get: n,
		dispose: r
	};
}
var x_ = "void main() {\n	gl_Position = vec4( position, 1.0 );\n}", S_ = "uniform sampler2D shadow_pass;\nuniform vec2 resolution;\nuniform float radius;\nvoid main() {\n	const float samples = float( VSM_SAMPLES );\n	float mean = 0.0;\n	float squared_mean = 0.0;\n	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );\n	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;\n	for ( float i = 0.0; i < samples; i ++ ) {\n		float uvOffset = uvStart + i * uvStride;\n		#ifdef HORIZONTAL_PASS\n			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;\n			mean += distribution.x;\n			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;\n		#else\n			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;\n			mean += depth;\n			squared_mean += depth * depth;\n		#endif\n	}\n	mean = mean / samples;\n	squared_mean = squared_mean / samples;\n	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );\n	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );\n}", C_ = [
	/*@__PURE__*/ new q(1, 0, 0),
	/*@__PURE__*/ new q(-1, 0, 0),
	/*@__PURE__*/ new q(0, 1, 0),
	/*@__PURE__*/ new q(0, -1, 0),
	/*@__PURE__*/ new q(0, 0, 1),
	/*@__PURE__*/ new q(0, 0, -1)
], w_ = [
	/*@__PURE__*/ new q(0, -1, 0),
	/*@__PURE__*/ new q(0, -1, 0),
	/*@__PURE__*/ new q(0, 0, 1),
	/*@__PURE__*/ new q(0, 0, -1),
	/*@__PURE__*/ new q(0, -1, 0),
	/*@__PURE__*/ new q(0, -1, 0)
], T_ = /*@__PURE__*/ new Pu(), E_ = /*@__PURE__*/ new q(), D_ = /*@__PURE__*/ new q();
function O_(e, t, n) {
	let r = new Hf(), i = new K(), a = new K(), o = new ku(), s = new Ap(), c = new jp(), l = {}, u = n.maxTextureSize, d = {
		0: 1,
		1: 0,
		2: 2
	}, f = new Op({
		defines: { VSM_SAMPLES: 8 },
		uniforms: {
			shadow_pass: { value: null },
			resolution: { value: new K() },
			radius: { value: 4 }
		},
		vertexShader: x_,
		fragmentShader: S_
	}), p = f.clone();
	p.defines.HORIZONTAL_PASS = 1;
	let m = new df();
	m.setAttribute("position", new Yd(new Float32Array([
		-1,
		-1,
		.5,
		3,
		-1,
		.5,
		-1,
		3,
		.5
	]), 3));
	let h = new Ff(m, f), g = this;
	this.enabled = !1, this.autoUpdate = !0, this.needsUpdate = !1, this.type = 1;
	let _ = this.type;
	this.render = function(t, n, s) {
		if (g.enabled === !1 || g.autoUpdate === !1 && g.needsUpdate === !1 || t.length === 0) return;
		this.type === 2 && (U("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."), this.type = 1);
		let c = e.getRenderTarget(), l = e.getActiveCubeFace(), d = e.getActiveMipmapLevel(), f = e.state;
		f.setBlending(0), f.buffers.depth.getReversed() === !0 ? f.buffers.color.setClear(0, 0, 0, 0) : f.buffers.color.setClear(1, 1, 1, 1), f.buffers.depth.setTest(!0), f.setScissorTest(!1);
		let p = _ !== this.type;
		p && n.traverse(function(e) {
			e.material && (Array.isArray(e.material) ? e.material.forEach((e) => e.needsUpdate = !0) : e.material.needsUpdate = !0);
		});
		for (let c = 0, l = t.length; c < l; c++) {
			let l = t[c], d = l.shadow;
			if (d === void 0) {
				U("WebGLShadowMap:", l, "has no shadow.");
				continue;
			}
			if (d.autoUpdate === !1 && d.needsUpdate === !1) continue;
			i.copy(d.mapSize);
			let m = d.getFrameExtents();
			i.multiply(m), a.copy(d.mapSize), (i.x > u || i.y > u) && (i.x > u && (a.x = Math.floor(u / m.x), i.x = a.x * m.x, d.mapSize.x = a.x), i.y > u && (a.y = Math.floor(u / m.y), i.y = a.y * m.y, d.mapSize.y = a.y));
			let h = e.state.buffers.depth.getReversed();
			if (d.camera._reversedDepth = h, d.map === null || p === !0) {
				if (d.map !== null && (d.map.depthTexture !== null && (d.map.depthTexture.dispose(), d.map.depthTexture = null), d.map.dispose()), this.type === 3) {
					if (l.isPointLight) {
						U("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");
						continue;
					}
					d.map = new ju(i.x, i.y, {
						format: Dc,
						type: mc,
						minFilter: ic,
						magFilter: ic,
						generateMipmaps: !1
					}), d.map.texture.name = l.name + ".shadowMap", d.map.depthTexture = new up(i.x, i.y, pc), d.map.depthTexture.name = l.name + ".shadowMapDepth", d.map.depthTexture.format = Cc, d.map.depthTexture.compareFunction = null, d.map.depthTexture.minFilter = tc, d.map.depthTexture.magFilter = tc;
				} else l.isPointLight ? (d.map = new ah(i.x), d.map.depthTexture = new dp(i.x, fc)) : (d.map = new ju(i.x, i.y), d.map.depthTexture = new up(i.x, i.y, fc)), d.map.depthTexture.name = l.name + ".shadowMap", d.map.depthTexture.format = Cc, this.type === 1 ? (d.map.depthTexture.compareFunction = h ? 518 : 515, d.map.depthTexture.minFilter = ic, d.map.depthTexture.magFilter = ic) : (d.map.depthTexture.compareFunction = null, d.map.depthTexture.minFilter = tc, d.map.depthTexture.magFilter = tc);
				d.camera.updateProjectionMatrix();
			}
			d.map.isWebGLCubeRenderTarget !== !0 && (d.map.width !== i.x || d.map.height !== i.y) && d.map.setSize(i.x, i.y);
			let g = d.map.isWebGLCubeRenderTarget ? 6 : d.getViewportCount();
			l.isPointLight !== !0 && d.updateMatrices(l, s);
			for (let t = 0; t < g; t++) {
				let i = d.getCamera(t);
				if (l.isPointLight) {
					let e = d.camera, n = d.matrix, r = l.distance || e.far;
					r !== e.far && (e.far = r, e.updateProjectionMatrix()), E_.setFromMatrixPosition(l.matrixWorld), e.position.copy(E_), D_.copy(e.position), D_.add(C_[t]), e.up.copy(w_[t]), e.lookAt(D_), e.updateMatrixWorld(), n.makeTranslation(-E_.x, -E_.y, -E_.z), T_.multiplyMatrices(e.projectionMatrix, e.matrixWorldInverse), d._frustum.setFromProjectionMatrix(T_, e.coordinateSystem, e.reversedDepth);
				}
				if (d.map.isWebGLCubeRenderTarget) e.setRenderTarget(d.map, t), e.clear();
				else {
					t === 0 && (e.setRenderTarget(d.map), e.clear());
					let n = d.getViewport(t);
					o.set(a.x * n.x, a.y * n.y, a.x * n.z, a.y * n.w), f.viewport(o);
				}
				r = d.getFrustum(t), b(n, s, i, l, this.type);
			}
			d.isPointLightShadow !== !0 && this.type === 3 && v(d, s), d.needsUpdate = !1;
		}
		_ = this.type, g.needsUpdate = !1, e.setRenderTarget(c, l, d);
	};
	function v(n, r) {
		let a = t.update(h);
		f.defines.VSM_SAMPLES !== n.blurSamples && (f.defines.VSM_SAMPLES = n.blurSamples, p.defines.VSM_SAMPLES = n.blurSamples, f.needsUpdate = !0, p.needsUpdate = !0), n.mapPass === null ? n.mapPass = new ju(i.x, i.y, {
			format: Dc,
			type: mc
		}) : (n.mapPass.width !== n.map.width || n.mapPass.height !== n.map.height) && n.mapPass.setSize(n.map.width, n.map.height), f.uniforms.shadow_pass.value = n.map.depthTexture, f.uniforms.resolution.value.set(n.map.width, n.map.height), f.uniforms.radius.value = n.radius, e.setRenderTarget(n.mapPass), e.clear(), e.renderBufferDirect(r, null, a, f, h, null), p.uniforms.shadow_pass.value = n.mapPass.texture, p.uniforms.resolution.value.set(n.map.width, n.map.height), p.uniforms.radius.value = n.radius, e.setRenderTarget(n.map), e.clear(), e.renderBufferDirect(r, null, a, p, h, null);
	}
	function y(t, n, r, i) {
		let a = null, o = r.isPointLight === !0 ? t.customDistanceMaterial : t.customDepthMaterial;
		if (o !== void 0) a = o;
		else if (a = r.isPointLight === !0 ? c : s, e.localClippingEnabled && n.clipShadows === !0 && Array.isArray(n.clippingPlanes) && n.clippingPlanes.length !== 0 || n.displacementMap && n.displacementScale !== 0 || n.alphaMap && n.alphaTest > 0 || n.map && n.alphaTest > 0 || n.alphaToCoverage === !0) {
			let e = a.uuid, t = n.uuid, r = l[e];
			r === void 0 && (r = {}, l[e] = r);
			let i = r[t];
			i === void 0 && (i = a.clone(), r[t] = i, n.addEventListener("dispose", x)), a = i;
		}
		if (a.visible = n.visible, a.wireframe = n.wireframe, i === 3 ? a.side = n.shadowSide === null ? n.side : n.shadowSide : a.side = n.shadowSide === null ? d[n.side] : n.shadowSide, a.alphaMap = n.alphaMap, a.alphaTest = n.alphaToCoverage === !0 ? .5 : n.alphaTest, a.map = n.map, a.clipShadows = n.clipShadows, a.clippingPlanes = n.clippingPlanes, a.clipIntersection = n.clipIntersection, a.displacementMap = n.displacementMap, a.displacementScale = n.displacementScale, a.displacementBias = n.displacementBias, a.wireframeLinewidth = n.wireframeLinewidth, a.linewidth = n.linewidth, r.isPointLight === !0 && a.isMeshDistanceMaterial === !0) {
			let t = e.properties.get(a);
			t.light = r;
		}
		return a;
	}
	function b(n, i, a, o, s) {
		if (n.visible === !1) return;
		if (n.layers.test(i.layers) && (n.isMesh || n.isLine || n.isPoints) && (n.castShadow || n.receiveShadow && s === 3) && (!n.frustumCulled || n.intersectsFrustum(r))) {
			n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse, n.matrixWorld);
			let r = t.update(n), c = n.material;
			if (Array.isArray(c)) {
				let t = r.groups;
				for (let l = 0, u = t.length; l < u; l++) {
					let u = t[l], d = c[u.materialIndex];
					if (d && d.visible) {
						let t = y(n, d, o, s);
						n.onBeforeShadow(e, n, i, a, r, t, u), e.renderBufferDirect(a, null, r, t, n, u), n.onAfterShadow(e, n, i, a, r, t, u);
					}
				}
			} else if (c.visible) {
				let t = y(n, c, o, s);
				n.onBeforeShadow(e, n, i, a, r, t, null), e.renderBufferDirect(a, null, r, t, n, null), n.onAfterShadow(e, n, i, a, r, t, null);
			}
		}
		let c = n.children;
		for (let e = 0, t = c.length; e < t; e++) b(c[e], i, a, o, s);
	}
	function x(e) {
		e.target.removeEventListener("dispose", x);
		for (let t in l) {
			let n = l[t], r = e.target.uuid;
			r in n && (n[r].dispose(), delete n[r]);
		}
	}
}
function k_(e, t) {
	function n() {
		let t = !1, n = new ku(), r = null, i = new ku(0, 0, 0, 0);
		return {
			setMask: function(n) {
				r !== n && !t && (e.colorMask(n, n, n, n), r = n);
			},
			setLocked: function(e) {
				t = e;
			},
			setClear: function(t, r, a, o, s) {
				s === !0 && (t *= o, r *= o, a *= o), n.set(t, r, a, o), i.equals(n) === !1 && (e.clearColor(t, r, a, o), i.copy(n));
			},
			reset: function() {
				t = !1, r = null, i.set(-1, 0, 0, 0);
			}
		};
	}
	function r() {
		let n = !1, r = !1, i = null, a = null, o = null;
		return {
			setReversed: function(e) {
				if (r !== e) {
					let n = t.get("EXT_clip_control");
					e ? n.clipControlEXT(n.LOWER_LEFT_EXT, n.ZERO_TO_ONE_EXT) : n.clipControlEXT(n.LOWER_LEFT_EXT, n.NEGATIVE_ONE_TO_ONE_EXT), r = e;
					let i = o;
					o = null, this.setClear(i);
				}
			},
			getReversed: function() {
				return r;
			},
			setTest: function(t) {
				t ? ae(e.DEPTH_TEST) : oe(e.DEPTH_TEST);
			},
			setMask: function(t) {
				i !== t && !n && (e.depthMask(t), i = t);
			},
			setFunc: function(t) {
				if (r && (t = Rl[t]), a !== t) {
					switch (t) {
						case 0:
							e.depthFunc(e.NEVER);
							break;
						case 1:
							e.depthFunc(e.ALWAYS);
							break;
						case 2:
							e.depthFunc(e.LESS);
							break;
						case 3:
							e.depthFunc(e.LEQUAL);
							break;
						case 4:
							e.depthFunc(e.EQUAL);
							break;
						case 5:
							e.depthFunc(e.GEQUAL);
							break;
						case 6:
							e.depthFunc(e.GREATER);
							break;
						case 7:
							e.depthFunc(e.NOTEQUAL);
							break;
						default: e.depthFunc(e.LEQUAL);
					}
					a = t;
				}
			},
			setLocked: function(e) {
				n = e;
			},
			setClear: function(t) {
				o !== t && (o = t, r && (t = 1 - t), e.clearDepth(t));
			},
			reset: function() {
				n = !1, i = null, a = null, o = null, r = !1;
			}
		};
	}
	function i() {
		let t = !1, n = null, r = null, i = null, a = null, o = null, s = null, c = null, l = null;
		return {
			setTest: function(n) {
				t || (n ? ae(e.STENCIL_TEST) : oe(e.STENCIL_TEST));
			},
			setMask: function(r) {
				n !== r && !t && (e.stencilMask(r), n = r);
			},
			setFunc: function(t, n, o) {
				(r !== t || i !== n || a !== o) && (e.stencilFunc(t, n, o), r = t, i = n, a = o);
			},
			setOp: function(t, n, r) {
				(o !== t || s !== n || c !== r) && (e.stencilOp(t, n, r), o = t, s = n, c = r);
			},
			setLocked: function(e) {
				t = e;
			},
			setClear: function(t) {
				l !== t && (e.clearStencil(t), l = t);
			},
			reset: function() {
				t = !1, n = null, r = null, i = null, a = null, o = null, s = null, c = null, l = null;
			}
		};
	}
	let a = new n(), o = new r(), s = new i(), c = /* @__PURE__ */ new WeakMap(), l = /* @__PURE__ */ new WeakMap(), u = {}, d = {}, f = {}, p = /* @__PURE__ */ new WeakMap(), m = [], h = null, g = !1, _ = null, v = null, y = null, b = null, x = null, S = null, C = null, w = new X(0, 0, 0), T = 0, E = !1, D = null, O = null, k = null, A = null, j = null, M = e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS), N = !1, P = 0, F = e.getParameter(e.VERSION);
	F.indexOf("WebGL") === -1 ? F.indexOf("OpenGL ES") !== -1 && (P = parseFloat(/^OpenGL ES (\d)/.exec(F)[1]), N = P >= 2) : (P = parseFloat(/^WebGL (\d)/.exec(F)[1]), N = P >= 1);
	let I = null, ee = {}, te = e.getParameter(e.SCISSOR_BOX), ne = e.getParameter(e.VIEWPORT), re = new ku().fromArray(te), L = new ku().fromArray(ne);
	function ie(t, n, r, i) {
		let a = /* @__PURE__ */ new Uint8Array(4), o = e.createTexture();
		e.bindTexture(t, o), e.texParameteri(t, e.TEXTURE_MIN_FILTER, e.NEAREST), e.texParameteri(t, e.TEXTURE_MAG_FILTER, e.NEAREST);
		for (let o = 0; o < r; o++) t === e.TEXTURE_3D || t === e.TEXTURE_2D_ARRAY ? e.texImage3D(n, 0, e.RGBA, 1, 1, i, 0, e.RGBA, e.UNSIGNED_BYTE, a) : e.texImage2D(n + o, 0, e.RGBA, 1, 1, 0, e.RGBA, e.UNSIGNED_BYTE, a);
		return o;
	}
	let R = {};
	R[e.TEXTURE_2D] = ie(e.TEXTURE_2D, e.TEXTURE_2D, 1), R[e.TEXTURE_CUBE_MAP] = ie(e.TEXTURE_CUBE_MAP, e.TEXTURE_CUBE_MAP_POSITIVE_X, 6), R[e.TEXTURE_2D_ARRAY] = ie(e.TEXTURE_2D_ARRAY, e.TEXTURE_2D_ARRAY, 1, 1), R[e.TEXTURE_3D] = ie(e.TEXTURE_3D, e.TEXTURE_3D, 1, 1), a.setClear(0, 0, 0, 1), o.setClear(1), s.setClear(0), ae(e.DEPTH_TEST), o.setFunc(3), me(!1), he(1), ae(e.CULL_FACE), fe(0);
	function ae(t) {
		u[t] !== !0 && (e.enable(t), u[t] = !0);
	}
	function oe(t) {
		u[t] !== !1 && (e.disable(t), u[t] = !1);
	}
	function se(t, n) {
		return f[t] !== n && (e.bindFramebuffer(t, n), f[t] = n, t === e.DRAW_FRAMEBUFFER && (f[e.FRAMEBUFFER] = n), t === e.FRAMEBUFFER && (f[e.DRAW_FRAMEBUFFER] = n), !0);
	}
	function ce(t, n) {
		let r = m, i = !1;
		if (t) {
			r = p.get(n), r === void 0 && (r = [], p.set(n, r));
			let a = t.textures;
			if (r.length !== a.length || r[0] !== e.COLOR_ATTACHMENT0) {
				for (let t = 0, n = a.length; t < n; t++) r[t] = e.COLOR_ATTACHMENT0 + t;
				r.length = a.length, i = !0;
			}
		} else r[0] !== e.BACK && (r[0] = e.BACK, i = !0);
		i && e.drawBuffers(r);
	}
	function le(t) {
		return h !== t && (e.useProgram(t), h = t, !0);
	}
	let ue = {
		100: e.FUNC_ADD,
		101: e.FUNC_SUBTRACT,
		102: e.FUNC_REVERSE_SUBTRACT
	};
	ue[103] = e.MIN, ue[104] = e.MAX;
	let de = {
		200: e.ZERO,
		201: e.ONE,
		202: e.SRC_COLOR,
		204: e.SRC_ALPHA,
		210: e.SRC_ALPHA_SATURATE,
		208: e.DST_COLOR,
		206: e.DST_ALPHA,
		203: e.ONE_MINUS_SRC_COLOR,
		205: e.ONE_MINUS_SRC_ALPHA,
		209: e.ONE_MINUS_DST_COLOR,
		207: e.ONE_MINUS_DST_ALPHA,
		211: e.CONSTANT_COLOR,
		212: e.ONE_MINUS_CONSTANT_COLOR,
		213: e.CONSTANT_ALPHA,
		214: e.ONE_MINUS_CONSTANT_ALPHA
	};
	function fe(t, n, r, i, a, o, s, c, l, u) {
		if (t === 0) g === !0 && (oe(e.BLEND), g = !1);
		else if (g === !1 && (ae(e.BLEND), g = !0), t !== 5) {
			if (t !== _ || u !== E) {
				if ((v !== 100 || x !== 100) && (e.blendEquation(e.FUNC_ADD), v = 100, x = 100), u) switch (t) {
					case 1:
						e.blendFuncSeparate(e.ONE, e.ONE_MINUS_SRC_ALPHA, e.ONE, e.ONE_MINUS_SRC_ALPHA);
						break;
					case 2:
						e.blendFunc(e.ONE, e.ONE);
						break;
					case 3:
						e.blendFuncSeparate(e.ZERO, e.ONE_MINUS_SRC_COLOR, e.ZERO, e.ONE);
						break;
					case 4:
						e.blendFuncSeparate(e.DST_COLOR, e.ONE_MINUS_SRC_ALPHA, e.ZERO, e.ONE);
						break;
					default: W("WebGLState: Invalid blending: ", t);
				}
				else switch (t) {
					case 1:
						e.blendFuncSeparate(e.SRC_ALPHA, e.ONE_MINUS_SRC_ALPHA, e.ONE, e.ONE_MINUS_SRC_ALPHA);
						break;
					case 2:
						e.blendFuncSeparate(e.SRC_ALPHA, e.ONE, e.ONE, e.ONE);
						break;
					case 3:
						W("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");
						break;
					case 4:
						W("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");
						break;
					default: W("WebGLState: Invalid blending: ", t);
				}
				y = null, b = null, S = null, C = null, w.set(0, 0, 0), T = 0, _ = t, E = u;
			}
		} else a ||= n, o ||= r, s ||= i, (n !== v || a !== x) && (e.blendEquationSeparate(ue[n], ue[a]), v = n, x = a), (r !== y || i !== b || o !== S || s !== C) && (e.blendFuncSeparate(de[r], de[i], de[o], de[s]), y = r, b = i, S = o, C = s), (c.equals(w) === !1 || l !== T) && (e.blendColor(c.r, c.g, c.b, l), w.copy(c), T = l), _ = t, E = !1;
	}
	function pe(t, n) {
		t.side === 2 ? oe(e.CULL_FACE) : ae(e.CULL_FACE);
		let r = t.side === 1;
		n && (r = !r), me(r), t.blending === 1 && t.transparent === !1 ? fe(0) : fe(t.blending, t.blendEquation, t.blendSrc, t.blendDst, t.blendEquationAlpha, t.blendSrcAlpha, t.blendDstAlpha, t.blendColor, t.blendAlpha, t.premultipliedAlpha), o.setFunc(t.depthFunc), o.setTest(t.depthTest), o.setMask(t.depthWrite), a.setMask(t.colorWrite);
		let i = t.stencilWrite;
		s.setTest(i), i && (s.setMask(t.stencilWriteMask), s.setFunc(t.stencilFunc, t.stencilRef, t.stencilFuncMask), s.setOp(t.stencilFail, t.stencilZFail, t.stencilZPass)), _e(t.polygonOffset, t.polygonOffsetFactor, t.polygonOffsetUnits), t.alphaToCoverage === !0 ? ae(e.SAMPLE_ALPHA_TO_COVERAGE) : oe(e.SAMPLE_ALPHA_TO_COVERAGE);
	}
	function me(t) {
		D !== t && (t ? e.frontFace(e.CW) : e.frontFace(e.CCW), D = t);
	}
	function he(t) {
		t === 0 ? oe(e.CULL_FACE) : (ae(e.CULL_FACE), t !== O && (t === 1 ? e.cullFace(e.BACK) : t === 2 ? e.cullFace(e.FRONT) : e.cullFace(e.FRONT_AND_BACK))), O = t;
	}
	function ge(t) {
		t !== k && (N && e.lineWidth(t), k = t);
	}
	function _e(t, n, r) {
		t ? (ae(e.POLYGON_OFFSET_FILL), (A !== n || j !== r) && (A = n, j = r, o.getReversed() && (n = -n), e.polygonOffset(n, r))) : oe(e.POLYGON_OFFSET_FILL);
	}
	function ve(t) {
		t ? ae(e.SCISSOR_TEST) : oe(e.SCISSOR_TEST);
	}
	function z(t) {
		t === void 0 && (t = e.TEXTURE0 + M - 1), I !== t && (e.activeTexture(t), I = t);
	}
	function ye(t, n, r) {
		r === void 0 && (r = I === null ? e.TEXTURE0 + M - 1 : I);
		let i = ee[r];
		i === void 0 && (i = {
			type: void 0,
			texture: void 0
		}, ee[r] = i), (i.type !== t || i.texture !== n) && (I !== r && (e.activeTexture(r), I = r), e.bindTexture(t, n || R[t]), i.type = t, i.texture = n);
	}
	function be() {
		let t = ee[I];
		t !== void 0 && t.type !== void 0 && (e.bindTexture(t.type, null), t.type = void 0, t.texture = void 0);
	}
	function xe() {
		try {
			e.compressedTexImage2D(...arguments);
		} catch (e) {
			W("WebGLState:", e);
		}
	}
	function B() {
		try {
			e.compressedTexImage3D(...arguments);
		} catch (e) {
			W("WebGLState:", e);
		}
	}
	function Se() {
		try {
			e.texSubImage2D(...arguments);
		} catch (e) {
			W("WebGLState:", e);
		}
	}
	function V() {
		try {
			e.texSubImage3D(...arguments);
		} catch (e) {
			W("WebGLState:", e);
		}
	}
	function H() {
		try {
			e.compressedTexSubImage2D(...arguments);
		} catch (e) {
			W("WebGLState:", e);
		}
	}
	function Ce() {
		try {
			e.compressedTexSubImage3D(...arguments);
		} catch (e) {
			W("WebGLState:", e);
		}
	}
	function we() {
		try {
			e.texStorage2D(...arguments);
		} catch (e) {
			W("WebGLState:", e);
		}
	}
	function Te() {
		try {
			e.texStorage3D(...arguments);
		} catch (e) {
			W("WebGLState:", e);
		}
	}
	function Ee() {
		try {
			e.texImage2D(...arguments);
		} catch (e) {
			W("WebGLState:", e);
		}
	}
	function De() {
		try {
			e.texImage3D(...arguments);
		} catch (e) {
			W("WebGLState:", e);
		}
	}
	function Oe(t) {
		return d[t] === void 0 ? e.getParameter(t) : d[t];
	}
	function ke(t, n) {
		d[t] !== n && (e.pixelStorei(t, n), d[t] = n);
	}
	function Ae(t) {
		re.equals(t) === !1 && (e.scissor(t.x, t.y, t.z, t.w), re.copy(t));
	}
	function je(t) {
		L.equals(t) === !1 && (e.viewport(t.x, t.y, t.z, t.w), L.copy(t));
	}
	function Me(t, n) {
		let r = l.get(n);
		r === void 0 && (r = /* @__PURE__ */ new WeakMap(), l.set(n, r));
		let i = r.get(t);
		i === void 0 && (i = e.getUniformBlockIndex(n, t.name), r.set(t, i));
	}
	function Ne(t, n) {
		let r = l.get(n).get(t);
		c.get(n) !== r && (e.uniformBlockBinding(n, r, t.__bindingPointIndex), c.set(n, r));
	}
	function Pe() {
		e.disable(e.BLEND), e.disable(e.CULL_FACE), e.disable(e.DEPTH_TEST), e.disable(e.POLYGON_OFFSET_FILL), e.disable(e.SCISSOR_TEST), e.disable(e.STENCIL_TEST), e.disable(e.SAMPLE_ALPHA_TO_COVERAGE), e.blendEquation(e.FUNC_ADD), e.blendFunc(e.ONE, e.ZERO), e.blendFuncSeparate(e.ONE, e.ZERO, e.ONE, e.ZERO), e.blendColor(0, 0, 0, 0), e.colorMask(!0, !0, !0, !0), e.clearColor(0, 0, 0, 0), e.depthMask(!0), e.depthFunc(e.LESS), o.setReversed(!1), e.clearDepth(1), e.stencilMask(4294967295), e.stencilFunc(e.ALWAYS, 0, 4294967295), e.stencilOp(e.KEEP, e.KEEP, e.KEEP), e.clearStencil(0), e.cullFace(e.BACK), e.frontFace(e.CCW), e.polygonOffset(0, 0), e.activeTexture(e.TEXTURE0), e.bindFramebuffer(e.FRAMEBUFFER, null), e.bindFramebuffer(e.DRAW_FRAMEBUFFER, null), e.bindFramebuffer(e.READ_FRAMEBUFFER, null), e.useProgram(null), e.lineWidth(1), e.scissor(0, 0, e.canvas.width, e.canvas.height), e.viewport(0, 0, e.canvas.width, e.canvas.height), e.pixelStorei(e.PACK_ALIGNMENT, 4), e.pixelStorei(e.UNPACK_ALIGNMENT, 4), e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL, !1), e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1), e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL, e.BROWSER_DEFAULT_WEBGL), e.pixelStorei(e.PACK_ROW_LENGTH, 0), e.pixelStorei(e.PACK_SKIP_PIXELS, 0), e.pixelStorei(e.PACK_SKIP_ROWS, 0), e.pixelStorei(e.UNPACK_ROW_LENGTH, 0), e.pixelStorei(e.UNPACK_IMAGE_HEIGHT, 0), e.pixelStorei(e.UNPACK_SKIP_PIXELS, 0), e.pixelStorei(e.UNPACK_SKIP_ROWS, 0), e.pixelStorei(e.UNPACK_SKIP_IMAGES, 0), u = {}, d = {}, I = null, ee = {}, f = {}, p = /* @__PURE__ */ new WeakMap(), m = [], h = null, g = !1, _ = null, v = null, y = null, b = null, x = null, S = null, C = null, w = new X(0, 0, 0), T = 0, E = !1, D = null, O = null, k = null, A = null, j = null, re.set(0, 0, e.canvas.width, e.canvas.height), L.set(0, 0, e.canvas.width, e.canvas.height), a.reset(), o.reset(), s.reset();
	}
	return {
		buffers: {
			color: a,
			depth: o,
			stencil: s
		},
		enable: ae,
		disable: oe,
		bindFramebuffer: se,
		drawBuffers: ce,
		useProgram: le,
		setBlending: fe,
		setMaterial: pe,
		setFlipSided: me,
		setCullFace: he,
		setLineWidth: ge,
		setPolygonOffset: _e,
		setScissorTest: ve,
		activeTexture: z,
		bindTexture: ye,
		unbindTexture: be,
		compressedTexImage2D: xe,
		compressedTexImage3D: B,
		texImage2D: Ee,
		texImage3D: De,
		pixelStorei: ke,
		getParameter: Oe,
		updateUBOMapping: Me,
		uniformBlockBinding: Ne,
		texStorage2D: we,
		texStorage3D: Te,
		texSubImage2D: Se,
		texSubImage3D: V,
		compressedTexSubImage2D: H,
		compressedTexSubImage3D: Ce,
		scissor: Ae,
		viewport: je,
		reset: Pe
	};
}
function A_(e, t, n, r, i, a, o) {
	let s = t.has("WEBGL_multisampled_render_to_texture") ? t.get("WEBGL_multisampled_render_to_texture") : null, c = typeof navigator > "u" ? !1 : /OculusBrowser/g.test(navigator.userAgent), l = new K(), u = /* @__PURE__ */ new WeakMap(), d = /* @__PURE__ */ new Set(), f, p = /* @__PURE__ */ new WeakMap(), m = !1;
	try {
		m = typeof OffscreenCanvas < "u" && new OffscreenCanvas(1, 1).getContext("2d") !== null;
	} catch {}
	function h(e, t) {
		return m ? new OffscreenCanvas(e, t) : jl("canvas");
	}
	function g(e, t, n) {
		let r = 1, i = xe(e);
		if ((i.width > n || i.height > n) && (r = n / Math.max(i.width, i.height)), r < 1) {
			if (typeof HTMLImageElement < "u" && e instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && e instanceof ImageBitmap || typeof VideoFrame < "u" && e instanceof VideoFrame) {
				let n = Math.floor(r * i.width), a = Math.floor(r * i.height);
				f === void 0 && (f = h(n, a));
				let o = t ? h(n, a) : f;
				return o.width = n, o.height = a, o.getContext("2d").drawImage(e, 0, 0, n, a), U("WebGLRenderer: Texture has been resized from (" + i.width + "x" + i.height + ") to (" + n + "x" + a + ")."), o;
			}
			return "data" in e && U("WebGLRenderer: Image in DataTexture is too big (" + i.width + "x" + i.height + ")."), e;
		}
		return e;
	}
	function _(e) {
		return e.generateMipmaps;
	}
	function v(t) {
		e.generateMipmap(t);
	}
	function y(t) {
		return t.isWebGLCubeRenderTarget ? e.TEXTURE_CUBE_MAP : t.isWebGL3DRenderTarget ? e.TEXTURE_3D : t.isWebGLArrayRenderTarget || t.isCompressedArrayTexture ? e.TEXTURE_2D_ARRAY : e.TEXTURE_2D;
	}
	function b(n, r, i, a, o, s = !1) {
		if (n !== null) {
			if (e[n] !== void 0) return e[n];
			U("WebGLRenderer: Attempt to use non-existing WebGL internal format '" + n + "'");
		}
		let c;
		a && (c = t.get("EXT_texture_norm16"), c || U("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));
		let l = r;
		if (r === e.RED && (i === e.FLOAT && (l = e.R32F), i === e.HALF_FLOAT && (l = e.R16F), i === e.UNSIGNED_BYTE && (l = e.R8), i === e.UNSIGNED_SHORT && c && (l = c.R16_EXT), i === e.SHORT && c && (l = c.R16_SNORM_EXT)), r === e.RED_INTEGER && (i === e.UNSIGNED_BYTE && (l = e.R8UI), i === e.UNSIGNED_SHORT && (l = e.R16UI), i === e.UNSIGNED_INT && (l = e.R32UI), i === e.BYTE && (l = e.R8I), i === e.SHORT && (l = e.R16I), i === e.INT && (l = e.R32I)), r === e.RG && (i === e.FLOAT && (l = e.RG32F), i === e.HALF_FLOAT && (l = e.RG16F), i === e.UNSIGNED_BYTE && (l = e.RG8), i === e.UNSIGNED_SHORT && c && (l = c.RG16_EXT), i === e.SHORT && c && (l = c.RG16_SNORM_EXT)), r === e.RG_INTEGER && (i === e.UNSIGNED_BYTE && (l = e.RG8UI), i === e.UNSIGNED_SHORT && (l = e.RG16UI), i === e.UNSIGNED_INT && (l = e.RG32UI), i === e.BYTE && (l = e.RG8I), i === e.SHORT && (l = e.RG16I), i === e.INT && (l = e.RG32I)), r === e.RGB_INTEGER && (i === e.UNSIGNED_BYTE && (l = e.RGB8UI), i === e.UNSIGNED_SHORT && (l = e.RGB16UI), i === e.UNSIGNED_INT && (l = e.RGB32UI), i === e.BYTE && (l = e.RGB8I), i === e.SHORT && (l = e.RGB16I), i === e.INT && (l = e.RGB32I)), r === e.RGBA_INTEGER && (i === e.UNSIGNED_BYTE && (l = e.RGBA8UI), i === e.UNSIGNED_SHORT && (l = e.RGBA16UI), i === e.UNSIGNED_INT && (l = e.RGBA32UI), i === e.BYTE && (l = e.RGBA8I), i === e.SHORT && (l = e.RGBA16I), i === e.INT && (l = e.RGBA32I)), r === e.RGB && (i === e.UNSIGNED_SHORT && c && (l = c.RGB16_EXT), i === e.SHORT && c && (l = c.RGB16_SNORM_EXT), i === e.UNSIGNED_INT_5_9_9_9_REV && (l = e.RGB9_E5), i === e.UNSIGNED_INT_10F_11F_11F_REV && (l = e.R11F_G11F_B10F)), r === e.RGBA) {
			let t = s ? Sl : Y.getTransfer(o);
			i === e.FLOAT && (l = e.RGBA32F), i === e.HALF_FLOAT && (l = e.RGBA16F), i === e.UNSIGNED_BYTE && (l = t === "srgb" ? e.SRGB8_ALPHA8 : e.RGBA8), i === e.UNSIGNED_SHORT && c && (l = c.RGBA16_EXT), i === e.SHORT && c && (l = c.RGBA16_SNORM_EXT), i === e.UNSIGNED_SHORT_4_4_4_4 && (l = e.RGBA4), i === e.UNSIGNED_SHORT_5_5_5_1 && (l = e.RGB5_A1);
		}
		return (l === e.R16F || l === e.R32F || l === e.RG16F || l === e.RG32F || l === e.RGBA16F || l === e.RGBA32F) && t.get("EXT_color_buffer_float"), l;
	}
	function x(t, n) {
		let r;
		return t ? n === null || n === 1014 || n === 1020 ? r = e.DEPTH24_STENCIL8 : n === 1015 ? r = e.DEPTH32F_STENCIL8 : n === 1012 && (r = e.DEPTH24_STENCIL8, U("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")) : n === null || n === 1014 || n === 1020 ? r = e.DEPTH_COMPONENT24 : n === 1015 ? r = e.DEPTH_COMPONENT32F : n === 1012 && (r = e.DEPTH_COMPONENT16), r;
	}
	function S(e, t) {
		return _(e) === !0 || e.isFramebufferTexture && e.minFilter !== 1003 && e.minFilter !== 1006 ? Math.log2(Math.max(t.width, t.height)) + 1 : e.mipmaps !== void 0 && e.mipmaps.length > 0 ? e.mipmaps.length : e.isCompressedTexture && Array.isArray(e.image) ? t.mipmaps.length : 1;
	}
	function C(e) {
		let t = e.target;
		t.removeEventListener("dispose", C), T(t), t.isVideoTexture && u.delete(t), t.isHTMLTexture && d.delete(t);
	}
	function w(e) {
		let t = e.target;
		t.removeEventListener("dispose", w), D(t);
	}
	function T(e) {
		let t = r.get(e);
		if (t.__webglInit === void 0) return;
		let n = e.source, i = p.get(n);
		if (i) {
			let r = i[t.__cacheKey];
			r.usedTimes--, r.usedTimes === 0 && E(e), Object.keys(i).length === 0 && p.delete(n);
		}
		r.remove(e);
	}
	function E(t) {
		let n = r.get(t);
		e.deleteTexture(n.__webglTexture);
		let i = t.source, a = p.get(i);
		delete a[n.__cacheKey], o.memory.textures--;
	}
	function D(t) {
		let n = r.get(t);
		if (t.depthTexture && (t.depthTexture.dispose(), r.remove(t.depthTexture)), t.isWebGLCubeRenderTarget) for (let t = 0; t < 6; t++) {
			if (Array.isArray(n.__webglFramebuffer[t])) for (let r = 0; r < n.__webglFramebuffer[t].length; r++) e.deleteFramebuffer(n.__webglFramebuffer[t][r]);
			else e.deleteFramebuffer(n.__webglFramebuffer[t]);
			n.__webglDepthbuffer && e.deleteRenderbuffer(n.__webglDepthbuffer[t]);
		}
		else {
			if (Array.isArray(n.__webglFramebuffer)) for (let t = 0; t < n.__webglFramebuffer.length; t++) e.deleteFramebuffer(n.__webglFramebuffer[t]);
			else e.deleteFramebuffer(n.__webglFramebuffer);
			if (n.__webglDepthbuffer && e.deleteRenderbuffer(n.__webglDepthbuffer), n.__webglMultisampledFramebuffer && e.deleteFramebuffer(n.__webglMultisampledFramebuffer), n.__webglColorRenderbuffer) for (let t = 0; t < n.__webglColorRenderbuffer.length; t++) n.__webglColorRenderbuffer[t] && e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);
			n.__webglDepthRenderbuffer && e.deleteRenderbuffer(n.__webglDepthRenderbuffer);
		}
		let i = t.textures;
		for (let t = 0, n = i.length; t < n; t++) {
			let n = r.get(i[t]);
			n.__webglTexture && (e.deleteTexture(n.__webglTexture), o.memory.textures--), r.remove(i[t]);
		}
		r.remove(t);
	}
	let O = 0;
	function k() {
		O = 0;
	}
	function A() {
		return O;
	}
	function j(e) {
		O = e;
	}
	function M() {
		let e = O;
		return e >= i.maxTextures && U("WebGLTextures: Trying to use " + (e + 1) + " texture units while this GPU supports only " + i.maxTextures), O += 1, e;
	}
	function N(e) {
		let t = [];
		return t.push(e.wrapS), t.push(e.wrapT), t.push(e.wrapR || 0), t.push(e.magFilter), t.push(e.minFilter), t.push(e.anisotropy), t.push(e.internalFormat), t.push(e.format), t.push(e.type), t.push(e.generateMipmaps), t.push(e.premultiplyAlpha), t.push(e.flipY), t.push(e.unpackAlignment), t.push(e.colorSpace), t.join();
	}
	function P(t, i) {
		let a = r.get(t);
		if (t.isVideoTexture && ye(t), t.isRenderTargetTexture === !1 && t.isExternalTexture !== !0 && t.version > 0 && a.__version !== t.version) {
			let e = t.image;
			if (e === null) U("WebGLRenderer: Texture marked for update but no image data found.");
			else if (e.complete === !1) U("WebGLRenderer: Texture marked for update but image is incomplete");
			else {
				oe(a, t, i);
				return;
			}
		} else t.isExternalTexture && (a.__webglTexture = t.sourceTexture ? t.sourceTexture : null);
		n.bindTexture(e.TEXTURE_2D, a.__webglTexture, e.TEXTURE0 + i);
	}
	function F(t, i) {
		let a = r.get(t);
		t.isRenderTargetTexture === !1 && t.version > 0 && a.__version !== t.version ? oe(a, t, i) : (t.isExternalTexture && (a.__webglTexture = t.sourceTexture ? t.sourceTexture : null), n.bindTexture(e.TEXTURE_2D_ARRAY, a.__webglTexture, e.TEXTURE0 + i));
	}
	function I(t, i) {
		let a = r.get(t);
		t.isRenderTargetTexture === !1 && t.version > 0 && a.__version !== t.version ? oe(a, t, i) : n.bindTexture(e.TEXTURE_3D, a.__webglTexture, e.TEXTURE0 + i);
	}
	function ee(t, i) {
		let a = r.get(t);
		t.isCubeDepthTexture !== !0 && t.version > 0 && a.__version !== t.version ? se(a, t, i) : n.bindTexture(e.TEXTURE_CUBE_MAP, a.__webglTexture, e.TEXTURE0 + i);
	}
	let te = {
		[Qs]: e.REPEAT,
		[$s]: e.CLAMP_TO_EDGE,
		[ec]: e.MIRRORED_REPEAT
	}, ne = {
		[tc]: e.NEAREST,
		[nc]: e.NEAREST_MIPMAP_NEAREST,
		[rc]: e.NEAREST_MIPMAP_LINEAR,
		[ic]: e.LINEAR,
		[ac]: e.LINEAR_MIPMAP_NEAREST,
		[oc]: e.LINEAR_MIPMAP_LINEAR
	}, re = {
		512: e.NEVER,
		519: e.ALWAYS,
		513: e.LESS,
		515: e.LEQUAL,
		514: e.EQUAL,
		518: e.GEQUAL,
		516: e.GREATER,
		517: e.NOTEQUAL
	};
	function L(n, a) {
		if (a.type === 1015 && t.has("OES_texture_float_linear") === !1 && (a.magFilter === 1006 || a.magFilter === 1007 || a.magFilter === 1005 || a.magFilter === 1008 || a.minFilter === 1006 || a.minFilter === 1007 || a.minFilter === 1005 || a.minFilter === 1008) && U("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."), e.texParameteri(n, e.TEXTURE_WRAP_S, te[a.wrapS]), e.texParameteri(n, e.TEXTURE_WRAP_T, te[a.wrapT]), (n === e.TEXTURE_3D || n === e.TEXTURE_2D_ARRAY) && e.texParameteri(n, e.TEXTURE_WRAP_R, te[a.wrapR]), e.texParameteri(n, e.TEXTURE_MAG_FILTER, ne[a.magFilter]), e.texParameteri(n, e.TEXTURE_MIN_FILTER, ne[a.minFilter]), a.compareFunction && (e.texParameteri(n, e.TEXTURE_COMPARE_MODE, e.COMPARE_REF_TO_TEXTURE), e.texParameteri(n, e.TEXTURE_COMPARE_FUNC, re[a.compareFunction])), t.has("EXT_texture_filter_anisotropic") === !0) {
			if (a.magFilter === 1003 || a.minFilter !== 1005 && a.minFilter !== 1008 || a.type === 1015 && t.has("OES_texture_float_linear") === !1) return;
			if (a.anisotropy > 1 || r.get(a).__currentAnisotropy) {
				let o = t.get("EXT_texture_filter_anisotropic");
				e.texParameterf(n, o.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(a.anisotropy, i.getMaxAnisotropy())), r.get(a).__currentAnisotropy = a.anisotropy;
			}
		}
	}
	function ie(t, n) {
		let r = !1;
		t.__webglInit === void 0 && (t.__webglInit = !0, n.addEventListener("dispose", C));
		let i = n.source, a = p.get(i);
		a === void 0 && (a = {}, p.set(i, a));
		let s = N(n);
		if (s !== t.__cacheKey) {
			a[s] === void 0 && (a[s] = {
				texture: e.createTexture(),
				usedTimes: 0
			}, o.memory.textures++, r = !0), a[s].usedTimes++;
			let i = a[t.__cacheKey];
			i !== void 0 && (a[t.__cacheKey].usedTimes--, i.usedTimes === 0 && E(n)), t.__cacheKey = s, t.__webglTexture = a[s].texture;
		}
		return r;
	}
	function R(e, t, n) {
		return Math.floor(Math.floor(e / n) / t);
	}
	function ae(t, r, i, a) {
		let o = t.updateRanges;
		if (o.length === 0) n.texSubImage2D(e.TEXTURE_2D, 0, 0, 0, r.width, r.height, i, a, r.data);
		else {
			o.sort((e, t) => e.start - t.start);
			let s = 0;
			for (let e = 1; e < o.length; e++) {
				let t = o[s], n = o[e], i = t.start + t.count, a = R(n.start, r.width, 4), c = R(t.start, r.width, 4);
				n.start <= i + 1 && a === c && R(n.start + n.count - 1, r.width, 4) === a ? t.count = Math.max(t.count, n.start + n.count - t.start) : (++s, o[s] = n);
			}
			o.length = s + 1;
			let c = n.getParameter(e.UNPACK_ROW_LENGTH), l = n.getParameter(e.UNPACK_SKIP_PIXELS), u = n.getParameter(e.UNPACK_SKIP_ROWS);
			n.pixelStorei(e.UNPACK_ROW_LENGTH, r.width);
			for (let t = 0, s = o.length; t < s; t++) {
				let s = o[t], c = Math.floor(s.start / 4), l = Math.ceil(s.count / 4), u = c % r.width, d = Math.floor(c / r.width), f = l;
				n.pixelStorei(e.UNPACK_SKIP_PIXELS, u), n.pixelStorei(e.UNPACK_SKIP_ROWS, d), n.texSubImage2D(e.TEXTURE_2D, 0, u, d, f, 1, i, a, r.data);
			}
			t.clearUpdateRanges(), n.pixelStorei(e.UNPACK_ROW_LENGTH, c), n.pixelStorei(e.UNPACK_SKIP_PIXELS, l), n.pixelStorei(e.UNPACK_SKIP_ROWS, u);
		}
	}
	function oe(t, o, s) {
		let c = e.TEXTURE_2D;
		(o.isDataArrayTexture || o.isCompressedArrayTexture) && (c = e.TEXTURE_2D_ARRAY), o.isData3DTexture && (c = e.TEXTURE_3D);
		let l = ie(t, o), u = o.source;
		n.bindTexture(c, t.__webglTexture, e.TEXTURE0 + s);
		let f = r.get(u);
		if (u.version !== f.__version || l === !0) {
			if (n.activeTexture(e.TEXTURE0 + s), !(typeof ImageBitmap < "u" && o.image instanceof ImageBitmap)) {
				let t = Y.getPrimaries(Y.workingColorSpace), r = o.colorSpace === "" ? null : Y.getPrimaries(o.colorSpace), i = o.colorSpace === "" || t === r ? e.NONE : e.BROWSER_DEFAULT_WEBGL;
				n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL, o.flipY), n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL, o.premultiplyAlpha), n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL, i);
			}
			n.pixelStorei(e.UNPACK_ALIGNMENT, o.unpackAlignment);
			let t = g(o.image, !1, i.maxTextureSize);
			t = be(o, t);
			let r = a.convert(o.format, o.colorSpace), p = a.convert(o.type), m = b(o.internalFormat, r, p, o.normalized, o.colorSpace, o.isVideoTexture);
			L(c, o);
			let h, y = o.mipmaps, C = o.isVideoTexture !== !0, w = f.__version === void 0 || l === !0, T = u.dataReady, E = S(o, t);
			if (o.isDepthTexture) m = x(o.format === wc, o.type), w && (C ? n.texStorage2D(e.TEXTURE_2D, 1, m, t.width, t.height) : n.texImage2D(e.TEXTURE_2D, 0, m, t.width, t.height, 0, r, p, null));
			else if (o.isDataTexture) {
				if (y.length > 0) {
					C && w && n.texStorage2D(e.TEXTURE_2D, E, m, y[0].width, y[0].height);
					for (let t = 0, i = y.length; t < i; t++) h = y[t], C ? T && n.texSubImage2D(e.TEXTURE_2D, t, 0, 0, h.width, h.height, r, p, h.data) : n.texImage2D(e.TEXTURE_2D, t, m, h.width, h.height, 0, r, p, h.data);
					o.generateMipmaps = !1;
				} else C ? (w && n.texStorage2D(e.TEXTURE_2D, E, m, t.width, t.height), T && ae(o, t, r, p)) : n.texImage2D(e.TEXTURE_2D, 0, m, t.width, t.height, 0, r, p, t.data);
			} else if (o.isCompressedTexture) {
				if (o.isCompressedArrayTexture) {
					C && w && n.texStorage3D(e.TEXTURE_2D_ARRAY, E, m, y[0].width, y[0].height, t.depth);
					for (let i = 0, a = y.length; i < a; i++) if (h = y[i], o.format !== 1023) {
						if (r !== null) {
							if (C) {
								if (T) {
									if (o.layerUpdates.size > 0) {
										let t = Tm(h.width, h.height, o.format, o.type);
										for (let a of o.layerUpdates) {
											let o = h.data.subarray(a * t / h.data.BYTES_PER_ELEMENT, (a + 1) * t / h.data.BYTES_PER_ELEMENT);
											n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY, i, 0, 0, a, h.width, h.height, 1, r, o);
										}
									} else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY, i, 0, 0, 0, h.width, h.height, t.depth, r, h.data);
								}
							} else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY, i, m, h.width, h.height, t.depth, 0, h.data, 0, 0);
						} else U("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");
					} else C ? T && n.texSubImage3D(e.TEXTURE_2D_ARRAY, i, 0, 0, 0, h.width, h.height, t.depth, r, p, h.data) : n.texImage3D(e.TEXTURE_2D_ARRAY, i, m, h.width, h.height, t.depth, 0, r, p, h.data);
					o.layerUpdates.size > 0 && o.clearLayerUpdates();
				} else {
					C && w && n.texStorage2D(e.TEXTURE_2D, E, m, y[0].width, y[0].height);
					for (let t = 0, i = y.length; t < i; t++) h = y[t], o.format === 1023 ? C ? T && n.texSubImage2D(e.TEXTURE_2D, t, 0, 0, h.width, h.height, r, p, h.data) : n.texImage2D(e.TEXTURE_2D, t, m, h.width, h.height, 0, r, p, h.data) : r === null ? U("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()") : C ? T && n.compressedTexSubImage2D(e.TEXTURE_2D, t, 0, 0, h.width, h.height, r, h.data) : n.compressedTexImage2D(e.TEXTURE_2D, t, m, h.width, h.height, 0, h.data);
				}
			} else if (o.isDataArrayTexture) {
				if (C) {
					if (w && n.texStorage3D(e.TEXTURE_2D_ARRAY, E, m, t.width, t.height, t.depth), T) {
						if (o.layerUpdates.size > 0) {
							let i = Tm(t.width, t.height, o.format, o.type);
							for (let a of o.layerUpdates) {
								let o = t.data.subarray(a * i / t.data.BYTES_PER_ELEMENT, (a + 1) * i / t.data.BYTES_PER_ELEMENT);
								n.texSubImage3D(e.TEXTURE_2D_ARRAY, 0, 0, 0, a, t.width, t.height, 1, r, p, o);
							}
							o.clearLayerUpdates();
						} else n.texSubImage3D(e.TEXTURE_2D_ARRAY, 0, 0, 0, 0, t.width, t.height, t.depth, r, p, t.data);
					}
				} else n.texImage3D(e.TEXTURE_2D_ARRAY, 0, m, t.width, t.height, t.depth, 0, r, p, t.data);
			} else if (o.isData3DTexture) C ? (w && n.texStorage3D(e.TEXTURE_3D, E, m, t.width, t.height, t.depth), T && n.texSubImage3D(e.TEXTURE_3D, 0, 0, 0, 0, t.width, t.height, t.depth, r, p, t.data)) : n.texImage3D(e.TEXTURE_3D, 0, m, t.width, t.height, t.depth, 0, r, p, t.data);
			else if (o.isFramebufferTexture) {
				if (w) {
					if (C) n.texStorage2D(e.TEXTURE_2D, E, m, t.width, t.height);
					else {
						let i = t.width, a = t.height;
						for (let t = 0; t < E; t++) n.texImage2D(e.TEXTURE_2D, t, m, i, a, 0, r, p, null), i >>= 1, a >>= 1;
					}
				}
			} else if (o.isHTMLTexture) {
				if ("texElementImage2D" in e) {
					let n = e.canvas;
					if (n.hasAttribute("layoutsubtree") || n.setAttribute("layoutsubtree", "true"), t.parentNode !== n) {
						n.appendChild(t), d.add(o), n.onpaint = (e) => {
							let t = e.changedElements;
							for (let e of d) t.includes(e.image) && (e.needsUpdate = !0);
						}, n.requestPaint();
						return;
					}
					if (e.texElementImage2D.length === 3) e.texElementImage2D(e.TEXTURE_2D, e.RGBA8, t);
					else {
						let n = e.RGBA, r = e.RGBA, i = e.UNSIGNED_BYTE;
						e.texElementImage2D(e.TEXTURE_2D, 0, n, r, i, t);
					}
					e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, e.LINEAR), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.CLAMP_TO_EDGE), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.CLAMP_TO_EDGE);
				}
			} else if (y.length > 0) {
				if (C && w) {
					let t = xe(y[0]);
					n.texStorage2D(e.TEXTURE_2D, E, m, t.width, t.height);
				}
				for (let t = 0, i = y.length; t < i; t++) h = y[t], C ? T && n.texSubImage2D(e.TEXTURE_2D, t, 0, 0, r, p, h) : n.texImage2D(e.TEXTURE_2D, t, m, r, p, h);
				o.generateMipmaps = !1;
			} else if (C) {
				if (w) {
					let r = xe(t);
					n.texStorage2D(e.TEXTURE_2D, E, m, r.width, r.height);
				}
				T && n.texSubImage2D(e.TEXTURE_2D, 0, 0, 0, r, p, t);
			} else n.texImage2D(e.TEXTURE_2D, 0, m, r, p, t);
			_(o) && v(c), f.__version = u.version, o.onUpdate && o.onUpdate(o);
		}
		t.__version = o.version;
	}
	function se(t, o, s) {
		if (o.image.length !== 6) return;
		let c = ie(t, o), l = o.source;
		n.bindTexture(e.TEXTURE_CUBE_MAP, t.__webglTexture, e.TEXTURE0 + s);
		let u = r.get(l);
		if (l.version !== u.__version || c === !0) {
			n.activeTexture(e.TEXTURE0 + s);
			let t = Y.getPrimaries(Y.workingColorSpace), r = o.colorSpace === "" ? null : Y.getPrimaries(o.colorSpace), d = o.colorSpace === "" || t === r ? e.NONE : e.BROWSER_DEFAULT_WEBGL;
			n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL, o.flipY), n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL, o.premultiplyAlpha), n.pixelStorei(e.UNPACK_ALIGNMENT, o.unpackAlignment), n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL, d);
			let f = o.isCompressedTexture || o.image[0].isCompressedTexture, p = o.image[0] && o.image[0].isDataTexture, m = [];
			for (let e = 0; e < 6; e++) !f && !p ? m[e] = g(o.image[e], !0, i.maxCubemapSize) : m[e] = p ? o.image[e].image : o.image[e], m[e] = be(o, m[e]);
			let h = m[0], y = a.convert(o.format, o.colorSpace), x = a.convert(o.type), C = b(o.internalFormat, y, x, o.normalized, o.colorSpace), w = o.isVideoTexture !== !0, T = u.__version === void 0 || c === !0, E = l.dataReady, D = S(o, h);
			L(e.TEXTURE_CUBE_MAP, o);
			let O;
			if (f) {
				w && T && n.texStorage2D(e.TEXTURE_CUBE_MAP, D, C, h.width, h.height);
				for (let t = 0; t < 6; t++) {
					O = m[t].mipmaps;
					for (let r = 0; r < O.length; r++) {
						let i = O[r];
						o.format === 1023 ? w ? E && n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, r, 0, 0, i.width, i.height, y, x, i.data) : n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, r, C, i.width, i.height, 0, y, x, i.data) : y === null ? U("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()") : w ? E && n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, r, 0, 0, i.width, i.height, y, i.data) : n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, r, C, i.width, i.height, 0, i.data);
					}
				}
			} else {
				if (O = o.mipmaps, w && T) {
					O.length > 0 && D++;
					let t = xe(m[0]);
					n.texStorage2D(e.TEXTURE_CUBE_MAP, D, C, t.width, t.height);
				}
				for (let t = 0; t < 6; t++) if (p) {
					w ? E && n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, 0, 0, 0, m[t].width, m[t].height, y, x, m[t].data) : n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, 0, C, m[t].width, m[t].height, 0, y, x, m[t].data);
					for (let r = 0; r < O.length; r++) {
						let i = O[r].image[t].image;
						w ? E && n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, r + 1, 0, 0, i.width, i.height, y, x, i.data) : n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, r + 1, C, i.width, i.height, 0, y, x, i.data);
					}
				} else {
					w ? E && n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, 0, 0, 0, y, x, m[t]) : n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, 0, C, y, x, m[t]);
					for (let r = 0; r < O.length; r++) {
						let i = O[r];
						w ? E && n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, r + 1, 0, 0, y, x, i.image[t]) : n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, r + 1, C, y, x, i.image[t]);
					}
				}
			}
			_(o) && v(e.TEXTURE_CUBE_MAP), u.__version = l.version, o.onUpdate && o.onUpdate(o);
		}
		t.__version = o.version;
	}
	function ce(t, i, o, c, l, u) {
		let d = a.convert(o.format, o.colorSpace), f = a.convert(o.type), p = b(o.internalFormat, d, f, o.normalized, o.colorSpace), m = r.get(i), h = r.get(o);
		if (h.__renderTarget = i, !m.__hasExternalTextures) {
			let t = Math.max(1, i.width >> u), r = Math.max(1, i.height >> u);
			l === e.TEXTURE_3D || l === e.TEXTURE_2D_ARRAY ? n.texImage3D(l, u, p, t, r, i.depth, 0, d, f, null) : n.texImage2D(l, u, p, t, r, 0, d, f, null);
		}
		n.bindFramebuffer(e.FRAMEBUFFER, t), z(i) ? s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER, c, l, h.__webglTexture, 0, ve(i)) : (l === e.TEXTURE_2D || l >= e.TEXTURE_CUBE_MAP_POSITIVE_X && l <= e.TEXTURE_CUBE_MAP_NEGATIVE_Z) && e.framebufferTexture2D(e.FRAMEBUFFER, c, l, h.__webglTexture, u), n.bindFramebuffer(e.FRAMEBUFFER, null);
	}
	function le(t, n, r) {
		if (e.bindRenderbuffer(e.RENDERBUFFER, t), n.depthBuffer) {
			let i = n.depthTexture, a = i && i.isDepthTexture ? i.type : null, o = x(n.stencilBuffer, a), c = n.stencilBuffer ? e.DEPTH_STENCIL_ATTACHMENT : e.DEPTH_ATTACHMENT;
			z(n) ? s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER, ve(n), o, n.width, n.height) : r ? e.renderbufferStorageMultisample(e.RENDERBUFFER, ve(n), o, n.width, n.height) : e.renderbufferStorage(e.RENDERBUFFER, o, n.width, n.height), e.framebufferRenderbuffer(e.FRAMEBUFFER, c, e.RENDERBUFFER, t);
		} else {
			let t = n.textures;
			for (let i = 0; i < t.length; i++) {
				let o = t[i], c = a.convert(o.format, o.colorSpace), l = a.convert(o.type), u = b(o.internalFormat, c, l, o.normalized, o.colorSpace);
				z(n) ? s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER, ve(n), u, n.width, n.height) : r ? e.renderbufferStorageMultisample(e.RENDERBUFFER, ve(n), u, n.width, n.height) : e.renderbufferStorage(e.RENDERBUFFER, u, n.width, n.height);
			}
		}
		e.bindRenderbuffer(e.RENDERBUFFER, null);
	}
	function ue(t, i, o) {
		let c = i.isWebGLCubeRenderTarget === !0;
		if (n.bindFramebuffer(e.FRAMEBUFFER, t), !(i.depthTexture && i.depthTexture.isDepthTexture)) throw Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");
		let l = r.get(i.depthTexture);
		if (l.__renderTarget = i, l.__webglTexture && i.depthTexture.image.width === i.width && i.depthTexture.image.height === i.height || (i.depthTexture.image.width = i.width, i.depthTexture.image.height = i.height, i.depthTexture.needsUpdate = !0), c) {
			if (l.__webglInit === void 0 && (l.__webglInit = !0, i.depthTexture.addEventListener("dispose", C)), l.__webglTexture === void 0) {
				l.__webglTexture = e.createTexture(), n.bindTexture(e.TEXTURE_CUBE_MAP, l.__webglTexture), L(e.TEXTURE_CUBE_MAP, i.depthTexture);
				let t = a.convert(i.depthTexture.format), r = a.convert(i.depthTexture.type), o;
				i.depthTexture.format === 1026 ? o = e.DEPTH_COMPONENT24 : i.depthTexture.format === 1027 && (o = e.DEPTH24_STENCIL8);
				for (let n = 0; n < 6; n++) e.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + n, 0, o, i.width, i.height, 0, t, r, null);
			}
		} else P(i.depthTexture, 0);
		let u = l.__webglTexture, d = ve(i), f = c ? e.TEXTURE_CUBE_MAP_POSITIVE_X + o : e.TEXTURE_2D, p = i.depthTexture.format === 1027 ? e.DEPTH_STENCIL_ATTACHMENT : e.DEPTH_ATTACHMENT;
		if (i.depthTexture.format === 1026) z(i) ? s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER, p, f, u, 0, d) : e.framebufferTexture2D(e.FRAMEBUFFER, p, f, u, 0);
		else if (i.depthTexture.format === 1027) z(i) ? s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER, p, f, u, 0, d) : e.framebufferTexture2D(e.FRAMEBUFFER, p, f, u, 0);
		else throw Error("THREE.WebGLTextures: Unknown depthTexture format.");
	}
	function de(t) {
		let i = r.get(t), a = t.isWebGLCubeRenderTarget === !0;
		if (i.__boundDepthTexture !== t.depthTexture) {
			let e = t.depthTexture;
			if (i.__depthDisposeCallback && i.__depthDisposeCallback(), e) {
				let t = () => {
					delete i.__boundDepthTexture, delete i.__depthDisposeCallback, e.removeEventListener("dispose", t);
				};
				e.addEventListener("dispose", t), i.__depthDisposeCallback = t;
			}
			i.__boundDepthTexture = e;
		}
		if (t.depthTexture && !i.__autoAllocateDepthBuffer) {
			if (a) for (let e = 0; e < 6; e++) ue(i.__webglFramebuffer[e], t, e);
			else {
				let e = t.texture.mipmaps;
				e && e.length > 0 ? ue(i.__webglFramebuffer[0], t, 0) : ue(i.__webglFramebuffer, t, 0);
			}
		} else if (a) {
			i.__webglDepthbuffer = [];
			for (let r = 0; r < 6; r++) if (n.bindFramebuffer(e.FRAMEBUFFER, i.__webglFramebuffer[r]), i.__webglDepthbuffer[r] === void 0) i.__webglDepthbuffer[r] = e.createRenderbuffer(), le(i.__webglDepthbuffer[r], t, !1);
			else {
				let n = t.stencilBuffer ? e.DEPTH_STENCIL_ATTACHMENT : e.DEPTH_ATTACHMENT, a = i.__webglDepthbuffer[r];
				e.bindRenderbuffer(e.RENDERBUFFER, a), e.framebufferRenderbuffer(e.FRAMEBUFFER, n, e.RENDERBUFFER, a);
			}
		} else {
			let r = t.texture.mipmaps;
			if (r && r.length > 0 ? n.bindFramebuffer(e.FRAMEBUFFER, i.__webglFramebuffer[0]) : n.bindFramebuffer(e.FRAMEBUFFER, i.__webglFramebuffer), i.__webglDepthbuffer === void 0) i.__webglDepthbuffer = e.createRenderbuffer(), le(i.__webglDepthbuffer, t, !1);
			else {
				let n = t.stencilBuffer ? e.DEPTH_STENCIL_ATTACHMENT : e.DEPTH_ATTACHMENT, r = i.__webglDepthbuffer;
				e.bindRenderbuffer(e.RENDERBUFFER, r), e.framebufferRenderbuffer(e.FRAMEBUFFER, n, e.RENDERBUFFER, r);
			}
		}
		n.bindFramebuffer(e.FRAMEBUFFER, null);
	}
	function fe(t, n, i) {
		let a = r.get(t);
		n !== void 0 && ce(a.__webglFramebuffer, t, t.texture, e.COLOR_ATTACHMENT0, e.TEXTURE_2D, 0), i !== void 0 && de(t);
	}
	function pe(t) {
		let i = t.texture, s = r.get(t), c = r.get(i);
		t.addEventListener("dispose", w);
		let l = t.textures, u = t.isWebGLCubeRenderTarget === !0, d = l.length > 1;
		if (d || (c.__webglTexture === void 0 && (c.__webglTexture = e.createTexture()), c.__version = i.version, o.memory.textures++), u) {
			s.__webglFramebuffer = [];
			for (let t = 0; t < 6; t++) if (i.mipmaps && i.mipmaps.length > 0) {
				s.__webglFramebuffer[t] = [];
				for (let n = 0; n < i.mipmaps.length; n++) s.__webglFramebuffer[t][n] = e.createFramebuffer();
			} else s.__webglFramebuffer[t] = e.createFramebuffer();
		} else {
			if (i.mipmaps && i.mipmaps.length > 0) {
				s.__webglFramebuffer = [];
				for (let t = 0; t < i.mipmaps.length; t++) s.__webglFramebuffer[t] = e.createFramebuffer();
			} else s.__webglFramebuffer = e.createFramebuffer();
			if (d) for (let t = 0, n = l.length; t < n; t++) {
				let n = r.get(l[t]);
				n.__webglTexture === void 0 && (n.__webglTexture = e.createTexture(), o.memory.textures++);
			}
			if (t.samples > 0 && z(t) === !1) {
				s.__webglMultisampledFramebuffer = e.createFramebuffer(), s.__webglColorRenderbuffer = [], n.bindFramebuffer(e.FRAMEBUFFER, s.__webglMultisampledFramebuffer);
				for (let n = 0; n < l.length; n++) {
					let r = l[n];
					s.__webglColorRenderbuffer[n] = e.createRenderbuffer(), e.bindRenderbuffer(e.RENDERBUFFER, s.__webglColorRenderbuffer[n]);
					let i = a.convert(r.format, r.colorSpace), o = a.convert(r.type), c = b(r.internalFormat, i, o, r.normalized, r.colorSpace, t.isXRRenderTarget === !0), u = ve(t);
					e.renderbufferStorageMultisample(e.RENDERBUFFER, u, c, t.width, t.height), e.framebufferRenderbuffer(e.FRAMEBUFFER, e.COLOR_ATTACHMENT0 + n, e.RENDERBUFFER, s.__webglColorRenderbuffer[n]);
				}
				e.bindRenderbuffer(e.RENDERBUFFER, null), t.depthBuffer && (s.__webglDepthRenderbuffer = e.createRenderbuffer(), le(s.__webglDepthRenderbuffer, t, !0)), n.bindFramebuffer(e.FRAMEBUFFER, null);
			}
		}
		if (u) {
			n.bindTexture(e.TEXTURE_CUBE_MAP, c.__webglTexture), L(e.TEXTURE_CUBE_MAP, i);
			for (let n = 0; n < 6; n++) if (i.mipmaps && i.mipmaps.length > 0) for (let r = 0; r < i.mipmaps.length; r++) ce(s.__webglFramebuffer[n][r], t, i, e.COLOR_ATTACHMENT0, e.TEXTURE_CUBE_MAP_POSITIVE_X + n, r);
			else ce(s.__webglFramebuffer[n], t, i, e.COLOR_ATTACHMENT0, e.TEXTURE_CUBE_MAP_POSITIVE_X + n, 0);
			_(i) && v(e.TEXTURE_CUBE_MAP), n.unbindTexture();
		} else if (d) {
			for (let i = 0, a = l.length; i < a; i++) {
				let a = l[i], o = r.get(a), c = e.TEXTURE_2D;
				(t.isWebGL3DRenderTarget || t.isWebGLArrayRenderTarget) && (c = t.isWebGL3DRenderTarget ? e.TEXTURE_3D : e.TEXTURE_2D_ARRAY), n.bindTexture(c, o.__webglTexture), L(c, a), ce(s.__webglFramebuffer, t, a, e.COLOR_ATTACHMENT0 + i, c, 0), _(a) && v(c);
			}
			n.unbindTexture();
		} else {
			let r = e.TEXTURE_2D;
			if ((t.isWebGL3DRenderTarget || t.isWebGLArrayRenderTarget) && (r = t.isWebGL3DRenderTarget ? e.TEXTURE_3D : e.TEXTURE_2D_ARRAY), n.bindTexture(r, c.__webglTexture), L(r, i), i.mipmaps && i.mipmaps.length > 0) for (let n = 0; n < i.mipmaps.length; n++) ce(s.__webglFramebuffer[n], t, i, e.COLOR_ATTACHMENT0, r, n);
			else ce(s.__webglFramebuffer, t, i, e.COLOR_ATTACHMENT0, r, 0);
			_(i) && v(r), n.unbindTexture();
		}
		t.depthBuffer && de(t);
	}
	function me(e) {
		let t = e.textures;
		for (let i = 0, a = t.length; i < a; i++) {
			let a = t[i];
			if (_(a)) {
				let t = y(e), i = r.get(a).__webglTexture;
				n.bindTexture(t, i), v(t), n.unbindTexture();
			}
		}
	}
	let he = [], ge = [];
	function _e(t) {
		if (t.samples > 0) {
			if (z(t) === !1) {
				let i = t.textures, a = t.width, o = t.height, s = e.COLOR_BUFFER_BIT, l = t.stencilBuffer ? e.DEPTH_STENCIL_ATTACHMENT : e.DEPTH_ATTACHMENT, u = r.get(t), d = i.length > 1;
				if (d) for (let t = 0; t < i.length; t++) n.bindFramebuffer(e.FRAMEBUFFER, u.__webglMultisampledFramebuffer), e.framebufferRenderbuffer(e.FRAMEBUFFER, e.COLOR_ATTACHMENT0 + t, e.RENDERBUFFER, null), n.bindFramebuffer(e.FRAMEBUFFER, u.__webglFramebuffer), e.framebufferTexture2D(e.DRAW_FRAMEBUFFER, e.COLOR_ATTACHMENT0 + t, e.TEXTURE_2D, null, 0);
				n.bindFramebuffer(e.READ_FRAMEBUFFER, u.__webglMultisampledFramebuffer);
				let f = t.texture.mipmaps;
				f && f.length > 0 ? n.bindFramebuffer(e.DRAW_FRAMEBUFFER, u.__webglFramebuffer[0]) : n.bindFramebuffer(e.DRAW_FRAMEBUFFER, u.__webglFramebuffer);
				for (let n = 0; n < i.length; n++) {
					if (t.resolveDepthBuffer && (t.depthBuffer && (s |= e.DEPTH_BUFFER_BIT), t.stencilBuffer && t.resolveStencilBuffer && (s |= e.STENCIL_BUFFER_BIT)), d) {
						e.framebufferRenderbuffer(e.READ_FRAMEBUFFER, e.COLOR_ATTACHMENT0, e.RENDERBUFFER, u.__webglColorRenderbuffer[n]);
						let t = r.get(i[n]).__webglTexture;
						e.framebufferTexture2D(e.DRAW_FRAMEBUFFER, e.COLOR_ATTACHMENT0, e.TEXTURE_2D, t, 0);
					}
					e.blitFramebuffer(0, 0, a, o, 0, 0, a, o, s, e.NEAREST), c === !0 && (he.length = 0, ge.length = 0, he.push(e.COLOR_ATTACHMENT0 + n), t.depthBuffer && t.storeMultisampledDepthBuffer === !1 && (he.push(l), ge.push(l), e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER, ge)), e.invalidateFramebuffer(e.READ_FRAMEBUFFER, he));
				}
				if (n.bindFramebuffer(e.READ_FRAMEBUFFER, null), n.bindFramebuffer(e.DRAW_FRAMEBUFFER, null), d) for (let t = 0; t < i.length; t++) {
					n.bindFramebuffer(e.FRAMEBUFFER, u.__webglMultisampledFramebuffer), e.framebufferRenderbuffer(e.FRAMEBUFFER, e.COLOR_ATTACHMENT0 + t, e.RENDERBUFFER, u.__webglColorRenderbuffer[t]);
					let a = r.get(i[t]).__webglTexture;
					n.bindFramebuffer(e.FRAMEBUFFER, u.__webglFramebuffer), e.framebufferTexture2D(e.DRAW_FRAMEBUFFER, e.COLOR_ATTACHMENT0 + t, e.TEXTURE_2D, a, 0);
				}
				n.bindFramebuffer(e.DRAW_FRAMEBUFFER, u.__webglMultisampledFramebuffer);
			} else if (t.depthBuffer && t.storeMultisampledDepthBuffer === !1 && c) {
				let n = t.stencilBuffer ? e.DEPTH_STENCIL_ATTACHMENT : e.DEPTH_ATTACHMENT;
				e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER, [n]);
			}
		}
	}
	function ve(e) {
		return Math.min(i.maxSamples, e.samples);
	}
	function z(e) {
		let n = r.get(e);
		return e.samples > 0 && t.has("WEBGL_multisampled_render_to_texture") === !0 && n.__useRenderToTexture !== !1;
	}
	function ye(e) {
		let t = o.render.frame;
		u.get(e) !== t && (u.set(e, t), e.update());
	}
	function be(e, t) {
		let n = e.colorSpace, r = e.format, i = e.type;
		return e.isCompressedTexture === !0 || e.isVideoTexture === !0 || n !== "srgb-linear" && n !== "" && (Y.getTransfer(n) === "srgb" ? (r !== 1023 || i !== 1009) && U("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.") : W("WebGLTextures: Unsupported texture color space:", n)), t;
	}
	function xe(e) {
		return typeof HTMLImageElement < "u" && e instanceof HTMLImageElement ? (l.width = e.naturalWidth || e.width, l.height = e.naturalHeight || e.height) : typeof VideoFrame < "u" && e instanceof VideoFrame ? (l.width = e.displayWidth, l.height = e.displayHeight) : (l.width = e.width, l.height = e.height), l;
	}
	this.allocateTextureUnit = M, this.resetTextureUnits = k, this.getTextureUnits = A, this.setTextureUnits = j, this.setTexture2D = P, this.setTexture2DArray = F, this.setTexture3D = I, this.setTextureCube = ee, this.rebindTextures = fe, this.setupRenderTarget = pe, this.updateRenderTargetMipmap = me, this.updateMultisampleRenderTarget = _e, this.setupDepthRenderbuffer = de, this.setupFrameBufferTexture = ce, this.useMultisampledRTT = z, this.isReversedDepthBuffer = function() {
		return n.buffers.depth.getReversed();
	};
}
function j_(e, t) {
	function n(n, r = "") {
		let i, a = Y.getTransfer(r);
		if (n === 1009) return e.UNSIGNED_BYTE;
		if (n === 1017) return e.UNSIGNED_SHORT_4_4_4_4;
		if (n === 1018) return e.UNSIGNED_SHORT_5_5_5_1;
		if (n === 35902) return e.UNSIGNED_INT_5_9_9_9_REV;
		if (n === 35899) return e.UNSIGNED_INT_10F_11F_11F_REV;
		if (n === 1010) return e.BYTE;
		if (n === 1011) return e.SHORT;
		if (n === 1012) return e.UNSIGNED_SHORT;
		if (n === 1013) return e.INT;
		if (n === 1014) return e.UNSIGNED_INT;
		if (n === 1015) return e.FLOAT;
		if (n === 1016) return e.HALF_FLOAT;
		if (n === 1021) return e.ALPHA;
		if (n === 1022) return e.RGB;
		if (n === 1023) return e.RGBA;
		if (n === 1026) return e.DEPTH_COMPONENT;
		if (n === 1027) return e.DEPTH_STENCIL;
		if (n === 1028) return e.RED;
		if (n === 1029) return e.RED_INTEGER;
		if (n === 1030) return e.RG;
		if (n === 1031) return e.RG_INTEGER;
		if (n === 1033) return e.RGBA_INTEGER;
		if (n === 33776 || n === 33777 || n === 33778 || n === 33779) {
			if (a === "srgb") {
				if (i = t.get("WEBGL_compressed_texture_s3tc_srgb"), i !== null) {
					if (n === 33776) return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;
					if (n === 33777) return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;
					if (n === 33778) return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;
					if (n === 33779) return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT;
				} else return null;
			} else if (i = t.get("WEBGL_compressed_texture_s3tc"), i !== null) {
				if (n === 33776) return i.COMPRESSED_RGB_S3TC_DXT1_EXT;
				if (n === 33777) return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;
				if (n === 33778) return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;
				if (n === 33779) return i.COMPRESSED_RGBA_S3TC_DXT5_EXT;
			} else return null;
		}
		if (n === 35840 || n === 35841 || n === 35842 || n === 35843) {
			if (i = t.get("WEBGL_compressed_texture_pvrtc"), i !== null) {
				if (n === 35840) return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
				if (n === 35841) return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
				if (n === 35842) return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
				if (n === 35843) return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;
			} else return null;
		}
		if (n === 36196 || n === 37492 || n === 37496 || n === 37488 || n === 37489 || n === 37490 || n === 37491) {
			if (i = t.get("WEBGL_compressed_texture_etc"), i !== null) {
				if (n === 36196 || n === 37492) return a === "srgb" ? i.COMPRESSED_SRGB8_ETC2 : i.COMPRESSED_RGB8_ETC2;
				if (n === 37496) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC : i.COMPRESSED_RGBA8_ETC2_EAC;
				if (n === 37488) return i.COMPRESSED_R11_EAC;
				if (n === 37489) return i.COMPRESSED_SIGNED_R11_EAC;
				if (n === 37490) return i.COMPRESSED_RG11_EAC;
				if (n === 37491) return i.COMPRESSED_SIGNED_RG11_EAC;
			} else return null;
		}
		if (n === 37808 || n === 37809 || n === 37810 || n === 37811 || n === 37812 || n === 37813 || n === 37814 || n === 37815 || n === 37816 || n === 37817 || n === 37818 || n === 37819 || n === 37820 || n === 37821) {
			if (i = t.get("WEBGL_compressed_texture_astc"), i !== null) {
				if (n === 37808) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR : i.COMPRESSED_RGBA_ASTC_4x4_KHR;
				if (n === 37809) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR : i.COMPRESSED_RGBA_ASTC_5x4_KHR;
				if (n === 37810) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR : i.COMPRESSED_RGBA_ASTC_5x5_KHR;
				if (n === 37811) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR : i.COMPRESSED_RGBA_ASTC_6x5_KHR;
				if (n === 37812) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR : i.COMPRESSED_RGBA_ASTC_6x6_KHR;
				if (n === 37813) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR : i.COMPRESSED_RGBA_ASTC_8x5_KHR;
				if (n === 37814) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR : i.COMPRESSED_RGBA_ASTC_8x6_KHR;
				if (n === 37815) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR : i.COMPRESSED_RGBA_ASTC_8x8_KHR;
				if (n === 37816) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR : i.COMPRESSED_RGBA_ASTC_10x5_KHR;
				if (n === 37817) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR : i.COMPRESSED_RGBA_ASTC_10x6_KHR;
				if (n === 37818) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR : i.COMPRESSED_RGBA_ASTC_10x8_KHR;
				if (n === 37819) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR : i.COMPRESSED_RGBA_ASTC_10x10_KHR;
				if (n === 37820) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR : i.COMPRESSED_RGBA_ASTC_12x10_KHR;
				if (n === 37821) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR : i.COMPRESSED_RGBA_ASTC_12x12_KHR;
			} else return null;
		}
		if (n === 36492 || n === 36494 || n === 36495) {
			if (i = t.get("EXT_texture_compression_bptc"), i !== null) {
				if (n === 36492) return a === "srgb" ? i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT : i.COMPRESSED_RGBA_BPTC_UNORM_EXT;
				if (n === 36494) return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;
				if (n === 36495) return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT;
			} else return null;
		}
		if (n === 36283 || n === 36284 || n === 36285 || n === 36286) {
			if (i = t.get("EXT_texture_compression_rgtc"), i !== null) {
				if (n === 36283) return i.COMPRESSED_RED_RGTC1_EXT;
				if (n === 36284) return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;
				if (n === 36285) return i.COMPRESSED_RED_GREEN_RGTC2_EXT;
				if (n === 36286) return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT;
			} else return null;
		}
		return n === 1020 ? e.UNSIGNED_INT_24_8 : e[n] === void 0 ? null : e[n];
	}
	return { convert: n };
}
var M_ = "\nvoid main() {\n\n	gl_Position = vec4( position, 1.0 );\n\n}", N_ = "\nuniform sampler2DArray depthColor;\nuniform float depthWidth;\nuniform float depthHeight;\n\nvoid main() {\n\n	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );\n\n	if ( coord.x >= 1.0 ) {\n\n		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;\n\n	} else {\n\n		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;\n\n	}\n\n}", P_ = class {
	constructor() {
		this.texture = null, this.mesh = null, this.depthNear = 0, this.depthFar = 0;
	}
	init(e, t) {
		if (this.texture === null) {
			let n = new fp(e.texture);
			(e.depthNear !== t.depthNear || e.depthFar !== t.depthFar) && (this.depthNear = e.depthNear, this.depthFar = e.depthFar), this.texture = n;
		}
	}
	getMesh(e) {
		if (this.texture !== null && this.mesh === null) {
			let t = e.cameras[0].viewport, n = new Op({
				vertexShader: M_,
				fragmentShader: N_,
				uniforms: {
					depthColor: { value: this.texture },
					depthWidth: { value: t.z },
					depthHeight: { value: t.w }
				}
			});
			this.mesh = new Ff(new yp(20, 20), n);
		}
		return this.mesh;
	}
	reset() {
		this.texture = null, this.mesh = null;
	}
	getDepthTexture() {
		return this.texture;
	}
}, F_ = class extends zl {
	constructor(e, t) {
		super();
		let n = this, r = null, i = 1, a = null, o = "local-floor", s = 1, c = null, l = null, u = null, d = null, f = null, p = null, m = typeof XRWebGLBinding < "u", h = new P_(), g = {}, _ = t.getContextAttributes(), v = null, y = null, b = [], x = [], S = new K(), C = null, w = null, T = new im();
		T.viewport = new ku();
		let E = new im();
		E.viewport = new ku();
		let D = [T, E], O = new lm(), k = null, A = null;
		this.cameraAutoUpdate = !0, this.enabled = !1, this.isPresenting = !1, this.getController = function(e) {
			let t = b[e];
			return t === void 0 && (t = new ud(), b[e] = t), t.getTargetRaySpace();
		}, this.getControllerGrip = function(e) {
			let t = b[e];
			return t === void 0 && (t = new ud(), b[e] = t), t.getGripSpace();
		}, this.getHand = function(e) {
			let t = b[e];
			return t === void 0 && (t = new ud(), b[e] = t), t.getHandSpace();
		};
		function j(e) {
			let t = x.indexOf(e.inputSource);
			if (t === -1) return;
			let n = b[t];
			n !== void 0 && (n.update(e.inputSource, e.frame, c || a), n.dispatchEvent({
				type: e.type,
				data: e.inputSource
			}));
		}
		function M() {
			r.removeEventListener("select", j), r.removeEventListener("selectstart", j), r.removeEventListener("selectend", j), r.removeEventListener("squeeze", j), r.removeEventListener("squeezestart", j), r.removeEventListener("squeezeend", j), r.removeEventListener("end", M), r.removeEventListener("inputsourceschange", N);
			for (let e = 0; e < b.length; e++) {
				let t = x[e];
				t !== null && (x[e] = null, b[e].disconnect(t));
			}
			k = null, A = null, h.reset();
			for (let e in g) delete g[e];
			if (e.setRenderTarget(v), f = null, d = null, u = null, r = null, y = null, L.stop(), n.isPresenting = !1, e.setPixelRatio(C), e.setSize(S.width, S.height, !1), w !== null) {
				let e = w.camera;
				e.fov = w.fov, e.zoom = w.zoom, e.updateProjectionMatrix(), w = null;
			}
			n.dispatchEvent({ type: "sessionend" });
		}
		this.setFramebufferScaleFactor = function(e) {
			i = e, n.isPresenting === !0 && U("WebXRManager: Cannot change framebuffer scale while presenting.");
		}, this.setReferenceSpaceType = function(e) {
			o = e, n.isPresenting === !0 && U("WebXRManager: Cannot change reference space type while presenting.");
		}, this.getReferenceSpace = function() {
			return c || a;
		}, this.setReferenceSpace = function(e) {
			c = e;
		}, this.getBaseLayer = function() {
			return d === null ? f : d;
		}, this.getBinding = function() {
			return u === null && m && (u = new XRWebGLBinding(r, t)), u;
		}, this.getFrame = function() {
			return p;
		}, this.getSession = function() {
			return r;
		}, this.setSession = async function(l) {
			if (r = l, r !== null) {
				if (v = e.getRenderTarget(), r.addEventListener("select", j), r.addEventListener("selectstart", j), r.addEventListener("selectend", j), r.addEventListener("squeeze", j), r.addEventListener("squeezestart", j), r.addEventListener("squeezeend", j), r.addEventListener("end", M), r.addEventListener("inputsourceschange", N), _.xrCompatible !== !0 && await t.makeXRCompatible(), C = e.getPixelRatio(), e.getSize(S), m && "createProjectionLayer" in XRWebGLBinding.prototype) {
					let n = null, a = null, o = null;
					_.depth && (o = _.stencil ? t.DEPTH24_STENCIL8 : t.DEPTH_COMPONENT24, n = _.stencil ? wc : Cc, a = _.stencil ? _c : fc);
					let s = {
						colorFormat: t.RGBA8,
						depthFormat: o,
						scaleFactor: i
					};
					u = this.getBinding(), d = u.createProjectionLayer(s), r.updateRenderState({ layers: [d] }), e.setPixelRatio(1), e.setSize(d.textureWidth, d.textureHeight, !1), y = new ju(d.textureWidth, d.textureHeight, {
						format: Sc,
						type: sc,
						depthTexture: new up(d.textureWidth, d.textureHeight, a, void 0, void 0, void 0, void 0, void 0, void 0, n),
						stencilBuffer: _.stencil,
						colorSpace: e.outputColorSpace,
						samples: _.antialias ? 4 : 0,
						resolveDepthBuffer: d.ignoreDepthValues === !1,
						resolveStencilBuffer: d.ignoreDepthValues === !1,
						storeMultisampledDepthBuffer: d.ignoreDepthValues === !1,
						storeMultisampledStencilBuffer: d.ignoreDepthValues === !1
					});
				} else {
					let n = {
						antialias: _.antialias,
						alpha: !0,
						depth: _.depth,
						stencil: _.stencil,
						framebufferScaleFactor: i
					};
					f = new XRWebGLLayer(r, t, n), r.updateRenderState({ baseLayer: f }), e.setPixelRatio(1), e.setSize(f.framebufferWidth, f.framebufferHeight, !1), y = new ju(f.framebufferWidth, f.framebufferHeight, {
						format: Sc,
						type: sc,
						colorSpace: e.outputColorSpace,
						stencilBuffer: _.stencil,
						resolveDepthBuffer: f.ignoreDepthValues === !1,
						resolveStencilBuffer: f.ignoreDepthValues === !1,
						storeMultisampledDepthBuffer: f.ignoreDepthValues === !1,
						storeMultisampledStencilBuffer: f.ignoreDepthValues === !1
					});
				}
				y.isXRRenderTarget = !0, this.setFoveation(s), c = null, a = await r.requestReferenceSpace(o), L.setContext(r), L.start(), n.isPresenting = !0, n.dispatchEvent({ type: "sessionstart" });
			}
		}, this.getEnvironmentBlendMode = function() {
			if (r !== null) return r.environmentBlendMode;
		}, this.getDepthTexture = function() {
			return h.getDepthTexture();
		};
		function N(e) {
			for (let t = 0; t < e.removed.length; t++) {
				let n = e.removed[t], r = x.indexOf(n);
				r >= 0 && (x[r] = null, b[r].disconnect(n));
			}
			for (let t = 0; t < e.added.length; t++) {
				let n = e.added[t], r = x.indexOf(n);
				if (r === -1) {
					for (let e = 0; e < b.length; e++) if (e >= x.length) {
						x.push(n), r = e;
						break;
					} else if (x[e] === null) {
						x[e] = n, r = e;
						break;
					}
					if (r === -1) break;
				}
				let i = b[r];
				i && i.connect(n);
			}
		}
		let P = new q(), F = new q();
		function I(e, t, n) {
			P.setFromMatrixPosition(t.matrixWorld), F.setFromMatrixPosition(n.matrixWorld);
			let r = P.distanceTo(F), i = t.projectionMatrix.elements, a = n.projectionMatrix.elements, o = i[14] / (i[10] - 1), s = i[14] / (i[10] + 1), c = (i[9] + 1) / i[5], l = (i[9] - 1) / i[5], u = (i[8] - 1) / i[0], d = (a[8] + 1) / a[0], f = o * u, p = o * d, m = r / (-u + d), h = m * -u;
			if (t.matrixWorld.decompose(e.position, e.quaternion, e.scale), e.translateX(h), e.translateZ(m), e.matrixWorld.compose(e.position, e.quaternion, e.scale), e.matrixWorldInverse.copy(e.matrixWorld).invert(), i[10] === -1) e.projectionMatrix.copy(t.projectionMatrix), e.projectionMatrixInverse.copy(t.projectionMatrixInverse);
			else {
				let t = o + m, n = s + m, i = f - h, a = p + (r - h), u = c * s / n * t, d = l * s / n * t;
				e.projectionMatrix.makePerspective(i, a, u, d, t, n), e.projectionMatrixInverse.copy(e.projectionMatrix).invert();
			}
		}
		function ee(e, t) {
			t === null ? e.matrixWorld.copy(e.matrix) : e.matrixWorld.multiplyMatrices(t.matrixWorld, e.matrix), e.matrixWorldInverse.copy(e.matrixWorld).invert();
		}
		this.updateCamera = function(e) {
			if (r === null) return;
			let t = e.near, n = e.far;
			h.texture !== null && (h.depthNear > 0 && (t = h.depthNear), h.depthFar > 0 && (n = h.depthFar)), O.near = E.near = T.near = t, O.far = E.far = T.far = n, (k !== O.near || A !== O.far) && (r.updateRenderState({
				depthNear: O.near,
				depthFar: O.far
			}), k = O.near, A = O.far), O.layers.mask = e.layers.mask | 6, T.layers.mask = O.layers.mask & -5, E.layers.mask = O.layers.mask & -3;
			let i = e.parent, a = O.cameras;
			ee(O, i);
			for (let e = 0; e < a.length; e++) ee(a[e], i);
			a.length === 2 ? I(O, T, E) : O.projectionMatrix.copy(T.projectionMatrix), w === null && e.isPerspectiveCamera && (w = {
				camera: e,
				fov: e.fov,
				zoom: e.zoom
			}), te(e, O, i);
		};
		function te(e, t, n) {
			n === null ? e.matrix.copy(t.matrixWorld) : (e.matrix.copy(n.matrixWorld), e.matrix.invert(), e.matrix.multiply(t.matrixWorld)), e.matrix.decompose(e.position, e.quaternion, e.scale), e.updateMatrixWorld(!0), e.projectionMatrix.copy(t.projectionMatrix), e.projectionMatrixInverse.copy(t.projectionMatrixInverse), e.isPerspectiveCamera && (e.fov = Ul * 2 * Math.atan(1 / e.projectionMatrix.elements[5]), e.zoom = 1);
		}
		this.getCamera = function() {
			return O;
		}, this.getFoveation = function() {
			if (d !== null || f !== null) return s;
		}, this.setFoveation = function(e) {
			s = e, d !== null && (d.fixedFoveation = e), f !== null && f.fixedFoveation !== void 0 && (f.fixedFoveation = e);
		}, this.hasDepthSensing = function() {
			return h.texture !== null;
		}, this.getDepthSensingMesh = function() {
			return h.getMesh(O);
		}, this.getCameraTexture = function(e) {
			return g[e];
		};
		let ne = null;
		function re(t, i) {
			if (l = i.getViewerPose(c || a), p = i, l !== null) {
				let t = l.views;
				f !== null && (e.setRenderTargetFramebuffer(y, f.framebuffer), e.setRenderTarget(y));
				let i = !1;
				t.length !== O.cameras.length && (O.cameras.length = 0, i = !0);
				for (let n = 0; n < t.length; n++) {
					let r = t[n], a = null;
					if (f !== null) a = f.getViewport(r);
					else {
						let t = u.getViewSubImage(d, r);
						a = t.viewport, n === 0 && (e.setRenderTargetTextures(y, t.colorTexture, t.depthStencilTexture), e.setRenderTarget(y));
					}
					let o = D[n];
					o === void 0 && (o = new im(), o.layers.enable(n), o.viewport = new ku(), D[n] = o), o.matrix.fromArray(r.transform.matrix), o.matrix.decompose(o.position, o.quaternion, o.scale), o.projectionMatrix.fromArray(r.projectionMatrix), o.projectionMatrixInverse.copy(o.projectionMatrix).invert(), o.viewport.set(a.x, a.y, a.width, a.height), n === 0 && (O.matrix.copy(o.matrix), O.matrix.decompose(O.position, O.quaternion, O.scale)), i === !0 && O.cameras.push(o);
				}
				let a = r.enabledFeatures;
				if (a && a.includes("depth-sensing") && r.depthUsage == "gpu-optimized" && m) {
					u = n.getBinding();
					let e = u.getDepthInformation(t[0]);
					e && e.isValid && e.texture && h.init(e, r.renderState);
				}
				if (a && a.includes("camera-access") && m) {
					e.state.unbindTexture(), u = n.getBinding();
					for (let e = 0; e < t.length; e++) {
						let n = t[e].camera;
						if (n) {
							let e = g[n];
							e || (e = new fp(), g[n] = e);
							let t = u.getCameraImage(n);
							e.sourceTexture = t;
						}
					}
				}
			}
			for (let e = 0; e < b.length; e++) {
				let t = x[e], n = b[e];
				t !== null && n !== void 0 && n.update(t, i, c || a);
			}
			ne && ne(t, i), i.detectedPlanes && n.dispatchEvent({
				type: "planesdetected",
				data: i
			}), p = null;
		}
		let L = new Dm();
		L.setAnimationLoop(re), this.setAnimationLoop = function(e) {
			ne = e;
		}, this.dispose = function() {};
	}
}, I_ = /*@__PURE__*/ new Pu(), L_ = /*@__PURE__*/ new J();
L_.set(-1, 0, 0, 0, 1, 0, 0, 0, 1);
function R_(e, t) {
	function n(e, t) {
		e.matrixAutoUpdate === !0 && e.updateMatrix(), t.value.copy(e.matrix);
	}
	function r(t, n) {
		n.color.getRGB(t.fogColor.value, wp(e)), n.isFog ? (t.fogNear.value = n.near, t.fogFar.value = n.far) : n.isFogExp2 && (t.fogDensity.value = n.density);
	}
	function i(e, t, n, r, i) {
		t.isNodeMaterial ? t.uniformsNeedUpdate = !1 : t.isMeshBasicMaterial ? a(e, t) : t.isMeshLambertMaterial ? (a(e, t), t.envMap && (e.envMapIntensity.value = t.envMapIntensity)) : t.isMeshToonMaterial ? (a(e, t), d(e, t)) : t.isMeshPhongMaterial ? (a(e, t), u(e, t), t.envMap && (e.envMapIntensity.value = t.envMapIntensity)) : t.isMeshStandardMaterial ? (a(e, t), f(e, t), t.isMeshPhysicalMaterial && p(e, t, i)) : t.isMeshMatcapMaterial ? (a(e, t), m(e, t)) : t.isMeshDepthMaterial ? a(e, t) : t.isMeshDistanceMaterial ? (a(e, t), h(e, t)) : t.isMeshNormalMaterial ? a(e, t) : t.isLineBasicMaterial ? (o(e, t), t.isLineDashedMaterial && s(e, t)) : t.isPointsMaterial ? c(e, t, n, r) : t.isSpriteMaterial ? l(e, t) : t.isShadowMaterial ? (e.color.value.copy(t.color), e.opacity.value = t.opacity) : t.isShaderMaterial && (t.uniformsNeedUpdate = !1);
	}
	function a(e, r) {
		e.opacity.value = r.opacity, r.color && e.diffuse.value.copy(r.color), r.emissive && e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity), r.map && (e.map.value = r.map, n(r.map, e.mapTransform)), r.alphaMap && (e.alphaMap.value = r.alphaMap, n(r.alphaMap, e.alphaMapTransform)), r.bumpMap && (e.bumpMap.value = r.bumpMap, n(r.bumpMap, e.bumpMapTransform), e.bumpScale.value = r.bumpScale, r.side === 1 && (e.bumpScale.value *= -1)), r.normalMap && (e.normalMap.value = r.normalMap, n(r.normalMap, e.normalMapTransform), e.normalScale.value.copy(r.normalScale), r.side === 1 && e.normalScale.value.negate()), r.displacementMap && (e.displacementMap.value = r.displacementMap, n(r.displacementMap, e.displacementMapTransform), e.displacementScale.value = r.displacementScale, e.displacementBias.value = r.displacementBias), r.emissiveMap && (e.emissiveMap.value = r.emissiveMap, n(r.emissiveMap, e.emissiveMapTransform)), r.specularMap && (e.specularMap.value = r.specularMap, n(r.specularMap, e.specularMapTransform)), r.alphaTest > 0 && (e.alphaTest.value = r.alphaTest);
		let i = t.get(r), a = i.envMap, o = i.envMapRotation;
		a && (e.envMap.value = a, e.envMapRotation.value.setFromMatrix4(I_.makeRotationFromEuler(o)).transpose(), a.isCubeTexture && a.isRenderTargetTexture === !1 && e.envMapRotation.value.premultiply(L_), e.reflectivity.value = r.reflectivity, e.ior.value = r.ior, e.refractionRatio.value = r.refractionRatio), r.lightMap && (e.lightMap.value = r.lightMap, e.lightMapIntensity.value = r.lightMapIntensity, n(r.lightMap, e.lightMapTransform)), r.aoMap && (e.aoMap.value = r.aoMap, e.aoMapIntensity.value = r.aoMapIntensity, n(r.aoMap, e.aoMapTransform));
	}
	function o(e, t) {
		e.diffuse.value.copy(t.color), e.opacity.value = t.opacity, t.map && (e.map.value = t.map, n(t.map, e.mapTransform));
	}
	function s(e, t) {
		e.dashSize.value = t.dashSize, e.totalSize.value = t.dashSize + t.gapSize, e.scale.value = t.scale;
	}
	function c(e, t, r, i) {
		e.diffuse.value.copy(t.color), e.opacity.value = t.opacity, e.size.value = t.size * r, e.scale.value = i * .5, t.map && (e.map.value = t.map, n(t.map, e.uvTransform)), t.alphaMap && (e.alphaMap.value = t.alphaMap, n(t.alphaMap, e.alphaMapTransform)), t.alphaTest > 0 && (e.alphaTest.value = t.alphaTest);
	}
	function l(e, t) {
		e.diffuse.value.copy(t.color), e.opacity.value = t.opacity, e.rotation.value = t.rotation, t.map && (e.map.value = t.map, n(t.map, e.mapTransform)), t.alphaMap && (e.alphaMap.value = t.alphaMap, n(t.alphaMap, e.alphaMapTransform)), t.alphaTest > 0 && (e.alphaTest.value = t.alphaTest);
	}
	function u(e, t) {
		e.specular.value.copy(t.specular), e.shininess.value = Math.max(t.shininess, 1e-4);
	}
	function d(e, t) {
		t.gradientMap && (e.gradientMap.value = t.gradientMap);
	}
	function f(e, t) {
		e.metalness.value = t.metalness, t.metalnessMap && (e.metalnessMap.value = t.metalnessMap, n(t.metalnessMap, e.metalnessMapTransform)), e.roughness.value = t.roughness, t.roughnessMap && (e.roughnessMap.value = t.roughnessMap, n(t.roughnessMap, e.roughnessMapTransform)), t.envMap && (e.envMapIntensity.value = t.envMapIntensity);
	}
	function p(e, t, r) {
		e.ior.value = t.ior, t.sheen > 0 && (e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen), e.sheenRoughness.value = t.sheenRoughness, t.sheenColorMap && (e.sheenColorMap.value = t.sheenColorMap, n(t.sheenColorMap, e.sheenColorMapTransform)), t.sheenRoughnessMap && (e.sheenRoughnessMap.value = t.sheenRoughnessMap, n(t.sheenRoughnessMap, e.sheenRoughnessMapTransform))), t.clearcoat > 0 && (e.clearcoat.value = t.clearcoat, e.clearcoatRoughness.value = t.clearcoatRoughness, t.clearcoatMap && (e.clearcoatMap.value = t.clearcoatMap, n(t.clearcoatMap, e.clearcoatMapTransform)), t.clearcoatRoughnessMap && (e.clearcoatRoughnessMap.value = t.clearcoatRoughnessMap, n(t.clearcoatRoughnessMap, e.clearcoatRoughnessMapTransform)), t.clearcoatNormalMap && (e.clearcoatNormalMap.value = t.clearcoatNormalMap, n(t.clearcoatNormalMap, e.clearcoatNormalMapTransform), e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale), t.side === 1 && e.clearcoatNormalScale.value.negate())), t.dispersion > 0 && (e.dispersion.value = t.dispersion), t.retroreflectivity > 0 && (e.retroreflectivity.value = t.retroreflectivity), t.iridescence > 0 && (e.iridescence.value = t.iridescence, e.iridescenceIOR.value = t.iridescenceIOR, e.iridescenceThicknessMinimum.value = t.iridescenceThicknessRange[0], e.iridescenceThicknessMaximum.value = t.iridescenceThicknessRange[1], t.iridescenceMap && (e.iridescenceMap.value = t.iridescenceMap, n(t.iridescenceMap, e.iridescenceMapTransform)), t.iridescenceThicknessMap && (e.iridescenceThicknessMap.value = t.iridescenceThicknessMap, n(t.iridescenceThicknessMap, e.iridescenceThicknessMapTransform))), t.transmission > 0 && (e.transmission.value = t.transmission, e.transmissionSamplerMap.value = r.texture, e.transmissionSamplerSize.value.set(r.width, r.height), t.transmissionMap && (e.transmissionMap.value = t.transmissionMap, n(t.transmissionMap, e.transmissionMapTransform)), e.thickness.value = t.thickness, t.thicknessMap && (e.thicknessMap.value = t.thicknessMap, n(t.thicknessMap, e.thicknessMapTransform)), e.attenuationDistance.value = t.attenuationDistance, e.attenuationColor.value.copy(t.attenuationColor)), t.anisotropy > 0 && (e.anisotropyVector.value.set(t.anisotropy * Math.cos(t.anisotropyRotation), t.anisotropy * Math.sin(t.anisotropyRotation)), t.anisotropyMap && (e.anisotropyMap.value = t.anisotropyMap, n(t.anisotropyMap, e.anisotropyMapTransform))), e.specularIntensity.value = t.specularIntensity, e.specularColor.value.copy(t.specularColor), t.specularColorMap && (e.specularColorMap.value = t.specularColorMap, n(t.specularColorMap, e.specularColorMapTransform)), t.specularIntensityMap && (e.specularIntensityMap.value = t.specularIntensityMap, n(t.specularIntensityMap, e.specularIntensityMapTransform));
	}
	function m(e, t) {
		t.matcap && (e.matcap.value = t.matcap);
	}
	function h(e, n) {
		let r = t.get(n).light;
		e.referencePosition.value.setFromMatrixPosition(r.matrixWorld), e.nearDistance.value = r.shadow.camera.near, e.farDistance.value = r.shadow.camera.far;
	}
	return {
		refreshFogUniforms: r,
		refreshMaterialUniforms: i
	};
}
function z_(e, t, n, r) {
	let i = {}, a = {}, o = [], s = e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);
	function c(e, t) {
		let n = t.program;
		r.uniformBlockBinding(e, n);
	}
	function l(e, n) {
		let o = i[e.id];
		o === void 0 && (g(e), o = u(e), i[e.id] = o, e.addEventListener("dispose", v));
		let s = n.program;
		r.updateUBOMapping(e, s);
		let c = t.render.frame;
		a[e.id] !== c && (f(e), a[e.id] = c);
	}
	function u(t) {
		let n = d();
		t.__bindingPointIndex = n;
		let r = e.createBuffer(), i = t.__size, a = t.usage;
		return e.bindBuffer(e.UNIFORM_BUFFER, r), e.bufferData(e.UNIFORM_BUFFER, i, a), e.bindBuffer(e.UNIFORM_BUFFER, null), e.bindBufferBase(e.UNIFORM_BUFFER, n, r), r;
	}
	function d() {
		for (let e = 0; e < s; e++) if (o.indexOf(e) === -1) return o.push(e), e;
		return W("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."), 0;
	}
	function f(t) {
		let n = i[t.id], r = t.uniforms, a = t.__cache;
		e.bindBuffer(e.UNIFORM_BUFFER, n);
		for (let e = 0, t = r.length; e < t; e++) {
			let t = r[e];
			if (Array.isArray(t)) for (let n = 0, r = t.length; n < r; n++) p(t[n], e, n, a);
			else p(t, e, 0, a);
		}
		e.bindBuffer(e.UNIFORM_BUFFER, null);
	}
	function p(t, n, r, i) {
		if (h(t, n, r, i) === !0) {
			let n = t.__offset, r = t.value;
			if (Array.isArray(r)) {
				let e = 0;
				for (let n = 0; n < r.length; n++) {
					let i = r[n], a = _(i);
					m(i, t.__data, e), typeof i != "number" && typeof i != "boolean" && !i.isMatrix3 && !ArrayBuffer.isView(i) && (e += a.storage / Float32Array.BYTES_PER_ELEMENT);
				}
			} else m(r, t.__data, 0);
			e.bufferSubData(e.UNIFORM_BUFFER, n, t.__data);
		}
	}
	function m(e, t, n) {
		typeof e == "number" || typeof e == "boolean" ? t[0] = e : e.isMatrix3 ? (t[0] = e.elements[0], t[1] = e.elements[1], t[2] = e.elements[2], t[3] = 0, t[4] = e.elements[3], t[5] = e.elements[4], t[6] = e.elements[5], t[7] = 0, t[8] = e.elements[6], t[9] = e.elements[7], t[10] = e.elements[8], t[11] = 0) : ArrayBuffer.isView(e) ? t.set(new e.constructor(e.buffer, e.byteOffset, t.length)) : e.toArray(t, n);
	}
	function h(e, t, n, r) {
		let i = e.value, a = t + "_" + n;
		if (r[a] === void 0) return r[a] = typeof i == "number" || typeof i == "boolean" ? i : ArrayBuffer.isView(i) ? i.slice() : i.clone(), !0;
		{
			let e = r[a];
			if (typeof i == "number" || typeof i == "boolean") {
				if (e !== i) return r[a] = i, !0;
			} else if (ArrayBuffer.isView(i)) return !0;
			else if (e.equals(i) === !1) return e.copy(i), !0;
		}
		return !1;
	}
	function g(e) {
		let t = e.uniforms, n = 0;
		for (let e = 0, r = t.length; e < r; e++) {
			let r = Array.isArray(t[e]) ? t[e] : [t[e]];
			for (let e = 0, t = r.length; e < t; e++) {
				let t = r[e], i = Array.isArray(t.value) ? t.value : [t.value];
				for (let e = 0, r = i.length; e < r; e++) {
					let r = i[e], a = _(r), o = n % 16, s = o % a.boundary, c = o + s;
					n += s, c !== 0 && 16 - c < a.storage && (n += 16 - c), t.__data = new Float32Array(a.storage / Float32Array.BYTES_PER_ELEMENT), t.__offset = n, n += a.storage;
				}
			}
		}
		let r = n % 16;
		return r > 0 && (n += 16 - r), e.__size = n, e.__cache = {}, this;
	}
	function _(e) {
		let t = {
			boundary: 0,
			storage: 0
		};
		return typeof e == "number" || typeof e == "boolean" ? (t.boundary = 4, t.storage = 4) : e.isVector2 ? (t.boundary = 8, t.storage = 8) : e.isVector3 || e.isColor ? (t.boundary = 16, t.storage = 12) : e.isVector4 ? (t.boundary = 16, t.storage = 16) : e.isMatrix3 ? (t.boundary = 48, t.storage = 48) : e.isMatrix4 ? (t.boundary = 64, t.storage = 64) : e.isTexture ? U("WebGLRenderer: Texture samplers can not be part of an uniforms group.") : ArrayBuffer.isView(e) ? (t.boundary = 16, t.storage = e.byteLength) : U("WebGLRenderer: Unsupported uniform value type.", e), t;
	}
	function v(t) {
		let n = t.target;
		n.removeEventListener("dispose", v);
		let r = o.indexOf(n.__bindingPointIndex);
		o.splice(r, 1), e.deleteBuffer(i[n.id]), delete i[n.id], delete a[n.id];
	}
	function y() {
		for (let t in i) e.deleteBuffer(i[t]);
		o = [], i = {}, a = {};
	}
	return {
		bind: c,
		update: l,
		dispose: y
	};
}
var B_ = new Uint16Array([
	12469,
	15057,
	12620,
	14925,
	13266,
	14620,
	13807,
	14376,
	14323,
	13990,
	14545,
	13625,
	14713,
	13328,
	14840,
	12882,
	14931,
	12528,
	14996,
	12233,
	15039,
	11829,
	15066,
	11525,
	15080,
	11295,
	15085,
	10976,
	15082,
	10705,
	15073,
	10495,
	13880,
	14564,
	13898,
	14542,
	13977,
	14430,
	14158,
	14124,
	14393,
	13732,
	14556,
	13410,
	14702,
	12996,
	14814,
	12596,
	14891,
	12291,
	14937,
	11834,
	14957,
	11489,
	14958,
	11194,
	14943,
	10803,
	14921,
	10506,
	14893,
	10278,
	14858,
	9960,
	14484,
	14039,
	14487,
	14025,
	14499,
	13941,
	14524,
	13740,
	14574,
	13468,
	14654,
	13106,
	14743,
	12678,
	14818,
	12344,
	14867,
	11893,
	14889,
	11509,
	14893,
	11180,
	14881,
	10751,
	14852,
	10428,
	14812,
	10128,
	14765,
	9754,
	14712,
	9466,
	14764,
	13480,
	14764,
	13475,
	14766,
	13440,
	14766,
	13347,
	14769,
	13070,
	14786,
	12713,
	14816,
	12387,
	14844,
	11957,
	14860,
	11549,
	14868,
	11215,
	14855,
	10751,
	14825,
	10403,
	14782,
	10044,
	14729,
	9651,
	14666,
	9352,
	14599,
	9029,
	14967,
	12835,
	14966,
	12831,
	14963,
	12804,
	14954,
	12723,
	14936,
	12564,
	14917,
	12347,
	14900,
	11958,
	14886,
	11569,
	14878,
	11247,
	14859,
	10765,
	14828,
	10401,
	14784,
	10011,
	14727,
	9600,
	14660,
	9289,
	14586,
	8893,
	14508,
	8533,
	15111,
	12234,
	15110,
	12234,
	15104,
	12216,
	15092,
	12156,
	15067,
	12010,
	15028,
	11776,
	14981,
	11500,
	14942,
	11205,
	14902,
	10752,
	14861,
	10393,
	14812,
	9991,
	14752,
	9570,
	14682,
	9252,
	14603,
	8808,
	14519,
	8445,
	14431,
	8145,
	15209,
	11449,
	15208,
	11451,
	15202,
	11451,
	15190,
	11438,
	15163,
	11384,
	15117,
	11274,
	15055,
	10979,
	14994,
	10648,
	14932,
	10343,
	14871,
	9936,
	14803,
	9532,
	14729,
	9218,
	14645,
	8742,
	14556,
	8381,
	14461,
	8020,
	14365,
	7603,
	15273,
	10603,
	15272,
	10607,
	15267,
	10619,
	15256,
	10631,
	15231,
	10614,
	15182,
	10535,
	15118,
	10389,
	15042,
	10167,
	14963,
	9787,
	14883,
	9447,
	14800,
	9115,
	14710,
	8665,
	14615,
	8318,
	14514,
	7911,
	14411,
	7507,
	14279,
	7198,
	15314,
	9675,
	15313,
	9683,
	15309,
	9712,
	15298,
	9759,
	15277,
	9797,
	15229,
	9773,
	15166,
	9668,
	15084,
	9487,
	14995,
	9274,
	14898,
	8910,
	14800,
	8539,
	14697,
	8234,
	14590,
	7790,
	14479,
	7409,
	14367,
	7067,
	14178,
	6621,
	15337,
	8619,
	15337,
	8631,
	15333,
	8677,
	15325,
	8769,
	15305,
	8871,
	15264,
	8940,
	15202,
	8909,
	15119,
	8775,
	15022,
	8565,
	14916,
	8328,
	14804,
	8009,
	14688,
	7614,
	14569,
	7287,
	14448,
	6888,
	14321,
	6483,
	14088,
	6171,
	15350,
	7402,
	15350,
	7419,
	15347,
	7480,
	15340,
	7613,
	15322,
	7804,
	15287,
	7973,
	15229,
	8057,
	15148,
	8012,
	15046,
	7846,
	14933,
	7611,
	14810,
	7357,
	14682,
	7069,
	14552,
	6656,
	14421,
	6316,
	14251,
	5948,
	14007,
	5528,
	15356,
	5942,
	15356,
	5977,
	15353,
	6119,
	15348,
	6294,
	15332,
	6551,
	15302,
	6824,
	15249,
	7044,
	15171,
	7122,
	15070,
	7050,
	14949,
	6861,
	14818,
	6611,
	14679,
	6349,
	14538,
	6067,
	14398,
	5651,
	14189,
	5311,
	13935,
	4958,
	15359,
	4123,
	15359,
	4153,
	15356,
	4296,
	15353,
	4646,
	15338,
	5160,
	15311,
	5508,
	15263,
	5829,
	15188,
	6042,
	15088,
	6094,
	14966,
	6001,
	14826,
	5796,
	14678,
	5543,
	14527,
	5287,
	14377,
	4985,
	14133,
	4586,
	13869,
	4257,
	15360,
	1563,
	15360,
	1642,
	15358,
	2076,
	15354,
	2636,
	15341,
	3350,
	15317,
	4019,
	15273,
	4429,
	15203,
	4732,
	15105,
	4911,
	14981,
	4932,
	14836,
	4818,
	14679,
	4621,
	14517,
	4386,
	14359,
	4156,
	14083,
	3795,
	13808,
	3437,
	15360,
	122,
	15360,
	137,
	15358,
	285,
	15355,
	636,
	15344,
	1274,
	15322,
	2177,
	15281,
	2765,
	15215,
	3223,
	15120,
	3451,
	14995,
	3569,
	14846,
	3567,
	14681,
	3466,
	14511,
	3305,
	14344,
	3121,
	14037,
	2800,
	13753,
	2467,
	15360,
	0,
	15360,
	1,
	15359,
	21,
	15355,
	89,
	15346,
	253,
	15325,
	479,
	15287,
	796,
	15225,
	1148,
	15133,
	1492,
	15008,
	1749,
	14856,
	1882,
	14685,
	1886,
	14506,
	1783,
	14324,
	1608,
	13996,
	1398,
	13702,
	1183
]), V_ = null;
function H_() {
	return V_ === null && (V_ = new Rf(B_, 16, 16, Dc, mc), V_.name = "DFG_LUT", V_.minFilter = ic, V_.magFilter = ic, V_.wrapS = $s, V_.wrapT = $s, V_.generateMipmaps = !1, V_.needsUpdate = !0), V_;
}
var U_ = class {
	constructor(e = {}) {
		let { canvas: t = Ml(), context: n = null, depth: r = !0, stencil: i = !1, alpha: a = !1, antialias: o = !1, premultipliedAlpha: s = !0, preserveDrawingBuffer: c = !1, powerPreference: l = "default", failIfMajorPerformanceCaveat: u = !1, reversedDepthBuffer: d = !1, outputBufferType: f = sc } = e;
		this.isWebGLRenderer = !0;
		let p;
		if (n !== null) {
			if (typeof WebGLRenderingContext < "u" && n instanceof WebGLRenderingContext) throw Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");
			p = n.getContextAttributes().alpha;
		} else p = a;
		let m = f, h = /* @__PURE__ */ new Set([
			kc,
			Oc,
			Ec
		]), g = /* @__PURE__ */ new Set([
			sc,
			fc,
			uc,
			_c,
			hc,
			gc
		]), _ = /* @__PURE__ */ new Uint32Array(4), v = /* @__PURE__ */ new Int32Array(4), y = new q(), b = null, x = null, S = [], C = [], w = null;
		this.domElement = t, this.debug = {
			checkShaderErrors: !0,
			diagnostics: { keywords: !1 },
			onShaderError: null
		}, this.autoClear = !0, this.autoClearColor = !0, this.autoClearDepth = !0, this.autoClearStencil = !0, this.sortObjects = !0, this.clippingPlanes = [], this.localClippingEnabled = !1, this.toneMapping = 0, this.toneMappingExposure = 1, this.transmissionResolutionScale = 1;
		let T = this, E = !1, D = null, O = null, k = null, A = null;
		this._outputColorSpace = bl;
		let j = 0, M = 0, N = null, P = -1, F = null, I = new ku(), ee = new ku(), te = null, ne = new X(0), re = 0, L = t.width, ie = t.height, R = 1, ae = null, oe = null, se = new ku(0, 0, L, ie), ce = new ku(0, 0, L, ie), le = !1, ue = new Hf(), de = !1, fe = !1, pe = new Pu(), me = new q(), he = new ku(), ge = {
			background: null,
			fog: null,
			environment: null,
			overrideMaterial: null,
			isScene: !0
		}, _e = !1;
		function ve() {
			return N === null ? R : 1;
		}
		let z = n;
		function ye(e, n) {
			return t.getContext(e, n);
		}
		let be, xe, B, Se, V, H, Ce, we, Te, Ee, De, Oe, ke, Ae, je, Me, Ne, Pe, Fe, Ie, Le, Re, ze;
		try {
			let e = {
				alpha: !0,
				depth: r,
				stencil: i,
				antialias: o,
				premultipliedAlpha: s,
				preserveDrawingBuffer: c,
				powerPreference: l,
				failIfMajorPerformanceCaveat: u
			};
			if ("setAttribute" in t && t.setAttribute("data-engine", "three.js r186"), t.addEventListener("webglcontextlost", He, !1), t.addEventListener("webglcontextrestored", Ue, !1), t.addEventListener("webglcontextcreationerror", We, !1), z === null) {
				let t = "webgl2";
				if (z = ye(t, e), z === null) throw ye(t) ? Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.") : Error("THREE.WebGLRenderer: Error creating WebGL context.");
			}
			Be();
		} catch (e) {
			throw t.removeEventListener("webglcontextlost", He, !1), t.removeEventListener("webglcontextrestored", Ue, !1), t.removeEventListener("webglcontextcreationerror", We, !1), W("WebGLRenderer: " + e.message), e;
		}
		function Be() {
			be = new sh(z), be.init(), Le = new j_(z, be), xe = new Im(z, be, e, Le), B = new k_(z, be), xe.reversedDepthBuffer && d && B.buffers.depth.setReversed(!0), O = z.createFramebuffer(), k = z.createFramebuffer(), A = z.createFramebuffer(), Se = new uh(z), V = new l_(), H = new A_(z, be, B, V, xe, Le, Se), Ce = new oh(T), we = new Om(z), Re = new Pm(z, we), Te = new ch(z, we, Se, Re), Ee = new fh(z, Te, we, Re, Se), Pe = new dh(z, xe, H), je = new Lm(V), De = new c_(T, Ce, be, xe, Re, je), Oe = new R_(T, V), ke = new p_(), Ae = new b_(be), Ne = new Nm(T, Ce, B, Ee, p, s), Me = new O_(T, Ee, xe), ze = new z_(z, Se, xe, B), Fe = new Fm(z, be, Se), Ie = new lh(z, be, Se), Se.programs = De.programs, T.capabilities = xe, T.extensions = be, T.properties = V, T.renderLists = ke, T.shadowMap = Me, T.state = B, T.info = Se;
		}
		m !== 1009 && (w = new mh(m, t.width, t.height, o, r, i));
		let Ve = new F_(T, z);
		this.xr = Ve, this.getContext = function() {
			return z;
		}, this.getContextAttributes = function() {
			return z.getContextAttributes();
		}, this.forceContextLoss = function() {
			let e = be.get("WEBGL_lose_context");
			e && e.loseContext();
		}, this.forceContextRestore = function() {
			let e = be.get("WEBGL_lose_context");
			e && e.restoreContext();
		}, this.getPixelRatio = function() {
			return R;
		}, this.setPixelRatio = function(e) {
			e !== void 0 && (R = e, this.setSize(L, ie, !1));
		}, this.getSize = function(e) {
			return e.set(L, ie);
		}, this.setSize = function(e, n, r = !0) {
			Ve.isPresenting ? U("WebGLRenderer: Can't change size while VR device is presenting.") : (L = e, ie = n, t.width = Math.floor(e * R), t.height = Math.floor(n * R), r === !0 && (t.style.width = e + "px", t.style.height = n + "px"), w !== null && w.setSize(t.width, t.height), this.setViewport(0, 0, e, n));
		}, this.getDrawingBufferSize = function(e) {
			return e.set(L * R, ie * R).floor();
		}, this.setDrawingBufferSize = function(e, n, r) {
			L = e, ie = n, R = r, t.width = Math.floor(e * r), t.height = Math.floor(n * r), this.setViewport(0, 0, e, n);
		}, this.setEffects = function(e) {
			if (m === 1009) W("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");
			else {
				if (e) {
					for (let t = 0; t < e.length; t++) if (e[t].isOutputPass === !0) {
						U("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");
						break;
					}
				}
				w.setEffects(e || []);
			}
		}, this.getCurrentViewport = function(e) {
			return e.copy(I);
		}, this.getViewport = function(e) {
			return e.copy(se);
		}, this.setViewport = function(e, t, n, r) {
			e.isVector4 ? se.set(e.x, e.y, e.z, e.w) : se.set(e, t, n, r), B.viewport(I.copy(se).multiplyScalar(R).round());
		}, this.getScissor = function(e) {
			return e.copy(ce);
		}, this.setScissor = function(e, t, n, r) {
			e.isVector4 ? ce.set(e.x, e.y, e.z, e.w) : ce.set(e, t, n, r), B.scissor(ee.copy(ce).multiplyScalar(R).round());
		}, this.getScissorTest = function() {
			return le;
		}, this.setScissorTest = function(e) {
			B.setScissorTest(le = e);
		}, this.setOpaqueSort = function(e) {
			ae = e;
		}, this.setTransparentSort = function(e) {
			oe = e;
		}, this.getClearColor = function(e) {
			return e.copy(Ne.getClearColor());
		}, this.setClearColor = function() {
			Ne.setClearColor(...arguments);
		}, this.getClearAlpha = function() {
			return Ne.getClearAlpha();
		}, this.setClearAlpha = function() {
			Ne.setClearAlpha(...arguments);
		}, this.clear = function(e = !0, t = !0, n = !0) {
			let r = 0;
			if (e) {
				let e = !1;
				if (N !== null) {
					let t = N.texture.format;
					e = h.has(t);
				}
				if (e) {
					let e = N.texture.type, t = g.has(e), n = Ne.getClearColor(), r = Ne.getClearAlpha(), i = n.r, a = n.g, o = n.b;
					t ? (_[0] = i, _[1] = a, _[2] = o, _[3] = r, z.clearBufferuiv(z.COLOR, 0, _)) : (v[0] = i, v[1] = a, v[2] = o, v[3] = r, z.clearBufferiv(z.COLOR, 0, v));
				} else r |= z.COLOR_BUFFER_BIT;
			}
			t && (r |= z.DEPTH_BUFFER_BIT, this.state.buffers.depth.setMask(!0)), n && (r |= z.STENCIL_BUFFER_BIT, this.state.buffers.stencil.setMask(4294967295)), r !== 0 && z.clear(r);
		}, this.clearColor = function() {
			this.clear(!0, !1, !1);
		}, this.clearDepth = function() {
			this.clear(!1, !0, !1);
		}, this.clearStencil = function() {
			this.clear(!1, !1, !0);
		}, this.setNodesHandler = function(e) {
			e.setRenderer(this), D = e;
		}, this.dispose = function() {
			t.removeEventListener("webglcontextlost", He, !1), t.removeEventListener("webglcontextrestored", Ue, !1), t.removeEventListener("webglcontextcreationerror", We, !1), Ne.dispose(), ke.dispose(), Ae.dispose(), V.dispose(), Ce.dispose(), Ee.dispose(), Re.dispose(), ze.dispose(), De.dispose(), Ve.dispose(), Ve.removeEventListener("sessionstart", Ze), Ve.removeEventListener("sessionend", Qe), $e.stop();
		};
		function He(e) {
			e.preventDefault(), Pl("WebGLRenderer: Context Lost."), E = !0;
		}
		function Ue() {
			Pl("WebGLRenderer: Context Restored."), E = !1;
			let e = Se.autoReset, t = Me.enabled, n = Me.autoUpdate, r = Me.needsUpdate, i = Me.type;
			Be(), Se.autoReset = e, Me.enabled = t, Me.autoUpdate = n, Me.needsUpdate = r, Me.type = i;
		}
		function We(e) {
			W("WebGLRenderer: A WebGL context could not be created. Reason: ", e.statusMessage);
		}
		function Ge(e) {
			let t = e.target;
			t.removeEventListener("dispose", Ge), Ke(t);
		}
		function Ke(e) {
			qe(e), V.remove(e);
		}
		function qe(e) {
			let t = V.get(e).programs;
			t !== void 0 && (t.forEach(function(e) {
				De.releaseProgram(e);
			}), e.isShaderMaterial && De.releaseShaderCache(e));
		}
		this.renderBufferDirect = function(e, t, n, r, i, a) {
			t === null && (t = ge);
			let o = i.isMesh && i.matrixWorld.determinantAffine() < 0, s = lt(e, t, n, r, i);
			B.setMaterial(r, o);
			let c = n.index, l = 1;
			if (r.wireframe === !0) {
				if (c = Te.getWireframeAttribute(n), c === void 0) return;
				l = 2;
			}
			let u = n.drawRange, d = n.attributes.position, f = u.start * l, p = (u.start + u.count) * l;
			a !== null && (f = Math.max(f, a.start * l), p = Math.min(p, (a.start + a.count) * l)), c === null ? d != null && (f = Math.max(f, 0), p = Math.min(p, d.count)) : (f = Math.max(f, 0), p = Math.min(p, c.count));
			let m = p - f;
			if (m < 0 || m === Infinity) return;
			Re.setup(i, r, s, n, c);
			let h, g = Fe;
			if (c !== null && (h = we.get(c), g = Ie, g.setIndex(h)), i.isMesh) r.wireframe === !0 ? (B.setLineWidth(r.wireframeLinewidth * ve()), g.setMode(z.LINES)) : g.setMode(z.TRIANGLES);
			else if (i.isLine) {
				let e = r.linewidth;
				e === void 0 && (e = 1), B.setLineWidth(e * ve()), i.isLineSegments ? g.setMode(z.LINES) : i.isLineLoop ? g.setMode(z.LINE_LOOP) : g.setMode(z.LINE_STRIP);
			} else i.isPoints ? g.setMode(z.POINTS) : i.isSprite && g.setMode(z.TRIANGLES);
			if (i.isBatchedMesh) {
				if (be.get("WEBGL_multi_draw")) g.renderMultiDraw(i._multiDrawStarts, i._multiDrawCounts, i._multiDrawCount);
				else {
					let e = i._multiDrawStarts, t = i._multiDrawCounts, n = i._multiDrawCount, a = c ? we.get(c).bytesPerElement : 1, o = V.get(r).currentProgram.getUniforms();
					for (let r = 0; r < n; r++) o.setValue(z, "_gl_DrawID", r), g.render(e[r] / a, t[r]);
				}
			} else if (i.isInstancedMesh) g.renderInstances(f, m, i.count);
			else if (n.isInstancedBufferGeometry) {
				let e = n._maxInstanceCount === void 0 ? Infinity : n._maxInstanceCount, t = Math.min(n.instanceCount, e);
				g.renderInstances(f, m, t);
			} else g.render(f, m);
		};
		function Je(e, t, n, r) {
			D !== null && e.isNodeMaterial && D.setObject(r, e), de === !0 && je.setState(e, n, !1), e.transparent === !0 && e.side === 2 && e.forceSinglePass === !1 ? (e.side = 1, e.needsUpdate = !0, at(e, t, r), e.side = 0, e.needsUpdate = !0, at(e, t, r), e.side = 2) : at(e, t, r);
		}
		this.compile = function(e, t, n = null) {
			n === null && (n = e), D !== null && D.renderStart(e, t, n), x = Ae.get(n), x.init(t), C.push(x), n.traverseVisible(function(e) {
				e.isLight && e.layers.test(t.layers) && (x.pushLight(e), e.castShadow && x.pushShadow(e));
			}), e !== n && e.traverseVisible(function(e) {
				e.isLight && e.layers.test(t.layers) && (x.pushLight(e), e.castShadow && x.pushShadow(e));
			}), x.setupLights(), D !== null && D.updateLights(x.state.lightsArray), fe = this.localClippingEnabled, de = je.init(this.clippingPlanes, fe), de === !0 && je.setGlobalState(this.clippingPlanes, t), D !== null && Me.render(x.state.shadowsArray, n, t);
			let r = /* @__PURE__ */ new Set();
			return e.traverse(function(e) {
				if (!(e.isMesh || e.isPoints || e.isLine || e.isSprite)) return;
				let i = e.material;
				if (i) {
					if (Array.isArray(i)) for (let a = 0; a < i.length; a++) {
						let o = i[a];
						Je(o, n, t, e), r.add(o);
					}
					else Je(i, n, t, e), r.add(i);
				}
			}), x = C.pop(), D !== null && D.renderEnd(), r;
		}, this.compileAsync = function(e, t, n = null) {
			let r = this.compile(e, t, n);
			return new Promise((t) => {
				function n() {
					r.forEach(function(e) {
						let t = V.get(e).currentProgram;
						(t === void 0 || t.isReady()) && r.delete(e);
					}), r.size === 0 ? t(e) : setTimeout(n, 10);
				}
				be.get("KHR_parallel_shader_compile") === null ? setTimeout(n, 10) : n();
			});
		};
		let Ye = null;
		function Xe(e) {
			Ye && Ye(e);
		}
		function Ze() {
			$e.stop();
		}
		function Qe() {
			$e.start();
		}
		let $e = new Dm();
		$e.setAnimationLoop(Xe), typeof self < "u" && $e.setContext(self), this.setAnimationLoop = function(e) {
			Ye = e, Ve.setAnimationLoop(e), e === null ? $e.stop() : $e.start();
		}, Ve.addEventListener("sessionstart", Ze), Ve.addEventListener("sessionend", Qe), this.render = function(e, t) {
			if (t !== void 0 && t.isCamera !== !0) {
				W("WebGLRenderer.render: camera is not an instance of THREE.Camera.");
				return;
			}
			if (E === !0) return;
			D !== null && D.renderStart(e, t);
			let n = Ve.enabled === !0 && Ve.isPresenting === !0, r = w !== null && (N === null || n) && w.begin(T, N);
			if (e.matrixWorldAutoUpdate === !0 && e.updateMatrixWorld(), t.parent === null && t.matrixWorldAutoUpdate === !0 && t.updateMatrixWorld(), Ve.enabled === !0 && Ve.isPresenting === !0 && (w === null || w.isCompositing() === !1) && (Ve.cameraAutoUpdate === !0 && Ve.updateCamera(t), t = Ve.getCamera()), e.isScene === !0 && e.onBeforeRender(T, e, t, N), x = Ae.get(e, C.length), x.init(t), x.state.textureUnits = H.getTextureUnits(), C.push(x), pe.multiplyMatrices(t.projectionMatrix, t.matrixWorldInverse), ue.setFromProjectionMatrix(pe, Ol, t.reversedDepth), fe = this.localClippingEnabled, de = je.init(this.clippingPlanes, fe), b = ke.get(e, S.length), b.init(), S.push(b), Ve.enabled === !0 && Ve.isPresenting === !0) {
				let e = T.xr.getDepthSensingMesh();
				e !== null && et(e, t, -Infinity, T.sortObjects);
			}
			et(e, t, 0, T.sortObjects), b.finish(), D !== null && D.updateLights(x.state.lightsArray), T.sortObjects === !0 && b.sort(ae, oe), _e = Ve.enabled === !1 || Ve.isPresenting === !1 || Ve.hasDepthSensing() === !1, _e && Ne.addToRenderList(b, e), this.info.render.frame++, this.info.autoReset === !0 && this.info.reset(), de === !0 && je.beginShadows();
			let i = x.state.shadowsArray;
			if (Me.render(i, e, t), de === !0 && je.endShadows(), (r && w.hasRenderPass()) === !1) {
				let n = b.opaque, r = b.transmissive;
				if (x.setupLights(), t.isArrayCamera) {
					let i = t.cameras;
					if (r.length > 0) for (let t = 0, a = i.length; t < a; t++) {
						let a = i[t];
						nt(n, r, e, a);
					}
					_e && Ne.render(e);
					for (let t = 0, n = i.length; t < n; t++) {
						let n = i[t];
						tt(b, e, n, n.viewport);
					}
				} else r.length > 0 && nt(n, r, e, t), _e && Ne.render(e), tt(b, e, t);
			}
			N !== null && M === 0 && (H.updateMultisampleRenderTarget(N), H.updateRenderTargetMipmap(N)), r && w.end(T), e.isScene === !0 && e.onAfterRender(T, e, t), Re.resetDefaultState(), P = -1, F = null, C.pop(), C.length > 0 ? (x = C[C.length - 1], H.setTextureUnits(x.state.textureUnits), de === !0 && je.setGlobalState(T.clippingPlanes, x.state.camera)) : x = null, S.pop(), b = S.length > 0 ? S[S.length - 1] : null, D !== null && D.renderEnd();
		};
		function et(e, t, n, r) {
			if (e.visible === !1) return;
			if (e.layers.test(t.layers)) {
				if (e.isGroup) n = e.renderOrder;
				else if (e.isLOD) e.autoUpdate === !0 && e.update(t);
				else if (e.isLightProbeGrid) x.pushLightProbeGrid(e);
				else if (e.isLight) x.pushLight(e), e.castShadow && x.pushShadow(e);
				else if (e.isSprite) {
					if (!e.frustumCulled || e.intersectsFrustum(ue)) {
						r && he.setFromMatrixPosition(e.matrixWorld).applyMatrix4(pe);
						let i = Ee.update(e), a = e.material;
						a.visible && b.push(e, i, a, n, he.z, null, t);
					}
				} else if ((e.isMesh || e.isLine || e.isPoints) && (!e.frustumCulled || e.intersectsFrustum(ue))) {
					let i = Ee.update(e), a = e.material;
					if (r && (e.boundingSphere === void 0 ? (i.boundingSphere === null && i.computeBoundingSphere(), he.copy(i.boundingSphere.center)) : (e.boundingSphere === null && e.computeBoundingSphere(), he.copy(e.boundingSphere.center)), he.applyMatrix4(e.matrixWorld).applyMatrix4(pe)), Array.isArray(a)) {
						let r = i.groups;
						for (let o = 0, s = r.length; o < s; o++) {
							let s = r[o], c = a[s.materialIndex];
							c && c.visible && b.push(e, i, c, n, he.z, s, t);
						}
					} else a.visible && b.push(e, i, a, n, he.z, null, t);
				}
			}
			let i = e.children;
			for (let e = 0, a = i.length; e < a; e++) et(i[e], t, n, r);
		}
		function tt(e, t, n, r) {
			let { opaque: i, transmissive: a, transparent: o } = e;
			x.setupLightsView(n), de === !0 && je.setGlobalState(T.clippingPlanes, n), r && B.viewport(I.copy(r)), i.length > 0 && rt(i, t, n), a.length > 0 && rt(a, t, n), o.length > 0 && rt(o, t, n), B.buffers.depth.setTest(!0), B.buffers.depth.setMask(!0), B.buffers.color.setMask(!0), B.setPolygonOffset(!1);
		}
		function nt(e, t, n, r) {
			if ((n.isScene === !0 ? n.overrideMaterial : null) !== null) return;
			if (x.state.transmissionRenderTarget[r.id] === void 0) {
				let e = be.has("EXT_color_buffer_half_float") || be.has("EXT_color_buffer_float");
				x.state.transmissionRenderTarget[r.id] = new ju(1, 1, {
					generateMipmaps: !0,
					type: e ? mc : sc,
					minFilter: oc,
					samples: Math.max(4, xe.samples),
					stencilBuffer: i,
					resolveDepthBuffer: !1,
					resolveStencilBuffer: !1,
					storeMultisampledDepthBuffer: !1,
					storeMultisampledStencilBuffer: !1,
					colorSpace: Y.workingColorSpace
				});
			}
			let a = x.state.transmissionRenderTarget[r.id], o = r.viewport || I;
			a.setSize(o.z * T.transmissionResolutionScale, o.w * T.transmissionResolutionScale);
			let s = T.getRenderTarget(), c = T.getActiveCubeFace(), l = T.getActiveMipmapLevel();
			T.setRenderTarget(a), T.getClearColor(ne), re = T.getClearAlpha(), re < 1 && T.setClearColor(16777215, .5), T.clear(), _e && Ne.render(n);
			let u = T.toneMapping;
			T.toneMapping = 0;
			let d = r.viewport;
			if (r.viewport !== void 0 && (r.viewport = void 0), x.setupLightsView(r), de === !0 && je.setGlobalState(T.clippingPlanes, r), rt(e, n, r), H.updateMultisampleRenderTarget(a), H.updateRenderTargetMipmap(a), be.has("WEBGL_multisampled_render_to_texture") === !1) {
				let e = !1;
				for (let i = 0, a = t.length; i < a; i++) {
					let { object: a, geometry: o, material: s, group: c } = t[i];
					if (s.side === 2 && a.layers.test(r.layers)) {
						let t = s.side;
						s.side = 1, s.needsUpdate = !0, it(a, n, r, o, s, c), s.side = t, s.needsUpdate = !0, e = !0;
					}
				}
				e === !0 && (H.updateMultisampleRenderTarget(a), H.updateRenderTargetMipmap(a));
			}
			T.setRenderTarget(s, c, l), T.setClearColor(ne, re), d !== void 0 && (r.viewport = d), T.toneMapping = u;
		}
		function rt(e, t, n) {
			let r = t.isScene === !0 ? t.overrideMaterial : null;
			for (let i = 0, a = e.length; i < a; i++) {
				let a = e[i], { object: o, geometry: s, group: c } = a, l = a.material;
				l.allowOverride === !0 && r !== null && (l = r), o.layers.test(n.layers) && it(o, t, n, s, l, c);
			}
		}
		function it(e, t, n, r, i, a) {
			D !== null && i.isNodeMaterial && D.setObject(e, i), e.onBeforeRender(T, t, n, r, i, a), e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse, e.matrixWorld), e.normalMatrix.getNormalMatrix(e.modelViewMatrix), i.onBeforeRender(T, t, n, r, e, a), i.transparent === !0 && i.side === 2 && i.forceSinglePass === !1 ? (i.side = 1, i.needsUpdate = !0, T.renderBufferDirect(n, t, r, i, e, a), i.side = 0, i.needsUpdate = !0, T.renderBufferDirect(n, t, r, i, e, a), i.side = 2) : T.renderBufferDirect(n, t, r, i, e, a), e.onAfterRender(T, t, n, r, i, a);
		}
		function at(e, t, n) {
			t.isScene !== !0 && (t = ge);
			let r = V.get(e), i = x.state.lights, a = x.state.shadowsArray, o = i.state.version, s = De.getParameters(e, i.state, a, t, n, x.state.lightProbeGridArray), c = De.getProgramCacheKey(s), l = r.programs;
			r.environment = e.isMeshStandardMaterial || e.isMeshLambertMaterial || e.isMeshPhongMaterial ? t.environment : null, r.fog = t.fog;
			let u = e.isMeshStandardMaterial || e.isMeshLambertMaterial && !e.envMap || e.isMeshPhongMaterial && !e.envMap;
			r.envMap = Ce.get(e.envMap || r.environment, u), r.envMapRotation = r.environment !== null && e.envMap === null ? t.environmentRotation : e.envMapRotation, l === void 0 && (e.addEventListener("dispose", Ge), l = /* @__PURE__ */ new Map(), r.programs = l);
			let d = l.get(c);
			if (d !== void 0) {
				if (r.currentProgram === d && r.lightsStateVersion === o) return st(e, s), d;
			} else s.uniforms = De.getUniforms(e), D !== null && e.isNodeMaterial && D.build(e, n, s), e.onBeforeCompile(s, T), d = De.acquireProgram(s, c), l.set(c, d), r.uniforms = s.uniforms;
			let f = r.uniforms;
			return (!e.isShaderMaterial && !e.isRawShaderMaterial || e.clipping === !0) && (f.clippingPlanes = je.uniform), st(e, s), r.needsLights = dt(e), r.lightsStateVersion = o, r.needsLights && (f.ambientLightColor.value = i.state.ambient, f.lightProbe.value = i.state.probe, f.sunLights.value = i.state.sun, f.sunLightShadows.value = i.state.sunShadow, f.directionalLights.value = i.state.directional, f.directionalLightShadows.value = i.state.directionalShadow, f.spotLights.value = i.state.spot, f.spotLightShadows.value = i.state.spotShadow, f.rectAreaLights.value = i.state.rectArea, f.ltc_1.value = i.state.rectAreaLTC1, f.ltc_2.value = i.state.rectAreaLTC2, f.pointLights.value = i.state.point, f.pointLightShadows.value = i.state.pointShadow, f.hemisphereLights.value = i.state.hemi, f.sunShadowMatrix.value = i.state.sunShadowMatrix, f.sunShadowCascade.value = i.state.sunShadowCascade, f.directionalShadowMatrix.value = i.state.directionalShadowMatrix, f.spotLightMatrix.value = i.state.spotLightMatrix, f.spotLightMap.value = i.state.spotLightMap, f.pointShadowMatrix.value = i.state.pointShadowMatrix), r.lightProbeGrid = x.state.lightProbeGridArray.length > 0, r.currentProgram = d, r.uniformsList = null, d;
		}
		function ot(e) {
			if (e.uniformsList === null) {
				let t = e.currentProgram.getUniforms();
				e.uniformsList = xg.seqWithValue(t.seq, e.uniforms);
			}
			return e.uniformsList;
		}
		function st(e, t) {
			let n = V.get(e);
			n.outputColorSpace = t.outputColorSpace, n.batching = t.batching, n.batchingColor = t.batchingColor, n.instancing = t.instancing, n.instancingColor = t.instancingColor, n.instancingMorph = t.instancingMorph, n.skinning = t.skinning, n.morphTargets = t.morphTargets, n.morphNormals = t.morphNormals, n.morphColors = t.morphColors, n.morphTargetsCount = t.morphTargetsCount, n.numClippingPlanes = t.numClippingPlanes, n.numIntersection = t.numClipIntersection, n.vertexAlphas = t.vertexAlphas, n.vertexTangents = t.vertexTangents, n.toneMapping = t.toneMapping;
		}
		function ct(e, t) {
			if (e.length === 0) return null;
			if (e.length === 1) return e[0].texture === null ? null : e[0];
			y.setFromMatrixPosition(t.matrixWorld);
			for (let t = 0, n = e.length; t < n; t++) {
				let n = e[t];
				if (n.texture !== null && n.boundingBox.containsPoint(y)) return n;
			}
			return null;
		}
		function lt(e, t, n, r, i) {
			t.isScene !== !0 && (t = ge), H.resetTextureUnits();
			let a = t.fog, o = r.isMeshStandardMaterial || r.isMeshLambertMaterial || r.isMeshPhongMaterial ? t.environment : null, s = N === null ? T.outputColorSpace : N.isXRRenderTarget === !0 ? N.texture.colorSpace : Y.workingColorSpace, c = r.isMeshStandardMaterial || r.isMeshLambertMaterial && !r.envMap || r.isMeshPhongMaterial && !r.envMap, l = Ce.get(r.envMap || o, c), u = r.vertexColors === !0 && !!n.attributes.color && n.attributes.color.itemSize === 4, d = !!n.attributes.tangent && (!!r.normalMap || r.anisotropy > 0), f = !!n.morphAttributes.position, p = !!n.morphAttributes.normal, m = !!n.morphAttributes.color, h = 0;
			r.toneMapped && (N === null || N.isXRRenderTarget === !0) && (h = T.toneMapping);
			let g = n.morphAttributes.position || n.morphAttributes.normal || n.morphAttributes.color, _ = g === void 0 ? 0 : g.length, v = V.get(r), y = x.state.lights;
			if (de === !0 && (fe === !0 || e !== F)) {
				let t = e === F && r.id === P;
				je.setState(r, e, t);
			}
			let b = !1;
			r.version === v.__version ? v.needsLights && v.lightsStateVersion !== y.state.version ? b = !0 : v.outputColorSpace === s ? i.isBatchedMesh && v.batching === !1 || !i.isBatchedMesh && v.batching === !0 || i.isBatchedMesh && v.batchingColor === !0 && i._colorsTexture === null || i.isBatchedMesh && v.batchingColor === !1 && i._colorsTexture !== null || i.isInstancedMesh && v.instancing === !1 || !i.isInstancedMesh && v.instancing === !0 || i.isSkinnedMesh && v.skinning === !1 || !i.isSkinnedMesh && v.skinning === !0 || i.isInstancedMesh && v.instancingColor === !0 && i.instanceColor === null || i.isInstancedMesh && v.instancingColor === !1 && i.instanceColor !== null || i.isInstancedMesh && v.instancingMorph === !0 && i.morphTexture === null || i.isInstancedMesh && v.instancingMorph === !1 && i.morphTexture !== null ? b = !0 : v.envMap === l ? r.fog === !0 && v.fog !== a || v.numClippingPlanes !== void 0 && (v.numClippingPlanes !== je.numPlanes || v.numIntersection !== je.numIntersection) ? b = !0 : v.vertexAlphas === u && v.vertexTangents === d && v.morphTargets === f && v.morphNormals === p && v.morphColors === m && v.toneMapping === h && v.morphTargetsCount === _ ? !!v.lightProbeGrid != x.state.lightProbeGridArray.length > 0 && (b = !0) : b = !0 : b = !0 : b = !0 : (b = !0, v.__version = r.version);
			let S = v.currentProgram;
			b === !0 && (S = at(r, t, i), D && r.isNodeMaterial && D.onUpdateProgram(r, S, v));
			let C = !1, w = !1, E = !1, O = S.getUniforms(), k = v.uniforms;
			if (B.useProgram(S.program) && (C = !0, w = !0, E = !0), r.id !== P && (P = r.id, w = !0), v.needsLights) {
				let e = ct(x.state.lightProbeGridArray, i);
				v.lightProbeGrid !== e && (v.lightProbeGrid = e, w = !0);
			}
			if (C || F !== e) {
				B.buffers.depth.getReversed() && e.reversedDepth !== !0 && (e._reversedDepth = !0, e.updateProjectionMatrix()), O.setValue(z, "projectionMatrix", e.projectionMatrix), O.setValue(z, "viewMatrix", e.matrixWorldInverse);
				let t = O.map.cameraPosition;
				t !== void 0 && t.setValue(z, me.setFromMatrixPosition(e.matrixWorld)), xe.logarithmicDepthBuffer && O.setValue(z, "logDepthBufFC", 2 / (Math.log(e.far + 1) / Math.LN2)), (r.isMeshPhongMaterial || r.isMeshToonMaterial || r.isMeshLambertMaterial || r.isMeshBasicMaterial || r.isMeshStandardMaterial || r.isShaderMaterial) && O.setValue(z, "isOrthographic", e.isOrthographicCamera === !0), F !== e && (F = e, w = !0, E = !0);
			}
			if (v.needsLights && (y.state.sunShadowMap.length > 0 && O.setValue(z, "sunShadowMap", y.state.sunShadowMap, H), y.state.directionalShadowMap.length > 0 && O.setValue(z, "directionalShadowMap", y.state.directionalShadowMap, H), y.state.spotShadowMap.length > 0 && O.setValue(z, "spotShadowMap", y.state.spotShadowMap, H), y.state.pointShadowMap.length > 0 && O.setValue(z, "pointShadowMap", y.state.pointShadowMap, H)), i.isSkinnedMesh) {
				O.setOptional(z, i, "bindMatrix"), O.setOptional(z, i, "bindMatrixInverse");
				let e = i.skeleton;
				e && (e.boneTexture === null && e.computeBoneTexture(), O.setValue(z, "boneTexture", e.boneTexture, H));
			}
			i.isBatchedMesh && (O.setOptional(z, i, "batchingTexture"), O.setValue(z, "batchingTexture", i._matricesTexture, H), O.setOptional(z, i, "batchingIdTexture"), O.setValue(z, "batchingIdTexture", i._indirectTexture, H), O.setOptional(z, i, "batchingColorTexture"), i._colorsTexture !== null && O.setValue(z, "batchingColorTexture", i._colorsTexture, H));
			let A = n.morphAttributes;
			if ((A.position !== void 0 || A.normal !== void 0 || A.color !== void 0) && Pe.update(i, n, S), (w || v.receiveShadow !== i.receiveShadow) && (v.receiveShadow = i.receiveShadow, O.setValue(z, "receiveShadow", i.receiveShadow)), (r.isMeshStandardMaterial || r.isMeshLambertMaterial || r.isMeshPhongMaterial) && r.envMap === null && t.environment !== null && (k.envMapIntensity.value = t.environmentIntensity), k.dfgLUT !== void 0 && (k.dfgLUT.value = H_()), w) {
				if (O.setValue(z, "toneMappingExposure", T.toneMappingExposure), v.needsLights && ut(k, E), a && r.fog === !0 && Oe.refreshFogUniforms(k, a), Oe.refreshMaterialUniforms(k, r, R, ie, x.state.transmissionRenderTarget[e.id]), v.needsLights && v.lightProbeGrid) {
					let e = v.lightProbeGrid;
					k.probesSH.value = e.texture, k.probesMin.value.copy(e.boundingBox.min), k.probesMax.value.copy(e.boundingBox.max), k.probesResolution.value.copy(e.resolution);
				}
				xg.upload(z, ot(v), k, H);
			}
			if (r.isShaderMaterial && r.uniformsNeedUpdate === !0 && (xg.upload(z, ot(v), k, H), r.uniformsNeedUpdate = !1), r.isSpriteMaterial && O.setValue(z, "center", i.center), O.setValue(z, "modelViewMatrix", i.modelViewMatrix), O.setValue(z, "normalMatrix", i.normalMatrix), O.setValue(z, "modelMatrix", i.matrixWorld), r.uniformsGroups !== void 0) {
				let e = r.uniformsGroups;
				for (let t = 0, n = e.length; t < n; t++) {
					let n = e[t];
					ze.update(n, S), ze.bind(n, S);
				}
			}
			return S;
		}
		function ut(e, t) {
			e.ambientLightColor.needsUpdate = t, e.lightProbe.needsUpdate = t, e.sunLights.needsUpdate = t, e.sunLightShadows.needsUpdate = t, e.directionalLights.needsUpdate = t, e.directionalLightShadows.needsUpdate = t, e.pointLights.needsUpdate = t, e.pointLightShadows.needsUpdate = t, e.spotLights.needsUpdate = t, e.spotLightShadows.needsUpdate = t, e.rectAreaLights.needsUpdate = t, e.hemisphereLights.needsUpdate = t;
		}
		function dt(e) {
			return e.isMeshLambertMaterial || e.isMeshToonMaterial || e.isMeshPhongMaterial || e.isMeshStandardMaterial || e.isShadowMaterial || e.isShaderMaterial && e.lights === !0;
		}
		this.getActiveCubeFace = function() {
			return j;
		}, this.getActiveMipmapLevel = function() {
			return M;
		}, this.getRenderTarget = function() {
			return N;
		}, this.setRenderTargetTextures = function(e, t, n) {
			let r = V.get(e);
			r.__autoAllocateDepthBuffer = e.resolveDepthBuffer === !1, r.__autoAllocateDepthBuffer === !1 && (r.__useRenderToTexture = !1), V.get(e.texture).__webglTexture = t, V.get(e.depthTexture).__webglTexture = r.__autoAllocateDepthBuffer ? void 0 : n, r.__hasExternalTextures = !0;
		}, this.setRenderTargetFramebuffer = function(e, t) {
			let n = V.get(e);
			n.__webglFramebuffer = t, n.__useDefaultFramebuffer = t === void 0;
		}, this.setRenderTarget = function(e, t = 0, n = 0) {
			N = e, j = t, M = n;
			let r = null, i = !1, a = !1;
			if (e) {
				let o = V.get(e);
				if (o.__useDefaultFramebuffer !== void 0) {
					B.bindFramebuffer(z.FRAMEBUFFER, o.__webglFramebuffer), I.copy(e.viewport), ee.copy(e.scissor), te = e.scissorTest, B.viewport(I), B.scissor(ee), B.setScissorTest(te), P = -1;
					return;
				}
				if (o.__webglFramebuffer === void 0) H.setupRenderTarget(e);
				else if (o.__hasExternalTextures) H.rebindTextures(e, V.get(e.texture).__webglTexture, V.get(e.depthTexture).__webglTexture);
				else if (e.depthBuffer) {
					let t = e.depthTexture;
					if (o.__boundDepthTexture !== t) {
						if (t !== null && V.has(t) && (e.width !== t.image.width || e.height !== t.image.height)) throw Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");
						H.setupDepthRenderbuffer(e);
					}
				}
				let s = e.texture;
				(s.isData3DTexture || s.isDataArrayTexture || s.isCompressedArrayTexture) && (a = !0);
				let c = V.get(e).__webglFramebuffer;
				e.isWebGLCubeRenderTarget ? (r = Array.isArray(c[t]) ? c[t][n] : c[t], i = !0) : r = e.samples > 0 && H.useMultisampledRTT(e) === !1 ? V.get(e).__webglMultisampledFramebuffer : Array.isArray(c) ? c[n] : c, I.copy(e.viewport), ee.copy(e.scissor), te = e.scissorTest;
			} else I.copy(se).multiplyScalar(R).floor(), ee.copy(ce).multiplyScalar(R).floor(), te = le;
			if (n !== 0 && (r = O), B.bindFramebuffer(z.FRAMEBUFFER, r) && B.drawBuffers(e, r), B.viewport(I), B.scissor(ee), B.setScissorTest(te), i) {
				let r = V.get(e.texture);
				z.framebufferTexture2D(z.FRAMEBUFFER, z.COLOR_ATTACHMENT0, z.TEXTURE_CUBE_MAP_POSITIVE_X + t, r.__webglTexture, n);
			} else if (a) {
				let r = t;
				for (let t = 0; t < e.textures.length; t++) {
					let i = V.get(e.textures[t]);
					z.framebufferTextureLayer(z.FRAMEBUFFER, z.COLOR_ATTACHMENT0 + t, i.__webglTexture, n, r);
				}
			} else if (e !== null && n !== 0) {
				let t = V.get(e.texture);
				z.framebufferTexture2D(z.FRAMEBUFFER, z.COLOR_ATTACHMENT0, z.TEXTURE_2D, t.__webglTexture, n);
			}
			P = -1;
		};
		function ft(e) {
			let t = V.get(e);
			return (t.__readFormat !== e.format || t.__readType !== e.type) && (t.__readFormat = e.format, t.__readType = e.type, t.__formatReadable = xe.textureFormatReadable(e.format), t.__typeReadable = xe.textureTypeReadable(e.type)), t;
		}
		this.readRenderTargetPixels = function(e, t, n, r, i, a, o, s = 0) {
			if (!(e && e.isWebGLRenderTarget)) {
				W("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");
				return;
			}
			let c = V.get(e).__webglFramebuffer;
			if (e.isWebGLCubeRenderTarget && o !== void 0 && (c = c[o]), c) {
				B.bindFramebuffer(z.FRAMEBUFFER, c);
				try {
					let o = e.textures[s], c = o.format, l = o.type;
					e.textures.length > 1 && z.readBuffer(z.COLOR_ATTACHMENT0 + s);
					let u = ft(o);
					if (u.__formatReadable === !1) {
						W("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");
						return;
					}
					if (u.__typeReadable === !1) {
						W("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");
						return;
					}
					t >= 0 && t <= e.width - r && n >= 0 && n <= e.height - i && z.readPixels(t, n, r, i, Le.convert(c), Le.convert(l), a);
				} finally {
					let e = N === null ? null : V.get(N).__webglFramebuffer;
					B.bindFramebuffer(z.FRAMEBUFFER, e);
				}
			}
		}, this.readRenderTargetPixelsAsync = async function(e, t, n, r, i, a, o, s = 0) {
			if (!(e && e.isWebGLRenderTarget)) throw Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");
			let c = V.get(e).__webglFramebuffer;
			if (e.isWebGLCubeRenderTarget && o !== void 0 && (c = c[o]), c) {
				if (t >= 0 && t <= e.width - r && n >= 0 && n <= e.height - i) {
					B.bindFramebuffer(z.FRAMEBUFFER, c);
					let o = e.textures[s], l = o.format, u = o.type;
					e.textures.length > 1 && z.readBuffer(z.COLOR_ATTACHMENT0 + s);
					let d = ft(o);
					if (d.__formatReadable === !1) throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");
					if (d.__typeReadable === !1) throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");
					let f = z.createBuffer();
					z.bindBuffer(z.PIXEL_PACK_BUFFER, f), z.bufferData(z.PIXEL_PACK_BUFFER, a.byteLength, z.STREAM_READ), z.readPixels(t, n, r, i, Le.convert(l), Le.convert(u), 0), z.bindBuffer(z.PIXEL_PACK_BUFFER, null);
					let p = N === null ? null : V.get(N).__webglFramebuffer;
					B.bindFramebuffer(z.FRAMEBUFFER, p);
					let m = z.fenceSync(z.SYNC_GPU_COMMANDS_COMPLETE, 0);
					return z.flush(), await Ll(z, m, 4), z.bindBuffer(z.PIXEL_PACK_BUFFER, f), z.getBufferSubData(z.PIXEL_PACK_BUFFER, 0, a), z.bindBuffer(z.PIXEL_PACK_BUFFER, null), z.deleteBuffer(f), z.deleteSync(m), a;
				}
				throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.");
			}
		}, this.copyFramebufferToTexture = function(e, t = null, n = 0) {
			let r = 2 ** -n, i = Math.floor(e.image.width * r), a = Math.floor(e.image.height * r), o = t === null ? 0 : t.x, s = t === null ? 0 : t.y;
			H.setTexture2D(e, 0), z.copyTexSubImage2D(z.TEXTURE_2D, n, 0, 0, o, s, i, a), B.unbindTexture();
		}, this.copyTextureToTexture = function(e, t, n = null, r = null, i = 0, a = 0) {
			let o, s, c, l, u, d, f, p, m, h = e.isCompressedTexture ? e.mipmaps[a] : e.image;
			if (n !== null) o = n.max.x - n.min.x, s = n.max.y - n.min.y, c = n.isBox3 ? n.max.z - n.min.z : 1, l = n.min.x, u = n.min.y, d = n.isBox3 ? n.min.z : 0;
			else {
				let t = 2 ** -i;
				o = Math.floor(h.width * t), s = Math.floor(h.height * t), c = e.isDataArrayTexture ? h.depth : e.isData3DTexture ? Math.floor(h.depth * t) : 1, l = 0, u = 0, d = 0;
			}
			r === null ? (f = 0, p = 0, m = 0) : (f = r.x, p = r.y, m = r.z);
			let g = Le.convert(t.format), _ = Le.convert(t.type), v;
			t.isData3DTexture ? (H.setTexture3D(t, 0), v = z.TEXTURE_3D) : t.isDataArrayTexture || t.isCompressedArrayTexture ? (H.setTexture2DArray(t, 0), v = z.TEXTURE_2D_ARRAY) : (H.setTexture2D(t, 0), v = z.TEXTURE_2D), B.activeTexture(z.TEXTURE0), B.pixelStorei(z.UNPACK_FLIP_Y_WEBGL, t.flipY), B.pixelStorei(z.UNPACK_PREMULTIPLY_ALPHA_WEBGL, t.premultiplyAlpha), B.pixelStorei(z.UNPACK_ALIGNMENT, t.unpackAlignment);
			let y = B.getParameter(z.UNPACK_ROW_LENGTH), b = B.getParameter(z.UNPACK_IMAGE_HEIGHT), x = B.getParameter(z.UNPACK_SKIP_PIXELS), S = B.getParameter(z.UNPACK_SKIP_ROWS), C = B.getParameter(z.UNPACK_SKIP_IMAGES);
			B.pixelStorei(z.UNPACK_ROW_LENGTH, h.width), B.pixelStorei(z.UNPACK_IMAGE_HEIGHT, h.height), B.pixelStorei(z.UNPACK_SKIP_PIXELS, l), B.pixelStorei(z.UNPACK_SKIP_ROWS, u), B.pixelStorei(z.UNPACK_SKIP_IMAGES, d);
			let w = e.isDataArrayTexture || e.isData3DTexture, T = t.isDataArrayTexture || t.isData3DTexture;
			if (e.isDepthTexture) {
				let n = V.get(e), r = V.get(t), h = V.get(n.__renderTarget), g = V.get(r.__renderTarget);
				B.bindFramebuffer(z.READ_FRAMEBUFFER, h.__webglFramebuffer), B.bindFramebuffer(z.DRAW_FRAMEBUFFER, g.__webglFramebuffer);
				for (let n = 0; n < c; n++) w && (z.framebufferTextureLayer(z.READ_FRAMEBUFFER, z.COLOR_ATTACHMENT0, V.get(e).__webglTexture, i, d + n), z.framebufferTextureLayer(z.DRAW_FRAMEBUFFER, z.COLOR_ATTACHMENT0, V.get(t).__webglTexture, a, m + n)), z.blitFramebuffer(l, u, o, s, f, p, o, s, z.DEPTH_BUFFER_BIT, z.NEAREST);
				B.bindFramebuffer(z.READ_FRAMEBUFFER, null), B.bindFramebuffer(z.DRAW_FRAMEBUFFER, null);
			} else if (i !== 0 || e.isRenderTargetTexture || V.has(e)) {
				let n = V.get(e), r = V.get(t);
				B.bindFramebuffer(z.READ_FRAMEBUFFER, k), B.bindFramebuffer(z.DRAW_FRAMEBUFFER, A);
				for (let e = 0; e < c; e++) w ? z.framebufferTextureLayer(z.READ_FRAMEBUFFER, z.COLOR_ATTACHMENT0, n.__webglTexture, i, d + e) : z.framebufferTexture2D(z.READ_FRAMEBUFFER, z.COLOR_ATTACHMENT0, z.TEXTURE_2D, n.__webglTexture, i), T ? z.framebufferTextureLayer(z.DRAW_FRAMEBUFFER, z.COLOR_ATTACHMENT0, r.__webglTexture, a, m + e) : z.framebufferTexture2D(z.DRAW_FRAMEBUFFER, z.COLOR_ATTACHMENT0, z.TEXTURE_2D, r.__webglTexture, a), i === 0 ? T ? z.copyTexSubImage3D(v, a, f, p, m + e, l, u, o, s) : z.copyTexSubImage2D(v, a, f, p, l, u, o, s) : z.blitFramebuffer(l, u, o, s, f, p, o, s, z.COLOR_BUFFER_BIT, z.NEAREST);
				B.bindFramebuffer(z.READ_FRAMEBUFFER, null), B.bindFramebuffer(z.DRAW_FRAMEBUFFER, null);
			} else T ? e.isDataTexture || e.isData3DTexture ? z.texSubImage3D(v, a, f, p, m, o, s, c, g, _, h.data) : t.isCompressedArrayTexture ? z.compressedTexSubImage3D(v, a, f, p, m, o, s, c, g, h.data) : z.texSubImage3D(v, a, f, p, m, o, s, c, g, _, h) : e.isDataTexture ? z.texSubImage2D(z.TEXTURE_2D, a, f, p, o, s, g, _, h.data) : e.isCompressedTexture ? z.compressedTexSubImage2D(z.TEXTURE_2D, a, f, p, h.width, h.height, g, h.data) : z.texSubImage2D(z.TEXTURE_2D, a, f, p, o, s, g, _, h);
			B.pixelStorei(z.UNPACK_ROW_LENGTH, y), B.pixelStorei(z.UNPACK_IMAGE_HEIGHT, b), B.pixelStorei(z.UNPACK_SKIP_PIXELS, x), B.pixelStorei(z.UNPACK_SKIP_ROWS, S), B.pixelStorei(z.UNPACK_SKIP_IMAGES, C), a === 0 && t.generateMipmaps && z.generateMipmap(v), B.unbindTexture();
		}, this.initRenderTarget = function(e) {
			V.get(e).__webglFramebuffer === void 0 && H.setupRenderTarget(e);
		}, this.initTexture = function(e) {
			e.isCubeTexture ? H.setTextureCube(e, 0) : e.isData3DTexture ? H.setTexture3D(e, 0) : e.isDataArrayTexture || e.isCompressedArrayTexture ? H.setTexture2DArray(e, 0) : H.setTexture2D(e, 0), B.unbindTexture();
		}, this.resetState = function() {
			j = 0, M = 0, N = null, B.reset(), Re.reset();
		}, typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
	}
	get coordinateSystem() {
		return Ol;
	}
	get outputColorSpace() {
		return this._outputColorSpace;
	}
	set outputColorSpace(e) {
		this._outputColorSpace = e;
		let t = this.getContext();
		t.drawingBufferColorSpace = Y._getDrawingBufferColorSpace(e), t.unpackColorSpace = Y._getUnpackColorSpace();
	}
}, W_ = { type: "change" }, G_ = { type: "start" }, K_ = { type: "end" }, q_ = new Sf(), J_ = new hf(), Y_ = Math.cos(70 * du.DEG2RAD), X_ = new q(), Z_ = 2 * Math.PI, $ = {
	NONE: -1,
	ROTATE: 0,
	DOLLY: 1,
	PAN: 2,
	TOUCH_ROTATE: 3,
	TOUCH_PAN: 4,
	TOUCH_DOLLY_PAN: 5,
	TOUCH_DOLLY_ROTATE: 6
}, Q_ = 1e-6, $_ = class extends wm {
	constructor(e, t = null) {
		super(e, t), this.state = $.NONE, this.target = new q(), this.cursor = new q(), this.minDistance = 0, this.maxDistance = Infinity, this.minZoom = 0, this.maxZoom = Infinity, this.minTargetRadius = 0, this.maxTargetRadius = Infinity, this.minPolarAngle = 0, this.maxPolarAngle = Math.PI, this.minAzimuthAngle = -Infinity, this.maxAzimuthAngle = Infinity, this.enableDamping = !1, this.dampingFactor = .05, this.enableZoom = !0, this.zoomSpeed = 1, this.enableRotate = !0, this.rotateSpeed = 1, this.keyRotateSpeed = 1, this.enablePan = !0, this.panSpeed = 1, this.screenSpacePanning = !0, this.keyPanSpeed = 7, this.zoomToCursor = !1, this.autoRotate = !1, this.autoRotateSpeed = 2, this.keys = {
			LEFT: "ArrowLeft",
			UP: "ArrowUp",
			RIGHT: "ArrowRight",
			BOTTOM: "ArrowDown"
		}, this.mouseButtons = {
			LEFT: Xs.ROTATE,
			MIDDLE: Xs.DOLLY,
			RIGHT: Xs.PAN
		}, this.touches = {
			ONE: Zs.ROTATE,
			TWO: Zs.DOLLY_PAN
		}, this.target0 = this.target.clone(), this.position0 = this.object.position.clone(), this.zoom0 = this.object.zoom, this._cursorStyle = "auto", this._domElementKeyEvents = null, this._lastPosition = new q(), this._lastQuaternion = new fu(), this._lastTargetPosition = new q(), this._quat = new fu().setFromUnitVectors(e.up, new q(0, 1, 0)), this._quatInverse = this._quat.clone().invert(), this._spherical = new Sm(), this._sphericalDelta = new Sm(), this._scale = 1, this._panOffset = new q(), this._rotateStart = new K(), this._rotateEnd = new K(), this._rotateDelta = new K(), this._panStart = new K(), this._panEnd = new K(), this._panDelta = new K(), this._dollyStart = new K(), this._dollyEnd = new K(), this._dollyDelta = new K(), this._dollyDirection = new q(), this._mouse = new K(), this._performCursorZoom = !1, this._pointers = [], this._pointerPositions = {}, this._controlActive = !1, this._onPointerMove = tv.bind(this), this._onPointerDown = ev.bind(this), this._onPointerUp = nv.bind(this), this._onContextMenu = lv.bind(this), this._onMouseWheel = av.bind(this), this._onKeyDown = ov.bind(this), this._onTouchStart = sv.bind(this), this._onTouchMove = cv.bind(this), this._onMouseDown = rv.bind(this), this._onMouseMove = iv.bind(this), this._interceptControlDown = uv.bind(this), this._interceptControlUp = dv.bind(this), this.domElement !== null && this.connect(this.domElement), this.update();
	}
	set cursorStyle(e) {
		this._cursorStyle = e, e === "grab" ? this.domElement.style.cursor = "grab" : this.domElement.style.cursor = "auto";
	}
	get cursorStyle() {
		return this._cursorStyle;
	}
	connect(e) {
		super.connect(e), this.domElement.addEventListener("pointerdown", this._onPointerDown), this.domElement.addEventListener("pointercancel", this._onPointerUp), this.domElement.addEventListener("contextmenu", this._onContextMenu), this.domElement.addEventListener("wheel", this._onMouseWheel, { passive: !1 }), this.domElement.getRootNode().addEventListener("keydown", this._interceptControlDown, {
			passive: !0,
			capture: !0
		}), this.domElement.style.touchAction = "none";
	}
	disconnect() {
		this.state = $.NONE, this.domElement.removeEventListener("pointerdown", this._onPointerDown), this.domElement.ownerDocument.removeEventListener("pointermove", this._onPointerMove), this.domElement.ownerDocument.removeEventListener("pointerup", this._onPointerUp), this.domElement.removeEventListener("pointercancel", this._onPointerUp), this.domElement.removeEventListener("wheel", this._onMouseWheel), this.domElement.removeEventListener("contextmenu", this._onContextMenu), this.stopListenToKeyEvents();
		let e = this.domElement.getRootNode();
		e.removeEventListener("keydown", this._interceptControlDown, { capture: !0 }), e.removeEventListener("keyup", this._interceptControlUp, { capture: !0 }), this._controlActive = !1, this._pointers.length = 0, this._pointerPositions = {}, this.domElement.style.touchAction = "", this.domElement.style.cursor = "auto";
	}
	dispose() {
		this.disconnect();
	}
	getPolarAngle() {
		return this._spherical.phi;
	}
	getAzimuthalAngle() {
		return this._spherical.theta;
	}
	getDistance() {
		return this.object.position.distanceTo(this.target);
	}
	listenToKeyEvents(e) {
		e.addEventListener("keydown", this._onKeyDown), this._domElementKeyEvents = e;
	}
	stopListenToKeyEvents() {
		this._domElementKeyEvents !== null && (this._domElementKeyEvents.removeEventListener("keydown", this._onKeyDown), this._domElementKeyEvents = null);
	}
	saveState() {
		this.target0.copy(this.target), this.position0.copy(this.object.position), this.zoom0 = this.object.zoom;
	}
	reset() {
		this.target.copy(this.target0), this.object.position.copy(this.position0), this.object.zoom = this.zoom0, this.object.updateProjectionMatrix(), this.dispatchEvent(W_), this.update(), this.state = $.NONE;
	}
	pan(e, t) {
		this._pan(e, t), this.update();
	}
	dollyIn(e) {
		this._dollyIn(e), this.update();
	}
	dollyOut(e) {
		this._dollyOut(e), this.update();
	}
	rotateLeft(e) {
		this._rotateLeft(e), this.update();
	}
	rotateUp(e) {
		this._rotateUp(e), this.update();
	}
	update(e = null) {
		let t = this.object.position;
		X_.copy(t).sub(this.target), X_.applyQuaternion(this._quat), this._spherical.setFromVector3(X_), this.autoRotate && this.state === $.NONE && this._rotateLeft(this._getAutoRotationAngle(e)), this.enableDamping ? (this._spherical.theta += this._sphericalDelta.theta * this.dampingFactor, this._spherical.phi += this._sphericalDelta.phi * this.dampingFactor) : (this._spherical.theta += this._sphericalDelta.theta, this._spherical.phi += this._sphericalDelta.phi);
		let n = this.minAzimuthAngle, r = this.maxAzimuthAngle;
		isFinite(n) && isFinite(r) && (n < -Math.PI ? n += Z_ : n > Math.PI && (n -= Z_), r < -Math.PI ? r += Z_ : r > Math.PI && (r -= Z_), n <= r ? this._spherical.theta = Math.max(n, Math.min(r, this._spherical.theta)) : this._spherical.theta = this._spherical.theta > (n + r) / 2 ? Math.max(n, this._spherical.theta) : Math.min(r, this._spherical.theta)), this._spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this._spherical.phi)), this._spherical.makeSafe(), this.enableDamping === !0 ? this.target.addScaledVector(this._panOffset, this.dampingFactor) : this.target.add(this._panOffset), this.target.sub(this.cursor), this.target.clampLength(this.minTargetRadius, this.maxTargetRadius), this.target.add(this.cursor);
		let i = !1;
		if (this.zoomToCursor && this._performCursorZoom || this.object.isOrthographicCamera) this._spherical.radius = this._clampDistance(this._spherical.radius);
		else {
			let e = this._spherical.radius;
			this._spherical.radius = this._clampDistance(this._spherical.radius * this._scale), i = e != this._spherical.radius;
		}
		if (X_.setFromSpherical(this._spherical), X_.applyQuaternion(this._quatInverse), t.copy(this.target).add(X_), this.object.lookAt(this.target), this.enableDamping === !0 ? (this._sphericalDelta.theta *= 1 - this.dampingFactor, this._sphericalDelta.phi *= 1 - this.dampingFactor, this._panOffset.multiplyScalar(1 - this.dampingFactor)) : (this._sphericalDelta.set(0, 0, 0), this._panOffset.set(0, 0, 0)), this.zoomToCursor && this._performCursorZoom) {
			let e = null;
			if (this.object.isPerspectiveCamera) {
				let t = X_.length();
				e = this._clampDistance(t * this._scale);
				let n = t - e;
				this.object.position.addScaledVector(this._dollyDirection, n), this.object.updateMatrixWorld(), i = !!n;
			} else if (this.object.isOrthographicCamera) {
				let t = new q(this._mouse.x, this._mouse.y, 0);
				t.unproject(this.object);
				let n = this.object.zoom;
				this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / this._scale)), this.object.updateProjectionMatrix(), i = n !== this.object.zoom;
				let r = new q(this._mouse.x, this._mouse.y, 0);
				r.unproject(this.object), this.object.position.sub(r).add(t), this.object.updateMatrixWorld(), e = X_.length();
			} else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."), this.zoomToCursor = !1;
			e !== null && (this.screenSpacePanning ? this.target.set(0, 0, -1).transformDirection(this.object.matrix).multiplyScalar(e).add(this.object.position) : (q_.origin.copy(this.object.position), q_.direction.set(0, 0, -1).transformDirection(this.object.matrix), Math.abs(this.object.up.dot(q_.direction)) < Y_ ? this.object.lookAt(this.target) : (J_.setFromNormalAndCoplanarPoint(this.object.up, this.target), q_.intersectPlane(J_, this.target))));
		} else if (this.object.isOrthographicCamera) {
			let e = this.object.zoom;
			this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / this._scale)), e !== this.object.zoom && (this.object.updateProjectionMatrix(), i = !0);
		}
		return this._scale = 1, this._performCursorZoom = !1, i || this._lastPosition.distanceToSquared(this.object.position) > Q_ || 8 * (1 - this._lastQuaternion.dot(this.object.quaternion)) > Q_ || this._lastTargetPosition.distanceToSquared(this.target) > Q_ ? (this.dispatchEvent(W_), this._lastPosition.copy(this.object.position), this._lastQuaternion.copy(this.object.quaternion), this._lastTargetPosition.copy(this.target), !0) : !1;
	}
	_getAutoRotationAngle(e) {
		return e === null ? Z_ / 60 / 60 * this.autoRotateSpeed : Z_ / 60 * this.autoRotateSpeed * e;
	}
	_getZoomScale(e) {
		let t = Math.abs(e * .01);
		return .95 ** (this.zoomSpeed * t);
	}
	_rotateLeft(e) {
		this._sphericalDelta.theta -= e;
	}
	_rotateUp(e) {
		this._sphericalDelta.phi -= e;
	}
	_panLeft(e, t) {
		X_.setFromMatrixColumn(t, 0), X_.multiplyScalar(-e), this._panOffset.add(X_);
	}
	_panUp(e, t) {
		this.screenSpacePanning === !0 ? X_.setFromMatrixColumn(t, 1) : (X_.setFromMatrixColumn(t, 0), X_.crossVectors(this.object.up, X_)), X_.multiplyScalar(e), this._panOffset.add(X_);
	}
	_pan(e, t) {
		let n = this.domElement;
		if (this.object.isPerspectiveCamera) {
			let r = this.object.position;
			X_.copy(r).sub(this.target);
			let i = X_.length();
			i *= Math.tan(this.object.fov / 2 * Math.PI / 180), this._panLeft(2 * e * i / n.clientHeight, this.object.matrix), this._panUp(2 * t * i / n.clientHeight, this.object.matrix);
		} else this.object.isOrthographicCamera ? (this._panLeft(e * (this.object.right - this.object.left) / this.object.zoom / n.clientWidth, this.object.matrix), this._panUp(t * (this.object.top - this.object.bottom) / this.object.zoom / n.clientHeight, this.object.matrix)) : (console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."), this.enablePan = !1);
	}
	_dollyOut(e) {
		this.object.isPerspectiveCamera || this.object.isOrthographicCamera ? this._scale /= e : (console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."), this.enableZoom = !1);
	}
	_dollyIn(e) {
		this.object.isPerspectiveCamera || this.object.isOrthographicCamera ? this._scale *= e : (console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."), this.enableZoom = !1);
	}
	_updateZoomParameters(e, t) {
		if (!this.zoomToCursor) return;
		this._performCursorZoom = !0;
		let n = this.domElement.getBoundingClientRect(), r = e - n.left, i = t - n.top, a = n.width, o = n.height;
		this._mouse.x = r / a * 2 - 1, this._mouse.y = -(i / o) * 2 + 1, this._dollyDirection.set(this._mouse.x, this._mouse.y, 1).unproject(this.object).sub(this.object.position).normalize();
	}
	_clampDistance(e) {
		return Math.max(this.minDistance, Math.min(this.maxDistance, e));
	}
	_handleMouseDownRotate(e) {
		this._rotateStart.set(e.clientX, e.clientY);
	}
	_handleMouseDownDolly(e) {
		this._updateZoomParameters(e.clientX, e.clientX), this._dollyStart.set(e.clientX, e.clientY);
	}
	_handleMouseDownPan(e) {
		this._panStart.set(e.clientX, e.clientY);
	}
	_handleMouseMoveRotate(e) {
		this._rotateEnd.set(e.clientX, e.clientY), this._rotateDelta.subVectors(this._rotateEnd, this._rotateStart).multiplyScalar(this.rotateSpeed);
		let t = this.domElement;
		this._rotateLeft(Z_ * this._rotateDelta.x / t.clientHeight), this._rotateUp(Z_ * this._rotateDelta.y / t.clientHeight), this._rotateStart.copy(this._rotateEnd), this.update();
	}
	_handleMouseMoveDolly(e) {
		this._dollyEnd.set(e.clientX, e.clientY), this._dollyDelta.subVectors(this._dollyEnd, this._dollyStart), this._dollyDelta.y > 0 ? this._dollyOut(this._getZoomScale(this._dollyDelta.y)) : this._dollyDelta.y < 0 && this._dollyIn(this._getZoomScale(this._dollyDelta.y)), this._dollyStart.copy(this._dollyEnd), this.update();
	}
	_handleMouseMovePan(e) {
		this._panEnd.set(e.clientX, e.clientY), this._panDelta.subVectors(this._panEnd, this._panStart).multiplyScalar(this.panSpeed), this._pan(this._panDelta.x, this._panDelta.y), this._panStart.copy(this._panEnd), this.update();
	}
	_handleMouseWheel(e) {
		this._updateZoomParameters(e.clientX, e.clientY), e.deltaY < 0 ? this._dollyIn(this._getZoomScale(e.deltaY)) : e.deltaY > 0 && this._dollyOut(this._getZoomScale(e.deltaY)), this.update();
	}
	_handleKeyDown(e) {
		let t = !1;
		switch (e.code) {
			case this.keys.UP:
				e.ctrlKey || e.metaKey || e.shiftKey ? this.enableRotate && this._rotateUp(Z_ * this.keyRotateSpeed / this.domElement.clientHeight) : this.enablePan && this._pan(0, this.keyPanSpeed), t = !0;
				break;
			case this.keys.BOTTOM:
				e.ctrlKey || e.metaKey || e.shiftKey ? this.enableRotate && this._rotateUp(-Z_ * this.keyRotateSpeed / this.domElement.clientHeight) : this.enablePan && this._pan(0, -this.keyPanSpeed), t = !0;
				break;
			case this.keys.LEFT:
				e.ctrlKey || e.metaKey || e.shiftKey ? this.enableRotate && this._rotateLeft(Z_ * this.keyRotateSpeed / this.domElement.clientHeight) : this.enablePan && this._pan(this.keyPanSpeed, 0), t = !0;
				break;
			case this.keys.RIGHT: e.ctrlKey || e.metaKey || e.shiftKey ? this.enableRotate && this._rotateLeft(-Z_ * this.keyRotateSpeed / this.domElement.clientHeight) : this.enablePan && this._pan(-this.keyPanSpeed, 0), t = !0;
		}
		t && (e.preventDefault(), this.update());
	}
	_handleTouchStartRotate(e) {
		if (this._pointers.length === 1) this._rotateStart.set(e.pageX, e.pageY);
		else {
			let t = this._getSecondPointerPosition(e), n = .5 * (e.pageX + t.x), r = .5 * (e.pageY + t.y);
			this._rotateStart.set(n, r);
		}
	}
	_handleTouchStartPan(e) {
		if (this._pointers.length === 1) this._panStart.set(e.pageX, e.pageY);
		else {
			let t = this._getSecondPointerPosition(e), n = .5 * (e.pageX + t.x), r = .5 * (e.pageY + t.y);
			this._panStart.set(n, r);
		}
	}
	_handleTouchStartDolly(e) {
		let t = this._getSecondPointerPosition(e), n = e.pageX - t.x, r = e.pageY - t.y, i = Math.sqrt(n * n + r * r);
		this._dollyStart.set(0, i);
	}
	_handleTouchStartDollyPan(e) {
		this.enableZoom && this._handleTouchStartDolly(e), this.enablePan && this._handleTouchStartPan(e);
	}
	_handleTouchStartDollyRotate(e) {
		this.enableZoom && this._handleTouchStartDolly(e), this.enableRotate && this._handleTouchStartRotate(e);
	}
	_handleTouchMoveRotate(e) {
		if (this._pointers.length == 1) this._rotateEnd.set(e.pageX, e.pageY);
		else {
			let t = this._getSecondPointerPosition(e), n = .5 * (e.pageX + t.x), r = .5 * (e.pageY + t.y);
			this._rotateEnd.set(n, r);
		}
		this._rotateDelta.subVectors(this._rotateEnd, this._rotateStart).multiplyScalar(this.rotateSpeed);
		let t = this.domElement;
		this._rotateLeft(Z_ * this._rotateDelta.x / t.clientHeight), this._rotateUp(Z_ * this._rotateDelta.y / t.clientHeight), this._rotateStart.copy(this._rotateEnd);
	}
	_handleTouchMovePan(e) {
		if (this._pointers.length === 1) this._panEnd.set(e.pageX, e.pageY);
		else {
			let t = this._getSecondPointerPosition(e), n = .5 * (e.pageX + t.x), r = .5 * (e.pageY + t.y);
			this._panEnd.set(n, r);
		}
		this._panDelta.subVectors(this._panEnd, this._panStart).multiplyScalar(this.panSpeed), this._pan(this._panDelta.x, this._panDelta.y), this._panStart.copy(this._panEnd);
	}
	_handleTouchMoveDolly(e) {
		let t = this._getSecondPointerPosition(e), n = e.pageX - t.x, r = e.pageY - t.y, i = Math.sqrt(n * n + r * r);
		this._dollyEnd.set(0, i), this._dollyDelta.set(0, (this._dollyEnd.y / this._dollyStart.y) ** +this.zoomSpeed), this._dollyOut(this._dollyDelta.y), this._dollyStart.copy(this._dollyEnd);
		let a = (e.pageX + t.x) * .5, o = (e.pageY + t.y) * .5;
		this._updateZoomParameters(a, o);
	}
	_handleTouchMoveDollyPan(e) {
		this.enableZoom && this._handleTouchMoveDolly(e), this.enablePan && this._handleTouchMovePan(e);
	}
	_handleTouchMoveDollyRotate(e) {
		this.enableZoom && this._handleTouchMoveDolly(e), this.enableRotate && this._handleTouchMoveRotate(e);
	}
	_addPointer(e) {
		this._pointers.push(e.pointerId);
	}
	_removePointer(e) {
		delete this._pointerPositions[e.pointerId];
		for (let t = 0; t < this._pointers.length; t++) if (this._pointers[t] == e.pointerId) {
			this._pointers.splice(t, 1);
			return;
		}
	}
	_isTrackingPointer(e) {
		for (let t = 0; t < this._pointers.length; t++) if (this._pointers[t] == e.pointerId) return !0;
		return !1;
	}
	_trackPointer(e) {
		let t = this._pointerPositions[e.pointerId];
		t === void 0 && (t = new K(), this._pointerPositions[e.pointerId] = t), t.set(e.pageX, e.pageY);
	}
	_getSecondPointerPosition(e) {
		let t = e.pointerId === this._pointers[0] ? this._pointers[1] : this._pointers[0];
		return this._pointerPositions[t];
	}
	_customWheelEvent(e) {
		let t = e.deltaMode, n = {
			clientX: e.clientX,
			clientY: e.clientY,
			deltaY: e.deltaY
		};
		switch (t) {
			case 1:
				n.deltaY *= 16;
				break;
			case 2: n.deltaY *= 100;
		}
		return e.ctrlKey && !this._controlActive && (n.deltaY *= 10), n;
	}
};
function ev(e) {
	this.enabled !== !1 && (this._pointers.length === 0 && (this.domElement.setPointerCapture(e.pointerId), this.domElement.ownerDocument.addEventListener("pointermove", this._onPointerMove), this.domElement.ownerDocument.addEventListener("pointerup", this._onPointerUp)), !this._isTrackingPointer(e) && (this._addPointer(e), e.pointerType === "touch" ? this._onTouchStart(e) : this._onMouseDown(e), this._cursorStyle === "grab" && (this.domElement.style.cursor = "grabbing")));
}
function tv(e) {
	this.enabled !== !1 && (e.pointerType === "touch" ? this._onTouchMove(e) : this._onMouseMove(e));
}
function nv(e) {
	switch (this._removePointer(e), this._pointers.length) {
		case 0:
			this.domElement.releasePointerCapture(e.pointerId), this.domElement.ownerDocument.removeEventListener("pointermove", this._onPointerMove), this.domElement.ownerDocument.removeEventListener("pointerup", this._onPointerUp), this.dispatchEvent(K_), this.state = $.NONE, this._cursorStyle === "grab" && (this.domElement.style.cursor = "grab");
			break;
		case 1:
			let t = this._pointers[0], n = this._pointerPositions[t];
			this._onTouchStart({
				pointerId: t,
				pageX: n.x,
				pageY: n.y
			});
	}
}
function rv(e) {
	let t;
	switch (e.button) {
		case 0:
			t = this.mouseButtons.LEFT;
			break;
		case 1:
			t = this.mouseButtons.MIDDLE;
			break;
		case 2:
			t = this.mouseButtons.RIGHT;
			break;
		default: t = -1;
	}
	switch (t) {
		case Xs.DOLLY:
			if (this.enableZoom === !1) return;
			this._handleMouseDownDolly(e), this.state = $.DOLLY;
			break;
		case Xs.ROTATE:
			if (e.ctrlKey || e.metaKey || e.shiftKey) {
				if (this.enablePan === !1) return;
				this._handleMouseDownPan(e), this.state = $.PAN;
			} else {
				if (this.enableRotate === !1) return;
				this._handleMouseDownRotate(e), this.state = $.ROTATE;
			}
			break;
		case Xs.PAN:
			if (e.ctrlKey || e.metaKey || e.shiftKey) {
				if (this.enableRotate === !1) return;
				this._handleMouseDownRotate(e), this.state = $.ROTATE;
			} else {
				if (this.enablePan === !1) return;
				this._handleMouseDownPan(e), this.state = $.PAN;
			}
			break;
		default: this.state = $.NONE;
	}
	this.state !== $.NONE && this.dispatchEvent(G_);
}
function iv(e) {
	switch (this.state) {
		case $.ROTATE:
			if (this.enableRotate === !1) return;
			this._handleMouseMoveRotate(e);
			break;
		case $.DOLLY:
			if (this.enableZoom === !1) return;
			this._handleMouseMoveDolly(e);
			break;
		case $.PAN:
			if (this.enablePan === !1) return;
			this._handleMouseMovePan(e);
	}
}
function av(e) {
	this.enabled !== !1 && this.enableZoom !== !1 && this.state === $.NONE && (e.preventDefault(), this.dispatchEvent(G_), this._handleMouseWheel(this._customWheelEvent(e)), this.dispatchEvent(K_));
}
function ov(e) {
	this.enabled !== !1 && this._handleKeyDown(e);
}
function sv(e) {
	switch (this._trackPointer(e), this._pointers.length) {
		case 1:
			switch (this.touches.ONE) {
				case Zs.ROTATE:
					if (this.enableRotate === !1) return;
					this._handleTouchStartRotate(e), this.state = $.TOUCH_ROTATE;
					break;
				case Zs.PAN:
					if (this.enablePan === !1) return;
					this._handleTouchStartPan(e), this.state = $.TOUCH_PAN;
					break;
				default: this.state = $.NONE;
			}
			break;
		case 2:
			switch (this.touches.TWO) {
				case Zs.DOLLY_PAN:
					if (this.enableZoom === !1 && this.enablePan === !1) return;
					this._handleTouchStartDollyPan(e), this.state = $.TOUCH_DOLLY_PAN;
					break;
				case Zs.DOLLY_ROTATE:
					if (this.enableZoom === !1 && this.enableRotate === !1) return;
					this._handleTouchStartDollyRotate(e), this.state = $.TOUCH_DOLLY_ROTATE;
					break;
				default: this.state = $.NONE;
			}
			break;
		default: this.state = $.NONE;
	}
	this.state !== $.NONE && this.dispatchEvent(G_);
}
function cv(e) {
	switch (this._trackPointer(e), this.state) {
		case $.TOUCH_ROTATE:
			if (this.enableRotate === !1) return;
			this._handleTouchMoveRotate(e), this.update();
			break;
		case $.TOUCH_PAN:
			if (this.enablePan === !1) return;
			this._handleTouchMovePan(e), this.update();
			break;
		case $.TOUCH_DOLLY_PAN:
			if (this.enableZoom === !1 && this.enablePan === !1) return;
			this._handleTouchMoveDollyPan(e), this.update();
			break;
		case $.TOUCH_DOLLY_ROTATE:
			if (this.enableZoom === !1 && this.enableRotate === !1) return;
			this._handleTouchMoveDollyRotate(e), this.update();
			break;
		default: this.state = $.NONE;
	}
}
function lv(e) {
	this.enabled !== !1 && e.preventDefault();
}
function uv(e) {
	e.key === "Control" && (this._controlActive = !0, this.domElement.getRootNode().addEventListener("keyup", this._interceptControlUp, {
		passive: !0,
		capture: !0
	}));
}
function dv(e) {
	e.key === "Control" && (this._controlActive = !1, this.domElement.getRootNode().removeEventListener("keyup", this._interceptControlUp, {
		passive: !0,
		capture: !0
	}));
}
// ../../../vision/spectacular/packages/viz/src/views/scatter3d.ts
var fv = `
in float a_sel;
in float a_c;
uniform float u_size;
uniform float u_alpha;
uniform float u_pass;
uniform float u_dimAlpha;
uniform float u_selScale;
out vec4 v_color;
${As}
void main() {
  bool sel = a_sel > 0.5;
  if ((u_pass > 0.5) != sel) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = u_size * (sel ? u_selScale : 0.7) * (3.0 / -mv.z);
  v_color = sel ? vec4(pointColor(a_c), u_alpha) : vec4(0.55, 0.55, 0.6, u_dimAlpha);
}`, pv = "\nin vec4 v_color;\nout vec4 color;\nvoid main() {\n  vec2 d = gl_PointCoord - 0.5;\n  if (dot(d, d) > 0.25) discard;\n  color = vec4(v_color.rgb * v_color.a, v_color.a);\n}";
function mv(e) {
	let { view: t, table: n, engine: r } = e, i = t.height ?? 360, a = document.createElement("div");
	a.className = "sv-panel", a.dataset.view = t.id;
	let o = document.createElement("div");
	o.className = "sv-title", o.textContent = t.title ?? t.id;
	let s = document.createElement("div");
	s.className = "sv-legend", s.textContent = `x: ${e.titleOf(t.x)} · y: ${e.titleOf(t.y)} · z: ${e.titleOf(t.z)}`;
	let c = document.createElement("span");
	c.className = "sv-hint", c.textContent = " · drag to orbit, scroll to zoom", s.append(c), a.append(o);
	let l = new U_({
		antialias: !0,
		alpha: !0,
		preserveDrawingBuffer: !0
	});
	l.setPixelRatio(window.devicePixelRatio || 1), l.setSize(e.width, i), a.append(l.domElement, s);
	let u = n.rows, d = [
		Cs(n, t.x),
		Cs(n, t.y),
		Cs(n, t.z)
	], f = new Float32Array(u * 3);
	d.forEach((e, t) => {
		let [n, r] = e.extent, i = r > n ? 2 / (r - n) : 1;
		for (let r = 0; r < u; r++) f[r * 3 + t] = (e.values[r] - n) * i - 1;
	});
	let p = new df();
	p.setAttribute("position", new Yd(f, 3));
	let m = Os(n, t.color);
	p.setAttribute("a_c", new Yd(m.data, 1));
	let h = new Yd(r.state.mask.slice(), 1, !1);
	h.setUsage(El), p.setAttribute("a_sel", h);
	let g = {
		u_size: { value: t.pointSize ?? (u > 2e5 ? 2 : 4) },
		u_alpha: { value: Ts(r.state.selectedCount) },
		u_pass: { value: 0 },
		u_dimAlpha: { value: Math.min(.1, Ts(u)) },
		u_selScale: { value: Es(r.state.selectedCount, u) },
		u_colorMode: { value: m.mode },
		u_palette: { value: _s.map((e) => new q(...Ds(e))) },
		u_base: { value: new q(...Ds(_s[0])) }
	}, _ = (e) => new Op({
		glslVersion: Dl,
		vertexShader: fv,
		fragmentShader: pv,
		uniforms: {
			...g,
			u_pass: { value: e }
		},
		transparent: !0,
		depthWrite: !1,
		blending: 5,
		blendSrc: 201,
		blendDst: 205
	}), v = new gd(), y = new sp(p, _(0)), b = new sp(p, _(1));
	b.renderOrder = 1, v.add(y, b), v.add(new tp(new vp(new pp(2, 2, 2)), new Uf({ color: 8947848 }))), v.add(new Cm(1.2).translateX(-1).translateY(-1).translateZ(-1));
	let x = new im(45, e.width / i, .01, 100);
	x.position.set(3.2, 2.4, 3.2);
	let S = new $_(x, l.domElement), C = () => l.render(v, x);
	return S.addEventListener("change", C), C(), {
		el: a,
		update(e) {
			h.array.set(e.mask), h.needsUpdate = !0;
			for (let t of [y, b]) {
				let n = t.material.uniforms;
				n.u_alpha.value = Ts(e.selectedCount), n.u_selScale.value = Es(e.selectedCount, e.rows);
			}
			C();
		},
		destroy() {
			S.dispose(), p.dispose(), l.dispose();
		}
	};
}
// ../../../vision/spectacular/packages/viz/src/style.ts
var hv = "\n.sv-root {\n  --sv-fg: light-dark(#1d1f24, #e6e7ea);\n  --sv-muted: light-dark(#6b7080, #9aa0ae);\n  --sv-panel: light-dark(#ffffff, #17191e);\n  --sv-border: light-dark(#e3e5ea, #2a2d35);\n  --sv-context: light-dark(#dfe2e8, #2f333c);\n  --sv-focus: light-dark(#4e79a7, #6f9bd1);\n  color: var(--sv-fg);\n  font: 12px/1.4 system-ui, -apple-system, \"Segoe UI\", sans-serif;\n}\n.sv-heading { font-size: 15px; font-weight: 600; margin: 0 0 4px; }\n.sv-status { color: var(--sv-muted); margin: 0 0 10px; font-variant-numeric: tabular-nums; }\n.sv-grid { display: grid; gap: 12px; }\n.sv-panel { background: var(--sv-panel); border: 1px solid var(--sv-border); border-radius: 8px; padding: 8px 0 4px; min-width: 0; }\n.sv-title { font-weight: 600; padding: 0 12px 4px; }\n.sv-legend { color: var(--sv-muted); padding: 2px 12px; }\n.sv-stage { position: relative; }\n.sv-plot { position: absolute; }\n.sv-plot canvas { display: block; }\n.sv-overlay { position: absolute; left: 0; top: 0; overflow: visible; }\n.sv-overlay .domain, .sv-overlay .tick line { stroke: var(--sv-muted); }\n.sv-overlay .tick text { fill: var(--sv-muted); }\n.sv-axis-label { fill: var(--sv-fg); font-size: 11px; }\n.sv-context rect, rect.sv-context { fill: var(--sv-context); }\n.sv-focus rect { fill: var(--sv-focus); }\n.sv-brush .selection { fill: var(--sv-fg); fill-opacity: 0.1; stroke: var(--sv-fg); stroke-dasharray: 4 3; }\n";
// ../../../vision/spectacular/packages/viz/src/mount.ts
function gv(e, t) {
	let n = [], r = [], i = (e) => {
		let r = t.columns.get(e);
		return n.push(r.type === "quantitative" ? {
			kind: "numeric",
			values: r.values
		} : {
			kind: "categorical",
			codes: r.codes,
			cardinality: r.labels.length
		}), n.length - 1;
	}, a = e.views.map((e) => {
		switch (e.type) {
			case "scatter": return (e.brush ?? "xy") === "xy" ? { dims: {
				[e.x]: i(e.x),
				[e.y]: i(e.y)
			} } : { dims: {} };
			case "histogram": {
				let t = i(e.field);
				return r.push({
					kind: "histogram",
					dim: t,
					bins: e.bins ?? 60
				}), {
					dims: { [e.field]: t },
					group: r.length - 1
				};
			}
			case "bars": {
				let t = i(e.field);
				return r.push({
					kind: "category",
					dim: t
				}), {
					dims: { [e.field]: t },
					group: r.length - 1
				};
			}
			case "density": {
				let [t, n] = e.bins ?? [128, 128], a = i(e.x), o = i(e.y);
				return r.push({
					kind: "grid",
					x: a,
					y: o,
					xBins: t,
					yBins: n
				}), {
					dims: {
						[e.x]: a,
						[e.y]: o
					},
					group: r.length - 1
				};
			}
			case "scatter3d": return { dims: {} };
		}
	});
	if (n.length > 32) throw Error(`this spec needs ${n.length} crossfilter dimensions; the limit is 32 (each brushing view uses one per brushed field)`);
	return {
		dims: n,
		groups: r,
		allocations: a
	};
}
var _v = {
	scatter: Ys,
	histogram: Ps,
	bars: js,
	density: Ns,
	scatter3d: mv
}, vv = !1;
async function yv(e, t, n = {}) {
	let r = rs(t);
	if (r.length) throw new is(r);
	let i = await fs(t, n.columns, n.fetch);
	if (r = rs(t, ms(i)), r.length) throw new is(r);
	let { dims: a, groups: o, allocations: s } = gv(t, i), c = await hs.start(i.rows, a, o, n.worker);
	if (!vv && typeof document < "u") {
		let e = document.createElement("style");
		e.textContent = hv, document.head.append(e), vv = !0;
	}
	if (e.classList.add("sv-root"), e.replaceChildren(), t.title) {
		let n = document.createElement("div");
		n.className = "sv-heading", n.textContent = t.title, e.append(n);
	}
	let l = document.createElement("div");
	l.className = "sv-status";
	let u = document.createElement("div");
	u.className = "sv-grid";
	let d = Math.max(1, t.layout?.columns ?? Math.min(3, t.views.length));
	u.style.gridTemplateColumns = `repeat(${d}, minmax(0, 1fr))`, e.append(l, u);
	let f = (Math.max(320, e.clientWidth || 960) - 12 * (d - 1)) / d, p = (e) => t.fields?.[e]?.title ?? e, m = t.views.map((e, t) => {
		let n = Math.min(d, e.span ?? 1), r = _v[e.type], a = r({
			view: e,
			table: i,
			engine: c,
			alloc: s[t],
			width: f * n + 12 * (n - 1) - 2,
			titleOf: p
		});
		return a.el.style.gridColumn = `span ${n}`, u.append(a.el), a;
	}), h = new Intl.NumberFormat(), g = (e) => {
		l.textContent = `${h.format(e.selectedCount)} of ${h.format(e.rows)} rows selected` + (e.elapsed ? ` · crossfilter ${e.elapsed.toFixed(1)} ms` : "");
	};
	g(c.state), c.on((e) => {
		for (let t of m) t.update(e);
		g(e);
	});
	let _ = /* @__PURE__ */ new Map();
	return s.forEach((e, n) => {
		for (let [r, i] of Object.entries(e.dims)) _.set(i, {
			view: t.views[n].id,
			field: r
		});
	}), {
		table: i,
		engine: c,
		onUpdate: (e) => c.on(e),
		selection: () => ({
			selected: c.state.selectedCount,
			rows: c.state.rows,
			filters: [...c.filters].sort(([e], [t]) => e - t).map(([e, t]) => {
				let n = _.get(e);
				if ("range" in t) return {
					...n,
					range: [Math.min(...t.range), Math.max(...t.range)]
				};
				let r = i.columns.get(n.field);
				return {
					...n,
					values: "codes" in t && r.type === "nominal" ? t.codes.map((e) => r.labels[e]) : []
				};
			})
		}),
		toSVG() {
			let t = /* @__PURE__ */ new Map();
			for (let e of m) {
				let n = e.vector?.();
				n && t.set(n.plot, n.content);
			}
			return Gs(e, t);
		},
		selectedRows() {
			let e = c.state.mask, t = new Uint32Array(c.state.selectedCount);
			for (let n = 0, r = 0; n < e.length; n++) e[n] && (t[r++] = n);
			return t;
		},
		destroy() {
			c.dispose(), m.forEach((e) => e.destroy()), e.replaceChildren();
		}
	};
}
// ../../../vision/spectacular/packages/viz/src/engine/worker.ts?worker&inline
var bv = "var e=class{__destroy_into_raw(){let e=this.__wbg_ptr;return this.__wbg_ptr=0,r.unregister(this),e}free(){let e=this.__destroy_into_raw();x.__wbg_crossfilter_free(e,0)}addCategorical(e,t){let n=m(e,x.__wbindgen_malloc),r=b,i=x.crossfilter_addCategorical(this.__wbg_ptr,n,r,t);if(i[2])throw g(i[1]);return i[0]>>>0}addCategoryCounts(e){let t=x.crossfilter_addCategoryCounts(this.__wbg_ptr,e);if(t[2])throw g(t[1]);return t[0]>>>0}addGrid(e,t,n,r){let i=x.crossfilter_addGrid(this.__wbg_ptr,e,t,n,r);if(i[2])throw g(i[1]);return i[0]>>>0}addHistogram(e,t,n,r){let i=x.crossfilter_addHistogram(this.__wbg_ptr,e,t,!p(n),p(n)?0:n,!p(r),p(r)?0:r);if(i[2])throw g(i[1]);return i[0]>>>0}addNumeric(e){let t=h(e,x.__wbindgen_malloc),n=b,r=x.crossfilter_addNumeric(this.__wbg_ptr,t,n);if(r[2])throw g(r[1]);return r[0]>>>0}changedLen(){return x.crossfilter_changedLen(this.__wbg_ptr)>>>0}changedPtr(){return x.crossfilter_changedPtr(this.__wbg_ptr)>>>0}clearFilter(e){let t=x.crossfilter_clearFilter(this.__wbg_ptr,e);if(t[2])throw g(t[1]);return t[0]>>>0}extent(e){let t=x.crossfilter_extent(this.__wbg_ptr,e);if(t[3])throw g(t[2]);let n;return t[0]!==0&&(n=i(t[0],t[1]).slice(),x.__wbindgen_free(t[0],t[1]*8,8)),n}filterCodes(e,t){let n=m(t,x.__wbindgen_malloc),r=b,i=x.crossfilter_filterCodes(this.__wbg_ptr,e,n,r);if(i[2])throw g(i[1]);return i[0]>>>0}filterRange(e,t,n){let r=x.crossfilter_filterRange(this.__wbg_ptr,e,t,n);if(r[2])throw g(r[1]);return r[0]>>>0}groupBinning(e){let t=x.crossfilter_groupBinning(this.__wbg_ptr,e);if(t[3])throw g(t[2]);var n=i(t[0],t[1]).slice();return x.__wbindgen_free(t[0],t[1]*8,8),n}groupCounts(e){let t=x.crossfilter_groupCounts(this.__wbg_ptr,e);if(t[3])throw g(t[2]);var n=a(t[0],t[1]).slice();return x.__wbindgen_free(t[0],t[1]*4,4),n}constructor(e){let t=x.crossfilter_new(e);if(t[2])throw g(t[1]);return this.__wbg_ptr=t[0],r.register(this,this.__wbg_ptr,this),this}rows(){return x.crossfilter_rows(this.__wbg_ptr)>>>0}selectedCount(){return x.crossfilter_selectedCount(this.__wbg_ptr)>>>0}selectedPtr(){return x.crossfilter_selectedPtr(this.__wbg_ptr)>>>0}setScanThreshold(e){x.crossfilter_setScanThreshold(this.__wbg_ptr,e)}};Symbol.dispose&&(e.prototype[Symbol.dispose]=e.prototype.free);function t(){return x.wasmMemory()}function n(){return{__proto__:null,\"./chigutiro_bg.js\":{__proto__:null,__wbg_Error_30c8987f7c2ed4e2:function(e,t){return Error(c(e,t))},__wbg___wbindgen_memory_caa4a6165639c8b5:function(){return x.memory},__wbg___wbindgen_throw_41e9ee4f547fc59a:function(e,t){throw Error(c(e,t))},__wbindgen_init_externref_table:function(){let e=x.__wbindgen_externrefs,t=e.grow(4);e.set(0,void 0),e.set(t+0,void 0),e.set(t+1,null),e.set(t+2,!0),e.set(t+3,!1)}}}}const r=typeof FinalizationRegistry>`u`?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(e=>x.__wbg_crossfilter_free(e,1));function i(e,t){return e>>>=0,s().subarray(e/8,e/8+t)}function a(e,t){return e>>>=0,u().subarray(e/4,e/4+t)}let o=null;function s(){return(o===null||o.byteLength===0)&&(o=new Float64Array(x.memory.buffer)),o}function c(e,t){return y(e>>>0,t)}let l=null;function u(){return(l===null||l.byteLength===0)&&(l=new Uint32Array(x.memory.buffer)),l}let d=null;function f(){return(d===null||d.byteLength===0)&&(d=new Uint8Array(x.memory.buffer)),d}function p(e){return e==null}function m(e,t){let n=t(e.length*4,4)>>>0;return u().set(e,n/4),b=e.length,n}function h(e,t){let n=t(e.length*8,8)>>>0;return s().set(e,n/8),b=e.length,n}function g(e){let t=x.__wbindgen_externrefs.get(e);return x.__externref_table_dealloc(e),t}let _=new TextDecoder(`utf-8`,{ignoreBOM:!0,fatal:!0});_.decode();let v=0;function y(e,t){return v+=t,v>=2146435072&&(_=new TextDecoder(`utf-8`,{ignoreBOM:!0,fatal:!0}),_.decode(),v=t),_.decode(f().subarray(e,e+t))}let b=0,x;function S(e,t){return x=e.exports,o=null,l=null,d=null,x.__wbindgen_start(),x}async function C(e,t){if(typeof Response==`function`&&e instanceof Response){if(!e.ok)throw Error(`failed to fetch Wasm: ${e.status} ${e.statusText} fetching '${e.url}'`);if(typeof WebAssembly.instantiateStreaming==`function`)try{return await WebAssembly.instantiateStreaming(e,t)}catch(t){if(n(e.type)&&e.headers.get(`Content-Type`)!==`application/wasm`)console.warn(\"`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\\n\",t);else throw t}let r=await e.arrayBuffer();return await WebAssembly.instantiate(r,t)}{let n=await WebAssembly.instantiate(e,t);return n instanceof WebAssembly.Instance?{instance:n,module:e}:n}function n(e){switch(e){case`basic`:case`cors`:case`default`:return!0}return!1}}async function w(e){if(x!==void 0)return x;e!==void 0&&(Object.getPrototypeOf(e)===Object.prototype?{module_or_path:e}=e:console.warn(`using deprecated parameters for the initialization function; pass a single object instead`)),e===void 0&&(e=new URL(`data:application/wasm;base64,AGFzbQEAAAAByAEbYAJ/fwF/YAJ/fwBgA39/fwF/YAADf39/YAN/f38AYAF/AGABfwF/YAV/f39/fwBgAAR/f39/YAAAYAR/f39/AX9gAn9/BH9/f39gAAFvYAV/f39/fwF/YAZ/f39/f38AYAR/f39/A39/f2ACf38Df39/YAJ/fwFvYAl/f39/f39+fn4AYAR/f39/AGAAAX9gA39+fgBgB39/f398f3wDf39/YAV/f39/fwN/f39gBH9/fHwDf39/YAN/f38Df39/YAF/A39/fwLfAQQRLi9jaGlndXRpcm9fYmcuanMnX193YmdfX193YmluZGdlbl90aHJvd180MWU5ZWU0ZjU0N2ZjNTlhAAERLi9jaGlndXRpcm9fYmcuanMcX193YmdfRXJyb3JfMzBjODk4N2Y3YzJlZDRlMgARES4vY2hpZ3V0aXJvX2JnLmpzKF9fd2JnX19fd2JpbmRnZW5fbWVtb3J5X2NhYTRhNjE2NTYzOWM4YjUADBEuL2NoaWd1dGlyb19iZy5qcx9fX3diaW5kZ2VuX2luaXRfZXh0ZXJucmVmX3RhYmxlAAkDcnEGAgcHBAQEAQcACgQFDQIAAAAKBQIBBAASBwEOARMUAAAAAAcBAQoBDgcEChUBBQUFAQUCAgQGBgYGBgEAAQQAAA0FFhcPGAsLDwsZEBAaBQUAAAEEAAAEAQEAAQAAAgQCBQkMAAABCQkAAAEBAAEBCQQJAnABICBvAIAIBQMBABEGGQN/AUGAgMAAC38AQZyxwAALfwBBxLHAAAsHkgUcBm1lbW9yeQIAFl9fd2JnX2Nyb3NzZmlsdGVyX2ZyZWUAKRpjcm9zc2ZpbHRlcl9hZGRDYXRlZ29yaWNhbABNHWNyb3NzZmlsdGVyX2FkZENhdGVnb3J5Q291bnRzAFETY3Jvc3NmaWx0ZXJfYWRkR3JpZABIGGNyb3NzZmlsdGVyX2FkZEhpc3RvZ3JhbQBHFmNyb3NzZmlsdGVyX2FkZE51bWVyaWMATxZjcm9zc2ZpbHRlcl9jaGFuZ2VkTGVuADoWY3Jvc3NmaWx0ZXJfY2hhbmdlZFB0cgA7F2Nyb3NzZmlsdGVyX2NsZWFyRmlsdGVyAFASY3Jvc3NmaWx0ZXJfZXh0ZW50AE4XY3Jvc3NmaWx0ZXJfZmlsdGVyQ29kZXMASRdjcm9zc2Zp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B0EEdGoiBSkDCCERIAZBEGsiDCAFKQMANwMAIAwgETcDCCAGKQMAIREgBSAGKQMINwMIIAUgETcDACACIAcgECARIBFCP4dCAYiFWWoiB0EEdGoiBSkDCCERIAYgBSkDADcDACAGIBE3AwggBkEQaikDACERIAUgBkEYaikDADcDCCAFIBE3AwAgByAQIBEgEUI/h0IBiIVZaiEHIAZBIGoiBiAKSQ0ACyAGQRBrCyEFIAYgCUcEQANAIAIgB0EEdGoiCikDCCERIAUgCikDADcDACAFIBE3AwggBiIFKQMAIREgCiAFKQMINwMIIAogETcDACAHIBAgESARQj+HQgGIhVlqIQcgBUEQaiIGIAlHDQALIAZBEGshBQsgAiAHQQR0aiICKQMAIREgBSACKQMINwMIIAUgETcDACACIAs2AgggAiASNwMAIAcgECASQj+HQgGIIBKFWWoiBSABTw0BIAggACkDCDcDCCAIIAApAwA3AwAgACAFQQR0aiICKQMIIRAgACACKQMANwMAIAAgEDcDCCACIAgpAwg3AwggAiAIKQMANwMAIAEgBUEBaiIFayEBQQAhAiAAIAVBBHRqDAMLIAggACkDCDcDCCAIIAApAwA3AwAgACAGaiIFKQMIIRAgACAFKQMANwMAIAAgEDcDCCAFIAgpAwg3AwggBSAIKQMANwMAIABBEGohCiAAKQMAIhBCP4dCAYggEIUhECAAKAIYIQwgACkDECESQQAhByAAQSBqIgYgACABQQR0aiILQRBrIglPBH8gCgUDQCAKIAdBBHRqIgUpAwghESAGQRBrIg0gBSkDADcDACANIBE3AwggBikDACERIAUgBikDCDcDCCAFIBE3AwAgCiAHIBEgEUI/h0IBiIUgEFNqIgdBBHRqIgUpAwghESAGIAUpAwA3AwAgBiARNwMIIAZBEGopAwAhESAFIAZBGGopAwA3AwggBSARNwMAIAcgESARQj+HQgGIhSAQU2ohByAGQSBqIgYgCUkNAAsgBkEQawshBSAGIAtHBEADQCAKIAdBBHRqIgkpAwghESAFIAkpAwA3AwAgBSARNwMIIAYiBSkDACERIAkgBSkDCDcDCCAJIBE3AwAgByARIBFCP4dCAYiFIBBTaiEHIAVBEGoiBiALRw0ACyAGQRBrIQULIAogB0EEdGoiBikDACERIAUg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IAIrAxAiESARYSACKwMYIhIgEmFxRQRAIAQgCE8Ef0EDBSABKAIEIgIgBEHoAGxqIgUoAjBBf0YNAkGMkcAAIQRBBQshASADIAQ2AkwgAyABNgJIRAcAAAAAAAAAIREMDAsgBCAITwR/QQMFIAEoAgQiAiAEQegAbGooAjBBf0YNAkGMkcAAIQRBBQshASADIAQ2AkwgAyABNgJIRAcAAAAAAAAAIREMCwsgBSsDEEQAAAAAAADwPyAFKAIAQQFxIgcbIhIgBSsDCEQAAAAAAAAAACAHGyIRoUQAAAAAAADwPyARIBJjGyAJuKMhEgsgEr0iFkL///////////8AgyIVUCAWQgBTIgUgFUIBfUL/////////B1RxciAVQoCAgICAgID4/wBRciAVQoCAgICAgID4/wBWciAVQoCAgICAgIAIfUKAgICAgICA8P8AVCAFcXJFBEAgEb1C////////////AINC//////////f/AFgNBAsMAgsgAigCBCIEIAEoAggiCE8EQCADIAQ2AkwgA0EDNgJIDAkLIAEoAgQiAiAEQegAbGoiBigCMEF/Rw0DIANB7JLAADYCTCADQQU2AkhECwAAAAAAAAAhEQwICyACKAIYIgUgAikDMCIXpyIHRg0FAkACfCACKAIcIglFBEAgA0H0jsAANgJMIANBCDYCSEQVAAAAAAAAAAwBCyACKwMoIRIgAisDICETIAEoAgghCAJAAkAgAisDCCIUIBRhIAIrAxAiESARYXFFBEAgAwJ/IAUgCE8EQEEDIQIgBQwBCyABKAIEIgIgBUHoAGxqIgYoAjBBf0YNAkEFIQJBjJHAAAs2AkwgAyACNgJIRAcAAAAAAAAADAMLIAMCfyAFIAhPBEBBAyECIAUMAQsgASgCBCICIAVB6ABsaigCMEF/Rg0CQQUhAkGMkcAACzYCTCADIAI2AkhEBwAAAAAAAAAMAgsgBisDEEQAAAAAAADwPyAGKAIAQQFxIgQbIhEgBisDCEQAAAAAAAAAACAEGyIUoUQAAAAAAADwPyARIBRkGyAJuKMhEQsgEb0iFkL///////////8AgyIVUCAWQgBTIgYgFUIBfUL/////////B1RxciAVQoCAgICAgID4/wBRciAVQoCAgICAgID4/wBWciAVQoCAgICAgIAIfUKAgICAgICA8P8AVCAGcXJFBEAgFL0iFUL///////////8Ag0L/////////9/8AWA0CCyADQYmPwAA2AkwgA0EINgJIRCEAAAAAAAAACyERIAWtIAmtQiCGhCEXDAgLIBdCIIgiFlAEQCADQfSOwAA2AkwgA0EINgJIRBUAAAAAAAAAIREMCAsgFqchCgJAAkAgEyATYSASIBJhcUUEQCAHIAhPBH9BAwUgAiAHQegAbGoiBigCMEF/Rg0CQYyRwAAhB0EFCyEBIAMgBzYCTCADIAE2AkhEBwAAAAAAAAAhEQwKCyAHIAhPBH9BAwUgAiAHQegAbGooAjBBf0YNAkGMkcAAIQdBBQshASADIAc2AkwgAyABNgJIRAcAAAAAAAAAIREMCQsgBisDEEQAAAAAAADwPyAGKAIAQQFxIgQbIhIgBisDCEQAAAAAAAAAACAEGyIToUQAAAAAAADwPyASIBNkGyAKuKMhEgsgEr0iGEL///////////8AgyIWUCAYQgBTIgYgFkIBfUL/////////B1RxciAWQoCAgICAgID4/wBRciAWQoCAgICAgID4/wBWciAWQoCAgICAgIAIfUKAgICAgICA8P8AVCAGcXJFBEAgE71C////////////AINC//////////f/AFgNBAsLIANBiY/AADYCTCADQQg2AkhEIQAAAAAAAAAhEQwGCyADIAk2AkhBASAEdCELIBZCIIinIQkgFqchBSADKQNIIhWnIgwMAgsgAyAGKAI8NgJIQQEgBHQhCyADKQNIIhWnIgwMAQtBASAHdEEBIAV0ciELIAMgFDkDSCAVpyEMIAkgCmwLIg1BAnQhBiANQf////8DSw0BIAZB/P///wdLDQECfyAGRQRAQQQhDkEADAELQQQhECAGQQQQQCIORQ0CIA0LIQYgAyALNgJEIAMgCjYCNCADIAc2AjAgAyASOQMoIAMgEzkDICADIAk2AhwgAyAFNgIYIAMgETkDECADIBVCIIg+AgwgAyAMNgIIIAMgBDYCBCADIA82AgAgAyANNgJAIAMgDjYCPCADIAY2AjggAyACIAggASgCHCABKAIgEAwgASgCFCIEIAEoAgxGBEAjAEEQayICJAAgAkEEaiABQQxqIgcoAgAiBSAHKAIEQQQgBUEBdCIFIAVBBE0bIgVBCEHIABAsIAIoAgRBAUYEQCACKAIIIAIoAgwQVwAL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IAGtQoCAgIDgA4Q3AxBB8ITAACABQRBqQYiNwAAQQgALWAEBfwJAAkAgACgCACAAKAIIIgNrIAJJBEAgACADIAJBAUEBEC0gACgCCCEDDAELIAJFDQELIAJFDQAgACgCBCADaiABIAL8CgAACyAAIAIgA2o2AghBAAtUAQF/AkACQCAAKAIAIAAoAggiA2sgAkkEQCAAIAMgAhAuIAAoAgghAwwBCyACRQ0BCyACRQ0AIAAoAgQgA2ogASAC/AoAAAsgACACIANqNgIIQQALUAEBfyMAQSBrIgMkACADIAE2AgwgAyAANgIIIAMgA0EIaq1CgICAgIABhDcDGCADIANBDGqtQoCAgICAAYQ3AxBB/IHAACADQRBqIAIQQgALSwEDfwJAAkAgAARAIABBCGsiASABKAIAIgJBAWoiAzYCACADRQ0BIAAoAgBB/////wdPDQIgACgCPCABIAI2AgAPCxBrCwALEGwAC0sBA38CQAJAIAAEQCAAQQhrIgEgASgCACICQQFqIgM2AgAgA0UNASAAKAIAQf////8HTw0CIAAoAjggASACNgIADwsQawsACxBsAAtLAQN/AkACQCAABEAgAEEIayIBIAEoAgAiAkEBaiIDNgIAIANFDQEgACgCAEH/////B08NAiAAKAJkIAEgAjYCAA8LEGsLAAsQbAALSwEDfwJAAkAgAARAIABBCGsiASABKAIAIgJBAWoiAzYCACADRQ0BIAAoAgBB/////wdPDQIgACgCaCABIAI2AgAPCxBrCwALEGwAC0sBA38CQAJAIAAEQCAAQQhrIgEgASgCACICQQFqIgM2AgAgA0UNASAAKAIAQf////8HTw0CIAAoAiwgASACNgIADwsQawsACxBsAAtGAQN/AkACQCAABEAgAEEIayICIAIoAgAiA0EBaiIENgIAIARFDQEgACgCAA0CIAAgATYCbCACIAM2AgAPCxBrCwALEGwACz8AAkACfyABQQlPBEAgASAAEBsMAQsgABAECyIBRQ0AIAFBBGstAABBA3FFDQAgAEUNACABQQAgAPwLAAsgAQtEAQJ/IAEoAgQhAiABKAIAIQNBCEEEEFUiAUUEQEEEQQgQcAALIAEgAjYCBCABIAM2AgAgAEHwlsAANgIEIAAgATYCAAvaAQIBfwF+IwBBIGsiAyQAIAMgATYCECADIAA2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AikDCDcDICACIAIpAwA3AxggAkEANgJYIAJCgICAgBA3AlAgAkHIgMAANgJgIAJCoICAgAY3AmQgAiACQdAAajYCXCABIAJB3ABqEBMNAiACKAJQIQEgAigCVCIHIAIoAlgQWiEGIAEEQCAHIAEQNQtBASEHDAELIAIoAgQhBgsgCCAGNgIEIAggBzYCACACQfAAaiQADAELIAJB7wBqEDYACyADKAIMIQEgAygCCCECIAAgACgCAEEBajYCACAFIAUoAgBBAWsiADYCACAARQRAIANBHGoQRgsgBCACQQFxIgA2AgggBCABQQAgABs2AgQgBEEAIAEgABs2AgAgA0EgaiQADAMLEGsLAAsQbAALIAQoAgAgBCgCBCAEKAIIIARBEGokAAvEBQIIfwF+IwBBEGsiBCQAIwBB8ABrIgUkACAFQQRqIQYjAEGwAWsiASQAIAFBCGohAiAAQQJ0IQMCQAJAAkAgAEH/////A0sNACADQfz///8HSw0AAn8gA0UEQEEEIQhBAAwBC0EEIQcgA0EEEEAiCEUNASAACyEHQQEhAyAABEAgAEEBEFUiA0UNAgsgAARAIANBASAA/AsACyACIABBA3Y2AmwgAiAANgJoIAIgADYCZCACQgQ3AlwgAkIANwJUIAJCgICAgMAANwJMIAJCBDcCRCACQgA3AjwgAkKAgICAwAA3AjQgAiAANgIwIAIgAzYCLCACIAA2AiggAiAANgIkIAIgCDYCICACIAc2AhwgAkIINwIUIAJCADcCDCACQoCAgICAATcCBCACQQA2AgAMAgsgByADEFcAC0EBIAAQVwALAkACQAJAIAEoAghBAUYEQCABIAEpAyA3A4gBIAEgASkDGDcDgAEgASABKQMQNwN4IAFBADYCmAEgAUKAgICAEDcCkAEgAUHIgMAANgKgASABQqCAgIAGNwKkASABIAFBkAFqNgKcASABQfgAaiABQZwBahATDQIgASgCkAEhACABKAKUASICIAEoApgBEFohAyAABEAgAiAAEDULIAZBfzYCACAGIAM2AgQMAQsgASkCDCEJIAZBCGogAUEUakHkAPwKAAAgBiAJNwIACyABQbABaiQADAELIAFBrwFqEDYACwJAAkAgBAJ/IAUoAgRBf0YEQCAFKAIIIQBBAQwBC0H4AEEEEFUiAEUNASAAQQA2AgggAEKBgICAEDcCACAAQQxqIAVBBGpB7AD8CgAAIABBCGohAEEACyIBNgIIIAQgAEEAIAEbNgIEIARBACAAIAEbNgIAIAVB8ABqJAAMAQtBBEH4ABBwAAsgBCgCACAEKAIEIAQoAgggBEEQaiQACxoBAX8gACgCACIBQQBKBEAgACgCBCABEDULCxcBAX8gACgCACIBBEAgACgCBCABEDULCxUAIAFBCU8EQCABIAAQGw8LIAAQBAsYACABIAAoAgAiACgCACAAQQRqKAIAEBILHQAgAARAIAAgARBwAAtByJfAAEEjQdyXwAAQQgALEQAgACABQQF0QQFyIAIQQgALGAAgASgCACABKAIEIAAoAgAgACgCBBAWCxYBAW8gACABEAEhAhAiIgAgAiYBIAALDQAgAQRAIAAgARA1CwscACAAQbyVwAApAgA3AgggAEG0lcAAKQIANwIACxwAIABBrJXAACkCADcCCCAAQaSVwAApAgA3AgALFAAgACgCACABIAAoAgQoAgwRAAALEwAgAEHwlsAANgIEIAAgATYCAAscACABKAIAIAAoAgAgACgCBCABKAIEKAIMEQIACxAAIAEgACgCACAAKAIEEBILDwAgAEHIgMAAIAEgAhAWCwgAIAAgARA1Cw8AIABB1JTAACABIAIQFgsOAEGlnMAAQTMgABBCAAsSAEGwncAAQZkBQfydwAAQQgALGgIBbwF/EAIhABAiIgEgACYBIAElASABEDQLGQAgASgCAEGYjcAAQQUgASgCBCgCDBECAAsIACAAIAEQVQsJACAAIAEQAAALDABBnY3AAEEbEGoACw0AQbiNwABBzwAQagALCwAgACgCACABECMLnm0DFH4nfwF8AkACQAJ/IAEoAggiGEGAgIABcSEWIAAoAgArAwAhPSAYQYCAgIABcUUEQAJ/IAEhIyAWQQBHIR1BACEYIwBBgAFrIh8kACA9vSIMQv////////8HgyIFQoCAgICAgIAIhCAMQgGGQv7///////8PgyAMQjSIp0H/D3EiARsiAkIBgyEDQQIhAAJAAkACQAJAAkAgBVAiFkECQQMgFhtBBCAMQoCAgICAgID4/wCDIgVQGyAFQoCAgICAgID4/wBRG0EBaw4EAAECAwQLQQMhAAwDC0EEIQAMAgsgAUGzCGshGCADUCEAQgEhBAwBC0KAgICAgICA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dGlvbiBgbGVmdCDAECByaWdodGAgZmFpbGVkOiDACQogIGxlZnQ6IMAJCiByaWdodDogwAARaW52YWxpZCBiaW5uaW5nOiDAAMACOiDAAAhhdCBtb3N0IMAFIHJvd3MAL3J1c3RjLzQ4YTIyOWNlYWVmZDQ5ODVjNTA5OTBiMTQxMTZiNmQ4NTZhZjA5ODUvbGlicmFyeS9jb3JlL3NyYy9udW0vaW1wL2ZsdDJkZWMvc3RyYXRlZ3kvZ3Jpc3UucnMAL3J1c3RjLzQ4YTIyOWNlYWVmZDQ5ODVjNTA5OTBiMTQxMTZiNmQ4NTZhZjA5ODUvbGlicmFyeS9jb3JlL3NyYy9zbGljZS9zb3J0L3NoYXJlZC9zbWFsbHNvcnQucnMAL3J1c3RjLzQ4YTIyOWNlYWVmZDQ5ODVjNTA5OTBiMTQxMTZiNmQ4NTZhZjA5ODUvbGlicmFyeS9jb3JlL3NyYy9udW0vaW1wL2RpeV9mbG9hdC5ycwAvcnVzdGMvNDhhMjI5Y2VhZWZkNDk4NWM1MDk5MGIxNDExNmI2ZDg1NmFmMDk4NS9saWJyYXJ5L3N0ZC9zcmMvc3lzL3N5bmMvcndsb2NrL25vX3RocmVhZHMucnMAY3JhdGVzXGNoaWd1dGlyb1xzcmNcZ3JvdXAucnMAY3JhdGVzXGNoaWd1dGlyb1xzcmNcZGltZW5zaW9uLnJzAC9ydXN0Yy80OGEyMjljZWFlZmQ0OTg1YzUwOTkwYjE0MTE2YjZkODU2YWYwOTg1L2xpYnJhcnkvY29yZS9zcmMvbnVtL2ltcC9mbHQyZGVjL3N0cmF0ZWd5L2RyYWdvbi5ycwAvcnVzdGMvNDhhMjI5Y2VhZWZkNDk4NWM1MDk5MGIxNDExNmI2ZDg1NmFmMDk4NS9saWJyYXJ5L2NvcmUvc3JjL251bS9pbXAvYmlnbnVtLnJzAEM6XFVzZXJzXGt1bmRhXC5ydXN0dXBcdG9vbGNoYWluc1xzdGFibGUteDg2XzY0LXBjLXdpbmRvd3MtbXN2Y1xsaWIvcnVzdGxpYi9zcmMvcnVzdFxsaWJyYXJ5L2FsbG9jL3NyYy9zdHJpbmcucnMAL3J1c3RjLzQ4YTIyOWNlYWVmZDQ5ODVjNTA5OTBiMTQxMTZiNmQ4NTZhZjA5ODUvbGlicmFyeS9hbGxvYy9zcmMvcmF3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`,``+import.meta.url));let t=n();(typeof e==`string`||typeof Request==`function`&&e instanceof Request||typeof URL==`function`&&e instanceof URL)&&(e=fetch(e));let{instance:r,module:i}=await C(await e,t);return S(r,i)}let T,E=0;const D=w(),O=(e,t=[])=>self.postMessage(e,t);function k(){return Array.from({length:E},(e,t)=>T.groupCounts(t))}self.onmessage=async n=>{await D;let r=n.data;try{if(r.type===`init`){T?.free(),T=new e(r.rows);for(let e of r.dims)e.kind===`numeric`?T.addNumeric(e.values):T.addCategorical(e.codes,e.cardinality);for(let e of r.groups)e.kind===`histogram`?T.addHistogram(e.dim,e.bins,e.min,e.max):e.kind===`category`?T.addCategoryCounts(e.dim):T.addGrid(e.x,e.y,e.xBins,e.yBins);E=r.groups.length;let t=Array.from({length:E},(e,t)=>Array.from(T.groupBinning(t))),n=k();O({type:`ready`,binnings:t,counts:n,selectedCount:T.selectedCount()},n.map(e=>e.buffer));return}if(!T)throw Error(`filter before init`);let n=performance.now(),i=/* @__PURE__ */ new Set,a=!1;for(let e of r.ops){`range`in e?T.filterRange(e.dim,e.range[0],e.range[1]):`codes`in e?T.filterCodes(e.dim,Uint32Array.from(e.codes)):T.clearFilter(e.dim);let n=T.changedLen();if(a||n*4>T.rows()){a=!0;continue}let r=new Uint32Array(t().buffer,T.changedPtr(),n);for(let e of r)i.delete(e)||i.add(e)}let o=performance.now()-n,s=k(),c=s.map(e=>e.buffer),l;if(a){let e=new Uint8Array(t().buffer,T.selectedPtr(),T.rows()).slice();c.push(e.buffer),l={type:`update`,seq:r.seq,mask:e,counts:s,selectedCount:T.selectedCount(),elapsed:o}}else{let e=Uint32Array.from(i);c.push(e.buffer),l={type:`update`,seq:r.seq,changed:e,counts:s,selectedCount:T.selectedCount(),elapsed:o}}O(l,c)}catch(e){O({type:`error`,message:e instanceof Error?e.message:String(e)})}};", xv = typeof self < "u" && self.Blob && new Blob(["URL.revokeObjectURL(import.meta.url);", bv], { type: "text/javascript;charset=utf-8" });
function Sv(e) {
	let t;
	try {
		if (t = xv && (self.URL || self.webkitURL).createObjectURL(xv), !t) throw "";
		let n = new Worker(t, {
			type: "module",
			name: e?.name
		});
		return n.addEventListener("error", () => {
			(self.URL || self.webkitURL).revokeObjectURL(t);
		}), n;
	} catch {
		return new Worker("data:text/javascript;charset=utf-8," + encodeURIComponent(bv), {
			type: "module",
			name: e?.name
		});
	}
}
// renderers/spectacular/src/widget.ts
var Cv = { async render({ model: e, el: t }) {
	let n = e.get("files"), r = document.createElement("div");
	r.style.height = `${e.get("height")}px`, r.style.position = "relative", t.append(r);
	let i = (async (e) => {
		let t = String(e);
		return t in n ? new Response(n[t]) : new Response(`the notebook sent no file for ${t}`, {
			status: 404,
			statusText: "not sent"
		});
	}), a;
	try {
		a = await yv(r, e.get("spec"), {
			worker: new Sv(),
			fetch: i
		}), a.onUpdate(() => {
			e.set("selection", a.selection()), e.save_changes();
		});
	} catch (e) {
		r.style.height = "auto", r.textContent = `spectacular: ${e.message}`;
	}
	return () => a?.destroy();
} };
export { Cv as default };
