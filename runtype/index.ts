import { __runtime } from "./injection";
import { Runtype } from "./runtype";

export * from "./injection";
export * from "./runtype";

export function runtypeOf<T>(): Runtype {
	return __runtime.type_params[0];
}

export function isOfType<T>(value: unknown): value is T {
	return runtypeOf<T>().validate(value).valid;
}

export function assertOfType<T>(value: unknown): asserts value is T {
	const validation = runtypeOf<T>().validate(value);
	if (!validation.valid) {
		throw validation.error;
	}
}
