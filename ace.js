const fs = require('fs')
const path = require('path')
const readdir = require('util').promisify(fs.readdir)
const readFile = require('util').promisify(fs.readFile)
const stat = require('util').promisify(fs.stat)

class Reader {
    static async getSqfFiles(dir) {
        try {
            const files = await readdir(dir)
            return Promise.all(
                files.filter(v => v.endsWith('.sqf'))
                    .sort((a, b) => a.localeCompare(b))
                    .map(async (file) => await this.getFileAsObject(path.join(dir, file)))
            )
        } catch (e) {
            if (e.code === 'ENOENT') return []
            throw e
        }
    }

    static getFunctionName(prefix, file) {
        return `ace_${prefix}_${path.parse(file.fileName).name}`
    }

    static async getFileAsObject(file) {
        try {
            return { fileName: path.basename(file), content: await readFile(file, 'utf8') };
        } catch (e) {
            console.error('Error reading file', file, e)
            throw e
        }
    }
}

function main(ace3dir) {
    const argFolder = path.resolve(ace3dir)
    const acefolder = path.basename(argFolder) === 'addons' ? argFolder : path.join(argFolder, 'addons')

    return Promise.resolve(fs.readdirSync(acefolder)
        .map(v => path.join(acefolder, v))
        .filter(v => fs.statSync(v).isDirectory())
    ).then(folders => {
        return Promise.all(folders.map(async (folder) => {
            const component = path.basename(folder)
            const [files, functionData] = await Promise.all([Reader.getSqfFiles(folder), Reader.getSqfFiles(path.join(folder, 'functions'))])
            const functions = functionData.map(file => Object.assign({}, file, {functionName: Reader.getFunctionName(component, file)}))

            return {
                component,
                files,
                functions
            }
        }))
    })
}

function printStats(data) {
    const addons = data.length
    const len = x => Array.isArray(x) ? x.length : 0
    const files = data.reduce((prev, cur) => prev + len(cur.files) + len(cur.functions), 0)
    console.info(`Found ${addons} addons, read ${files} files`)
}

module.exports = main;

if (require.main === module) {
    const arg = process.argv.slice(2)[0]
    if (typeof arg !== "string") throw new Error('Provide ace3 folder path')
    console.time('[ACE3 Reader] Done')

    main(arg).then(data => {
        fs.writeFileSync('out.json', JSON.stringify(data, null, 2))
        console.timeEnd('[ACE3 Reader] Done')
        printStats(data)
    }).catch(e => {
        console.error(e)
    })
}


