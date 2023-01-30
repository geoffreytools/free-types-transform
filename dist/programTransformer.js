"use strict";
exports.__esModule = true;
var transformer_1 = require("./transformer");
// AST Transformer
var transformAst = function (program) { return function (context) {
    var _this = this;
    var checker = program.getTypeChecker();
    return function (sourceFile) { return (0, transformer_1.addRelevantImports)(_this.visitEachChild(sourceFile, (0, transformer_1.transformer)(_this, context, sourceFile, checker), context)); };
}; };
// Program Transformer
function transformProgram(program, host, config, _a) {
    var tsInstance = _a.ts;
    var compilerOptions = program.getCompilerOptions();
    var compilerHost = getPatchedHost(host, tsInstance, compilerOptions);
    var rootFileNames = program.getRootFileNames().map(tsInstance.normalizePath);
    /* Transform AST */
    var transformedSource = tsInstance.transform(
    /* sourceFiles */ program.getSourceFiles().filter(function (sourceFile) { return rootFileNames.includes(sourceFile.fileName); }), 
    /* transformers */ [transformAst(program).bind(tsInstance)], compilerOptions).transformed;
    /* Render modified files and create new SourceFiles for them to use in host's cache */
    var printFile = tsInstance.createPrinter().printFile;
    for (var _i = 0, transformedSource_1 = transformedSource; _i < transformedSource_1.length; _i++) {
        var sourceFile = transformedSource_1[_i];
        var fileName = sourceFile.fileName, languageVersion = sourceFile.languageVersion;
        var updatedSourceFile = tsInstance.createSourceFile(fileName, printFile(sourceFile), languageVersion);
        compilerHost.fileCache.set(fileName, updatedSourceFile);
    }
    /* Re-create Program instance */
    return tsInstance.createProgram(rootFileNames, compilerOptions, compilerHost);
}
exports["default"] = transformProgram;
/**
 * Patches existing Compiler Host (or creates new one) to allow feeding updated file content from cache
**/
function getPatchedHost(maybeHost, tsInstance, compilerOptions) {
    var fileCache = new Map();
    var compilerHost = maybeHost !== null && maybeHost !== void 0 ? maybeHost : tsInstance.createCompilerHost(compilerOptions, true);
    var originalGetSourceFile = compilerHost.getSourceFile;
    return Object.assign(compilerHost, {
        getSourceFile: function (fileName, languageVersion) {
            fileName = tsInstance.normalizePath(fileName);
            if (fileCache.has(fileName))
                return fileCache.get(fileName);
            var sourceFile = originalGetSourceFile.apply(void 0, Array.from(arguments));
            fileCache.set(fileName, sourceFile);
            return sourceFile;
        },
        fileCache: fileCache
    });
}
