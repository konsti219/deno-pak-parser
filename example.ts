import { PakFile } from "./mod.ts"
import * as path from "https://deno.land/std@0.105.0/path/mod.ts"

let pakPath = ""
if (Deno.args[0] && typeof Deno.args[0] === "string") {
    pakPath = Deno.args[0]
} else {
    pakPath = path.join(Deno.cwd(), "000-TestPak_P.pak")
}
const file = await Deno.open(pakPath, { write: true, read: true })
const pak = new PakFile(file)

await pak.loadRecords()
for (const fileName in pak.records) {
    console.log(fileName)
}
