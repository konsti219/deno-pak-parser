import { zlib, unzlib } from "./deps.ts"
import { BinaryReader } from "./reader.ts";

const UE4_PAK_MAGIC = "5a6f12e1"

enum CompressionMethod {
    NONE = 0,
    ZLIB = 1,
    BIAS_MEMORY = 2,
    BIAS_SPEED = 3
}

interface Block {
    start: bigint
    size: bigint
}

export class PakRecord {
    private data?: Uint8Array

    constructor(
        public fileName: string,
        private offset: bigint,
        private size: bigint,
        public sizeDecompressed: bigint,
        private compressionMethod: CompressionMethod,
        private compressionBlocks: Block[] = [],
        private compressionBlockSize: number,
        private hash: Uint8Array,
        private isEncrypted: boolean,
        private reader: BinaryReader
    ) { }

    async read() {
        await this.reader.seek(this.offset)
        return await readRecordHeader(this.reader)
    }
}

export class PakFile {
    public records: Record<string, PakRecord> = {}

    private reader = new BinaryReader(new Deno.File(0))

    private fileVersion = 0

    constructor(private file: Deno.File) {
        if (!file.statSync().isFile)
            throw ("Passed non file")

        this.reader = new BinaryReader(file)
    }

    async loadRecords() {
        // short hand
        const r = this.reader

        // head to footer
        await r.seek(-204)
        // check magic num
        if ((await r.getUint32(true)).toString(16) !== UE4_PAK_MAGIC) {
            throw "file does not contain magic pak number"
        }

        // read file version
        this.fileVersion = await r.getUint32(true)
        console.log(`Pak file version: ${this.fileVersion}`)

        // get index and go there
        const indexOffset = await r.getBigUint64(true)
        //const indexSize = r.getBigUint64(true)
        await r.seek(indexOffset)

        // the mount point is related to how unreal lods the pak, we can skip it
        const mountPointLength = await r.getUint32(true)
        await r.seek(mountPointLength, true)

        // get number of records
        const recordCount = await r.getUint32(true)
        console.log(`Found ${recordCount} records`)

        // read records
        for (let i = 0; i < recordCount; i++) {
            const nameLength = await r.getUint32(true)
            const fileName = (await r.getString(nameLength)).slice(0, -1)

            const { offset, size, sizeDecompressed, compressionMethod, compressionBlocks, blockSize, hash, isEncrypted } = await readRecordHeader(r)

            //console.log(`Found record ${fileName} at offset ${offset}, size: ${size}, size dec: ${sizeDecompressed}`)

            // add to dict
            this.records[fileName] = new PakRecord(fileName, offset, size, sizeDecompressed, compressionMethod, compressionBlocks, blockSize, hash, isEncrypted, r)
        }

        for (const fileName in this.records) {
            const rec = this.records[fileName]
            console.log(rec)

            console.log(await rec.read())
        }
    }

    readFromFile(path: string) {
        return
    }

    writeToFile(path: string) {
        return
    }
}

async function readRecordHeader(reader: BinaryReader) {
    const offset = await reader.getBigUint64(true)

    const size = await reader.getBigUint64(true)
    const sizeDecompressed = await reader.getBigUint64(true)

    const compressionMethod: CompressionMethod = await reader.getUint32(true)

    // sha1 hash
    const hash = await reader.getBytes(20)

    // read compression data
    const compressionBlocks: Block[] = []
    if (compressionMethod != CompressionMethod.NONE) {
        const blockCount = await reader.getUint32(true)
        for (let j = 0; j < blockCount; j++) {
            const startOffset = await reader.getBigUint64(true)
            const endOffset = await reader.getBigUint64(true)
            compressionBlocks.push({
                start: startOffset,
                size: endOffset - startOffset
            })
        }
    }

    const isEncrypted = !!(await reader.getUint8())
    const blockSize = await reader.getUint32(true)

    return {
        offset,
        size,
        sizeDecompressed,
        compressionMethod,
        compressionBlocks,
        blockSize,
        isEncrypted,
        hash
    }
}

