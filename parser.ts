enum RPNExpressions {
  Whitespace, // 0
  Number, // 1
  Variable, // 2
  Operation, // 3
  Bracket, // 4
  Function, // 5
  Trigonometry, // 6
}

export default class RPN {
  readonly RPNeq: [string | number, RPNExpressions][] = []; // Array containing the equation in RPN format
  static readonly numberR = "[0-9]*\\.?[0-9]+(?:[eE][\\-\\+]?[0-9]+)?";
  static readonly variableR = "(?<![0-9])([a-zA-Z0-9']+)(_[a-zA-Z0-9']+)?";
  static readonly unitR = "(?:[a-zA-Z0-9\\+\\-\\/\\*\\^]+)?";
  static readonly operationR = "[\\+\\-*\\/\\^\\-]";
  static readonly functionR = "sqrt|abs|exp|ln|log2|log10|log";
  static readonly trigonometryR = "a?(?:sin|cos|tan|cot|tg|ctg)h?r?";
  static readonly operations: { [key: string]: number } = {
    "+": 1,
    "-": 1,
    "*": 2,
    "/": 2,
    "^": 3,
  };
  static readonly functionsDict: { [key: string]: (x: number) => number } = {
    sqrt: Math.sqrt,
    exp: Math.exp,
    abs: Math.abs,
    ln: Math.log,
    log2: Math.log2,
    log10: Math.log10,
    log: Math.log10,
    sin: Math.sin,
    sinh: Math.sinh,
    asin: Math.asin,
    asinh: Math.asinh,
    cos: Math.cos,
    cosh: Math.cosh,
    acos: Math.acos,
    acosh: Math.acosh,
    tan: Math.tan,
    tanh: Math.tanh,
    atan: Math.atan,
    atanh: Math.atanh,
    cot: (v: number) => Math.cos(v) / Math.sin(v),
    coth: (v: number) => Math.cosh(v) / Math.sinh(v),
    acot: (v: number) => Math.PI / 2 - Math.atan(v),
    acoth: (v: number) => Math.log(Math.sqrt((v + 1) / (v - 1))),

    // polish version
    tg: Math.tan,
    tgh: Math.tanh,
    atg: Math.atan,
    atgh: Math.atanh,
    ctg: (v: number) => Math.cos(v) / Math.sin(v),
    ctgh: (v: number) => Math.cosh(v) / Math.sinh(v),
    actg: (v: number) => Math.PI / 2 - Math.atan(v),
    actgh: (v: number) => Math.log(Math.sqrt((v + 1) / (v - 1))),
  };
  constructor(equation: string) {
    const extracted = RPN.extract(equation);
    this.RPNeq = RPN.convert(extracted);
  }
  static type(exp: string | number): RPNExpressions {
    if (
      typeof exp === "number" ||
      RegExp(`^(${RPN.numberR})$`).test(exp)
    ) {
      return RPNExpressions.Number;
    } else if (RegExp(`^(${RPN.functionR})$`).test(exp)) {
      return RPNExpressions.Function;
    } else if (RegExp(`^(${RPN.trigonometryR})$`).test(exp)) {
      return RPNExpressions.Trigonometry;
    } else if (RegExp(`^(${RPN.variableR})$`).test(exp)) {
      return RPNExpressions.Variable;
    } else if (RegExp(`^(${RPN.operationR})$`).test(exp)) {
      return RPNExpressions.Operation;
    } else if (exp === "(" || exp === ")") return RPNExpressions.Bracket;
    else return RPNExpressions.Whitespace;
  }
  // returns the priority of an operator
  // example: "+" -> 1 and "^" -> 3
  static priority(operator: string): number {
    if (operator in RPN.operations) return RPN.operations[operator];
    else return 0;
  }
  // Split equation string to an array of tuples [exp:string, type:RPN.Expressions]
  // enum RPN.Expressions
  //   Whitespace 0
  //   Number 1
  //   Variable 2
  //   Operation 3
  //   Bracket 4
  //   Function 5
  //   Trigonometry 6
  // example: "10*(-6+4^2)" -> [[ "10", 0 ], [ "*", 2 ], [ "(", 4 ],  [ "-", 2 ], [ "6", 0 ],  [ "+", 2 ], [ "4", 0 ],  [ "^", 2 ], [ "2", 0 ]]
  static extract(eq: string): [string, RPNExpressions][] {
    const tab: [string, RPNExpressions][] = [];
    const r = new RegExp(
      `(?:${this.operationR})|[\\(\\)]|(?:${this.trigonometryR})|(?:${this.functionR})|(?:${this.numberR})|(?:${this.variableR})`,
      "g",
    );
    let arr: RegExpExecArray | null;
    while ((arr = r.exec(eq)) !== null) {
      const a: [string, RPNExpressions] = [arr[0], RPN.type(arr[0])];
      tab.push(a);
    }
    return tab;
  }
  static convert(
    equation: [string, RPNExpressions][],
  ): [(string | number), RPNExpressions][] {
    const stack: [string, RPNExpressions][] = []; // stack for operations/brackets/functions
    const nestedFunctions: { [key: number]: [string, RPNExpressions] } = {}; // stack of nested functions; ex: sin(2*(1+cos(x)) -> {0:"sin", 2:"cos"}
    const RPNeq: [(string | number), RPNExpressions][] = [];
    let level = 0; // nesting level
    let beginning = true; // true if previous expression wasn't a number or variable; used for converting (-x) -> 0-x
    for (const exp of equation) {
      if (exp[1] === RPNExpressions.Whitespace) continue;
      else if (exp[1] === RPNExpressions.Bracket) {
        if (exp[0] === "(") {
          stack.push(exp);
          beginning = true;
          level++;
        } else if (exp[0] === ")") {
          while (stack.length > 0 && stack[stack.length - 1][0] !== "(") {
            RPNeq.push(stack.pop()!);
            if (stack.length === 0) {
              throw new Error("MISSING BEGINNING OF A BRACKET");
            }
          }
          stack.pop();
          beginning = false;
          level--;
          if (level < 0) {
            throw new Error("MISSING BEGINNING OF A BRACKET");
          }
        }
      } else if (exp[1] === RPNExpressions.Operation) {
        if (beginning) {
          if (exp[0] === "-") {
            RPNeq.push(["0", RPNExpressions.Number]);
            nestedFunctions[level] = exp;
          } else if (exp[0] !== "+") {
            throw new Error("OPERATION IN UNEXPECTED POSITION");
          }
        } else {
          const p1 = RPN.priority(exp[0]);
          while (stack.length > 0) {
            const p2 = RPN.priority(stack[stack.length - 1][0]);
            if (p1 > p2) break;
            RPNeq.push(stack.pop()!);
          }
          stack.push(exp);
          beginning = true;
        }
      } else if (
        exp[1] === RPNExpressions.Function ||
        exp[1] === RPNExpressions.Trigonometry
      ) {
        nestedFunctions[level] = exp;
      } else {
        RPNeq.push(exp);
        beginning = false;
      }
      if (
        exp[1] === RPNExpressions.Number ||
        exp[1] === RPNExpressions.Variable ||
        exp[0] === ")"
      ) {
        if (level in nestedFunctions) {
          RPNeq.push(nestedFunctions[level]);
          delete nestedFunctions[level];
        }
      }
    }
    while (stack.length > 0) {
      RPNeq.push(stack.pop()!);
    }
    return RPNeq;
  }
  // calculates this.RPNeq and returns the value
  // RPN { ONPeq: ["10", "0", "6", "-",  "4", "2", "^",  "+", "(", "*"] } -> 100
  calculate(variables: { [key: string]: number | undefined }): number {
    const stack: number[] = [];
    for (const [exp, type] of this.RPNeq) {
      let v: number | null = null;
      if (typeof exp === "number") {
        v = exp;
      } else if (type === RPNExpressions.Number) {
        v = parseFloat(exp);
      } else if (type === RPNExpressions.Variable) {
        const u = variables[exp];
        if (exp in variables && u !== undefined) v = u;
        else throw new Error("INVALID EQUATION, UNDECLARED VARIABLE");
      } else if (type === RPNExpressions.Operation) {
        if (stack.length < 2) {
          throw new Error(
            "INVALID EQUATION, REMOVING OPERATION FROM EMPTY STACK",
          );
        }
        const v2 = stack.pop()!;
        v = stack.pop()!;
        if (exp === "+") {
          v += v2;
        } else if (exp === "-") {
          v -= v2;
        } else if (exp === "*") {
          v *= v2;
        } else if (exp === "/") {
          v /= v2;
        } else if (exp === "^") {
          v = Math.pow(v, v2);
        }
      } else if (type === RPNExpressions.Function) {
        if (stack.length < 1) {
          throw new Error(
            "INVALID EQUATION, REMOVING FUNCTION FROM EMPTY STACK",
          );
        }
        v = stack.pop()!;
        v = RPN.functionsDict[exp](v);
      } else if (type === RPNExpressions.Trigonometry) {
        if (stack.length < 1) {
          throw new Error(
            "INVALID EQUATION, REMOVING FUNCTION FROM EMPTY STACK",
          );
        }
        v = stack.pop()!;
        if (exp[0] !== "a" && exp[exp.length - 1] !== "r") {
          // convert degrees to radians
          v = (v * Math.PI) / 180;
        }
        v = RPN.functionsDict[
          exp[exp.length - 1] === "r" ? exp.slice(0, -1) : exp
        ](v);
        if (exp[0] === "a" && exp[exp.length - 1] !== "r") {
          // convert radians to degrees
          v = (v * 180) / Math.PI;
        }
      }
      if (v === null || isNaN(v) || !isFinite(v)) {
        throw new Error("INVALID EQUATION, UNEXPECTED VALUE WHILE CALCULATING");
      }
      stack.push(v);
    }
    return stack[0];
  }
}
