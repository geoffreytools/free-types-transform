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

const getName = (node: ts.TypeReferenceNode): string | null => 
    ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)
    ? node.typeName.escapedText.toString()
    : null


export const transformer = (instance: typeof ts, ctx: TransformationContext, sf: SourceFile): Visitor =>
    function visitor (node: Node): VisitResult<Node> {
        if(ts.isTypeAliasDeclaration(node)) {
            const freeName = node.name.escapedText.toString();
            const type = node.type;
            if(ts.isTypeReferenceNode(type)) {
                const typeName = type.typeName
                if(ts.isIdentifier(typeName)) {
                    if(typeName.escapedText.toString() === 'Free') {
                        if(type.typeArguments && type.typeArguments.length === 1) {
                            const source = type.typeArguments[0];
                            if(ts.isTypeReferenceNode(source)) {
                                const name = getName(source);
                                if(name !== null) {
                                    return createFreeType(freeName, name);
                                }
                            }
                        }
                    }
                }
            }
            return node;
        }
        return instance.visitEachChild(node, visitor, ctx)
    }

export default () =>
    (ctx: TransformationContext): Transformer<SourceFile> => 
        (sf: SourceFile) => ts.visitNode(sf, transformer(ts, ctx, sf))
