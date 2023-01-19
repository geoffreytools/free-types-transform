import { Type, apply } from 'free-types/core'

type Free<T> = any;

export type Foo<A> = { foo: A };

export type $Foo = Free<Foo>;

export type Application = apply<$Foo, [1]>
