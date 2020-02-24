import util from "util";

import { __runtime } from "./injection";
import { __global_runtypes, __global_generic_widened_runtypes } from "./index";

export enum RuntypeKind {
	TypeParameter,
	Never,
	Unknown,
	Any,
	Void,
	Undefined,
	String,
	Number,
	BigInt,
	Symbol,
	Null,
	True,
	False,
	NonPrimitive,
	StringLiteral,
	NumberLiteral,
	BigIntLiteral,
	Object,
	Array,
	Tuple,
	Union,
	Intersection,
}

// TODO:
// arrays as objects
// unique symbols
// Function,
// Mapped + InferType
// Conditional,
// ParameterOf,
// ReturnOf,
// TypeQuery (typeof)
// ThisType
// RestType,
// ImportType
// OptionalType? (there is an OptionalTypeNode, but it seems it's Type is always a different Type)
// JSDoc types?

type UnionToIntersection<U> = (U extends any ? (k: U)=>void : never) extends ((k: infer I)=>void) ? I : never;

/**
 * Assignablity between `ExactBrand<A>` and `ExactBrand<B>` is disallowed in both directions if they are not the exact same type
 */
type ExactBrand<T> =
	0 extends (1 & T) ? "any" :
	{
		t: T;
		intersection: UnionToIntersection<T>;
		req: Required<T>;
		key: keyof T;
		string: string extends T ? 1 : 0;
		number: number extends T ? 1 : 0;
		bigint: bigint extends T ? 1 : 0;
		symbol: symbol extends T ? 1 : 0;
		void: void extends T ? 1 : 0;
		object: object extends T ? 1 : 0;
		props: { [Key in keyof T]: ExactBrand<T[Key]> }
		params: T extends (...args: any)=>any ? ExactBrand<Parameters<T>> : never;
		ret: T extends (...args: any)=>any ? ExactBrand<ReturnType<T>> : never;
		length: ExactBrand<T extends { length: unknown } ? T["length"] : never>;
	}
;

export interface RuntypeBase {
	readonly kind: RuntypeKind;
	validate(value: unknown): ValidationResult;
	typeString(): string;
	[util.inspect.custom](depth: number, options: util.InspectOptionsStylized): unknown;
	readonly parenthesisPriority: number;
}

const runtypeBrandSymbol = Symbol("Runtype brand");

/**
 * An instance of `Runtype<T>` is a runtime representation of the typescript type `T`.
 * Note that the the type parameter `T` is specially treated so that two runtypes are only assignable if they have the exact same type.
 */
export declare class Runtype<T> implements RuntypeBase {
	public readonly [runtypeBrandSymbol]: ExactBrand<T>;
	public readonly kind: RuntypeKind;

	/**
	 * Validates whether a value is permitted by the type.
	 * Note that this is actually not a completely black in white question in some cases due to the unsound nature of certain parts of the type system.
	 * For the purposes of this function, a value is permitted by a type if it can be directly assigned to a variable of the type.
	 * ```
	 * let lhs: Type;
	 * let rhs = value;
	 * lhs = rhs; // is this permitted?
	 * ```
	 * In the future we may add the ability to change this behavior.
	 */
	public validate(value: unknown): ValidationResult;

	public typeString(): string;
	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized): unknown;
	public readonly parenthesisPriority: number;
}

class TypeParameter implements RuntypeBase {
	public readonly kind: RuntypeKind;

	public readonly listId: number;
	public readonly index: number;

	public constructor(listId: number, index: number) {
		this.kind = RuntypeKind.TypeParameter;
		this.listId = listId;
		this.index = index;
	}

	public validate(value: unknown): ValidationResult {
		throw new Error("Runtypes with unresolved type parameters cannot be directly validated");
	}

	public typeString() {
		return `T_${this.listId}_${this.index}`;
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize(this.typeString(), "special");
	}

	public readonly parenthesisPriority = 1;
}

class NeverType implements RuntypeBase {
	public readonly kind: RuntypeKind;

	public constructor() {
		this.kind = RuntypeKind.Never;
	}

	public validate(value: unknown): ValidationResult {
		return { valid: false, error: new InvalidValueError(value, this) };
	}

	public typeString() {
		return "never";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("never", "special");
	}

	public readonly parenthesisPriority = 1;
}

class UnknownType implements RuntypeBase {
	public readonly kind: RuntypeKind;

	public constructor() {
		this.kind = RuntypeKind.Unknown;
	}

	public validate(value: unknown): ValidationResult {
		return { valid: true, error: null };
	}

	public typeString() {
		return "unknown";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("unknown", "special");
	}

	public readonly parenthesisPriority = 1;
}

class AnyType implements RuntypeBase {
	public readonly kind: RuntypeKind;

	public constructor() {
		this.kind = RuntypeKind.Any;
	}

	// unsound
	public validate(value: unknown): ValidationResult {
		return { valid: true, error: null };
	}

	public typeString() {
		return "any";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("any", "special");
	}

	public readonly parenthesisPriority = 1;
}

class VoidType implements RuntypeBase {
	public readonly kind: RuntypeKind;

	public constructor() {
		this.kind = RuntypeKind.Void;
	}

	// unsound
	public validate(value: unknown): ValidationResult {
		if (value === undefined) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "void";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("void", "special");
	}

	public readonly parenthesisPriority = 1;
}

class UndefinedType implements RuntypeBase {
	public readonly kind: RuntypeKind;

	public constructor() {
		this.kind = RuntypeKind.Undefined;
	}
	
	public validate(value: unknown): ValidationResult {
		if (value === undefined) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "undefined";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("undefined", "special");
	}

	public readonly parenthesisPriority = 1;
}

class StringType implements RuntypeBase {
	public readonly kind: RuntypeKind;

	public constructor() {
		this.kind = RuntypeKind.String;
	}

	public validate(value: unknown): ValidationResult {
		if (typeof value === "string") {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "string";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("string", "special");
	}

	public readonly parenthesisPriority = 1;
}

class NumberType implements RuntypeBase {
	public readonly kind: RuntypeKind;

	public constructor() {
		this.kind = RuntypeKind.Number;
	}

	public validate(value: unknown): ValidationResult {
		if (typeof value === "number") {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "number";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("number", "special");
	}

	public readonly parenthesisPriority = 1;
}

class BigIntType implements RuntypeBase {
	public readonly kind: RuntypeKind;

	public constructor() {
		this.kind = RuntypeKind.BigInt;
	}

	public validate(value: unknown): ValidationResult {
		if (typeof value === "bigint") {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "bigint";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("bigint", "special");
	}

	public readonly parenthesisPriority = 1;
}

class SymbolType implements RuntypeBase {
	public readonly kind: RuntypeKind;

	public constructor() {
		this.kind = RuntypeKind.Symbol;
	}

	public validate(value: unknown): ValidationResult {
		if (typeof value === "symbol") {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "symbol";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("symbol", "special");
	}

	public readonly parenthesisPriority = 1;
}

class NullType implements RuntypeBase {
	public readonly kind: RuntypeKind;

	public constructor() {
		this.kind = RuntypeKind.Null;
	}

	public validate(value: unknown): ValidationResult {
		if (value === null) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "null";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("null", "special");
	}

	public readonly parenthesisPriority = 1;
}

class TrueType implements RuntypeBase {
	public readonly kind: RuntypeKind;

	public constructor() {
		this.kind = RuntypeKind.True;
	}

	public validate(value: unknown): ValidationResult {
		if (value === true) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "true";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("true", "boolean");
	}

	public readonly parenthesisPriority = 1;
}

class FalseType implements RuntypeBase {
	public readonly kind: RuntypeKind;

	public constructor() {
		this.kind = RuntypeKind.False;
	}

	public validate(value: unknown): ValidationResult {
		if (value === false) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "false";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("false", "boolean");
	}

	public readonly parenthesisPriority = 1;
}


/**
 * This is the `object` keyword
 */
class NonPrimitiveType implements RuntypeBase {
	public readonly kind: RuntypeKind;

	public constructor() {
		this.kind = RuntypeKind.NonPrimitive;
	}
	
	public validate(value: unknown): ValidationResult {
		if (typeof value === "object" && value !== null) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}
	
	public typeString(): string {
		return "object";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("object", "special");
	}

	public readonly parenthesisPriority = 1;
}

class StringLiteralType implements RuntypeBase {
	public readonly kind: RuntypeKind;
	public readonly literal: string;
	
	public constructor(literal: string) {
		this.kind = RuntypeKind.StringLiteral;
		this.literal = literal;
	}

	public validate(value: unknown): ValidationResult {
		if (value === this.literal) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return `"${this.literal}"`;
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize(this.typeString(), "string");
	}

	public readonly parenthesisPriority = 1;
}

class NumberLiteralType implements RuntypeBase {
	public readonly kind: RuntypeKind;
	public readonly literal: number;
	
	public constructor(literal: number) {
		this.kind = RuntypeKind.NumberLiteral;
		this.literal = literal;
	}

	public validate(value: unknown): ValidationResult {
		if (value === this.literal) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return this.literal.toString();
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize(this.typeString(), "number");
	}

	public readonly parenthesisPriority = 1;
}

class BigIntLiteralType implements RuntypeBase {
	public readonly kind: RuntypeKind;
	public readonly literal: bigint;
	
	public constructor(literal: bigint) {
		this.kind = RuntypeKind.BigIntLiteral;
		this.literal = literal;
	}

	public validate(value: unknown): ValidationResult {
		if (value === this.literal) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return `${this.literal}n`;
	}
	
	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize(this.typeString(), "bigint");
	}

	public readonly parenthesisPriority = 1;
}

type ObjectPropertiesReadonly = {
	readonly key: string | number | symbol;
	readonly value: RuntypeBase;
	readonly optional: boolean;
}[];

type ObjectProperties = {
	key: string | number | symbol;
	value: RuntypeBase;
	optional: boolean;
}[];

function getAllProperties(obj: unknown) {
	const result: string[] = [];
	let current = obj;
	
	do {
		for (const key of Object.getOwnPropertyNames(current)) {
			if (!result.includes(key)) {
				result.push(key);
			}
		}
	}
	while(current = Object.getPrototypeOf(current));

	return result
}

class ObjectType implements RuntypeBase {
	public readonly kind: RuntypeKind;
	public readonly properties: ObjectPropertiesReadonly;
	public readonly indexString: RuntypeBase | undefined;
	public readonly indexNumber: RuntypeBase | undefined;

	public constructor(
		properties: ObjectProperties,
		indexString?: RuntypeBase,
		indexNumber?: RuntypeBase,
	) {
		this.kind = RuntypeKind.Object;
		this.properties = properties;
		this.indexString = indexString;
		this.indexNumber = indexNumber;
	}

	public validate(value: unknown): ValidationResult {
		if (typeof value !== "object" || value === null) {
			return { valid: false, error: new InvalidValueError(value, this) };
		}

		let valid = true;
		const errors: ValidationError[] = [];
		const visitedProperties = new Set<string | number | symbol>();

		for (const { key, value: valueType, optional } of this.properties) {
			// TODO: we may want to check non-enumerable properties
			if (!(key in value)) {
				if (!optional) {
					valid = false;
					errors.push(new MissingPropertyError(key));
					// Don't short circuit after missing properties
				}
				continue;
			}
			
			visitedProperties.add(key);
			const propertyValidation = valueType.validate((value as any)[key]);
			
			if (!propertyValidation.valid) {
				valid = false;
			}
			if (propertyValidation.error !== null) {
				errors.push(new InvalidPropertyError(key, [ propertyValidation.error ]));
				break; // Short circuit after first property error
			}
		}

		if (valid && (this.indexString || this.indexNumber)) {
			// Note that we don't want to check hasOwnProperty
			for (const propertyName of getAllProperties(value)) {
				if (visitedProperties.has(propertyName)) {
					continue;
				}

				let propertyType: RuntypeBase;

				if (this.indexNumber && !Number.isNaN(Number(propertyName))) {
					propertyType = this.indexNumber;
				}
				else if (this.indexString) {
					propertyType = this.indexString;
				}
				else {
					// we don't care about unspecified properties
					continue;
				}

				const propertyValidation = propertyType.validate((value as any)[propertyName]);

				if (!propertyValidation.valid) {
					valid = false;
				}
				if (propertyValidation.error !== null) {
					errors.push(new InvalidPropertyError(propertyName, [ propertyValidation.error ]));
					break; // short circuit after first property error
				}
			}
		}

		return { valid: valid, error: errors.length === 0 ? null : new InvalidValueError(value, this, errors) };
	}

	public typeString() {
		return util.inspect(this, { colors: false, customInspect: true });
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		// We have to inject our own custom 'stylize' in a somewhat roundabout way to add '?' to optional property names and use ';' instead of ','
		
		class ProxyInspected {
			public result: string;
			constructor(result: string) {
				this.result = result;
			}
			public [util.inspect.custom]() {
				return this.result + ";";
			} 
		}

		const optionalKeys: (string | number | symbol)[] = []
		const inspectObject: { [key: string]: ProxyInspected } = {};
		
		for (const { key, optional, value } of this.properties) {
			if (optional) {
				optionalKeys.push(key);
			}
			inspectObject[key as any] = new ProxyInspected(util.inspect(value, options));
		}
		
		// @ts-ignore
		const result = util.inspect(
			inspectObject,
			{
				...options,
				colors: false, // if true ignores custom stylize
				stylize: (text: string, styleType: util.Style) => {
					// @ts-ignore
					if (styleType === "name") {
						// @ts-ignore
						return options.stylize(optionalKeys.includes(text) ? text + options.stylize("?", "undefined") : text, "name");
					}
					return text;
				}
			}
		);

		return result.replace(/;,/g, ";");
	}

	public readonly parenthesisPriority = 1;
}

// TODO: consider just comparing this by property (as an ObjectType); typescript seems to do it that way
class ArrayType implements RuntypeBase {
	public readonly kind: RuntypeKind;
	public readonly element: RuntypeBase;

	public constructor(element: RuntypeBase) {
		this.kind = RuntypeKind.Array;
		this.element = element;
	}

	public validate(value: unknown): ValidationResult {
		if (!Array.isArray(value)) {
			return { valid: false, error: new InvalidValueError(value, this) };
		}

		let valid = true;
		const errors: ValidationError[] = [];

		for (let i = 0; i < value.length; i++) {
			const elementValidation = this.element.validate(value[i]);

			if (!elementValidation.valid) {
				valid = false;
			}
			if (elementValidation.error !== null) {
				errors.push(new InvalidElementError(i, [ elementValidation.error ]));
				break; // short circuit after first element error
			}
		}

		return { valid: valid, error: errors.length === 0 ? null : new InvalidValueError(value, this, errors) };
	}

	public typeString() {
		return `${this.element.typeString()}[]`;
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return `${this.element[util.inspect.custom](depth, options)}[]`;
	}

	public readonly parenthesisPriority = 1;
}

// TODO: consider just comparing this by property (as an ObjectType); typescript seems to do it that way
class TupleType implements RuntypeBase {
	public readonly kind: RuntypeKind;
	public readonly elements: RuntypeBase[];
	
	public constructor(elements: RuntypeBase[]) {
		this.kind = RuntypeKind.Tuple;
		this.elements = elements;
	}

	public validate(value: unknown): ValidationResult {
		if (!Array.isArray(value) || value.length !== this.elements.length) {
			return { valid: false, error: new InvalidValueError(value, this) };
		}

		let valid = true;
		const errors: ValidationError[] = [];

		for (let i = 0; i < this.elements.length; i++) {
			const elementValidation = this.elements[i].validate(value[i]);

			if (!elementValidation.valid) {
				valid = false;
			}
			if (elementValidation.error !== null) {
				errors.push(new InvalidElementError(i, [ elementValidation.error ]));
				break; // short circuit after first element error
			}
		}

		return { valid, error: errors.length === 0 ? null : new InvalidValueError(value, this, errors) };
	}

	public typeString() {
		return `[ ${ this.elements.map(e => e.typeString()).join(", ") } ]`;
	}
	
	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return this.elements;
	}

	public readonly parenthesisPriority = 1;
}

class UnionType implements RuntypeBase {
	public readonly kind: RuntypeKind;
	public readonly types: RuntypeBase[];

	public constructor(types: RuntypeBase[]) {
		this.kind = RuntypeKind.Union;
		this.types = types;
	}

	public validate(value: unknown): ValidationResult {
		let found = false;
		const errors: ValidationError[] = [];

		for (const unionType of this.types) {
			const unionTypeValidation = unionType.validate(value);
			if (unionTypeValidation.valid) {
				found = true;
				break;
			}
			if (unionTypeValidation.error !== null) {
				errors.push(unionTypeValidation.error);
			}
		}

		return { valid: found, error: found ? null : new InvalidValueError(value, this, errors) }
	}

	public typeString() {
		return `( ${ this.types.map(e => e.typeString()).join(" | ") } )`;
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		const typeStrings: string[] = [];
		for (const type of this.types) {
			let typeString = type[util.inspect.custom](depth, options);
			// while it is not strictly necessary, we want to parenthesize both intersections and unions
			if (type.parenthesisPriority >= 2) {
				typeString = `(${typeString})`;
			}
			typeStrings.push(String(typeString));
		}
		return typeStrings.join(" | ");
	}

	public readonly parenthesisPriority = 3;
}

class IntersectionType implements RuntypeBase {
	public readonly kind: RuntypeKind;
	public readonly types: RuntypeBase[];

	public constructor(types: RuntypeBase[]) {
		this.kind = RuntypeKind.Intersection;
		this.types = types;
	}

	public validate(value: unknown): ValidationResult {
		let valid = true;
		const errors: ValidationError[] = [];

		for (const intersectionType of this.types) {
			const intersectionTypeValidation = intersectionType.validate(value);
			if (!intersectionTypeValidation.valid) {
				valid = false;
			}
			if (intersectionTypeValidation.error !== null) {
				errors.push(intersectionTypeValidation.error);
				break; // short circuit after first error
			}
		}

		return { valid: valid, error: errors.length === 0 ? null : new InvalidValueError(value, this, errors) };
	}

	public typeString() {
		return `( ${ this.types.map(e => e.typeString()).join(" & ") } )`;
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		const typeStrings: string[] = [];
		for (const type of this.types) {
			let typeString = type[util.inspect.custom](depth, options);
			// while it is not strictly necessary, we want to parenthesize both intersections and unions
			if (type.parenthesisPriority >= 2) {
				typeString = `(${typeString})`;
			}
			typeStrings.push(String(typeString));
		}
		return typeStrings.join(" & ");
	}

	public readonly parenthesisPriority = 2;
}

// Validation

export interface ValidationResult {
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

class InvalidValueError extends ValidationError {
	readonly expected: RuntypeBase;
	readonly actual: unknown;
	
	public constructor(actual: unknown, expected: RuntypeBase, children: ValidationError[] = []) {
		super(children);
		this.expected = expected;
		this.actual = actual;
	}

	public toStringShort() {
		return `Invalid value: ${JSON.stringify(this.actual)}\nExpected: ${this.expected.typeString()}`;
	}
}

class MissingPropertyError extends ValidationError {
	readonly propertyKey: string | number | symbol;

	public constructor(key: string | number | symbol) {
		super();
		this.propertyKey = key;
	}

	public toStringShort() {
		return `Missing property '${String(this.propertyKey)}'`;
	}
}

class InvalidPropertyError extends ValidationError {
	readonly propertyKey: string | number | symbol;

	public constructor(key: string | number | symbol, children: ValidationError[] = []) {
		super(children);
		this.propertyKey = key;
	}

	public toStringShort() {
		return `Property '${String(this.propertyKey)}' failed validation`;
	}
}

class InvalidElementError extends ValidationError {
	readonly elementIndex: number;

	public constructor(elementIndex: number, children: ValidationError[] = []) {
		super(children);
		this.elementIndex = elementIndex;
	}

	public toStringShort() {
		return `Element at index ${this.elementIndex} failed validation`;
	}
}

class InvalidPropertyIndexError extends ValidationError {
	readonly propertyName: string;
	readonly expected: RuntypeBase;

	public constructor(propertyName: string, expected: RuntypeBase, children: ValidationError[]) {
		super(children);
		this.propertyName = propertyName;
		this.expected = expected;
	}

	public toStringShort() {
		return `Invalid property index ${this.propertyName}\nExpected ${this.expected.typeString()}`;
	}
}

// Exported creation methods

export function createNeverType(): Runtype<never> {
	return new NeverType() as any;
}

export function createUnknownType(): Runtype<unknown> {
	return new UnknownType() as any;
}

export function createAnyType(): Runtype<any> {
	return new AnyType() as any;
}

export function createVoidType(): Runtype<void> {
	return new VoidType() as any;
}

export function createUndefinedType(): Runtype<undefined> {
	return new UndefinedType() as any;
}

export function createStringType(): Runtype<string> {
	return new StringType() as any;
}

export function createNumberType(): Runtype<number> {
	return new NumberType() as any;
}

export function createBigIntType(): Runtype<bigint> {
	return new BigIntType() as any;
}

export function createSymbolType(): Runtype<symbol> {
	return new SymbolType() as any;
}

export function createNullType(): Runtype<null> {
	return new NullType() as any;
}

export function createTrueType(): Runtype<true> {
	return new TrueType() as any;
}

export function createFalseType(): Runtype<false> {
	return new FalseType() as any;
}

export function createBooleanType(): Runtype<boolean> {
	return createUnionType([ createTrueType(), createFalseType() ]);
}

export function createNonPrimitiveType(): Runtype<object> {
	return new NonPrimitiveType() as any;
}

export function createStringLiteralType<T extends string>(value: T): Runtype<T> {
	return new StringLiteralType(value) as any;
}

export function createNumberLiteralType<T extends number>(value: T): Runtype<T> {
	return new NumberLiteralType(value) as any;
}

export function createBigIntLiteralType<T extends bigint>(value: T): Runtype<T> {
	return new BigIntLiteralType(value) as any;
}

export function createObjectType<T>(
	properties: ObjectProperties,
	indexString?: RuntypeBase,
	indexNumber?: RuntypeBase,
): Runtype<T> {
	return new ObjectType(properties, indexString, indexNumber) as any;
}

export function createArrayType<T extends unknown[]>(element: RuntypeBase): Runtype<T> {
	return new ArrayType(element) as any;
}

export function createTupleType<T extends unknown[]>(elements: RuntypeBase[]): Runtype<T> {
	return new TupleType(elements) as any;
}

export function createUnionType<T>(types: RuntypeBase[]): Runtype<T> {
	return new UnionType(types) as any;
}

export function createIntersectionType<T>(types: RuntypeBase[]): Runtype<T> {
	return new IntersectionType(types) as any;
}

export function getBoxedPrimitive(type: RuntypeBase) {
	if (type.kind === RuntypeKind.String || type.kind === RuntypeKind.StringLiteral) {
		return __global_runtypes.String;
	}
	if (type.kind === RuntypeKind.Number || type.kind === RuntypeKind.NumberLiteral) {
		return __global_runtypes.Number;
	}
	if (type.kind === RuntypeKind.BigInt || type.kind === RuntypeKind.BigIntLiteral) {
		return __global_runtypes.BigInteger;
	}
	if (type.kind === RuntypeKind.Symbol /** TODO: unique symbol literals */) {
		return __global_runtypes.Symbol;
	}
	if (type.kind === RuntypeKind.True || type.kind === RuntypeKind.False) {
		return __global_runtypes.Boolean;
	}
	return undefined;
}

/*---------*\
| KeyOfType |
\*---------*/

function getObjectKeyTypes(type: ObjectType) {
	// TODO: add unique symbols
	
	if (type.indexString) {
		return [ createStringType(), createNumberType() ];
	}

	const types: RuntypeBase[] = [];
	for (const property of type.properties) {
		if (typeof property.key === "string") {
			types.push(createStringLiteralType(property.key));
		}
		else if (typeof property.key === "number") {
			types.push(createNumberLiteralType(property.key));
		}
		else {
			// TODO: unique symbols
			throw Error("unique symbols not implemented");
		}
	}
	if (type.indexNumber) {
		types.push(createNumberType());
	}

	return types;
}

export function createKeyOfType<T>(type: Runtype<T>): Runtype<keyof T> {
	if (
		type.kind === RuntypeKind.Unknown ||
		type.kind === RuntypeKind.Void ||
		type.kind === RuntypeKind.Undefined ||
		type.kind === RuntypeKind.Null ||
		type.kind === RuntypeKind.NonPrimitive
	) {
		return createNeverType() as any;
	}

	if (
		type.kind === RuntypeKind.Never ||
		type.kind === RuntypeKind.Any
	) {
		return createUnionType([ createStringType(), createNumberType(), createSymbolType() ]) as any;
	}

	// For keyof types we defer primitives to their boxed versions
	const boxed = getBoxedPrimitive(type);
	if (boxed) {
		type = boxed as any;
	}

	if (type.kind === RuntypeKind.Object) {
		return createUnionType(getObjectKeyTypes(type as any)) as any;
	}

	if (type.kind === RuntypeKind.Array) {
		return createKeyOfType(__global_generic_widened_runtypes.Array) as any;
	}

	if (type.kind === RuntypeKind.Tuple) {
		const keyTypes = getObjectKeyTypes(__global_generic_widened_runtypes.Array as any);
		for (let i = 0; i < (type as any as TupleType).elements.length; i++) {
			keyTypes.push(createStringLiteralType(i.toString()));
		}
		return createUnionType(keyTypes);
	}

	if (type.kind === RuntypeKind.Union) {
		// keys which are present in types
		return createIntersectionType((type as any as UnionType).types.map(createKeyOfType));
	}

	if (type.kind === RuntypeKind.Intersection) {
		// keys which are present in any
		return createUnionType((type as any as UnionType).types.map(createKeyOfType));
	}

	throw new Error(`Unrecognized runtype; kind is ${type.kind}`);
}

/*----------*\
| AccessType |
\*----------*/

function isValidAccessKeyType(keyType: RuntypeBase) {
	if (
		keyType.kind === RuntypeKind.Never ||
		keyType.kind === RuntypeKind.String ||
		keyType.kind === RuntypeKind.Number ||
		keyType.kind === RuntypeKind.StringLiteral ||
		keyType.kind === RuntypeKind.NumberLiteral
		// TODO: symbol
	) {
		return true;
	}

	if (keyType.kind === RuntypeKind.Union) {
		for (const unionType of (keyType as UnionType).types) {
			if (!isValidAccessKeyType(unionType)) {
				return false;
			}
		}
		return true;
	}

	if (keyType.kind === RuntypeKind.Intersection) {
		for (const intersectionType of (keyType as IntersectionType).types) {
			if (isValidAccessKeyType(intersectionType)) {
				return true;
			}
		}
		return false;
	}

	return false;
}

function createAccessTypeWithLiteralKey(type: RuntypeBase, key: string | number): RuntypeBase {
	// TODO: unique symbols
	if (type.kind === RuntypeKind.Object) {
		for (const { key: propertyKey, value } of (type as ObjectType).properties) {
			// TODO: symbols
			if (typeof key === "symbol") {
				continue;
			}
			if (key.toString() === propertyKey.toString()) {
				return value;
			}
		}

		if (typeof key === "number" && (type as ObjectType).indexNumber) {
			return (type as ObjectType).indexNumber!;
		}
		if ((type as ObjectType).indexString) {
			return (type as ObjectType).indexString!;
		}

		// TODO: error type
		throw new Error(`Invalid key for access type: ${key}`);
	}

	if (type.kind === RuntypeKind.Union) {
		return createUnionType((type as UnionType).types.map(t => createAccessTypeWithLiteralKey(t, key)));
	}
	if (type.kind === RuntypeKind.Intersection) {
		return createIntersectionType((type as IntersectionType).types.map(t => createAccessTypeWithLiteralKey(t, key)));
	}

	throw new Error(`Unrecognized access type; kind is ${type.kind}`);
}

function createAccessTypeWithStringKey(type: RuntypeBase): RuntypeBase {
	if (type.kind === RuntypeKind.Object) {
		if ((type as ObjectType).indexString) {
			return (type as ObjectType).indexString!;
		}
		throw new Error("Access type has no string index signature");
	}

	if (type.kind === RuntypeKind.Union) {
		return createUnionType((type as UnionType).types.map(createAccessTypeWithStringKey));
	}
	if (type.kind === RuntypeKind.Intersection) {
		return createIntersectionType((type as IntersectionType).types.map(createAccessTypeWithStringKey));
	}

	throw new Error(`Unrecognized access type; kind is ${type.kind}`);
}

function createAccessTypeWithNumberKey(type: RuntypeBase): RuntypeBase {
	if (type.kind === RuntypeKind.Object) {
		if ((type as ObjectType).indexNumber) {
			return (type as ObjectType).indexNumber!;
		}
		if ((type as ObjectType).indexString) {
			return (type as ObjectType).indexString!;
		}
		throw new Error("Access type has no string or number index signature");
	}

	if (type.kind === RuntypeKind.Union) {
		return createUnionType((type as UnionType).types.map(createAccessTypeWithStringKey));
	}
	if (type.kind === RuntypeKind.Intersection) {
		return createIntersectionType((type as IntersectionType).types.map(createAccessTypeWithStringKey));
	}

	throw new Error(`Unrecognized access type; kind is ${type.kind}`);

}

function createAccessTypeHelper(type: RuntypeBase, keyType: RuntypeBase): RuntypeBase {
	if (keyType.kind === RuntypeKind.Never) {
		return createNeverType();
	}

	if (type.kind === RuntypeKind.Never) {
		return createNeverType();
	}
	if (type.kind === RuntypeKind.Any) {
		return createAnyType();
	}
	if (
		type.kind === RuntypeKind.Undefined ||
		type.kind === RuntypeKind.Null ||
		type.kind === RuntypeKind.NonPrimitive ||
		type.kind === RuntypeKind.Void ||
		type.kind === RuntypeKind.Unknown
	) {
		throw new Error("Invalid key for access type");
	}

	if (
		keyType.kind === RuntypeKind.StringLiteral ||
		keyType.kind === RuntypeKind.NumberLiteral
	) {
		return createAccessTypeWithLiteralKey(type, (keyType as StringLiteralType | NumberLiteralType).literal);
	}
	if (keyType.kind === RuntypeKind.String) {
		return createAccessTypeWithStringKey(type);
	}
	if (keyType.kind === RuntypeKind.Number) {
		return createAccessTypeWithNumberKey(type);
	}

	if (keyType.kind === RuntypeKind.Union) {
		return createUnionType((keyType as UnionType).types.map(t => createAccessTypeHelper(type, t)));
	}
	if (keyType.kind === RuntypeKind.Intersection) {
		return createIntersectionType((keyType as IntersectionType).types.map(t => createAccessTypeHelper(type, t)));
	}

	throw new Error("Invalid access key type");
}

export function createAccessType<T, K extends keyof T>(type: Runtype<T>, keyType: Runtype<K>): Runtype<T[K]> {
	if (!isValidAccessKeyType(keyType)) {
		// TODO: error type;
		throw new Error("Invalid key type for access type");
	}
	// For access types we defer primitives to their boxed versions
	const boxed = getBoxedPrimitive(type);
	if (boxed) {
		type = boxed as any;
	}
	return createAccessTypeHelper(type, keyType) as any;
}
