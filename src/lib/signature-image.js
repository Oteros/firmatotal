export async function readSignatureImage(file) {
  if (!file || !['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Unsupported signature image')
  const data = await new Promise((resolve,reject)=>{
    const reader=new FileReader()
    reader.onload=()=>resolve(reader.result)
    reader.onerror=()=>reject(reader.error)
    reader.readAsDataURL(file)
  })
  const image=new Image()
  image.src=data
  await image.decode()
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('Empty signature image')
  if (file.type!=='image/webp') return data
  const canvas=document.createElement('canvas')
  canvas.width=image.naturalWidth
  canvas.height=image.naturalHeight
  canvas.getContext('2d').drawImage(image,0,0)
  return canvas.toDataURL('image/png')
}
