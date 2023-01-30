# free-types-transform

Proof of concept for a [free-types](https://github.com/geoffreytools/free-types) syntactic sugar.

The idea is to have a macro, `free`, enabling the creation of a free type constructor.

The following code:
```typescript
type Concat<A extends string, B extends string> = `${A}${B}`

type $Concat = free<Concat>;
```
transpiles to:
```typescript
import { Type, Checked } from "free-types/core";

type Concat<A extends string, B extends string> = `${A}${B}`;

interface $Concat extends Type {
    type: Concat<Checked<0, this>, Checked<1, this>>;
    constraints: [string, string];
}
```

Currently intended to work only for top-level type alias declarations.

## Limitation

This transformer is only used to emit `.d.ts` files and currently does not have a corresponding langage service plugin that would make the IDE aware of the changes made to the AST. I don't know yet if one such plugin can be written, considering the kind of transformations I am doing.

## Potential development

I may enable users to use it in expressions such as `Foo<free<Concat>>` arbitrarily deep in scope (provided that the free type is not closing over a local type).

I may also automatically make free types contravariant on their arguments (like functions) or enable the use of a variance annotation in type alias declarations when the generic it is attached to is a free type, so that you don't need to manually use [`$Contra`](https://github.com/geoffreytools/free-types/blob/public/doc/Documentation.md#helpers-).

I may also enable the application of a free type to be written like a normal type application, without requiring the use of [`apply`](https://github.com/geoffreytools/free-types/blob/public/doc/Documentation.md#application).

## How to use

This transform requires a programTransformer in order for the type checker to acknowledge the changes. This facility is provided by [ts-patch](https://github.com/nonara/ts-patch).

First install the dependencies:
```
npm install ts-patch free-types github:geoffreytools/free-types-transform
```
Patch typescript:
```
npx ts-patch install
```
This enables linking the plugin in your `tsconfig.json`:
```json
{
    "compilerOptions": {
        "plugins": [
            {
                "transform": "free-types-transform",
                "transformProgram": true
            }
        ]
    }
}
```

Run `tsc` as usual.