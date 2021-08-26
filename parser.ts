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
        public offset: bigint,
        private reader: BinaryReader
    ) { }

    async readHeader() {
        await this.reader.seek(this.offset + 8n)

        const size = await this.reader.getBigUint64(true)
        const sizeDecompressed = await this.reader.getBigUint64(true)

        const compressionMethod: CompressionMethod = await this.reader.getUint32(true)

        // sha1 hash
        const hash = await this.reader.getBytes(20)

        // read compression data
        const compressionBlocks: Block[] = []
        if (compressionMethod != CompressionMethod.NONE) {
            const blockCount = await this.reader.getUint32(true)
            for (let j = 0; j < blockCount; j++) {
                const startOffset = await this.reader.getBigUint64(true)
                const endOffset = await this.reader.getBigUint64(true)
                compressionBlocks.push({
                    start: startOffset,
                    size: endOffset - startOffset
                })
            }
        }

        const isEncrypted = !!(await this.reader.getUint8())
        const blockSize = await this.reader.getUint32(true)

        return {
            size,
            sizeDecompressed,
            compressionMethod,
            compressionBlocks,
            blockSize,
            isEncrypted,
            hash
        }
    }

    async readData() {
        const { size, sizeDecompressed, compressionMethod, compressionBlocks, blockSize } = await this.readHeader()
        switch (compressionMethod) {
            case CompressionMethod.NONE: {
                return await this.reader.getBytes(Number(size))
            }
            case CompressionMethod.ZLIB: {
                const fullData = new Uint8Array(Number(sizeDecompressed))
                console.log(compressionBlocks)
                console.log(blockSize)

                for (const [i, block] of compressionBlocks.entries()) {
                    console.log(`reading block ${i} ${block.start} ${block.size}`)
                    await this.reader.seek(this.offset + block.start)
                    const blockData = await this.reader.getBytes(Number(block.size))
                    console.log(blockData)

                    fullData.set(unzlib(blockData), i * blockSize)
                }

                return fullData
            }
            default:
                throw "Unimplemented compression method " + compressionMethod
        }
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

            const offset = await r.getBigUint64(true)

            // seek over unimportant size
            await r.seek(16, true)

            // we need this here because it tells us if compression blocks are included
            const compressionMethod: CompressionMethod = await this.reader.getUint32(true)

            // seek over hash
            await r.seek(20, true)

            // skip compression data
            if (compressionMethod != CompressionMethod.NONE) {
                const blockCount = await this.reader.getUint32(true)
                await r.seek(blockCount * 16, true)
            }

            // seek over blocksize and isEncrypted byte
            await r.seek(5, true)

            // console.log(`Found record ${fileName} at offset ${offset}, compression: ${compressionMethod}`)

            // add to dict
            this.records[fileName] = new PakRecord(fileName, offset, r)
        }
    }
}
