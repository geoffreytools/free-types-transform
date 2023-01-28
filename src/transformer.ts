import {} from 'ts-expose-internals'
import * as ts from 'typescript';

import {
    SourceFile,
    Node,
    Transformer,
    Visitor,
    VisitResult,
    TransformationContext,
    factory,
} from 'typescript';


const EXTENDS = ts.SyntaxKind.ExtendsKeyword;
const UNKNOWN = ts.SyntaxKind.UnknownKeyword;

type ConstFreeTypeProps = { freeName: string, sourceName: string }
type FreeTypeProps = ConstFreeTypeProps & { constraints: ts.TypeNode[] };

const createConstFreeType = ({freeName, sourceName }: ConstFreeTypeProps) =>
    factory.createTypeAliasDeclaration(undefined, freeName, undefined, factory.createTypeReferenceNode(factory.createIdentifier('Const'), [
        factory.createTypeReferenceNode(sourceName)
      ]))


const createFreeType = ({freeName, sourceName, constraints }: FreeTypeProps) =>
    factory.createInterfaceDeclaration(
        undefined,
        factory.createIdentifier(freeName),
        undefined,
        [extendsType()],
        [
            createTypeField(sourceName, constraints),
            createConstraintsField(constraints)
        ]
    )


const createType = () => factory.createExpressionWithTypeArguments(
    factory.createIdentifier('Type'), []
);

const extendsType = (Type: ts.ExpressionWithTypeArguments = createType()) =>
    factory.createHeritageClause(EXTENDS, [Type])

const createTypeField = (typeName: string, constraints: ts.TypeNode[]) => 
     factory.createPropertySignature(
        undefined,
        factory.createIdentifier('type'),
        undefined,
        factory.createTypeReferenceNode(
            factory.createIdentifier(typeName),
            constraints.map((constraint, i) =>
                factory.createTypeReferenceNode(factory.createIdentifier('Checked'), [
                factory.createLiteralTypeNode(
                    factory.createNumericLiteral(i)
                ),
                factory.createThisTypeNode()
              ])
            )
        )
      )


const createConstraintsField = (constraints: ts.TypeNode[]) =>
    factory.createPropertySignature(
        undefined,
        factory.createIdentifier('constraints'),
        undefined,
        factory.createTupleTypeNode(constraints)
    )

type SourceType = ts.TypeReferenceNode & {
    typeName: ts.Identifier
}

type FreeExpression = ts.TypeReferenceNode & {
    typeName: ts.Identifier & { escapedText: { toString(): 'free' }},
    typeArguments: [SourceType, ...ts.TypeReferenceNode[]]
}

const isFreeExpression = (node: Node): node is FreeExpression => Boolean(
    ts.isTypeReferenceNode(node)
    && ts.isIdentifier(node.typeName)
    && node.typeName.escapedText.toString() === 'free'
    && node.typeArguments && node.typeArguments.length > 0
    && ts.isTypeReferenceNode(node.typeArguments[0])
    && ts.isIdentifier(node.typeArguments[0].typeName)
);

const getConstraintOrUnknown = (param: ts.TypeParameterDeclaration) =>
    param.constraint || factory.createKeywordTypeNode(UNKNOWN)

const transformTypeAliasDeclaration = (
    node: ts.TypeAliasDeclaration,
    checker: ts.TypeChecker
): VisitResult<Node> => {
    const freeName = node.name.escapedText.toString();
    if(isFreeExpression(node.type)) {
        const source = node.type.typeArguments[0];
        const sourceIdentifier = source.typeName;
        const sourceName = sourceIdentifier.escapedText.toString();
        const symbol = checker.getSymbolAtLocation(sourceIdentifier);
        const firstDeclaration = symbol?.declarations?.[0];

        if(firstDeclaration) {
            if('typeParameters' in firstDeclaration && Array.isArray(firstDeclaration.typeParameters)) {
                const constraints = firstDeclaration.typeParameters
                    .filter(ts.isTypeParameterDeclaration)
                    .map(getConstraintOrUnknown)
                return createFreeType({ freeName, sourceName, constraints });
            } else {
                return createConstFreeType({ freeName, sourceName });
            }
        } else return node;
    }
    else return node;
}

export const transformer = (
    instance: typeof ts,
    ctx: TransformationContext,
    sf: SourceFile,
    checker: ts.TypeChecker
): Visitor => function visitor (node: Node): VisitResult<Node> {
    if (ts.isTypeAliasDeclaration(node)) {
        return transformTypeAliasDeclaration(node, checker);
    }
    else return instance.visitEachChild(node, visitor, ctx)
}

export default (program: ts.Program): ts.TransformerFactory<ts.SourceFile> =>
    (ctx: TransformationContext): Transformer<SourceFile> => 
        (sf: SourceFile) => ts.visitNode(sf, transformer(ts, ctx, sf, program.getTypeChecker()))
