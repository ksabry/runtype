import { __runtime } from "./injection";
import { Runtype, RuntypeBase } from "./runtype";

export * from "./injection";
export * from "./runtype";

export function runtype<T>(): Runtype<T> {
	return __runtime.type_arguments[0];
}

export function runtypeParameterized< F extends ()=>unknown, R extends RuntypeBase = RuntypeBase >(...params: RuntypeBase[]): R {
	return null as any;
}

let x = runtypeParameterized< <T>()=>Array<T> >() ;

// let x = runtypeOf<Array>();
// let x = runtypeOfGeneric< <T>()=>Array<T> >();
// export function runtypeOfGeneric<  >

export function isOfType<T>(value: unknown): value is T {
	return runtype<T>().validate(value).valid;
}

export function assertOfType<T>(value: unknown): asserts value is T {
	const validation = runtype<T>().validate(value);
	if (!validation.valid) {
		throw validation.error;
	}
}

export const __global_runtypes = {
	ArrayBuffer: runtype<ArrayBuffer>(),
	Boolean: runtype<Boolean>(),
	BigInteger: runtype<BigInteger>(),
	Buffer: runtype<Buffer>(),
	DataView: runtype<DataView>(),
	Date: runtype<Date>(),
	Error: runtype<Error>(),
	EvalError: runtype<EvalError>(),
	Float32Array: runtype<Float32Array>(),
	Float64Array: runtype<Float64Array>(),
	Function: runtype<Function>(),
	Int16Array: runtype<Int16Array>(),
	Int32Array: runtype<Int32Array>(),
	Int8Array: runtype<Int8Array>(),
	JSON: runtype<JSON>(),
	Math: runtype<Math>(),
	Number: runtype<Number>(),
	Object: runtype<Object>(),
	RangeError: runtype<RangeError>(),
	ReferenceError: runtype<ReferenceError>(),
	RegExp: runtype<RegExp>(),
	String: runtype<String>(),
	Symbol: runtype<Symbol>(),
	SyntaxError: runtype<SyntaxError>(),
	TypeError: runtype<TypeError>(),
	URIError: runtype<URIError>(),
	Uint16Array: runtype<Uint16Array>(),
	Uint32Array: runtype<Uint32Array>(),
	Uint8Array: runtype<Uint8Array>(),
	Uint8ClampedArray: runtype<Uint8ClampedArray>(),
};

export const __global_generic_widened_runtypes = {
	Array: runtype<Array<unknown>>(),
	Map: runtype<Map<unknown, unknown>>(),
	Promise: runtype<Promise<unknown>>(),
	Set: runtype<Set<unknown>>(),
	WeakMap: runtype<WeakMap<object, unknown>>(),
	WeakSet: runtype<WeakSet<object>>(),
};
