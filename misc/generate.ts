// import ts from "typescript";
import { inspect } from "util";

abstract class ValidationError {
	public readonly children: ValidationError[];
	
	constructor(children: ValidationError[] = []) {
		this.children = children;
	}

	public abstract toStringShort(): string;

	public toString() {
		let messageLines = [ this.toStringShort() ];
		for (const child of this.children) {
			for (const childLine of child.toString().split("\n")) {
				messageLines.push("  " + childLine);
			}
		}
		return messageLines.join("\n");
	}
}

export class InvalidValueError extends ValidationError {
	readonly expected: Schema<unknown>;
	readonly actual: unknown;
	
	public constructor(expected: Schema<unknown>, actual: unknown, children: ValidationError[] = []) {
		super(children);
		this.expected = expected;
		this.actual = actual;
	}

	public toStringShort() {
		return `Invalid value '${JSON.stringify(this.actual)}'\nExpected ${this.expected.toString()}`;
	}
}

class Validation {
	readonly valid: boolean;
	readonly error: null | ValidationError;
}

/**
 * Properties are a subset of the properties of NodeJS.inspect options
 */
export interface SchemaToStringOptions {
	depth: number;
	colors: boolean;
}

class Schema<T> {
	public validate: (value: unknown) => Validation;

	public constructor(validate: (value: unknown) => Validation) {
		this.validate = validate.bind(this);
	}

	public is(value: unknown): value is Test {
		return this.validate(value).valid;
	}

	public assert(value: unknown): asserts value is Test {
		const validation = this.validate(value);
		if (!validation.valid) {
			throw validation.error;
		}
	}

	public toString(options?: SchemaToStringOptions) {
	}
}

function errorInvalidValue(actual: unknown, expectedString: string, errorChildren: ValidationError[] = []): ValidationError {
	const shortMessage = `Invalid value '${JSON.stringify(actual)}'\nExpected ${expectedString}`;
	throw "not implemented";
}

function errorMissingValue(propertyName: string): ValidationError {
	const message = `Missing property '${propertyName}'`;
	throw "not implemented";
}

function errorPropertyInvalid(propertyName: string, errorChildren: ValidationError[] = []): ValidationError {
	const shortMessage = `Property '${propertyName}' failed validation`;
	
	let messageLines = [ shortMessage ];
	for (const errorChild of errorChildren) {
		for (const childMessageLine of errorChild.toString().split("\n")) {
			messageLines.push("  " + childMessageLine);
		}
	}
	
	throw "not implemented";
}

/// Generated

interface Test {
	value1: number;
	value2: string;
	value3: {
		value4: number;
	}
}

namespace Test {
	export function is(value: unknown): value is Test {
		return schema.validate(value).valid;
	}

	export function assert(value: unknown): asserts value is Test {
		const validation = schema.validate(value);
		if (!validation.valid) {
			throw validation.error;
		}
	}

	export function validate(value: unknown): Validation {
		return schema.validate(value);
	}

	export const schema: Schema<Test> = new Schema<Test>(
		(value: any) => {
			
			// value is a proper object
			if (typeof value !== "object" || value === null) {
				return {
					valid: false,
					error: errorInvalidValue(value, "{ value1: number; value2: string; value3: { value4: number; } }"),
				}
			}

			// value contains all required properties
			const missingValueErrors: ValidationError[] = [];

			if (!("value1" in value)) {
				missingValueErrors.push(errorMissingValue("value1"));
			}
			if (!("value2" in value)) {
				missingValueErrors.push(errorMissingValue("value2"));
			}
			if (!("value3" in value)) {
				missingValueErrors.push(errorMissingValue("value3"));
			}
			if (missingValueErrors.length > 0) {
				return {
					valid: false,
					error: errorInvalidValue(value, "{ value1: number; value2: string; value3: { value4: number; } }", missingValueErrors),
				};
			}

			// Checking value.value1
			const p0 = value.value1;
			
			// value.value1 is a number
			if (typeof p0 !== "number") {
				return {
					valid: false,
					error: errorInvalidValue(value, "{ value1: number; value2: string; value3: { value4: number; } }", [
						errorPropertyInvalid("value1", [
							errorInvalidValue(p0, "number"),
						]),
					]),
				}
			}
		
			// Checking value.value2
			const p1 = value.value2;

			// value.value2 is a string
			if (typeof p1 !== "string") {
				return {
					valid: false,
					error: errorInvalidValue(value, "{ value1: number; value2: string; value3: { value4: number; } }", [
						errorPropertyInvalid("value2", [
							errorInvalidValue(p1, "string"),
						]),
					]),
				}
			}

			// Valid

			return {
				valid: true,
				error: null,
			};
		}
	);
}

