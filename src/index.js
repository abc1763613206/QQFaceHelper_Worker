import indexPage from './index.html'
var JSZip = require('jszip');
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})
const mduiHTML = indexPage;


async function handleRequest(request) {
    const { pathname } = new URL(request.url)

    if (pathname === '/') {
        return new Response(mduiHTML, {
            headers: { 'Content-Type': 'text/html' }
        })
    }

    if (pathname.startsWith('/download/')) {
        const id = parseInt(pathname.split('/')[2])
        const dynamic = request.url.includes('dynamic=true')

        try {
            const ret = await download(id, dynamic)
            if (typeof ret === 'object') {
                const zipFile = await createZip(ret)
                return zipFile
            } else {
                return new Response(JSON.stringify({ "error": String(ret) }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            }
        } catch (e) {
            return new Response(JSON.stringify({ "error": String(e) }), {
                headers: { 'Content-Type': 'application/json' }
            })
        }
    }

    return new Response('Not Found', { status: 404 })
}

async function downloadImage(imgURI) {
    const MAX_RETRY = 5;
    let retryCount = 0;
    try {
        const response = await fetch(imgURI);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        const imgData = await response.arrayBuffer();
        return imgData;
    } catch (error) {
        if (retryCount < MAX_RETRY) {
            retryCount++;
            return downloadImage(imgURI);
        } else {
            throw new Error(`Failed to download image: ${error}`);
        }
    }
}

async function download(id, IfDynamic) {
    try {
        if (isNaN(id)) {
            throw new Error('有效的ID应为纯数字！Invalid input. Provide number please.');
        }
        const widthURI = `https://gxh.vip.qq.com/club/item/parcel/${String(id).charAt(String(id).length-1)}/${id}_android.json`
        const data = await fetch(widthURI).then(res => res.json())
        const height = data.supportSize[0].Height
        const width = data.supportSize[0].Width
        const type = data.type
        const cnt = data.imgs.length
        let fileName = ''

        if (IfDynamic) {
            fileName = `[${id}] ${data.name} (动态)`
        } else {
            fileName = `[${id}] ${data.name}`
        }

        const zip = new JSZip();
        const folder = zip.folder(fileName)

        for (const img of data.imgs) {
            let imgURI = ''
            let fileExt = ''
            const index = data.imgs.indexOf(img);
            const imgName = index.toString() + '. ' +img.name;
            if (IfDynamic) {
                imgURI = `https://gxh.vip.qq.com/club/item/parcel/item/${img.id.slice(0, 2)}/${img.id}/raw${height}.gif`
                fileExt = 'gif'
                //console.log(imgURI)
            } else {
                imgURI = `https://gxh.vip.qq.com/club/item/parcel/item/${img.id.slice(0, 2)}/${img.id}/${height}x${width}.png`
                fileExt = 'png'
                //console.log(imgURI)
            }
            const imgData = await downloadImage(imgURI);
            folder.file(`${imgName}.${fileExt}`, imgData)
        }

        const zipFile = await zip.generateAsync({ type: 'uint8array' })
        return { fileName, zipFile }
    } catch (e) {
        return e.toString()
    }
}

async function createZip({ fileName, zipFile }) {
    const response = new Response(zipFile)
    response.headers.set('Content-Disposition', `attachment; filename="${fileName}.zip"`)
    response.headers.set('Content-Type', 'application/zip')
    return response
}
