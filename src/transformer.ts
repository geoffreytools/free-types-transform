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

const createFreeType = (freeName: string, sourceName: string) => 
    factory.createInterfaceDeclaration(
        undefined,
        factory.createIdentifier(freeName),
        undefined,
        [extendsType()],
        [
            createTypeField(sourceName),
            createConstraintsField(1)
        ]
    )

const extendsType = () =>
    factory.createHeritageClause(
        EXTENDS, [
            factory.createExpressionWithTypeArguments(
                factory.createIdentifier('Type'),
                []
            )
        ]
    )

const createTypeField = (typeName: string) => 
    factory.createPropertySignature(
        undefined,
        factory.createIdentifier('type'),
        undefined,
        factory.createTypeReferenceNode(factory.createIdentifier(typeName), [
          factory.createIndexedAccessTypeNode(
            factory.createThisTypeNode(),
            factory.createLiteralTypeNode(
                factory.createNumericLiteral('0')
            )
          )
        ])
      )

const createConstraintsField = (length: number) =>
    factory.createPropertySignature(
        undefined,
        factory.createIdentifier('constraints'),
        undefined,
        factory.createTupleTypeNode(Array.from(
            { length },
            () => factory.createKeywordTypeNode(UNKNOWN)
        ))
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

const transformTypeAliasDeclaration = (node: ts.TypeAliasDeclaration): VisitResult<Node> => {
    const freeName = node.name.escapedText.toString();
    const type = node.type;
    if(isFreeExpression(type)) {
        const source = type.typeArguments[0];
        const sourceIdentifier = source.typeName;
        const sourceName = sourceIdentifier.escapedText.toString();
        return createFreeType(freeName, sourceName);
    }
    else return node;
}

export const transformer = (
    instance: typeof ts,
    ctx: TransformationContext,
    sf: SourceFile
): Visitor => function visitor (node: Node): VisitResult<Node> {
    if (ts.isTypeAliasDeclaration(node)) {
        return transformTypeAliasDeclaration(node);
    }
    else return instance.visitEachChild(node, visitor, ctx)
}

export default (): ts.TransformerFactory<ts.SourceFile> =>
    (ctx: TransformationContext): Transformer<SourceFile> => 
        (sf: SourceFile) => ts.visitNode(sf, transformer(ts, ctx, sf))
