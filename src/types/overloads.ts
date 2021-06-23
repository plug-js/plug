export type ConstructorOverloads<T> =
  T extends {
    new (...args: infer A0): any
    new (...args: infer A1): any
    new (...args: infer A2): any
    new (...args: infer A3): any
    new (...args: infer A4): any
    new (...args: infer A5): any
    new (...args: infer A6): any
    new (...args: infer A7): any
    new (...args: infer A8): any
    new (...args: infer A9): any
  } ? A0 | A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 | A9 :
  T extends {
    new (...args: infer A0): any
    new (...args: infer A1): any
    new (...args: infer A2): any
    new (...args: infer A3): any
    new (...args: infer A4): any
    new (...args: infer A5): any
    new (...args: infer A6): any
    new (...args: infer A7): any
    new (...args: infer A8): any
  } ? A0 | A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 :
  T extends {
    new (...args: infer A0): any
    new (...args: infer A1): any
    new (...args: infer A2): any
    new (...args: infer A3): any
    new (...args: infer A4): any
    new (...args: infer A5): any
    new (...args: infer A6): any
    new (...args: infer A7): any
  } ? A0 | A1 | A2 | A3 | A4 | A5 | A6 | A7 :
  T extends {
    new (...args: infer A0): any
    new (...args: infer A1): any
    new (...args: infer A2): any
    new (...args: infer A3): any
    new (...args: infer A4): any
    new (...args: infer A5): any
    new (...args: infer A6): any
  } ? A0 | A1 | A2 | A3 | A4 | A5 | A6 :
  T extends {
    new (...args: infer A0): any
    new (...args: infer A1): any
    new (...args: infer A2): any
    new (...args: infer A3): any
    new (...args: infer A4): any
    new (...args: infer A5): any
  } ? A0 | A1 | A2 | A3 | A4 | A5 :
  T extends {
    new (...args: infer A0): any
    new (...args: infer A1): any
    new (...args: infer A2): any
    new (...args: infer A3): any
    new (...args: infer A4): any
  } ? A0 | A1 | A2 | A3 | A4 :
  T extends {
    new (...args: infer A0): any
    new (...args: infer A1): any
    new (...args: infer A2): any
    new (...args: infer A3): any
  } ? A0 | A1 | A2 | A3 :
  T extends {
    new (...args: infer A0): any
    new (...args: infer A1): any
    new (...args: infer A2): any
  } ? A0 | A1 | A2 :
  T extends {
    new (...args: infer A0): any
    new (...args: infer A1): any
  } ? A0 | A1 :
  T extends {
    new (...args: infer A0): any
  } ? A0 : never
