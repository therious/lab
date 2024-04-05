export type StringKey<T extends Object> = Extract<keyof T, string>; // restrict type of only the keys that are strings in T

//destination,source keymapping tuple type
export type BindingPair<D extends Object,S extends Object> = [StringKey<D>, StringKey<S>];

//parameter that is either a Binding Pair (explicit mapping) or only maps the destination key
export type BindingSpec<D extends Object,S extends Object> = BindingPair<D, S> | StringKey<D>;

// given type V, pick out only keys from T that exist in V
export type PickKeysOfTypeV<T,V> = Pick<T, {[K in keyof T]: T[K] extends V? K: never}[keyof T]>;

// specify an individual key from the above
export type KeyOfTypeV<T,V> = keyof PickKeysOfTypeV<T, V>;
export type PickKeysNotInV<T,V> = keyof Omit<T, keyof V>;

type UpperCaseLetter = 'A'|'B'; //...etc finish later
type LowerCaseLetter = Uncapitalize<UpperCaseLetter>;
export type PascalCasedString = `${UpperCaseLetter}${string}`;
export type CamelCasedString = `${LowerCaseLetter}${string}`;

// see www.typescriptlang.org/docs/handbook/2/mapped-types.html

// convert a type from Paskcal cased Properties to CamelCased props
// filtering out all properties that do not match the literal template for beginning with an uppercase letter
export type UncapitalizeProps<T extends Object> = { [K in keyof T as Uncapitalize<PascalCasedString & K>]: T[K]}

// do the inverse converting from camelCase to PascalCase
export type CapitalizeProps<T extends Object> = { [K in keyof T as Capitalize<CamelCasedString & K>]: T[K]}
