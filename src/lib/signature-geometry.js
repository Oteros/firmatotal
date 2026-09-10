// Match the visible PDF.js page: the intersection of CropBox and MediaBox,
// followed by page rotation. Original page boxes and rotation remain unchanged.
export function signaturePageGeometry(page) {
  const media=page.getMediaBox(),crop=page.getCropBox()
  const x=Math.max(media.x,crop.x),y=Math.max(media.y,crop.y)
  let width=Math.min(media.x+media.width,crop.x+crop.width)-x
  let height=Math.min(media.y+media.height,crop.y+crop.height)-y
  const box=width>0&&height>0?{x,y,width,height}:media
  width=box.width;height=box.height
  const rotation=((page.getRotation().angle%360)+360)%360
  const matrix=rotation===90?[0,1,-1,0,box.x+width,box.y]
    :rotation===180?[-1,0,0,-1,box.x+width,box.y+height]
    :rotation===270?[0,-1,1,0,box.x,box.y+height]
    :[1,0,0,1,box.x,box.y]
  return {width:rotation%180?height:width,height:rotation%180?width:height,matrix}
}

export function fitSignatureImage(rect,image) {
  const scale=Math.min(rect.width/image.width,rect.height/image.height)
  const width=image.width*scale,height=image.height*scale
  return {x:rect.x+(rect.width-width)/2,y:rect.y+(rect.height-height)/2,width,height}
}
