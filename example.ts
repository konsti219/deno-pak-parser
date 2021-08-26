import { PakFile } from "./mod.ts"
import * as path from "https://deno.land/std@0.105.0/path/mod.ts"

const pakPath = path.normalize(Deno.args[0])

const file = await Deno.open(pakPath, { write: true, read: true })
const pak = new PakFile(file)

await pak.loadRecords()

for (const fileName in pak.records) {
    const rec = pak.records[fileName]

    if ((await rec.readHeader()).compressionBlocks.length < 2) {
        const data = await rec.readData()
        if (data.length < 50000) {
            const decoder = new TextDecoder
            console.log(decoder.decode(data))
        } else {
            console.log(data)
        }
    }
}
