import { Type, apply } from 'free-types/core'

export { Type };

type Foo<A> = { foo: A };

export type $Foo = Foo<any>

export type Bar = apply<$Foo, [1]>