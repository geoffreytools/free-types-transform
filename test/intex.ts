type Foo<A extends string, B extends number> = `${A}${B}`

type $Foo = free<Foo>;

import { apply } from 'free-types'

export type Application = apply<$Foo, ['A', 2]>
