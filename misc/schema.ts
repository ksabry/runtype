export enum SpecKind {
	Never,
	Unknown,
	Primitive,
	Object,
	Array,
	Tuple,
	Union,
	Singleton,
}

interface NeverSpec {
	kind: SpecKind.Never;
}

interface UnknownSpec {
	kind: SpecKind.Unknown;
}

interface PrimitiveSpec {
	kind: SpecKind.Primitive;
	primitive: string;
}

interface ObjectSpec {
	kind: SpecKind.Object;
	properties: {
		[key: string]: {
			optional: boolean;
			value: Spec;
		}
	};
	index?: {
		property: Spec;
		value: Spec;
	};
}

interface ArraySpec {
	kind: SpecKind.Array;
	element: Spec;
}

interface TupleSpec {
	kind: SpecKind.Tuple;
	elements: Spec[];
}

interface UnionSpec {
	kind: SpecKind.Union;
	alternatives: Spec[];
}

interface SingletonSpec {
	kind: SpecKind.Singleton;
	value: unknown;
}

export type Spec =
	| NeverSpec
	| UnknownSpec
	| PrimitiveSpec
	| ObjectSpec
	| ArraySpec
	| TupleSpec
	| UnionSpec
	| SingletonSpec
;

export class Schema<T> {
	public static of<U>(): Schema<U> {
		throw Error("It seems like ts-schema is not properly installed, make sure you are running your typescript compiler with the custom transformer");
	}
	
	//@ts-ignore
	private static of_impl<U>(spec: Spec) {
		return new Schema<U>(spec);
	}

	private spec: Spec;
	private constructor(spec: Spec) {
		this.spec = spec;
	}

	public validate(value: unknown): ValidationResult {
		return this.validateSpec(value, this.spec);
	}

	private validateSpec(value: unknown, spec: Spec): ValidationResult {
		switch (spec.kind) {
			// Never always returns false
			case SpecKind.Never:
				return { valid: false, error: new InvalidValueError(value, spec) };
			
			// Unknown always returns true
			case SpecKind.Unknown:
				return { valid: true, error: null };
			
			// Primitive types: string, number, symbol, bigint, boolean, undefined
			case SpecKind.Primitive:
				if (typeof value === spec.primitive) {
					return { valid: true, error: null };
				}
				else {
					return { valid: false, error: new InvalidValueError(value, spec) };
				}
			
			// Object type with nested properties
			case SpecKind.Object:
				if (typeof value !== "object" || value === null) {
					return { valid: false, error: new InvalidValueError(value, spec) };
				}

				let objectValid = true;
				const objectErrors: ValidationError[] = [];

				for (const propertyName in spec.properties) {
					const { optional, value: valueSpec } = spec.properties[propertyName];
					
					if (!(propertyName in value)) {
						if (!optional) {
							objectErrors.push(new MissingPropertyError(propertyName));
							// Don't short circuit after missing properties
						}
						continue;
					}

					const objectPropValidation = this.validateSpec((value as any)[propertyName], valueSpec);
					
					if (!objectPropValidation.valid) {
						objectValid = false;
					}
					if (objectPropValidation.error !== null) {
						objectErrors.push(new InvalidPropertyError(propertyName, [ objectPropValidation.error ]));
						break; // Short circuit after first property error
					}
				}

				if (objectValid && spec.index) {
					for (const propertyName in value) {
						if (!(propertyName in spec.properties)) {
							const indexPropertyValidation = this.validateSpec(propertyName, spec.index.property);
							const indexValueValidation = this.validateSpec((value as any)[propertyName], spec.index.value);

							if (!indexPropertyValidation.valid || !indexValueValidation.valid) {
								objectValid = false;
							}
							if (indexPropertyValidation.error !== null) {
								objectErrors.push(new InvalidPropertyIndexError(propertyName, spec.index.property, [ indexPropertyValidation.error ]));
								// don't short circuit on invalid property index
							}
							if (indexValueValidation.error !== null) {
								objectErrors.push(new InvalidPropertyError(propertyName, [ indexValueValidation.error ]));
								break; // short circuit after first property error
							}
						}
					}
				}

				return { valid: objectValid, error: objectErrors.length === 0 ? null : new InvalidValueError(value, spec, objectErrors) };

			// Array type
			case SpecKind.Array:
				if (!Array.isArray(value)) {
					return { valid: false, error: new InvalidValueError(value, spec) };
				}

				let arrayValid = true;
				const arrayErrors: ValidationError[] = [];

				for (let i = 0; i < value.length; i++) {
					const arrayElementValidation = this.validateSpec(value[i], spec.element);

					if (!arrayElementValidation.valid) {
						arrayValid = false;
					}
					if (arrayElementValidation.error !== null) {
						arrayErrors.push(new InvalidElementError(i, [ arrayElementValidation.error ]));
						break; // short circuit after first element error
					}
				}

				return { valid: arrayValid, error: arrayErrors.length === 0 ? null : new InvalidValueError(value, spec, arrayErrors) };

			// Tuple type
			case SpecKind.Tuple:
				if (!Array.isArray(value) || value.length !== spec.elements.length) {
					return { valid: false, error: new InvalidValueError(value, spec) };
				}

				let tupleValid = true;
				const tupleErrors: ValidationError[] = [];

				for (let i = 0; i < spec.elements.length; i++) {
					const tupleElementValidation = this.validateSpec(value[i], spec.elements[i]);

					if (!tupleElementValidation.valid) {
						tupleValid = false;
					}
					if (tupleElementValidation.error !== null) {
						tupleErrors.push(new InvalidElementError(i, [ tupleElementValidation.error ]));
						break; // short circuit after first element error
					}
				}

				return { valid: tupleValid, error: tupleErrors.length === 0 ? null : new InvalidValueError(value, spec, tupleErrors) };

			// Union type
			case SpecKind.Union:
				let unionFound = false;
				const unionErrors: ValidationError[] = [];

				for (const unionSubSpec of spec.alternatives) {
					const unionSubValidation = this.validateSpec(value, unionSubSpec);
					if (unionSubValidation.valid) {
						unionFound = true;
						break;
					}
					if (unionSubValidation.error !== null) {
						unionErrors.push(unionSubValidation.error);
					}
				}

				return { valid: unionFound, error: unionFound ? null : new InvalidValueError(value, spec, unionErrors) }

			// Singleton type
			case SpecKind.Singleton:
				// NOTE: a possible edge case is NaN, though currently there is actually no NaN singleton type in typescript
				// If one gets introduced (see https://github.com/microsoft/TypeScript/issues/17574) we should imitate however the type behaves
				if (value === spec.value) {
					return { valid: true, error: null };
				}
				else {
					return { valid: false, error: new InvalidValueError(value, spec) };
				}

			default:
				throw new Error(`Unrecognized spec.kind ${spec!.kind}`)
		}
	}

	public check(value: unknown): value is T {
		const validation = this.validate(value);
		return validation.valid;
	}

	public assert(value: unknown): asserts value is T {
		const validation = this.validate(value);
		if (!validation.valid) {
			// TODO: add setter for custom handler
			throw validation.error;
		}
	}
}

export class ValidationResult {
	valid: boolean;
	error: null | ValidationError;
}

export abstract class ValidationError {
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
	readonly expected: Spec;
	readonly actual: unknown;
	
	public constructor(actual: unknown, expected: Spec, children: ValidationError[] = []) {
		super(children);
		this.expected = expected;
		this.actual = actual;
	}

	public toStringShort() {
		return `Invalid value (${JSON.stringify(this.actual)})\nExpected ${JSON.stringify(this.expected)}`;
	}
}

export class MissingPropertyError extends ValidationError {
	readonly propertyName: string;

	public constructor(propertyName: string) {
		super();
		this.propertyName = propertyName;
	}

	public toStringShort() {
		return `Missing property (${this.propertyName})`;
	}
}

export class InvalidPropertyError extends ValidationError {
	readonly propertyName: string;

	public constructor(propertyName: string, children: ValidationError[] = []) {
		super(children);
		this.propertyName = propertyName;
	}

	public toStringShort() {
		return `Property (${this.propertyName}) failed validation`;
	}
}

export class InvalidElementError extends ValidationError {
	readonly elementIndex: number;

	public constructor(elementIndex: number, children: ValidationError[] = []) {
		super(children);
		this.elementIndex = elementIndex;
	}

	public toStringShort() {
		return `Element at index (${this.elementIndex}) failed validation`;
	}
}

export class InvalidPropertyIndexError extends ValidationError {
	readonly propertyName: string;
	readonly expected: Spec;

	public constructor(propertyName: string, expected: Spec, children: ValidationError[]) {
		super(children);
		this.propertyName = propertyName;
		this.expected = expected;
	}

	public toStringShort() {
		return `Invalid property index (${this.propertyName})\nExpected ${JSON.stringify(this.expected)}`;
	}
}
