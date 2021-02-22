import RPN from "./parser.ts";
import { readLines } from "https://deno.land/std@0.88.0/io/bufio.ts";

const dict: { [key: string]: number } = {};

for await (const line of readLines(Deno.stdin)) {
  const split = line.split("=");
  switch (split.length) {
    case 1:
      ((rpn) => {
        console.log("RPN equation: ", rpn.RPNeq);
        console.log("result: ", rpn.calculate(dict));
      })(new RPN(line));
      break;
    case 2:
      dict[split[0]] = (new RPN(split[1])).calculate(dict);
      break;
    default:
      console.error("Error, too many \'=\'");
  }
}
