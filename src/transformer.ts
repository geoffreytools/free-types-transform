import * as ts from 'typescript';

import {
    SourceFile,
    Node,
    Transformer,
    Visitor,
    VisitResult,
    TransformationContext,
    factory
} from 'typescript';

const EXTENDS = ts.SyntaxKind.ExtendsKeyword;
const UNKNOWN = ts.SyntaxKind.UnknownKeyword;

const createFreeType = (name: string) => 
    factory.createInterfaceDeclaration(
        undefined,
        factory.createIdentifier(name),
        undefined,
        [extendsType()],
        [
            createTypeField(name.substring(1)),
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
        factory.createIdentifier('constrainfactory'),
        undefined,
        factory.createTupleTypeNode(Array.from(
            { length },
            () => factory.createKeywordTypeNode(UNKNOWN)
        ))
    )


export default function (/*opts?: Opts*/) {
    function visitor(ctx: TransformationContext, sf: SourceFile): Visitor {
        return function recursive (node: Node): VisitResult<Node> {
            if(ts.isTypeAliasDeclaration(node)) {
                const name = node.name.escapedText.toString();
                if(name[0] === '$') {
                    return createFreeType(name)
                } else {
                    return node;
                }
            }
            return ts.visitEachChild(node, recursive, ctx)
        }
    }

    return (ctx: TransformationContext): Transformer<SourceFile> => {
        return (sf: SourceFile) => ts.visitNode(sf, visitor(ctx, sf))
    }
}