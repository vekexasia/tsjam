import { buildVitest } from "../../build/buildVitest";
import path from "path";
export default buildVitest(path.basename(__dirname));
