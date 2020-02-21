import { runtypeOf, Runtype } from "runtype";


export let __runtime = {
	type_params: [],
	invoked_function: undefined,
	global_runtypes: new Map<string, Runtype>([
		[ "Array",  runtypeOf<Array<unknown>>() ],
		[ "ArrayBuffer",  runtypeOf<ArrayBuffer>() ],
		[ "Boolean",  runtypeOf<Boolean>() ],
		[ "Buffer",  runtypeOf<Buffer>() ],
		[ "DataView",  runtypeOf<DataView>() ],
		[ "Date",  runtypeOf<Date>() ],
		[ "Error",  runtypeOf<Error>() ],
		[ "EvalError",  runtypeOf<EvalError>() ],
		[ "Float32Array",  runtypeOf<Float32Array>() ],
		[ "Float64Array",  runtypeOf<Float64Array>() ],
		[ "Function",  runtypeOf<Function>() ],
		[ "Int16Array",  runtypeOf<Int16Array>() ],
		[ "Int32Array",  runtypeOf<Int32Array>() ],
		[ "Int8Array",  runtypeOf<Int8Array>() ],
		[ "JSON",  runtypeOf<JSON>() ],
		[ "Map",  runtypeOf<Map<unknown, unknown>>() ],
		[ "Math",  runtypeOf<Math>() ],
		[ "Number",  runtypeOf<Number>() ],
		[ "Object",  runtypeOf<Object>() ],
		[ "Promise",  runtypeOf<Promise<unknown>>() ],
		[ "RangeError",  runtypeOf<RangeError>() ],
		[ "ReferenceError",  runtypeOf<ReferenceError>() ],
		[ "RegExp",  runtypeOf<RegExp>() ],
		[ "Set",  runtypeOf<Set<unknown>>() ],
		[ "String",  runtypeOf<String>() ],
		[ "Symbol",  runtypeOf<Symbol>() ],
		[ "SyntaxError",  runtypeOf<SyntaxError>() ],
		[ "TypeError",  runtypeOf<TypeError>() ],
		[ "URIError",  runtypeOf<URIError>() ],
		[ "Uint16Array",  runtypeOf<Uint16Array>() ],
		[ "Uint32Array",  runtypeOf<Uint32Array>() ],
		[ "Uint8Array",  runtypeOf<Uint8Array>() ],
		[ "Uint8ClampedArray",  runtypeOf<Uint8ClampedArray>() ],
		[ "WeakMap",  runtypeOf<WeakMap<object, unknown>>() ],
		[ "WeakSet",  runtypeOf<WeakSet<object>>() ],
	]),
};