import RPN from "./parser.ts";
import { readLines } from "https://deno.land/std@0.100.0/io/mod.ts";

const dict: { [key: string]: number } = {};
function calc(eq: string): [RPN["RPNeq"], number] {
  const rpn = new RPN(eq);
  return [rpn.RPNeq, rpn.calculate(dict)];
}
function print(what: [RPN["RPNeq"], number]) {
  console.log("RPN:", what[0]);
  console.log("Result:", what[1]);
  return what;
}

async function main() {
  for await (const line of readLines(Deno.stdin)) {
    try {
      const split = line.split("=");
      switch (split.length) {
        case 1:
          print(calc(line));
          break;
        case 2:
          dict[split[0]] = print(calc(split[1]))[1];
          break;
        default:
          console.error("Error, too many '='");
      }
    } catch (e) {
      console.error(e);
    }
  }
}

if (import.meta.main) await main();
