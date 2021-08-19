import { PakFile } from "./mod.ts"
import * as path from "https://deno.land/std@0.105.0/path/mod.ts"

const file = await Deno.open(path.join(Deno.cwd(), "000-TestPak_P.pak"), { write: true, read: true })
const pak = new PakFile(file)

await pak.loadRecords()
console.log(pak.readFromFile("metadata.json"))
