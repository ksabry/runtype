import ts, { TypeFlags, createBigIntLiteral } from "typescript";
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

		function resolveReferenceType(param: ts.TypeReferenceNode): ts.Expression {
			const typeParameter = checker.getTypeFromTypeNode(param).getSymbol()!.getDeclarations()![0] as ts.TypeParameterDeclaration;
			const data = typeParameterData.get(typeParameter)!;
			
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

		function createRuntypeUndefined() {
			return runtypeCreator("createUndefinedType");
		}

		function createRuntypeNonPrimitive() {
			return runtypeCreator("createNonPrimitiveType");
		}

		function createRuntypeFalse() {
			return runtypeCreator("createFalseType");
		}

		function createRuntypeTrue() {
			return runtypeCreator("createTrueType");
		}

		function createRuntypeStringLiteral(text: string) {
			return runtypeCreator(
				"createStringLiteralType",
				[ ts.createStringLiteral(text) ],
			);
		}

		function createRuntypeNumberLiteral(text: string) {
			return runtypeCreator(
				"createNumberLiteralType",
				[ ts.createNumericLiteral(text) ],
			);
		}

		function createRuntypeBigIntLiteral(text: string) {
			return runtypeCreator(
				"createBigIntLiteralType",
				[ ts.createBigIntLiteral(text) ],
			);
		}

		function createRuntypeUnion(types: ts.NodeArray<ts.TypeNode>) {
			return runtypeCreator(
				"createUnionType",
				[ ts.createArrayLiteral(types.map(createRuntypeExpressionFromTypeNode)) ],
			)
		}

		function createRuntypeIntersection(types: ts.NodeArray<ts.TypeNode>) {
			return runtypeCreator(
				"createIntersectionType",
				[ ts.createArrayLiteral(types.map(createRuntypeExpressionFromTypeNode)) ],
			)
		}

		function createRuntypeObject(members: ts.NodeArray<ts.TypeElement>) {
			const properties: ts.ObjectLiteralElementLike[] = [];
				
			let propIndexString: undefined | ts.Expression = undefined;
			let propIndexNumber: undefined | ts.Expression = undefined;
	
			for (const element of members) {
				if (element.kind === ts.SyntaxKind.PropertySignature) {
					const prop = element as ts.PropertySignature;
					if (!prop.type) {
						throw new Error(`Missing type information on property ${prop.name.getText()}`);
					}
					if (prop.name.kind === ts.SyntaxKind.ComputedPropertyName) {
						throw new Error("Property cannot be computed");
					}
					
					const propName = (prop.name as ts.Identifier | ts.StringLiteral | ts.NumericLiteral).text;
					const propOptional = prop.questionToken !== undefined;
					const propType = createRuntypeExpressionFromTypeNode(prop.type);
	
					properties.push(
						ts.createPropertyAssignment(
							propName,
							ts.createObjectLiteral([
								ts.createPropertyAssignment("optional", propOptional ? ts.createTrue() : ts.createFalse()),
								ts.createPropertyAssignment("property", propType)
							])
						),
					)
				}
				else if (element.kind === ts.SyntaxKind.IndexSignature) {
					const prop = element as ts.IndexSignatureDeclaration;
					if (prop.parameters[0].type!.kind === ts.SyntaxKind.StringKeyword) {
						propIndexString = createRuntypeExpressionFromTypeNode(prop.type!);
					}
					else if (prop.parameters[0].type!.kind === ts.SyntaxKind.NumberKeyword) {
						propIndexNumber = createRuntypeExpressionFromTypeNode(prop.type!);
					}
					else {
						throw new Error(`Unrecognized index signature; syntax kind is ${prop.parameters[0].type!.kind}`);
					}
				}
				else {
					throw new Error(`Unsupported object element; syntax kind is ${element.kind}`);
				}
			}
	
			return runtypeCreator(
				"createObjectType",
				[
					ts.createObjectLiteral(properties),
					propIndexString || ts.createIdentifier("undefined"),
					propIndexNumber || ts.createIdentifier("undefined"),
				]
			);
		}

		function createRuntypeArray(elementType: ts.TypeNode) {
			return runtypeCreator(
				"createArrayType",
				[ createRuntypeExpressionFromTypeNode(elementType) ],
			);
		}

		function createRuntypeTuple(elementTypes: ts.NodeArray<ts.TypeNode>) {
			return runtypeCreator(
				"createTupleType",
				[ ts.createArrayLiteral(elementTypes.map(createRuntypeExpressionFromTypeNode)) ],
			);
		}

		function createRuntypeExpressionFromTypeNode(node: ts.TypeNode): ts.Expression
		{
			// Never
			if (node.kind === ts.SyntaxKind.NeverKeyword) {
				return createRuntypeNever();
			}
			// Unknown
			if (node.kind ===  ts.SyntaxKind.UnknownKeyword) {
				return createRuntypeUnknown();
			}
			// Any
			if (node.kind ===  ts.SyntaxKind.AnyKeyword) {
				return createRuntypeAny();
			}
			// Void
			if (node.kind ===  ts.SyntaxKind.VoidKeyword) {
				return createRuntypeVoid();
			}
			// String primitive
			if (node.kind ===  ts.SyntaxKind.StringKeyword) {
				return createRuntypeString();
			}
			// Number primitive
			if (node.kind ===  ts.SyntaxKind.NumberKeyword) {
				return createRuntypeNumber();
			}
			// Symbol primitive
			if (node.kind ===  ts.SyntaxKind.SymbolKeyword) {
				return createRuntypeSymbol();
			}
			// Bigint primitive
			if (node.kind ===  ts.SyntaxKind.BigIntKeyword) {
				return createRuntypeBigInt();
			}
			// Boolean primitive
			if (node.kind ===  ts.SyntaxKind.BooleanKeyword) {
				return createRuntypeBoolean();
			}
			// Undefined primitive
			if (node.kind ===  ts.SyntaxKind.UndefinedKeyword) {
				return createRuntypeUndefined();
			}
			// 'object' keyword
			if (node.kind ===  ts.SyntaxKind.ObjectKeyword) {
				return createRuntypeNonPrimitive();
			}
			// Literals
			if (node.kind ===  ts.SyntaxKind.LiteralType) {
				const literalNode = (node as ts.LiteralTypeNode).literal;
				// True literal
				if (literalNode.kind === ts.SyntaxKind.TrueKeyword) {
					return createRuntypeTrue();
				}
				// False Literal
				if (literalNode.kind === ts.SyntaxKind.FalseKeyword) {
					return createRuntypeFalse();
				}
				// String Literal
				if (literalNode.kind === ts.SyntaxKind.StringLiteral || literalNode.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
					return createRuntypeStringLiteral((literalNode as ts.StringLiteral).text);
				}
				// Number Literal
				if (literalNode.kind === ts.SyntaxKind.NumericLiteral) {
					return createRuntypeNumberLiteral((literalNode as ts.NumericLiteral).text);
				}
				// Bigint Literal
				if (literalNode.kind === ts.SyntaxKind.BigIntLiteral) {
					return createRuntypeBigIntLiteral((literalNode as ts.BigIntLiteral).text);
				}
				throw new Error(`Unrecognized singleton type literal; syntax kind is ${literalNode.kind}`);
			}
			// Union
			if (node.kind ===  ts.SyntaxKind.UnionType) {
				return createRuntypeUnion((node as ts.UnionTypeNode).types);
			}
			// Intersection
			if (node.kind ===  ts.SyntaxKind.IntersectionType) {
				return createRuntypeIntersection((node as ts.IntersectionTypeNode).types);
			}
			// ObjectTypeLiteral
			if (node.kind ===  ts.SyntaxKind.TypeLiteral) {
				return createRuntypeObject((node as ts.TypeLiteralNode).members);
			}
			// Array
			if (node.kind ===  ts.SyntaxKind.ArrayType) {
				return createRuntypeArray((node as ts.ArrayTypeNode).elementType);
			}
			// Tuple
			if (node.kind ===  ts.SyntaxKind.TupleType) {
				return createRuntypeTuple((node as ts.TupleTypeNode).elementTypes);
			}
			// Type Reference
			if (node.kind ===  ts.SyntaxKind.TypeReference) {
				return resolveReferenceType(node as ts.TypeReferenceNode);
			}
			
			if (node.kind ===  ts.SyntaxKind.ParenthesizedType) {
				return createRuntypeExpressionFromTypeNode((node as ts.ParenthesizedTypeNode).type);
			}

			// TODO:
			// SyntaxKind.FunctionType (limited runtime functionality)
			// SyntaxKind.TypePredicate (type guards, only makes sense as return type to function which is not runtime anyway)
			//   Consider exposing a enforceFunctionSignature function which injects checks for function params and return type
			// SyntaxKind.ConstructorType
			// SyntaxKind.TypeQuery (typeof keyword)
			// SyntaxKind.OptionalType? (this might not be necessary)
			// SyntaxKind.RestType (as last child of tuple type)
			// SyntaxKind.ConditionalType (requires assignability comparison; complex)
			// SyntaxKind.InferType (as child of ConditionalType; complex)
			// SyntaxKind.ThisType
			// SyntaxKind.TypeOperator (readonly, keyof, unique)
			// SyntaxKind.IndexedAccessType
			// SyntaxKind.MappedType (could get complex)
			// SyntaxKind.ImportType (presumably the type checker can resolve this)
			// 
			// this TypeReference?

			throw new Error(`Unsupported type node; syntax kind is ${node.kind}`);
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
				invocation.typeArguments ? invocation.typeArguments.map(createRuntypeExpressionFromTypeNode) : []
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
