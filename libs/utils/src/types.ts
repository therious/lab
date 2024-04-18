export type StringKey<T extends Object> = Extract<keyof T, string>; // restrict type of only the keys that are strings in T
export type NonEmptyString = string extends '' ? never : string;
export type NonEmptyArray<T> = [T, ...T[]];
//destination,source keymapping tuple type
export type BindingPair<D extends Object,S extends Object> = [StringKey<D>, StringKey<S>];

//parameter that is either a Binding Pair (explicit mapping) or only maps the destination key
export type BindingSpec<D extends Object,S extends Object> = BindingPair<D, S> | StringKey<D>;

// given type V, pick out only keys from T that exist in V
export type PickKeysOfTypeV<T,V> = Pick<T, {[K in keyof T]: T[K] extends V? K: never}[keyof T]>;

// specify an individual key from the above
export type KeyOfTypeV<T,V> = keyof PickKeysOfTypeV<T, V>;
export type PickKeysNotInV<T,V> = keyof Omit<T, keyof V>;

export type UpperCaseLetter = 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'J'|'K'|'L'|'M'|'N'|'O'|'P'|'Q'|'S'|'T'|'U'|'V'|'W'|'X'|'Y'|'Z';
export type LowerCaseLetter = Uncapitalize<UpperCaseLetter>;
export type Numeral = '0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9';
export type PascalCasedString = `${UpperCaseLetter}${string}`;
export type CamelCasedString = `${LowerCaseLetter}${string}`;

// see www.typescriptlang.org/docs/handbook/2/mapped-types.html

// convert a type from Paskcal cased Properties to CamelCased props
// filtering out all properties that do not match the literal template for beginning with an uppercase letter
export type UncapitalizeProps<T extends Object> = { [K in keyof T as Uncapitalize<PascalCasedString & K>]: T[K]}

// do the inverse converting from camelCase to PascalCase
export type CapitalizeProps<T extends Object> = { [K in keyof T as Capitalize<CamelCasedString & K>]: T[K]}
