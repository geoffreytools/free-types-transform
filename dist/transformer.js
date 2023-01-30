"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.transformer = exports.addRelevantImports = exports.needsImporting = void 0;
var ts = __importStar(require("typescript"));
var typescript_1 = require("typescript");
exports.needsImporting = new Set();
var addRelevantImports = function (sf) {
    var imports = Array.from(exports.needsImporting);
    return typescript_1.factory.updateSourceFile(sf, __spreadArray([typescript_1.factory.createImportDeclaration(undefined, typescript_1.factory.createImportClause(false, undefined, typescript_1.factory.createNamedImports(imports.map(createNamedImport))), typescript_1.factory.createStringLiteral('free-types/core'))], sf.statements, true));
};
exports.addRelevantImports = addRelevantImports;
var createNamedImport = function (name) { return typescript_1.factory.createImportSpecifier(false, undefined, typescript_1.factory.createIdentifier(name)); };
var EXTENDS = ts.SyntaxKind.ExtendsKeyword;
var UNKNOWN = ts.SyntaxKind.UnknownKeyword;
var createConstFreeType = function (_a) {
    var freeName = _a.freeName, sourceName = _a.sourceName;
    exports.needsImporting.add('Const');
    return typescript_1.factory.createTypeAliasDeclaration(undefined, freeName, undefined, typescript_1.factory.createTypeReferenceNode(typescript_1.factory.createIdentifier('Const'), [
        typescript_1.factory.createTypeReferenceNode(sourceName)
    ]));
};
var createFreeType = function (_a) {
    var freeName = _a.freeName, sourceName = _a.sourceName, constraints = _a.constraints;
    exports.needsImporting.add('Type');
    return typescript_1.factory.createInterfaceDeclaration(undefined, typescript_1.factory.createIdentifier(freeName), undefined, [extendsType()], [
        createTypeField(sourceName, constraints),
        createConstraintsField(constraints)
    ]);
};
var createType = function () { return typescript_1.factory.createExpressionWithTypeArguments(typescript_1.factory.createIdentifier('Type'), []); };
var extendsType = function (Type) {
    if (Type === void 0) { Type = createType(); }
    return typescript_1.factory.createHeritageClause(EXTENDS, [Type]);
};
var createTypeField = function (typeName, constraints) {
    exports.needsImporting.add('Checked');
    return typescript_1.factory.createPropertySignature(undefined, typescript_1.factory.createIdentifier('type'), undefined, typescript_1.factory.createTypeReferenceNode(typescript_1.factory.createIdentifier(typeName), constraints.map(function (constraint, i) {
        return typescript_1.factory.createTypeReferenceNode(typescript_1.factory.createIdentifier('Checked'), [
            typescript_1.factory.createLiteralTypeNode(typescript_1.factory.createNumericLiteral(i)),
            typescript_1.factory.createThisTypeNode()
        ]);
    })));
};
var createConstraintsField = function (constraints) {
    return typescript_1.factory.createPropertySignature(undefined, typescript_1.factory.createIdentifier('constraints'), undefined, typescript_1.factory.createTupleTypeNode(constraints));
};
var isFreeExpression = function (node) { return Boolean(ts.isTypeReferenceNode(node)
    && ts.isIdentifier(node.typeName)
    && node.typeName.escapedText.toString() === 'free'
    && node.typeArguments && node.typeArguments.length > 0
    && ts.isTypeReferenceNode(node.typeArguments[0])
    && ts.isIdentifier(node.typeArguments[0].typeName)); };
var getConstraintOrUnknown = function (param) {
    return param.constraint || typescript_1.factory.createKeywordTypeNode(UNKNOWN);
};
var transformTypeAliasDeclaration = function (node, checker) {
    var _a;
    var freeName = node.name.escapedText.toString();
    if (isFreeExpression(node.type)) {
        var source = node.type.typeArguments[0];
        var sourceIdentifier = source.typeName;
        var sourceName = sourceIdentifier.escapedText.toString();
        var symbol = checker.getSymbolAtLocation(sourceIdentifier);
        var firstDeclaration = (_a = symbol === null || symbol === void 0 ? void 0 : symbol.declarations) === null || _a === void 0 ? void 0 : _a[0];
        if (firstDeclaration) {
            if ('typeParameters' in firstDeclaration && Array.isArray(firstDeclaration.typeParameters)) {
                var constraints = firstDeclaration.typeParameters
                    .filter(ts.isTypeParameterDeclaration)
                    .map(getConstraintOrUnknown);
                return createFreeType({ freeName: freeName, sourceName: sourceName, constraints: constraints });
            }
            else {
                return createConstFreeType({ freeName: freeName, sourceName: sourceName });
            }
        }
        else
            return node;
    }
    else
        return node;
};
var transformer = function (instance, ctx, sf, checker) { return function visitor(node) {
    if (ts.isTypeAliasDeclaration(node)) {
        return transformTypeAliasDeclaration(node, checker);
    }
    else
        return instance.visitEachChild(node, visitor, ctx);
}; };
exports.transformer = transformer;
exports["default"] = (function (program) {
    return function (ctx) {
        return function (sf) { return ts.visitNode(sf, (0, exports.transformer)(ts, ctx, sf, program.getTypeChecker())); };
    };
});
