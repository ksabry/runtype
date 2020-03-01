import util, { inspect } from "util";

import { RuntypeKind } from "./runtype-kind";
import { __runtime } from "./injection";
import { __global_runtypes, __global_generic_widened_runtypes } from "./index";

// TODO:

// We probably cannot naively access properties on objects passed for validation the way we are.
//		If they are defined by a getter which mutates then we at least cannot access it completely naively
//		It honestly still probably makes the most sense for the default behavior to be that every property is accessed _once_
//		Of course this could also be configurable

// better strings
// 		index signatures, call signatures, construct signatures
//		special case for array, readonly array, tuple, function
//		enums

// unique symbols
//		difficult or impossible to do perfectly
//		consider the case where an external javascript library (or even another language) is provided a typescript declaration file asserting a provided value is a unique symbol
//		We can't really inject our own information into the original library in general
//		This means that at some point we simply have to trust the declared types, there is no way to know if what the library is returning is accurate to its own types purely at runtime
//		We might be able to at least make sure all symbols we encounter of a single unique type are equal to each other, this would also implicitely include the definition of
//		any unique type that is created in user typescript code. Though this is still not _perfect_, it might cover enough cases and be be clear enough behavior.
//		This strategy would also have significant performance implications, depending on how it is implemented, and this is another very serious problem/consideration.

// Function
//		We cannot do much validation for a function at runtime. We can neither verify the types of the parameters nor the return type directly.
//		We may be able to do the very minor step of checking the parameter count, but this may not be reliable (consider "arguments")
//		We _could_ potentially provide the ability to somehow mark a function to do validation _when it's called_.
//		This would simply inject code at the beginning of the function body checking the arguments, and before any return checking the type.
//		The implementation of this would require some serious thought.

// Mapped

// Conditional + InferType
//		This cannot be done only with the ability to check if a value satisfies a type, we need to compare types for subtype/supertype relationships.
//		The complexity of this feature should not be underestimated.
//		That said, we might be able to iteratively support easier subsets of this feature, string literals -> string for example.

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
	readonly parent: RuntypeBase | undefined;
	validate(value: unknown, context?: ValidationContext): ValidationResult;
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
	public readonly parent: RuntypeBase | undefined;

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
	public readonly parent: RuntypeBase | undefined;

	public readonly listId: number;
	public readonly index: number;

	public constructor(listId: number, index: number) {
		this.kind = RuntypeKind.TypeParameter;
		this.listId = listId;
		this.index = index;
	}

	public validate(): ValidationResult {
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
	public readonly parent: RuntypeBase | undefined;

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
	public readonly parent: RuntypeBase | undefined;

	public constructor() {
		this.kind = RuntypeKind.Unknown;
	}

	public validate(): ValidationResult {
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
	public readonly parent: RuntypeBase | undefined;

	public constructor() {
		this.kind = RuntypeKind.Any;
	}

	// unsound
	public validate(): ValidationResult {
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
	public readonly parent: RuntypeBase | undefined;

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
	public readonly parent: RuntypeBase | undefined;

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
	public readonly parent: RuntypeBase | undefined;

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
	public readonly parent: RuntypeBase | undefined;

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
	public readonly parent: RuntypeBase | undefined;

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
	public readonly parent: RuntypeBase | undefined;

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

/**
 * A well known symbol is one that lives statically on `Symbol`, e.g. `Symbol.iterator`.
 * Typescript treats these differently than unique symbols.
 * For our purposes we might eventually be able to unify this with unique symbols,
 * but those haven't been implemented yet and have their own concerns.
 */
class WellKnownSymbolType implements RuntypeBase {
	public readonly kind: RuntypeKind;
	public readonly parent: RuntypeBase | undefined;
	public readonly name: string;
	public readonly symbol: symbol;

	public constructor(name: string) {
		this.kind = RuntypeKind.Symbol;
		this.name = name;
		this.symbol = (Symbol as any)[name];
	}

	public validate(value: unknown): ValidationResult {
		if (value === this.symbol) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return `Symbol.${this.name}`;
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize(this.typeString(), "special");
	}

	public readonly parenthesisPriority = 1;
}

class NullType implements RuntypeBase {
	public readonly kind: RuntypeKind;
	public readonly parent: RuntypeBase | undefined;

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
	public readonly parent: RuntypeBase | undefined;

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
	public readonly parent: RuntypeBase | undefined;

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
	public readonly parent: RuntypeBase | undefined;

	public constructor() {
		this.kind = RuntypeKind.NonPrimitive;
	}
	
	public validate(value: unknown): ValidationResult {
		if ((typeof value === "object" || typeof value === "function") && value !== null) {
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
	public readonly parent: RuntypeBase | undefined;
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
	public readonly parent: RuntypeBase | undefined;
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
	public readonly parent: RuntypeBase | undefined;
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

interface ObjectPropertyReadonly {
	readonly key: string;
	readonly keyKind: RuntypeKind.String | RuntypeKind.Number | RuntypeKind.Symbol;
	readonly value: RuntypeBase;
	readonly optional: boolean;
};

interface ObjectProperty {
	// escaped name, always string
	key: string;
	keyKind: RuntypeKind.String | RuntypeKind.Number | RuntypeKind.Symbol;
	value: RuntypeBase;
	optional: boolean;
};

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

function unescapePropertyKey(key: string, keyKind: RuntypeKind.String | RuntypeKind.Number | RuntypeKind.Symbol) {
	if (keyKind === RuntypeKind.Symbol) {
		const symbolName = key.slice(3);
		if (symbolName in Symbol) {
			// from a WellKnownSymbolExpression
			return (Symbol as any)[symbolName] as symbol;
		}
		throw new Error(`Unsupported unique symbol property: ${symbolName}`);
	}
	else if (keyKind === RuntypeKind.Number) {
		return Number(key);
	}
	else {
		if (key.startsWith("___")) {
			return key.slice(1);
		}
		else {
			return key;
		}
	}
}

class ObjectType implements RuntypeBase {
	public readonly kind: RuntypeKind;
	public readonly parent: RuntypeBase | undefined;
	public readonly properties: ObjectPropertyReadonly[];
	public readonly indexString: RuntypeBase | undefined;
	public readonly indexNumber: RuntypeBase | undefined;

	public constructor(
		properties: ObjectProperty[],
		indexString?: RuntypeBase,
		indexNumber?: RuntypeBase,
	) {
		this.kind = RuntypeKind.Object;
		this.properties = properties;
		this.indexString = indexString;
		this.indexNumber = indexNumber;

		for (const property of this.properties) {
			(property.value as any).parent = this;
		}
		if (this.indexString) {
			(this.indexString as any).parent = this;
		}
		if (this.indexNumber) {
			(this.indexNumber as any).parent = this;
		}
	}

	public validate(value: unknown, context?: ValidationContext): ValidationResult {
		if ((typeof value !== "object" && typeof value !== "function") || value === null) {
			return { valid: false, error: new InvalidValueError(value, this) };
		}

		if (!context) {
			context = {
				resultCache: new ValidationResultCache(),
				visitedSet: new ValidationVisitedSet(),
			};
		}

		const cached = context.resultCache.get(this, value);
		if (cached) {
			return cached;
		}
		if (context.visitedSet.has(this, value)) {
			// If we have already visited this type with this value, we are in a recursive check.
			return { valid: true, error: null };
		}
		context.visitedSet.add(this, value);

		let valid = true;
		const errors: ValidationError[] = [];
		const visitedProperties = new Set<string>();

		// TODO: consider checking for missing properties in a seperate loop to find all of them regardless of if an InvalidPropertyError occurs

		for (const { key, keyKind, value: valueType, optional } of this.properties) {
			const unescaped = unescapePropertyKey(key, keyKind);
			if (!(unescaped in value)) {
				if (!optional) {
					valid = false;
					errors.push(new MissingPropertyError(key));
					// Don't short circuit after missing properties
				}
				continue;
			}

			visitedProperties.add(key);
			const propertyValidation = valueType.validate((value as any)[unescaped], context);
			
			if (!propertyValidation.valid) {
				valid = false;
			}
			if (propertyValidation.error !== null) {
				errors.push(new InvalidPropertyError(key, [ propertyValidation.error ]));
				break; // Short circuit after first property error
			}
		}

		if (valid && (this.indexString || this.indexNumber)) {
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

				const propertyValidation = propertyType.validate((value as any)[propertyName], context);

				if (!propertyValidation.valid) {
					valid = false;
				}
				if (propertyValidation.error !== null) {
					errors.push(new InvalidPropertyError(propertyName, [ propertyValidation.error ]));
					break; // short circuit after first property error
				}
			}
		}

		const result = { valid: valid, error: errors.length === 0 ? null : new InvalidValueError(value, this, errors) };
		context.resultCache.set(this, value, result);
		
		return result;
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
		
		for (const { key, keyKind, value, optional } of this.properties) {
			// TODO: pass through keys differently for different keyKinds
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

class UnionType implements RuntypeBase {
	public readonly kind: RuntypeKind;
	public readonly parent: RuntypeBase | undefined;
	public readonly types: RuntypeBase[];

	public constructor(types: RuntypeBase[]) {
		this.kind = RuntypeKind.Union;
		this.types = types;

		for (const type of this.types) {
			(type as any).parent = this;
		}
	}

	public validate(value: unknown, context?: ValidationContext): ValidationResult {
		let found = false;
		const errors: ValidationError[] = [];

		for (const unionType of this.types) {
			const unionTypeValidation = unionType.validate(value, context);
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
	public readonly parent: RuntypeBase | undefined;
	public readonly types: RuntypeBase[];

	public constructor(types: RuntypeBase[]) {
		this.kind = RuntypeKind.Intersection;
		this.types = types;

		for (const type of this.types) {
			(type as any).parent = this;
		}
	}

	public validate(value: unknown, context?: ValidationContext): ValidationResult {
		let valid = true;
		const errors: ValidationError[] = [];

		for (const intersectionType of this.types) {
			const intersectionTypeValidation = intersectionType.validate(value, context);
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

/**
 * If a type refers to itself, it is represented by this type
 */
class ReferenceType implements RuntypeBase {
	public readonly kind: RuntypeKind;
	public readonly parent: RuntypeBase | undefined;
	public readonly referenceId: number;

	public constructor(referenceId: number) {
		this.kind = RuntypeKind.Reference;
		this.referenceId = referenceId;
	}

	public validate(value: unknown, context?: ValidationContext): ValidationResult {
		const resolved = typeCache.get(this.referenceId)!;
		return resolved.validate(value, context);
	}

	public typeString(): string {
		// Not deferring this is a simple solution to self-referencing types
		return `<Reference ${this.referenceId}>`;
	}
	
	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized): unknown {
		return options.stylize(this.typeString(), "special");
	}

	public parenthesisPriority = 1;
}

// Validation

class ValidationResultCache {
	private cache = new WeakMap<RuntypeBase, WeakMap<object, ValidationResult>>();
	
	public get(type: RuntypeBase, value: object) {
		let valueMap = this.cache.get(type);
		return valueMap && valueMap.get(value);
	}

	public set(type: RuntypeBase, value: object, result: ValidationResult) {
		let valueMap = this.cache.get(type);
		if (!valueMap) {
			valueMap = new WeakMap<object, ValidationResult>();
			this.cache.set(type, valueMap);
		}
		valueMap.set(value, result);
	}
}

class ValidationVisitedSet {
	private visited = new WeakMap<RuntypeBase, WeakSet<object>>();

	public has(type: RuntypeBase, value: object) {
		let valueSet = this.visited.get(type);
		return !!(valueSet && valueSet.has(value));
	}

	public add(type: RuntypeBase, value: object) {
		let valueSet = this.visited.get(type);
		if (!valueSet) {
			valueSet = new WeakSet<object>();
			this.visited.set(type, valueSet);
		}
		valueSet.add(value);
	}
}

interface ValidationContext {
	resultCache: ValidationResultCache;
	visitedSet: ValidationVisitedSet;
}

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
		return `Invalid value: ${inspect(this.actual, { colors: true })}\nExpected: ${inspect(this.expected, { colors: true })}`;
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

// TODO: cache all types which have no substructure, and possibly also some literals and stuff

const typeCache = new Map<number, RuntypeBase>();

export const reservedIdNever = -1;
export const reservedIdUnknown = -2;
export const reservedIdAny = -3;
export const reservedIdVoid = -4;
export const reservedIdUndefined = -5;
export const reservedIdString = -6;
export const reservedIdNumber = -7;
export const reservedIdBigInt = -8;
export const reservedIdSymbol = -9;
export const reservedIdNull = -10;
export const reservedIdTrue = -11;
export const reservedIdFalse = -12;
export const reservedIdNonPrimitive = -13;
export const reservedIdBoolean = -14;

typeCache.set(reservedIdNever, new NeverType());
typeCache.set(reservedIdUnknown, new UnknownType());
typeCache.set(reservedIdAny, new AnyType());
typeCache.set(reservedIdVoid, new VoidType());
typeCache.set(reservedIdUndefined, new UndefinedType());
typeCache.set(reservedIdString, new StringType());
typeCache.set(reservedIdNumber, new NumberType());
typeCache.set(reservedIdBigInt, new BigIntType());
typeCache.set(reservedIdSymbol, new SymbolType());
typeCache.set(reservedIdNull, new NullType());
typeCache.set(reservedIdTrue, new TrueType());
typeCache.set(reservedIdFalse, new FalseType());
typeCache.set(reservedIdNonPrimitive, new NonPrimitiveType());
typeCache.set(reservedIdBoolean, new UnionType([ typeCache.get(reservedIdFalse)!, typeCache.get(reservedIdTrue)! ]));

export function createNeverType(): RuntypeBase {
	return typeCache.get(reservedIdNever)!;
}

export function createUnknownType(): RuntypeBase {
	return typeCache.get(reservedIdUnknown)!;
}

export function createAnyType(): RuntypeBase {
	return typeCache.get(reservedIdAny)!;
}

export function createVoidType(): RuntypeBase {
	return typeCache.get(reservedIdVoid)!;
}

export function createUndefinedType(): RuntypeBase {
	return typeCache.get(reservedIdUndefined)!;
}

export function createStringType(): RuntypeBase {
	return typeCache.get(reservedIdString)!;
}

export function createNumberType(): RuntypeBase {
	return typeCache.get(reservedIdNumber)!;
}

export function createBigIntType(): RuntypeBase {
	return typeCache.get(reservedIdBigInt)!;
}

export function createSymbolType(): RuntypeBase {
	return typeCache.get(reservedIdSymbol)!;
}

export function createNullType(): RuntypeBase {
	return typeCache.get(reservedIdNull)!;
}

export function createTrueType(): RuntypeBase {
	return typeCache.get(reservedIdTrue)!;
}

export function createFalseType(): RuntypeBase {
	return typeCache.get(reservedIdFalse)!;
}

export function createBooleanType(): RuntypeBase {
	return typeCache.get(reservedIdBoolean)!;
}

export function createNonPrimitiveType(): RuntypeBase {
	return typeCache.get(reservedIdNonPrimitive)!;
}

export function createStringLiteralType(value: string, referenceId?: number): RuntypeBase {
	const cached = referenceId && typeCache.get(referenceId);
	if (cached) {
		return cached as any;
	}
	const result = new StringLiteralType(value);
	if (referenceId) {
		typeCache.set(referenceId, result);
	}
	return result;
}

export function createNumberLiteralType(value: number, referenceId?: number): RuntypeBase {
	const cached = referenceId && typeCache.get(referenceId);
	if (cached) {
		return cached as any;
	}
	const result = new NumberLiteralType(value);
	if (referenceId) {
		typeCache.set(referenceId, result);
	}
	return result;
}

export function createBigIntLiteralType(value: bigint, referenceId?: number): RuntypeBase {
	const cached = referenceId && typeCache.get(referenceId);
	if (cached) {
		return cached as any;
	}
	const result = new BigIntLiteralType(value);
	if (referenceId) {
		typeCache.set(referenceId, result);
	}
	return result;
}

export function createWellKnownSymbolType(name: string, referenceId?: number): RuntypeBase {
	const cached = referenceId && typeCache.get(referenceId);
	if (cached) {
		return cached as any;
	}
	const result = new WellKnownSymbolType(name);
	if (referenceId) {
		typeCache.set(referenceId, result);
	}
	return result;
}

export function createObjectType(
	properties: ObjectProperty[],
	indexString?: RuntypeBase,
	indexNumber?: RuntypeBase,
	referenceId?: number,
): RuntypeBase {
	const cached = referenceId && typeCache.get(referenceId);
	if (cached) {
		return cached as any;
	}
	const result = new ObjectType(properties, indexString, indexNumber);
	if (referenceId) {
		typeCache.set(referenceId, result);
	}
	return result;
}

export function createUnionType(types: RuntypeBase[], referenceId?: number): RuntypeBase {
	const cached = referenceId && typeCache.get(referenceId);
	if (cached) {
		return cached as any;
	}
	const result = new UnionType(types);
	if (referenceId) {
		typeCache.set(referenceId, result);
	}
	return result;
}

export function createIntersectionType(types: RuntypeBase[], referenceId?: number): RuntypeBase {
	const cached = referenceId && typeCache.get(referenceId);
	if (cached) {
		return cached as any;
	}
	const result = new IntersectionType(types);
	if (referenceId) {
		typeCache.set(referenceId, result);
	}
	return result;
}

export function createReferenceType(referenceId: number): RuntypeBase {
	return new ReferenceType(referenceId);
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

export function createKeyOfType(type: RuntypeBase): RuntypeBase {
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

	if (type.kind === RuntypeKind.Union) {
		return createIntersectionType((type as any as UnionType).types.map(createKeyOfType));
	}

	if (type.kind === RuntypeKind.Intersection) {
		return createUnionType((type as any as UnionType).types.map(createKeyOfType));
	}

	throw new Error(`Unrecognized runtype in createKeyOfType; kind is ${type.kind}`);
}

function getObjectKeyTypes(type: ObjectType) {
	if (type.indexString) {
		return [ createStringType(), createNumberType() ];
	}

	const types: RuntypeBase[] = [];
	
	if (type.indexNumber) {
		types.push(createNumberType());
	}
	
	for (const property of type.properties) {
		// we don't push symbols, and don't push number literals if we have a number index
		if (
			property.keyKind === RuntypeKind.Symbol ||
			type.indexNumber && property.keyKind === RuntypeKind.Number
		) {
			continue;
		}
	
		if (property.keyKind === RuntypeKind.Number) {
			types.push(createNumberLiteralType(Number(property.key)));
		}
		else {
			const unescaped = property.key.startsWith("___") ? property.key.slice(1) : property.key;
			types.push(createStringLiteralType(unescaped));
		}
	}
	
	return types;
}

/*----------*\
| AccessType |
\*----------*/

// Needs to be redone

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

export function createAccessType(type: RuntypeBase, keyType: RuntypeBase): RuntypeBase {
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
