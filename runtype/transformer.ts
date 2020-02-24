import ts from "typescript";
import path from "path";

// Possible generic solution (sophisticated)
//  pass type information at runtime through function invocations which require it
//  monkey patch on a __type_params_stack array and a __next_type_params on each function object
//  change the function invocations: f<T>(...args) -> (f.__next_type_params = (runtime info of T), f(...args))
//    Note the comma operator
//  change the function bodies: { ...statements } -> { f.__type_params_stack.push(f.__next_type_params) ...statements f.__type_params_stack.pop() }
//  within the function body, the current type parameters can be confidently known to be in the top element of __type_params_stack

// Probably a lot of weird js breaking cases
//  You may have to pop before any yields and repush after
//  ofc similar consideration for await
//  great care needs to be taken in how the runtime type objects themselves are accessed and used
//  set to a default __next_type_params after using them so if the function is called without it being set (such as from pure js) it still behaves reasonably

function flagStrings(flags: number, enumClass: any) {
	for (const key in enumClass) {
		if (flags === enumClass[key]) {
			return [ key ];
		}
	}

	const result: string[] = [];
	for (const key in enumClass) {
		if (flags & enumClass[key]) {
			result.push(key);
			flags &= ~enumClass[key];
		}
	}
	return [ ...result, flags ];
}

function runtypeTransformer(checker: ts.TypeChecker) {
	return function (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
		let currentListId = 0;
		const typeParameterData = new WeakMap<ts.TypeParameterDeclaration, { listId: number, index: number }>();

		function isFileInRuntype(sourceFile: ts.SourceFile) {
			return path.relative(path.dirname(sourceFile.fileName), __dirname) === "";
		}

		function addRuntypeInjection(sourceFile: ts.SourceFile) {
			let requirePath = path.relative(path.dirname(sourceFile.fileName), __dirname);

			const helper = {
				name: "runtype:runtype",
				scoped: false,
				priority: 1,
				text: `var __runtype = require("${requirePath}");`,
			};
			context.requestEmitHelper(helper);
		}

		function createRuntypeModuleReference(): ts.Expression {
			return ts.setEmitFlags(ts.createIdentifier("__runtype"), ts.EmitFlags.HelperName | ts.EmitFlags.AdviseOnEmitNode);
		}

		function createRuntypeRuntimeReference(): ts.Expression {
			return ts.createPropertyAccess(
				createRuntypeModuleReference(),
				"__runtime",
			);
		}
		
		function isRuntypeFunctionBody(body: ts.Block) {
			return (
				body.getSourceFile().fileName === path.resolve(__dirname, "./index.ts") &&
				ts.isFunctionDeclaration(body.parent) &&
				body.parent.name && body.parent.name.text === "runtype"
			);
		}

		function resolveTypeParameter(type: ts.TypeParameter): ts.Expression {
			const parameterDeclaration = type.getSymbol()!.getDeclarations()![0] as ts.TypeParameterDeclaration;
			const data = typeParameterData.get(parameterDeclaration)!;
			
			return ts.createElementAccess(
				ts.createIdentifier(`__runtype_type_params_${data.listId}`),
				data.index,
			);
		}

		function runtypeCreator(name: string, args: readonly ts.Expression[] = []) {
			return ts.createCall(
				ts.createPropertyAccess(
					createRuntypeModuleReference(),
					name,
				),
				undefined,
				args
			);
		}

		function createRuntypeNever() {
			return runtypeCreator("createNeverType");
		}

		function createRuntypeUnknown() {
			return runtypeCreator("createUnknownType");
		}

		function createRuntypeAny() {
			return runtypeCreator("createAnyType");
		}
		
		function createRuntypeVoid() {
			return runtypeCreator("createVoidType");
		}

		function createRuntypeUndefined() {
			return runtypeCreator("createUndefinedType");
		}

		function createRuntypeNull() {
			return runtypeCreator("createNullType");
		}

		function createRuntypeNonPrimitive() {
			return runtypeCreator("createNonPrimitiveType");
		}

		function createRuntypeString() {
			return runtypeCreator("createStringType");
		}
		
		function createRuntypeNumber() {
			return runtypeCreator("createNumberType");
		}
		
		function createRuntypeSymbol() {
			return runtypeCreator("createSymbolType");
		}

		function createRuntypeBigInt() {
			return runtypeCreator("createBigIntType");
		}

		function createRuntypeBoolean() {
			return runtypeCreator("createBooleanType");
		}

		function createRuntypeFalse() {
			return runtypeCreator("createFalseType");
		}

		function createRuntypeTrue() {
			return runtypeCreator("createTrueType");
		}

		function createRuntypeStringLiteral(value: string) {
			return runtypeCreator(
				"createStringLiteralType",
				[ ts.createStringLiteral(value) ],
			);
		}

		function createRuntypeNumberLiteral(value: number) {
			return runtypeCreator(
				"createNumberLiteralType",
				[ ts.createNumericLiteral(value.toString()) ],
			);
		}

		function createRuntypeBigIntLiteral(value: bigint | ts.PseudoBigInt) {
			return runtypeCreator(
				"createBigIntLiteralType",
				[ ts.createBigIntLiteral(value.toString()) ],
			);
		}

		function createRuntypeUnion(types: ts.Type[]) {
			return runtypeCreator(
				"createUnionType",
				[ ts.createArrayLiteral(types.map(createRuntypeExpressionFromType)) ],
			)
		}

		function createRuntypeIntersection(types: ts.Type[]) {
			return runtypeCreator(
				"createIntersectionType",
				[ ts.createArrayLiteral(types.map(createRuntypeExpressionFromType)) ],
			)
		}

		function createRuntypeObject(type: ts.Type) {
			const runtypeProperties: ts.Expression[] = [];

			// TODO: augmented?
			for (const property of checker.getPropertiesOfType(type)) {
				console.log(property.getEscapedName());

				const propertyKey = ts.createStringLiteral(property.getEscapedName() as string);
				const propertyValue = createRuntypeExpressionFromType(checker.getTypeAtLocation(property.valueDeclaration));
				const propertyOptional = (property.valueDeclaration as ts.PropertyDeclaration)?.questionToken ? ts.createTrue() : ts.createFalse();
				// TODO: readonly

				runtypeProperties.push(
					ts.createObjectLiteral([
						ts.createPropertyAssignment("key", propertyKey),
						ts.createPropertyAssignment("value", propertyValue),
						ts.createPropertyAssignment("optional", propertyOptional),
					]),
				);
			}
			
			// TODO: readonly
			const indexInfoString = checker.getIndexInfoOfType(type, ts.IndexKind.String);
			const runtypeIndexString = indexInfoString && createRuntypeExpressionFromType(indexInfoString.type);
			
			// TODO: readonly
			const indexInfoNumber = checker.getIndexInfoOfType(type, ts.IndexKind.Number);
			const runtypeIndexNumber = indexInfoNumber && createRuntypeExpressionFromType(indexInfoNumber.type);

			// TODO: call and construct signatures
			// figure out if we want to use getAugmentedPropertiesOfType

			return runtypeCreator(
				"createObjectType",
				[
					ts.createArrayLiteral(runtypeProperties),
					runtypeIndexString || ts.createIdentifier("undefined"),
					runtypeIndexNumber || ts.createIdentifier("undefined"),
				],
			);
		}

		function createRuntypeExpressionFromType(type: ts.Type): ts.Expression {
			if (type.flags & ts.TypeFlags.Never) {
				return createRuntypeNever();
			}
			if (type.flags & ts.TypeFlags.Unknown) {
				return createRuntypeUnknown();
			}
			if (type.flags & ts.TypeFlags.Any) {
				return createRuntypeAny();
			}
			if (type.flags & ts.TypeFlags.Void) {
				return createRuntypeVoid();
			}
			if (type.flags & ts.TypeFlags.Undefined) {
				return createRuntypeUndefined();
			}
			if (type.flags & ts.TypeFlags.Null) {
				return createRuntypeNull();
			}
			if (type.flags & ts.TypeFlags.NonPrimitive) {
				return createRuntypeNonPrimitive();
			}
			if (type.flags & ts.TypeFlags.String) {
				return createRuntypeString();
			}
			if (type.flags & ts.TypeFlags.Number) {
				return createRuntypeNumber();
			}
			if (type.flags & ts.TypeFlags.BigInt) {
				return createRuntypeBigInt();
			}
			if (type.flags & ts.TypeFlags.ESSymbol) {
				return createRuntypeSymbol();
			}
			if (type.flags & ts.TypeFlags.Boolean) {
				return createRuntypeBoolean();
			}
			if (type.flags & ts.TypeFlags.StringLiteral) {
				return createRuntypeStringLiteral( (type as ts.StringLiteralType).value );
			}
			if (type.flags & ts.TypeFlags.NumberLiteral) {
				return createRuntypeNumberLiteral( (type as ts.NumberLiteralType).value );
			}
			if (type.flags & ts.TypeFlags.BigIntLiteral) {
				return createRuntypeBigIntLiteral( (type as ts.BigIntLiteralType).value );
			}
			if (type.flags & ts.TypeFlags.BooleanLiteral) {
				// There may be a better way to do this
				// One way that would probably work with only exposed properties would be to convert to a typenode and check 'kind', but this seems heavy
				if ( (type as any).intrinsicName === "true" ) {
					return createRuntypeTrue();
				}
				else {
					return createRuntypeFalse();
				}
			}
			if (type.flags & ts.TypeFlags.UniqueESSymbol) {
				throw new Error("unique literal not implemented");
			}
			if (type.flags & ts.TypeFlags.Union) {
				return createRuntypeUnion( (type as ts.UnionType).types );
			}
			if (type.flags & ts.TypeFlags.Intersection) {
				return createRuntypeIntersection( (type as ts.IntersectionType).types );
			}
			if (type.flags & ts.TypeFlags.Enum) {
				// TODO: check if this is required
				throw new Error("enums not implemented");
			}
			if (type.flags & ts.TypeFlags.Object) {
				return createRuntypeObject(type);
			}
			// keyof T
			if (type.flags & ts.TypeFlags.Index) {
				throw new Error("keyof not implemented");
			}
			// T[K]
			if (type.flags & ts.TypeFlags.IndexedAccess) {
				throw new Error("Indexed access not implemented");
			}
			// T extends U ? X : Y
			if (type.flags & ts.TypeFlags.Conditional) {
				throw new Error("Conditional types not implemented");
			}
			if (type.flags & ts.TypeFlags.Substitution) {
				// TODO: what is this?
				throw new Error("substitution not implemented");
			}

			if (type.flags & ts.TypeFlags.TypeParameter) {
				return resolveTypeParameter(type as ts.TypeParameter);
			}

			throw new Error("Unrecognized type " + type.flags);
		}
		
		function visitFunctionBody(body: ts.Block, typeParameters: ts.NodeArray<ts.TypeParameterDeclaration>): ts.Block {
			const listId = isRuntypeFunctionBody(body) ? 0 : ++currentListId;
			const typeParamsIdentifier = `__runtype_type_params_${listId}`;
			for (let index = 0; index < typeParameters.length; index++) {
				typeParameterData.set(typeParameters[index], { listId, index });
			}

			// const __runtype_type_params_n = this.__runtype.runtype_type_params || {};
			const typeParamsDefinition = ts.createVariableStatement(
				undefined,
				ts.createVariableDeclarationList(
					[
						ts.createVariableDeclaration(
							typeParamsIdentifier,
							undefined,
							ts.createBinary(
								ts.createPropertyAccess(
									createRuntypeRuntimeReference(),
									"type_params",
								),
								ts.SyntaxKind.BarBarToken,
								ts.createObjectLiteral([]),
							),
						)
					],
					ts.NodeFlags.Const,
				),
			);

			return ts.createBlock(
				ts.visitNodes(ts.createNodeArray<ts.Statement>([ typeParamsDefinition, ...body.statements ]), visitor),
				true /* I don't know if it is safe to pass 'body.multiLine'; it likely is but it's marked with @internal in the typescript source and not present in the public types */
			);
		}

		function visitCallExpression(invocation: ts.CallExpression): ts.Node {
			const typeArgumentsLiteral = ts.createArrayLiteral(
				invocation.typeArguments
					? invocation.typeArguments.map(t => createRuntypeExpressionFromType(checker.getTypeFromTypeNode(t)))
					: []
			);

			// f(args)
			// ->
			// (__runtype.invoked_function = ( <function> ), __runtype.type_params=<type-arguments> , __runtype.invoked_function( <function-arguments> ))

			return ts.createParen(
				ts.createBinary(
					ts.createBinary(
						ts.createBinary(
							ts.createPropertyAccess(
								createRuntypeRuntimeReference(),
								"invoked_function",
							),
							ts.SyntaxKind.EqualsToken,
							ts.visitNode(invocation.expression, visitor),
						),
						ts.SyntaxKind.CommaToken,
						ts.createBinary(
							ts.createPropertyAccess(
								createRuntypeRuntimeReference(),
								"type_params",
							),
							ts.SyntaxKind.EqualsToken,
							typeArgumentsLiteral,
						),
					),
					ts.SyntaxKind.CommaToken,
					ts.createCall(
						ts.createPropertyAccess(
							createRuntypeRuntimeReference(),
							"invoked_function",
						),
						invocation.typeArguments, // this is almost certainly unnecessary but we'll err on the side of being non-destructive
						ts.visitNodes(invocation.arguments, visitor),
					),
				),
			);
		}

		const visitor: ts.Visitor = (node) => {
			// Look into what nodes other than FunctionDeclaration you need to get
			if (ts.isBlock(node) && ts.isFunctionDeclaration(node.parent) && node.parent.typeParameters !== undefined) {
				return visitFunctionBody(node, node.parent.typeParameters);
			}
			if (ts.isCallExpression(node) && node.typeArguments !== undefined) {
				return visitCallExpression(node);
			}
			return ts.visitEachChild(node, visitor, context);
		}

		return (sourceFile: ts.SourceFile): ts.SourceFile => {
			if (isFileInRuntype(sourceFile)) {
				return sourceFile;
			}
			
			addRuntypeInjection(sourceFile);
			return visitor(sourceFile) as ts.SourceFile;
		}
	}
}

function compiler (configFilePath: string) {
	const host: ts.ParseConfigFileHost = ts.sys as any;
	const parsedCmd = ts.getParsedCommandLineOfConfigFile(configFilePath, {}, host);

	if (!parsedCmd) {
		return;
	}

	const { options, fileNames } = parsedCmd;

	const program = ts.createProgram({
		rootNames: [ ...fileNames, path.resolve(__dirname, "index.ts") ],
		options,
	});

	const emitResult = program.emit(
		undefined,
		undefined,
		undefined,
		undefined,
		{
			before: [ runtypeTransformer(program.getTypeChecker()) ],
			after: [],
			afterDeclarations: [],
		}
	);

	const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
	for (const diagnostic of diagnostics) {
		let msg = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
		if (diagnostic.file && diagnostic.start) {
			const {line, character} = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
			msg = `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${msg}`;
		}
		console.error(msg);
	}

	const exitCode = emitResult.emitSkipped ? 1 : 0;
	if (exitCode) {
		console.log(`Process exiting with code '${exitCode}'.`);
		process.exit(exitCode);
	}
}

compiler("./tsconfig.json");
