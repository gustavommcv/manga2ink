/**
 * A table with a row for every code of a set of messages, and in each row every form the code has,
 * with what it says in English (which is what the app has always said, character for character)
 * and in Portuguese. The compiler fails for a code that has no row.
 */
export type Rows<Values> = {
  readonly [Id in keyof Values]: readonly (readonly [
    values: Values[Id],
    english: string,
    portuguese: string,
  ])[];
};
