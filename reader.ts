export class BinaryReader {
    public offset = 0

    constructor(private file: Deno.File, public autoSeek = true) { }

    async seek(offset: number | bigint, relative = false) {
        if (!relative) {
            // if negative seek from back
            this.offset = await this.file.seek(Number(offset),
                offset >= 0 ? Deno.SeekMode.Start : Deno.SeekMode.End)
        } else {
            this.offset = await this.file.seek(Number(offset), Deno.SeekMode.Current)
        }
    }

    async getUint8() {
        const data = new Uint8Array(1)
        await this.file.read(data)

        //if (this.autoSeek) this.seek(1, true)

        return (new DataView(data.buffer)).getUint8(0)
    }
    async getInt8() {
        const data = new Uint8Array(1)
        await this.file.read(data)

        //if (this.autoSeek) this.seek(1, true)

        return (new DataView(data.buffer)).getInt8(0)
    }


    async getUint16(littleEndian = false) {
        const data = new Uint8Array(2)
        await this.file.read(data)

        // if (this.autoSeek) this.seek(2, true)

        return (new DataView(data.buffer)).getUint16(0, littleEndian)
    }
    async getInt16(littleEndian = false) {
        const data = new Uint8Array(2)
        await this.file.read(data)

        // if (this.autoSeek) this.seek(2, true)

        return (new DataView(data.buffer)).getInt16(0, littleEndian)
    }


    async getUint32(littleEndian = false) {
        const data = new Uint8Array(4)
        await this.file.read(data)

        //if (this.autoSeek) this.seek(4, true)

        return (new DataView(data.buffer)).getUint32(0, littleEndian)
    }
    async getInt32(littleEndian = false) {
        const data = new Uint8Array(4)
        await this.file.read(data)

        //if (this.autoSeek) this.seek(4, true)

        return (new DataView(data.buffer)).getInt32(0, littleEndian)
    }


    async getBigUint64(littleEndian = false) {
        const data = new Uint8Array(8)
        await this.file.read(data)

        //if (this.autoSeek) this.seek(8, true)

        return (new DataView(data.buffer)).getBigUint64(0, littleEndian)
    }
    async getBigInt64(littleEndian = false) {
        const data = new Uint8Array(8)
        await this.file.read(data)

        //if (this.autoSeek) this.seek(8, true)

        return (new DataView(data.buffer)).getBigInt64(0, littleEndian)
    }

    async getBytes(length: number) {
        const data = new Uint8Array(length)
        await this.file.read(data)

        return data
    }
    async getString(length: number) {
        return (new TextDecoder).decode(await this.getBytes(length))
    }

    /*
    async readFloat(): number {
        const value = this.view.getFloat32(this.offset, true)
        this.offset += 4
        return value
    }
 
    async readDouble(): number {
        const value = this.view.getFloat64(this.offset, true)
        this.offset += 8
        return value
    }*/
}
